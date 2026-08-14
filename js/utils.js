/**
 * Tropical Cyclone Database - Utility Functions
 */

/**
 * Parses current URL search parameters into an object.
 */
function getUrlMapState() {
  const params = new URLSearchParams(window.location.search);
  return {
    lat: params.has('lat') ? parseFloat(params.get('lat')) : null,
    lon: params.has('lon') ? parseFloat(params.get('lon')) : null,
    zoom: params.has('zoom') ? parseInt(params.get('zoom'), 10) : null,
    yearMin: params.has('year_min') ? parseInt(params.get('year_min'), 10) : null,
    yearMax: params.has('year_max') ? parseInt(params.get('year_max'), 10) : null,
    cat: params.has('cat') ? params.get('cat').split(',').map(Number) : null,
    storm: params.get('storm') || null
  };
}

/**
 * Updates URL search parameters without reloading the page.
 */
function setUrlMapState(state) {
  const params = new URLSearchParams(window.location.search);

  if (state.lat !== null && !isNaN(state.lat)) params.set('lat', state.lat.toFixed(4));
  if (state.lon !== null && !isNaN(state.lon)) params.set('lon', state.lon.toFixed(4));
  if (state.zoom !== null && !isNaN(state.zoom)) params.set('zoom', state.zoom);
  if (state.yearMin !== null) params.set('year_min', state.yearMin);
  if (state.yearMax !== null) params.set('year_max', state.yearMax);
  if (state.cat && state.cat.length) params.set('cat', state.cat.join(','));
  if (state.storm) params.set('storm', state.storm);
  else params.delete('storm');

  const newUrl = window.location.pathname + '?' + params.toString();
  window.history.replaceState(null, '', newUrl);
}

/**
 * Toggles skeleton loaders on/off for a container.
 */
function toggleSkeleton(elementId, show) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (show) {
    el.classList.add('skeleton');
    el.setAttribute('aria-busy', 'true');
  } else {
    el.classList.remove('skeleton');
    el.removeAttribute('aria-busy');
  }
}

/**
 * Initializes mobile navigation menu toggle across all pages.
 */
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.querySelector('.mobile-nav-toggle');
  const navLinks = document.querySelector('.topnav-links');
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', !isExpanded);
      navLinks.classList.toggle('open');
    });
  }
});
