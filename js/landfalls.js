// Tropical Cyclone Database - Interactive Map Logic


const RAW_US = window.RAW_US || [];
const RAW_BASIN = window.RAW_BASIN || [];
const DAYS_IN_MONTH = [0,31,28,31,30,31,30,31,31,30,31,30,31];
function toDayOfYear(month, day){
let cum = 0;
for(let i=1;i<month;i++) cum += DAYS_IN_MONTH[i];
return cum + Math.max(1, Math.min(DAYS_IN_MONTH[month]||31, day));
}
[RAW_US, RAW_BASIN].forEach(arr=>arr.forEach(d=>{
d._states = (d.statesRaw||'').split(',').map(s=>s.trim()).filter(Boolean);
d._dayOfYear = toDayOfYear(d.month, d.day);
}));
computeRecordBadges(RAW_US);
computeRecordBadges(RAW_BASIN);
const CAT_COLOR = {0:'var(--c-ts)',1:'#f2c14e',2:'#f0983b',3:'#e6602f',4:'#cf2b3e',5:'#a63aa8'};
const CAT_COLOR_HEX = {0:'#3fd0c9',1:'#f2c14e',2:'#f0983b',3:'#e6602f',4:'#cf2b3e',5:'#a63aa8','EX':'#8aa1b5'};
const CAT_LABEL = {0:'Tropical Storm',1:'Category 1',2:'Category 2',3:'Category 3',4:'Category 4',5:'Category 5','EX':'Extratropical'};
const CAT_ORDER = [0,1,2,3,4,5];
const US_ORDER = ['TX','LA','MS','AL','FL','GA','SC','NC','VA','MD/DE','NJ','NY','CT','RI','MA','NH','ME'];
const BASIN_ORDER = US_ORDER.concat(['Canada','Bermuda','Bahamas','Turks and Caicos','Cuba','Cayman Islands','Jamaica',
'Haiti','Dominican Republic','Puerto Rico','Virgin Islands','Anguilla','Saint Martin/Sint Maarten','Saint Barthelemy',
'Saint Kitts and Nevis','Antigua and Barbuda','Montserrat','Guadeloupe','Dominica','Martinique','Saint Lucia',
'Saint Vincent and the Grenadines','Barbados','Grenada','Trinidad and Tobago','Venezuela','Colombia','Panama',
'Costa Rica','Nicaragua','Honduras','Guatemala','Belize','El Salvador','Mexico','Azores','Portugal','Cape Verde']);
// state ---------------------------------------------------------------
let MODE = 'us';
let RAW = RAW_US;
let REGION_ORDER = US_ORDER;
let activeCats = new Set(CAT_ORDER);
let activeStates = new Set(REGION_ORDER);
let yrMin = 1851, yrMax = 2025;
let windMin = 0, windMax = 220;
let presMin = 880, presMax = 1020;
let excludeNoPressure = false;
let latMin = 0, latMax = 55;
let lonMin = -100, lonMax = 0;
let lfMin = 1, lfMax = 12;
let fatMin = 0, fatMax = 11000;
let dmgMin = 0, dmgMax = 125000; // millions USD
let dateMin = 1, dateMax = 365;
const ENSO_ORDER = ['El Nino','La Nina','Neutral','Unknown'];
let activeEnso = new Set(ENSO_ORDER);
let searchTerm = '';
let onlyDocumented = false;

// ENSO classification by hurricane-season year (NOAA ONI, 1950–2025). Years
// before 1950 aren't reliably classified and are marked "Unknown".
const ENSO_BY_YEAR = {1950:'Neutral',1951:'El Nino',1952:'El Nino',1953:'El Nino',1954:'La Nina',1955:'La Nina',1956:'Neutral',1957:'El Nino',1958:'El Nino',1959:'Neutral',1960:'Neutral',1961:'Neutral',1962:'Neutral',1963:'El Nino',1964:'La Nina',1965:'El Nino',1966:'Neutral',1967:'Neutral',1968:'El Nino',1969:'El Nino',1970:'La Nina',1971:'La Nina',1972:'El Nino',1973:'La Nina',1974:'La Nina',1975:'La Nina',1976:'El Nino',1977:'El Nino',1978:'Neutral',1979:'El Nino',1980:'Neutral',1981:'Neutral',1982:'El Nino',1983:'La Nina',1984:'La Nina',1985:'Neutral',1986:'El Nino',1987:'El Nino',1988:'La Nina',1989:'Neutral',1990:'Neutral',1991:'El Nino',1992:'Neutral',1993:'Neutral',1994:'El Nino',1995:'La Nina',1996:'Neutral',1997:'El Nino',1998:'La Nina',1999:'La Nina',2000:'La Nina',2001:'Neutral',2002:'El Nino',2003:'Neutral',2004:'El Nino',2005:'La Nina',2006:'El Nino',2007:'La Nina',2008:'La Nina',2009:'El Nino',2010:'La Nina',2011:'La Nina',2012:'Neutral',2013:'Neutral',2014:'El Nino',2015:'El Nino',2016:'La Nina',2017:'La Nina',2018:'El Nino',2019:'El Nino',2020:'La Nina',2021:'La Nina',2022:'La Nina',2023:'El Nino',2024:'Neutral',2025:'Neutral'};
function ensoFor(year){ return ENSO_BY_YEAR[year] || 'Unknown'; }

