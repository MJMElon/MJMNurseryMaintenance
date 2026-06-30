/* ═══════════════════════════════════════════════════
   MJM NURSERY AI — MAINTENANCE SYSTEM  v2.1
   script.js  ·  MJM Nursery Sdn Bhd (663951-U)
═══════════════════════════════════════════════════ */

/* ════════════════════════════
   CONSTANTS
════════════════════════════ */
const NURSERY_PLOTS = {
  PN:   ['P01','P02','P03','P04','P05','P06','P07','P08','P09','P10',
         'P11','P12','P13','P14','P15','P16','P17','P18','P19','P20',
         'P21','P22','P23','P24','P25','P26','P27','P28','P29','P30',
         'P31','P32','P33','P34','P35','P36','P37','P38','P39','P40',
         'P41','P42','P43','P44','P45','P46','P47','P48','P49','P50',
         'P51','P52'],
  BNN:  ['B1','B2','B3','B4','B5','B6','B7',
         'B8','B9','B10','B11','B12','B13','B14'],
  UNN1: ['U1','U2','U3','U4','U5','U6','U7','U8','U9',
         'U10','U11','U12','U13','U14','U15','U16','U17','U18'],
  UNN2: ['N1','N2','N3','N4','N5','N6','N7','N8','N9','N10',
         'N11','N12','N13','N14','N15','N16','N17','N18','N19','N20']
};
const NURSERY_LABELS = {
  PN:   'PN — Pre Nursery',
  BNN:  'BNN — Batu Niah Nursery',
  UNN1: 'UNN 1 — Ulu Niah Nursery 1',
  UNN2: 'UNN 2 — Ulu Niah Nursery 2'
};

/* Default seedling quantity per plot — used for max chemical usage calculation.
   User-edited values are stored in localStorage and override these defaults. */
const DEFAULT_PLOT_QTY = {
  PN: {},
  BNN: { B1:2352, B2:3152, B3:5655, B4:2933, B5:6924, B6:7408, B7:3018,
         B8:5302, B9:2716, B10:7146, B11:12121, B12:2398, B13:3662, B14:3536 },
  UNN1: { U1:4647, U2:5088, U3:6429, U4:4374, U5:3378, U6:8062, U7:6984,
          U8:6689, U9:3970, U10:3808, U11:6159, U12:7503, U13:5931, U14:5857,
          U15:5601, U16:2902, U17:6885, U18:7794 },
  UNN2: { N1:5844, N2:5634, N3:6492, N4:6066, N5:4764, N6:4876, N7:7518,
          N8:7409, N9:5692, N10:5324, N11:4940, N12:3855, N13:1680, N14:5271,
          N15:3860, N16:5767, N17:4834, N18:2897, N19:6590, N20:2491 }
};
const PLOT_QTY_LS_KEY = 'mjm_plot_qty_overrides';
function getPlotQtyOverrides(){
  try { return JSON.parse(localStorage.getItem(PLOT_QTY_LS_KEY) || '{}'); }
  catch(e) { return {}; }
}
function getPlotQty(n, p){
  const ov = getPlotQtyOverrides();
  if (ov[n]?.[p] !== undefined && ov[n][p] !== null) return +ov[n][p] || 0;
  return DEFAULT_PLOT_QTY[n]?.[p] || 0;
}
function setPlotQty(n, p, v){
  const all = getPlotQtyOverrides();
  if (!all[n]) all[n] = {};
  all[n][p] = Math.max(0, +v || 0);
  localStorage.setItem(PLOT_QTY_LS_KEY, JSON.stringify(all));
}
function resetPlotQty(n){
  const all = getPlotQtyOverrides();
  delete all[n];
  localStorage.setItem(PLOT_QTY_LS_KEY, JSON.stringify(all));
}
const COVERAGE_PER_PUMP = 800; // standard spray coverage (seedlings per pump)
const CHEMICAL_COVERAGE = { // overrides for chemicals with different cover-per-pump
  'Asir': 1, // per-seedling: capacity × dose / 1000
};

function fmtUsage(totalAmount, unit, decimals = 2){
  // gm → kg, mL → L; default 2 decimals (no round-up)
  const big = totalAmount / 1000;
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(big * factor) / factor;
  return rounded + (unit === 'gm' ? ' kg' : ' L');
}
/* Unit per chemical — used to auto-set mL/gm when a chemical is selected */
const CHEMICAL_UNITS = {
  // Pest
  'Cyper':'mL','Destroy':'mL','Becker':'mL','Asir':'gm',
  // Disease
  'Antracol':'gm','Dithane':'gm','Thiram':'gm','Daconil':'gm','Manzate':'gm',
  // Weedicide / sticker
  'Widex':'gm','Sentry':'mL','Ally':'gm','Basta':'mL','Monex':'mL','Acosta':'mL',
  'Bond':'mL','Activator':'mL',
  // Fertilizer
  'Sk Cote':'gm','Yaramila':'gm','Compound 55':'gm','Ajimino':'gm','ERP':'gm','Organic Matter':'gm',
};
function getUnitForChem(name){ return CHEMICAL_UNITS[name] || 'gm'; }

function calcMaxChem(seedlings, chemName, dose, unit, decimals = 2){
  if(!seedlings || !chemName || chemName === '—' || !dose) return '—';
  // Formula: (plot capacity / coverage per pump) × dose per pump / 1000
  const coverage = CHEMICAL_COVERAGE[chemName] || COVERAGE_PER_PUMP;
  const totalUnits = (seedlings / coverage) * dose;
  return fmtUsage(totalUnits, unit, decimals);
}
function sumSeedlings(nursery, plots, ticked){
  return plots.filter(p => ticked(p)).reduce((s,p) => s + getPlotQty(nursery, p), 0);
}
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* Chemical option lists — only chemicals MJM Nursery uses. Names only; dose set separately. */
const PD_SERANGGA_OPTIONS = ['Cyper','Destroy','Becker','Asir','—'];
const PD_KULAT_OPTIONS    = ['Antracol','Dithane','Thiram','Daconil','Manzate','—'];
const PD_STICKER_OPTIONS  = ['Bond','—'];
const FERT_OPTIONS        = ['Sk Cote','Yaramila','Compound 55','Ajimino','ERP','Organic Matter','—'];
/* Fertilizer catalog — dose per seedling and bag size for kg/bag calculation */
const FERTILIZER_INFO = {
  'Sk Cote':        { defaultDose:5,  bagSizeGm:25000,   bagLabel:'25 kg' },
  'Yaramila':       { defaultDose:20, bagSizeGm:50000,   bagLabel:'50 kg' },
  'Compound 55':    { defaultDose:20, bagSizeGm:50000,   bagLabel:'50 kg' },
  'Ajimino':        { defaultDose:20, bagSizeGm:25000,   bagLabel:'25 kg' },
  'ERP':            { defaultDose:20, bagSizeGm:50000,   bagLabel:'50 kg' },
  'Organic Matter': { defaultDose:60, bagSizeGm:1000000, bagLabel:'1,000 kg' },
};
function calcFertUsage(seedlings, fertName, doseGm, decimals = 2){
  if (!seedlings || !fertName || fertName === '—' || !doseGm) return { kg:'—', bags:'—', totalGm:0 };
  const info = FERTILIZER_INFO[fertName];
  const totalGm = seedlings * doseGm;
  const totalKg = totalGm / 1000;
  const factor = Math.pow(10, decimals);
  const kgStr = (Math.round(totalKg * factor) / factor).toLocaleString() + ' kg';
  const bagsStr = info ? (Math.round((totalGm / info.bagSizeGm) * factor) / factor) + ' bags (' + info.bagLabel + ' each)' : '—';
  return { kg: kgStr, bags: bagsStr, totalGm };
}
const INTERROW_CHEM_OPTIONS = ['Basta','Monex','Acosta'];

/* Categorized chemical catalog with default dose per chemical — used by Chemical Calculator */
const CHEMICAL_CATEGORIES = [
  { group: 'Pest', chems: [
    { name:'Cyper',   dose:60, unit:'mL' },
    { name:'Destroy', dose:30, unit:'mL' },
    { name:'Becker',  dose:20, unit:'mL' },
    { name:'Asir',    dose:5,  unit:'gm' },
  ]},
  { group: 'Disease', chems: [
    { name:'Antracol', dose:30, unit:'gm' },
    { name:'Dithane',  dose:30, unit:'gm' },
    { name:'Thiram',   dose:30, unit:'gm' },
    { name:'Daconil',  dose:30, unit:'gm' },
    { name:'Manzate',  dose:30, unit:'gm' },
  ]},
  { group: 'Weedicide : Contact', chems: [
    { name:'Widex', dose:8, unit:'gm' },
  ]},
  { group: 'Weedicide : Systemic', chems: [
    { name:'Sentry', dose:200, unit:'mL' },
    { name:'Ally',   dose:3,   unit:'gm' },
  ]},
  { group: 'Weedicide : Contact + Systemic', chems: [
    { name:'Basta',  dose:200, unit:'mL' },
    { name:'Monex',  dose:200, unit:'mL' },
    { name:'Acosta', dose:200, unit:'mL' },
  ]},
  { group: 'Sticker for fungicide', chems: [
    { name:'Bond', dose:15, unit:'mL' },
  ]},
  { group: 'Sticker for weedicide', chems: [
    { name:'Activator', dose:15, unit:'mL' },
  ]},
];

/* ════════════════════════════
   DEFAULT CONFIGS
════════════════════════════ */
function defaultPDConfig() {
  const stickerOn  = { sticker:'Bond', sticker_dose:15, sticker_unit:'mL' };
  const stickerOff = { sticker:'—',    sticker_dose:0,  sticker_unit:'mL' };
  const mk = (P, D) => ({
    P:P.name, P_dose:P.dose, P_unit:P.unit,
    P_sticker: (P.sticker||stickerOff).sticker,
    P_sticker_dose: (P.sticker||stickerOff).sticker_dose,
    P_sticker_unit: (P.sticker||stickerOff).sticker_unit,
    D:D.name, D_dose:D.dose, D_unit:D.unit,
    D_sticker: (D.sticker||stickerOff).sticker,
    D_sticker_dose: (D.sticker||stickerOff).sticker_dose,
    D_sticker_unit: (D.sticker||stickerOff).sticker_unit,
  });
  return {
    W1: mk({name:'Asir',dose:5,unit:'gm',sticker:stickerOff}, {name:'Antracol',dose:30,unit:'gm',sticker:stickerOn}),
    W2: mk({name:'—',   dose:0,unit:'mL',sticker:stickerOff}, {name:'Thiram',  dose:30,unit:'gm',sticker:stickerOn}),
    W3: mk({name:'—',   dose:0,unit:'mL',sticker:stickerOff}, {name:'Manzate', dose:30,unit:'gm',sticker:stickerOn}),
    W4: mk({name:'—',   dose:0,unit:'mL',sticker:stickerOff}, {name:'Daconil', dose:30,unit:'gm',sticker:stickerOn}),
  };
}
function defaultManuringConfig() {
  // Nested: array of rounds → each round is an array of fertilizer columns
  return [
    [
      { name:'Yaramila',       dose:20,  unit:'gm' },
      { name:'Compound 55',    dose:20,  unit:'gm' },
      { name:'Organic Matter', dose:180, unit:'gm' },
    ],
  ];
}
/* Migrate old flat manuringConfig (and manuring ticks) to the new nested rounds shape */
function migrateManuringShape(s, plots) {
  if (!s || !s.manuringConfig || s.manuringConfig.length === 0) return;
  if (!Array.isArray(s.manuringConfig[0])) {
    s.manuringConfig = [s.manuringConfig];
    plots.forEach(p => {
      const v = s.manuring?.[p];
      if (Array.isArray(v) && (v.length === 0 || typeof v[0] === 'boolean')) {
        s.manuring[p] = [v];
      }
    });
  }
}
function defaultInterrowConfig() {
  return {
    R1:{ chem:'Monex', chem_dose:200, chem_unit:'mL', activator_dose:15, activator_unit:'mL' },
    R2:{ chem:'Basta', chem_dose:200, chem_unit:'mL', activator_dose:15, activator_unit:'mL' },
  };
}

