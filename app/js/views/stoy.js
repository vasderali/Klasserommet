import { h, toast, rerenderView as rr } from '../ui.js';

let running = false;
let stream = null;
let audioCtx = null;
let analyser = null;
let interval = null;
let level = 0;
let sens = 1.4;

export function render(root) {
  root.append(h('section', { class: 'view stoy-view' },
    h('div', { class: 'view-head' },
      h('h2', {}, 'Støymåler'),
      h('button', { class: 'btn primary big', id: 'stoyToggle', onclick: toggle },
        running ? 'Stopp' : '🎤 Start måling')),
    h('div', { class: 'panel stoy-panel' },
      h('div', { class: 'trafikklys', 'aria-hidden': 'true' },
        h('div', { class: 'lys rod', id: 'lysRod' }),
        h('div', { class: 'lys gul', id: 'lysGul' }),
        h('div', { class: 'lys gronn', id: 'lysGronn' })),
      h('div', { class: 'stoy-status' },
        h('div', { class: 'stoy-tekst', id: 'stoyTekst', role: 'status' }, running ? '…' : 'Trykk start'),
        h('div', { class: 'stoy-meter' }, h('div', { class: 'stoy-meter-fill', id: 'stoyFill' })),
        h('label', { class: 'muted small', for: 'stoySens' }, 'Følsomhet'),
        h('input', { type: 'range', id: 'stoySens', min: '0.5', max: '3', step: '0.1', value: String(sens),
          'aria-label': 'Følsomhet',
          oninput: e => { sens = parseFloat(e.target.value); } }))),
    h('p', { class: 'tip muted' },
      'Lyden analyseres direkte på enheten – ingenting lagres eller sendes noe sted. Grønt = arbeidsro, gult = på grensen, rødt = for høyt.')));
}

async function toggle() {
  if (running) { stop(); rr(); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    toast('Fikk ikke tilgang til mikrofonen – sjekk tillatelsen i nettleseren.');
    return;
  }
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const src = audioCtx.createMediaStreamSource(stream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  src.connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);
  running = true;
  level = 0;
  interval = setInterval(() => {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    level = level * 0.75 + Math.min(1.5, rms * 3.2 * sens) * 0.25;
    paint();
  }, 120);
  rr();
}

function stop() {
  running = false;
  clearInterval(interval);
  interval = null;
  try { stream?.getTracks().forEach(t => t.stop()); } catch { /* alt ok */ }
  try { audioCtx?.close(); } catch { /* alt ok */ }
  stream = null;
  audioCtx = null;
}

function paint() {
  const fill = document.getElementById('stoyFill');
  if (!fill) return; // annet verktøy åpent – mål videre i bakgrunnen
  const pct = Math.min(100, Math.round(level * 100));
  fill.style.width = pct + '%';
  const gronn = document.getElementById('lysGronn');
  const gul = document.getElementById('lysGul');
  const rod = document.getElementById('lysRod');
  const tekst = document.getElementById('stoyTekst');
  const stateRod = level >= 0.62, stateGul = level >= 0.32 && !stateRod;
  gronn.classList.toggle('aktiv', !stateRod && !stateGul);
  gul.classList.toggle('aktiv', stateGul);
  rod.classList.toggle('aktiv', stateRod);
  fill.style.background = stateRod ? 'var(--danger)' : stateGul ? 'var(--accent)' : 'var(--brand)';
  tekst.textContent = stateRod ? 'For høyt! 🤫' : stateGul ? 'På grensen' : 'God arbeidsro';
}
