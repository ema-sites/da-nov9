// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 900px)');

/**
 * Fetches the nav fragment. Metadata-independent dual fetch:
 * /content/nav.plain.html (local preview) first, then /nav.plain.html (DA/EDS).
 * @returns {Promise<Document|null>} parsed fragment document
 */
async function fetchNavFragment() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // resolve relative image paths against the fragment location
  doc.querySelectorAll('img[src]').forEach((img) => {
    img.setAttribute('src', new URL(img.getAttribute('src'), resp.url).href);
    img.loading = 'eager';
  });
  return doc;
}

/**
 * Returns the trimmed text of an element's own text nodes (ignores child elements).
 * @param {Element} el element
 * @returns {string} direct text
 */
function directText(el) {
  return [...el.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Wraps the bare text nodes of an element in a span (keeps images/children).
 * @param {Element} el element
 * @param {string} className class for the span
 */
function wrapText(el, className) {
  [...el.childNodes].forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = n.textContent.trim();
      n.replaceWith(span);
    }
  });
}

/* ---------------------------------------------------------------- panels */

/**
 * Closes every open megamenu.
 * @param {Element} nav nav element
 * @param {Element} [except] trigger to keep open
 */
function closeAllPanels(nav, except) {
  nav.querySelectorAll('.nav-trigger[aria-expanded="true"]').forEach((trigger) => {
    if (trigger === except) return;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.closest('.nav-drop').classList.remove('is-open');
  });
}

/**
 * Toggles a megamenu trigger.
 * @param {Element} nav nav element
 * @param {Element} trigger trigger link
 * @param {boolean} [force] force state
 */
function togglePanel(nav, trigger, force) {
  const open = force !== undefined ? force : trigger.getAttribute('aria-expanded') !== 'true';
  closeAllPanels(nav, trigger);
  trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  trigger.closest('.nav-drop').classList.toggle('is-open', open);
}

/**
 * Builds a megamenu panel from a nested list.
 * List items with an image and no nested list become tiles; list items with a
 * nested list become side columns (heading + links, optional background image).
 * @param {Element} list nested ul from the fragment
 * @returns {Element} panel element
 */
function buildMegamenu(list) {
  const panel = document.createElement('div');
  panel.className = 'nav-megamenu';
  const tiles = document.createElement('ul');
  tiles.className = 'nav-megamenu-tiles';
  const sides = [];

  [...list.children].forEach((li) => {
    const sub = li.querySelector(':scope > ul');
    if (sub) {
      const side = document.createElement('div');
      side.className = 'nav-megamenu-side';
      const bg = li.querySelector(':scope > img');
      if (bg) side.style.backgroundImage = `url("${bg.src}")`;
      const heading = document.createElement('p');
      heading.className = 'nav-megamenu-heading';
      heading.textContent = directText(li);
      sub.className = 'nav-megamenu-links';
      side.append(heading, sub);
      sides.push(side);
      return;
    }
    const item = document.createElement('li');
    item.className = 'nav-tile';
    const links = [...li.querySelectorAll('a')];
    links.forEach((a) => {
      if (a.querySelector('img')) {
        a.className = links.length === 1 ? 'nav-tile-promo' : 'nav-tile-logo';
        if (links.length === 1) item.classList.add('nav-tile-is-promo');
      } else if (a.closest('strong')) {
        a.className = 'nav-tile-cta button primary';
      } else {
        a.className = 'nav-tile-link';
      }
      item.append(a);
    });
    tiles.append(item);
  });

  // compact list used by the mobile accordion: one link per tile, labelled by its image alt
  const compact = document.createElement('ul');
  compact.className = 'nav-megamenu-compact';
  tiles.querySelectorAll('a.nav-tile-logo, a.nav-tile-promo').forEach((a) => {
    const img = a.querySelector('img');
    if (!img || !img.alt) return;
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = a.href;
    link.textContent = img.alt;
    li.append(link);
    compact.append(li);
  });

  panel.append(tiles, ...sides, compact);
  return panel;
}

/**
 * Decorates the main navigation section.
 * @param {Element} nav nav element
 * @param {Element} section fragment section
 * @returns {Element} decorated sections container
 */
