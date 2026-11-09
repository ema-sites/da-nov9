/* eslint-disable */
/* global WebImporter */

/**
 * Parser for carousel-promo (alc.ca hero carousel).
 * Source: .carousel.list.parbase.hero > .alc-carousel > ul.slides > li.slide
 * Output: one row per slide.
 *   cell 1 = banner image (wrapped in link for image-only promo slides)
 *   cell 2 = overlay content (LOTTO 6/49 draw slide only): draw date, logo,
 *            jackpot details, CTA.
 */
const SOURCE_URL = 'https://www.alc.ca/content/alc/en.html';

function absUrl(url, base) {
  if (!url) return url;
  try {
    return new URL(url, base).href;
  } catch (e) {
    return url;
  }
}

function makeImage(document, srcImg, base) {
  if (!srcImg) return null;
  const src = srcImg.getAttribute('src') || srcImg.getAttribute('data-src');
  if (!src) return null;
  const img = document.createElement('img');
  img.src = absUrl(src, base);
  img.alt = srcImg.getAttribute('alt') || '';
  return img;
}

function bgUrl(el) {
  if (!el) return null;
  const style = el.getAttribute('style') || '';
  const m = style.match(/background-image\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
  if (m) return m[1];
  return el.getAttribute('data-bgimage') || null;
}

/**
 * Resolve a banner image from (in order): a direct <img> (scraped DOM),
 * the desktop picturefill <span data-src> (live DOM), inline background-image,
 * or data-bgimage.
 */
function resolveImage(document, el, base, directImgSelector) {
  if (!el) return null;
  const direct = directImgSelector ? el.querySelector(directImgSelector) : null;
  if (direct) return makeImage(document, direct, base);
  const spans = [...el.querySelectorAll(':scope > span[data-src]')];
  const src = (spans.length && spans[spans.length - 1].getAttribute('data-src')) || bgUrl(el);
  if (!src) return null;
  const img = document.createElement('img');
  img.src = absUrl(src, base);
  img.alt = '';
  return img;
}

function text(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

function para(document, content) {
  const p = document.createElement('p');
  if (typeof content === 'string') p.textContent = content;
  else if (content) p.append(content);
  return p;
}

function parseDrawSlide(document, slide, base) {
  const wrapper = slide.querySelector('.alc-external-data');
  const bg = resolveImage(document, wrapper, base, ':scope > img');
  const content = [];

  // Game logo first. The importer turns any <img> whose src *ends with* ".svg" into an
  // :icon: shorthand (no matching /icons/ file here), so give SVG URLs a URL fragment:
  // the src no longer ends in ".svg", it stays a real image, and the fetched file is unchanged.
  const logoSrc = slide.querySelector('.draw__logo img');
  const logo = makeImage(document, logoSrc, base);
  if (logo) {
    if (/\.svg$/i.test(logo.getAttribute('src'))) logo.setAttribute('src', `${logo.getAttribute('src')}#logo`);
    if (!logo.alt) logo.alt = 'LOTTO 6/49';
    content.push(para(document, logo));
  }

  const nextDraw = slide.querySelector('.draw--649-nextDraw label');
  if (nextDraw) content.push(para(document, text(nextDraw)));

  const classic = slide.querySelector('.draw__logo--649__banner__contents');
  if (classic) {
    const labels = [...classic.querySelectorAll('label')].map(text).filter(Boolean);
    // "$" + "5M CLASSIC JACKPOT" + "+"
    const line = labels.join(' ').replace(/^\$\s+/, '$').trim();
    if (line) content.push(para(document, line));
  }

  const amount = slide.querySelector('.draw__prize-amount');
  if (amount) {
    // Digits only, then thousands commas: works whether or not the digit-group spans survive.
    const digits = amount.textContent.replace(/\D/g, '');
    const value = digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
    if (value) {
      const h = document.createElement('h2');
      h.textContent = `$${value}`;
      content.push(h);
    }
  }

  const goldball = slide.querySelector('.draw__hero-content__goldball__jackpot label');
  if (goldball) {
    const gb = text(goldball).replace(/^G\s+LD/, 'GOLD');
    if (gb) content.push(para(document, gb));
  }
  const guaranteed = slide.querySelector('.draw__hero-content__goldball__guaranteed label');
  if (guaranteed && text(guaranteed)) content.push(para(document, text(guaranteed)));

  const cta = slide.querySelector('.draw__cta a');
  if (cta) {
    const a = document.createElement('a');
    a.href = absUrl(cta.getAttribute('href'), base);
    a.textContent = text(cta);
    content.push(para(document, a));
  }

  return [bg ? [bg] : '', content.length ? content : ''];
}

function parsePromoSlide(document, slide, base) {
  const article = slide.querySelector('article.fca-carousel-slide-promo') || slide;
  const img = resolveImage(document, article.querySelector('.slide-content'), base, ':scope > img');
  if (!img) return null;
  const link = article.querySelector('a[href]');
  let imageCell = img;
  if (link) {
    const a = document.createElement('a');
    a.href = absUrl(link.getAttribute('href'), base);
    a.append(img);
    imageCell = a;
  }
  const overlay = article.querySelector('.slide-content .content');
  const overlayText = text(overlay);
  if (overlayText) {
    const content = [...overlay.childNodes].map((n) => n.cloneNode(true));
    return [[imageCell], content];
  }
  return [[imageCell], ''];
}

export default function parse(element, { document, params }) {
  const base = (params && params.originalURL) || SOURCE_URL;
  const cells = [];

  const slides = [...element.querySelectorAll('ul.slides > li.slide')]
    .filter((li) => !li.classList.contains('slick-cloned'));

  slides.forEach((slide) => {
    let row = null;
    if (slide.querySelector('.alc-external-data, #draw-subcomponent')) {
      row = parseDrawSlide(document, slide, base);
    } else {
      row = parsePromoSlide(document, slide, base);
    }
    // a slide without a resolvable banner image cannot be authored as a carousel row
    if (row && row[0]) cells.push(row);
  });

  // pad rows to 2 columns
  cells.forEach((row) => {
    while (row.length < 2) row.push('');
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-promo', cells });
  element.replaceWith(block);
}