/* ════════════════════════════
   STATE
════════════════════════════ */
let appState       = {};
const STATE_LS_PREFIX = 'mjm_state_';
function stateKey(n, m) { return `${STATE_LS_PREFIX}${n}_${m}`; }
function persistState(n, m) {
  const s = appState[n]?.[m];
  if (!s) return;
  try {
    localStorage.setItem(stateKey(n, m), JSON.stringify({
      pdConfig:       s.pdConfig,
      manuringConfig: s.manuringConfig,
      interrowConfig: s.interrowConfig,
      pd:             s.pd,
      manuring:       s.manuring,
      weeding:        s.weeding,
      interrow:       s.interrow,
      _savedPd:       s._savedPd,
    }));
  } catch(e) { console.warn('[State] Persist failed:', e); }
}
function loadPersistedState(n, m) {
  try { const r = localStorage.getItem(stateKey(n, m)); return r ? JSON.parse(r) : null; }
  catch(e) { return null; }
}
let currentNursery = 'BNN';
let currentUser    = '';
let canEditSchedule = false;   // controlled by account role
let editRecId      = null;
let barInst        = null;
let jenisInst      = null;

function getState(nursery, month) {
  if (!appState[nursery]) appState[nursery] = {};
  if (!appState[nursery][month]) {
    // Hydrate from localStorage if a saved state exists for this nursery+month
    const persisted = loadPersistedState(nursery, month);
    if (persisted) {
      migrateManuringShape(persisted, NURSERY_PLOTS[nursery]);
      appState[nursery][month] = persisted;
      return appState[nursery][month];
    }
    const plots = NURSERY_PLOTS[nursery];
    const s = {
      pdConfig:       defaultPDConfig(),
      manuringConfig: defaultManuringConfig(),
      interrowConfig: defaultInterrowConfig(),
      pd:             {},
      manuring:       {},
      weeding:        {},   // weeding[plot] = { R1: bool, R2: bool }
      interrow:       {},   // interrow[plot] = { R1: bool, R2: bool }
    };
    // init empty grids
    ['W1','W2','W3','W4'].forEach(w => {
      s.pd[w] = {};
      plots.forEach(p => { s.pd[w][p] = { P:false, D:false }; });
    });
    plots.forEach(p => {
      s.manuring[p]  = [[false, false, false]]; // [round1: [col1, col2, col3]]
      s.weeding[p]   = { R1:false, R2:false };
      s.interrow[p]  = { R1:false, R2:false };
    });
    // Seed BNN Apr 2026
    if (nursery === 'BNN' && month === 'Apr 2026') {
      const pdSeed = {
        W1:{ P:['B2','B6','B7','B9'],    D:['B1','B3','B4','B8','B11','B12','B13','B14'] },
        W2:{ P:[],                        D:['B11','B13','B14'] },
        W3:{ P:[],                        D:['B1','B3','B4','B8','B11','B13','B14'] },
        W4:{ P:[],                        D:['B11','B13','B14'] }
      };
      Object.entries(pdSeed).forEach(([w,v]) => {
        plots.forEach(p => { s.pd[w][p] = { P:v.P.includes(p), D:v.D.includes(p) }; });
      });
      const mSeed = { 0:['B11','B13','B14'], 1:['B1','B3','B6','B11'], 2:['B2','B4','B7','B8','B9'] };
      plots.forEach(p => { s.manuring[p] = [[mSeed[0].includes(p), mSeed[1].includes(p), mSeed[2].includes(p)]]; });
    }
    appState[nursery][month] = s;
  }
  return appState[nursery][month];
}

/* ════════════════════════════
   WORK RECORDS
════════════════════════════ */
let records = [
  { id:1,  tarikh:'09-03-2026', jenis:'Penyemburan racun kulat dan serangga', racun:'R1: Daconil 50gm + Bond 15mL',     plot:'B1', batch:'234,237,241', carlos:1, gaia:0, remark:'' },
  { id:2,  tarikh:'-',          jenis:'Penyemburan racun kulat dan serangga', racun:'R1: Destroy 30mL + Bond 15mL',     plot:'B1', batch:'234,237,241', carlos:0, gaia:0, remark:'' },
  { id:3,  tarikh:'-',          jenis:'Penyemburan racun kulat dan serangga', racun:'R2: Antracol 50gm + Bond 15mL',    plot:'B1', batch:'234,237,241', carlos:0, gaia:0, remark:'' },
  { id:4,  tarikh:'-',          jenis:'Penyemburan racun kulat dan serangga', racun:'R2: Cyper 60mL + Bond 15mL',       plot:'B1', batch:'234,237,241', carlos:0, gaia:0, remark:'' },
  { id:5,  tarikh:'29-03-2026', jenis:'Meracun rumput secara selingan',       racun:'R1: Monex 200mL + Activator 15mL', plot:'B1', batch:'234,237,241', carlos:1, gaia:0, remark:'' },
  { id:6,  tarikh:'-',          jenis:'Meracun rumput secara selingan',       racun:'R2: Basta 200mL + Activator 15mL', plot:'B1', batch:'234,237,241', carlos:0, gaia:0, remark:'' },
  { id:7,  tarikh:'13-03-2026', jenis:'Merumput',                             racun:'R1: Merumput dalam polibeg',        plot:'B1', batch:'234,237,241', carlos:1, gaia:0, remark:'' },
  { id:8,  tarikh:'-',          jenis:'Merumput',                             racun:'R2: Merumput dalam polibeg',        plot:'B1', batch:'234,237,241', carlos:0, gaia:0, remark:'' },
  { id:9,  tarikh:'07-03-2026', jenis:'Membaja',                              racun:'Organic Matter 180gm',              plot:'B1', batch:'234,237,241', carlos:1, gaia:0, remark:'' },
  { id:10, tarikh:'-',          jenis:'Membaja',                              racun:'Compound 55 — 20gm',                plot:'B1', batch:'234,237,241', carlos:0, gaia:0, remark:'' },
];

/* ════════════════════════════
   AUTH
   Roles:
     admin   — can edit schedules + records
     manager — can edit records only (view schedule)
     viewer  — view only
   (Replace with Supabase auth after deployment)
════════════════════════════ */
const TEST_ACCOUNTS = {
  admin:  { password:'mjm2026', role:'admin'   },
  carlos: { password:'mjm2026', role:'admin'   },
  gaia:   { password:'mjm2026', role:'manager' },
};

function doLogin() {
  const user = document.getElementById('login-user').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value;
  const err  = document.getElementById('login-error');

  if (!user || !pass) {
    err.textContent = 'Please enter both username and password.';
    err.classList.add('show'); return;
  }

  const account = TEST_ACCOUNTS[user];
  if (account && account.password === pass) {
    err.classList.remove('show');
    currentUser     = user.charAt(0).toUpperCase() + user.slice(1);
    canEditSchedule = account.role === 'admin';

    // Pill always reflects whatever nursery is selected in dropdown
    document.getElementById('nursery-pill').textContent = getNursery();
    document.getElementById('user-pill').textContent    = currentUser;

    // Show/hide schedule edit controls based on role
    document.querySelectorAll('.schedule-edit-ctrl').forEach(el => {
      el.style.display = canEditSchedule ? '' : 'none';
    });
    // Show role badge
    const roleBadge = document.getElementById('role-badge');
    if (roleBadge) {
      roleBadge.textContent = account.role;
      roleBadge.style.display = 'inline-block';
    }

    document.getElementById('view-login').style.display = 'none';
    document.getElementById('view-app').style.display   = 'flex';
    renderAll();
    // Auto-sync work records from schedule on login
    autoSyncRecords();
  } else {
    err.textContent = 'Incorrect username or password.';
    err.classList.add('show');
    document.getElementById('login-pass').value = '';
    document.getElementById('login-pass').focus();
  }
}

function doLogout() {
  currentUser = ''; canEditSchedule = false;
  ['login-user','login-pass'].forEach(id => { document.getElementById(id).value=''; });
  document.getElementById('login-error').classList.remove('show');
  document.getElementById('view-app').style.display   = 'none';
  document.getElementById('view-login').style.display = 'flex';
}

/* ════════════════════════════
   NAVIGATION
════════════════════════════ */
const getMonth   = () => document.getElementById('global-month').value;
const getNursery = () => document.getElementById('global-nursery').value;

function onNurseryChange() {
  document.getElementById('nursery-pill').textContent = getNursery();
  renderAll();
  autoSyncRecords();
}
function renderAll() {
  const m=getMonth(), n=getNursery(), lbl=NURSERY_LABELS[n];
  ['pd','manuring','weeding','interrow'].forEach(k => {
    const el = document.getElementById(`${k}-nursery-line`);
    if (el) el.textContent = `${lbl} — ${m}`;
  });
  renderPD(); renderManuring(); renderWeeding(); renderInterrow(); renderRecords();
  // Re-render analytics if that tab is active
  const chartTab = document.getElementById('tab-chart');
  if (chartTab && chartTab.classList.contains('active')) renderCharts();
  // Re-render calculator if its tab is active (clear ticks since plots may differ between nurseries)
  const calcTab = document.getElementById('tab-calc');
  if (calcTab && calcTab.classList.contains('active')) { calcTicked = {}; renderCalc(); }
}

