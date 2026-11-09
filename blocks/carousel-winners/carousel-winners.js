const BLOCK = 'carousel-winners';

function updateActiveSlide(block, slide) {
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  block.querySelectorAll(`.${BLOCK}-slide`).forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) link.setAttribute('tabindex', '-1');
      else link.removeAttribute('tabindex');
    });
  });

  block.querySelectorAll(`.${BLOCK}-slide-indicator`).forEach((indicator, idx) => {
    const button = indicator.querySelector('button');
    const selected = idx === slideIndex;
    button.setAttribute('aria-selected', selected);
    button.setAttribute('tabindex', selected ? '0' : '-1');
    if (!selected) button.removeAttribute('disabled');
    else button.setAttribute('disabled', true);
  });
}

export function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll(`.${BLOCK}-slide`);
  if (!slides.length) return;
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector(`.${BLOCK}-slides`).scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  block.querySelectorAll(`.${BLOCK}-slide-indicator button`).forEach((button) => {
    button.addEventListener('click', (e) => {
      const indicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(indicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev')?.addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide || 0, 10) - 1);
  });
  block.querySelector('.slide-next')?.addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide || 0, 10) + 1);
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(block, entry.target);
    });
  }, { threshold: 0.5 });
  block.querySelectorAll(`.${BLOCK}-slide`).forEach((slide) => slideObserver.observe(slide));
}

function isEmpty(el) {
  return !el.textContent.trim() && !el.querySelector('picture, img, a');
}

function isImageOnly(el) {
  return !!el.querySelector('picture, img') && !el.textContent.trim();
}

/**
 * Splits a prize amount ("$500,000") into digit-group boxes ("$500" | "000"),
 * keeping the full amount available to assistive technology.
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

/** Prize cell: game logo picture, optional "Winner" label, prize amount (last text line). */
function decoratePrize(cell) {
  cell.classList.add(`${BLOCK}-slide-prize`);
  const textEls = [];
  let logo;
  [...cell.children].forEach((el) => {
    if (isImageOnly(el)) {
      el.classList.add(`${BLOCK}-slide-logo`);
      logo = logo || el;
    } else if (el.textContent.trim()) textEls.push(el);
  });
  let label;
  if (textEls.length) {
    const amount = textEls[textEls.length - 1];
    amount.classList.add(`${BLOCK}-slide-amount`);
    decorateAmount(amount);
    if (textEls.length > 1) {
      [label] = textEls;
      label.classList.add(`${BLOCK}-slide-label`);
    }
  }
  // Game logo overlaps the "Winner" ribbon: group them like the source game title.
  if (logo || label) {
    const title = document.createElement('div');
    title.className = `${BLOCK}-slide-title`;
    cell.prepend(title);
    title.append(...[logo, label].filter(Boolean));
  }
}

/** Winner cell: name, location, CTA link. */
function decorateContent(cell) {
  cell.classList.add(`${BLOCK}-slide-content`);
  const textEls = [...cell.children].filter((el) => el.textContent.trim());
  const cta = textEls.find((el) => el.querySelector('a') && el.textContent.trim() === el.querySelector('a').textContent.trim());
  if (cta) {
    cta.classList.add(`${BLOCK}-slide-cta`);
    // Source renders this link as the primary ALC pill button.
    const link = cta.querySelector('a');
    if (!link.classList.contains('button')) link.classList.add('button', 'primary');
  }
  const info = textEls.filter((el) => el !== cta);
  if (info[0]) info[0].classList.add(`${BLOCK}-slide-name`);
  if (info[1]) info[1].classList.add(`${BLOCK}-slide-location`);
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.id = `${BLOCK}-${carouselId}-slide-${slideIndex}`;
  slide.classList.add(`${BLOCK}-slide`);

  const cells = [...row.querySelectorAll(':scope > div')].filter((cell) => !isEmpty(cell));
  let portraitUsed = false;
  let contentUsed = false;
  cells.forEach((cell) => {
    if (!portraitUsed && isImageOnly(cell)) {
      cell.classList.add(`${BLOCK}-slide-image`);
      portraitUsed = true;
    } else if (!contentUsed) {
      decorateContent(cell);
      contentUsed = true;
    } else {
      decoratePrize(cell);
    }
    slide.append(cell);
  });

  const label = slide.querySelector(`h1, h2, h3, h4, h5, h6, .${BLOCK}-slide-name`);
  if (label?.id) slide.setAttribute('aria-labelledby', label.id);

  return slide;
}

let carouselId = 0;
export default function decorate(block) {
  carouselId += 1;
  block.id = `${BLOCK}-${carouselId}`;
  let rows = [...block.querySelectorAll(':scope > div')].filter((row) => !isEmpty(row));

  // Optional first row with a single image-only cell = carousel background graphic.
  let background;
  const first = rows[0];
  if (first && rows.length > 1 && first.children.length === 1 && isImageOnly(first)) {
    background = document.createElement('div');
    background.classList.add(`${BLOCK}-background`);
    background.append(...first.firstElementChild.childNodes);
    rows = rows.slice(1);
  }

  const isSingleSlide = rows.length < 2;

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const container = document.createElement('div');
  container.classList.add(`${BLOCK}-slides-container`);

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add(`${BLOCK}-slides`);
  rows.forEach((row, idx) => slidesWrapper.append(createSlide(row, idx, carouselId)));
  container.append(slidesWrapper);

  block.replaceChildren(...(background ? [background, container] : [container]));
  if (background) block.classList.add(`${BLOCK}-has-background`);

  if (isSingleSlide) return;

  // Side chevrons.
  const navButtons = document.createElement('div');
  navButtons.classList.add(`${BLOCK}-navigation-buttons`);
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'slide-prev';
  prev.setAttribute('aria-label', 'Previous Slide');
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'slide-next';
  next.setAttribute('aria-label', 'Next Slide');
  navButtons.append(prev, next);
  container.append(navButtons);

  // Dots below the slides.
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Carousel Slide Controls');
  const indicators = document.createElement('ol');
  indicators.classList.add(`${BLOCK}-slide-indicators`);
  indicators.setAttribute('role', 'tablist');
  const slides = [...slidesWrapper.children];
  // slides become tabpanels, so the list wrapper drops its list role
  slidesWrapper.setAttribute('role', 'presentation');
  rows.forEach((_, idx) => {
    const indicator = document.createElement('li');
    indicator.classList.add(`${BLOCK}-slide-indicator`);
    indicator.setAttribute('role', 'presentation');
    indicator.dataset.targetSlide = idx;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = `${BLOCK}-${carouselId}-tab-${idx}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', slides[idx].id);
    button.setAttribute('aria-selected', idx === 0);
    button.setAttribute('tabindex', idx === 0 ? '0' : '-1');
    button.setAttribute('aria-label', `Show Slide ${idx + 1} of ${rows.length}`);
    slides[idx].setAttribute('role', 'tabpanel');
    if (!slides[idx].hasAttribute('aria-labelledby')) slides[idx].setAttribute('aria-labelledby', button.id);
    indicator.append(button);
    indicators.append(indicator);
  });
  nav.append(indicators);
  block.append(nav);

  bindEvents(block);
}
