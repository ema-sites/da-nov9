/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-game-tile (alc.ca "Featured games and promotions" grid).
 * Source: .cmp-container--game-tiles article.game-tile (7 tiles)
 * Output: one row per tile:
 *   cell 1 = tile image (+ jackpot strip text lines)
 *   cell 2 = title (h3), description, optional draw details, CTA link (last paragraph)
 *   cell 3 = badge text (e.g. NEW), empty when absent
 */
const SOURCE_URL = 'https://www.alc.ca/content/alc/en.html';

function absUrl(url, base) {
  if (!url) return url;
  try {
    return new URL(url.trim(), base).href;
  } catch (e) {
    return url;
  }
}

function bgUrl(el) {
  if (!el) return null;
  const style = el.getAttribute('style') || '';
  const m = style.match(/background-image\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
  return m ? m[1] : null;
}

// Collapse whitespace and drop zero-width characters the source injects before "$".
function text(el) {
  return el ? el.textContent.replace(/[​-‍﻿]/g, '').replace(/\s+/g, ' ').trim() : '';
}

function para(document, content) {
  const p = document.createElement('p');
  if (typeof content === 'string') p.textContent = content;
  else if (content) p.append(content);
  return p;
}

function link(document, src, base) {
  const a = document.createElement('a');
  a.href = absUrl(src.getAttribute('href'), base);
  a.textContent = text(src);
  return a;
}

/** Rebuild a paragraph keeping inline links (e.g. "Read more") with absolute hrefs. */
function rebuildParagraph(document, srcP, base) {
  const p = document.createElement('p');
  srcP.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const t = node.textContent.replace(/[​-‍﻿]/g, '').replace(/\s+/g, ' ');
      if (t.trim()) p.append(document.createTextNode(t));
    } else if (node.nodeType === 1) {
      if (node.tagName === 'A' && node.getAttribute('href')) {
        if (p.childNodes.length) p.append(document.createTextNode(' '));
        p.append(link(document, node, base));
      } else if (text(node)) {
        p.append(document.createTextNode(` ${text(node)} `));
      }
    }
  });
  p.normalize();
  if (p.firstChild && p.firstChild.nodeType === 3) p.firstChild.textContent = p.firstChild.textContent.replace(/^\s+/, '');
  if (p.lastChild && p.lastChild.nodeType === 3) p.lastChild.textContent = p.lastChild.textContent.replace(/\s+$/, '');
  return p.textContent.trim() ? p : null;
}

export default function parse(element, { document, params }) {
  const base = (params && params.originalURL) || SOURCE_URL;
  const cells = [];

  const tiles = [...element.querySelectorAll('article.game-tile')];

  tiles.forEach((tile) => {
    // cell 1: image + jackpot strip
    const imageCell = [];
    const imgContainer = tile.querySelector('.game-tile-image-container');
    if (imgContainer) {
      const direct = imgContainer.querySelector(':scope > img');
      const src = direct ? direct.getAttribute('src') : bgUrl(imgContainer);
      if (src) {
        const img = document.createElement('img');
        img.src = absUrl(src, base);
        img.alt = text(tile.querySelector('.game-tile-title'));
        imageCell.push(img);
      }
      const jackpot = imgContainer.querySelector('[class^="jackpot-"], [class*=" jackpot-"]');
      if (jackpot) {
        const prizeBar = jackpot.querySelector('.prize-bar');
        if (prizeBar && text(prizeBar)) imageCell.push(para(document, text(prizeBar)));
        const plusBar = jackpot.querySelector('.max-plus-bar');
        if (plusBar) {
          // Use the whole bar text: unclassed <span>s may be stripped before parsing.
          // Adjacent spans may have no whitespace between them, so re-space the "×".
          const line = plusBar.textContent.replace(/[\s ]+/g, ' ').replace(/\s*×\s*/g, ' × ').trim();
          if (line) imageCell.push(para(document, line));
        }
      }
    }

    // cell 2: title, description, draw details, CTA
    const contentCell = [];
    const content = tile.querySelector('.game-tile-content') || tile;
    const title = content.querySelector('.game-tile-title, h3');
    if (title && text(title)) {
      const h = document.createElement('h3');
      h.textContent = text(title);
      contentCell.push(h);
    }
    const desc = content.querySelector('.game-tile-description');
    if (desc) {
      const ps = desc.querySelectorAll('p');
      if (ps.length) {
        ps.forEach((p) => {
          const rebuilt = rebuildParagraph(document, p, base);
          if (rebuilt) contentCell.push(rebuilt);
        });
      } else if (text(desc)) {
        contentCell.push(para(document, text(desc)));
      }
    }
    content.querySelectorAll('p.next-jackpot-date, p.next-jackpot-prize, p.prize-info').forEach((p) => {
      if (text(p)) contentCell.push(para(document, text(p)));
    });
    const cta = content.querySelector(':scope > a.button[href], a.arrow-button[href]');
    if (cta && text(cta)) contentCell.push(para(document, link(document, cta, base)));

    // cell 3: badge
    let badge = '';
    const flag = tile.querySelector('.game-flag');
    if (flag) {
      if (flag.classList.contains('new')) badge = 'NEW';
      else badge = text(flag).replace(/^\[(.*?)(-[a-z]{2})?\]$/, '$1').toUpperCase();
    }

    if (!imageCell.length && !contentCell.length) return;
    cells.push([
      imageCell.length ? imageCell : '',
      contentCell.length ? contentCell : '',
      badge,
    ]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-game-tile', cells });
  element.replaceWith(block);
}