/* Auto-sync: silently regenerate records from current schedule (no confirm, no alert) */
function autoSyncRecords() {
  const n=getNursery(), m=getMonth(), s=getState(n,m), cfg=s.pdConfig;
  const plots=NURSERY_PLOTS[n];
  const newRecs=[]; let id=Date.now();

  ['W1','W2','W3','W4'].forEach(w=>{
    const c=cfg[w];
    plots.forEach(plot=>{
      if (s.pd[w]?.[plot]?.P && c.P!=='—') {
        const pStick = c.P_sticker && c.P_sticker !== '—' ? ` + ${c.P_sticker} ${c.P_sticker_dose}${c.P_sticker_unit}` : '';
        newRecs.push({id:id++, tarikh:'-', jenis:'Penyemburan racun kulat dan serangga',
          racun:`${w}: ${c.P} ${c.P_dose}${c.P_unit}${pStick}`,
          plot, batch:'', carlos:0, gaia:0, remark:''});
      }
      if (s.pd[w]?.[plot]?.D && c.D!=='—') {
        const dStick = c.D_sticker && c.D_sticker !== '—' ? ` + ${c.D_sticker} ${c.D_sticker_dose}${c.D_sticker_unit}` : '';
        newRecs.push({id:id++, tarikh:'-', jenis:'Penyemburan racun kulat dan serangga',
          racun:`${w}: ${c.D} ${c.D_dose}${c.D_unit}${dStick}`,
          plot, batch:'', carlos:0, gaia:0, remark:''});
      }
    });
  });
  s.manuringConfig.forEach((round, ri) => {
    round.forEach((c, ci) => {
      plots.filter(p=>s.manuring[p]?.[ri]?.[ci]).forEach(plot => {
        newRecs.push({id:id++, tarikh:'-', jenis:'Membaja',
          racun:`Round ${ri+1}: ${c.name} ${c.dose}${c.unit}`,
          plot, batch:'', carlos:0, gaia:0, remark:''});
      });
    });
  });
  ['R1','R2'].forEach(r=>{
    plots.filter(p=>s.weeding[p]?.[r]).forEach(plot=>{
      newRecs.push({id:id++, tarikh:'-', jenis:'Merumput',
        racun:`Round ${r[1]}: Merumput dalam polibeg`,
        plot, batch:'', carlos:0, gaia:0, remark:''});
    });
  });
  ['R1','R2'].forEach(r=>{
    const c=s.interrowConfig[r];
    plots.filter(p=>s.interrow[p]?.[r]).forEach(plot=>{
      newRecs.push({id:id++, tarikh:'-', jenis:'Meracun rumput secara selingan',
        racun:`Round ${r[1]}: ${c.chem} ${c.chem_dose}${c.chem_unit} + Activator ${c.activator_dose}${c.activator_unit}`,
        plot, batch:'', carlos:0, gaia:0, remark:''});
    });
  });

  // Merge: keep existing records that have been filled in (tarikh/batch/carlos/gaia),
  // add new ones that don't exist yet
  const existingKey = r => `${r.jenis}||${r.racun}||${r.plot}`;
  const existingMap = {};
  records.filter(r => NURSERY_PLOTS[n].includes(r.plot)).forEach(r => {
    existingMap[existingKey(r)] = r;
  });
  const otherNurseryRecs = records.filter(r => !NURSERY_PLOTS[n].includes(r.plot));
  const merged = newRecs.map(r => existingMap[existingKey(r)] || r);
  records = [...otherNurseryRecs, ...merged];
  renderRecords();
}
function switchTab(name, btn) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if (name==='record') renderRecords();
  if (name==='chart')  renderCharts();
  if (name==='calc')   renderCalc();
}

/* ════════════════════════════
   CHEMICAL USAGE CALCULATOR
════════════════════════════ */
const CALC_CHEMICALS = (() => {
  const out = [];
  CHEMICAL_CATEGORIES.forEach(cat => {
    cat.chems.forEach(c => {
      out.push({ name: c.name, dose: c.dose, unit: c.unit, group: cat.group });
    });
  });
  return out;
})();

let calcTicked = {}; // {plot: true}
let calcChemIdx = 0;
let calcInited = false;

function initCalcChemDropdown() {
  const sel = document.getElementById('calc-chem');
  if (!sel || calcInited) return;
  // Build with optgroups so chemicals are visually grouped by category — show NAME only
  let html = '';
  CALC_CHEMICALS.forEach((c, i) => { c._idx = i; });
  CHEMICAL_CATEGORIES.forEach(cat => {
    const options = CALC_CHEMICALS
      .filter(c => c.group === cat.group)
      .map(c => `<option value="${c._idx}">${c.name}</option>`).join('');
    if (options) html += `<optgroup label="${cat.group}">${options}</optgroup>`;
  });
  sel.innerHTML = html;
  calcInited = true;
  onCalcChemChange();
}

function onCalcChemChange() {
  const sel = document.getElementById('calc-chem');
  calcChemIdx = +sel.value;
  const c = CALC_CHEMICALS[calcChemIdx];
  if (!c) return;
  document.getElementById('calc-dose').value = c.dose;
  document.getElementById('calc-unit').value = c.unit;
  renderCalcResults();
}

function toggleCalcPlot(plot, el) {
  calcTicked[plot] = !calcTicked[plot];
  el.classList.toggle('ticked', calcTicked[plot]);
  el.textContent = (calcTicked[plot] ? '☑ ' : '☐ ') + plot;
  renderCalcResults();
}

function clearCalcTicks() {
  calcTicked = {};
  renderCalcPlots();
  renderCalcResults();
}

function selectAllCalcPlots() {
  const plots = NURSERY_PLOTS[getNursery()];
  plots.forEach(p => calcTicked[p] = true);
  renderCalcPlots();
  renderCalcResults();
}

function renderCalcPlots() {
  const grid = document.getElementById('calc-plot-grid');
  if (!grid) return;
  const plots = NURSERY_PLOTS[getNursery()];
  grid.innerHTML = plots.map(p => {
    const tk = !!calcTicked[p];
    return `<button class="calc-plot-btn${tk ? ' ticked' : ''}" onclick="toggleCalcPlot('${p}',this)">${tk ? '☑' : '☐'} ${p}</button>`;
  }).join('');
}

function renderCalcResults() {
  const wrap = document.getElementById('calc-results');
  if (!wrap) return;
  const n = getNursery();
  const plots = NURSERY_PLOTS[n];
  const chem = CALC_CHEMICALS[calcChemIdx];
  const dose = +document.getElementById('calc-dose').value || 0;
  const unit = document.getElementById('calc-unit').value || 'gm';
  const tickedCount = plots.filter(p => calcTicked[p]).length;
  const seedlings = sumSeedlings(n, plots, p => calcTicked[p]);
  const maxUsage = calcMaxChem(seedlings, chem?.name || '', dose, unit);
  wrap.innerHTML = `
    <div class="calc-result-card"><div class="lbl">Plots Selected</div><div class="val">${tickedCount}</div></div>
    <div class="calc-result-card"><div class="lbl">Jumlah Bibit</div><div class="val">${seedlings ? seedlings.toLocaleString() : '—'}</div></div>
    <div class="calc-result-card highlight"><div class="lbl">Maksimal Racun Guna</div><div class="val">${maxUsage}</div></div>
  `;
}

function renderCalcCapacity() {
  const grid = document.getElementById('calc-capacity-grid');
  if (!grid) return;
  const n = getNursery();
  const plots = NURSERY_PLOTS[n];
  if (!plots.length) { grid.innerHTML = '<div style="font-size:12px;color:#888">No plots for this nursery.</div>'; return; }
  grid.innerHTML = plots.map(p => `
    <div style="display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #d4d8d4;border-radius:6px;padding:5px 8px">
      <span style="font-size:12px;font-weight:700;color:#236023;min-width:38px">${p}</span>
      <input type="number" min="0" step="1" value="${getPlotQty(n, p)}"
        onchange="onCalcCapacityChange('${n}','${p}',this.value)"
        style="flex:1;width:100%;min-width:0;height:28px;padding:0 6px;font-size:12px;border:1px solid #d4d8d4;border-radius:4px;font-family:inherit;text-align:right">
    </div>
  `).join('');
}

function onCalcCapacityChange(n, p, v) {
  setPlotQty(n, p, v);
  renderCalcResults();
  renderFertCalcResults();
  // Push the new capacity through to the schedule tables so their
  // Jumlah Bibit / Max Racun / Max Baja calculations stay correct.
  if (n === getNursery()) {
    renderPD();
    renderManuring();
  }
}

function resetCalcCapacity() {
  if (!confirm(`Reset all plot capacities for ${getNursery()} to default values?`)) return;
  resetPlotQty(getNursery());
  renderCalcCapacity();
  renderCalcResults();
  renderFertCalcResults();
  renderPD();
  renderManuring();
}

function renderCalc() {
  const nLine = document.getElementById('calc-nursery-line');
  if (nLine) nLine.textContent = `${NURSERY_LABELS[getNursery()]} — ${getMonth()}`;
  renderCalcCapacity();
  initCalcChemDropdown();
  renderCalcPlots();
  renderCalcResults();
  initFertCalcDropdown();
  renderFertCalcPlots();
  renderFertCalcResults();
}

/* ─── Fertilizer Calculator ─── */
let fertTicked = {};
let fertCalcInited = false;

function initFertCalcDropdown() {
  const sel = document.getElementById('fcalc-fert');
  if (!sel || fertCalcInited) return;
  const names = FERT_OPTIONS.filter(x => x !== '—');
  sel.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join('');
  fertCalcInited = true;
  onFertCalcChange();
}

function onFertCalcChange() {
  const sel = document.getElementById('fcalc-fert');
  const name = sel.value;
  const info = FERTILIZER_INFO[name];
  if (info) {
    document.getElementById('fcalc-dose').value = info.defaultDose;
    document.getElementById('fcalc-bag').value = info.bagLabel;
  }
  renderFertCalcResults();
}

function toggleFertCalcPlot(plot, el) {
  fertTicked[plot] = !fertTicked[plot];
  el.classList.toggle('ticked', fertTicked[plot]);
  el.textContent = (fertTicked[plot] ? '☑ ' : '☐ ') + plot;
  renderFertCalcResults();
}

function clearFertCalcTicks() {
  fertTicked = {};
  renderFertCalcPlots();
  renderFertCalcResults();
}

function selectAllFertCalcPlots() {
  const plots = NURSERY_PLOTS[getNursery()];
  plots.forEach(p => fertTicked[p] = true);
  renderFertCalcPlots();
  renderFertCalcResults();
}

function renderFertCalcPlots() {
  const grid = document.getElementById('fcalc-plot-grid');
  if (!grid) return;
  const plots = NURSERY_PLOTS[getNursery()];
  grid.innerHTML = plots.map(p => {
    const tk = !!fertTicked[p];
    return `<button class="calc-plot-btn${tk ? ' ticked' : ''}" onclick="toggleFertCalcPlot('${p}',this)">${tk ? '☑' : '☐'} ${p}</button>`;
  }).join('');
}

function renderFertCalcResults() {
  const wrap = document.getElementById('fcalc-results');
  if (!wrap) return;
  const n = getNursery();
  const plots = NURSERY_PLOTS[n];
  const sel = document.getElementById('fcalc-fert');
  const fertName = sel?.value || '';
  const dose = +document.getElementById('fcalc-dose').value || 0;
  const tickedCount = plots.filter(p => fertTicked[p]).length;
  const seedlings = sumSeedlings(n, plots, p => fertTicked[p]);
  const usage = calcFertUsage(seedlings, fertName, dose);
  wrap.innerHTML = `
    <div class="calc-result-card"><div class="lbl">Plots Selected</div><div class="val">${tickedCount}</div></div>
    <div class="calc-result-card"><div class="lbl">Jumlah Bibit</div><div class="val">${seedlings ? seedlings.toLocaleString() : '—'}</div></div>
    <div class="calc-result-card highlight"><div class="lbl">Maksimal Baja Guna</div><div class="val">${usage.kg}</div></div>
    <div class="calc-result-card"><div class="lbl">Bags Needed</div><div class="val" style="font-size:16px">${usage.bags}</div></div>
  `;
}

/* ════════════════════════════
   SHARED TABLE HELPERS
════════════════════════════ */
function mkSel(opts, selected, onch, extraStyle='') {
  return `<select class="th-sel" style="${extraStyle}" onchange="${onch}">
    ${opts.map(o=>`<option${o===selected?' selected':''}>${o}</option>`).join('')}
  </select>`;
}
function mkDose(val, unit, onch) {
  return `<div class="th-dose">
    <input class="th-dose-inp" type="number" min="0" step="1" value="${val}" onchange="${onch}">
    <span class="th-dose-unit">${unit}</span>
  </div>`;
}

