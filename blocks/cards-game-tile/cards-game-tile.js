import { createOptimizedPicture } from '../../scripts/aem.js';

const BLOCK = 'cards-game-tile';

function isEmpty(el) {
  return !el.textContent.trim() && !el.querySelector('picture, img, a');
}

function isLinkOnly(el) {
  const link = el.querySelector('a');
  return !!link && el.textContent.trim() === link.textContent.trim();
}

/**
 * Image cell: the picture, plus optional text lines rendered as an overlay strip
 * along the bottom of the image (e.g. jackpot amounts).
 */
function decorateImage(cell) {
  cell.className = `${BLOCK}-card-image`;
  const strip = [...cell.children].filter((el) => el.textContent.trim() && !el.querySelector('picture'));
  if (strip.length) {
    const stripEl = document.createElement('div');
    stripEl.className = `${BLOCK}-card-strip`;
    strip.forEach((el) => {
      // trailing "est." on a jackpot amount renders as a small suffix
      const match = !el.children.length && el.textContent.trim().match(/^(.*\S)\s+(est\.?)$/i);
      if (match) {
        const [, amount, suffix] = match;
        const sub = document.createElement('sub');
        sub.textContent = suffix;
        el.replaceChildren(`${amount}\u00a0`, sub);
      }
    });
    stripEl.append(...strip);
    // A lone amount line (LOTTO 649 Gold Ball style) is styled differently from a
    // two-line strip (LOTTO MAX amount + secondary prize).
    if (strip.length === 1) stripEl.classList.add(`${BLOCK}-card-strip-single`);
    cell.append(stripEl);
  }
}

/** Body cell: title, description, optional draw details, CTA (last link-only paragraph). */
function decorateBody(cell) {
  cell.className = `${BLOCK}-card-body`;
  const children = [...cell.children].filter((el) => el.textContent.trim());
  const ctaEl = [...children].reverse().find(isLinkOnly);
  if (ctaEl) {
    ctaEl.classList.add(`${BLOCK}-card-cta`);
    // CTA uses the global primary pill button (blue, arrow-circle icon)
    ctaEl.querySelector('a').classList.add('button', 'primary');
    cell.append(ctaEl); // CTA always last so it can pin to the tile bottom
  }
  const title = children.find((el) => /^H[1-6]$/.test(el.tagName))
    || children.find((el) => el !== ctaEl);
  if (title) title.classList.add(`${BLOCK}-card-title`);
}

function decorateBadge(cell, li) {
  const text = cell.textContent.trim();
  if (!text) return;
  const badge = document.createElement('span');
  badge.className = `${BLOCK}-card-badge`;
  badge.textContent = text;
  const image = li.querySelector(`.${BLOCK}-card-image`);
  (image || li).append(badge);
  cell.remove();
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    if (isEmpty(row)) return;
    const li = document.createElement('li');
    li.className = `${BLOCK}-card`;
    const cells = [...row.children].filter((cell) => !isEmpty(cell));
    let imageDone = false;
    let bodyDone = false;
    const extras = [];
    cells.forEach((cell) => {
      li.append(cell);
      if (!imageDone && cell.querySelector('picture, img')) {
        decorateImage(cell);
        imageDone = true;
      } else if (!bodyDone) {
        decorateBody(cell);
        bodyDone = true;
      } else {
        extras.push(cell);
      }
    });
    // Optional extra cell: short badge text (e.g. "NEW") overlaid on the image.
    extras.forEach((cell) => decorateBadge(cell, li));
    if (!imageDone) li.classList.add(`${BLOCK}-card-no-image`);
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });

  block.replaceChildren(ul);

  // Mobile: the tiles become a one-at-a-time slider with previous/next buttons and
  // pagination dots (hidden by CSS from 768px, where the tiles form a 2-up grid).
  const count = ul.children.length;
  if (count < 2) return;
  const controls = document.createElement('div');
  controls.className = `${BLOCK}-controls`;
  [['prev', 'Previous tile', -1], ['next', 'Next tile', 1]].forEach(([name, label, dir]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${BLOCK}-${name}`;
    button.setAttribute('aria-label', label);
    button.dataset.direction = dir;
    controls.append(button);
  });
  const pagination = document.createElement('div');
  pagination.className = `${BLOCK}-pagination`;
  [...ul.children].forEach((li, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.dataset.index = i;
    dot.setAttribute('aria-label', `Show tile ${i + 1} of ${count}`);
    pagination.append(dot);
  });
  controls.append(pagination);

  const current = () => Math.round(ul.scrollLeft / (ul.clientWidth || 1));
  const goTo = (index) => ul.scrollTo({ left: index * ul.clientWidth, behavior: 'smooth' });
  const updateDots = () => {
    const active = current();
    [...pagination.children].forEach((dot, i) => {
      dot.classList.toggle('active', i === active);
      dot.setAttribute('aria-current', i === active ? 'true' : 'false');
    });
  };

  controls.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    if (button.dataset.index) {
      goTo(Number(button.dataset.index));
    } else if (button.dataset.direction) {
      // wrap around at either end
      goTo((current() + Number(button.dataset.direction) + count) % count);
    }
  });
  let ticking = false;
  ul.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateDots();
      ticking = false;
    });
  }, { passive: true });
  updateDots();
  block.append(controls);
}
