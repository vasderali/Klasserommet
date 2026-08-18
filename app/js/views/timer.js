import { h, rerenderView as rr } from '../ui.js';

const DEFAULT = 5 * 60 * 1000;
let remaining = DEFAULT;
let lastSet = DEFAULT;
let running = false;
let endAt = 0;
let done = false;
let full = false;
let audioCtx = null;
let ticking = false;

// Skjermen skal ikke slukke midt i en nedtelling på projektoren. Hentes på
// nytt fra tick() hvis den slippes (f.eks. etter fanebytte).
let wakeLock = null;
let wakeAttemptAt = 0;
function syncWakeLock() {
  const want = running || full;
  if (want && !wakeLock && 'wakeLock' in navigator &&
      document.visibilityState === 'visible' && Date.now() - wakeAttemptAt > 3000) {
    wakeAttemptAt = Date.now();
    navigator.wakeLock.request('screen').then(l => {
      wakeLock = l;
      l.addEventListener('release', () => { wakeLock = null; });
    }).catch(() => { /* ikke kritisk */ });
  } else if (!want && wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}
document.addEventListener('visibilitychange', syncWakeLock);

export function render(root) {
  if (!ticking) { setInterval(tick, 200); ticking = true; }
  root.append(h('section', { class: 'view timer-view' + (full ? ' full' : '') },
    full && h('button', { class: 'btn timer-exit', onclick: () => { full = false; rr(); } }, '✕ Lukk'),
    h('div', {
      class: 'timer-digits' + (running && remaining < 60000 ? ' urgent' : '') + (done ? ' done' : ''),
      id: 'timerDigits',
    }, fmt(remaining)),
    h('div', { class: 'row center timer-presets' },
      [1, 2, 5, 10, 15].map(m => h('button', { class: 'btn', onclick: () => setMin(m) }, `${m} min`)),
      h('button', { class: 'btn', onclick: () => nudge(60000) }, '+1 min'),
      h('button', { class: 'btn', onclick: () => nudge(-60000) }, '−1 min')),
    h('div', { class: 'row center' },
      h('button', { class: 'btn primary big', id: 'timerToggle', onclick: toggle }, running ? 'Pause' : 'Start'),
      h('button', { class: 'btn', onclick: () => { running = false; done = false; remaining = lastSet; rr(); } }, 'Nullstill'),
      !full && h('button', { class: 'btn', onclick: () => { full = true; rr(); } }, '🖥 Tavlemodus'))));
}

function setMin(m) {
  lastSet = m * 60000;
  remaining = lastSet;
  running = false;
  done = false;
  rr();
}

function nudge(d) {
  remaining = Math.max(0, remaining + d);
  if (running) endAt += d;
  else lastSet = remaining;
  done = false;
  rr();
}

function toggle() {
  if (running) {
    remaining = Math.max(0, endAt - Date.now());
    running = false;
  } else {
    if (remaining <= 0) remaining = lastSet;
    endAt = Date.now() + remaining;
    running = true;
    done = false;
    ensureAudio(); // må opprettes i et brukertrykk for at lyd skal virke på iPad
  }
  rr();
}

function ensureAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* lyd er ikke kritisk */ }
}

function tick() {
  syncWakeLock();
  if (running) {
    const left = endAt - Date.now();
    if (left <= 0) {
      running = false;
      remaining = 0;
      done = true;
      beep();
    } else {
      remaining = left;
    }
  }
  const el = document.getElementById('timerDigits');
  if (!el) return;
  el.textContent = fmt(remaining);
  el.classList.toggle('urgent', running && remaining < 60000);
  el.classList.toggle('done', done);
  const btn = document.getElementById('timerToggle');
  if (btn) btn.textContent = running ? 'Pause' : 'Start';
}

function beep() {
  if (!audioCtx) return;
  try {
    let t = audioCtx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.start(t);
      o.stop(t + 0.4);
      t += 0.5;
    }
  } catch { /* lyd er ikke kritisk */ }
}

function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