/* ════════════════════════════
   P&D TABLE
════════════════════════════ */
function updatePDChem(w,f,v){
  if(!canEditSchedule) return;
  const cfg = getState(getNursery(),getMonth()).pdConfig[w];
  cfg[f] = v;
  // Auto-set unit based on the selected chemical
  if (f === 'P')         cfg.P_unit         = getUnitForChem(v);
  else if (f === 'D')    cfg.D_unit         = getUnitForChem(v);
  else if (f === 'P_sticker') cfg.P_sticker_unit = getUnitForChem(v);
  else if (f === 'D_sticker') cfg.D_sticker_unit = getUnitForChem(v);
  renderPD();
}
function updatePDDose(w,f,v){ if(!canEditSchedule) return; getState(getNursery(),getMonth()).pdConfig[w][f]=v; renderPD(); }

function renderPD() {
  const n=getNursery(), m=getMonth(), s=getState(n,m), cfg=s.pdConfig, plots=NURSERY_PLOTS[n];
  const W=['W1','W2','W3','W4'];
  let h='<thead>';
  h+=`<tr><th rowspan="4" class="plot-col-hdr">PLOT</th>`;
  W.forEach(w=>h+=`<th colspan="2" class="wk-th">MINGGU ${w[1]}</th>`);
  h+='</tr><tr>';
  W.forEach(()=>h+='<th class="p-th">P — SERANGGA</th><th class="d-th">D — KULAT</th>');
  h+='</tr><tr>';
  W.forEach(w=>{
    const c=cfg[w];
    h+=`<th class="hdr-input-cell p-bg">${mkSel(PD_SERANGGA_OPTIONS,c.P,`updatePDChem('${w}','P',this.value)`)}${mkDose(c.P_dose,c.P_unit,`updatePDDose('${w}','P_dose',+this.value)`)}</th>`;
    h+=`<th class="hdr-input-cell d-bg">${mkSel(PD_KULAT_OPTIONS,c.D,`updatePDChem('${w}','D',this.value)`)}${mkDose(c.D_dose,c.D_unit,`updatePDDose('${w}','D_dose',+this.value)`)}</th>`;
  });
  h+='</tr><tr>';
  W.forEach(w=>{
    const c=cfg[w];
    h+=`<th class="hdr-input-cell sticker-bg">${mkSel(PD_STICKER_OPTIONS,c.P_sticker,`updatePDChem('${w}','P_sticker',this.value)`)}${mkDose(c.P_sticker_dose,c.P_sticker_unit,`updatePDDose('${w}','P_sticker_dose',+this.value)`)}</th>`;
    h+=`<th class="hdr-input-cell sticker-bg">${mkSel(PD_STICKER_OPTIONS,c.D_sticker,`updatePDChem('${w}','D_sticker',this.value)`)}${mkDose(c.D_sticker_dose,c.D_sticker_unit,`updatePDDose('${w}','D_sticker_dose',+this.value)`)}</th>`;
  });
  h+='</tr></thead><tbody>';
  const saved = getSavedPdSnapshot(s);
  plots.forEach(plot=>{
    h+=`<tr><td class="plot-td">${plot}</td>`;
    W.forEach(w=>{
      const pv=s.pd[w]?.[plot]?.P||false, dv=s.pd[w]?.[plot]?.D||false;
      const psv=saved[w]?.[plot]?.P||false, dsv=saved[w]?.[plot]?.D||false;
      const pMod = pv !== psv, dMod = dv !== dsv;
      h+=`<td class="check-td${pv?' ticked':''}${pMod?' modified':''}" onclick="togPD('${n}','${m}','${w}','${plot}','P',this)">${pv?'☑':'☐'}</td>`;
      h+=`<td class="check-td${dv?' ticked':''}${dMod?' modified':''}" onclick="togPD('${n}','${m}','${w}','${plot}','D',this)">${dv?'☑':'☐'}</td>`;
    });
    h+='</tr>';
  });
  h+='<tr class="jumlah-tr"><td>Jumlah Plot</td>';
  W.forEach(w=>{
    h+=`<td>${plots.filter(p=>s.pd[w]?.[p]?.P).length}</td>`;
    h+=`<td>${plots.filter(p=>s.pd[w]?.[p]?.D).length}</td>`;
  });
  h+='</tr>';

  // Jumlah Bibit (total seedlings for ticked plots)
  h+='<tr class="jumlah-tr"><td>Jumlah Bibit</td>';
  W.forEach(w=>{
    const pSeed = sumSeedlings(n, plots, p => s.pd[w]?.[p]?.P);
    const dSeed = sumSeedlings(n, plots, p => s.pd[w]?.[p]?.D);
    h+=`<td>${pSeed ? pSeed.toLocaleString() : '—'}</td>`;
    h+=`<td>${dSeed ? dSeed.toLocaleString() : '—'}</td>`;
  });
  h+='</tr>';

  // Maksimal Racun Guna (max chemical usage) — 1 decimal
  h+='<tr class="jumlah-tr"><td>Maksimal Racun Guna</td>';
  W.forEach(w=>{
    const c = cfg[w];
    const pSeed = sumSeedlings(n, plots, p => s.pd[w]?.[p]?.P);
    const dSeed = sumSeedlings(n, plots, p => s.pd[w]?.[p]?.D);
    h+=`<td>${calcMaxChem(pSeed, c.P, c.P_dose, c.P_unit, 1)}</td>`;
    h+=`<td>${calcMaxChem(dSeed, c.D, c.D_dose, c.D_unit, 1)}</td>`;
  });
  h+='</tr>';

  // Maksimal Bond Guna (sticker — per column) — 1 decimal
  h+='<tr class="jumlah-tr"><td>Maksimal Bond Guna</td>';
  W.forEach(w=>{
    const c = cfg[w];
    const pSeed = sumSeedlings(n, plots, p => s.pd[w]?.[p]?.P);
    const dSeed = sumSeedlings(n, plots, p => s.pd[w]?.[p]?.D);
    const pBond = (!pSeed || c.P === '—' || c.P_sticker === '—')
      ? '—' : calcMaxChem(pSeed, c.P_sticker, c.P_sticker_dose, c.P_sticker_unit, 1);
    const dBond = (!dSeed || c.D === '—' || c.D_sticker === '—')
      ? '—' : calcMaxChem(dSeed, c.D_sticker, c.D_sticker_dose, c.D_sticker_unit, 1);
    h+=`<td>${pBond}</td><td>${dBond}</td>`;
  });
  h+='</tr></tbody>';
  document.getElementById('pd-table').innerHTML=h;
}
function togPD(n,m,w,plot,type,el){
  if(!canEditSchedule) return;
  const s=getState(n,m);
  if(!s.pd[w][plot]) s.pd[w][plot]={P:false,D:false};
  s.pd[w][plot][type]=!s.pd[w][plot][type];
  renderPD();          // full re-render so 'modified' class updates correctly
  autoSyncRecords();
}

/* Saved-state snapshot for highlighting modifications after save */
function getSavedPdSnapshot(s){
  if (!s._savedPd) s._savedPd = JSON.parse(JSON.stringify(s.pd));
  return s._savedPd;
}
function snapshotPdSaved(s){
  s._savedPd = JSON.parse(JSON.stringify(s.pd));
}

/* ════════════════════════════
   MANURING TABLE
════════════════════════════ */
function updateManuringChem(ri, ci, v){
  if(!canEditSchedule) return;
  const cfg = getState(getNursery(),getMonth()).manuringConfig[ri][ci];
  cfg.name = v;
  cfg.unit = getUnitForChem(v);
  renderManuring();
}
function updateManuringDose(ri, ci, v){
  if(!canEditSchedule) return;
  getState(getNursery(),getMonth()).manuringConfig[ri][ci].dose = v;
  renderManuring();
}
function addManuringRound(){
  if(!canEditSchedule) return;
  const s = getState(getNursery(),getMonth());
  if (s.manuringConfig.length >= 6) return;
  s.manuringConfig.push([{name:'Yaramila', dose:20, unit:'gm'}]);
  NURSERY_PLOTS[getNursery()].forEach(p => {
    if (!s.manuring[p]) s.manuring[p] = [];
    s.manuring[p].push([false]);
  });
  renderManuring();
}
function removeManuringRound(){
  if(!canEditSchedule) return;
  const s = getState(getNursery(),getMonth());
  if (s.manuringConfig.length <= 1) return;
  s.manuringConfig.pop();
  NURSERY_PLOTS[getNursery()].forEach(p => {
    if (s.manuring[p]) s.manuring[p].pop();
  });
  renderManuring();
}
function addManuringCol(ri){
  if(!canEditSchedule) return;
  const s = getState(getNursery(),getMonth());
  if (!s.manuringConfig[ri] || s.manuringConfig[ri].length >= 6) return;
  s.manuringConfig[ri].push({name:'Yaramila', dose:20, unit:'gm'});
  NURSERY_PLOTS[getNursery()].forEach(p => {
    if (!s.manuring[p]) s.manuring[p] = [];
    if (!s.manuring[p][ri]) s.manuring[p][ri] = [];
    s.manuring[p][ri].push(false);
  });
  renderManuring();
}
function removeManuringCol(ri){
  if(!canEditSchedule) return;
  const s = getState(getNursery(),getMonth());
  if (!s.manuringConfig[ri] || s.manuringConfig[ri].length <= 1) return;
  s.manuringConfig[ri].pop();
  NURSERY_PLOTS[getNursery()].forEach(p => {
    if (s.manuring[p]?.[ri]) s.manuring[p][ri].pop();
  });
  renderManuring();
}