function updateHeroText(){
// subtitle is now static — intentionally left as a no-op so mode switches don't overwrite it
}
function buildStatStrip(){
const total = RAW.length;
const hurricaneCount = RAW.filter(d=>typeof d.category==='number' && d.category>=1).length;
const cat5 = RAW.filter(d=>d.category===5).length;
const majorCount = RAW.filter(d=>d.category>=3).length;
const years = RAW.map(d=>d.year);
document.getElementById('statStrip').innerHTML = `
<div class="stat"><div class="n">${total}</div><div class="l">Total landfalls</div></div>
<div class="stat"><div class="n">${hurricaneCount}</div><div class="l">Hurricanes</div></div>
<div class="stat"><div class="n">${majorCount}</div><div class="l">Major (Cat 3+)</div></div>
<div class="stat"><div class="n">${cat5}</div><div class="l">Category 5</div></div>
<div class="stat"><div class="n">${Math.max(...years)-Math.min(...years)+1}</div><div class="l">Years of record</div></div>
`;
}
function buildCategoryList(){
const catCounts = {};
CAT_ORDER.forEach(c=>catCounts[c]=0);
RAW.forEach(d=>catCounts[d.category]++);
const catListEl = document.getElementById('catList');
catListEl.innerHTML = '';
CAT_ORDER.forEach(c=>{
const row = document.createElement('div');
row.className='cat-row';
row.dataset.cat=c;
row.innerHTML = `<span class="swatch" style="background:${CAT_COLOR_HEX[c]}"></span><span class="lab">${CAT_LABEL[c]}</span><span class="cnt">${catCounts[c]}</span>`;
row.addEventListener('click', ()=>{
if(activeCats.has(c)){ activeCats.delete(c); row.classList.add('off'); }
else { activeCats.add(c); row.classList.remove('off'); }
render();
});
catListEl.appendChild(row);
});
}
document.getElementById('allCats').addEventListener('click', ()=>{
activeCats = new Set(CAT_ORDER);
document.querySelectorAll('.cat-row').forEach(r=>r.classList.remove('off'));
render();
});
function buildStateList(){
REGION_ORDER = MODE==='basin' ? BASIN_ORDER : US_ORDER;
// safety net: if the data ever contains a region not in the hardcoded order list above
// (e.g. a newly-added coastline/territory), discover it here instead of silently dropping it
const discovered = new Set();
RAW.forEach(d=>{ d._states.forEach(s=>{ if(!REGION_ORDER.includes(s)) discovered.add(s); }); });
if(discovered.size) REGION_ORDER = REGION_ORDER.concat([...discovered]);
activeStates = new Set(REGION_ORDER);
document.getElementById('stateHeader').firstChild.textContent = (MODE==='basin' ? 'Location ' : 'State ');
const stateCounts = {};
REGION_ORDER.forEach(s=>stateCounts[s]=0);
RAW.forEach(d=>{ d._states.forEach(s=>{ if(s in stateCounts) stateCounts[s]++; }); });
const stateListEl = document.getElementById('stateList');
stateListEl.innerHTML = '';
REGION_ORDER.forEach(s=>{
const pill = document.createElement('div');
pill.className = 'state-pill';
pill.dataset.state = s;
pill.title = `${stateCounts[s]} landfall${stateCounts[s]===1?'':'s'}`;
pill.innerHTML = `${s} <span class="cnt" style="opacity:.6">${stateCounts[s]}</span>`;
pill.addEventListener('click', ()=>{
if(activeStates.has(s)){ activeStates.delete(s); pill.classList.add('off'); }
else { activeStates.add(s); pill.classList.remove('off'); }
render();
});
stateListEl.appendChild(pill);
});
updateSearchPillHighlight();
}
document.getElementById('allStates').addEventListener('click', ()=>{
activeStates = new Set(REGION_ORDER);
document.querySelectorAll('#stateList .state-pill').forEach(p=>p.classList.remove('off'));
render();
});
document.getElementById('noneStates').addEventListener('click', ()=>{
activeStates = new Set();
document.querySelectorAll('#stateList .state-pill').forEach(p=>p.classList.add('off'));
render();
});
function buildEnsoList(){
const ensoCounts = {};
ENSO_ORDER.forEach(e=>ensoCounts[e]=0);
RAW.forEach(d=>{ ensoCounts[ensoFor(d.year)]++; });
const ensoListEl = document.getElementById('ensoList');
ensoListEl.innerHTML = '';
ENSO_ORDER.forEach(e=>{
const pill = document.createElement('div');
pill.className = 'state-pill';
pill.title = `${ensoCounts[e]} landfall${ensoCounts[e]===1?'':'s'}`;
pill.innerHTML = `${e} <span class="cnt" style="opacity:.6">${ensoCounts[e]}</span>`;
pill.addEventListener('click', ()=>{
if(activeEnso.has(e)){ activeEnso.delete(e); pill.classList.add('off'); }
else { activeEnso.add(e); pill.classList.remove('off'); }
render();
});
ensoListEl.appendChild(pill);
});
}
document.getElementById('allEnso').addEventListener('click', ()=>{
activeEnso = new Set(ENSO_ORDER);
document.querySelectorAll('#ensoList .state-pill').forEach(p=>p.classList.remove('off'));
render();
});
// mode toggle
document.getElementById('modeToggle').addEventListener('click', (e)=>{
const btn = e.target.closest('.mode-btn');
if(!btn) return;
const newMode = btn.dataset.mode;
if(newMode === MODE) return;
MODE = newMode;
RAW = MODE==='basin' ? RAW_BASIN : RAW_US;
document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active', b.dataset.mode===MODE));
clearTrack();
buildStatStrip();
buildCategoryList();
buildStateList();
buildEnsoList();
updateHeroText();
if(MODE==='basin'){
map.setMaxBounds([[-85, -180], [85, 180]]);
map.setView([21, -62], 4);
} else {
map.setMaxBounds([[-85, -180], [85, 180]]);
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
legendEl.innerHTML = CAT_ORDER.map(c=>`<div class="seg"><span class="sw" style="background:${CAT_COLOR_HEX[c]}"></span>${CAT_LABEL[c]}</div>`).join('')
+ `<div class="sizekey">dot size &asymp; wind speed</div>`;
// search
function updateSearchPillHighlight(){
document.querySelectorAll('#stateList .state-pill').forEach(pill=>{
const isMatch = searchTerm.length > 0 && pill.dataset.state.toLowerCase().includes(searchTerm);
pill.classList.toggle('search-hit', isMatch);
});
}
document.getElementById('searchInput').addEventListener('input', e=>{
searchTerm = e.target.value.trim().toLowerCase();
updateSearchPillHighlight();
render();
});
document.getElementById('clearSearch').addEventListener('click', ()=>{
document.getElementById('searchInput').value='';
searchTerm='';
updateSearchPillHighlight();
render();
});
document.getElementById('onlyDocumented').addEventListener('change', e=>{
onlyDocumented = e.target.checked; render();
});
document.getElementById('uniformSizeToggle').addEventListener('change', e=>{
uniformDotSize = e.target.checked;
render();
if(pinnedTracks.length) renderPinnedTracks();
});
// generic range-slider + manual-entry wiring, used for year/wind/pressure/lat/lon
function wireRangeFilter(opts){
const minSlider = document.getElementById(opts.minId);
const maxSlider = document.getElementById(opts.maxId);
const minInput = document.getElementById(opts.minLabelId);
const maxInput = document.getElementById(opts.maxLabelId);
function sync(){
minInput.value = opts.format(opts.getMin());
maxInput.value = opts.format(opts.getMax());
minSlider.value = opts.getMin();
maxSlider.value = opts.getMax();
}
minSlider.addEventListener('input', ()=>{
opts.setMin(Math.min(+minSlider.value, opts.getMax()));
sync(); render();
});
maxSlider.addEventListener('input', ()=>{
opts.setMax(Math.max(+maxSlider.value, opts.getMin()));
sync(); render();
});
function commitMin(){
const v = Math.max(opts.lo, Math.min(opts.hi, parseFloat(minInput.value)));
if(!isNaN(v)){
if(v > opts.getMax()) opts.setMax(v); // bring the other handle up to meet the typed year instead of clamping it away
opts.setMin(v);
}
sync(); render();
}
function commitMax(){
const v = Math.max(opts.lo, Math.min(opts.hi, parseFloat(maxInput.value)));
if(!isNaN(v)){
if(v < opts.getMin()) opts.setMin(v); // bring the other handle down to meet the typed year instead of clamping it away
opts.setMax(v);
}
sync(); render();
}
minInput.addEventListener('change', commitMin);
maxInput.addEventListener('change', commitMax);
minInput.addEventListener('keydown', e=>{ if(e.key==='Enter') minInput.blur(); });
maxInput.addEventListener('keydown', e=>{ if(e.key==='Enter') maxInput.blur(); });
return sync;
}
const updateYearLabels = wireRangeFilter({
minId:'yrMin', maxId:'yrMax', minLabelId:'yrMinLabel', maxLabelId:'yrMaxLabel',
lo:1851, hi:2025, format:v=>Math.round(v),
getMin:()=>yrMin, getMax:()=>yrMax, setMin:v=>yrMin=Math.round(v), setMax:v=>yrMax=Math.round(v),
});
const updateWindLabels = wireRangeFilter({
minId:'windMin', maxId:'windMax', minLabelId:'windMinLabel', maxLabelId:'windMaxLabel',
lo:0, hi:220, format:v=>Math.round(v),
getMin:()=>windMin, getMax:()=>windMax, setMin:v=>windMin=Math.round(v), setMax:v=>windMax=Math.round(v),
});
const updatePresLabels = wireRangeFilter({
minId:'presMin', maxId:'presMax', minLabelId:'presMinLabel', maxLabelId:'presMaxLabel',
lo:880, hi:1020, format:v=>Math.round(v),
getMin:()=>presMin, getMax:()=>presMax, setMin:v=>presMin=Math.round(v), setMax:v=>presMax=Math.round(v),
});
document.getElementById('excludeNoPressure').addEventListener('change', e=>{
excludeNoPressure = e.target.checked; render();
});
const updateLfLabels = wireRangeFilter({
minId:'lfMin', maxId:'lfMax', minLabelId:'lfMinLabel', maxLabelId:'lfMaxLabel',
lo:1, hi:10, format:v=>Math.round(v),
getMin:()=>lfMin, getMax:()=>lfMax, setMin:v=>lfMin=Math.round(v), setMax:v=>lfMax=Math.round(v),
});
// fatalities & damage use log-scale sliders (positions 0-1000) since real-world values span
// several orders of magnitude (a handful of deaths up to 11,000+; a few thousand dollars up to $125B)
function posToLog(pos, maxVal){
if(pos<=0) return 0;
return Math.round(Math.pow(10, (pos/1000)*Math.log10(maxVal)));
}
function logToPos(val, maxVal){
if(val<=0) return 0;
return Math.max(0, Math.min(1000, Math.round(1000*Math.log10(val)/Math.log10(maxVal))));
}
function formatFatalityLabel(v){ return v>=11000 ? '11,000+' : v.toLocaleString(); }
function formatDamageLabel(m){
if(m>=125000) return '$125B+';
if(m>=1000) return '$'+(m/1000).toFixed(1).replace(/\.0$/,'')+'B';
if(m>=1) return '$'+m.toFixed(m>=10?0:1)+'M';
if(m>0) return '$'+Math.round(m*1000).toLocaleString()+'K';
return '$0';
}
function parseFatalityInput(str){
const v = parseInt(str.replace(/[^\d]/g,''), 10);
return isNaN(v) ? null : Math.max(0, Math.min(11000, v));
}
function parseDamageInput(str){
str = str.trim().toLowerCase();
const m = str.match(/([\d.]+)\s*(k|m|b)?/);
if(!m) return null;
let val = parseFloat(m[1]);
if(isNaN(val)) return null;
if(m[2]==='b') val *= 1000;
else if(m[2]==='k') val /= 1000;
return Math.max(0, Math.min(125000, val));
}
const fatMinSlider = document.getElementById('fatMin'), fatMaxSlider = document.getElementById('fatMax');
const fatMinInput = document.getElementById('fatMinLabel'), fatMaxInput = document.getElementById('fatMaxLabel');
function updateFatLabels(){
fatMinInput.value = formatFatalityLabel(fatMin);
fatMaxInput.value = formatFatalityLabel(fatMax);
fatMinSlider.value = logToPos(fatMin, 11000);
fatMaxSlider.value = logToPos(fatMax, 11000);
}
fatMinSlider.addEventListener('input', ()=>{
fatMin = Math.min(posToLog(+fatMinSlider.value, 11000), fatMax);
updateFatLabels(); render();
});
fatMaxSlider.addEventListener('input', ()=>{
fatMax = Math.max(posToLog(+fatMaxSlider.value, 11000), fatMin);
updateFatLabels(); render();
});
fatMinInput.addEventListener('change', ()=>{
const v = parseFatalityInput(fatMinInput.value);
if(v!=null) fatMin = Math.min(v, fatMax);
updateFatLabels(); render();
});
fatMaxInput.addEventListener('change', ()=>{
const v = parseFatalityInput(fatMaxInput.value);
if(v!=null) fatMax = Math.max(v, fatMin);
updateFatLabels(); render();
});
fatMinInput.addEventListener('keydown', e=>{ if(e.key==='Enter') fatMinInput.blur(); });
fatMaxInput.addEventListener('keydown', e=>{ if(e.key==='Enter') fatMaxInput.blur(); });

const dmgMinSlider = document.getElementById('dmgMin'), dmgMaxSlider = document.getElementById('dmgMax');
const dmgMinInput = document.getElementById('dmgMinLabel'), dmgMaxInput = document.getElementById('dmgMaxLabel');
function updateDmgLabels(){
dmgMinInput.value = formatDamageLabel(dmgMin);
dmgMaxInput.value = formatDamageLabel(dmgMax);
dmgMinSlider.value = logToPos(dmgMin, 125000);
dmgMaxSlider.value = logToPos(dmgMax, 125000);
}
dmgMinSlider.addEventListener('input', ()=>{
dmgMin = Math.min(posToLog(+dmgMinSlider.value, 125000), dmgMax);
updateDmgLabels(); render();
});
dmgMaxSlider.addEventListener('input', ()=>{
dmgMax = Math.max(posToLog(+dmgMaxSlider.value, 125000), dmgMin);
updateDmgLabels(); render();
});
dmgMinInput.addEventListener('change', ()=>{
const v = parseDamageInput(dmgMinInput.value);
if(v!=null) dmgMin = Math.min(v, dmgMax);
updateDmgLabels(); render();
});
dmgMaxInput.addEventListener('change', ()=>{
const v = parseDamageInput(dmgMaxInput.value);
if(v!=null) dmgMax = Math.max(v, dmgMin);
updateDmgLabels(); render();
});
dmgMinInput.addEventListener('keydown', e=>{ if(e.key==='Enter') dmgMinInput.blur(); });
dmgMaxInput.addEventListener('keydown', e=>{ if(e.key==='Enter') dmgMaxInput.blur(); });
const MONTH_ABBR3 = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOY_TABLE = [];
for(let m=1;m<=12;m++){ for(let d=1; d<=DAYS_IN_MONTH[m]; d++){ DOY_TABLE.push({month:m, day:d}); } }
function dateLabelForDOY(doy){
doy = Math.max(1, Math.min(365, Math.round(doy)));
const {month, day} = DOY_TABLE[doy-1];
return `${MONTH_ABBR3[month]} ${day}`;
}
function parseDateLabelToDOY(str){
if(!str) return null;
const m = str.trim().match(/^([A-Za-z]+)\.?\s+(\d{1,2})$/);
if(!m) return null;
const monAbbr = m[1].slice(0,3).toLowerCase();
const idx = MONTH_ABBR3.findIndex(x=>x.toLowerCase()===monAbbr);
if(idx<1) return null;
const day = parseInt(m[2],10);
if(day<1 || day>DAYS_IN_MONTH[idx]) return null;
return toDayOfYear(idx, day);
}
const dateMinSlider = document.getElementById('dateMin');
const dateMaxSlider = document.getElementById('dateMax');
const dateMinInput = document.getElementById('dateMinLabel');
const dateMaxInput = document.getElementById('dateMaxLabel');
function updateDateLabels(){
dateMinInput.value = dateLabelForDOY(dateMin);
dateMaxInput.value = dateLabelForDOY(dateMax);
dateMinSlider.value = dateMin;
dateMaxSlider.value = dateMax;
}
dateMinSlider.addEventListener('input', ()=>{
dateMin = Math.min(+dateMinSlider.value, dateMax);
updateDateLabels(); render();
});
dateMaxSlider.addEventListener('input', ()=>{
dateMax = Math.max(+dateMaxSlider.value, dateMin);
updateDateLabels(); render();
});
function commitDateMin(){
const v = parseDateLabelToDOY(dateMinInput.value);
if(v!=null) dateMin = Math.min(v, dateMax);
updateDateLabels(); render();
}
function commitDateMax(){
const v = parseDateLabelToDOY(dateMaxInput.value);
if(v!=null) dateMax = Math.max(v, dateMin);
updateDateLabels(); render();
}
dateMinInput.addEventListener('change', commitDateMin);
dateMaxInput.addEventListener('change', commitDateMax);
dateMinInput.addEventListener('keydown', e=>{ if(e.key==='Enter') dateMinInput.blur(); });
dateMaxInput.addEventListener('keydown', e=>{ if(e.key==='Enter') dateMaxInput.blur(); });
function updateMonthLabels(){ updateDateLabels(); }
// latitude sliders + manual entry
const latMinSlider = document.getElementById('latMin');
const latMaxSlider = document.getElementById('latMax');
const latMinInput = document.getElementById('latMinLabel');
const latMaxInput = document.getElementById('latMaxLabel');
function updateLatLabels(){
latMinInput.value = latMin.toFixed(1);
latMaxInput.value = latMax.toFixed(1);
latMinSlider.value = latMin;
latMaxSlider.value = latMax;
}
latMinSlider.addEventListener('input', ()=>{
latMin = Math.min(+latMinSlider.value, latMax);
updateLatLabels(); render();
});
latMaxSlider.addEventListener('input', ()=>{
latMax = Math.max(+latMaxSlider.value, latMin);
updateLatLabels(); render();
});
function commitLatMinInput(){
const v = Math.max(0, Math.min(55, parseFloat(latMinInput.value)));
latMin = isNaN(v) ? latMin : Math.min(v, latMax);
updateLatLabels(); render();
}
function commitLatMaxInput(){
const v = Math.max(0, Math.min(55, parseFloat(latMaxInput.value)));
latMax = isNaN(v) ? latMax : Math.max(v, latMin);
updateLatLabels(); render();
}
latMinInput.addEventListener('change', commitLatMinInput);
latMaxInput.addEventListener('change', commitLatMaxInput);
latMinInput.addEventListener('keydown', e=>{ if(e.key==='Enter') latMinInput.blur(); });
latMaxInput.addEventListener('keydown', e=>{ if(e.key==='Enter') latMaxInput.blur(); });
// longitude sliders + manual entry
const lonMinSlider = document.getElementById('lonMin');
const lonMaxSlider = document.getElementById('lonMax');
const lonMinInput = document.getElementById('lonMinLabel');
const lonMaxInput = document.getElementById('lonMaxLabel');
function updateLonLabels(){
lonMinInput.value = lonMin.toFixed(1);
lonMaxInput.value = lonMax.toFixed(1);
lonMinSlider.value = lonMin;
lonMaxSlider.value = lonMax;
}
lonMinSlider.addEventListener('input', ()=>{
lonMin = Math.min(+lonMinSlider.value, lonMax);
updateLonLabels(); render();
});
lonMaxSlider.addEventListener('input', ()=>{
lonMax = Math.max(+lonMaxSlider.value, lonMin);
updateLonLabels(); render();
});
function commitLonMinInput(){
const v = Math.max(-100, Math.min(0, parseFloat(lonMinInput.value)));
lonMin = isNaN(v) ? lonMin : Math.min(v, lonMax);
updateLonLabels(); render();
}
function commitLonMaxInput(){
const v = Math.max(-100, Math.min(0, parseFloat(lonMaxInput.value)));
lonMax = isNaN(v) ? lonMax : Math.max(v, lonMin);
updateLonLabels(); render();
}
lonMinInput.addEventListener('change', commitLonMinInput);
lonMaxInput.addEventListener('change', commitLonMaxInput);
lonMinInput.addEventListener('keydown', e=>{ if(e.key==='Enter') lonMinInput.blur(); });
lonMaxInput.addEventListener('keydown', e=>{ if(e.key==='Enter') lonMaxInput.blur(); });
document.getElementById('resetRanges').addEventListener('click', ()=>{
yrMin=1851; yrMax=2025;
windMin=0; windMax=220;
presMin=880; presMax=1020;
latMin=0; latMax=55;
lonMin=-100; lonMax=0;
lfMin=1; lfMax=10;
fatMin=0; fatMax=11000;
dmgMin=0; dmgMax=125000;
dateMin=1; dateMax=365;
excludeNoPressure=false;
document.getElementById('excludeNoPressure').checked = false;
updateYearLabels(); updateWindLabels(); updatePresLabels(); updateLatLabels(); updateLonLabels(); updateLfLabels(); updateFatLabels(); updateDmgLabels(); updateMonthLabels();
render();
});
// ---- Leaflet basemap setup ----
const map = L.map('leafletMap', {
center: [27.9, -82.0],
zoom: 6.75,
minZoom: 3,
maxZoom: 12,
zoomSnap: 0.25,
zoomDelta: 0.5,
zoomControl: false,
worldCopyJump: false,
maxBounds: [[-85, -180], [85, 180]]
});
const layoutGrid = document.getElementById('layoutGrid');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
sidebarToggleBtn.addEventListener('click', ()=>{
const collapsed = layoutGrid.classList.toggle('sidebar-collapsed');
sidebarToggleBtn.innerHTML = collapsed ? '&#9654; Filters' : '&#9664; Filters';
sidebarToggleBtn.title = collapsed ? 'Expand filter panel' : 'Collapse filter panel';
// Leaflet needs to know its container resized, or tiles render wrong/cut off until next interaction
setTimeout(()=>{ map.invalidateSize(); }, 260);
});
let resizeTimer;
window.addEventListener('resize', ()=>{
clearTimeout(resizeTimer);
resizeTimer = setTimeout(()=>{ map.invalidateSize(); }, 150);
});
const SATELLITE_SOURCES = [
{
name: 'Esri World Imagery',
url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
opts: { attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics', maxZoom: 19 }
},
{
name: 'USGS National Map Imagery',
url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
opts: { attribution: 'Imagery courtesy USGS National Map', maxZoom: 16 }
},
{
name: 'CARTO Dark (vector fallback, non-satellite)',
url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
opts: { attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 20 }
}
];
let activeBaseLayer = null;
let labelsLayer = null;
let loadedTiles = 0, erroredTiles = 0, switchTimer = null;

function tryBasemap(index){
if(index >= SATELLITE_SOURCES.length){
showMapBanner('All basemap sources failed to load (see console for per-tile errors) — likely blocked by an ad-blocker, extension, or network filter. Storm positions above are still accurate.');
return;
}
const src = SATELLITE_SOURCES[index];
console.log('Loading basemap:', src.name, src.url);
loadedTiles = 0; erroredTiles = 0;
if(activeBaseLayer){ map.removeLayer(activeBaseLayer); }
activeBaseLayer = L.tileLayer(src.url, Object.assign({crossOrigin: 'anonymous'}, src.opts));
activeBaseLayer.on('tileload', ()=>{ loadedTiles++; });
activeBaseLayer.on('tileerror', (e)=>{
erroredTiles++;
console.warn('Tile error on', src.name, e && e.tile ? e.tile.src : '');
});
activeBaseLayer.addTo(map);
clearTimeout(switchTimer);
switchTimer = setTimeout(()=>{
if(loadedTiles === 0){
console.warn(src.name, 'produced zero successful tile loads after 4s (errors:', erroredTiles, ') — falling back to next source.');
tryBasemap(index+1);
} else {
console.log(src.name, 'loaded OK —', loadedTiles, 'tiles rendered,', erroredTiles, 'errors.');
hideMapBanner();
}
}, 4000);
}
function showMapBanner(msg){
let el = document.getElementById('mapBanner');
if(!el){
el = document.createElement('div');
el.id = 'mapBanner';
el.style.cssText = 'position:absolute;top:10px;left:10px;right:10px;z-index:1000;background:rgba(20,10,10,0.85);color:#f2c14e;font-family:JetBrains Mono,monospace;font-size:11.5px;padding:8px 12px;border-radius:8px;border:1px solid rgba(242,193,78,0.3);';
document.getElementById('mapholder').appendChild(el);
}
el.textContent = msg;
}
function hideMapBanner(){
const el = document.getElementById('mapBanner');
if(el) el.remove();
}
tryBasemap(0);
// city / place-name labels overlay so satellite view still reads like a normal map
labelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
attribution: '',
maxZoom: 19,
opacity: 0.9,
crossOrigin: 'anonymous'
}).addTo(map);
let labelsLayerActive = true;
let currentBasemapStyle = 'satellite';
document.getElementById('leafletMap').classList.add('style-satellite');
const LIGHT_DARK_SOURCES = {
light: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', opts: { attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 20 } },
dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', opts: { attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 20 } }
};
function setBasemapStyle(style){
if(style === currentBasemapStyle) return;
currentBasemapStyle = style;
document.getElementById('leafletMap').classList.remove('style-satellite','style-light','style-dark');
document.getElementById('leafletMap').classList.add('style-'+style);
document.querySelectorAll('.basemap-btn').forEach(b=>b.classList.toggle('active', b.dataset.style===style));
if(activeBaseLayer){ map.removeLayer(activeBaseLayer); activeBaseLayer = null; }
if(style === 'satellite'){
tryBasemap(0);
if(!labelsLayerActive){ labelsLayer.addTo(map); labelsLayerActive = true; }
} else {
if(labelsLayerActive){ map.removeLayer(labelsLayer); labelsLayerActive = false; }
const src = LIGHT_DARK_SOURCES[style];
activeBaseLayer = L.tileLayer(src.url, Object.assign({crossOrigin:'anonymous'}, src.opts));
activeBaseLayer.addTo(map);
hideMapBanner();
}
}
document.querySelectorAll('.basemap-btn').forEach(btn=>{
btn.addEventListener('click', ()=>setBasemapStyle(btn.dataset.style));
});
const allTracksLayer = L.layerGroup().addTo(map);
const dotsLayer = L.layerGroup().addTo(map);
const trackLayer = L.layerGroup().addTo(map);
let showAllTracks = false;
const windExtent = d3.extent(RAW, d=>d.windMph);
const rScale = d3.scaleSqrt().domain(windExtent).range([3, 13]);
let uniformDotSize = false;
const UNIFORM_RADIUS = 7;
function getDotRadius(windMph){
return uniformDotSize ? UNIFORM_RADIUS : rScale(windMph);
}
const card = d3.select('#card');
let markers = [];
function passesFilters(d){
if(!activeCats.has(d.category)) return false;
if(!d._states.some(s=>activeStates.has(s))) return false;
if(d.year < yrMin || d.year > yrMax) return false;
if(d.windMph < windMin || d.windMph > windMax) return false;
if(d.pressure == null){
if(excludeNoPressure) return false;
} else if(d.pressure < presMin || d.pressure > presMax) return false;
if(d.lat < latMin || d.lat > latMax) return false;
if(d.lon < lonMin || d.lon > lonMax) return false;
if(d.landfallTotal < lfMin || d.landfallTotal > lfMax) return false;
const fv = parseFatalities(d.fatalities) ?? 0;
if(fv < fatMin || fv > fatMax) return false;
const dv = parseDamageMillions(d.damage) ?? 0;
if(dv < dmgMin || dv > dmgMax) return false;
if(d._dayOfYear < dateMin || d._dayOfYear > dateMax) return false;
if(!activeEnso.has(ensoFor(d.year))) return false;
if(onlyDocumented && !d.documented) return false;
if(searchTerm){
const hay = (d.displayName+' '+(d.name||'')+' '+d.year+' '+d.statesRaw).toLowerCase();
if(!hay.includes(searchTerm)) return false;
}
return d.lat != null && d.lon != null;
}
function render(){
const filtered = RAW.filter(passesFilters).sort((a,b)=>a.windMph-b.windMph); // draw big storms last (on top)
document.getElementById('shownCount').textContent = filtered.length;
document.getElementById('totalCount').textContent = RAW.length;
const uniqueStorms = new Set();
filtered.forEach(d=>{
if(!d.track || d.track.length < 1){ uniqueStorms.add(d.year+'|'+d.lat+'|'+d.lon+'|'+d.month+'|'+d.day); return; }
uniqueStorms.add(d.year+'|'+d.track.length+'|'+d.track[0][4]+'|'+d.track[0][0]+'|'+d.track[0][1]);
});
document.getElementById('shownStormCount').textContent = uniqueStorms.size;
dotsLayer.clearLayers();
markers = [];
// draw tracks into the shared SVG BEFORE the dots -- Leaflet's SVG renderer stacks by DOM
// insertion order regardless of which layer group a shape conceptually belongs to, so this
// ordering is what actually keeps the landfall dots visually on top of the track lines
renderAllTracks(filtered);
filtered.forEach(d=>{
const isCat5 = d.category===5;
const marker = L.circleMarker([d.lat, d.lon], {
radius: getDotRadius(d.windMph),
fillColor: CAT_COLOR_HEX[d.category],
color: isCat5 ? '#f0e6ff' : 'rgba(6,12,20,0.55)',
weight: isCat5 ? 1.6 : 1,
fillOpacity: isCat5 ? 1 : 0.88,
className: 'storm-marker' + (isCat5 ? ' cat5' : '')
});
marker.on('mouseover', (ev)=>showCard(ev, d));
marker.on('mousemove', (ev)=>positionCard(ev));
marker.on('mouseout', hideCard);
marker.on('click', (ev)=>{
L.DomEvent.stop(ev);
suppressNextMapClick = true;
setTimeout(()=>{ suppressNextMapClick = false; }, 0);
showTrack(d);
});
marker.addTo(dotsLayer);
markers.push(marker);
});
}
function renderAllTracks(filtered){
allTracksLayer.clearLayers();
if(!showAllTracks) return;
// multiple landfalls from the same storm share an identical track array -- dedupe so we don't
// draw (and pay the render cost for) the same polyline once per landfall
const seen = new Set();
filtered.forEach(d=>{
if(!d.track || d.track.length < 2) return;
const key = d.year+'|'+d.track.length+'|'+d.track[0][4]+'|'+d.track[0][0]+'|'+d.track[0][1];
if(seen.has(key)) return;
seen.add(key);
// color each segment by category, same as the single-storm track view, but dimmed
// so a full-basin view of tracks doesn't overwhelm the map
for(let i=0;i<d.track.length-1;i++){
const a = d.track[i], b = d.track[i+1];
L.polyline([[a[0],a[1]],[b[0],b[1]]], {
color: windToTrackColor(a[2], a[3]),
weight: 1.5,
opacity: 0.32,
lineCap: 'round',
interactive: false
}).addTo(allTracksLayer);
}
});
}
const MONTH_ABBR = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TZ_OFFSETS = {
'TX':-6,'LA':-6,'MS':-6,'AL':-6,'GA':-5,'SC':-5,'NC':-5,'VA':-5,'MD/DE':-5,'NJ':-5,'NY':-5,'CT':-5,'RI':-5,'MA':-5,'NH':-5,'ME':-5,
'Canada':-4,'Belize':-6,'Guatemala':-6,'Honduras':-6,'Nicaragua':-6,'Costa Rica':-6,'Panama':-5,'Colombia':-5,'Venezuela':-4,
'Trinidad and Tobago':-4,'Cuba':-5,'Jamaica':-5,'Haiti':-5,'Dominican Republic':-4,'Puerto Rico':-4,'Cayman Islands':-5,
'Bahamas':-5,'Turks and Caicos':-5,'Virgin Islands':-4,'Anguilla':-4,'Saint Martin/Sint Maarten':-4,'Saint Barthelemy':-4,
'Saint Kitts and Nevis':-4,'Antigua and Barbuda':-4,'Montserrat':-4,'Guadeloupe':-4,'Dominica':-4,'Martinique':-4,
'Saint Lucia':-4,'Saint Vincent and the Grenadines':-4,'Barbados':-4,'Grenada':-4,'Bermuda':-4,'Azores':-1,'Portugal':0,'Cape Verde':-1
};
function getUtcOffset(region, lon){
if(region==='FL') return lon < -85.0 ? -6 : -5;
if(region==='Mexico') return lon > -88.0 ? -5 : -6;
return TZ_OFFSETS[region] !== undefined ? TZ_OFFSETS[region] : -5;
}
function formatLandfallTime(d){
if(!d.time || d.month==null || d.day==null) return null;
const hh = parseInt(d.time.slice(0,2),10), mm = parseInt(d.time.slice(2,4),10);
if(isNaN(hh) || isNaN(mm)) return null;
const offset = getUtcOffset(d.statesRaw, d.lon);
const utcMs = Date.UTC(d.year, d.month-1, d.day, hh, mm);
const localMs = utcMs + offset*3600*1000;
const ld = new Date(localMs);
let h12 = ld.getUTCHours()%12; if(h12===0) h12=12;
const ampm = ld.getUTCHours()>=12 ? 'PM':'AM';
const timeStr = `${h12}:${String(ld.getUTCMinutes()).padStart(2,'0')} ${ampm}`;
const dateStr = `${MONTH_ABBR[ld.getUTCMonth()+1]} ${ld.getUTCDate()}, ${ld.getUTCFullYear()}`;
const utcStr = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')} UTC`;
return `${dateStr} &middot; ${timeStr} local (UTC${offset>=0?'+':''}${offset}) &middot; ${utcStr}`;
}
function formatFatalities(s){
if(!s) return s;
return s.replace(/\s*(dead|deaths)\b\.?/gi, '').trim();
}
function parseFatalities(s){
if(!s) return null;
const low = s.toLowerCase();
if(low.includes('not well documented') || low==='none' || low.trim()==='--') return null;
const m = s.replace(/,/g,'').match(/(\d+(\.\d+)?)/);
return m ? parseFloat(m[1]) : null;
}
function parseDamageMillions(s){
if(!s) return null;
const low = s.toLowerCase();
if(low.includes('not well documented') || low.trim()==='--') return null;
const m = s.replace(/,/g,'').match(/([\d.]+)\s*(million|billion|thousand)?/i);
if(!m) return null;
let val = parseFloat(m[1]);
if(isNaN(val)) return null;
const unit = (m[2]||'').toLowerCase();
if(unit==='billion') val *= 1000;
else if(unit==='thousand') val /= 1000;
else if(!unit) val /= 1000000; // bare dollar figure like "$750,000" -> convert to millions basis
return val; // normalized to millions USD, nominal (not inflation-adjusted)
}
function computeRecordBadges(arr){
const byWind = [...arr].sort((a,b)=>b.windMph-a.windMph);
byWind.forEach((d,i)=>{ d._windRankOverall = i+1; });
const byRegion = {};
arr.forEach(d=>{ (byRegion[d.statesRaw] = byRegion[d.statesRaw]||[]).push(d); });
Object.values(byRegion).forEach(list=>{
list.sort((a,b)=>b.windMph-a.windMph);
list.forEach((d,i)=>{ d._windRankRegion = i+1; d._regionCount = list.length; });
});
const withPressure = arr.filter(d=>d.pressure).sort((a,b)=>a.pressure-b.pressure);
withPressure.forEach((d,i)=>{ d._pressureRank = i+1; });
// fatalities/damage are STORM-level totals repeated across every landfall of that storm —
// dedupe to one entry per storm before ranking, or multi-landfall storms get counted many times over
const stormKey = d => `${d.year}|${d.name}|${d.displayName}`;
const seenFat = new Map(), seenDmg = new Map();
arr.forEach(d=>{
const k = stormKey(d);
const fv = parseFatalities(d.fatalities);
if(fv!=null && !seenFat.has(k)) seenFat.set(k, fv);
const dv = parseDamageMillions(d.damage);
if(dv!=null && !seenDmg.has(k)) seenDmg.set(k, dv);
});
const fatRanked = [...seenFat.entries()].sort((a,b)=>b[1]-a[1]);
const fatRankByKey = new Map(fatRanked.map(([k],i)=>[k,i+1]));
const dmgRanked = [...seenDmg.entries()].sort((a,b)=>b[1]-a[1]);
const dmgRankByKey = new Map(dmgRanked.map(([k],i)=>[k,i+1]));
arr.forEach(d=>{
const k = stormKey(d);
if(fatRankByKey.has(k)) d._fatalityRank = fatRankByKey.get(k);
if(dmgRankByKey.has(k)) d._damageRank = dmgRankByKey.get(k);
});
}
function buildRecordBadges(d){
const badges = [];
if(d._windRankOverall && d._windRankOverall<=10) badges.push(`#${d._windRankOverall} strongest landfall on record by wind speed (this dataset)`);
if(d._windRankRegion===1 && d._regionCount>1) badges.push(`Strongest landfall on record for ${d.statesRaw}`);
if(d._pressureRank && d._pressureRank<=10) badges.push(`#${d._pressureRank} lowest pressure on record (this dataset)`);
if(d._fatalityRank && d._fatalityRank<=10) badges.push(`#${d._fatalityRank} deadliest documented landfall (this dataset)`);
if(d._damageRank && d._damageRank<=10) badges.push(`#${d._damageRank} costliest documented landfall (this dataset)`);
return badges;
}
function showCard(ev, d){
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
const badges = (d.customNotable && d.customNotable.length) ? d.customNotable : buildRecordBadges(d);
const badgesLine = badges.length
? `<div class="cell full"><div class="k">Notable</div><div class="v"><ul class="records-list">${badges.map(b=>`<li>${b}</li>`).join('')}</ul></div></div>`
: '';
const catBadgeText = d.category==='EX' ? 'EXTRATROPICAL' : (d.category===0 ? 'TROPICAL STORM' : 'CAT '+d.category);
card.html(`
<div class="card-head">
<div class="card-name">${d.displayName}</div>
<div class="card-cat" style="background:${catColor}">${catBadgeText}</div>
</div>
<div class="card-body">
<div class="cell"><div class="k">Wind</div><div class="v">${Math.round(d.windMph/5)*5} mph</div></div>
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
function positionCard(ev){
const oe = ev.originalEvent;
const mapRect = document.getElementById('mapholder').getBoundingClientRect();
const cardEl = card.node();
const cardW = cardEl.offsetWidth || 250;
const cardH = cardEl.offsetHeight || 260; // actual rendered height -- varies a lot with notable-facts length
const margin = 10;
let x = oe.clientX + 18, y = oe.clientY + 14;
if(x + cardW > mapRect.right - margin) x = oe.clientX - cardW - 18;
if(y + cardH > mapRect.bottom - margin) y = oe.clientY - cardH - 14;
// final clamp in case flipping still doesn't fully fit (very tall card, or cursor near a map corner)
x = Math.max(mapRect.left + margin, Math.min(x, mapRect.right - cardW - margin));
y = Math.max(mapRect.top + margin, Math.min(y, mapRect.bottom - cardH - margin));
card.style('left', x+'px').style('top', y+'px');
}
function hideCard(){ card.classed('show', false); }

// ---- storm track (click a dot to trace its full lifecycle) ----
const hintDefault = document.getElementById('hintLabel').innerHTML;
const TRACK_MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STATUS_LABEL = {TD:'Tropical Depression',TS:'Tropical Storm',HU:'Hurricane',EX:'Extratropical',
SD:'Subtropical Depression',SS:'Subtropical Storm',LO:'Low',WV:'Tropical Wave',DB:'Disturbance'};
function windToTrackColor(kt, status){
if(status==='EX') return CAT_COLOR_HEX['EX'];
if(status && !['HU','TS','SS'].includes(status)) return '#5b7285'; // TD/SD/LO/WV/DB — pre- or sub-tropical-storm strength
if(kt>=137) return CAT_COLOR_HEX[5];
if(kt>=113) return CAT_COLOR_HEX[4];
if(kt>=96) return CAT_COLOR_HEX[3];
if(kt>=83) return CAT_COLOR_HEX[2];
if(kt>=64) return CAT_COLOR_HEX[1];
if(kt>=34) return CAT_COLOR_HEX[0];
return '#5b7285';
}
function nauticalOffset(lon){
// longitude-based standard time-zone approximation (15deg per hour) — used for track points,
// which are mostly over open ocean and don't belong to any specific region's official time zone
return Math.round(lon/15);
}
function formatTrackDate(dateStr, timeStr, lon){
if(!dateStr || dateStr.length < 8 || !timeStr) return '';
const y=dateStr.slice(0,4), mo=+dateStr.slice(4,6), day=+dateStr.slice(6,8);
const hh=+timeStr.slice(0,2), mi=+timeStr.slice(2,4);
if(isNaN(hh) || isNaN(mi)) return '';
const offset = nauticalOffset(lon);
const utcMs = Date.UTC(+y, mo-1, day, hh, mi);
const ld = new Date(utcMs + offset*3600*1000);
let h12 = ld.getUTCHours()%12; if(h12===0) h12=12;
const ampm = ld.getUTCHours()>=12 ? 'PM':'AM';
const localTime = `${h12}:${String(ld.getUTCMinutes()).padStart(2,'0')} ${ampm}`;
const localDate = `${TRACK_MONTH_NAMES[ld.getUTCMonth()]} ${ld.getUTCDate()}, ${ld.getUTCFullYear()}`;
const utcTime = `${String(hh).padStart(2,'0')}:${String(mi).padStart(2,'0')} UTC`;
return `${localDate} &middot; ${localTime} (UTC${offset>=0?'+':''}${offset}) &middot; ${utcTime}`;
}
const ORDINAL_WORD_PATTERN = /^(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty(-(One|Two|Three|Four|Five|Six|Seven|Eight|Nine))?|Thirty(-One)?)$/;
function dynamicOrdinalName(stormName, windKt, status){
const m = stormName.match(/^(Hurricane|Tropical Storm) (.+) \((\d{4})\)$/);
if(!m || !ORDINAL_WORD_PATTERN.test(m[2])) return stormName;
const ordinal = m[2], year = m[3];
const word = (status==='HU' || (typeof windKt==='number' && windKt>=64)) ? 'Hurricane' : 'Tropical Storm';
return `${word} ${ordinal} (${year})`;
}
function windKtToCategory(kt){
if(kt>=137) return 5;
if(kt>=113) return 4;
if(kt>=96) return 3;
if(kt>=83) return 2;
if(kt>=64) return 1;
return null;
}
function showTrackPointCard(ev, p, stormName){
const windKt = p[2], status = p[3], dateStr = p[4], timeStr = p[5], lon = p[1], pressure = p[6];
const windMph = Math.round(windKt*1.15078/5)*5;
const statusLabel = status==='HU' && windKtToCategory(windKt) ? `CAT ${windKtToCategory(windKt)}` : (STATUS_LABEL[status] || status || 'Unknown');
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
let pinnedTracks = [];
let suppressNextMapClick = false;
function trackKey(d){ return d.year + '|' + d.displayName; }
function toggleTrack(d){
const key = trackKey(d);
const idx = pinnedTracks.findIndex(p=>trackKey(p)===key);
const accumulating = (document.getElementById('sameYearToggle').checked || document.getElementById('sameIntensityToggle').checked) && pinnedTracks.length > 0;
if(idx >= 0){
// already pinned -- clicking it again removes it, so you can build up and pare down a comparison set
pinnedTracks.splice(idx, 1);
} else if(accumulating){
pinnedTracks.push(d);
} else {
pinnedTracks = [d];
}
renderPinnedTracks();
}
function showTrack(d){ toggleTrack(d); }
function renderPinnedTracks(){
hideCard();
trackLayer.clearLayers();
if(pinnedTracks.length === 0){
if(!map.hasLayer(dotsLayer)) map.addLayer(dotsLayer);
document.getElementById('sameYearToggleWrap').style.display = 'none';
document.getElementById('sameIntensityToggleWrap').style.display = 'none';
document.getElementById('hintLabel').innerHTML = hintDefault;
return;
}
map.removeLayer(dotsLayer);
document.getElementById('sameYearToggleWrap').style.display = 'flex';
document.getElementById('sameIntensityToggleWrap').style.display = 'flex';
const pinnedKeys = new Set(pinnedTracks.map(trackKey));

pinnedTracks.forEach(d=>{
const track = d.track;
const hasTrack = track && track.length >= 2;
if(hasTrack){
for(let i=0;i<track.length-1;i++){
const a = track[i], b = track[i+1];
L.polyline([[a[0],a[1]],[b[0],b[1]]], {
color: windToTrackColor(a[2], a[3]),
weight: 2.5,
opacity: 0.85,
lineCap: 'round'
}).addTo(trackLayer);
}
track.forEach(p=>{
const pt = L.circleMarker([p[0],p[1]], {
radius: 3.4,
color: 'rgba(6,12,20,0.5)',
weight: 0.6,
fillColor: windToTrackColor(p[2], p[3]),
fillOpacity: 0.9,
className: 'track-point'
}).addTo(trackLayer);
pt.on('mouseover', (ev)=>showTrackPointCard(ev, p, d.displayName));
pt.on('mousemove', (ev)=>positionCard(ev));
pt.on('mouseout', hideCard);
pt.on('click', (ev)=>{ L.DomEvent.stop(ev); suppressNextMapClick = true; setTimeout(()=>{ suppressNextMapClick = false; }, 0); showTrackPointCard(ev, p, d.displayName); });
});
}
// this storm's own landfall dot(s), redrawn on top since the general dots layer is hidden
const siblings = RAW.filter(r => r.year===d.year && r.displayName===d.displayName && passesFilters(r));
siblings.forEach(sib=>{
const isCat5 = sib.category===5;
const m = L.circleMarker([sib.lat, sib.lon], {
radius: getDotRadius(sib.windMph),
fillColor: CAT_COLOR_HEX[sib.category],
color: isCat5 ? '#f0e6ff' : 'rgba(6,12,20,0.55)',
weight: isCat5 ? 1.6 : 1,
fillOpacity: isCat5 ? 1 : 0.88,
className: 'storm-marker' + (isCat5 ? ' cat5' : '')
});
m.on('mouseover', (ev)=>showCard(ev, sib));
m.on('mousemove', (ev)=>positionCard(ev));
m.on('mouseout', hideCard);
m.on('click', (ev)=>{ L.DomEvent.stop(ev); suppressNextMapClick = true; setTimeout(()=>{ suppressNextMapClick = false; }, 0); toggleTrack(sib); });
m.addTo(trackLayer);
});
// highlight ring around the specific clicked landfall point
L.circleMarker([d.lat, d.lon], {
radius: getDotRadius(d.windMph) + 5,
color: '#ffffff', weight: 1.6, opacity: 0.8,
fill: false, dashArray: '2,4'
}).addTo(trackLayer);
});

// optionally show other storms' landfalls that share the same year and/or category as any
// pinned landfall, dimmed, for context -- clicking one of these adds it to the comparison
// set instead of replacing what's shown. deliberately NOT run through passesFilters() -- this
// is meant to show every matching landfall regardless of whatever category/state/wind/etc.
// filters happen to be active in the sidebar, since narrowing those would otherwise make this
// look like it's "not working"
const wantYear = document.getElementById('sameYearToggle').checked;
const wantIntensity = document.getElementById('sameIntensityToggle').checked;
if(wantYear || wantIntensity){
const years = new Set(pinnedTracks.map(d=>d.year));
const cats = new Set(pinnedTracks.map(d=>d.category));
const seenContext = new Set();
RAW.filter(r => {
if(pinnedKeys.has(trackKey(r)) || r.lat == null || r.lon == null) return false;
const matchesYear = wantYear && years.has(r.year);
const matchesIntensity = wantIntensity && cats.has(r.category);
return matchesYear || matchesIntensity;
}).forEach(o=>{
const ok = trackKey(o) + '|' + o.lat + '|' + o.lon;
if(seenContext.has(ok)) return;
seenContext.add(ok);
const m = L.circleMarker([o.lat, o.lon], {
radius: uniformDotSize ? Math.max(UNIFORM_RADIUS-1, 2) : Math.max(rScale(o.windMph)-1, 2),
fillColor: CAT_COLOR_HEX[o.category],
color: 'rgba(6,12,20,0.5)',
weight: 0.8,
fillOpacity: 0.88,
className: 'storm-marker same-year-dim'
});
m.on('mouseover', (ev)=>showCard(ev, o));
m.on('mousemove', (ev)=>positionCard(ev));
m.on('mouseout', hideCard);
m.on('click', (ev)=>{ L.DomEvent.stop(ev); suppressNextMapClick = true; setTimeout(()=>{ suppressNextMapClick = false; }, 0); toggleTrack(o); });
m.addTo(trackLayer);
});
}

if(pinnedTracks.length === 1){
const d = pinnedTracks[0];
const hasTrack = d.track && d.track.length >= 2;
const compareHint = (wantYear || wantIntensity) ? 'click another dot to compare &middot; ' : '';
document.getElementById('hintLabel').innerHTML = hasTrack
? `Showing track: <b style="color:var(--text-main)">${d.displayName}</b> &middot; hover points for detail &middot; ${compareHint}click map to clear`
: `<b style="color:var(--text-main)">${d.displayName}</b>: no track data available &middot; click map to clear`;
} else {
const names = pinnedTracks.map(d=>d.displayName).join(', ');
document.getElementById('hintLabel').innerHTML = `Comparing <b style="color:var(--text-main)">${pinnedTracks.length} storms</b>: ${names} &middot; click a pinned dot to remove it &middot; click map to clear`;
}
}
function clearTrack(){
pinnedTracks = [];
renderPinnedTracks();
}
document.getElementById('sameYearToggle').addEventListener('change', ()=>{
if(pinnedTracks.length) renderPinnedTracks();
});
document.getElementById('sameIntensityToggle').addEventListener('change', ()=>{
if(pinnedTracks.length) renderPinnedTracks();
});
document.getElementById('allTracksToggle').addEventListener('change', e=>{
showAllTracks = e.target.checked;
render();
});
map.on('click', ()=>{
if(suppressNextMapClick){ suppressNextMapClick = false; return; }
clearTrack();
});
const coordReadout = document.getElementById('coordReadout');
map.on('mousemove', (ev)=>{
const lat = ev.latlng.lat, lon = ev.latlng.lng;
const latLabel = (lat>=0?'N':'S'), lonLabel = (lon>=0?'E':'W');
coordReadout.textContent = `${Math.abs(lat).toFixed(4)}\u00b0${latLabel}, ${Math.abs(lon).toFixed(4)}\u00b0${lonLabel}`;
coordReadout.classList.add('show');
});
map.on('mouseout', ()=>{ coordReadout.classList.remove('show'); });

// zoom slider -- note: slider is oriented so top=max zoom (zoomed in), bottom=min zoom (zoomed out)
const zoomSlider = document.getElementById('zoomSlider');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
zoomSlider.addEventListener('input', ()=>{
map.setZoom(+zoomSlider.value);
});
zoomInBtn.addEventListener('click', ()=>{ map.zoomIn(0.5); });
zoomOutBtn.addEventListener('click', ()=>{ map.zoomOut(0.5); });
map.on('zoomend', ()=>{
zoomSlider.value = map.getZoom();
});

const captureBtn = document.getElementById('captureMapBtn');
const watermarkLogo = new Image();
watermarkLogo.src = 'data:image/png;base64,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';
function buildFilterSummaryLines(){
const lines = [];
if(activeStates.size < REGION_ORDER.length){
const selected = REGION_ORDER.filter(r=>activeStates.has(r));
lines.push('Location: ' + (selected.length<=4 ? selected.join(', ') : selected.length+' selected'));
}
if(yrMin > 1851 || yrMax < 2025) lines.push(`Year: ${yrMin}\u2013${yrMax}`);
if(activeCats.size < CAT_ORDER.length){
lines.push('Category: ' + CAT_ORDER.filter(c=>activeCats.has(c)).map(c=>CAT_LABEL[c]).join(', '));
}
if(windMin > 0 || windMax < 220) lines.push(`Wind: ${windMin}\u2013${windMax} mph`);
if(presMin > 880 || presMax < 1020) lines.push(`Pressure: ${presMin}\u2013${presMax} mb`);
if(activeEnso.size < ENSO_ORDER.length) lines.push('ENSO: ' + ENSO_ORDER.filter(e=>activeEnso.has(e)).join(', '));
if(lfMin > 1 || lfMax < 10) lines.push(`Landfalls/storm: ${lfMin}\u2013${lfMax}`);
if(fatMin > 0 || fatMax < 11000) lines.push(`Fatalities: ${formatFatalityLabel(fatMin)}\u2013${formatFatalityLabel(fatMax)}`);
if(dmgMin > 0 || dmgMax < 125000) lines.push(`Damage: ${formatDamageLabel(dmgMin)}\u2013${formatDamageLabel(dmgMax)}`);
if(dateMin > 1 || dateMax < 365) lines.push(`Date: ${dateLabelForDOY(dateMin)}\u2013${dateLabelForDOY(dateMax)}`);
if(searchTerm) lines.push(`Search: "${searchTerm}"`);
if(onlyDocumented) lines.push('Only documented storms');
if(excludeNoPressure) lines.push('Excludes storms without pressure data');
return lines;
}
function lonToTileX(lon, z){ return Math.floor((lon+180)/360 * Math.pow(2,z)); }
function latToTileY(lat, z){
const r = lat * Math.PI/180;
return Math.floor((1 - Math.log(Math.tan(r) + 1/Math.cos(r))/Math.PI) / 2 * Math.pow(2,z));
}
function tileXToLon(x, z){ return x / Math.pow(2,z) * 360 - 180; }
function tileYToLat(y, z){
const n = Math.PI - 2*Math.PI*y/Math.pow(2,z);
return 180/Math.PI * Math.atan(0.5*(Math.exp(n) - Math.exp(-n)));
}
async function drawMapTilesHighRes(destCtx, mapholderRect){
// fetch real tiles at a higher zoom level than what's on screen and draw them scaled down to
// the current view -- this adds genuine extra pixel detail, unlike upscaling the already-
// displayed tiles, which are a fixed resolution from the tile server no matter how the canvas
// itself is scaled
const baseZoom = Math.round(map.getZoom());
// at very low (zoomed-out) zoom levels, oversampled tile fetches can come back as blank/
// placeholder imagery for some providers -- the live map is already rendering correctly at
// this zoom, so just capture that directly rather than risk a broken fetch
if(baseZoom < 6){
await drawMapTilesFromDOM(destCtx, mapholderRect);
return;
}
const overZoom = Math.min(baseZoom + 2, 19);
const bounds = map.getBounds();
const north = Math.min(bounds.getNorth(), 85.0511), south = Math.max(bounds.getSouth(), -85.0511);
const west = bounds.getWest(), east = bounds.getEast();
const maxTile = Math.pow(2, overZoom) - 1;
const xMin = Math.max(0, lonToTileX(west, overZoom)), xMax = Math.min(maxTile, lonToTileX(east, overZoom));
const yMin = Math.max(0, latToTileY(north, overZoom)), yMax = Math.min(maxTile, latToTileY(south, overZoom));

const layers = [activeBaseLayer, labelsLayerActive ? labelsLayer : null].filter(Boolean);
const jobs = [];
for(const layer of layers){
for(let tx=xMin; tx<=xMax; tx++){
for(let ty=yMin; ty<=yMax; ty++){
jobs.push({layer, tx, ty});
}
}
}
// cap total tile fetches so a very zoomed-out view can't trigger an enormous request burst
if(jobs.length > 400){
await drawMapTilesFromDOM(destCtx, mapholderRect);
return;
}
await Promise.all(jobs.map(({layer, tx, ty})=>new Promise(resolve=>{
const url = layer.getTileUrl({x: tx, y: ty, z: overZoom});
const img = new Image();
img.crossOrigin = 'anonymous';
img.onload = ()=>{
const lonW = tileXToLon(tx, overZoom), lonE = tileXToLon(tx+1, overZoom);
const latN = tileYToLat(ty, overZoom), latS = tileYToLat(ty+1, overZoom);
const pNW = map.latLngToContainerPoint([latN, lonW]), pSE = map.latLngToContainerPoint([latS, lonE]);
try{ destCtx.drawImage(img, pNW.x, pNW.y, pSE.x-pNW.x, pSE.y-pNW.y); }catch(e){ /* one bad tile shouldn't kill the capture */ }
resolve();
};
img.onerror = resolve;
img.src = url;
})));
}
function drawMapTilesFromDOM(destCtx, mapholderRect){
// fallback: draw whatever's already loaded in the DOM at its current (lower) resolution
const tileImgs = document.querySelectorAll('#leafletMap .leaflet-tile-pane img.leaflet-tile-loaded, #leafletMap .leaflet-overlay-pane img.leaflet-tile-loaded');
tileImgs.forEach(img=>{
const r = img.getBoundingClientRect();
if(r.width<=0 || r.height<=0) return;
const x = r.left - mapholderRect.left, y = r.top - mapholderRect.top;
if(x+r.width < 0 || y+r.height < 0 || x > mapholderRect.width || y > mapholderRect.height) return;
try{ destCtx.drawImage(img, x, y, r.width, r.height); }catch(e){}
});
return Promise.resolve();
}
captureBtn.addEventListener('click', async ()=>{
if(map._animatingZoom){
alert('Please wait for the map to finish zooming, then try Capture again.');
return;
}
captureBtn.disabled = true;
try{
const mapholder = document.getElementById('mapholder');
const mapholderRect = mapholder.getBoundingClientRect();
// export at a higher pixel density than the CSS layout so the image isn't soft on
// modern displays -- everything below is still drawn in ordinary logical (CSS-pixel)
// coordinates; this transform is what turns those into crisp, high-res output pixels.
// Note: the underlying map tiles themselves are a fixed resolution from the tile server,
// so pushing this higher sharpens all the vector content (dots, tracks, text, watermark)
// noticeably, and gives the smoothing below the best possible source to work with for tiles.
const dpr = Math.max(3, (window.devicePixelRatio || 1) * 1.5);
const logicalW = mapholderRect.width, logicalH = mapholderRect.height;
const canvas = document.createElement('canvas');
canvas.width = Math.round(logicalW * dpr);
canvas.height = Math.round(logicalH * dpr);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';
ctx.scale(dpr, dpr);
ctx.fillStyle = '#081019';
ctx.fillRect(0, 0, logicalW, logicalH);
await drawMapTilesHighRes(ctx, mapholderRect);

// replicate the current basemap's live CSS tile filter directly on our canvas
const tinted = document.createElement('canvas');
tinted.width = canvas.width; tinted.height = canvas.height;
const tctx = tinted.getContext('2d');
const CAPTURE_TINTS = {
satellite: 'saturate(0.82) brightness(0.74) contrast(1.06)',
light: 'brightness(0.94) contrast(1.02)',
dark: 'none'
};
tctx.filter = CAPTURE_TINTS[currentBasemapStyle] || 'none';
tctx.drawImage(canvas, 0, 0);
ctx.save();
ctx.setTransform(1, 0, 0, 1, 0, 0); // draw the full-resolution tinted copy back at 1:1 physical pixels
ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.drawImage(tinted, 0, 0);
ctx.restore(); // back to logical (CSS-pixel) coordinates for everything that follows

// redraw whatever the user is currently looking at, at exact pixel positions
const hadTrack = pinnedTracks.length > 0;
const hadAllTracks = showAllTracks;
if(hadTrack){
pinnedTracks.forEach(pinned=>{
if(pinned.track){
const track = pinned.track;
for(let i=0;i<track.length-1;i++){
const a = track[i], b = track[i+1];
const pa = map.latLngToContainerPoint([a[0],a[1]]), pb = map.latLngToContainerPoint([b[0],b[1]]);
ctx.strokeStyle = windToTrackColor(a[2], a[3]);
ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
}
ctx.globalAlpha = 1;
track.forEach(p=>{
const pt = map.latLngToContainerPoint([p[0],p[1]]);
ctx.beginPath(); ctx.arc(pt.x, pt.y, 3.4, 0, Math.PI*2);
ctx.fillStyle = windToTrackColor(p[2], p[3]); ctx.globalAlpha = 0.9; ctx.fill();
ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(6,12,20,0.5)'; ctx.lineWidth = 0.6; ctx.stroke();
});
}
// this storm's own full-size landfall dot(s), same as the live map -- previously missing from capture
const siblings = RAW.filter(r => r.year===pinned.year && r.displayName===pinned.displayName && passesFilters(r));
siblings.forEach(sib=>{
const spt = map.latLngToContainerPoint([sib.lat, sib.lon]);
const isCat5 = sib.category===5;
ctx.beginPath(); ctx.arc(spt.x, spt.y, getDotRadius(sib.windMph), 0, Math.PI*2);
ctx.fillStyle = CAT_COLOR_HEX[sib.category];
ctx.globalAlpha = isCat5 ? 1 : 0.88;
ctx.fill();
ctx.globalAlpha = 1;
ctx.strokeStyle = isCat5 ? '#f0e6ff' : 'rgba(6,12,20,0.55)';
ctx.lineWidth = isCat5 ? 1.6 : 1;
ctx.stroke();
});
});
const capWantYear = document.getElementById('sameYearToggle').checked;
const capWantIntensity = document.getElementById('sameIntensityToggle').checked;
if(capWantYear || capWantIntensity){
const pinnedKeys = new Set(pinnedTracks.map(d=>d.year+'|'+d.displayName));
const years = new Set(pinnedTracks.map(d=>d.year));
const cats = new Set(pinnedTracks.map(d=>d.category));
const seenContext = new Set();
RAW.filter(r => {
if(pinnedKeys.has(r.year+'|'+r.displayName) || r.lat == null || r.lon == null) return false;
const matchesYear = capWantYear && years.has(r.year);
const matchesIntensity = capWantIntensity && cats.has(r.category);
return matchesYear || matchesIntensity;
}).forEach(o=>{
const ok = o.year+'|'+o.displayName+'|'+o.lat+'|'+o.lon;
if(seenContext.has(ok)) return;
seenContext.add(ok);
const opt = map.latLngToContainerPoint([o.lat, o.lon]);
ctx.beginPath();
ctx.arc(opt.x, opt.y, uniformDotSize ? Math.max(UNIFORM_RADIUS-1, 2) : Math.max(rScale(o.windMph)-1, 2), 0, Math.PI*2);
ctx.fillStyle = CAT_COLOR_HEX[o.category];
ctx.globalAlpha = 0.88; ctx.fill();
ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(6,12,20,0.5)'; ctx.lineWidth = 0.8; ctx.stroke();
});
}
} else {
if(hadAllTracks){
const filtered = RAW.filter(passesFilters);
const seen = new Set();
filtered.forEach(d=>{
if(!d.track || d.track.length < 2) return;
const key = d.year+'|'+d.track.length+'|'+d.track[0][4]+'|'+d.track[0][0]+'|'+d.track[0][1];
if(seen.has(key)) return;
seen.add(key);
for(let i=0;i<d.track.length-1;i++){
const a = d.track[i], b = d.track[i+1];
const pa = map.latLngToContainerPoint([a[0],a[1]]), pb = map.latLngToContainerPoint([b[0],b[1]]);
ctx.strokeStyle = windToTrackColor(a[2], a[3]);
ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.32;
ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
}
});
ctx.globalAlpha = 1;
}
const filtered = RAW.filter(passesFilters).sort((a,b)=>a.windMph-b.windMph);
filtered.forEach(d=>{
const pt = map.latLngToContainerPoint([d.lat, d.lon]);
if(pt.x < -20 || pt.y < -20 || pt.x > logicalW+20 || pt.y > logicalH+20) return;
const isCat5 = d.category===5;
ctx.beginPath(); ctx.arc(pt.x, pt.y, getDotRadius(d.windMph), 0, Math.PI*2);
ctx.fillStyle = CAT_COLOR_HEX[d.category];
ctx.globalAlpha = isCat5 ? 1 : 0.88;
ctx.fill();
ctx.globalAlpha = 1;
ctx.strokeStyle = isCat5 ? '#f0e6ff' : 'rgba(6,12,20,0.55)';
ctx.lineWidth = isCat5 ? 1.6 : 1;
ctx.stroke();
});
}

// active-filter summary, top-left -- only shown when the user has actually narrowed something
const filterLines = buildFilterSummaryLines();
if(filterLines.length){
const fPad = 9, fLineH = 13, fTitleH = 14;
ctx.font = '700 10px "JetBrains Mono", monospace';
let fWidth = ctx.measureText('ACTIVE FILTERS').width;
ctx.font = '400 10px "Archivo", sans-serif';
filterLines.forEach(l=>{ fWidth = Math.max(fWidth, ctx.measureText(l).width); });
const fBoxW = fWidth + fPad*2;
const fBoxH = fTitleH + filterLines.length*fLineH + fPad*1.4;
const fx0 = 9, fy0 = 9;
ctx.fillStyle = 'rgba(6,12,20,0.72)';
ctx.beginPath();
if(ctx.roundRect) ctx.roundRect(fx0, fy0, fBoxW, fBoxH, 7);
else ctx.rect(fx0, fy0, fBoxW, fBoxH);
ctx.fill();
ctx.textBaseline = 'top';
ctx.fillStyle = '#3fd0c9';
ctx.font = '700 10px "JetBrains Mono", monospace';
ctx.fillText('ACTIVE FILTERS', fx0 + fPad, fy0 + fPad*0.7);
ctx.fillStyle = '#c9d6e0';
ctx.font = '400 10px "Archivo", sans-serif';
filterLines.forEach((l, i)=>{
ctx.fillText(l, fx0 + fPad, fy0 + fTitleH + fPad*0.5 + i*fLineH);
});
}

// branded watermark, bottom-left -- kept compact so it doesn't crowd the map
const pad = 9, logoSize = 22, gap = 7;
const line1 = 'TROPICAL CYCLONE DATABASE', line2 = 'Michael Ferragamo | @FerragamoWx';
ctx.font = '700 10px "JetBrains Mono", monospace';
const line1Width = ctx.measureText(line1).width;
ctx.font = '400 9px "Archivo", sans-serif';
const line2Width = ctx.measureText(line2).width;
const textBlockWidth = Math.max(line1Width, line2Width);
const stripW = pad*2 + logoSize + gap + textBlockWidth + 8;
const stripH = logoSize + pad;
const x0 = pad, y0 = logicalH - stripH - pad;
ctx.fillStyle = 'rgba(6,12,20,0.72)';
ctx.beginPath();
if(ctx.roundRect) ctx.roundRect(x0, y0, stripW, stripH, 7);
else ctx.rect(x0, y0, stripW, stripH);
ctx.fill();
const finishCapture = ()=>{
ctx.drawImage(watermarkLogo, x0 + pad/2, y0 + stripH/2 - logoSize/2, logoSize, logoSize);
const textX = x0 + pad/2 + logoSize + gap;
ctx.fillStyle = '#e7eef5';
ctx.font = '700 10px "JetBrains Mono", monospace';
ctx.textBaseline = 'middle';
ctx.fillText(line1, textX, y0 + stripH/2 - 6);
ctx.fillStyle = '#8aa1b5';
ctx.font = '400 9px "Archivo", sans-serif';
ctx.fillText(line2, textX, y0 + stripH/2 + 7);
try{
const link = document.createElement('a');
link.download = `hurricane-map-${Date.now()}.png`;
link.href = canvas.toDataURL('image/png');
link.click();
}catch(e){
console.error('Capture export failed (likely a tainted canvas from a non-CORS tile source):', e);
alert('Sorry, the capture could not be exported -- one of the map tile sources did not allow this. Try again after the map has fully loaded, or try a different basemap.');
}
captureBtn.disabled = false;
};
if(watermarkLogo.complete) finishCapture();
else { watermarkLogo.onload = finishCapture; watermarkLogo.onerror = finishCapture; }
}catch(err){
console.error('Map capture failed:', err);
alert('Sorry, the capture failed. Please try again.');
captureBtn.disabled = false;
}
});



updateYearLabels();
render();

// deep-link support: ?year=YYYY&lat=XX.XXXX&lon=-XX.XXXX jumps straight to that landfall
(function handleDeepLink(){
const params = new URLSearchParams(window.location.search);
const linkYear = params.get('year'), linkLat = params.get('lat'), linkLon = params.get('lon');
if(linkYear==null || linkLat==null || linkLon==null) return;
const targetYear = parseInt(linkYear, 10);
const targetLat = parseFloat(linkLat), targetLon = parseFloat(linkLon);
if(isNaN(targetYear) || isNaN(targetLat) || isNaN(targetLon)) return;

// switch to basin mode since the linked storm could be anywhere in the Atlantic
MODE = 'basin';
RAW = RAW_BASIN;
document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active', b.dataset.mode===MODE));
buildStatStrip();
buildCategoryList();
buildStateList();
buildEnsoList();
updateHeroText();
map.setMaxBounds([[-85, -180], [85, 180]]);
render();

let best = null, bestDist = Infinity;
RAW_BASIN.forEach(d=>{
if(d.year !== targetYear) return;
const dist = Math.hypot(d.lat-targetLat, d.lon-targetLon);
if(dist < bestDist){ bestDist = dist; best = d; }
});
if(best){
map.setView([best.lat, best.lon], 7);
setTimeout(()=>{ showTrack(best); }, 150);
}
})();
