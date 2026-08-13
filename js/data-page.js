/**
 * Tropical Cyclone Database - Data Page Logic (data.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Add tab switching or interactive HURDAT2 preview helpers
  const codeBlocks = document.querySelectorAll('.data-code-block');
  codeBlocks.forEach(block => {
    block.setAttribute('tabindex', '0');
  });
});