function renderManuring() {
  const n=getNursery(), m=getMonth(), s=getState(n,m), cfg=s.manuringConfig, plots=NURSERY_PLOTS[n];
  const totalCols = cfg.reduce((sum, r) => sum + r.length, 0);
  let h='<thead>';

  // Row 1: PLOT (rowspan=5) + master header with + Round / − Round
  h+='<tr>';
  h+=`<th rowspan="5" class="plot-col-hdr">PLOT</th>`;
  h+=`<th colspan="${totalCols}" class="wk-th" style="position:relative;">
    MANURING ROUNDS
    <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);display:flex;gap:6px;">
      <button class="th-action-btn" onclick="addManuringRound()">+ Round</button>
      ${cfg.length>1?`<button class="th-action-btn th-action-danger" onclick="removeManuringRound()">− Round</button>`:''}
    </span>
  </th>`;
  h+='</tr>';

  // Row 2: Per-round headers with + Col / − Col
  h+='<tr>';
  cfg.forEach((round, ri) => {
    h+=`<th colspan="${round.length}" class="wk-th" style="position:relative;background:#0d7a47;">
      Round ${ri+1}
      <span style="position:absolute;right:6px;top:50%;transform:translateY(-50%);display:flex;gap:4px;">
        <button class="th-action-btn" onclick="addManuringCol(${ri})">+ Col</button>
        ${round.length>1?`<button class="th-action-btn th-action-danger" onclick="removeManuringCol(${ri})">− Col</button>`:''}
      </span>
    </th>`;
  });
  h+='</tr>';

  // Row 3: Fertilizer name dropdowns
  h+='<tr>';
  cfg.forEach((round, ri) => {
    round.forEach((c, ci) => {
      h+=`<th class="hdr-input-cell f-bg">${mkSel(FERT_OPTIONS,c.name,`updateManuringChem(${ri},${ci},this.value)`)}</th>`;
    });
  });
  h+='</tr>';

  // Row 4: Dose inputs
  h+='<tr>';
  cfg.forEach((round, ri) => {
    round.forEach((c, ci) => {
      h+=`<th class="hdr-input-cell f-bg-light">${mkDose(c.dose,c.unit,`updateManuringDose(${ri},${ci},+this.value)`)}</th>`;
    });
  });
  h+='</tr>';

  h+='</thead><tbody>';

  // Plot rows
  plots.forEach(plot => {
    h+=`<tr><td class="plot-td">${plot}</td>`;
    cfg.forEach((round, ri) => {
      round.forEach((_, ci) => {
        const v = s.manuring[plot]?.[ri]?.[ci] || false;
        h+=`<td class="check-td${v?' ticked':''}" onclick="togManuring('${n}','${m}','${plot}',${ri},${ci},this)">${v?'☑':'☐'}</td>`;
      });
    });
    h+='</tr>';
  });

  // Jumlah Plot
  h+='<tr class="jumlah-tr"><td>Jumlah Plot</td>';
  cfg.forEach((round, ri) => {
    round.forEach((_, ci) => {
      h+=`<td>${plots.filter(p=>s.manuring[p]?.[ri]?.[ci]).length}</td>`;
    });
  });
  h+='</tr>';

  // Jumlah Bibit
  h+='<tr class="jumlah-tr"><td>Jumlah Bibit</td>';
  cfg.forEach((round, ri) => {
    round.forEach((_, ci) => {
      const seed = sumSeedlings(n, plots, p => s.manuring[p]?.[ri]?.[ci]);
      h+=`<td>${seed ? seed.toLocaleString() : '—'}</td>`;
    });
  });
  h+='</tr>';

  // Maksimal Baja Guna — 1 decimal
  h+='<tr class="jumlah-tr"><td>Maksimal Baja Guna</td>';
  cfg.forEach((round, ri) => {
    round.forEach((c, ci) => {
      const seed = sumSeedlings(n, plots, p => s.manuring[p]?.[ri]?.[ci]);
      const usage = calcFertUsage(seed, c.name, c.dose, 1);
      h+=`<td>${usage.kg}</td>`;
    });
  });
  h+='</tr>';

  // Bags Needed — 1 decimal
  h+='<tr class="jumlah-tr"><td>Bags Needed</td>';
  cfg.forEach((round, ri) => {
    round.forEach((c, ci) => {
      const seed = sumSeedlings(n, plots, p => s.manuring[p]?.[ri]?.[ci]);
      const usage = calcFertUsage(seed, c.name, c.dose, 1);
      h+=`<td style="font-size:10px">${usage.bags}</td>`;
    });
  });
  h+='</tr></tbody>';
  document.getElementById('manuring-table').innerHTML=h;
}
function togManuring(n,m,plot,ri,ci,el){
  if(!canEditSchedule) return;
  const s=getState(n,m);
  if(!s.manuring[plot]) s.manuring[plot]=[];
  if(!s.manuring[plot][ri]) s.manuring[plot][ri]=[];
  s.manuring[plot][ri][ci] = !s.manuring[plot][ri][ci];
  renderManuring();
  autoSyncRecords();
}

/* ════════════════════════════
   WEEDING TABLE  (Round 1 & Round 2 only)
════════════════════════════ */
function renderWeeding() {
  const n=getNursery(), m=getMonth(), s=getState(n,m), plots=NURSERY_PLOTS[n];
  const rounds=['R1','R2'];
  let h='<thead><tr>';
  h+=`<th rowspan="2" class="plot-col-hdr">PLOT</th>`;
  h+=`<th colspan="2" class="wk-th">WEEDING</th>`;
  h+='</tr><tr>';
  rounds.forEach(r=>h+=`<th class="p-th" style="min-width:130px;">Round ${r[1]}</th>`);
  h+='</tr></thead><tbody>';
  plots.forEach(plot=>{
    h+=`<tr><td class="plot-td">${plot}</td>`;
    rounds.forEach(r=>{
      const v=s.weeding[plot]?.[r]||false;
      h+=`<td class="check-td${v?' ticked':''}" onclick="togWeeding('${n}','${m}','${plot}','${r}',this)">${v?'☑':'☐'}</td>`;
    });
    h+='</tr>';
  });
  h+='<tr class="jumlah-tr"><td>Jumlah Plot</td>';
  rounds.forEach(r=>h+=`<td>${plots.filter(p=>s.weeding[p]?.[r]).length}</td>`);
  h+='</tr></tbody>';
  document.getElementById('weeding-table').innerHTML=h;
}
function togWeeding(n,m,plot,r,el){
  if(!canEditSchedule) return;
  const s=getState(n,m);
  if(!s.weeding[plot]) s.weeding[plot]={R1:false,R2:false};
  s.weeding[plot][r]=!s.weeding[plot][r];
  el.textContent=s.weeding[plot][r]?'☑':'☐';
  el.classList.toggle('ticked',s.weeding[plot][r]);
  renderWeeding();
  autoSyncRecords();
}

/* ════════════════════════════
   INTERROW SPRAY TABLE
════════════════════════════ */
function updateInterrowChem(r,v){
  if(!canEditSchedule) return;
  const cfg = getState(getNursery(),getMonth()).interrowConfig[r];
  cfg.chem = v;
  cfg.chem_unit = getUnitForChem(v);
  renderInterrow();
}
function updateInterrowDose(r,f,v){ if(!canEditSchedule) return; getState(getNursery(),getMonth()).interrowConfig[r][f]=v; renderInterrow(); }

function renderInterrow() {
  const n=getNursery(), m=getMonth(), s=getState(n,m), plots=NURSERY_PLOTS[n];
  const cfg=s.interrowConfig;
  const rounds=['R1','R2'];
  let h='<thead>';
  /* Row 1 — group header */
  h+=`<tr><th rowspan="3" class="plot-col-hdr">PLOT</th>`;
  rounds.forEach(r=>h+=`<th class="wk-th">Round ${r[1]}</th>`);
  h+='</tr>';
  /* Row 2 — chemical dropdown */
  h+='<tr>';
  rounds.forEach(r=>{
    const c=cfg[r];
    h+=`<th class="hdr-input-cell" style="background:#f0f9ff !important;">
      ${mkSel(INTERROW_CHEM_OPTIONS,c.chem,`updateInterrowChem('${r}',this.value)`)}
      ${mkDose(c.chem_dose,c.chem_unit,`updateInterrowDose('${r}','chem_dose',+this.value)`)}
    </th>`;
  });
  h+='</tr>';
  /* Row 3 — activator dose */
  h+='<tr>';
  rounds.forEach(r=>{
    const c=cfg[r];
    h+=`<th class="hdr-input-cell sticker-bg">
      <div style="font-size:10px;font-weight:700;color:var(--text-muted);margin-bottom:4px;letter-spacing:0.5px;">ACTIVATOR</div>
      ${mkDose(c.activator_dose,c.activator_unit,`updateInterrowDose('${r}','activator_dose',+this.value)`)}
    </th>`;
  });
  h+='</tr></thead><tbody>';
  plots.forEach(plot=>{
    h+=`<tr><td class="plot-td">${plot}</td>`;
    rounds.forEach(r=>{
      const v=s.interrow[plot]?.[r]||false;
      h+=`<td class="check-td${v?' ticked':''}" onclick="togInterrow('${n}','${m}','${plot}','${r}',this)">${v?'☑':'☐'}</td>`;
    });
    h+='</tr>';
  });
  h+='<tr class="jumlah-tr"><td>Jumlah Plot</td>';
  rounds.forEach(r=>h+=`<td>${plots.filter(p=>s.interrow[p]?.[r]).length}</td>`);
  h+='</tr></tbody>';
  document.getElementById('interrow-table').innerHTML=h;
}
function togInterrow(n,m,plot,r,el){
  if(!canEditSchedule) return;
  const s=getState(n,m);
  if(!s.interrow[plot]) s.interrow[plot]={R1:false,R2:false};
  s.interrow[plot][r]=!s.interrow[plot][r];
  el.textContent=s.interrow[plot][r]?'☑':'☐';
  el.classList.toggle('ticked',s.interrow[plot][r]);
  renderInterrow();
  autoSyncRecords();
}

/* ════════════════════════════
   SAVE SCHEDULE — persists to localStorage so worker app can read it
════════════════════════════ */
function saveSchedule() {
  const n = getNursery(), m = getMonth(), s = getState(n, m);
  const plots = NURSERY_PLOTS[n];
  const tasks = [];
  let id = 1;

  // Build flat task list from schedule state
  const cfg = s.pdConfig;
  ['W1','W2','W3','W4'].forEach(w => {
    const c = cfg[w];
    plots.forEach(plot => {
      if (s.pd[w]?.[plot]?.P && c.P !== '—') {
        const pStick = c.P_sticker && c.P_sticker !== '—' ? ` + ${c.P_sticker} ${c.P_sticker_dose}${c.P_sticker_unit}` : '';
        tasks.push({ id:id++, type:'pd', plot, round:w,
          jenis:'Penyemburan racun kulat dan serangga',
          chemical:`${c.P} ${c.P_dose}${c.P_unit}${pStick}`,
          detail:`P — Serangga, ${w}` });
      }
      if (s.pd[w]?.[plot]?.D && c.D !== '—') {
        const dStick = c.D_sticker && c.D_sticker !== '—' ? ` + ${c.D_sticker} ${c.D_sticker_dose}${c.D_sticker_unit}` : '';
        tasks.push({ id:id++, type:'pd', plot, round:w,
          jenis:'Penyemburan racun kulat dan serangga',
          chemical:`${c.D} ${c.D_dose}${c.D_unit}${dStick}`,
          detail:`D — Kulat, ${w}` });
      }
    });
  });
  s.manuringConfig.forEach((round, ri) => {
    round.forEach((c, ci) => {
      plots.filter(p => s.manuring[p]?.[ri]?.[ci]).forEach(plot => {
        tasks.push({ id:id++, type:'manuring', plot, round:`Round ${ri+1}`,
          jenis:'Membaja',
          chemical:`${c.name} ${c.dose}${c.unit}`,
          detail:`Manuring Round ${ri+1}` });
      });
    });
  });
  ['R1','R2'].forEach(r => {
    plots.filter(p => s.weeding[p]?.[r]).forEach(plot => {
      tasks.push({ id:id++, type:'weeding', plot, round:`Round ${r[1]}`,
        jenis:'Merumput',
        chemical:'Merumput dalam polibeg',
        detail:`Weeding Round ${r[1]}` });
    });
  });
  ['R1','R2'].forEach(r => {
    const c = s.interrowConfig[r];
    plots.filter(p => s.interrow[p]?.[r]).forEach(plot => {
      tasks.push({ id:id++, type:'interrow', plot, round:`Round ${r[1]}`,
        jenis:'Meracun rumput secara selingan',
        chemical:`${c.chem} ${c.chem_dose}${c.chem_unit} + Activator ${c.activator_dose}${c.activator_unit}`,
        detail:`Interrow Spray Round ${r[1]}` });
    });
  });

  // Persist for worker app
  const key = `mjm_schedule_${n}_${m}`;
  localStorage.setItem(key, JSON.stringify(tasks));

  // Snapshot pd state so post-save edits get the modified highlight
  snapshotPdSaved(s);

  // Persist the full editable state so it survives page reload
  persistState(n, m);

  showSaveToast(tasks.length, key);
  autoSyncRecords();
  renderPD();
}

