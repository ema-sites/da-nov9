/* eslint-disable */
/* global WebImporter */

/**
 * Atlantic Lottery (alc.ca) cleanup transformer.
 * Removes non-authorable chrome: header/nav experience fragment, footer
 * experience fragment (jackpot-alert email signup, app download, social bar),
 * skip link, modals, survey/consent widgets and tracking pixels/iframes.
 * All selectors come from migration-work/cleaned.html.
 */

const TRACKING_PATTERN = /adservice\.google|adnxs\.com|doubleclick\.net|googletagmanager|google-analytics|facebook\.com\/tr|bat\.bing\.com|analytics\.twitter|t\.co\/i\/adsct|px\.ads\.linkedin/i;

function removeAll(root, selectors) {
  selectors.forEach((selector) => {
    try {
      root.querySelectorAll(selector).forEach((el) => el.remove());
    } catch (e) {
      // ignore unsupported selectors
    }
  });
}

function removeTracking(root) {
  root.querySelectorAll('iframe').forEach((el) => el.remove());
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    const w = img.getAttribute('width');
    const h = img.getAttribute('height');
    if (TRACKING_PATTERN.test(src) || (w === '1' && h === '1')) img.remove();
  });
}

/**
 * Pick the first URL from a srcset; when width descriptors are present,
 * prefer the widest candidate.
 */
function pickSrcsetUrl(srcset) {
  const candidates = srcset.split(',').map((c) => c.trim()).filter(Boolean).map((c) => {
    const [url, desc = ''] = c.split(/\s+/);
    const w = /^(\d+)w$/.exec(desc);
    return { url, w: w ? parseInt(w[1], 10) : 0 };
  });
  if (!candidates.length) return null;
  return candidates.reduce((best, c) => (c.w > best.w ? c : best), candidates[0]).url;
}

/**
 * AEM pictures put the desktop rendition in <source media="(min-width: 1200px)">
 * and the mobile rendition in the <img> fallback. Promote the source with the
 * widest min-width media query to the <img> src. Pictures without usable
 * <source srcset> are left untouched.
 */
function useDesktopRendition(root, baseUrl) {
  root.querySelectorAll('picture').forEach((picture) => {
    const img = picture.querySelector('img');
    if (!img) return;
    let best = null;
    let bestWidth = -1;
    picture.querySelectorAll('source').forEach((source) => {
      const srcset = source.getAttribute('srcset') || source.getAttribute('data-srcset');
      if (!srcset) return;
      const media = source.getAttribute('media') || '';
      if (/max-width/i.test(media) && !/min-width/i.test(media)) return;
      const m = /min-width:\s*(\d+)/i.exec(media);
      const width = m ? parseInt(m[1], 10) : 0;
      if (width > bestWidth) {
        bestWidth = width;
        best = srcset;
      }
    });
    if (!best || bestWidth <= 0) return;
    const url = pickSrcsetUrl(best);
    if (!url) return;
    let absolute = url;
    try {
      absolute = new URL(url, baseUrl).href;
    } catch (e) {
      // keep as-is
    }
    if (img.getAttribute('src') !== absolute) img.setAttribute('src', absolute);
  });
}

export default function transform(hookName, element, payload) {
  if (hookName === 'beforeTransform') {
    const baseUrl = (payload && (payload.url || (payload.params && payload.params.originalURL)))
      || 'https://www.alc.ca/content/alc/en.html';
    useDesktopRendition(element, baseUrl);

    removeAll(element, [
      // header + navigation (desktop and mobile), includes login modal flow
      '.cmp-experiencefragment--header',
      '.experiencefragment:has(> .cmp-experiencefragment--header)',
      'header',
      'nav',
      '#nav-mobile',
      // footer: jackpot-alert subscribe band, app download, links, social bar
      '.cmp-experiencefragment--footer',
      'footer.experiencefragment',
      '.alc-footer',
      '.footer-subscribe',
      '#emailCollection',
      'footer',
      // skip link
      '.cmp-page__skiptomaincontent',
      // mobile-only empty winning-numbers promo banner (no authorable content)
      '.html-promo',
      // modals / browser check / survey intercept container
      '.common-modals',
      '.alc-modal',
      '.modal',
      '#ZN_3Eu2u7P45FmpwJ5',
      // cookie / consent UI (generic)
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '.onetrust-pc-dark-filter',
      '#CybotCookiebotDialog',
      '.cookie-banner',
      '.cookie-consent',
      '[id*="cookie-consent"]',
      // non-content resources
      'script',
      'style',
      'noscript',
      'link',
    ]);

    // mobile app-install banner ("Download our App" / "Get App") in the
    // right-rail column; 0px tall on desktop, not page content. Remove the
    // .banner wrapper without relying on :has support.
    element.querySelectorAll('.alc-mobile-banner').forEach((el) => {
      const wrapper = el.closest('.banner');
      (wrapper || el).remove();
    });

    removeTracking(element);
  }

  if (hookName === 'afterTransform') {
    // Final sweep for leftover chrome (do NOT remove HTML comments here)
    removeAll(element, [
      'header',
      'footer',
      'nav',
      'script',
      'style',
      'noscript',
      'link',
      'iframe',
      '#ZN_3Eu2u7P45FmpwJ5',
    ]);
    removeTracking(element);

    // Strip tracking / AEM accessibility attributes
    element.querySelectorAll('[data-cmp-link-accessibility-enabled], [data-cmp-link-accessibility-text]').forEach((el) => {
      el.removeAttribute('data-cmp-link-accessibility-enabled');
      el.removeAttribute('data-cmp-link-accessibility-text');
    });
    element.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((attr) => {
        if (/^(data-(analytics|track|gtm|ga|cmp-data-layer|cmp-clickable)|onclick)/i.test(attr.name)) {
          el.removeAttribute(attr.name);
        }
      });
    });
  }
}