function buildSections(nav, section) {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-sections';
  const list = section.querySelector('ul');
  if (!list) return wrapper;
  list.className = 'nav-list';
  [...list.children].forEach((li) => {
    li.classList.add('nav-item');
    const trigger = li.querySelector(':scope > a');
    const sub = li.querySelector(':scope > ul');
    if (!trigger) return;
    trigger.classList.add('nav-link');
    if (!sub) return;
    li.classList.add('nav-drop');
    trigger.classList.add('nav-trigger');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('role', 'button');
    const caret = document.createElement('span');
    caret.className = 'nav-caret';
    caret.setAttribute('aria-hidden', 'true');
    trigger.append(caret);
    const panel = buildMegamenu(sub);
    sub.remove();
    li.append(panel);
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      togglePanel(nav, trigger);
    });
  });
  wrapper.append(list);
  return wrapper;
}

/**
 * Collects the drawer-only content of the navigation section: paragraphs placed
 * before the list become the drawer header, paragraphs after it the drawer footer.
 * @param {Element} section fragment section
 * @returns {{before: Element[], after: Element[]}} drawer content
 */
function collectDrawerContent(section) {
  const before = [];
  const after = [];
  let seenList = false;
  [...section.children].forEach((el) => {
    if (el.tagName === 'UL') {
      seenList = true;
    } else if (el.tagName === 'P') {
      el.querySelectorAll('a').forEach((a) => wrapText(a, 'nav-offcanvas-label'));
      (seenList ? after : before).push(el);
    }
  });
  return { before, after };
}

/* ----------------------------------------------------------------- tools */

/**
 * Turns a "link with icon + text" paragraph into a search form.
 * The link href is the form action, link text is the placeholder, image alt the label.
 * @param {Element} p paragraph
 * @returns {Element} search form
 */
function buildSearch(p) {
  const a = p.querySelector('a');
  const icon = a.querySelector('img');
  const label = icon ? icon.alt : '';
  const form = document.createElement('form');
  form.className = 'nav-search';
  form.setAttribute('role', 'search');
  form.action = a.href;
  form.method = 'get';
  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'q';
  input.maxLength = 2048;
  input.placeholder = a.textContent.trim();
  input.setAttribute('aria-label', label || input.placeholder);
  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'nav-search-submit';
  button.setAttribute('aria-label', label || input.placeholder);
  if (icon) {
    icon.alt = '';
    button.append(icon);
  }
  form.append(input, button);
  return form;
}

/**
 * Decorates the tools section (search, utility links, account action).
 * @param {Element} section fragment section
 * @param {Element} dialog dialog element opened by the action button
 * @returns {Element} tools container
 */
function buildTools(section, dialog) {
  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  [...section.children].forEach((el) => {
    if (el.tagName === 'UL') {
      el.className = 'nav-utility';
      el.querySelectorAll(':scope > li > em').forEach((em) => {
        em.parentElement.classList.add('nav-utility-short');
        em.replaceWith(...em.childNodes);
      });
      el.querySelectorAll('a').forEach((a) => {
        if (!a.textContent.trim()) {
          a.classList.add('nav-icon-link');
          const img = a.querySelector('img');
          if (img && img.alt) a.setAttribute('aria-label', img.alt);
        } else {
          wrapText(a, 'nav-utility-label');
        }
      });
      tools.append(el);
    } else if (el.tagName === 'P' && el.querySelector('a img') && el.querySelector('a').textContent.trim()) {
      tools.append(buildSearch(el));
    } else if (el.tagName === 'P' && !el.querySelector('a')) {
      const holder = document.createElement('div');
      holder.className = 'nav-account';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-account-button';
      button.setAttribute('aria-haspopup', 'dialog');
      button.append(...el.childNodes);
      wrapText(button, 'nav-account-label');
      button.addEventListener('click', () => {
        // eslint-disable-next-line no-use-before-define
        openDialog(dialog, button);
      });
      holder.append(button);
      tools.append(holder);
    }
  });
  return tools;
}

/* ---------------------------------------------------------------- dialog */

let lastDialogOpener = null;

function closeDialog(dialog) {
  if (dialog.hidden) return;
  dialog.hidden = true;
  document.body.classList.remove('nav-dialog-open');
  if (lastDialogOpener) lastDialogOpener.focus();
}

function openDialog(dialog, opener) {
  lastDialogOpener = opener;
  dialog.hidden = false;
  document.body.classList.add('nav-dialog-open');
  const first = dialog.querySelector('input, button, a');
  if (first) first.focus();
}

