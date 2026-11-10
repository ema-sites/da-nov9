---
name: ema-slack-me
description: Send the user questions, decisions, or status updates over Slack instead of (or in addition to) the chat, and wait for their reply when input is needed. Use when the user says "Slack me", "Slack me with any questions or decisions", "ping me on Slack", or has asked to be contacted on Slack for the current task.
---

# Slack me

The user wants questions, decisions, and updates delivered to Slack. A Slack credential is injected automatically
for `https://slack.com/api/*` requests — never add an `Authorization` header and never ask for a token.

**Channel:** messages go to the channel saved in `<skill-dir>/.channel`; the `SLACK_CHANNEL` environment variable
overrides it. Only post to that channel.

## First run

If `slack.sh` exits with code 3 (no channel configured), ask the user in chat:

> Which Slack channel should I use? In Slack, right-click the channel (or your own DM) → **Copy** → **Copy link**, and
> paste the link here.

Then run `<skill-dir>/slack.sh setup "<link-or-id>"`. It posts a confirmation message to the channel and saves the ID only if
that works, so it is never asked again. If the post fails with `channel_not_found` or `not_in_channel`, ask the user to
add the Slack app to the channel or pick another one. Run `setup` again whenever the user wants a different channel.

## When this applies

Once the user says "Slack me with any questions or decisions" (or similar), it stays in effect for the rest of the
task: every time you would ask the user something or report a milestone, send it to Slack.

- **Question or decision needed** → post the message, then poll the thread for the reply and act on it.
- **Informational only** (progress, completion summary, FYI) → post the message and continue. Do not poll.

## Sending

Use the helper script `slack.sh` in this skill's directory (`<skill-dir>` below). It posts, prints the message `ts`,
and optionally waits for a reply:

```bash
# informational — post and continue
<skill-dir>/slack.sh post "Refactor finished: 12 files updated, all tests passing."

# question — post, then wait for the first threaded reply (prints the reply text)
<skill-dir>/slack.sh ask "Step 1 done. Continue to step 2? Reply yes / no + changes."
```

Run `ask` with a Bash timeout of 600000 ms. It polls `conversations.replies` every 20 seconds for up to
~9 minutes. If it times out (exit code 2), run `<skill-dir>/slack.sh wait <ts>` to keep
waiting, and tell the user in chat that you're still waiting on Slack.

## Writing the message

- Lead with the decision or question; keep it short and scannable (Slack `mrkdwn`: `*bold*`, `•` bullets).
- For choices, number the options and say how to reply, e.g. "Reply 1, 2, or describe what you want."
- Include enough context to answer from a phone, without local paths, `localhost` URLs, or internal tool names.
- Never include secrets, tokens, or credentials in a message.
- Batch related questions into one message instead of sending several in a row.

## After a reply

- Quote the reply in the chat so the conversation has a record, then act on it.
- If the reply is unclear, ask a follow-up in the same thread (`<skill-dir>/slack.sh ask --thread <ts> "..."`).
- If a call fails with `not_authed`, `invalid_auth`, or a 401/403, the Slack credential isn't enabled: tell the user
  in chat and fall back to asking there. Do not ask for a token.