function showSaveToast(taskCount, key) {
  const existing = document.getElementById('save-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'save-toast';
  t.style.cssText = `position:fixed;top:70px;left:50%;transform:translateX(-50%);
    background:var(--green-dark);color:#fff;padding:12px 24px;border-radius:12px;
    font-size:13px;font-weight:600;z-index:300;box-shadow:0 4px 16px rgba(0,40,20,0.25);
    text-align:center;line-height:1.6;`;
  t.innerHTML = `✓ Schedule saved<br>
    <span style="font-size:11px;opacity:0.8;">${taskCount} tasks published · key: ${key}</span>`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.4s'; setTimeout(()=>t.remove(),400); }, 3500);
}

/* ════════════════════════════
   AUTO-SYNC WORK RECORDS FROM SCHEDULE
════════════════════════════ */
function syncRecordsFromSchedule() {
  if (!confirm('Regenerate work records from current schedule? Existing entries will be preserved.')) return;
  autoSyncRecords();
  alert(`Work records synced for ${NURSERY_LABELS[getNursery()]}.`);
}

/* ════════════════════════════
   WORK RECORDS
════════════════════════════ */
function pillCls(jenis) {
  const j=jenis.toLowerCase();
  if(j.includes('penyemburan'))   return 'pill-red';
  if(j.includes('rumput secara')) return 'pill-blue';
  if(j.includes('merumput'))      return 'pill-green';
  if(j.includes('membaja'))       return 'pill-amber';
  return 'pill-green';
}

function renderRecords() {
  const jF   = document.getElementById('rf-filter-jenis').value;
  const pF   = document.getElementById('rf-filter-plot').value;
  const dF   = document.getElementById('rf-filter-date').value.trim().toLowerCase();
  const nF   = getNursery();   // always follows topbar nursery selector

  // Only show records whose plot belongs to the current nursery
  const nurseryPlots = NURSERY_PLOTS[nF];

  const filtered = records.filter(r => {
    if (!nurseryPlots.includes(r.plot)) return false;
    if (jF && r.jenis !== jF) return false;
    if (pF && r.plot !== pF) return false;
    if (dF && !r.tarikh.toLowerCase().includes(dF)) return false;
    return true;
  });

  // Metrics count only current nursery records
  const nurseryRecs = records.filter(r => nurseryPlots.includes(r.plot));
  const total  = nurseryRecs.length;
  const gDone  = nurseryRecs.filter(r=>r.gaia).length;
  const gPend  = total - gDone;
  const pct    = total ? Math.round(gDone/total*100) : 0;

  document.getElementById('rec-metrics').innerHTML=`
    <div class="metric-card mc-blue" ><div class="mc-label">Total Tasks</div><div class="mc-value b">${total}</div></div>
    <div class="metric-card mc-green"><div class="mc-label">Gaia Done</div><div class="mc-value g">${gDone}</div></div>
    <div class="metric-card mc-amber"><div class="mc-label">Gaia Pending</div><div class="mc-value a">${gPend}</div></div>
    <div class="metric-card mc-amber"><div class="mc-label">Done %</div><div class="mc-value a">${pct}%</div></div>
  `;

  // Repopulate plot filter — only plots from current nursery that have records
  const pSel = document.getElementById('rf-filter-plot');
  const curP = pSel.value;
  const plotPool = nurseryPlots.filter(p => records.some(r => r.plot === p));
  pSel.innerHTML = '<option value="">All Plot</option>' +
    plotPool.map(p => `<option${p===curP?' selected':''}>${p}</option>`).join('');

  const tbody = document.getElementById('rec-body');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2.5rem;color:var(--text-faint);">No records found.</td></tr>`;
    return;
  }

  // Group by plot — sort plots in NURSERY_PLOTS order
  const allPlots = Object.values(NURSERY_PLOTS).flat();
  const plotOrder = p => { const i = allPlots.indexOf(p); return i === -1 ? 9999 : i; };
  const plotGroups = {};
  filtered.forEach(r => {
    if (!plotGroups[r.plot]) plotGroups[r.plot] = [];
    plotGroups[r.plot].push(r);
  });
  const sortedPlots = Object.keys(plotGroups).sort((a,b) => plotOrder(a) - plotOrder(b));

  let html = '';
  sortedPlots.forEach(plot => {
    const recs = plotGroups[plot];
    html += `<tr class="plot-group-row">
      <td colspan="8" style="padding:8px 14px 5px;font-size:11px;font-weight:700;letter-spacing:1px;
        text-transform:uppercase;color:var(--green-text);background:var(--green-light);
        border-top:2px solid var(--green-mid);border-bottom:1px solid var(--green-mid);">
        📍 Plot ${plot}
        <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:8px;">
          ${recs.length} task${recs.length>1?'s':''} &nbsp;·&nbsp;
          ${recs.filter(r=>r.gaia).length} Gaia ✓
        </span>
      </td>
    </tr>`;
    recs.forEach(r => {
      html += `<tr>
        <td style="font-weight:600;color:var(--green-text);font-size:12px;">${r.tarikh}</td>
        <td style="font-size:11px;">${r.jenis}</td>
        <td><span class="pill ${pillCls(r.jenis)}">${r.racun||'—'}</span></td>
        <td style="text-align:center;font-weight:700;color:var(--green-text);">${r.plot}</td>
        <td style="text-align:center;font-size:11px;color:var(--text-muted);">${r.batch||'—'}</td>
        <td style="text-align:center;"><span class="chk-btn ${r.gaia?'chk-on':'chk-off'}" onclick="togRec(${r.id},'gaia')">${r.gaia?'☑':'☐'}</span></td>
        <td style="font-size:11px;color:var(--text-muted);">${r.remark||'—'}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-sm" onclick="editRec(${r.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteRec(${r.id})">Del</button>
        </td>
      </tr>`;
    });
  });
  tbody.innerHTML = html;
}
function togRec(id,f){ const r=records.find(x=>x.id===id); r[f]=r[f]?0:1; renderRecords(); }
function openRecModal(pre) {
  editRecId=pre?pre.id:null;
  document.getElementById('rec-modal-title').textContent=editRecId?'Edit Record':'Add Work Record';
  document.getElementById('rf-tarikh').value=pre?.tarikh||'';
  document.getElementById('rf-jenis').value=pre?.jenis||'Penyemburan racun kulat dan serangga';
  document.getElementById('rf-racun').value=pre?.racun||'';
  document.getElementById('rf-plot').value=pre?.plot||'';
  document.getElementById('rf-batch').value=pre?.batch||'';
  document.getElementById('rf-gaia').value=pre?.gaia||0;
  document.getElementById('rf-remark').value=pre?.remark||'';
  document.getElementById('rec-modal').classList.add('open');
}
function closeRecModal(){ document.getElementById('rec-modal').classList.remove('open'); }
function editRec(id){ openRecModal(records.find(r=>r.id===id)); }
function deleteRec(id){ if(!confirm('Delete this record?')) return; records=records.filter(r=>r.id!==id); renderRecords(); }
function saveRec(){
  const obj={
    tarikh:document.getElementById('rf-tarikh').value,
    jenis:document.getElementById('rf-jenis').value,
    racun:document.getElementById('rf-racun').value,
    plot:document.getElementById('rf-plot').value.trim(),
    batch:document.getElementById('rf-batch').value,
    gaia:+document.getElementById('rf-gaia').value,
    remark:document.getElementById('rf-remark').value,
  };
  if(!obj.plot){ alert('Please enter a plot number.'); return; }
  if(editRecId){ const i=records.findIndex(r=>r.id===editRecId); records[i]={...records[i],...obj}; }
  else records.push({id:Date.now(),...obj});
  closeRecModal(); renderRecords();
}

/* ════════════════════════════
   PDF DOWNLOAD
════════════════════════════ */
function openPdfModal(){
  document.getElementById('pdf-nursery').value=getNursery();
  document.getElementById('pdf-month').value=getMonth();
  document.getElementById('pdf-modal').classList.add('open');
}
function closePdfModal(){ document.getElementById('pdf-modal').classList.remove('open'); }