/**
 * Builds a form from a list of field labels.
 * - plain item -> text input
 * - item with a nested list -> password input with show/hide toggle (labels from nested list)
 * - item wrapped in <em> -> checkbox
 * - paragraph with a lone <strong> (no link) -> submit button
 * @param {Element} section fragment section
 * @param {number} sectionIndex index used for unique ids
 * @returns {Element} decorated column
 */
function buildFormColumn(section, sectionIndex) {
  const col = document.createElement('div');
  col.className = 'nav-dialog-column';
  let form = null;
  [...section.children].forEach((el) => {
    if (el.tagName === 'UL' && !form && !el.querySelector('a, strong')) {
      form = document.createElement('form');
      form.className = 'nav-dialog-form';
      form.noValidate = true;
      form.addEventListener('submit', (e) => e.preventDefault());
      [...el.children].forEach((li, i) => {
        const id = `nav-field-${sectionIndex}-${i}`;
        const field = document.createElement('div');
        const toggle = li.querySelector(':scope > ul');
        const check = li.querySelector(':scope > em');
        const input = document.createElement('input');
        input.id = id;
        const label = document.createElement('label');
        label.htmlFor = id;
        if (check) {
          field.className = 'nav-field nav-field-checkbox';
          input.type = 'checkbox';
          label.textContent = check.textContent.trim();
          field.append(input, label);
        } else {
          field.className = 'nav-field';
          label.textContent = directText(li);
          input.type = toggle ? 'password' : 'text';
          input.placeholder = label.textContent;
          const head = document.createElement('div');
          head.className = 'nav-field-head';
          head.append(label);
          if (toggle) {
            const [showLabel, hideLabel] = [...toggle.children].map((t) => t.textContent.trim());
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'nav-field-toggle';
            btn.textContent = showLabel;
            btn.setAttribute('aria-pressed', 'false');
            btn.addEventListener('click', () => {
              const shown = input.type === 'text';
              input.type = shown ? 'password' : 'text';
              btn.textContent = shown ? showLabel : hideLabel;
              btn.setAttribute('aria-pressed', shown ? 'false' : 'true');
            });
            head.append(btn);
          }
          field.append(head, input);
        }
        form.append(field);
      });
      col.append(form);
      return;
    }
    const strong = el.querySelector(':scope > strong');
    if (form && el.tagName === 'P' && strong && el.children.length === 1 && !el.querySelector('a') && el.textContent.trim() === strong.textContent.trim()) {
      const submit = document.createElement('button');
      submit.type = 'submit';
      submit.className = 'button nav-dialog-submit';
      submit.textContent = strong.textContent.trim();
      form.append(submit);
      return;
    }
    if (el.tagName === 'P' && el.querySelector(':scope > em') && el.children.length === 1) {
      el.className = 'nav-dialog-note';
    } else if (el.tagName === 'P' && el.querySelector(':scope > strong > a')) {
      el.className = 'nav-dialog-action';
      el.querySelector('a').className = 'button secondary';
    } else if (el.tagName === 'P' && el.querySelector('a')) {
      el.className = 'nav-dialog-links';
    }
    (form || col).append(el);
  });
  return col;
}

/**
 * Builds the modal dialog from the trailing fragment sections.
 * Sections with a heading become columns; a trailing section without a heading is the footer.
 * @param {Element[]} sections fragment sections
 * @returns {Element} dialog element
 */
function buildDialog(sections) {
  const dialog = document.createElement('div');
  dialog.className = 'nav-dialog';
  dialog.hidden = true;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const backdrop = document.createElement('div');
  backdrop.className = 'nav-dialog-backdrop';
  const box = document.createElement('div');
  box.className = 'nav-dialog-box';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav-dialog-close';
  close.setAttribute('aria-label', 'Close');
  const body = document.createElement('div');
  body.className = 'nav-dialog-body';
  box.append(close, body);

  sections.forEach((section, i) => {
    const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      if (!dialog.hasAttribute('aria-labelledby')) {
        heading.id = 'nav-dialog-title';
        dialog.setAttribute('aria-labelledby', heading.id);
      }
      body.append(buildFormColumn(section, i));
    } else {
      const footer = document.createElement('div');
      footer.className = 'nav-dialog-footer';
      footer.append(...section.children);
      footer.querySelectorAll('a').forEach((a) => wrapText(a, 'nav-dialog-footer-label'));
      box.append(footer);
    }
  });

  dialog.append(backdrop, box);
  close.addEventListener('click', () => closeDialog(dialog));
  backdrop.addEventListener('click', () => closeDialog(dialog));
  return dialog;
}

