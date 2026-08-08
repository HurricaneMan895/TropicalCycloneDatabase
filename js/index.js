fetch('data/onthisday-data.json')
  .then((res) => res.json())
  .then((OTD_DATA) => {
    initOtd(OTD_DATA);
  })
  .catch((err) => console.error('Error loading onthisday-data.json:', err));

function initOtd(OTD_DATA) {
  const catColorHex = window.CAT_COLOR_HEX;
  const catLabel = window.CAT_SHORT_LABEL;
  const MONTH_NAMES = window.MONTH_NAMES;

  const today = new Date();
  const todayMonth = today.getMonth() + 1,
    todayDay = today.getDate();
  document.getElementById('otdDate').textContent = `${MONTH_NAMES[todayMonth - 1]} ${todayDay}`;

  function renderOtd(matches, note) {
    const listEl = document.getElementById('otdList');
    if (matches.length === 0) {
      listEl.innerHTML = `<div class="otd-empty">No recorded Atlantic hurricane landfalls on this calendar date in the database (1851&ndash;2025).</div>`;
      return;
    }
    matches.sort((a, b) => b.year - a.year);
    listEl.innerHTML =
      (note ? `<div class="otd-empty">${note}</div>` : '') +
      matches
        .map((m) => {
          const fatLine = m.documented
            ? `${m.fatalities} deaths &middot; ${m.damage} damage`
            : 'Impact not well documented';
          const roundedWind = Math.round(m.windMph / 5) * 5;
          const mapUrl = `hurricane_landfalls.html?_v=60&year=${m.year}&lat=${m.lat}&lon=${m.lon}`;
          return `<div class="otd-item">
<div class="otd-cat" style="background:${catColorHex[m.category]}">${catLabel[m.category]}</div>
<div class="otd-body">
<div class="otd-name">${m.displayName} &mdash; ${m.statesRaw}</div>
<div class="otd-meta">${roundedWind} mph at landfall &middot; ${fatLine}</div>
</div>
<a href="${mapUrl}" class="otd-see-btn">See landfall &rarr;</a>
</div>`;
        })
        .join('');
  }

  let matches = OTD_DATA.filter((d) => d.month === todayMonth && d.day === todayDay);
  const MIN_OTD_ENTRIES = 6; // keep widening the search until we have a healthy, representative spread
  if (matches.length < MIN_OTD_ENTRIES) {
    let widened = matches.slice();
    for (let delta = 1; delta <= 14 && widened.length < MIN_OTD_ENTRIES; delta++) {
      const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - delta);
      const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + delta);
      const near = OTD_DATA.filter(
        (d) =>
          (d.month === d1.getMonth() + 1 && d.day === d1.getDate()) ||
          (d.month === d2.getMonth() + 1 && d.day === d2.getDate()),
      );
      widened = widened.concat(near);
    }
    if (widened.length > matches.length) {
      const note =
        matches.length === 0
          ? `No exact match for ${MONTH_NAMES[todayMonth - 1]} ${todayDay} &mdash; here's what happened nearby:`
          : `Also nearby on the calendar:`;
      renderOtd(widened, note);
      matches = widened;
    } else if (matches.length === 0) {
      renderOtd([]);
    } else {
      renderOtd(matches);
    }
  } else {
    renderOtd(matches);
  }
}

// WIP Modal Wiring
function initModal() {
  const modal = document.getElementById('wipModal');
  if (!modal) return;

  function openModal(title) {
    document.getElementById('wipModalTitle').textContent = `${title} Section`;
    document.getElementById('wipModalBodyText').textContent =
      `The ${title} section is currently under active development. Check back soon for historical datasets and tools!`;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('[data-wip]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(btn.dataset.wip || 'Section');
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModal);
} else {
  initModal();
}