function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
  const pN = document.getElementById('pdf-nursery').value;
  const pM = document.getElementById('pdf-month').value;
  const s  = getState(pN, pM);
  const plots = NURSERY_PLOTS[pN];
  const label = NURSERY_LABELS[pN];
  const incPD       = document.getElementById('pdf-inc-pd').checked;
  const incManuring = document.getElementById('pdf-inc-manuring').checked;
  const incWeeding  = document.getElementById('pdf-inc-weeding').checked;
  const incInterrow = document.getElementById('pdf-inc-interrow').checked;

  const PW=297, PH=210;
  let firstPage=true;

  function addPage(title, badge) {
    if(!firstPage) doc.addPage();
    firstPage=false;
    // Banner bar (taller, brand-green)
    doc.setFillColor(8,92,51); doc.rect(0,0,PW,20,'F');
    // Accent stripe
    doc.setFillColor(13,140,80); doc.rect(0,19.6,PW,0.5,'F');

    // Left side: brand
    doc.setTextColor(255,255,255);
    doc.setFontSize(14); doc.setFont('helvetica','bold');
    doc.text('MJM NURSERY', 14, 9);
    doc.setFontSize(8.5); doc.setFont('helvetica','normal');
    doc.setTextColor(180,220,198);
    doc.text(`${label}  ·  ${pM}`, 14, 14.5);

    // Right side: pill badge
    doc.setFontSize(9); doc.setFont('helvetica','bold');
    const badgeText = badge;
    const badgePad = 5;
    const badgeW = doc.getTextWidth(badgeText) + badgePad*2;
    const badgeH = 8;
    const badgeX = PW - 14 - badgeW;
    const badgeY = 6;
    doc.setFillColor(255,255,255);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.8, 1.8, 'F');
    doc.setTextColor(8,92,51);
    doc.text(badgeText, badgeX + badgeW/2, badgeY + 5.5, {align:'center'});

    // Section title (centered below banner)
    doc.setTextColor(30,58,42);
    doc.setFontSize(12); doc.setFont('helvetica','bold');
    doc.text(title, PW/2, 28, {align:'center'});
    // Title underline accent
    const tw = doc.getTextWidth(title);
    doc.setDrawColor(13,140,80); doc.setLineWidth(0.6);
    doc.line(PW/2 - tw/2, 30, PW/2 + tw/2, 30);
    doc.setLineWidth(0.2);
  }

  // Shared cell drawer
  function cell(x, y, w, h, text, opts) {
    const o = Object.assign({
      align:'center', fill:[255,255,255], stroke:[210,221,214],
      textColor:[30,58,42], font:'helvetica', style:'normal', size:7
    }, opts||{});
    doc.setFillColor(o.fill[0], o.fill[1], o.fill[2]);
    doc.setDrawColor(o.stroke[0], o.stroke[1], o.stroke[2]);
    doc.rect(x, y, w, h, 'FD');
    if (text != null && text !== '') {
      doc.setTextColor(o.textColor[0], o.textColor[1], o.textColor[2]);
      doc.setFont(o.font, o.style);
      doc.setFontSize(o.size);
      doc.text(String(text), x + w/2, y + h*0.7, { align:o.align, maxWidth: w-1.2 });
    }
  }

  const PAGE_MARGIN = 12;
  const plotColW = 30;
  const rowH = 7;
  // computed per-section table width centered horizontally
  function centeredX(tableW){ return (PW - tableW) / 2; }
  const PALETTE = {
    headerDark:  {fill:[8,92,51],   textColor:[255,255,255]},
    headerP:     {fill:[196,239,209], textColor:[8,92,51]},
    headerD:     {fill:[194,213,242], textColor:[24,69,140]},
    chemP:       {fill:[235,250,240], textColor:[8,92,51]},
    chemD:       {fill:[235,242,252], textColor:[24,69,140]},
    sticker:     {fill:[255,247,219], textColor:[140,95,12]},
    fert:        {fill:[255,238,210], textColor:[140,90,18]},
    altRow:      {fill:[247,250,248]},
    plain:       {fill:[255,255,255]},
    summary:     {fill:[218,245,228], textColor:[8,92,51]},
    summaryDark: {fill:[13,122,71],   textColor:[255,255,255]},
  };

  // Draw a proper checkmark inside the cell — uses lines so it always renders
  function drawCheck(x, y, w, h) {
    const cx = x + w/2;
    const cy = y + h/2;
    const sz = Math.min(w, h) * 0.45;
    doc.setDrawColor(13, 122, 71);
    doc.setLineWidth(0.8);
    doc.line(cx - sz*0.55, cy + sz*0.05, cx - sz*0.1, cy + sz*0.4);
    doc.line(cx - sz*0.1, cy + sz*0.4, cx + sz*0.6, cy - sz*0.35);
    doc.setLineWidth(0.2); // reset
  }

  /* ─── P & D SECTION ─── */
  if(incPD) {
    addPage('JADUAL PENYEMBURAN RACUN KULAT DAN SERANGGA','P&D RACUN');
    const cfg = s.pdConfig;
    const W = ['W1','W2','W3','W4'];
    const colW = Math.min(32, (PW - PAGE_MARGIN*2 - plotColW) / 8);
    const tableW = plotColW + colW*8;
    const startX = centeredX(tableW);
    let y = 34;

    // Row 1: PLOT header spanning 4 sub-rows + MINGGU titles
    cell(startX, y, plotColW, rowH*4, 'PLOT', {...PALETTE.headerDark, style:'bold', size:8});
    W.forEach((w, wi) => {
      const x = startX + plotColW + wi*colW*2;
      cell(x, y, colW*2, rowH, `MINGGU ${w[1]}`, {...PALETTE.headerDark, style:'bold', size:8});
    });
    y += rowH;

    // Row 2: P / D headers
    W.forEach((w, wi) => {
      const x = startX + plotColW + wi*colW*2;
      cell(x, y, colW, rowH, 'P — SERANGGA', {...PALETTE.headerP, style:'bold', size:7});
      cell(x + colW, y, colW, rowH, 'D — KULAT', {...PALETTE.headerD, style:'bold', size:7});
    });
    y += rowH;

    // Row 3: chemical + dose
    W.forEach((w, wi) => {
      const c = cfg[w];
      const x = startX + plotColW + wi*colW*2;
      const pText = c.P === '—' ? '—' : `${c.P} ${c.P_dose}${c.P_unit}`;
      const dText = c.D === '—' ? '—' : `${c.D} ${c.D_dose}${c.D_unit}`;
      cell(x, y, colW, rowH, pText, {...PALETTE.chemP, size:7});
      cell(x + colW, y, colW, rowH, dText, {...PALETTE.chemD, size:7});
    });
    y += rowH;

    // Row 4: sticker per column
    W.forEach((w, wi) => {
      const c = cfg[w];
      const x = startX + plotColW + wi*colW*2;
      const pStk = (c.P_sticker && c.P_sticker !== '—') ? `${c.P_sticker} ${c.P_sticker_dose}${c.P_sticker_unit}` : '—';
      const dStk = (c.D_sticker && c.D_sticker !== '—') ? `${c.D_sticker} ${c.D_sticker_dose}${c.D_sticker_unit}` : '—';
      cell(x, y, colW, rowH, pStk, {...PALETTE.sticker, size:6.5});
      cell(x + colW, y, colW, rowH, dStk, {...PALETTE.sticker, size:6.5});
    });
    y += rowH;

    // Plot rows — empty cell if not ticked
    plots.forEach((plot, ri) => {
      const bg = ri % 2 === 0 ? PALETTE.altRow : PALETTE.plain;
      cell(startX, y, plotColW, rowH, plot, {...bg, style:'bold', size:8});
      W.forEach((w, wi) => {
        const pv = s.pd[w]?.[plot]?.P || false;
        const dv = s.pd[w]?.[plot]?.D || false;
        const x = startX + plotColW + wi*colW*2;
        cell(x, y, colW, rowH, '', bg);
        if (pv) drawCheck(x, y, colW, rowH);
        cell(x + colW, y, colW, rowH, '', bg);
        if (dv) drawCheck(x + colW, y, colW, rowH);
      });
      y += rowH;
    });

    // Jumlah Plot
    cell(startX, y, plotColW, rowH, 'Jumlah Plot', {...PALETTE.summaryDark, style:'bold', size:8});
    W.forEach((w, wi) => {
      const x = startX + plotColW + wi*colW*2;
      cell(x, y, colW, rowH, String(plots.filter(p=>s.pd[w]?.[p]?.P).length), {...PALETTE.summary, style:'bold', size:8});
      cell(x+colW, y, colW, rowH, String(plots.filter(p=>s.pd[w]?.[p]?.D).length), {...PALETTE.summary, style:'bold', size:8});
    });
    y += rowH;

    // Jumlah Bibit
    cell(startX, y, plotColW, rowH, 'Jumlah Bibit', {...PALETTE.summaryDark, style:'bold', size:8});
    W.forEach((w, wi) => {
      const x = startX + plotColW + wi*colW*2;
      const pSeed = sumSeedlings(pN, plots, p => s.pd[w]?.[p]?.P);
      const dSeed = sumSeedlings(pN, plots, p => s.pd[w]?.[p]?.D);
      cell(x, y, colW, rowH, pSeed ? pSeed.toLocaleString() : '—', {...PALETTE.summary, size:8});
      cell(x+colW, y, colW, rowH, dSeed ? dSeed.toLocaleString() : '—', {...PALETTE.summary, size:8});
    });
    y += rowH;

    // Maksimal Racun Guna — 1 decimal
    cell(startX, y, plotColW, rowH, 'Max Racun Guna', {...PALETTE.summaryDark, style:'bold', size:7.5});
    W.forEach((w, wi) => {
      const c = cfg[w];
      const x = startX + plotColW + wi*colW*2;
      const pSeed = sumSeedlings(pN, plots, p => s.pd[w]?.[p]?.P);
      const dSeed = sumSeedlings(pN, plots, p => s.pd[w]?.[p]?.D);
      cell(x, y, colW, rowH, calcMaxChem(pSeed, c.P, c.P_dose, c.P_unit, 1), {...PALETTE.summary, style:'bold', size:8});
      cell(x+colW, y, colW, rowH, calcMaxChem(dSeed, c.D, c.D_dose, c.D_unit, 1), {...PALETTE.summary, style:'bold', size:8});
    });
    y += rowH;

    // Maksimal Bond Guna — 1 decimal
    cell(startX, y, plotColW, rowH, 'Max Bond Guna', {...PALETTE.summaryDark, style:'bold', size:7.5});
    W.forEach((w, wi) => {
      const c = cfg[w];
      const x = startX + plotColW + wi*colW*2;
      const pSeed = sumSeedlings(pN, plots, p => s.pd[w]?.[p]?.P);
      const dSeed = sumSeedlings(pN, plots, p => s.pd[w]?.[p]?.D);
      const pBond = (!pSeed || c.P === '—' || c.P_sticker === '—') ? '—' : calcMaxChem(pSeed, c.P_sticker, c.P_sticker_dose, c.P_sticker_unit, 1);
      const dBond = (!dSeed || c.D === '—' || c.D_sticker === '—') ? '—' : calcMaxChem(dSeed, c.D_sticker, c.D_sticker_dose, c.D_sticker_unit, 1);
      cell(x, y, colW, rowH, pBond, {...PALETTE.summary, style:'bold', size:8});
      cell(x+colW, y, colW, rowH, dBond, {...PALETTE.summary, style:'bold', size:8});
    });
  }

  /* ─── MANURING SECTION ─── */
  if(incManuring) {
    addPage('JADUAL MANURING','MANURING');
    const cfg = s.manuringConfig;
    const totalCols = cfg.reduce((sum, r) => sum + r.length, 0);
    const colW = Math.min(55, (PW - PAGE_MARGIN*2 - plotColW) / totalCols);
    const tableW = plotColW + colW*totalCols;
    const startX = centeredX(tableW);
    let y = 34;

    // Row 1: PLOT (rowspan=4) + Round headers
    cell(startX, y, plotColW, rowH*4, 'PLOT', {...PALETTE.headerDark, style:'bold', size:8});
    let xCursor = startX + plotColW;
    cfg.forEach((round, ri) => {
      const w = colW * round.length;
      cell(xCursor, y, w, rowH, `Round ${ri+1}`, {...PALETTE.headerDark, style:'bold', size:8});
      xCursor += w;
    });
    y += rowH;

    // Row 2: fertilizer name per column
    xCursor = startX + plotColW;
    cfg.forEach(round => {
      round.forEach(c => {
        cell(xCursor, y, colW, rowH, c.name, {...PALETTE.fert, style:'bold', size:7});
        xCursor += colW;
      });
    });
    y += rowH;

    // Row 3: dose per column
    xCursor = startX + plotColW;
    cfg.forEach(round => {
      round.forEach(c => {
        cell(xCursor, y, colW, rowH, `${c.dose}${c.unit}`, {...PALETTE.fert, size:7});
        xCursor += colW;
      });
    });
    y += rowH;

    // Plot rows
    plots.forEach((plot, ri_row) => {
      const bg = ri_row % 2 === 0 ? PALETTE.altRow : PALETTE.plain;
      cell(startX, y, plotColW, rowH, plot, {...bg, style:'bold', size:8});
      xCursor = startX + plotColW;
      cfg.forEach((round, ri) => {
        round.forEach((_, ci) => {
          const v = s.manuring[plot]?.[ri]?.[ci] || false;
          cell(xCursor, y, colW, rowH, '', bg);
          if (v) drawCheck(xCursor, y, colW, rowH);
          xCursor += colW;
        });
      });
      y += rowH;
    });

    // Summary rows
    cell(startX, y, plotColW, rowH, 'Jumlah Plot', {...PALETTE.summaryDark, style:'bold', size:8});
    xCursor = startX + plotColW;
    cfg.forEach((round, ri) => {
      round.forEach((_, ci) => {
        cell(xCursor, y, colW, rowH, String(plots.filter(p=>s.manuring[p]?.[ri]?.[ci]).length), {...PALETTE.summary, style:'bold', size:8});
        xCursor += colW;
      });
    });
    y += rowH;

    cell(startX, y, plotColW, rowH, 'Jumlah Bibit', {...PALETTE.summaryDark, style:'bold', size:8});
    xCursor = startX + plotColW;
    cfg.forEach((round, ri) => {
      round.forEach((_, ci) => {
        const seed = sumSeedlings(pN, plots, p => s.manuring[p]?.[ri]?.[ci]);
        cell(xCursor, y, colW, rowH, seed ? seed.toLocaleString() : '—', {...PALETTE.summary, size:8});
        xCursor += colW;
      });
    });
    y += rowH;

    cell(startX, y, plotColW, rowH, 'Max Baja Guna', {...PALETTE.summaryDark, style:'bold', size:7.5});
    xCursor = startX + plotColW;
    cfg.forEach((round, ri) => {
      round.forEach((c, ci) => {
        const seed = sumSeedlings(pN, plots, p => s.manuring[p]?.[ri]?.[ci]);
        const u = calcFertUsage(seed, c.name, c.dose, 1);
        cell(xCursor, y, colW, rowH, u.kg, {...PALETTE.summary, style:'bold', size:8});
        xCursor += colW;
      });
    });
    y += rowH;

    cell(startX, y, plotColW, rowH, 'Bags Needed', {...PALETTE.summaryDark, style:'bold', size:7.5});
    xCursor = startX + plotColW;
    cfg.forEach((round, ri) => {
      round.forEach((c, ci) => {
        const seed = sumSeedlings(pN, plots, p => s.manuring[p]?.[ri]?.[ci]);
        const u = calcFertUsage(seed, c.name, c.dose, 1);
        cell(xCursor, y, colW, rowH, u.bags, {...PALETTE.summary, size:7});
        xCursor += colW;
      });
    });
  }

  /* ─── WEEDING SECTION ─── */
  if(incWeeding) {
    addPage('JADUAL WEEDING','WEEDING');
    const rounds = ['R1','R2'];
    const colW = Math.min(80, (PW - PAGE_MARGIN*2 - plotColW) / rounds.length);
    const tableW = plotColW + colW*rounds.length;
    const startX = centeredX(tableW);
    let y = 34;

    cell(startX, y, plotColW, rowH*2, 'PLOT', {...PALETTE.headerDark, style:'bold', size:8});
    rounds.forEach((r, i) => {
      const x = startX + plotColW + i*colW;
      cell(x, y, colW, rowH, `ROUND ${r[1]}`, {...PALETTE.headerDark, style:'bold', size:8});
    });
    y += rowH;
    rounds.forEach((r, i) => {
      const x = startX + plotColW + i*colW;
      cell(x, y, colW, rowH, 'Merumput dalam polibeg', {...PALETTE.chemP, size:7});
    });
    y += rowH;

    plots.forEach((plot, ri) => {
      const bg = ri % 2 === 0 ? PALETTE.altRow : PALETTE.plain;
      cell(startX, y, plotColW, rowH, plot, {...bg, style:'bold', size:8});
      rounds.forEach((r, i) => {
        const x = startX + plotColW + i*colW;
        const v = s.weeding[plot]?.[r] || false;
        cell(x, y, colW, rowH, '', bg);
        if (v) drawCheck(x, y, colW, rowH);
      });
      y += rowH;
    });

    cell(startX, y, plotColW, rowH, 'Jumlah Plot', {...PALETTE.summaryDark, style:'bold', size:8});
    rounds.forEach((r, i) => {
      const x = startX + plotColW + i*colW;
      cell(x, y, colW, rowH, String(plots.filter(p=>s.weeding[p]?.[r]).length), {...PALETTE.summary, style:'bold', size:8});
    });
  }

  /* ─── INTERROW SECTION ─── */
  if(incInterrow) {
    addPage('JADUAL INTERROW SPRAY','INTERROW SPRAY');
    const icfg = s.interrowConfig;
    const rounds = ['R1','R2'];
    const colW = Math.min(80, (PW - PAGE_MARGIN*2 - plotColW) / rounds.length);
    const tableW = plotColW + colW*rounds.length;
    const startX = centeredX(tableW);
    let y = 34;

    cell(startX, y, plotColW, rowH*3, 'PLOT', {...PALETTE.headerDark, style:'bold', size:8});
    rounds.forEach((r, i) => {
      const x = startX + plotColW + i*colW;
      cell(x, y, colW, rowH, `ROUND ${r[1]}`, {...PALETTE.headerDark, style:'bold', size:8});
    });
    y += rowH;
    rounds.forEach((r, i) => {
      const c = icfg[r];
      const x = startX + plotColW + i*colW;
      cell(x, y, colW, rowH, `${c.chem} ${c.chem_dose}${c.chem_unit}`, {...PALETTE.chemP, style:'bold', size:7});
    });
    y += rowH;
    rounds.forEach((r, i) => {
      const c = icfg[r];
      const x = startX + plotColW + i*colW;
      cell(x, y, colW, rowH, `Activator ${c.activator_dose}${c.activator_unit}`, {...PALETTE.sticker, size:7});
    });
    y += rowH;

    plots.forEach((plot, ri) => {
      const bg = ri % 2 === 0 ? PALETTE.altRow : PALETTE.plain;
      cell(startX, y, plotColW, rowH, plot, {...bg, style:'bold', size:8});
      rounds.forEach((r, i) => {
        const x = startX + plotColW + i*colW;
        const v = s.interrow[plot]?.[r] || false;
        cell(x, y, colW, rowH, '', bg);
        if (v) drawCheck(x, y, colW, rowH);
      });
      y += rowH;
    });

    cell(startX, y, plotColW, rowH, 'Jumlah Plot', {...PALETTE.summaryDark, style:'bold', size:8});
    rounds.forEach((r, i) => {
      const x = startX + plotColW + i*colW;
      cell(x, y, colW, rowH, String(plots.filter(p=>s.interrow[p]?.[r]).length), {...PALETTE.summary, style:'bold', size:8});
    });
  }

  doc.save(`MJM_Maintenance_${pN}_${pM.replace(' ','_')}.pdf`);
  closePdfModal();
}

