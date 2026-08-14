/**
 * Tropical Cyclone Database - About Page Logic (about.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Gallery image focus / zoom handlers
  const galleryImgs = document.querySelectorAll('.about-gallery-img-single');
  galleryImgs.forEach(img => {
    img.setAttribute('tabindex', '0');
  });
});
