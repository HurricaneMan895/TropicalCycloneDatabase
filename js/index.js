fetch('data/onthisday-data.json')
  .then((res) => res.json())
  .then((OTD_DATA) => {
    initOtd(OTD_DATA);
  })
  .catch((err) => console.error('Error loading onthisday-data.json:', err));

function initOtd(OTD_DATA) {
  const CAT_COLOR_HEX = { 0: '#3fd0c9', 1: '#f2c14e', 2: '#f0983b', 3: '#e6602f', 4: '#cf2b3e', 5: '#a63aa8' };
  const CAT_LABEL = { 0: 'TS', 1: 'CAT 1', 2: 'CAT 2', 3: 'CAT 3', 4: 'CAT 4', 5: 'CAT 5' };
  const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

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
<div class="otd-cat" style="background:${CAT_COLOR_HEX[m.category]}">${CAT_LABEL[m.category]}</div>
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
