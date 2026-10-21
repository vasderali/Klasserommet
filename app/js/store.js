import { toast } from './ui.js';

const KEY = 'klasserommet:v1';

function uid() { return Math.random().toString(36).slice(2, 10); }

function blank() {
  return {
    classes: [], charts: {}, chartHistory: {}, groupHistory: {}, picker: {},
    timetables: {}, activities: [], partnerRounds: {}, jobs: {}, order: {},
    currentClassId: null,
    meta: { lastExportAt: 0, changes: 0 },
  };
}

let state = load();

// v1 → v2: fra ett kart per klasse til flere navngitte kart, med historikk
// per kart. Kjøres på både innlasting og import av gamle sikkerhetskopier.
function migrate(s) {
  Object.keys(s.charts || {}).forEach(cid => {
    const c = s.charts[cid];
    if (c && Array.isArray(c.desks)) {
      const id = uid();
      s.charts[cid] = { list: [{ id, name: 'Klasserommet', desks: c.desks }], activeId: id };
      const oldHist = s.chartHistory?.[cid];
      s.chartHistory[cid] = Array.isArray(oldHist) ? { [id]: oldHist } : (oldHist || {});
    }
  });
  Object.keys(s.chartHistory || {}).forEach(cid => {
    if (Array.isArray(s.chartHistory[cid])) {
      const id = uid();
      s.charts[cid] = s.charts[cid] || { list: [{ id, name: 'Klasserommet', desks: [] }], activeId: id };
      s.chartHistory[cid] = { [s.charts[cid].activeId]: s.chartHistory[cid] };
    }
  });
  return s;
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s && Array.isArray(s.classes) ? migrate(Object.assign(blank(), s)) : blank();
  } catch { return blank(); }
}

// Lagringsfeil (full/blokkert lagring) skal aldri være stille – læreren må
// få vite at endringene ikke ble lagret.
let lastSaveErrorAt = 0;
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    if (Date.now() - lastSaveErrorAt > 30000) {
      lastSaveErrorAt = Date.now();
      toast('⚠️ Kunne ikke lagre! Lagringen er full eller blokkert – ta en sikkerhetskopi nå.');
    }
  }
}

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); }
function emit() {
  state.meta = state.meta || { lastExportAt: 0, changes: 0 };
  state.meta.changes = (state.meta.changes || 0) + 1;
  save();
  listeners.forEach(f => f());
}

// Har appen flere åpne faner, henter de andre inn endringene i stedet for å
// overskrive dem med gammel tilstand.
window.addEventListener('storage', e => {
  if (e.key !== KEY) return;
  state = load();
  listeners.forEach(f => f());
  window.dispatchEvent(new Event('lh:rerender'));
});

