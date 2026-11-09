const BLOCK = 'carousel-promo';

/* Source (.alc-carousel): stacked slides cross-fade over 0.85s and auto-advance
   6.5s after each transition ends (~7.35s between transitions). */
const FADE_DURATION = 850;
const AUTOPLAY_DELAY = 6500;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function getSlides(block) {
  return [...block.querySelectorAll(`.${BLOCK}-slide`)];
}

function updateActiveSlide(block, slideIndex) {
  block.dataset.activeSlide = slideIndex;

  getSlides(block).forEach((aSlide, idx) => {
    const active = idx === slideIndex;
    aSlide.classList.toggle('active', active);
    aSlide.setAttribute('aria-hidden', !active);
    aSlide.querySelectorAll('a, button').forEach((el) => {
      if (!active) el.setAttribute('tabindex', '-1');
      else el.removeAttribute('tabindex');
    });
  });

  block.querySelectorAll(`.${BLOCK}-slide-indicator`).forEach((indicator, idx) => {
    const button = indicator.querySelector('button');
    if (idx !== slideIndex) {
      button.removeAttribute('disabled');
      button.removeAttribute('aria-current');
    } else {
      button.setAttribute('disabled', true);
      button.setAttribute('aria-current', true);
    }
  });
}

function stopAutoplay(block) {
  clearTimeout(block.autoplayTimer);
  block.autoplayTimer = null;
}

function scheduleAutoplay(block) {
  stopAutoplay(block);
  if (block.autoplayPaused || reducedMotion.matches) return;
  block.autoplayTimer = setTimeout(() => {
    // eslint-disable-next-line no-use-before-define
    showSlide(block, parseInt(block.dataset.activeSlide || 0, 10) + 1);
  }, FADE_DURATION + AUTOPLAY_DELAY);
}

/**
 * Cross-fades to a slide. The outgoing slide fades out while moving off
 * (left when going forward, right when going back) as on the source.
 */
export function showSlide(block, slideIndex, direction) {
  const slides = getSlides(block);
  if (!slides.length) return;
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const current = parseInt(block.dataset.activeSlide || 0, 10);
  if (realSlideIndex === current) return;

  const outgoing = slides[current];
  if (outgoing && !reducedMotion.matches) {
    const back = direction ? direction === 'back' : slideIndex < current;
    const leavingClass = back ? 'leaving-back' : 'leaving-forward';
    outgoing.classList.remove('leaving-forward', 'leaving-back');
    outgoing.classList.add(leavingClass);
    setTimeout(() => outgoing.classList.remove(leavingClass), FADE_DURATION);
  }

  updateActiveSlide(block, realSlideIndex);
  scheduleAutoplay(block);
}

function bindEvents(block) {
  block.querySelectorAll(`.${BLOCK}-slide-indicator button`).forEach((button) => {
    button.addEventListener('click', (e) => {
      const indicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(indicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev')?.addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide || 0, 10) - 1, 'back');
  });
  block.querySelector('.slide-next')?.addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide || 0, 10) + 1, 'forward');
  });

  // Pause rotation while the pointer or keyboard focus is inside the carousel.
  const slidesList = block.querySelector(`.${BLOCK}-slides`);
  const pause = () => {
    block.autoplayPaused = true;
    stopAutoplay(block);
    slidesList.setAttribute('aria-live', 'polite');
  };
  const resume = () => {
    if (block.matches(':hover') || block.contains(document.activeElement)) return;
    block.autoplayPaused = false;
    slidesList.setAttribute('aria-live', 'off');
    scheduleAutoplay(block);
  };
  block.addEventListener('mouseenter', pause);
  block.addEventListener('mouseleave', resume);
  block.addEventListener('focusin', pause);
  block.addEventListener('focusout', (e) => {
    if (!block.contains(e.relatedTarget)) setTimeout(resume, 0);
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) pause();
    else resume();
  });

  slidesList.setAttribute('aria-live', reducedMotion.matches ? 'polite' : 'off');
  scheduleAutoplay(block);
}

function isEmptyCell(cell) {
  return !cell.textContent.trim() && !cell.querySelector('picture, img, a');
}

function isImageOnly(el) {
  return !!el.querySelector('picture, img') && !el.textContent.trim();
}

/**
 * Splits a jackpot amount ("$38,000,000") into digit-group boxes
 * ("$38" | "000" | "000"), keeping the full amount for assistive technology.
 */
function decorateAmount(el) {
  const text = el.textContent.trim();
  const match = text.match(/^(\D*?)\s*(\d{1,3}(?:[,\s]\d{3})+|\d+)(.*)$/);
  if (!match) return;
  const [, currency, digits, suffix] = match;
  const groups = digits.split(/[,\s]/);

  const srText = document.createElement('span');
  srText.className = `${BLOCK}-sr-only`;
  srText.textContent = text;

  const boxes = document.createElement('span');
  boxes.className = `${BLOCK}-slide-amount-boxes`;
  boxes.setAttribute('aria-hidden', 'true');
  groups.forEach((group, idx) => {
    const box = document.createElement('span');
    box.className = `${BLOCK}-slide-amount-group`;
    if (idx === 0 && currency.trim()) {
      const cur = document.createElement('span');
      cur.className = `${BLOCK}-slide-amount-currency`;
      cur.textContent = currency.trim();
      box.append(cur);
    }
    box.append(idx === groups.length - 1 ? `${group}${suffix}` : group);
    boxes.append(box);
  });
  el.replaceChildren(srText, boxes);
}

