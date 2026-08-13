const KEY = 'klasserommet:v1';

function uid() { return Math.random().toString(36).slice(2, 10); }

function blank() {
  return { classes: [], charts: {}, chartHistory: {}, groupHistory: {}, picker: {}, timetables: {}, currentClassId: null };
}

let state = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s && Array.isArray(s.classes) ? Object.assign(blank(), s) : blank();
  } catch { return blank(); }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* full disk o.l. */ }
}

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); }
function emit() { save(); listeners.forEach(f => f()); }

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

  exportJson() { return JSON.stringify(state, null, 2); },
  importJson(text) {
    const s = JSON.parse(text);
    if (!s || !Array.isArray(s.classes)) throw new Error('Ugyldig fil');
    state = Object.assign(blank(), s);
    emit();
  },
  wipe() { state = blank(); emit(); },
};
