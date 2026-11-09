/*
 * Footer block.
 *
 * Content lives in the footer fragment (footer.plain.html). Each top-level
 * section of the fragment is one footer band, in this order:
 *   1. signup  - intro paragraph; list [field label, placeholder, button];
 *                confirmation question (use {email} for the typed address);
 *                terms paragraph (becomes the checkbox label);
 *                list [confirm label, cancel label]; closing note.
 *   2. utility - one paragraph per column (icon images use empty alt).
 *                An emphasised (italic) link opens its URL in a dialog.
 *   3. links   - heading + optional paragraph + list, repeated per column.
 *   4. sites   - heading + paragraph of logo links.
 *   5. legal   - legal links, notices, and a paragraph of badge images.
 *   6. accordion (small screens only) - heading + list per panel; shown
 *                instead of the link columns below the desktop breakpoint.
 * Any additional section is appended unchanged after the legal band.
 * Links whose text or image alt says "opens in a new tab" open in a new tab.
 */

const BAND_NAMES = ['signup', 'utility', 'links', 'sites', 'legal', 'accordion'];
const NEW_TAB_PATTERN = /opens in a new tab/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Fetches the footer fragment. Metadata-independent dual fetch:
 * /content/footer.plain.html (local preview) first, then /footer.plain.html (DA/EDS).
 * @returns {Promise<Document|null>} parsed fragment document
 */
async function fetchFooterFragment() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // resolve relative image paths against the fragment location
  doc.querySelectorAll('img[src]').forEach((img) => {
    img.setAttribute('src', new URL(img.getAttribute('src'), resp.url).href);
    img.loading = 'lazy';
  });
  return doc;
}

/**
 * Creates an element with an optional class name.
 * @param {string} tag tag name
 * @param {string} [className] class name
 * @returns {HTMLElement} element
 */
function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/**
 * Returns the trimmed text of each item of a list.
 * @param {Element|null} list ul/ol element
 * @returns {string[]} item texts
 */
function listTexts(list) {
  if (!list) return [];
  return [...list.querySelectorAll(':scope > li')].map((li) => li.textContent.trim());
}

/**
 * Makes links that announce a new tab open in one.
 * @param {Element} root container
 */
function applyNewTabLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const label = `${a.textContent} ${a.getAttribute('aria-label') || ''} ${a.querySelector('img')?.alt || ''}`;
    if (NEW_TAB_PATTERN.test(label)) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });
}

/**
 * Marks images with empty alt text as decorative icons.
 * @param {Element} root container
 */
function decorateIcons(root) {
  root.querySelectorAll('img').forEach((img) => {
    if (img.getAttribute('alt') === '') {
      img.classList.add('footer-icon');
      img.setAttribute('aria-hidden', 'true');
    }
  });
}

/**
 * Opens a URL inside a modal dialog with an iframe.
 * @param {string} url page to show
 * @param {string} title accessible title
 */