export const store = {
  uid,

  classes() { return state.classes; },
  getClass(id) { return state.classes.find(c => c.id === id) || null; },
  currentClass() { return this.getClass(state.currentClassId) || state.classes[0] || null; },
  setCurrentClass(id) { state.currentClassId = id; emit(); },

  addClass(name, names) {
    const c = { id: uid(), name, students: names.map(n => ({ id: uid(), name: n })), apart: [] };
    state.classes.push(c);
    state.currentClassId = c.id;
    emit();
    return c;
  },
  renameClass(id, name) { const c = this.getClass(id); if (c) { c.name = name; emit(); } },
  deleteClass(id) {
    state.classes = state.classes.filter(c => c.id !== id);
    delete state.charts[id];
    delete state.chartHistory[id];
    delete state.groupHistory[id];
    delete state.picker[id];
    delete state.timetables[id];
    delete state.partnerRounds[id];
    delete state.jobs[id];
    delete state.order[id];
    if (state.currentClassId === id) state.currentClassId = state.classes[0]?.id ?? null;
    emit();
  },
  addStudents(cid, names) {
    const c = this.getClass(cid); if (!c) return;
    names.forEach(n => c.students.push({ id: uid(), name: n }));
    emit();
  },
  removeStudent(cid, sid) {
    const c = this.getClass(cid); if (!c) return;
    c.students = c.students.filter(s => s.id !== sid);
    c.apart = (c.apart || []).filter(([a, b]) => a !== sid && b !== sid);
    c.together = (c.together || []).filter(([a, b]) => a !== sid && b !== sid);
    c.front = (c.front || []).filter(x => x !== sid);
    (state.charts[cid]?.list || []).forEach(k => k.desks.forEach(d => { if (d.sid === sid) d.sid = null; }));
    const p = state.picker[cid];
    if (p) {
      p.drawn = p.drawn.filter(x => x !== sid);
      p.absent = p.absent.filter(x => x !== sid);
    }
    emit();
  },
  addRule(cid, a, b) { const c = this.getClass(cid); if (!c) return; (c.apart = c.apart || []).push([a, b]); emit(); },
  removeRule(cid, i) { const c = this.getClass(cid); if (!c) return; c.apart.splice(i, 1); emit(); },
  addTogether(cid, a, b) { const c = this.getClass(cid); if (!c) return; (c.together = c.together || []).push([a, b]); emit(); },
  removeTogether(cid, i) { const c = this.getClass(cid); if (!c) return; c.together.splice(i, 1); emit(); },
  addFront(cid, sid) { const c = this.getClass(cid); if (!c) return; (c.front = c.front || []).push(sid); emit(); },
  removeFront(cid, i) { const c = this.getClass(cid); if (!c) return; c.front.splice(i, 1); emit(); },

  // Flere navngitte kart per klasse; «chart» uten id = det aktive kartet.
  charts(cid) {
    const c = state.charts[cid];
    return c && Array.isArray(c.list) ? c.list : [];
  },
  chart(cid) {
    const c = state.charts[cid];
    if (!c || !c.list?.length) return null;
    return c.list.find(x => x.id === c.activeId) || c.list[0];
  },
  ensureChart(cid) {
    let c = state.charts[cid];
    if (!c || !Array.isArray(c.list)) c = state.charts[cid] = { list: [], activeId: null };
    let active = c.list.find(x => x.id === c.activeId) || c.list[0];
    if (!active) {
      active = { id: uid(), name: 'Klasserommet', desks: [] };
      c.list.push(active);
      c.activeId = active.id;
    }
    return active;
  },
  setChart(cid, chartLike) {
    const c = this.ensureChart(cid);
    if (chartLike?.desks && chartLike.desks !== c.desks) c.desks = chartLike.desks;
    emit();
  },
  addChart(cid, name) {
    let c = state.charts[cid];
    if (!c || !Array.isArray(c.list)) c = state.charts[cid] = { list: [], activeId: null };
    const nc = { id: uid(), name, desks: [] };
    c.list.push(nc);
    c.activeId = nc.id;
    emit();
    return nc;
  },
  renameChart(cid, chartId, name) {
    const k = this.charts(cid).find(x => x.id === chartId);
    if (k) { k.name = name; emit(); }
  },
  deleteChart(cid, chartId) {
    const c = state.charts[cid]; if (!c) return;
    c.list = c.list.filter(x => x.id !== chartId);
    if (state.chartHistory[cid]) delete state.chartHistory[cid][chartId];
    if (c.activeId === chartId) c.activeId = c.list[0]?.id ?? null;
    emit();
  },
  setActiveChart(cid, chartId) {
    const c = state.charts[cid];
    if (c) { c.activeId = chartId; emit(); }
  },

  history(cid) {
    const active = this.chart(cid);
    if (!active) return [];
    return state.chartHistory[cid]?.[active.id] || [];
  },
  saveSnapshot(cid, desks) {
    const active = this.ensureChart(cid);
    const hc = state.chartHistory[cid] || (state.chartHistory[cid] = {});
    const h = hc[active.id] || (hc[active.id] = []);
    h.unshift({ id: uid(), at: Date.now(), desks: JSON.parse(JSON.stringify(desks)) });
    if (h.length > 25) h.length = 25;
    emit();
  },
  deleteSnapshot(cid, id) {
    const active = this.chart(cid);
    const h = state.chartHistory[cid]?.[active?.id];
    if (!h) return;
    state.chartHistory[cid][active.id] = h.filter(s => s.id !== id);
    emit();
  },

  groupHistory(cid) { return state.groupHistory[cid] || []; },
  addGroupSet(cid, groups) {
    const h = state.groupHistory[cid] || (state.groupHistory[cid] = []);
    h.unshift({ id: uid(), at: Date.now(), groups: JSON.parse(JSON.stringify(groups)) });
    if (h.length > 15) h.length = 15;
    emit();
  },

  picker(cid) { return state.picker[cid] || (state.picker[cid] = { drawn: [], absent: [] }); },
  savePicker() { emit(); },

  timetable(cid) { return state.timetables[cid] || null; },
  setTimetable(cid, tt) { state.timetables[cid] = tt; emit(); },

  // Læringspartnere: runde 0 er den gjeldende, resten er historikk som
  // trekningen bruker for å unngå gjentak.
  partnerRounds(cid) { return state.partnerRounds[cid] || (state.partnerRounds[cid] = []); },
  addPartnerRound(cid, groups) {
    const h = this.partnerRounds(cid);
    h.unshift({ id: uid(), at: Date.now(), groups: JSON.parse(JSON.stringify(groups)) });
    if (h.length > 30) h.length = 30;
    emit();
  },

  // Klasseromsjobber: liste over jobber + runder med tildelinger.
  jobs(cid) {
    return state.jobs[cid] || (state.jobs[cid] = { list: [], rounds: [] });
  },
  saveJobs(cid) {
    const j = this.jobs(cid);
    if (j.rounds.length > 40) j.rounds.length = 40;
    emit();
  },

  // Fremføringsrekkefølge (vedvarer – fremføringer går gjerne over flere dager).
  order(cid) { return state.order[cid] || (state.order[cid] = { at: 0, order: [], done: [] }); },
  saveOrder() { emit(); },

  // Aktivitetsbanken er personlig, ikke knyttet til klasse.
  activities() { return state.activities || (state.activities = []); },
  addActivity(a) { this.activities().unshift({ id: uid(), ...a }); emit(); },
  updateActivity(id, patch) {
    const a = this.activities().find(x => x.id === id);
    if (a) { Object.assign(a, patch); emit(); }
  },
  deleteActivity(id) { state.activities = this.activities().filter(a => a.id !== id); emit(); },

  meta() { return state.meta || { lastExportAt: 0, changes: 0 }; },
  markExported() {
    state.meta = { lastExportAt: Date.now(), changes: 0 };
    save();
  },

  exportJson() { return JSON.stringify({ version: 1, ...state }, null, 2); },
  importJson(text) {
    const s = JSON.parse(text);
    if (!s || !Array.isArray(s.classes)) throw new Error('Ugyldig fil');
    const { version, ...rest } = s;
    state = migrate(Object.assign(blank(), rest));
    emit();
  },
  wipe() { state = blank(); emit(); },
};