/* ════════════════════════════
   ANALYTICS
════════════════════════════ */
let staffInst = null;
let plotInst  = null;

function renderCharts() {
  const chartN = getNursery();
  const nurseryPlots = NURSERY_PLOTS[chartN];

  // Update label
  const lbl = document.getElementById('chart-nursery-label');
  if (lbl) lbl.textContent = NURSERY_LABELS[chartN];

  const recs = records.filter(r => nurseryPlots.includes(r.plot));

  const total    = recs.length;
  const gDone    = recs.filter(r => r.gaia).length;
  const gPend    = total - gDone;
  const bothDone = recs.filter(r => r.gaia).length; // same as gDone now
  const pct      = total ? Math.round(gDone/total*100) : 0;

  // ── Metric cards — single horizontal row ──
  document.getElementById('chart-metrics').innerHTML = `
    <div class="metric-card mc-blue" ><div class="mc-label">Total Tasks</div><div class="mc-value b">${total}</div></div>
    <div class="metric-card mc-green"><div class="mc-label">Gaia Done</div><div class="mc-value g">${gDone}</div></div>
    <div class="metric-card mc-amber"><div class="mc-label">Gaia Pending</div><div class="mc-value a">${gPend}</div></div>
    <div class="metric-card mc-amber"><div class="mc-label">Done %</div><div class="mc-value a">${pct}%</div></div>
  `;

  // ── Chart 1: Monthly task completion ──
  const monthlyDone    = Array(12).fill(0);
  const monthlyPending = Array(12).fill(0);
  const curMi = MONTHS_SHORT.indexOf(getMonth().split(' ')[0]);
  recs.forEach(r => {
    if (r.tarikh && r.tarikh !== '-') {
      const parts = r.tarikh.split('-');
      if (parts.length === 3) {
        const mi = parseInt(parts[1]) - 1;
        if (mi >= 0 && mi < 12) {
          if (r.gaia) monthlyDone[mi]++;
          else monthlyPending[mi]++;
        }
      }
    } else {
      if (curMi >= 0) monthlyPending[curMi]++;
    }
  });

  if (barInst) barInst.destroy();
  barInst = new Chart(document.getElementById('mainChart'), {
    type: 'bar',
    data: { labels: MONTHS_SHORT, datasets: [
      { label:'Done',    data:monthlyDone,    backgroundColor:'rgba(13,122,71,0.82)', borderRadius:4, stack:'s' },
      { label:'Pending', data:monthlyPending, backgroundColor:'rgba(217,119,6,0.65)', borderRadius:4, stack:'s' },
    ]},
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ stacked:true, ticks:{font:{size:13},color:'#4d7060'}, grid:{color:'rgba(0,80,40,0.06)'} },
        y:{ stacked:true, ticks:{font:{size:13},color:'#4d7060',stepSize:1}, grid:{color:'rgba(0,80,40,0.06)'} }
      }
    }
  });

  // ── Chart 2: By Jenis Kerja — horizontal bar, full names, value labels ──
  const jL = ['Penyemburan racun kulat dan serangga','Meracun rumput secara selingan','Merumput','Membaja'];
  const jFullNames = ['P&D Racun\n(Penyemburan)', 'Interrow Spray\n(Racun Rumput)', 'Weeding\n(Merumput)', 'Manuring\n(Membaja)'];
  const jCounts = jL.map(j => recs.filter(r => r.jenis===j).length);
  const jColors = ['rgba(192,57,43,0.85)','rgba(245,158,11,0.85)','rgba(13,122,71,0.85)','rgba(29,78,216,0.85)'];

  const valueLabelPlugin = {
    id: 'valueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        const val = jCounts[i];
        if (!val) return;
        ctx.fillStyle = '#1e3a2a';
        ctx.font = 'bold 15px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(val, bar.x + 8, bar.y);
      });
      ctx.restore();
    }
  };

  if (jenisInst) jenisInst.destroy();
  jenisInst = new Chart(document.getElementById('jenisChart'), {
    type: 'bar',
    plugins: [valueLabelPlugin],
    data: {
      labels: ['P&D Racun', 'Interrow Spray', 'Weeding', 'Manuring'],
      datasets: [{
        label: 'Records',
        borderRadius: 6,
        data: jCounts,
        backgroundColor: jColors,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { font:{ size:13 }, color:'#4d7060' },
          grid: { color:'rgba(0,80,40,0.06)' },
          suggestedMax: Math.max(...jCounts, 1) * 1.25
        },
        y: {
          ticks: { font:{ size:14, weight:'600' }, color:'#1e3a2a', crossAlign:'far' },
          grid: { display: false }
        }
      },
      layout: { padding: { right: 40 } }
    }
  });

  // ── Chart 3: Gaia completion doughnut ──
  if (staffInst) staffInst.destroy();
  staffInst = new Chart(document.getElementById('staffChart'), {
    type:'doughnut',
    data:{ labels:['Gaia Done','Gaia Pending'],
      datasets:[{
        data:[gDone, gPend],
        backgroundColor:['rgba(13,122,71,0.85)','rgba(220,245,234,0.9)'],
        borderWidth:3, borderColor:'#fff',
      }]
    },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'60%',
      plugins:{ legend:{ position:'bottom', labels:{font:{size:14},color:'#4d7060',boxWidth:14,padding:20} } }
    }
  });

  // ── Chart 4: Completion by Plot (Gaia only) ──
  const activePlots = nurseryPlots.filter(p => recs.some(r => r.plot===p));
  const plotGaia    = activePlots.map(p => recs.filter(r => r.plot===p && r.gaia).length);
  const plotPending = activePlots.map(p => recs.filter(r => r.plot===p && !r.gaia).length);

  if (plotInst) plotInst.destroy();
  plotInst = new Chart(document.getElementById('plotChart'), {
    type:'bar',
    data:{ labels:activePlots, datasets:[
      { label:'Gaia ✓',  data:plotGaia,    backgroundColor:'rgba(13,122,71,0.82)', borderRadius:3, stack:'s' },
      { label:'Pending', data:plotPending, backgroundColor:'rgba(229,231,235,0.9)', borderRadius:3, stack:'s' },
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'top', labels:{font:{size:13},color:'#4d7060',boxWidth:14,padding:18} } },
      scales:{
        x:{ stacked:true, ticks:{font:{size:12},color:'#4d7060',maxRotation:0,minRotation:0}, grid:{display:false} },
        y:{ stacked:true, ticks:{font:{size:13},color:'#4d7060',stepSize:1}, grid:{color:'rgba(0,80,40,0.06)'} }
      }
    }
  });
}

/* ════════════════════════════
   INIT
════════════════════════════ */
document.getElementById('rec-modal').addEventListener('click', e=>{ if(e.target===e.currentTarget) closeRecModal(); });
document.getElementById('pdf-modal').addEventListener('click', e=>{ if(e.target===e.currentTarget) closePdfModal(); });