function openDialog(url, title) {
  const dialog = el('dialog', 'footer-dialog');
  dialog.setAttribute('aria-label', title);
  const close = el('button', 'footer-dialog-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => dialog.close());
  const frame = el('iframe', 'footer-dialog-frame');
  frame.src = url;
  frame.title = title;
  dialog.append(close, frame);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

/**
 * Turns emphasised links into buttons that open their URL in a dialog.
 * @param {Element} root container
 */
function decorateDialogLinks(root) {
  root.querySelectorAll('em > a[href]').forEach((a) => {
    const em = a.parentElement;
    const button = el('button', 'footer-dialog-trigger');
    button.type = 'button';
    button.textContent = a.textContent.trim();
    const url = a.href;
    button.addEventListener('click', () => openDialog(url, button.textContent));
    em.replaceWith(button);
  });
}

/**
 * Builds the confirmation question with the typed email address.
 * @param {Element|null} source question paragraph
 * @returns {{node: HTMLElement, emailSlot: HTMLElement}} question node and email slot
 */
function buildQuestion(source) {
  const node = el('p', 'footer-signup-question');
  const emailSlot = el('span', 'footer-signup-email-echo');
  const [before, after = ''] = (source?.textContent.trim() || '').split('{email}');
  node.append(before, emailSlot, after);
  return { node, emailSlot };
}

/**
 * Builds the email signup band (form controls are created here, copy comes from the fragment).
 * @param {Element} section fragment section
 * @returns {HTMLElement} band
 */
function buildSignup(section) {
  const paragraphs = [...section.querySelectorAll(':scope > p')];
  const lists = [...section.querySelectorAll(':scope > ul')];
  const [intro, questionSrc, termsSrc, noteSrc] = paragraphs;
  const [labelText, placeholder, submitText] = listTexts(lists[0]);
  const [confirmText, cancelText] = listTexts(lists[1]);

  const band = el('div', 'footer-signup');
  const inner = el('div', 'footer-signup-inner');
  band.append(inner);
  if (intro) {
    intro.className = 'footer-signup-intro';
    inner.append(intro);
  }

  const form = el('form', 'footer-signup-form');
  form.noValidate = true;
  const field = el('div', 'footer-signup-field');
  const label = el('label', 'footer-signup-label');
  label.htmlFor = 'footer-signup-email';
  label.textContent = labelText || placeholder || '';
  const group = el('div', 'footer-signup-group');
  const input = el('input', 'footer-signup-input');
  input.type = 'email';
  input.id = 'footer-signup-email';
  input.name = 'email';
  input.autocomplete = 'email';
  input.required = true;
  if (placeholder) input.placeholder = placeholder;
  const submit = el('button', 'footer-signup-submit');
  submit.type = 'submit';
  submit.textContent = submitText || '';
  submit.disabled = true;
  group.append(input, submit);
  field.append(label, group);
  form.append(field);

  const confirm = el('div', 'footer-signup-confirm');
  confirm.hidden = true;
  const { node: question, emailSlot } = buildQuestion(questionSrc);
  confirm.append(question);

  const terms = el('p', 'footer-signup-terms');
  const checkbox = el('input', 'footer-signup-checkbox');
  checkbox.type = 'checkbox';
  checkbox.id = 'footer-signup-terms';
  checkbox.required = true;
  const termsLabel = el('label', 'footer-signup-terms-label');
  termsLabel.htmlFor = 'footer-signup-terms';
  if (termsSrc) termsLabel.append(...termsSrc.childNodes);
  terms.append(checkbox, termsLabel);
  confirm.append(terms);

  const actions = el('div', 'footer-signup-actions');
  const confirmButton = el('button', 'button footer-signup-confirm-submit');
  confirmButton.type = 'button';
  confirmButton.textContent = confirmText || '';
  confirmButton.disabled = true;
  const cancelButton = el('button', 'footer-signup-cancel');
  cancelButton.type = 'button';
  cancelButton.textContent = cancelText || '';
  actions.append(confirmButton, cancelButton);
  confirm.append(actions);

  if (noteSrc) {
    noteSrc.className = 'footer-signup-note';
    confirm.append(noteSrc);
  }
  // links inside the confirmation open in a new tab so the form is kept
  confirm.querySelectorAll('a[href]').forEach((a) => {
    a.target = '_blank';
    a.rel = 'noopener';
  });
  form.append(confirm);
  inner.append(form);

  const hasValue = () => field.classList.toggle('has-value', input.value.trim() !== '');
  const validate = () => {
    submit.disabled = !EMAIL_PATTERN.test(input.value.trim());
    hasValue();
  };
  const closeConfirm = () => {
    confirm.hidden = true;
    checkbox.checked = false;
    confirmButton.disabled = true;
  };
  input.addEventListener('input', validate);
  input.addEventListener('change', validate);
  checkbox.addEventListener('change', () => {
    confirmButton.disabled = !checkbox.checked;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submit.disabled) return;
    emailSlot.textContent = input.value.trim();
    confirm.hidden = false;
  });
  cancelButton.addEventListener('click', closeConfirm);
  confirm.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeConfirm();
      input.focus();
    }
  });
  confirmButton.addEventListener('click', () => {
    if (!checkbox.checked) return;
    // no subscription backend is wired up: announce the request for an integration to handle
    band.dispatchEvent(new CustomEvent('footer:subscribe', {
      bubbles: true,
      detail: { email: input.value.trim() },
    }));
    closeConfirm();
    form.reset();
    validate();
  });

  return band;
}

/**
 * Builds the utility row (contact, social, feedback, banner).
 * @param {Element} section fragment section
 * @returns {HTMLElement} band
 */
function buildUtility(section) {
  const band = el('div', 'footer-utility');
  [...section.children].forEach((child) => {
    const item = el('div', 'footer-utility-item');
    const socialLinks = child.querySelectorAll('a[href] > img');
    if (socialLinks.length > 1) {
      item.classList.add('footer-social');
      [...child.childNodes].forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
          const span = el('span', 'footer-social-label');
          span.textContent = n.textContent.trim();
          n.replaceWith(span);
        }
      });
    }
    if (!child.querySelector('a, em') && child.querySelector('img')) item.classList.add('footer-utility-banner');
    if (child.querySelector('em > a')) item.classList.add('footer-utility-dialog');
    item.append(child);
    band.append(item);
  });
  return band;
}

