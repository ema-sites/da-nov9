/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-alc.js
  var import_alc_exports = {};
  __export(import_alc_exports, {
    default: () => import_alc_default
  });

  // tools/importer/parsers/carousel-promo.js
  var SOURCE_URL = "https://www.alc.ca/content/alc/en.html";
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
    const src = srcImg.getAttribute("src") || srcImg.getAttribute("data-src");
    if (!src) return null;
    const img = document.createElement("img");
    img.src = absUrl(src, base);
    img.alt = srcImg.getAttribute("alt") || "";
    return img;
  }
  function bgUrl(el) {
    if (!el) return null;
    const style = el.getAttribute("style") || "";
    const m = style.match(/background-image\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
    if (m) return m[1];
    return el.getAttribute("data-bgimage") || null;
  }
  function resolveImage(document, el, base, directImgSelector) {
    if (!el) return null;
    const direct = directImgSelector ? el.querySelector(directImgSelector) : null;
    if (direct) return makeImage(document, direct, base);
    const spans = [...el.querySelectorAll(":scope > span[data-src]")];
    const src = spans.length && spans[spans.length - 1].getAttribute("data-src") || bgUrl(el);
    if (!src) return null;
    const img = document.createElement("img");
    img.src = absUrl(src, base);
    img.alt = "";
    return img;
  }
  function text(el) {
    return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
  }
  function para(document, content) {
    const p = document.createElement("p");
    if (typeof content === "string") p.textContent = content;
    else if (content) p.append(content);
    return p;
  }
  function parseDrawSlide(document, slide, base) {
    const wrapper = slide.querySelector(".alc-external-data");
    const bg = resolveImage(document, wrapper, base, ":scope > img");
    const content = [];
    const logoSrc = slide.querySelector(".draw__logo img");
    const logo = makeImage(document, logoSrc, base);
    if (logo) {
      if (/\.svg$/i.test(logo.getAttribute("src"))) logo.setAttribute("src", `${logo.getAttribute("src")}#logo`);
      if (!logo.alt) logo.alt = "LOTTO 6/49";
      content.push(para(document, logo));
    }
    const nextDraw = slide.querySelector(".draw--649-nextDraw label");
    if (nextDraw) content.push(para(document, text(nextDraw)));
    const classic = slide.querySelector(".draw__logo--649__banner__contents");
    if (classic) {
      const labels = [...classic.querySelectorAll("label")].map(text).filter(Boolean);
      const line = labels.join(" ").replace(/^\$\s+/, "$").trim();
      if (line) content.push(para(document, line));
    }
    const amount = slide.querySelector(".draw__prize-amount");
    if (amount) {
      const digits = amount.textContent.replace(/\D/g, "");
      const value = digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";
      if (value) {
        const h = document.createElement("h2");
        h.textContent = `$${value}`;
        content.push(h);
      }
    }
    const goldball = slide.querySelector(".draw__hero-content__goldball__jackpot label");
    if (goldball) {
      const gb = text(goldball).replace(/^G\s+LD/, "GOLD");
      if (gb) content.push(para(document, gb));
    }
    const guaranteed = slide.querySelector(".draw__hero-content__goldball__guaranteed label");
    if (guaranteed && text(guaranteed)) content.push(para(document, text(guaranteed)));
    const cta = slide.querySelector(".draw__cta a");
    if (cta) {
      const a = document.createElement("a");
      a.href = absUrl(cta.getAttribute("href"), base);
      a.textContent = text(cta);
      content.push(para(document, a));
    }
    return [bg ? [bg] : "", content.length ? content : ""];
  }
  function parsePromoSlide(document, slide, base) {
    const article = slide.querySelector("article.fca-carousel-slide-promo") || slide;
    const img = resolveImage(document, article.querySelector(".slide-content"), base, ":scope > img");
    if (!img) return null;
    const link2 = article.querySelector("a[href]");
    let imageCell = img;
    if (link2) {
      const a = document.createElement("a");
      a.href = absUrl(link2.getAttribute("href"), base);
      a.append(img);
      imageCell = a;
    }
    const overlay = article.querySelector(".slide-content .content");
    const overlayText = text(overlay);
    if (overlayText) {
      const content = [...overlay.childNodes].map((n) => n.cloneNode(true));
      return [[imageCell], content];
    }
    return [[imageCell], ""];
  }
  function parse(element, { document, params }) {
    const base = params && params.originalURL || SOURCE_URL;
    const cells = [];
    const slides = [...element.querySelectorAll("ul.slides > li.slide")].filter((li) => !li.classList.contains("slick-cloned"));
    slides.forEach((slide) => {
      let row = null;
      if (slide.querySelector(".alc-external-data, #draw-subcomponent")) {
        row = parseDrawSlide(document, slide, base);
      } else {
        row = parsePromoSlide(document, slide, base);
      }
      if (row && row[0]) cells.push(row);
    });
    cells.forEach((row) => {
      while (row.length < 2) row.push("");
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-promo", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-winners.js
  var SOURCE_URL2 = "https://www.alc.ca/content/alc/en.html";
  var STANDARD_BG = "https://www.alc.ca/content/dam/alc/images/static/winners-carousel/winners-carousel-bg-generic.png";
  function absUrl2(url, base) {
    if (!url) return url;
    try {
      return new URL(url.trim(), base).href;
    } catch (e) {
      return url;
    }
  }
  function imgFrom(document, src, alt, base) {
    if (!src) return null;
    const img = document.createElement("img");
    img.src = absUrl2(src, base);
    img.alt = alt || "";
    return img;
  }
  function bgUrl2(el) {
    if (!el) return null;
    const style = el.getAttribute("style") || "";
    const m = style.match(/background-image\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
    return m ? m[1] : null;
  }
  function text2(el) {
    return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
  }
  function para2(document, content) {
    const p = document.createElement("p");
    if (typeof content === "string") p.textContent = content;
    else if (content) p.append(content);
    return p;
  }
  function parse2(element, { document, params }) {
    const base = params && params.originalURL || SOURCE_URL2;
    const cells = [];
    const slides = [...element.querySelectorAll(".winners-carousel-slides .slide")].filter((s) => !s.closest(".slick-cloned"));
    const first = slides[0];
    if (first) {
      const directBg = first.querySelector(":scope > img");
      let bg = null;
      if (directBg) bg = imgFrom(document, directBg.getAttribute("src"), "", base);
      else if (bgUrl2(first)) bg = imgFrom(document, bgUrl2(first), "", base);
      else if (first.classList.contains("standard-bg")) bg = imgFrom(document, STANDARD_BG, "", base);
      if (bg) cells.push([bg]);
    }
    slides.forEach((slide) => {
      const photoEl = slide.querySelector(".winner-image");
      let photo = null;
      if (photoEl) {
        const inner = photoEl.querySelector("img");
        const src = inner ? inner.getAttribute("src") : bgUrl2(photoEl);
        const name = text2(slide.querySelector(".winner-info h3"));
        photo = imgFrom(document, src, name, base);
      }
      const info = slide.querySelector(".winner-info");
      const infoCell = [];
      if (info) {
        const h3 = info.querySelector("h3");
        if (h3 && text2(h3)) {
          const h = document.createElement("h3");
          h.textContent = text2(h3);
          infoCell.push(h);
        }
        const city = info.querySelector(".h2, span");
        if (city && text2(city)) infoCell.push(para2(document, text2(city)));
        const cta = info.querySelector("a[href]");
        if (cta) {
          const a = document.createElement("a");
          a.href = absUrl2(cta.getAttribute("href"), base).replace(/(\.html)+(?=([?#]|$))/, ".html");
          a.textContent = text2(cta) || "See all winners";
          infoCell.push(para2(document, a));
        }
      }
      const prize = slide.querySelector(".prize-details");
      const prizeCell = [];
      if (prize) {
        const logo = prize.querySelector("img.winning-game-logo, .game-title img");
        if (logo) {
          const img = imgFrom(document, logo.getAttribute("src"), logo.getAttribute("alt") || "game logo", base);
          if (img) prizeCell.push(para2(document, img));
        }
        const label = prize.querySelector(".winning-game-ribbon");
        if (label && text2(label)) prizeCell.push(para2(document, text2(label)));
        const amount = prize.querySelector(".prize-amount");
        if (amount) {
          const digits = amount.textContent.replace(/\D/g, "");
          const value = digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";
          if (value) prizeCell.push(para2(document, `$${value}`));
        }
      }
      if (!photo && !infoCell.length) return;
      cells.push([
        photo || "",
        infoCell.length ? infoCell : "",
        prizeCell.length ? prizeCell : ""
      ]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-winners", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-game-tile.js
  var SOURCE_URL3 = "https://www.alc.ca/content/alc/en.html";
  function absUrl3(url, base) {
    if (!url) return url;
    try {
      return new URL(url.trim(), base).href;
    } catch (e) {
      return url;
    }
  }
  function bgUrl3(el) {
    if (!el) return null;
    const style = el.getAttribute("style") || "";
    const m = style.match(/background-image\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
    return m ? m[1] : null;
  }
  function text3(el) {
    return el ? el.textContent.replace(/[​-‍﻿]/g, "").replace(/\s+/g, " ").trim() : "";
  }
  function para3(document, content) {
    const p = document.createElement("p");
    if (typeof content === "string") p.textContent = content;
    else if (content) p.append(content);
    return p;
  }
  function link(document, src, base) {
    const a = document.createElement("a");
    a.href = absUrl3(src.getAttribute("href"), base);
    a.textContent = text3(src);
    return a;
  }
  function rebuildParagraph(document, srcP, base) {
    const p = document.createElement("p");
    srcP.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        const t = node.textContent.replace(/[​-‍﻿]/g, "").replace(/\s+/g, " ");
        if (t.trim()) p.append(document.createTextNode(t));
      } else if (node.nodeType === 1) {
        if (node.tagName === "A" && node.getAttribute("href")) {
          if (p.childNodes.length) p.append(document.createTextNode(" "));
          p.append(link(document, node, base));
        } else if (text3(node)) {
          p.append(document.createTextNode(` ${text3(node)} `));
        }
      }
    });
    p.normalize();
    if (p.firstChild && p.firstChild.nodeType === 3) p.firstChild.textContent = p.firstChild.textContent.replace(/^\s+/, "");
    if (p.lastChild && p.lastChild.nodeType === 3) p.lastChild.textContent = p.lastChild.textContent.replace(/\s+$/, "");
    return p.textContent.trim() ? p : null;
  }
  function parse3(element, { document, params }) {
    const base = params && params.originalURL || SOURCE_URL3;
    const cells = [];
    const tiles = [...element.querySelectorAll("article.game-tile")];
    tiles.forEach((tile) => {
      const imageCell = [];
      const imgContainer = tile.querySelector(".game-tile-image-container");
      if (imgContainer) {
        const direct = imgContainer.querySelector(":scope > img");
        const src = direct ? direct.getAttribute("src") : bgUrl3(imgContainer);
        if (src) {
          const img = document.createElement("img");
          img.src = absUrl3(src, base);
          img.alt = text3(tile.querySelector(".game-tile-title"));
          imageCell.push(img);
        }
        const jackpot = imgContainer.querySelector('[class^="jackpot-"], [class*=" jackpot-"]');
        if (jackpot) {
          const prizeBar = jackpot.querySelector(".prize-bar");
          if (prizeBar && text3(prizeBar)) imageCell.push(para3(document, text3(prizeBar)));
          const plusBar = jackpot.querySelector(".max-plus-bar");
          if (plusBar) {
            const line = plusBar.textContent.replace(/[\s ]+/g, " ").replace(/\s*×\s*/g, " \xD7 ").trim();
            if (line) imageCell.push(para3(document, line));
          }
        }
      }
      const contentCell = [];
      const content = tile.querySelector(".game-tile-content") || tile;
      const title = content.querySelector(".game-tile-title, h3");
      if (title && text3(title)) {
        const h = document.createElement("h3");
        h.textContent = text3(title);
        contentCell.push(h);
      }
      const desc = content.querySelector(".game-tile-description");
      if (desc) {
        const ps = desc.querySelectorAll("p");
        if (ps.length) {
          ps.forEach((p) => {
            const rebuilt = rebuildParagraph(document, p, base);
            if (rebuilt) contentCell.push(rebuilt);
          });
        } else if (text3(desc)) {
          contentCell.push(para3(document, text3(desc)));
        }
      }
      content.querySelectorAll("p.next-jackpot-date, p.next-jackpot-prize, p.prize-info").forEach((p) => {
        if (text3(p)) contentCell.push(para3(document, text3(p)));
      });
      const cta = content.querySelector(":scope > a.button[href], a.arrow-button[href]");
      if (cta && text3(cta)) contentCell.push(para3(document, link(document, cta, base)));
      let badge = "";
      const flag = tile.querySelector(".game-flag");
      if (flag) {
        if (flag.classList.contains("new")) badge = "NEW";
        else badge = text3(flag).replace(/^\[(.*?)(-[a-z]{2})?\]$/, "$1").toUpperCase();
      }
      if (!imageCell.length && !contentCell.length) return;
      cells.push([
        imageCell.length ? imageCell : "",
        contentCell.length ? contentCell : "",
        badge
      ]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-game-tile", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/alc-cleanup.js
  var TRACKING_PATTERN = /adservice\.google|adnxs\.com|doubleclick\.net|googletagmanager|google-analytics|facebook\.com\/tr|bat\.bing\.com|analytics\.twitter|t\.co\/i\/adsct|px\.ads\.linkedin/i;
  function removeAll(root, selectors) {
    selectors.forEach((selector) => {
      try {
        root.querySelectorAll(selector).forEach((el) => el.remove());
      } catch (e) {
      }
    });
  }
  function removeTracking(root) {
    root.querySelectorAll("iframe").forEach((el) => el.remove());
    root.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      const w = img.getAttribute("width");
      const h = img.getAttribute("height");
      if (TRACKING_PATTERN.test(src) || w === "1" && h === "1") img.remove();
    });
  }
  function pickSrcsetUrl(srcset) {
    const candidates = srcset.split(",").map((c) => c.trim()).filter(Boolean).map((c) => {
      const [url, desc = ""] = c.split(/\s+/);
      const w = /^(\d+)w$/.exec(desc);
      return { url, w: w ? parseInt(w[1], 10) : 0 };
    });
    if (!candidates.length) return null;
    return candidates.reduce((best, c) => c.w > best.w ? c : best, candidates[0]).url;
  }
  function useDesktopRendition(root, baseUrl) {
    root.querySelectorAll("picture").forEach((picture) => {
      const img = picture.querySelector("img");
      if (!img) return;
      let best = null;
      let bestWidth = -1;
      picture.querySelectorAll("source").forEach((source) => {
        const srcset = source.getAttribute("srcset") || source.getAttribute("data-srcset");
        if (!srcset) return;
        const media = source.getAttribute("media") || "";
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
      }
      if (img.getAttribute("src") !== absolute) img.setAttribute("src", absolute);
    });
  }
  function transform(hookName, element, payload) {
    if (hookName === "beforeTransform") {
      const baseUrl = payload && (payload.url || payload.params && payload.params.originalURL) || "https://www.alc.ca/content/alc/en.html";
      useDesktopRendition(element, baseUrl);
      removeAll(element, [
        // header + navigation (desktop and mobile), includes login modal flow
        ".cmp-experiencefragment--header",
        ".experiencefragment:has(> .cmp-experiencefragment--header)",
        "header",
        "nav",
        "#nav-mobile",
        // footer: jackpot-alert subscribe band, app download, links, social bar
        ".cmp-experiencefragment--footer",
        "footer.experiencefragment",
        ".alc-footer",
        ".footer-subscribe",
        "#emailCollection",
        "footer",
        // skip link
        ".cmp-page__skiptomaincontent",
        // mobile-only empty winning-numbers promo banner (no authorable content)
        ".html-promo",
        // modals / browser check / survey intercept container
        ".common-modals",
        ".alc-modal",
        ".modal",
        "#ZN_3Eu2u7P45FmpwJ5",
        // cookie / consent UI (generic)
        "#onetrust-consent-sdk",
        "#onetrust-banner-sdk",
        ".onetrust-pc-dark-filter",
        "#CybotCookiebotDialog",
        ".cookie-banner",
        ".cookie-consent",
        '[id*="cookie-consent"]',
        // non-content resources
        "script",
        "style",
        "noscript",
        "link"
      ]);
      element.querySelectorAll(".alc-mobile-banner").forEach((el) => {
        const wrapper = el.closest(".banner");
        (wrapper || el).remove();
      });
      removeTracking(element);
    }
    if (hookName === "afterTransform") {
      removeAll(element, [
        "header",
        "footer",
        "nav",
        "script",
        "style",
        "noscript",
        "link",
        "iframe",
        "#ZN_3Eu2u7P45FmpwJ5"
      ]);
      removeTracking(element);
      element.querySelectorAll("[data-cmp-link-accessibility-enabled], [data-cmp-link-accessibility-text]").forEach((el) => {
        el.removeAttribute("data-cmp-link-accessibility-enabled");
        el.removeAttribute("data-cmp-link-accessibility-text");
      });
      element.querySelectorAll("*").forEach((el) => {
        [...el.attributes].forEach((attr) => {
          if (/^(data-(analytics|track|gtm|ga|cmp-data-layer|cmp-clickable)|onclick)/i.test(attr.name)) {
            el.removeAttribute(attr.name);
          }
        });
      });
    }
  }

  // tools/importer/transformers/alc-sections.js
  var MARKER_ATTR = "data-excat-section-id";
  var FIRST_MARKER_ATTR = "data-excat-first-section";
  function findSectionElement(root, section) {
    const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
    for (let i = 0; i < selectors.length; i += 1) {
      const sel = selectors[i];
      if (!sel) continue;
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (e) {
      }
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    const template = payload && payload.template;
    const sections = template && template.sections || [];
    if (sections.length < 2) return;
    const document = element.ownerDocument || payload.document;
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const el = findSectionElement(element, section);
        if (!el || !el.parentNode) continue;
        if (i === 0 && !section.style) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(MARKER_ATTR, section.id);
        if (i === 0) hr.setAttribute(FIRST_MARKER_ATTR, "true");
        el.parentNode.insertBefore(hr, el);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const marker = element.querySelector(`hr[${MARKER_ATTR}="${section.id}"]`);
        if (section.style) {
          const metadata = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
          });
          const el = findSectionElement(element, section);
          if (el && el.parentNode) {
            el.after(metadata);
          } else if (marker && marker.parentNode) {
            marker.after(metadata);
          }
        }
        if (marker) {
          if (marker.hasAttribute(FIRST_MARKER_ATTR)) {
            marker.remove();
          } else {
            marker.removeAttribute(MARKER_ATTR);
          }
        }
      }
    }
  }

  // tools/importer/import-alc.js
  var PAGE_TEMPLATE = {
    name: "alc",
    urls: [
      "https://www.alc.ca/content/alc/en.html"
    ],
    representativeUrl: "https://www.alc.ca/content/alc/en.html",
    description: "Atlantic Lottery homepage: promo carousel, recent winners carousel, featured game tiles with a promo image rail",
    blocks: [
      {
        name: "carousel-promo",
        instances: [
          ".carousel.list.parbase.hero",
          ".carousel.hero"
        ]
      },
      {
        name: "carousel-winners",
        instances: [
          ".winners_carousel.winners-carousel",
          ".winners-carousel"
        ]
      },
      {
        name: "cards-game-tile",
        instances: [
          ".cmp-container--game-tiles"
        ]
      }
    ],
    sections: [
      {
        id: "section-1",
        name: "Hero promo carousel",
        selector: [
          ".carousel.list.parbase.hero",
          ".carousel.hero"
        ],
        style: null,
        blocks: [
          "carousel-promo"
        ],
        defaultContent: []
      },
      {
        id: "section-2",
        name: "Recent winners",
        selector: [
          ".section-header.cmp-section-header--alc-blue",
          ".cmp-section-header--alc-blue"
        ],
        style: null,
        blocks: [
          "carousel-winners"
        ],
        defaultContent: [
          ".cmp-section-header--alc-blue .cmp-section-header__title"
        ]
      },
      {
        id: "section-3",
        name: "Featured games and promotions",
        selector: [
          ".alc-container:has(> .cmp-container > .aem-Grid > .cmp-section-header--alc-green)",
          ".section-header.cmp-section-header--alc-green"
        ],
        style: "split",
        blocks: [
          "cards-game-tile"
        ],
        defaultContent: [
          ".cmp-section-header--alc-green .cmp-section-header__title",
          ".cmp-container--hide-column-gutters .cmp-image"
        ]
      }
    ],
    urlPattern: "/content/alc/*"
  };
  var parsers = {
    "carousel-promo": parse,
    "carousel-winners": parse2,
    "cards-game-tile": parse3
  };
  var sectionTransformers = [transform2];
  var fragmentTransformers = [];
  var lateTransformers = [...sectionTransformers, ...fragmentTransformers];
  var transformers = [transform, ...lateTransformers];
  var earlyTransformers = transformers.filter((fn) => !lateTransformers.includes(fn));
  var CATALOG = Boolean(PAGE_TEMPLATE.pageCleanup || PAGE_TEMPLATE.blocks.some((b) => b.pageInstances));
  function executeTransformers(hookName, element, payload, list = transformers) {
    var _a, _b;
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: ((_b = (_a = payload.params) == null ? void 0 : _a.targets) == null ? void 0 : _b.template) || PAGE_TEMPLATE });
    list.forEach((fn) => {
      try {
        fn(hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template, url) {
    const pageBlocks = [];
    const pageKey = (u) => {
      try {
        const { origin, pathname } = new URL(u);
        return `${origin}${pathname.replace(/\/$/, "")}`;
      } catch (e) {
        return u;
      }
    };
    const key = pageKey(url);
    const claim = (blockDef, selector) => {
      let matches = [];
      try {
        matches = document.querySelectorAll(selector);
      } catch (e) {
        return;
      }
      matches.forEach((element) => {
        if (pageBlocks.some((b) => b.element === element || b.element.contains(element) || element.contains(b.element))) return;
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    };
    template.blocks.forEach((blockDef) => {
      const entry = Object.entries(blockDef.pageInstances || {}).find(([u]) => pageKey(u) === key);
      (entry ? entry[1] : []).forEach((selector) => claim(blockDef, selector));
    });
    template.blocks.forEach((blockDef) => (blockDef.instances || []).forEach((selector) => claim(blockDef, selector)));
    return pageBlocks;
  }
  function markPageTargets(payload) {
    const { document, params } = payload;
    executeTransformers("beforeTransform", document.body, payload, earlyTransformers);
    const blocks = findBlocksOnPage(document, PAGE_TEMPLATE, params.originalURL).map(({ name, selector, element }, i) => {
      element.setAttribute("data-excat-block", String(i));
      return { name, selector };
    });
    const sections = (PAGE_TEMPLATE.sections || []).map((section, i) => {
      const target = (section.selector || []).map((s) => {
        try {
          return document.querySelector(s);
        } catch (e) {
          return null;
        }
      }).find(Boolean);
      if (!target) return section;
      target.setAttribute("data-excat-section", String(i));
      return __spreadProps(__spreadValues({}, section), { selector: [`[data-excat-section="${i}"]`] });
    });
    params.targets = { blocks, template: __spreadProps(__spreadValues({}, PAGE_TEMPLATE), { sections }) };
  }
  var import_alc_default = {
    preprocess: (payload) => {
      if (CATALOG) markPageTargets(payload);
    },
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      params.fragments = [];
      if (!params.targets) markPageTargets(payload);
      const pageBlocks = params.targets.blocks.map((block, i) => __spreadProps(__spreadValues({}, block), { element: document.querySelector(`[data-excat-block="${i}"]`) })).filter((block) => block.element);
      executeTransformers("beforeTransform", main, __spreadProps(__spreadValues({}, payload), { pageBlocks }), lateTransformers);
      pageBlocks.forEach((block) => {
        if (!main.contains(block.element)) return;
        const parser = parsers[block.name];
        if (!parser) return;
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      });
      executeTransformers("afterTransform", main, payload);
      main.appendChild(document.createElement("hr"));
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      params.fragments.forEach(({ element }) => {
        executeTransformers("afterTransform", element, payload, earlyTransformers);
        WebImporter.rules.transformBackgroundImages(element, document);
        WebImporter.rules.adjustImageUrls(element, url, params.originalURL);
      });
      const rawPath = new URL(params.originalURL).pathname.replace(/^\/content\/alc(?=\/|$)/, "").replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) }
      }, ...params.fragments];
    }
  };
  return __toCommonJS(import_alc_exports);
})();