/* ------------------------------------------------------------ hamburger */

function toggleMenu(nav, force) {
  const open = force !== undefined ? force : !nav.classList.contains('is-menu-open');
  nav.classList.toggle('is-menu-open', open);
  const button = nav.querySelector('.nav-hamburger button');
  if (button) button.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.classList.toggle('header-push-open', open && !isDesktop.matches);
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNavFragment();
  if (!fragment) return;
  const sections = [...fragment.body.children].filter((el) => el.tagName === 'DIV');
  const [brandSection, toolsSection, navSection, ...dialogSections] = sections;

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Primary');

  // a text-only paragraph in the brand section is the hamburger label
  const labelP = brandSection
    ? [...brandSection.querySelectorAll(':scope > p')].find((p) => !p.querySelector('a, img'))
    : null;
  const menuLabel = labelP ? labelP.textContent.trim() : '';
  if (labelP) labelP.remove();

  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  const hamburgerButton = document.createElement('button');
  hamburgerButton.type = 'button';
  hamburgerButton.setAttribute('aria-controls', 'nav');
  hamburgerButton.setAttribute('aria-expanded', 'false');
  hamburgerButton.innerHTML = '<span class="nav-hamburger-bar"></span><span class="nav-hamburger-bar"></span><span class="nav-hamburger-bar"></span>';
  if (menuLabel) {
    const label = document.createElement('span');
    label.className = 'nav-hamburger-label';
    label.textContent = menuLabel;
    hamburgerButton.append(label);
  }
  hamburgerButton.addEventListener('click', () => toggleMenu(nav));
  hamburger.append(hamburgerButton);

  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  if (brandSection) {
    brand.append(...brandSection.children);
    const logo = brand.querySelector('a');
    if (logo) logo.classList.add('nav-logo');
  }

  const dialog = buildDialog(dialogSections);
  const tools = toolsSection ? buildTools(toolsSection, dialog) : document.createElement('div');
  // drawer-only content must be read before the list is moved out of the section
  const drawerContent = navSection ? collectDrawerContent(navSection) : { before: [], after: [] };
  const navSections = navSection ? buildSections(nav, navSection) : document.createElement('div');

  // mobile drawer: drawer-only content + copies of the account button and search form
  const drawer = document.createElement('div');
  drawer.className = 'nav-offcanvas';
  const drawerHead = document.createElement('div');
  drawerHead.className = 'nav-offcanvas-head';
  drawerHead.append(...drawerContent.before);
  const account = tools.querySelector('.nav-account-button');
  if (account) {
    const copy = account.cloneNode(true);
    copy.classList.add('nav-offcanvas-account');
    copy.addEventListener('click', () => {
      toggleMenu(nav, false);
      openDialog(dialog, copy);
    });
    drawerHead.append(copy);
  }
  const drawerFoot = document.createElement('div');
  drawerFoot.className = 'nav-offcanvas-foot';
  const search = tools.querySelector('.nav-search');
  if (search) drawerFoot.append(search.cloneNode(true));
  drawerFoot.append(...drawerContent.after);
  drawer.append(drawerHead, navSections, drawerFoot);

  const top = document.createElement('div');
  top.className = 'nav-top';
  const topInner = document.createElement('div');
  topInner.className = 'nav-top-inner';
  topInner.append(hamburger, brand, tools);
  top.append(topInner);
  nav.append(top, drawer);

  // close megamenus on outside click / Escape
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-drop')) closeAllPanels(nav);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!dialog.hidden) {
      closeDialog(dialog);
      return;
    }
    if (nav.classList.contains('is-menu-open') && !isDesktop.matches) {
      toggleMenu(nav, false);
      hamburgerButton.focus();
      return;
    }
    const open = nav.querySelector('.nav-trigger[aria-expanded="true"]');
    closeAllPanels(nav);
    if (open) open.focus();
  });

  // reset state when crossing the desktop breakpoint
  isDesktop.addEventListener('change', () => {
    closeAllPanels(nav);
    toggleMenu(nav, false);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(dialog, nav);
  block.append(navWrapper);
  document.body.classList.add('header-push-enabled');
}