/**
 * Groups the link section into one column per heading.
 * @param {Element} section fragment section
 * @returns {HTMLElement} band
 */
function buildLinks(section) {
  const band = el('nav', 'footer-links');
  band.setAttribute('aria-label', 'Footer');
  let column = null;
  [...section.children].forEach((child) => {
    if (/^H[1-6]$/.test(child.tagName) || !column) {
      column = el('div', 'footer-links-column');
      band.append(column);
    }
    if (child.tagName === 'P') child.classList.add('footer-links-subheading');
    column.append(child);
  });
  return band;
}

/**
 * Builds the other-sites row.
 * @param {Element} section fragment section
 * @returns {HTMLElement} band
 */
function buildSites(section) {
  const band = el('div', 'footer-sites');
  band.append(...section.children);
  return band;
}

/**
 * Builds the legal bar: text column and badge column.
 * @param {Element} section fragment section
 * @returns {HTMLElement} band
 */
function buildLegal(section) {
  const band = el('div', 'footer-legal');
  const text = el('div', 'footer-legal-text');
  const badges = el('div', 'footer-legal-badges');
  [...section.children].forEach((child) => {
    const onlyImages = child.querySelector('img') && !child.textContent.trim();
    if (onlyImages) {
      badges.append(...child.querySelectorAll('img'));
    } else {
      child.classList.add(child.querySelector('a') ? 'footer-legal-links' : 'footer-legal-notice');
      text.append(child);
    }
  });
  band.append(text);
  if (badges.children.length) band.append(badges);
  return band;
}

/**
 * Builds a single-open accordion (one panel per heading) for small screens.
 * Toggles are anchors with role=button pointing at their panel, as on the source.
 * @param {Element} section fragment section
 * @returns {HTMLElement} band
 */
function buildAccordion(section) {
  const band = el('div', 'footer-accordion');
  const items = [];
  let panelBody = null;
  [...section.children].forEach((child) => {
    if (/^H[1-6]$/.test(child.tagName)) {
      const n = items.length;
      const item = el('div', 'footer-accordion-item');
      const toggle = el('a', 'footer-accordion-toggle');
      toggle.href = `#footer-accordion-${n}`;
      toggle.setAttribute('role', 'button');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', `footer-accordion-${n}`);
      toggle.textContent = child.textContent.trim();
      const panel = el('div', 'footer-accordion-panel');
      panel.id = `footer-accordion-${n}`;
      panelBody = el('div', 'footer-accordion-body');
      panel.append(panelBody);
      item.append(toggle, panel);
      band.append(item);
      items.push(item);
    } else if (panelBody) {
      panelBody.append(child);
    }
  });

  const setOpen = (item, open) => {
    item.classList.toggle('is-open', open);
    item.querySelector('.footer-accordion-toggle').setAttribute('aria-expanded', String(open));
  };
  items.forEach((item) => {
    const toggle = item.querySelector('.footer-accordion-toggle');
    const activate = (e) => {
      e.preventDefault();
      const open = !item.classList.contains('is-open');
      items.forEach((other) => setOpen(other, false));
      setOpen(item, open);
    };
    toggle.addEventListener('click', activate);
    toggle.addEventListener('keydown', (e) => {
      if (e.key === ' ') activate(e);
    });
  });
  return band;
}

const BUILDERS = {
  signup: buildSignup,
  utility: buildUtility,
  links: buildLinks,
  sites: buildSites,
  legal: buildLegal,
  accordion: buildAccordion,
};

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const doc = await fetchFooterFragment();
  block.textContent = '';
  if (!doc) return;

  const sections = [...doc.body.querySelectorAll(':scope > div')];
  const container = el('div', 'footer-container');
  sections.forEach((section, i) => {
    const name = BAND_NAMES[i];
    const band = name ? BUILDERS[name](section) : section;
    const links = container.querySelector('.footer-links');
    if (name === 'signup') block.append(band);
    else if (name === 'accordion' && links) links.after(band);
    else container.append(band);
  });
  block.append(container);

  decorateIcons(block);
  decorateDialogLinks(block);
  applyNewTabLinks(block);
}
