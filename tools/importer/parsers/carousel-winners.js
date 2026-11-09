/* eslint-disable */
/* global WebImporter */

/**
 * Parser for carousel-winners (alc.ca "Recent winners" slick slider).
 * Source: .winners-carousel .winners-carousel-slides .slide (slick clones skipped)
 * Output:
 *   optional first row = [background graphic] (single image cell)
 *   one row per winner = [winner photo] [name, city, CTA] [game logo, "Winner", prize amount]
 */
const SOURCE_URL = 'https://www.alc.ca/content/alc/en.html';
// .slide.standard-bg gets its background from the site stylesheet, not inline styles.
const STANDARD_BG = 'https://www.alc.ca/content/dam/alc/images/static/winners-carousel/winners-carousel-bg-generic.png';

function absUrl(url, base) {
  if (!url) return url;
  try {
    return new URL(url.trim(), base).href;
  } catch (e) {
    return url;
  }
}

function imgFrom(document, src, alt, base) {
  if (!src) return null;
  const img = document.createElement('img');
  img.src = absUrl(src, base);
  img.alt = alt || '';
  return img;
}

function bgUrl(el) {
  if (!el) return null;
  const style = el.getAttribute('style') || '';
  const m = style.match(/background-image\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
  return m ? m[1] : null;
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

export default function parse(element, { document, params }) {
  const base = (params && params.originalURL) || SOURCE_URL;
  const cells = [];

  const slides = [...element.querySelectorAll('.winners-carousel-slides .slide')]
    .filter((s) => !s.closest('.slick-cloned'));

  // Optional background row (shared by all slides).
  const first = slides[0];
  if (first) {
    const directBg = first.querySelector(':scope > img');
    let bg = null;
    if (directBg) bg = imgFrom(document, directBg.getAttribute('src'), '', base);
    else if (bgUrl(first)) bg = imgFrom(document, bgUrl(first), '', base);
    else if (first.classList.contains('standard-bg')) bg = imgFrom(document, STANDARD_BG, '', base);
    // Must be a single cell: the block detects the background row by children.length === 1.
    if (bg) cells.push([bg]);
  }

  slides.forEach((slide) => {
    // cell 1: winner photo (inline background-image on .winner-image, or a scraped <img>)
    const photoEl = slide.querySelector('.winner-image');
    let photo = null;
    if (photoEl) {
      const inner = photoEl.querySelector('img');
      const src = inner ? inner.getAttribute('src') : bgUrl(photoEl);
      const name = text(slide.querySelector('.winner-info h3'));
      photo = imgFrom(document, src, name, base);
    }

    // cell 2: name, city, CTA
    const info = slide.querySelector('.winner-info');
    const infoCell = [];
    if (info) {
      const h3 = info.querySelector('h3');
      if (h3 && text(h3)) {
        const h = document.createElement('h3');
        h.textContent = text(h3);
        infoCell.push(h);
      }
      const city = info.querySelector('.h2, span');
      if (city && text(city)) infoCell.push(para(document, text(city)));
      const cta = info.querySelector('a[href]');
      if (cta) {
        const a = document.createElement('a');
        // Source has a typo'd "winners.html.html"; collapse a doubled extension.
        a.href = absUrl(cta.getAttribute('href'), base).replace(/(\.html)+(?=([?#]|$))/, '.html');
        a.textContent = text(cta) || 'See all winners';
        infoCell.push(para(document, a));
      }
    }

    // cell 3: game logo, "Winner" label, prize amount (last)
    const prize = slide.querySelector('.prize-details');
    const prizeCell = [];
    if (prize) {
      const logo = prize.querySelector('img.winning-game-logo, .game-title img');
      if (logo) {
        const img = imgFrom(document, logo.getAttribute('src'), logo.getAttribute('alt') || 'game logo', base);
        if (img) prizeCell.push(para(document, img));
      }
      const label = prize.querySelector('.winning-game-ribbon');
      if (label && text(label)) prizeCell.push(para(document, text(label)));
      const amount = prize.querySelector('.prize-amount');
      if (amount) {
        // Digits only, then thousands commas: works whether or not the digit-group spans survive.
        const digits = amount.textContent.replace(/\D/g, '');
        const value = digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
        if (value) prizeCell.push(para(document, `$${value}`));
      }
    }

    if (!photo && !infoCell.length) return;
    cells.push([
      photo || '',
      infoCell.length ? infoCell : '',
      prizeCell.length ? prizeCell : '',
    ]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-winners', cells });
  element.replaceWith(block);
}
