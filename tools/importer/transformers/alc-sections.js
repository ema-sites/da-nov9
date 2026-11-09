/* eslint-disable */
/* global WebImporter */

/**
 * Atlantic Lottery (alc.ca) section transformer.
 * beforeTransform: inserts <hr> section breaks (reverse order) while the
 *   parser target elements still exist; styled sections get a marker.
 * afterTransform: appends Section Metadata for styled sections and removes
 *   temporary markers.
 */

const MARKER_ATTR = 'data-excat-section-id';
const FIRST_MARKER_ATTR = 'data-excat-first-section';

function findSectionElement(root, section) {
  const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
  for (let i = 0; i < selectors.length; i += 1) {
    const sel = selectors[i];
    if (!sel) continue;
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch (e) {
      // unsupported selector (e.g. :has) - try next
    }
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const template = payload && payload.template;
  const sections = (template && template.sections) || [];
  if (sections.length < 2) return;
  const document = element.ownerDocument || payload.document;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const el = findSectionElement(element, section);
      if (!el || !el.parentNode) continue;
      if (i === 0 && !section.style) continue;
      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(MARKER_ATTR, section.id);
      if (i === 0) hr.setAttribute(FIRST_MARKER_ATTR, 'true');
      el.parentNode.insertBefore(hr, el);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const marker = element.querySelector(`hr[${MARKER_ATTR}="${section.id}"]`);
      if (section.style) {
        const metadata = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
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
