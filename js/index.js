/**
 * Tropical Cyclone Database - Home Page Logic (index.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  const OTD_DATA = window.RAW_US || [];
  const DYK_FACTS = window.DYK_DATA || [];
  const MONTH_NAMES = window.MONTH_NAMES;
  const CAT_COLOR_HEX = window.CAT_COLOR_HEX;
  const CAT_LABEL = window.CAT_LABEL;

  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const otdDateEl = document.getElementById('otdDate');
  if (otdDateEl) {
    otdDateEl.textContent = `${MONTH_NAMES[todayMonth]} ${todayDay}`;
  }

  function formatFatalityCount(s) {
    if (!s) return s;
    const stripped = s.replace(/\s*(dead|deaths)\b\.?/gi, '').trim();
    return stripped + ' dead';
  }

  function renderOtd(matches, note) {
    const listEl = document.getElementById('otdList');
    if (!listEl) return;

    if (matches.length === 0) {
      listEl.innerHTML = `<div class="otd-empty">No recorded Atlantic hurricane landfalls on this calendar date in the database (1851&ndash;2025).</div>`;
      return;
    }

    matches.sort((a, b) => b.year - a.year);
    listEl.innerHTML = (note ? `<div class="otd-empty">${note}</div>` : '') + matches.map(m => {
      const fatLine = m.documented ? `${formatFatalityCount(m.fatalities)} &middot; ${m.damage} damage` : 'Impact not well documented';
      const roundedWind = Math.round(m.windMph / 5) * 5;
      const mapUrl = `hurricane_landfalls.html?year=${m.year}&lat=${m.lat}&lon=${m.lon}`;
      return `<div class="otd-item">
<div class="otd-cat" style="background:${CAT_COLOR_HEX[m.category]}">${CAT_LABEL[m.category]}</div>
<div class="otd-body">
<div class="otd-name">${m.displayName} &mdash; ${m.statesRaw}</div>
<div class="otd-meta">${roundedWind} mph at landfall &middot; ${fatLine}</div>
</div>
<a href="${mapUrl}" class="otd-see-btn" aria-label="See landfall for ${m.displayName}">See landfall &rarr;</a>
</div>`;
    }).join('');
  }

  let matches = OTD_DATA.filter(d => d.month === todayMonth && d.day === todayDay);
  const MIN_OTD_ENTRIES = 6;
  if (matches.length < MIN_OTD_ENTRIES) {
    let widened = matches.slice();
    for (let delta = 1; delta <= 14 && widened.length < MIN_OTD_ENTRIES; delta++) {
      const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate() - delta);
      const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + delta);
      const near = OTD_DATA.filter(d =>
        (d.month === d1.getMonth() + 1 && d.day === d1.getDate()) ||
        (d.month === d2.getMonth() + 1 && d.day === d2.getDate())
      );
      widened = widened.concat(near);
    }
    if (widened.length > matches.length) {
      const note = matches.length === 0
        ? `No exact match for ${MONTH_NAMES[todayMonth]} ${todayDay} &mdash; here's what happened nearby:`
        : `Also nearby on the calendar:`;
      renderOtd(widened, note);
    } else if (matches.length === 0) {
      renderOtd([]);
    } else {
      renderOtd(matches);
    }
  } else {
    renderOtd(matches);
  }

  // Did You Know? Rotation
  if (DYK_FACTS.length > 0) {
    const now = new Date();
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysSinceEpoch = Math.floor(localMidnight.getTime() / 86400000);
    const idx = ((daysSinceEpoch % DYK_FACTS.length) + DYK_FACTS.length) % DYK_FACTS.length;
    const dykEl = document.getElementById('dykFact');
    if (dykEl) {
      dykEl.textContent = DYK_FACTS[idx];
    }
  }
});
