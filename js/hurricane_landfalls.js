Promise.all([
  fetch('data/hurricane-data.json').then((res) => res.json()),
  fetch('data/hurricane-data-basin.json').then((res) => res.json()),
])
  .then(([RAW_US, RAW_BASIN]) => {
    initApp(RAW_US, RAW_BASIN);
  })
  .catch((err) => console.error('Error loading hurricane data:', err));

function initApp(RAW_US, RAW_BASIN) {
  const DAYS_IN_MONTH = window.DAYS_IN_MONTH;
  function toDayOfYear(month, day) {
    let cum = 0;
    for (let i = 1; i < month; i++) cum += DAYS_IN_MONTH[i];
    return cum + Math.max(1, Math.min(DAYS_IN_MONTH[month] || 31, day));
  }
  [RAW_US, RAW_BASIN].forEach((arr) =>
    arr.forEach((d) => {
      d._states = (d.statesRaw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      d._dayOfYear = toDayOfYear(d.month, d.day);
    }),
  );
  computeRecordBadges(RAW_US);
  computeRecordBadges(RAW_BASIN);
  const CAT_COLOR = window.CAT_COLOR;
  const CAT_COLOR_HEX = window.CAT_COLOR_HEX;
  const CAT_LABEL = window.CAT_LABEL;
  const CAT_ORDER = window.CAT_ORDER;
  const US_ORDER = window.US_ORDER;
  const BASIN_ORDER = window.BASIN_ORDER;
  const ENSO_ORDER = window.ENSO_ORDER || ['El Nino', 'La Nina', 'Neutral', 'Unknown'];
  // Derive default limits dynamically from dataset instead of hardcoded numbers
  const allData = RAW_US.concat(RAW_BASIN);
  const years = allData.map((d) => d.year).filter((v) => typeof v === 'number');
  const winds = allData.map((d) => d.windMph).filter((v) => typeof v === 'number');
  const pressures = allData.map((d) => d.pressureMb).filter((v) => typeof v === 'number');
  const lats = allData.map((d) => d.lat).filter((v) => typeof v === 'number');
  const lons = allData.map((d) => d.lon).filter((v) => typeof v === 'number');

  const defaultLimits = {
    yrMin: Math.min(...years),
    yrMax: Math.max(...years),
    windMin: 0,
    windMax: Math.ceil(Math.max(...winds) / 5) * 5,
    presMin: Math.floor(Math.min(...pressures) / 5) * 5,
    presMax: Math.ceil(Math.max(...pressures) / 5) * 5,
    latMin: 0,
    latMax: Math.ceil(Math.max(...lats)),
    lonMin: Math.floor(Math.min(...lons)),
    lonMax: Math.ceil(Math.max(...lons)),
    lfMin: 1,
    lfMax: 10,
    fatMin: 0,
    fatMax: 11000,
    dmgMin: 0,
    dmgMax: 125000,
    dateMin: 1,
    dateMax: 365,
  };

  // state ---------------------------------------------------------------
  let MODE = 'us';
  let RAW = RAW_US;
  let REGION_ORDER = US_ORDER;
  let activeCats = new Set(CAT_ORDER);
  let activeStates = null;
  let yrMin = defaultLimits.yrMin,
    yrMax = defaultLimits.yrMax;
  let windMin = defaultLimits.windMin,
    windMax = defaultLimits.windMax;
  let presMin = defaultLimits.presMin,
    presMax = defaultLimits.presMax;
  let excludeNoPressure = false;
  let latMin = defaultLimits.latMin,
    latMax = defaultLimits.latMax;
  let lonMin = defaultLimits.lonMin,
    lonMax = defaultLimits.lonMax;
  let lfMin = defaultLimits.lfMin,
    lfMax = defaultLimits.lfMax;
  let fatMin = defaultLimits.fatMin,
    fatMax = defaultLimits.fatMax;
  let dmgMin = defaultLimits.dmgMin,
    dmgMax = defaultLimits.dmgMax; // millions USD
  let dateMin = defaultLimits.dateMin,
    dateMax = defaultLimits.dateMax;
  let activeEnso = new Set(ENSO_ORDER);
  let searchTerm = '';
  let onlyDocumented = false;
  let uniformDotSize = false;

  (function readInitialUrlFilters() {
    const p = new URLSearchParams(window.location.search);
    if (p.has('mode')) {
      const m = p.get('mode');
      if (m === 'basin' || m === 'us') {
        MODE = m;
        RAW = MODE === 'basin' ? RAW_BASIN : RAW_US;
      }
    }

    function parseNum(str, fallback, isFloat = false) {
      if (str == null) return fallback;
      const v = isFloat ? parseFloat(str) : parseInt(str, 10);
      return isNaN(v) ? fallback : v;
    }

    yrMin = parseNum(p.get('yrMin'), defaultLimits.yrMin);
    yrMax = parseNum(p.get('yrMax'), defaultLimits.yrMax);
    windMin = parseNum(p.get('windMin'), defaultLimits.windMin);
    windMax = parseNum(p.get('windMax'), defaultLimits.windMax);
    presMin = parseNum(p.get('presMin'), defaultLimits.presMin);
    presMax = parseNum(p.get('presMax'), defaultLimits.presMax);
    if (p.has('noPres')) excludeNoPressure = p.get('noPres') === 'true';
    latMin = parseNum(p.get('latMin'), defaultLimits.latMin, true);
    latMax = parseNum(p.get('latMax'), defaultLimits.latMax, true);
    lonMin = parseNum(p.get('lonMin'), defaultLimits.lonMin, true);
    lonMax = parseNum(p.get('lonMax'), defaultLimits.lonMax, true);
    lfMin = parseNum(p.get('lfMin'), defaultLimits.lfMin);
    lfMax = parseNum(p.get('lfMax'), defaultLimits.lfMax);
    fatMin = parseNum(p.get('fatMin'), defaultLimits.fatMin);
    fatMax = parseNum(p.get('fatMax'), defaultLimits.fatMax);
    dmgMin = parseNum(p.get('dmgMin'), defaultLimits.dmgMin, true);
    dmgMax = parseNum(p.get('dmgMax'), defaultLimits.dmgMax, true);
    dateMin = parseNum(p.get('dateMin'), defaultLimits.dateMin);
    dateMax = parseNum(p.get('dateMax'), defaultLimits.dateMax);

    if (p.has('search')) searchTerm = p.get('search').trim().toLowerCase();
    if (p.has('documented')) onlyDocumented = p.get('documented') === 'true';
    if (p.has('uniform')) uniformDotSize = p.get('uniform') === 'true';

    if (p.has('cats')) {
      const cArr = p
        .get('cats')
        .split(',')
        .map((v) => parseInt(v, 10))
        .filter((v) => !isNaN(v));
      if (cArr.length > 0) activeCats = new Set(cArr);
    }
    if (p.has('states')) {
      const sArr = p
        .get('states')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (sArr.length > 0) activeStates = new Set(sArr);
    }
    if (p.has('enso')) {
      const eArr = p
        .get('enso')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (eArr.length > 0) activeEnso = new Set(eArr);
    }
  })();

  function updateHeroText() {
    // subtitle is now static — intentionally left as a no-op so mode switches don't overwrite it
  }
  function buildStatStrip() {
    const total = RAW.length;
    const hurricaneCount = RAW.filter((d) => typeof d.category === 'number' && d.category >= 1).length;
    const cat5 = RAW.filter((d) => d.category === 5).length;
    const majorCount = RAW.filter((d) => d.category >= 3).length;
    const years = RAW.map((d) => d.year);
    document.getElementById('statStrip').innerHTML = `
<div class="stat"><div class="n">${total}</div><div class="l">Total landfalls</div></div>
<div class="stat"><div class="n">${hurricaneCount}</div><div class="l">Hurricanes</div></div>
<div class="stat"><div class="n">${majorCount}</div><div class="l">Major (Cat 3+)</div></div>
<div class="stat"><div class="n">${cat5}</div><div class="l">Category 5</div></div>
<div class="stat"><div class="n">${Math.max(...years) - Math.min(...years)}</div><div class="l">Years of record</div></div>
`;
  }
  function buildCategoryList() {
    const catCounts = {};
    CAT_ORDER.forEach((c) => (catCounts[c] = 0));
    RAW.forEach((d) => catCounts[d.category]++);
    const catListEl = document.getElementById('catList');
    catListEl.innerHTML = '';
    CAT_ORDER.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'cat-row' + (activeCats.has(c) ? '' : ' off');
      row.dataset.cat = c;
      row.innerHTML = `<span class="swatch" style="background:${CAT_COLOR_HEX[c]}"></span><span class="lab">${CAT_LABEL[c]}</span><span class="cnt">${catCounts[c]}</span>`;
      row.addEventListener('click', () => {
        if (activeCats.has(c)) {
          activeCats.delete(c);
          row.classList.add('off');
        } else {
          activeCats.add(c);
          row.classList.remove('off');
        }
        render();
      });
      catListEl.appendChild(row);
    });
  }
  document.getElementById('allCats').addEventListener('click', () => {
    activeCats = new Set(CAT_ORDER);
    document.querySelectorAll('.cat-row').forEach((r) => r.classList.remove('off'));
    render();
  });
  function buildStateList() {
    REGION_ORDER = MODE === 'basin' ? BASIN_ORDER : US_ORDER;
    // safety net: if the data ever contains a region not in the hardcoded order list above
    // (e.g. a newly-added coastline/territory), discover it here instead of silently dropping it
    const discovered = new Set();
    RAW.forEach((d) => {
      d._states.forEach((s) => {
        if (!REGION_ORDER.includes(s)) discovered.add(s);
      });
    });
    if (discovered.size) REGION_ORDER = REGION_ORDER.concat([...discovered]);
    if (!activeStates) {
      activeStates = new Set(REGION_ORDER);
    }
    document.getElementById('stateHeader').firstChild.textContent = MODE === 'basin' ? 'Location ' : 'State ';
    const stateCounts = {};
    REGION_ORDER.forEach((s) => (stateCounts[s] = 0));
    RAW.forEach((d) => {
      d._states.forEach((s) => {
        if (s in stateCounts) stateCounts[s]++;
      });
    });
    const stateListEl = document.getElementById('stateList');
    stateListEl.innerHTML = '';
    REGION_ORDER.forEach((s) => {
      const pill = document.createElement('div');
      pill.className = 'state-pill' + (activeStates.has(s) ? '' : ' off');
      pill.dataset.state = s;
      pill.title = `${stateCounts[s]} landfall${stateCounts[s] === 1 ? '' : 's'}`;
      pill.innerHTML = `${s} <span class="cnt" style="opacity:.6">${stateCounts[s]}</span>`;
      pill.addEventListener('click', () => {
        if (activeStates.has(s)) {
          activeStates.delete(s);
          pill.classList.add('off');
        } else {
          activeStates.add(s);
          pill.classList.remove('off');
        }
        render();
      });
      stateListEl.appendChild(pill);
    });
    updateSearchPillHighlight();
  }
  document.getElementById('allStates').addEventListener('click', () => {
    activeStates = new Set(REGION_ORDER);
    document.querySelectorAll('#stateList .state-pill').forEach((p) => p.classList.remove('off'));
    render();
  });
  document.getElementById('noneStates').addEventListener('click', () => {
    activeStates = new Set();
    document.querySelectorAll('#stateList .state-pill').forEach((p) => p.classList.add('off'));
    render();
  });
  function buildEnsoList() {
    const ensoCounts = {};
    ENSO_ORDER.forEach((e) => (ensoCounts[e] = 0));
    RAW.forEach((d) => {
      ensoCounts[ensoFor(d.year)]++;
    });
    const ensoListEl = document.getElementById('ensoList');
    ensoListEl.innerHTML = '';
    ENSO_ORDER.forEach((e) => {
      const pill = document.createElement('div');
      pill.className = 'state-pill' + (activeEnso.has(e) ? '' : ' off');
      pill.title = `${ensoCounts[e]} landfall${ensoCounts[e] === 1 ? '' : 's'}`;
      pill.innerHTML = `${e} <span class="cnt" style="opacity:.6">${ensoCounts[e]}</span>`;
      pill.addEventListener('click', () => {
        if (activeEnso.has(e)) {
          activeEnso.delete(e);
          pill.classList.add('off');
        } else {
          activeEnso.add(e);
          pill.classList.remove('off');
        }
        render();
      });
      ensoListEl.appendChild(pill);
    });
  }
  document.getElementById('allEnso').addEventListener('click', () => {
    activeEnso = new Set(ENSO_ORDER);
    document.querySelectorAll('#ensoList .state-pill').forEach((p) => p.classList.remove('off'));
    render();
  });
  // mode toggle
  document.getElementById('modeToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    const newMode = btn.dataset.mode;
    if (newMode === MODE) return;
    MODE = newMode;
    RAW = MODE === 'basin' ? RAW_BASIN : RAW_US;
    activeStates = null;
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === MODE));
    clearTrack();
    buildStatStrip();
    buildCategoryList();
    buildStateList();
    buildEnsoList();
    updateHeroText();
    if (MODE === 'basin') {
      map.setMaxBounds([
        [-85, -180],
        [85, 180],
      ]);
      map.setView([21, -62], 4);
    } else {
      map.setMaxBounds([
        [-85, -180],
        [85, 180],
      ]);
      map.setView([28.5, -83.0], 6);
    }
    render();
  });
  buildStatStrip();
  buildCategoryList();
  buildStateList();
  buildEnsoList();
  updateHeroText();
  // legend strip
  const legendEl = document.getElementById('legendStrip');
  legendEl.innerHTML =
    CAT_ORDER.map(
      (c) => `<div class="seg"><span class="sw" style="background:${CAT_COLOR_HEX[c]}"></span>${CAT_LABEL[c]}</div>`,
    ).join('') + `<div class="sizekey">dot size &asymp; wind speed</div>`;
  // search
  function updateSearchPillHighlight() {
    document.querySelectorAll('#stateList .state-pill').forEach((pill) => {
      const isMatch = searchTerm.length > 0 && pill.dataset.state.toLowerCase().includes(searchTerm);
      pill.classList.toggle('search-hit', isMatch);
    });
  }
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    updateSearchPillHighlight();
    render();
  });
  document.getElementById('clearSearch').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    searchTerm = '';
    updateSearchPillHighlight();
    render();
  });
  document.getElementById('onlyDocumented').addEventListener('change', (e) => {
    onlyDocumented = e.target.checked;
    render();
  });
  document.getElementById('uniformSizeToggle').addEventListener('change', (e) => {
    uniformDotSize = e.target.checked;
    render();
    if (currentTrackData) showTrack(currentTrackData);
  });
  // generic range-slider + manual-entry wiring, used for year/wind/pressure/lat/lon
  function wireRangeFilter(opts) {
    const minSlider = document.getElementById(opts.minId);
    const maxSlider = document.getElementById(opts.maxId);
    const minInput = document.getElementById(opts.minLabelId);
    const maxInput = document.getElementById(opts.maxLabelId);
    function sync() {
      minInput.value = opts.format(opts.getMin());
      maxInput.value = opts.format(opts.getMax());
      minSlider.value = opts.getMin();
      maxSlider.value = opts.getMax();
    }
    minSlider.addEventListener('input', () => {
      opts.setMin(Math.min(+minSlider.value, opts.getMax()));
      sync();
      render();
    });
    maxSlider.addEventListener('input', () => {
      opts.setMax(Math.max(+maxSlider.value, opts.getMin()));
      sync();
      render();
    });
    function commitMin() {
      const v = Math.max(opts.lo, Math.min(opts.hi, parseFloat(minInput.value)));
      if (!isNaN(v)) opts.setMin(Math.min(v, opts.getMax()));
      sync();
      render();
    }
    function commitMax() {
      const v = Math.max(opts.lo, Math.min(opts.hi, parseFloat(maxInput.value)));
      if (!isNaN(v)) opts.setMax(Math.max(v, opts.getMin()));
      sync();
      render();
    }
    minInput.addEventListener('change', commitMin);
    maxInput.addEventListener('change', commitMax);
    minInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') minInput.blur();
    });
    maxInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') maxInput.blur();
    });
    return sync;
  }
  const updateYearLabels = wireRangeFilter({
    minId: 'yrMin',
    maxId: 'yrMax',
    minLabelId: 'yrMinLabel',
    maxLabelId: 'yrMaxLabel',
    lo: 1851,
    hi: 2025,
    format: (v) => Math.round(v),
    getMin: () => yrMin,
    getMax: () => yrMax,
    setMin: (v) => (yrMin = Math.round(v)),
    setMax: (v) => (yrMax = Math.round(v)),
  });
  const updateWindLabels = wireRangeFilter({
    minId: 'windMin',
    maxId: 'windMax',
    minLabelId: 'windMinLabel',
    maxLabelId: 'windMaxLabel',
    lo: 0,
    hi: 220,
    format: (v) => Math.round(v),
    getMin: () => windMin,
    getMax: () => windMax,
    setMin: (v) => (windMin = Math.round(v)),
    setMax: (v) => (windMax = Math.round(v)),
  });
  const updatePresLabels = wireRangeFilter({
    minId: 'presMin',
    maxId: 'presMax',
    minLabelId: 'presMinLabel',
    maxLabelId: 'presMaxLabel',
    lo: 880,
    hi: 1020,
    format: (v) => Math.round(v),
    getMin: () => presMin,
    getMax: () => presMax,
    setMin: (v) => (presMin = Math.round(v)),
    setMax: (v) => (presMax = Math.round(v)),
  });
  document.getElementById('excludeNoPressure').addEventListener('change', (e) => {
    excludeNoPressure = e.target.checked;
    render();
  });
  const updateLfLabels = wireRangeFilter({
    minId: 'lfMin',
    maxId: 'lfMax',
    minLabelId: 'lfMinLabel',
    maxLabelId: 'lfMaxLabel',
    lo: 1,
    hi: 10,
    format: (v) => Math.round(v),
    getMin: () => lfMin,
    getMax: () => lfMax,
    setMin: (v) => (lfMin = Math.round(v)),
    setMax: (v) => (lfMax = Math.round(v)),
  });
  // fatalities & damage use log-scale sliders (positions 0-1000) since real-world values span
  // several orders of magnitude (a handful of deaths up to 11,000+; a few thousand dollars up to $125B)
  function posToLog(pos, maxVal) {
    if (pos <= 0) return 0;
    return Math.round(Math.pow(10, (pos / 1000) * Math.log10(maxVal)));
  }
  function logToPos(val, maxVal) {
    if (val <= 0) return 0;
    return Math.max(0, Math.min(1000, Math.round((1000 * Math.log10(val)) / Math.log10(maxVal))));
  }
  function formatFatalityLabel(v) {
    return v >= 11000 ? '11,000+' : v.toLocaleString();
  }
  function formatDamageLabel(m) {
    if (m >= 125000) return '$125B+';
    if (m >= 1000) return '$' + (m / 1000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (m >= 1) return '$' + m.toFixed(m >= 10 ? 0 : 1) + 'M';
    if (m > 0) return '$' + Math.round(m * 1000).toLocaleString() + 'K';
    return '$0';
  }
  function parseFatalityInput(str) {
    const v = parseInt(str.replace(/[^\d]/g, ''), 10);
    return isNaN(v) ? null : Math.max(0, Math.min(11000, v));
  }
  function parseDamageInput(str) {
    str = str.trim().toLowerCase();
    const m = str.match(/([\d.]+)\s*(k|m|b)?/);
    if (!m) return null;
    let val = parseFloat(m[1]);
    if (isNaN(val)) return null;
    if (m[2] === 'b') val *= 1000;
    else if (m[2] === 'k') val /= 1000;
    return Math.max(0, Math.min(125000, val));
  }
  const fatMinSlider = document.getElementById('fatMin'),
    fatMaxSlider = document.getElementById('fatMax');
  const fatMinInput = document.getElementById('fatMinLabel'),
    fatMaxInput = document.getElementById('fatMaxLabel');
  function updateFatLabels() {
    fatMinInput.value = formatFatalityLabel(fatMin);
    fatMaxInput.value = formatFatalityLabel(fatMax);
    fatMinSlider.value = logToPos(fatMin, 11000);
    fatMaxSlider.value = logToPos(fatMax, 11000);
  }
  fatMinSlider.addEventListener('input', () => {
    fatMin = Math.min(posToLog(+fatMinSlider.value, 11000), fatMax);
    updateFatLabels();
    render();
  });
  fatMaxSlider.addEventListener('input', () => {
    fatMax = Math.max(posToLog(+fatMaxSlider.value, 11000), fatMin);
    updateFatLabels();
    render();
  });
  fatMinInput.addEventListener('change', () => {
    const v = parseFatalityInput(fatMinInput.value);
    if (v != null) fatMin = Math.min(v, fatMax);
    updateFatLabels();
    render();
  });
  fatMaxInput.addEventListener('change', () => {
    const v = parseFatalityInput(fatMaxInput.value);
    if (v != null) fatMax = Math.max(v, fatMin);
    updateFatLabels();
    render();
  });
  fatMinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fatMinInput.blur();
  });
  fatMaxInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fatMaxInput.blur();
  });

  const dmgMinSlider = document.getElementById('dmgMin'),
    dmgMaxSlider = document.getElementById('dmgMax');
  const dmgMinInput = document.getElementById('dmgMinLabel'),
    dmgMaxInput = document.getElementById('dmgMaxLabel');
  function updateDmgLabels() {
    dmgMinInput.value = formatDamageLabel(dmgMin);
    dmgMaxInput.value = formatDamageLabel(dmgMax);
    dmgMinSlider.value = logToPos(dmgMin, 125000);
    dmgMaxSlider.value = logToPos(dmgMax, 125000);
  }
  dmgMinSlider.addEventListener('input', () => {
    dmgMin = Math.min(posToLog(+dmgMinSlider.value, 125000), dmgMax);
    updateDmgLabels();
    render();
  });
  dmgMaxSlider.addEventListener('input', () => {
    dmgMax = Math.max(posToLog(+dmgMaxSlider.value, 125000), dmgMin);
    updateDmgLabels();
    render();
  });
  dmgMinInput.addEventListener('change', () => {
    const v = parseDamageInput(dmgMinInput.value);
    if (v != null) dmgMin = Math.min(v, dmgMax);
    updateDmgLabels();
    render();
  });
  dmgMaxInput.addEventListener('change', () => {
    const v = parseDamageInput(dmgMaxInput.value);
    if (v != null) dmgMax = Math.max(v, dmgMin);
    updateDmgLabels();
    render();
  });
  dmgMinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dmgMinInput.blur();
  });
  dmgMaxInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dmgMaxInput.blur();
  });
  const MONTH_ABBR3 = window.MONTH_ABBR;
  const DOY_TABLE = [];
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= DAYS_IN_MONTH[m]; d++) {
      DOY_TABLE.push({ month: m, day: d });
    }
  }
  function dateLabelForDOY(doy) {
    doy = Math.max(1, Math.min(365, Math.round(doy)));
    const { month, day } = DOY_TABLE[doy - 1];
    return `${MONTH_ABBR3[month]} ${day}`;
  }
  function parseDateLabelToDOY(str) {
    if (!str) return null;
    const m = str.trim().match(/^([A-Za-z]+)\.?\s+(\d{1,2})$/);
    if (!m) return null;
    const monAbbr = m[1].slice(0, 3).toLowerCase();
    const idx = MONTH_ABBR3.findIndex((x) => x.toLowerCase() === monAbbr);
    if (idx < 1) return null;
    const day = parseInt(m[2], 10);
    if (day < 1 || day > DAYS_IN_MONTH[idx]) return null;
    return toDayOfYear(idx, day);
  }
  const dateMinSlider = document.getElementById('dateMin');
  const dateMaxSlider = document.getElementById('dateMax');
  const dateMinInput = document.getElementById('dateMinLabel');
  const dateMaxInput = document.getElementById('dateMaxLabel');
  function updateDateLabels() {
    dateMinInput.value = dateLabelForDOY(dateMin);
    dateMaxInput.value = dateLabelForDOY(dateMax);
    dateMinSlider.value = dateMin;
    dateMaxSlider.value = dateMax;
  }
  dateMinSlider.addEventListener('input', () => {
    dateMin = Math.min(+dateMinSlider.value, dateMax);
    updateDateLabels();
    render();
  });
  dateMaxSlider.addEventListener('input', () => {
    dateMax = Math.max(+dateMaxSlider.value, dateMin);
    updateDateLabels();
    render();
  });
  function commitDateMin() {
    const v = parseDateLabelToDOY(dateMinInput.value);
    if (v != null) dateMin = Math.min(v, dateMax);
    updateDateLabels();
    render();
  }
  function commitDateMax() {
    const v = parseDateLabelToDOY(dateMaxInput.value);
    if (v != null) dateMax = Math.max(v, dateMin);
    updateDateLabels();
    render();
  }
  dateMinInput.addEventListener('change', commitDateMin);
  dateMaxInput.addEventListener('change', commitDateMax);
  dateMinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dateMinInput.blur();
  });
  dateMaxInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dateMaxInput.blur();
  });
  function updateMonthLabels() {
    updateDateLabels();
  }
  // latitude sliders + manual entry
  const latMinSlider = document.getElementById('latMin');
  const latMaxSlider = document.getElementById('latMax');
  const latMinInput = document.getElementById('latMinLabel');
  const latMaxInput = document.getElementById('latMaxLabel');
  function updateLatLabels() {
    latMinInput.value = latMin.toFixed(1);
    latMaxInput.value = latMax.toFixed(1);
    latMinSlider.value = latMin;
    latMaxSlider.value = latMax;
  }
  latMinSlider.addEventListener('input', () => {
    latMin = Math.min(+latMinSlider.value, latMax);
    updateLatLabels();
    render();
  });
  latMaxSlider.addEventListener('input', () => {
    latMax = Math.max(+latMaxSlider.value, latMin);
    updateLatLabels();
    render();
  });
  function commitLatMinInput() {
    const v = Math.max(0, Math.min(55, parseFloat(latMinInput.value)));
    latMin = isNaN(v) ? latMin : Math.min(v, latMax);
    updateLatLabels();
    render();
  }
  function commitLatMaxInput() {
    const v = Math.max(0, Math.min(55, parseFloat(latMaxInput.value)));
    latMax = isNaN(v) ? latMax : Math.max(v, latMin);
    updateLatLabels();
    render();
  }
  latMinInput.addEventListener('change', commitLatMinInput);
  latMaxInput.addEventListener('change', commitLatMaxInput);
  latMinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') latMinInput.blur();
  });
  latMaxInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') latMaxInput.blur();
  });
  // longitude sliders + manual entry
  const lonMinSlider = document.getElementById('lonMin');
  const lonMaxSlider = document.getElementById('lonMax');
  const lonMinInput = document.getElementById('lonMinLabel');
  const lonMaxInput = document.getElementById('lonMaxLabel');
  function updateLonLabels() {
    lonMinInput.value = lonMin.toFixed(1);
    lonMaxInput.value = lonMax.toFixed(1);
    lonMinSlider.value = lonMin;
    lonMaxSlider.value = lonMax;
  }
  lonMinSlider.addEventListener('input', () => {
    lonMin = Math.min(+lonMinSlider.value, lonMax);
    updateLonLabels();
    render();
  });
  lonMaxSlider.addEventListener('input', () => {
    lonMax = Math.max(+lonMaxSlider.value, lonMin);
    updateLonLabels();
    render();
  });
  function commitLonMinInput() {
    const v = Math.max(-100, Math.min(0, parseFloat(lonMinInput.value)));
    lonMin = isNaN(v) ? lonMin : Math.min(v, lonMax);
    updateLonLabels();
    render();
  }
  function commitLonMaxInput() {
    const v = Math.max(-100, Math.min(0, parseFloat(lonMaxInput.value)));
    lonMax = isNaN(v) ? lonMax : Math.max(v, lonMin);
    updateLonLabels();
    render();
  }
  lonMinInput.addEventListener('change', commitLonMinInput);
  lonMaxInput.addEventListener('change', commitLonMaxInput);
  lonMinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lonMinInput.blur();
  });
  lonMaxInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lonMaxInput.blur();
  });
  function syncAllControls() {
    document.querySelectorAll('.mode-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === MODE);
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = searchTerm;

    const docCb = document.getElementById('onlyDocumented');
    if (docCb) docCb.checked = onlyDocumented;

    const uniCb = document.getElementById('uniformSizeToggle');
    if (uniCb) uniCb.checked = uniformDotSize;

    const noPresCb = document.getElementById('excludeNoPressure');
    if (noPresCb) noPresCb.checked = excludeNoPressure;

    updateYearLabels();
    updateWindLabels();
    updatePresLabels();
    updateLatLabels();
    updateLonLabels();
    updateLfLabels();
    updateFatLabels();
    updateDmgLabels();
    updateDateLabels();

    updateSearchPillHighlight();
  }

  // Sync controls UI with initial URL / state parameters
  syncAllControls();

  document.getElementById('resetRanges').addEventListener('click', () => {
    yrMin = defaultLimits.yrMin;
    yrMax = defaultLimits.yrMax;
    windMin = defaultLimits.windMin;
    windMax = defaultLimits.windMax;
    presMin = defaultLimits.presMin;
    presMax = defaultLimits.presMax;
    latMin = defaultLimits.latMin;
    latMax = defaultLimits.latMax;
    lonMin = defaultLimits.lonMin;
    lonMax = defaultLimits.lonMax;
    lfMin = defaultLimits.lfMin;
    lfMax = defaultLimits.lfMax;
    fatMin = defaultLimits.fatMin;
    fatMax = defaultLimits.fatMax;
    dmgMin = defaultLimits.dmgMin;
    dmgMax = defaultLimits.dmgMax;
    dateMin = defaultLimits.dateMin;
    dateMax = defaultLimits.dateMax;
    excludeNoPressure = false;
    syncAllControls();
    render();
  });
  // ---- Leaflet basemap setup ----
  const map = L.map('leafletMap', {
    center: MODE === 'basin' ? [21, -62] : [28.5, -83.0],
    zoom: MODE === 'basin' ? 4 : 6,
    minZoom: 3,
    maxZoom: 12,
    worldCopyJump: false,
    maxBounds: [
      [-85, -180],
      [85, 180],
    ],
  });
  const layoutGrid = document.getElementById('layoutGrid');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  sidebarToggleBtn.addEventListener('click', () => {
    const collapsed = layoutGrid.classList.toggle('sidebar-collapsed');
    sidebarToggleBtn.innerHTML = collapsed ? '&#9654; Filters' : '&#9664; Filters';
    sidebarToggleBtn.title = collapsed ? 'Expand filter panel' : 'Collapse filter panel';
    // Leaflet needs to know its container resized, or tiles render wrong/cut off until next interaction
    setTimeout(() => {
      map.invalidateSize();
    }, 260);
  });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
  });
  const SATELLITE_SOURCES = [
    {
      name: 'Esri World Imagery',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      opts: { attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics', maxZoom: 19 },
    },
    {
      name: 'USGS National Map Imagery',
      url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
      opts: { attribution: 'Imagery courtesy USGS National Map', maxZoom: 16 },
    },
    {
      name: 'CARTO Dark (vector fallback, non-satellite)',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      opts: { attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 20 },
    },
  ];
  let activeBaseLayer = null;
  let labelsLayer = null;
  let loadedTiles = 0,
    erroredTiles = 0,
    switchTimer = null;

  function tryBasemap(index) {
    if (index >= SATELLITE_SOURCES.length) {
      showMapBanner(
        'All basemap sources failed to load (see console for per-tile errors) — likely blocked by an ad-blocker, extension, or network filter. Storm positions above are still accurate.',
      );
      return;
    }
    const src = SATELLITE_SOURCES[index];
    console.log('Loading basemap:', src.name, src.url);
    loadedTiles = 0;
    erroredTiles = 0;
    if (activeBaseLayer) {
      map.removeLayer(activeBaseLayer);
    }
    activeBaseLayer = L.tileLayer(src.url, src.opts);
    activeBaseLayer.on('tileload', () => {
      loadedTiles++;
    });
    activeBaseLayer.on('tileerror', (e) => {
      erroredTiles++;
      console.warn('Tile error on', src.name, e && e.tile ? e.tile.src : '');
    });
    activeBaseLayer.addTo(map);
    clearTimeout(switchTimer);
    switchTimer = setTimeout(() => {
      if (loadedTiles === 0) {
        console.warn(
          src.name,
          'produced zero successful tile loads after 4s (errors:',
          erroredTiles,
          ') — falling back to next source.',
        );
        tryBasemap(index + 1);
      } else {
        console.log(src.name, 'loaded OK —', loadedTiles, 'tiles rendered,', erroredTiles, 'errors.');
        hideMapBanner();
      }
    }, 4000);
  }
  function showMapBanner(msg) {
    let el = document.getElementById('mapBanner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mapBanner';
      el.style.cssText =
        'position:absolute;top:10px;left:10px;right:10px;z-index:1000;background:rgba(20,10,10,0.85);color:#f2c14e;font-family:JetBrains Mono,monospace;font-size:11.5px;padding:8px 12px;border-radius:8px;border:1px solid rgba(242,193,78,0.3);';
      document.getElementById('mapholder').appendChild(el);
    }
    el.textContent = msg;
  }
  function hideMapBanner() {
    const el = document.getElementById('mapBanner');
    if (el) el.remove();
  }
  tryBasemap(0);
  // city / place-name labels overlay so satellite view still reads like a normal map
  labelsLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: '',
      maxZoom: 19,
      opacity: 0.9,
    },
  ).addTo(map);
  const dotsLayer = L.layerGroup().addTo(map);
  const trackLayer = L.layerGroup().addTo(map);
  const windExtent = d3.extent(RAW, (d) => d.windMph);
  const rScale = d3.scaleSqrt().domain(windExtent).range([3, 13]);
  const UNIFORM_RADIUS = 7;
  function getDotRadius(windMph) {
    return uniformDotSize ? UNIFORM_RADIUS : rScale(windMph);
  }
  const card = d3.select('#card');
  let markers = [];
  function passesFilters(d) {
    if (!activeCats.has(d.category)) return false;
    if (!d._states.some((s) => activeStates.has(s))) return false;
    if (d.year < yrMin || d.year > yrMax) return false;
    if (d.windMph < windMin || d.windMph > windMax) return false;
    if (d.pressure == null) {
      if (excludeNoPressure) return false;
    } else if (d.pressure < presMin || d.pressure > presMax) return false;
    if (d.lat < latMin || d.lat > latMax) return false;
    if (d.lon < lonMin || d.lon > lonMax) return false;
    if (d.landfallTotal < lfMin || d.landfallTotal > lfMax) return false;
    const fv = parseFatalities(d.fatalities) ?? 0;
    if (fv < fatMin || fv > fatMax) return false;
    const dv = parseDamageMillions(d.damage) ?? 0;
    if (dv < dmgMin || dv > dmgMax) return false;
    if (d._dayOfYear < dateMin || d._dayOfYear > dateMax) return false;
    if (!activeEnso.has(ensoFor(d.year))) return false;
    if (onlyDocumented && !d.documented) return false;
    if (searchTerm) {
      const hay = (d.displayName + ' ' + (d.name || '') + ' ' + d.year + ' ' + d.statesRaw).toLowerCase();
      if (!hay.includes(searchTerm)) return false;
    }
    return d.lat != null && d.lon != null;
  }
  function updateUrlState() {
    const p = new URLSearchParams(window.location.search);
    if (MODE !== 'us') p.set('mode', MODE);
    else p.delete('mode');

    if (yrMin !== defaultLimits.yrMin) p.set('yrMin', yrMin);
    else p.delete('yrMin');
    if (yrMax !== defaultLimits.yrMax) p.set('yrMax', yrMax);
    else p.delete('yrMax');

    if (windMin !== defaultLimits.windMin) p.set('windMin', windMin);
    else p.delete('windMin');
    if (windMax !== defaultLimits.windMax) p.set('windMax', windMax);
    else p.delete('windMax');

    if (presMin !== defaultLimits.presMin) p.set('presMin', presMin);
    else p.delete('presMin');
    if (presMax !== defaultLimits.presMax) p.set('presMax', presMax);
    else p.delete('presMax');

    if (excludeNoPressure) p.set('noPres', 'true');
    else p.delete('noPres');

    if (latMin !== defaultLimits.latMin) p.set('latMin', latMin);
    else p.delete('latMin');
    if (latMax !== defaultLimits.latMax) p.set('latMax', latMax);
    else p.delete('latMax');

    if (lonMin !== defaultLimits.lonMin) p.set('lonMin', lonMin);
    else p.delete('lonMin');
    if (lonMax !== defaultLimits.lonMax) p.set('lonMax', lonMax);
    else p.delete('lonMax');

    if (lfMin !== defaultLimits.lfMin) p.set('lfMin', lfMin);
    else p.delete('lfMin');
    if (lfMax !== defaultLimits.lfMax) p.set('lfMax', lfMax);
    else p.delete('lfMax');

    if (fatMin !== defaultLimits.fatMin) p.set('fatMin', fatMin);
    else p.delete('fatMin');
    if (fatMax !== defaultLimits.fatMax) p.set('fatMax', fatMax);
    else p.delete('fatMax');

    if (dmgMin !== defaultLimits.dmgMin) p.set('dmgMin', dmgMin);
    else p.delete('dmgMin');
    if (dmgMax !== defaultLimits.dmgMax) p.set('dmgMax', dmgMax);
    else p.delete('dmgMax');

    if (dateMin !== defaultLimits.dateMin) p.set('dateMin', dateMin);
    else p.delete('dateMin');
    if (dateMax !== defaultLimits.dateMax) p.set('dateMax', dateMax);
    else p.delete('dateMax');

    if (searchTerm) p.set('search', searchTerm);
    else p.delete('search');
    if (onlyDocumented) p.set('documented', 'true');
    else p.delete('documented');
    if (uniformDotSize) p.set('uniform', 'true');
    else p.delete('uniform');

    if (activeCats.size !== CAT_ORDER.length) {
      p.set('cats', Array.from(activeCats).sort().join(','));
    } else {
      p.delete('cats');
    }

    if (activeStates && activeStates.size !== REGION_ORDER.length) {
      p.set('states', Array.from(activeStates).join(','));
    } else {
      p.delete('states');
    }

    if (activeEnso.size !== ENSO_ORDER.length) {
      p.set('enso', Array.from(activeEnso).join(','));
    } else {
      p.delete('enso');
    }

    const qs = p.toString();
    const newUrl = window.location.pathname + (qs ? '?' + qs : '');
    window.history.replaceState(null, '', newUrl);
  }

  function render() {
    updateUrlState();
    const filtered = RAW.filter(passesFilters).sort((a, b) => a.windMph - b.windMph); // draw big storms last (on top)
    document.getElementById('shownCount').textContent = filtered.length;
    document.getElementById('totalCount').textContent = RAW.length;
    dotsLayer.clearLayers();
    markers = [];
    filtered.forEach((d) => {
      const isCat5 = d.category === 5;
      const marker = L.circleMarker([d.lat, d.lon], {
        radius: getDotRadius(d.windMph),
        fillColor: CAT_COLOR_HEX[d.category],
        color: isCat5 ? '#f0e6ff' : 'rgba(6,12,20,0.55)',
        weight: isCat5 ? 1.6 : 1,
        fillOpacity: isCat5 ? 1 : 0.88,
        className: 'storm-marker' + (isCat5 ? ' cat5' : ''),
      });
      marker.on('mouseover', (ev) => showCard(ev, d));
      marker.on('mousemove', (ev) => positionCard(ev));
      marker.on('mouseout', hideCard);
      marker.on('click', (ev) => {
        L.DomEvent.stop(ev);
        suppressNextMapClick = true;
        setTimeout(() => {
          suppressNextMapClick = false;
        }, 0);
        showTrack(d);
      });
      marker.addTo(dotsLayer);
      markers.push(marker);
    });
  }
  const MONTH_ABBR = window.MONTH_ABBR;
  const TZ_OFFSETS = {
    TX: -6,
    LA: -6,
    MS: -6,
    AL: -6,
    GA: -5,
    SC: -5,
    NC: -5,
    VA: -5,
    'MD/DE': -5,
    NJ: -5,
    NY: -5,
    'CT/RI': -5,
    MA: -5,
    NH: -5,
    ME: -5,
    Canada: -4,
    Belize: -6,
    Guatemala: -6,
    Honduras: -6,
    Nicaragua: -6,
    'Costa Rica': -6,
    Panama: -5,
    Colombia: -5,
    Venezuela: -4,
    'Trinidad and Tobago': -4,
    Cuba: -5,
    Jamaica: -5,
    Haiti: -5,
    'Dominican Republic': -4,
    'Puerto Rico': -4,
    'Cayman Islands': -5,
    Bahamas: -5,
    'Turks and Caicos': -5,
    'Virgin Islands': -4,
    Anguilla: -4,
    'Saint Martin/Sint Maarten': -4,
    'Saint Barthelemy': -4,
    'Saint Kitts and Nevis': -4,
    'Antigua and Barbuda': -4,
    Montserrat: -4,
    Guadeloupe: -4,
    Dominica: -4,
    Martinique: -4,
    'Saint Lucia': -4,
    'Saint Vincent and the Grenadines': -4,
    Barbados: -4,
    Grenada: -4,
    Bermuda: -4,
    Azores: -1,
    Portugal: 0,
    'Cape Verde': -1,
  };
  function getUtcOffset(region, lon) {
    if (region === 'FL') return lon < -85.0 ? -6 : -5;
    if (region === 'Mexico') return lon > -88.0 ? -5 : -6;
    return TZ_OFFSETS[region] !== undefined ? TZ_OFFSETS[region] : -5;
  }
  function formatLandfallTime(d) {
    if (!d.time || d.month == null || d.day == null) return null;
    const hh = parseInt(d.time.slice(0, 2), 10),
      mm = parseInt(d.time.slice(2, 4), 10);
    if (isNaN(hh) || isNaN(mm)) return null;
    const offset = getUtcOffset(d.statesRaw, d.lon);
    const utcMs = Date.UTC(d.year, d.month - 1, d.day, hh, mm);
    const localMs = utcMs + offset * 3600 * 1000;
    const ld = new Date(localMs);
    let h12 = ld.getUTCHours() % 12;
    if (h12 === 0) h12 = 12;
    const ampm = ld.getUTCHours() >= 12 ? 'PM' : 'AM';
    const timeStr = `${h12}:${String(ld.getUTCMinutes()).padStart(2, '0')} ${ampm}`;
    const dateStr = `${MONTH_ABBR[ld.getUTCMonth() + 1]} ${ld.getUTCDate()}, ${ld.getUTCFullYear()}`;
    const utcStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} UTC`;
    return `${dateStr} &middot; ${timeStr} local (UTC${offset >= 0 ? '+' : ''}${offset}) &middot; ${utcStr}`;
  }
  function formatFatalities(s) {
    if (!s) return s;
    return s.replace(/\s*(dead|deaths)\b\.?/gi, '').trim();
  }
  function parseFatalities(s) {
    if (!s) return null;
    const low = s.toLowerCase();
    if (low.includes('not well documented') || low === 'none' || low.trim() === '--') return null;
    const m = s.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  }
  function parseDamageMillions(s) {
    if (!s) return null;
    const low = s.toLowerCase();
    if (low.includes('not well documented') || low.trim() === '--') return null;
    const m = s.replace(/,/g, '').match(/([\d.]+)\s*(million|billion|thousand)?/i);
    if (!m) return null;
    let val = parseFloat(m[1]);
    if (isNaN(val)) return null;
    const unit = (m[2] || '').toLowerCase();
    if (unit === 'billion') val *= 1000;
    else if (unit === 'thousand') val /= 1000;
    else if (!unit) val /= 1000000; // bare dollar figure like "$750,000" -> convert to millions basis
    return val; // normalized to millions USD, nominal (not inflation-adjusted)
  }
  function computeRecordBadges(arr) {
    const byWind = [...arr].sort((a, b) => b.windMph - a.windMph);
    byWind.forEach((d, i) => {
      d._windRankOverall = i + 1;
    });
    const byRegion = {};
    arr.forEach((d) => {
      (byRegion[d.statesRaw] = byRegion[d.statesRaw] || []).push(d);
    });
    Object.values(byRegion).forEach((list) => {
      list.sort((a, b) => b.windMph - a.windMph);
      list.forEach((d, i) => {
        d._windRankRegion = i + 1;
        d._regionCount = list.length;
      });
    });
    const withPressure = arr.filter((d) => d.pressure).sort((a, b) => a.pressure - b.pressure);
    withPressure.forEach((d, i) => {
      d._pressureRank = i + 1;
    });
    // fatalities/damage are STORM-level totals repeated across every landfall of that storm —
    // dedupe to one entry per storm before ranking, or multi-landfall storms get counted many times over
    const stormKey = (d) => `${d.year}|${d.name}|${d.displayName}`;
    const seenFat = new Map(),
      seenDmg = new Map();
    arr.forEach((d) => {
      const k = stormKey(d);
      const fv = parseFatalities(d.fatalities);
      if (fv != null && !seenFat.has(k)) seenFat.set(k, fv);
      const dv = parseDamageMillions(d.damage);
      if (dv != null && !seenDmg.has(k)) seenDmg.set(k, dv);
    });
    const fatRanked = [...seenFat.entries()].sort((a, b) => b[1] - a[1]);
    const fatRankByKey = new Map(fatRanked.map(([k], i) => [k, i + 1]));
    const dmgRanked = [...seenDmg.entries()].sort((a, b) => b[1] - a[1]);
    const dmgRankByKey = new Map(dmgRanked.map(([k], i) => [k, i + 1]));
    arr.forEach((d) => {
      const k = stormKey(d);
      if (fatRankByKey.has(k)) d._fatalityRank = fatRankByKey.get(k);
      if (dmgRankByKey.has(k)) d._damageRank = dmgRankByKey.get(k);
    });
  }
  function buildRecordBadges(d) {
    const badges = [];
    if (d.category === 5)
      badges.push('Category 5 at landfall &mdash; the highest classification on the Saffir-Simpson scale');
    if (d._windRankOverall && d._windRankOverall <= 10)
      badges.push(`#${d._windRankOverall} strongest landfall on record by wind speed (this dataset)`);
    if (d._windRankRegion === 1 && d._regionCount > 1) badges.push(`Strongest landfall on record for ${d.statesRaw}`);
    if (d._pressureRank && d._pressureRank <= 10)
      badges.push(`#${d._pressureRank} lowest pressure on record (this dataset)`);
    if (d._fatalityRank && d._fatalityRank <= 10)
      badges.push(`#${d._fatalityRank} deadliest documented landfall (this dataset)`);
    if (d._damageRank && d._damageRank <= 10)
      badges.push(`#${d._damageRank} costliest documented landfall (this dataset)`);
    return badges;
  }
  function showCard(ev, d) {
    const catColor = CAT_COLOR_HEX[d.category];
    const documentedClass = d.documented ? '' : 'not-doc';
    const multi = d.landfallTotal > 1;
    const timeStr = formatLandfallTime(d);
    const timeLine = timeStr
      ? `<div class="cell full"><div class="k">Landfall Time</div><div class="v">${timeStr}</div></div>`
      : '';
    const seqLine = multi
      ? `<div class="cell full"><div class="k">Landfall</div><div class="v">${d.landfallSeq} of ${d.landfallTotal}${d.isStrongestLandfall ? ' &middot; strongest of this storm' : ''} &middot; click dot to see full track</div></div>`
      : '';
    const inferredLine = d.inferred
      ? `<div class="cell full"><div class="k">Note</div><div class="v not-doc">Not flagged as a landfall in HURDAT2 &mdash; inferred from the storm's track and intensity pattern at this location.</div></div>`
      : '';
    const badges = d.customNotable && d.customNotable.length ? d.customNotable : buildRecordBadges(d);
    const badgesLine = badges.length
      ? `<div class="cell full"><div class="k">Notable</div><div class="v"><ul class="records-list">${badges.map((b) => `<li>${b}</li>`).join('')}</ul></div></div>`
      : '';
    const catBadgeText =
      d.category === 'EX' ? 'EXTRATROPICAL' : d.category === 0 ? 'TROPICAL STORM' : 'CAT ' + d.category;
    card.html(`
<div class="card-head">
<div class="card-name">${d.displayName}</div>
<div class="card-cat" style="background:${catColor}">${catBadgeText}</div>
</div>
<div class="card-body">
<div class="cell"><div class="k">Wind</div><div class="v">${Math.round(d.windMph / 5) * 5} mph</div></div>
<div class="cell"><div class="k">Pressure</div><div class="v">${d.pressure ? d.pressure + ' mb' : 'N/A'}</div></div>
${timeLine}
${seqLine}
${inferredLine}
<div class="cell full"><div class="k">Fatalities</div><div class="v ${documentedClass}">${formatFatalities(d.fatalities)}</div></div>
<div class="cell full"><div class="k">Damage</div><div class="v ${documentedClass}">${d.damage}</div></div>
${badgesLine}
</div>
`);
    card.classed('show', true);
    positionCard(ev);
  }
  function positionCard(ev) {
    const cardW = 250,
      cardH = 260;
    const oe = ev.originalEvent;
    let x = oe.clientX + 18,
      y = oe.clientY + 14;
    if (x + cardW > window.innerWidth - 10) x = oe.clientX - cardW - 18;
    if (y + cardH > window.innerHeight - 10) y = oe.clientY - cardH - 14;
    card.style('left', x + 'px').style('top', y + 'px');
  }
  function hideCard() {
    card.classed('show', false);
  }

  // ---- storm track (click a dot to trace its full lifecycle) ----
  const hintDefault = document.getElementById('hintLabel').innerHTML;
  const TRACK_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const STATUS_LABEL = {
    TD: 'Tropical Depression',
    TS: 'Tropical Storm',
    HU: 'Hurricane',
    EX: 'Extratropical',
    SD: 'Subtropical Depression',
    SS: 'Subtropical Storm',
    LO: 'Low',
    WV: 'Tropical Wave',
    DB: 'Disturbance',
  };
  function windToTrackColor(kt, status) {
    if (status === 'EX') return CAT_COLOR_HEX['EX'];
    if (status && !['HU', 'TS', 'SS'].includes(status)) return '#5b7285'; // TD/SD/LO/WV/DB — pre- or sub-tropical-storm strength
    if (kt >= 137) return CAT_COLOR_HEX[5];
    if (kt >= 113) return CAT_COLOR_HEX[4];
    if (kt >= 96) return CAT_COLOR_HEX[3];
    if (kt >= 83) return CAT_COLOR_HEX[2];
    if (kt >= 64) return CAT_COLOR_HEX[1];
    if (kt >= 34) return CAT_COLOR_HEX[0];
    return '#5b7285';
  }
  function nauticalOffset(lon) {
    // longitude-based standard time-zone approximation (15deg per hour) — used for track points,
    // which are mostly over open ocean and don't belong to any specific region's official time zone
    return Math.round(lon / 15);
  }
  function formatTrackDate(dateStr, timeStr, lon) {
    if (!dateStr || dateStr.length < 8 || !timeStr) return '';
    const y = dateStr.slice(0, 4),
      mo = +dateStr.slice(4, 6),
      day = +dateStr.slice(6, 8);
    const hh = +timeStr.slice(0, 2),
      mi = +timeStr.slice(2, 4);
    if (isNaN(hh) || isNaN(mi)) return '';
    const offset = nauticalOffset(lon);
    const utcMs = Date.UTC(+y, mo - 1, day, hh, mi);
    const ld = new Date(utcMs + offset * 3600 * 1000);
    let h12 = ld.getUTCHours() % 12;
    if (h12 === 0) h12 = 12;
    const ampm = ld.getUTCHours() >= 12 ? 'PM' : 'AM';
    const localTime = `${h12}:${String(ld.getUTCMinutes()).padStart(2, '0')} ${ampm}`;
    const localDate = `${TRACK_MONTH_NAMES[ld.getUTCMonth()]} ${ld.getUTCDate()}, ${ld.getUTCFullYear()}`;
    const utcTime = `${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')} UTC`;
    return `${localDate} &middot; ${localTime} (UTC${offset >= 0 ? '+' : ''}${offset}) &middot; ${utcTime}`;
  }
  const ORDINAL_WORD_PATTERN =
    /^(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty(-(One|Two|Three|Four|Five|Six|Seven|Eight|Nine))?|Thirty(-One)?)$/;
  function dynamicOrdinalName(stormName, windKt, status) {
    const m = stormName.match(/^(Hurricane|Tropical Storm) (.+) \((\d{4})\)$/);
    if (!m || !ORDINAL_WORD_PATTERN.test(m[2])) return stormName;
    const ordinal = m[2],
      year = m[3];
    const word = status === 'HU' || (typeof windKt === 'number' && windKt >= 64) ? 'Hurricane' : 'Tropical Storm';
    return `${word} ${ordinal} (${year})`;
  }
  function windKtToCategory(kt) {
    if (kt >= 137) return 5;
    if (kt >= 113) return 4;
    if (kt >= 96) return 3;
    if (kt >= 83) return 2;
    if (kt >= 64) return 1;
    return null;
  }
  function showTrackPointCard(ev, p, stormName) {
    const windKt = p[2],
      status = p[3],
      dateStr = p[4],
      timeStr = p[5],
      lon = p[1],
      pressure = p[6];
    const windMph = Math.round((windKt * 1.15078) / 5) * 5;
    const statusLabel =
      status === 'HU' && windKtToCategory(windKt)
        ? `CAT ${windKtToCategory(windKt)}`
        : STATUS_LABEL[status] || status || 'Unknown';
    const color = windToTrackColor(windKt, status);
    const timeFmt = formatTrackDate(dateStr, timeStr, lon);
    const pointName = dynamicOrdinalName(stormName, windKt, status);
    card.html(`
<div class="card-head">
<div class="card-name">${pointName}</div>
<div class="card-cat" style="background:${color}">${statusLabel}</div>
</div>
<div class="card-body">
<div class="cell"><div class="k">Wind</div><div class="v">${windMph} mph</div></div>
<div class="cell"><div class="k">Pressure</div><div class="v">${pressure ? pressure + ' mb' : 'N/A'}</div></div>
<div class="cell full"><div class="k">Position</div><div class="v" style="font-size:11px;">${p[0].toFixed(1)}&deg;, ${p[1].toFixed(1)}&deg;</div></div>
${timeFmt ? `<div class="cell full"><div class="k">Time</div><div class="v" style="font-size:11px;">${timeFmt}</div></div>` : ''}
</div>
`);
    card.classed('show', true);
    positionCard(ev);
  }
  let currentTrackData = null;
  let suppressNextMapClick = false;
  function showTrack(d) {
    hideCard();
    currentTrackData = d;
    trackLayer.clearLayers();
    map.removeLayer(dotsLayer);
    const track = d.track;
    const hasTrack = track && track.length >= 2;
    if (hasTrack) {
      for (let i = 0; i < track.length - 1; i++) {
        const a = track[i],
          b = track[i + 1];
        L.polyline(
          [
            [a[0], a[1]],
            [b[0], b[1]],
          ],
          {
            color: windToTrackColor(a[2], a[3]),
            weight: 2.5,
            opacity: 0.85,
            lineCap: 'round',
          },
        ).addTo(trackLayer);
      }
      track.forEach((p) => {
        const pt = L.circleMarker([p[0], p[1]], {
          radius: 3.4,
          color: 'rgba(6,12,20,0.5)',
          weight: 0.6,
          fillColor: windToTrackColor(p[2], p[3]),
          fillOpacity: 0.9,
          className: 'track-point',
        }).addTo(trackLayer);
        pt.on('mouseover', (ev) => showTrackPointCard(ev, p, d.displayName));
        pt.on('mousemove', (ev) => positionCard(ev));
        pt.on('mouseout', hideCard);
        pt.on('click', (ev) => {
          L.DomEvent.stop(ev);
          suppressNextMapClick = true;
          setTimeout(() => {
            suppressNextMapClick = false;
          }, 0);
          showTrackPointCard(ev, p, d.displayName);
        });
      });
    }
    // optionally show other storms' landfalls from the same year, dimmed, for season context
    if (document.getElementById('sameYearToggle').checked) {
      const others = RAW.filter((r) => r.year === d.year && r.displayName !== d.displayName && passesFilters(r));
      others.forEach((o) => {
        const m = L.circleMarker([o.lat, o.lon], {
          radius: uniformDotSize ? Math.max(UNIFORM_RADIUS - 1, 2) : Math.max(rScale(o.windMph) - 1, 2),
          fillColor: CAT_COLOR_HEX[o.category],
          color: 'rgba(6,12,20,0.5)',
          weight: 0.8,
          fillOpacity: 0.88,
          className: 'storm-marker same-year-dim',
        });
        m.on('mouseover', (ev) => showCard(ev, o));
        m.on('mousemove', (ev) => positionCard(ev));
        m.on('mouseout', hideCard);
        m.on('click', (ev) => {
          L.DomEvent.stop(ev);
          suppressNextMapClick = true;
          setTimeout(() => {
            suppressNextMapClick = false;
          }, 0);
          showTrack(o);
        });
        m.addTo(trackLayer);
      });
    }
    // redraw this storm's own landfall dot(s) on top of the track, since the general dots layer is hidden
    const siblings = RAW.filter((r) => r.year === d.year && r.displayName === d.displayName && passesFilters(r));
    siblings.forEach((sib) => {
      const isCat5 = sib.category === 5;
      const m = L.circleMarker([sib.lat, sib.lon], {
        radius: getDotRadius(sib.windMph),
        fillColor: CAT_COLOR_HEX[sib.category],
        color: isCat5 ? '#f0e6ff' : 'rgba(6,12,20,0.55)',
        weight: isCat5 ? 1.6 : 1,
        fillOpacity: isCat5 ? 1 : 0.88,
        className: 'storm-marker' + (isCat5 ? ' cat5' : ''),
      });
      m.on('mouseover', (ev) => showCard(ev, sib));
      m.on('mousemove', (ev) => positionCard(ev));
      m.on('mouseout', hideCard);
      m.addTo(trackLayer);
    });
    // highlight ring around the clicked landfall point (shown whether or not a full track exists)
    L.circleMarker([d.lat, d.lon], {
      radius: getDotRadius(d.windMph) + 5,
      color: '#ffffff',
      weight: 1.6,
      opacity: 0.8,
      fill: false,
      dashArray: '2,4',
    }).addTo(trackLayer);
    document.getElementById('sameYearToggleWrap').style.display = 'flex';
    document.getElementById('hintLabel').innerHTML = hasTrack
      ? `Showing track: <b style="color:var(--text-main)">${d.displayName}</b> &middot; hover points for detail &middot; click map to clear`
      : `<b style="color:var(--text-main)">${d.displayName}</b>: no track data available &middot; click map to clear`;
  }
  function clearTrack() {
    hideCard();
    currentTrackData = null;
    trackLayer.clearLayers();
    if (!map.hasLayer(dotsLayer)) map.addLayer(dotsLayer);
    document.getElementById('sameYearToggleWrap').style.display = 'none';
    document.getElementById('hintLabel').innerHTML = hintDefault;
  }
  document.getElementById('sameYearToggle').addEventListener('change', () => {
    if (currentTrackData) showTrack(currentTrackData);
  });
  map.on('click', () => {
    if (suppressNextMapClick) {
      suppressNextMapClick = false;
      return;
    }
    clearTrack();
  });
  const coordReadout = document.getElementById('coordReadout');
  map.on('mousemove', (ev) => {
    const lat = ev.latlng.lat,
      lon = ev.latlng.lng;
    const latLabel = lat >= 0 ? 'N' : 'S',
      lonLabel = lon >= 0 ? 'E' : 'W';
    coordReadout.textContent = `${Math.abs(lat).toFixed(4)}\u00b0${latLabel}, ${Math.abs(lon).toFixed(4)}\u00b0${lonLabel}`;
    coordReadout.classList.add('show');
  });
  map.on('mouseout', () => {
    coordReadout.classList.remove('show');
  });

  syncAllControls();
  render();

  // deep-link support: ?year=YYYY&lat=XX.XXXX&lon=-XX.XXXX jumps straight to that landfall
  (function handleDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const linkYear = params.get('year'),
      linkLat = params.get('lat'),
      linkLon = params.get('lon');
    if (linkYear == null || linkLat == null || linkLon == null) return;
    const targetYear = parseInt(linkYear, 10);
    const targetLat = parseFloat(linkLat),
      targetLon = parseFloat(linkLon);
    if (isNaN(targetYear) || isNaN(targetLat) || isNaN(targetLon)) return;

    // switch to basin mode since the linked storm could be anywhere in the Atlantic
    MODE = 'basin';
    RAW = RAW_BASIN;
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === MODE));
    buildStatStrip();
    buildCategoryList();
    buildStateList();
    buildEnsoList();
    updateHeroText();
    map.setMaxBounds([
      [-85, -180],
      [85, 180],
    ]);
    render();

    let best = null,
      bestDist = Infinity;
    RAW_BASIN.forEach((d) => {
      if (d.year !== targetYear) return;
      const dist = Math.hypot(d.lat - targetLat, d.lon - targetLon);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    });
    if (best) {
      map.setView([best.lat, best.lon], 7);
      setTimeout(() => {
        showTrack(best);
      }, 150);
    }
  })();

  // Hide map skeleton loader once initial rendering completes
  const mapLoader = document.getElementById('mapLoader');
  if (mapLoader) {
    mapLoader.classList.add('is-hidden');
  }

  // Share Filter Link Handler
  const shareBtn = document.getElementById('shareLinkBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => showToast('Filter link copied to clipboard!'))
        .catch(() => showToast('Link ready in address bar!'));
    });
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
  }

  // WIP Modal Wiring
  (function initModal() {
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
  })();
}