/** Wraps a trailing "+" of the jackpot banner so it can be sized like the source. */
function decorateBanner(el) {
  const last = el.lastChild;
  if (last?.nodeType !== Node.TEXT_NODE) return;
  const match = last.textContent.match(/^(.*?)\s*\+\s*$/s);
  if (!match) return;
  const plus = document.createElement('span');
  plus.className = `${BLOCK}-slide-banner-plus`;
  plus.textContent = '+';
  last.textContent = `${match[1]} `;
  el.append(plus);
}

/**
 * Overlay text (Lotto 6/49 draw slide): optional game logo, "Next Draw" tag,
 * jackpot banner, amount heading, two prize tabs, CTA. Roles are assigned by
 * position relative to the heading so authors can omit any of them.
 */
function decorateContent(content) {
  // Source renders the overlay CTA as the primary ALC pill button, even when authored plain.
  content.querySelectorAll('p > a[href]:only-child').forEach((a) => {
    const p = a.parentElement;
    if (p.textContent.trim() !== a.textContent.trim() || a.querySelector('img')) return;
    p.className = 'button-wrapper';
    a.className = 'button primary';
  });

  const children = [...content.children];
  const logo = children.find((el) => isImageOnly(el));
  logo?.classList.add(`${BLOCK}-slide-logo`);

  const heading = children.find((el) => /^H[1-6]$/.test(el.tagName));
  const texts = children.filter((el) => el !== logo && el !== heading
    && !el.classList.contains('button-wrapper') && el.textContent.trim());
  const headingIdx = heading ? children.indexOf(heading) : children.length;
  const before = texts.filter((el) => children.indexOf(el) < headingIdx);
  const after = texts.filter((el) => children.indexOf(el) > headingIdx);

  if (before[0]) before[0].classList.add(`${BLOCK}-slide-date`);
  if (before.length > 1) {
    const banner = before[before.length - 1];
    banner.classList.add(`${BLOCK}-slide-banner`);
    decorateBanner(banner);
  }
  if (heading) {
    heading.classList.add(`${BLOCK}-slide-amount`);
    decorateAmount(heading);
  }
  if (after[0]) after[0].classList.add(`${BLOCK}-slide-tab`);
  if (after[1]) after[1].classList.add(`${BLOCK}-slide-tab-alt`);
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.id = `${BLOCK}-${carouselId}-slide-${slideIndex}`;
  slide.classList.add(`${BLOCK}-slide`);

  const cells = [...row.querySelectorAll(':scope > div')].filter((cell) => !isEmptyCell(cell));
  // First cell holding a picture is the banner image; anything else is overlay content.
  const imageCell = cells.find((cell) => cell.querySelector('picture, img'));
  cells.forEach((cell) => {
    cell.classList.add(cell === imageCell ? `${BLOCK}-slide-image` : `${BLOCK}-slide-content`);
    slide.append(cell);
  });

  const content = slide.querySelector(`.${BLOCK}-slide-content`);
  if (content) {
    slide.classList.add(`${BLOCK}-slide-with-content`);
    decorateContent(content);
  } else {
    slide.classList.add(`${BLOCK}-slide-image-only`);
  }

  const heading = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading?.id) slide.setAttribute('aria-labelledby', heading.id);

  return slide;
}

let carouselId = 0;
export default function decorate(block) {
  carouselId += 1;
  block.id = `${BLOCK}-${carouselId}`;
  const rows = [...block.querySelectorAll(':scope > div')]
    .filter((row) => row.textContent.trim() || row.querySelector('picture, img, a'));
  const isSingleSlide = rows.length < 2;

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const container = document.createElement('div');
  container.classList.add(`${BLOCK}-slides-container`);

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add(`${BLOCK}-slides`);

  slidesWrapper.id = `${block.id}-slides`;

  rows.forEach((row, idx) => slidesWrapper.append(createSlide(row, idx, carouselId)));
  container.append(slidesWrapper);
  block.replaceChildren(container);

  if (isSingleSlide) {
    updateActiveSlide(block, 0);
    return;
  }

  // Bottom control bar: prev arrow, dot indicators, next arrow.
  const controls = document.createElement('div');
  controls.classList.add(`${BLOCK}-controls`);

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'slide-prev';
  prev.setAttribute('aria-label', 'Previous Slide');
  prev.setAttribute('aria-controls', slidesWrapper.id);

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'slide-next';
  next.setAttribute('aria-label', 'Next Slide');
  next.setAttribute('aria-controls', slidesWrapper.id);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Carousel Slide Controls');
  const indicators = document.createElement('ol');
  indicators.classList.add(`${BLOCK}-slide-indicators`);
  rows.forEach((_, idx) => {
    const indicator = document.createElement('li');
    indicator.classList.add(`${BLOCK}-slide-indicator`);
    indicator.dataset.targetSlide = idx;
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Show Slide ${idx + 1} of ${rows.length}`);
    button.setAttribute('aria-controls', `${BLOCK}-${carouselId}-slide-${idx}`);
    indicator.append(button);
    indicators.append(indicator);
  });
  nav.append(indicators);

  controls.append(prev, nav, next);
  block.append(controls);

  updateActiveSlide(block, 0);
  bindEvents(block);
}
