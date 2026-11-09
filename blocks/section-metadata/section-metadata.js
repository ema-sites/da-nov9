import { readBlockConfig, toCamelCase, toClassName } from '../../scripts/aem.js';

/**
 * Applies section metadata that reached the browser unprocessed (e.g. local preview
 * of .plain.html files). Published pages get these classes from the delivery pipeline.
 * @param {Element} block The section-metadata block
 */
export default function decorate(block) {
  const section = block.closest('.section');
  if (section) {
    const meta = readBlockConfig(block);
    Object.entries(meta).forEach(([key, value]) => {
      if (key === 'style') {
        String(value).split(',').map((style) => toClassName(style.trim()))
          .filter(Boolean)
          .forEach((style) => section.classList.add(style));
      } else {
        section.dataset[toCamelCase(key)] = value;
      }
    });
  }
  (block.closest('.section-metadata-wrapper') || block).remove();
}
