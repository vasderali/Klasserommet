import { store } from '../store.js';
import { h, toast, emptyState, rerenderView as rr } from '../ui.js';
import { makeGroups } from '../engine.js';

// Stabile pastellfarger per gruppe, så gruppen beholder fargen sin når den
// flytter seg mellom stasjonene.
const FARGER = ['#cfe3f7', '#f7d8d2', '#d5eed4', '#f5e9c6', '#e7d9f5', '#ffddba', '#f9d2e6', '#d7f0ea'];

const cfg = { stations: 4, minutes: 10 };
let session = null; // { cid, groups, offset, round, remaining, endAt, running }
let full = false;
let ticking = false;
let audioCtx = null;

function ensureAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* lyd er ikke kritisk */ }
}

function beep(n) {
  if (!audioCtx) return;
  try {
    let t = audioCtx.currentTime;
    for (let i = 0; i < n; i++) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.frequency.value = 700;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.start(t);
      o.stop(t + 0.35);
      t += 0.4;
    }
  } catch { /* lyd er ikke kritisk */ }
}

function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function tick() {
  if (!session || !session.running) return;
  const left = session.endAt - Date.now();
  if (left <= 0) { rotate(); return; }
  session.remaining = left;
  const el = document.getElementById('stasjonTimer');
  if (el) {
    el.textContent = fmt(session.remaining);
    el.classList.toggle('urgent', session.remaining < 30000);
  }
}

function rotate() {
  const n = session.groups.length;
  session.offset = (session.offset + 1) % n;
  session.round++;
  session.remaining = cfg.minutes * 60000;
  if (session.running) session.endAt = Date.now() + session.remaining;
  beep(session.round >= n ? 3 : 2);
  rr();
}

function toggleRun() {
  ensureAudio(); // må skje i et brukertrykk for at lyd skal virke på iPad
  if (session.running) {
    session.remaining = Math.max(0, session.endAt - Date.now());
    session.running = false;
  } else {
    session.endAt = Date.now() + session.remaining;
    session.running = true;
  }
  rr();
}

function startSession(cls) {
  if (cls.students.length < cfg.stations) {
    toast(`Du trenger minst ${cfg.stations} elever for ${cfg.stations} stasjoner.`);
    return;
  }
  ensureAudio();
  const res = makeGroups(cls.students, { mode: 'count', value: cfg.stations },
    cls.apart || [], store.groupHistory(cls.id));
  store.addGroupSet(cls.id, res.groups);
  session = {
    cid: cls.id,
    groups: res.groups,
    offset: 0,
    round: 1,
    remaining: cfg.minutes * 60000,
    endAt: 0,
    running: false,
  };
  rr();
}

function stepper(label, get, bump, ariaMinus, ariaPlus) {
  return h('div', { class: 'stepper' },
    h('span', { class: 'muted small' }, label),
    h('button', { class: 'btn', 'aria-label': ariaMinus, onclick: () => bump(-1) }, '−'),
    h('span', { class: 'stepper-val' }, String(get())),
    h('button', { class: 'btn', 'aria-label': ariaPlus, onclick: () => bump(1) }, '+'));
}

export function render(root) {
  if (!ticking) { setInterval(tick, 250); ticking = true; }
  const cls = store.currentClass();
  if (!cls) { root.append(emptyState('Lag en klasse først, så kan du kjøre stasjonsundervisning.', '🔁')); return; }
  if (session && session.cid !== cls.id) { session = null; full = false; }

  const view = h('section', { class: 'view stasjon-view' + (full ? ' full' : '') });

  if (!session) {
    view.append(
      h('div', { class: 'view-head' }, h('h2', {}, 'Stasjoner')),
      h('div', { class: 'panel form-col' },
        h('div', { class: 'row wrap' },
          stepper('Stasjoner', () => cfg.stations,
            d => { cfg.stations = Math.min(8, Math.max(2, cfg.stations + d)); rr(); },
            'Færre stasjoner', 'Flere stasjoner'),
          stepper('Min per stasjon', () => cfg.minutes,
            d => { cfg.minutes = Math.min(60, Math.max(1, cfg.minutes + d)); rr(); },
            'Kortere tid', 'Lengre tid')),
        h('p', { class: 'muted' },
          'Klassen deles i like mange grupper som stasjoner – trekningen følger «ikke sammen»-reglene og unngår de samme parene som i tidligere runder. Tavla viser hvem som er hvor, og gruppene roterer automatisk når tiden er ute.'),
        h('button', { class: 'btn primary big', onclick: () => startSession(cls) }, '🎲 Lag grupper og start')));
    root.append(view);
    return;
  }

  const n = session.groups.length;
  const nameOf = id => cls.students.find(s => s.id === id)?.name;
  const fullRunde = session.round > n;

  if (full) {
    view.append(h('button', { class: 'btn stasjon-exit', onclick: () => { full = false; rr(); } }, '✕ Lukk'));
  }
  view.append(
    h('div', { class: 'stasjon-head' },
      h('div', {},
        h('div', {
          class: 'timer-digits stasjon-timer' + (session.running && session.remaining < 30000 ? ' urgent' : ''),
          id: 'stasjonTimer',
        }, fmt(session.remaining)),
        h('div', { class: 'muted' },
          fullRunde ? 'Alle gruppene har vært på alle stasjonene 🎉' : `Runde ${session.round} av ${n}`)),
      h('div', { class: 'row wrap no-print' },
        h('button', { class: 'btn primary big', onclick: toggleRun }, session.running ? 'Pause' : 'Start'),
        h('button', { class: 'btn', onclick: rotate }, '⏭ Roter nå'),
        !full && h('button', { class: 'btn', onclick: () => { full = true; rr(); } }, '🖥 Tavlemodus'),
        h('button', { class: 'btn danger', onclick: () => {
          if (confirm('Avslutte stasjonsøkta?')) { session = null; full = false; rr(); }
        } }, 'Avslutt'))),
    h('div', { class: 'stasjon-grid' },
      Array.from({ length: n }, (_, i) => {
        const g = (i - (session.offset % n) + n) % n;
        return h('div', { class: 'panel stasjon-card', style: `background:${FARGER[g % FARGER.length]}` },
          h('div', { class: 'stasjon-tittel' }, `Stasjon ${i + 1}`),
          h('div', { class: 'stasjon-gruppe' }, `Gruppe ${g + 1}`),
          h('ul', {}, session.groups[g].map(id => nameOf(id) && h('li', {}, nameOf(id)))));
      })),
    h('p', { class: 'tip muted no-print' },
      'Gruppene roterer automatisk når nedtellingen når null – eller når du trykker «Roter nå». Gruppen beholder fargen sin hele økta.'));
  root.append(view);
}
