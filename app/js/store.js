import { toast } from './ui.js';

const KEY = 'klasserommet:v1';

function uid() { return Math.random().toString(36).slice(2, 10); }

function blank() {
  return {
    classes: [], charts: {}, chartHistory: {}, groupHistory: {}, picker: {},
    timetables: {}, activities: [], currentClassId: null,
    meta: { lastExportAt: 0, changes: 0 },
  };
}

let state = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s && Array.isArray(s.classes) ? Object.assign(blank(), s) : blank();
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
    const chart = state.charts[cid];
    if (chart) chart.desks.forEach(d => { if (d.sid === sid) d.sid = null; });
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

  chart(cid) { return state.charts[cid] || null; },
  setChart(cid, chart) { state.charts[cid] = chart; emit(); },

  history(cid) { return state.chartHistory[cid] || []; },
  saveSnapshot(cid, desks) {
    const h = state.chartHistory[cid] || (state.chartHistory[cid] = []);
    h.unshift({ id: uid(), at: Date.now(), desks: JSON.parse(JSON.stringify(desks)) });
    if (h.length > 25) h.length = 25;
    emit();
  },
  deleteSnapshot(cid, id) {
    const h = state.chartHistory[cid]; if (!h) return;
    state.chartHistory[cid] = h.filter(s => s.id !== id);
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
    state = Object.assign(blank(), rest);
    emit();
  },
  wipe() { state = blank(); emit(); },
};
