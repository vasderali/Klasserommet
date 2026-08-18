import { store } from '../store.js';
import { h, emptyState, rerenderView as rr } from '../ui.js';

let spinning = false;
let justDrawn = false;

export function render(root) {
  const cls = store.currentClass();
  if (!cls) { root.append(emptyState('Lag en klasse først, så kan du trekke navn.', '🎲')); return; }
  const p = store.picker(cls.id);
  const valid = new Set(cls.students.map(s => s.id));
  p.drawn = p.drawn.filter(id => valid.has(id));
  p.absent = p.absent.filter(id => valid.has(id));
  const nameOf = id => cls.students.find(s => s.id === id)?.name || '';
  const remaining = cls.students.filter(s => !p.drawn.includes(s.id) && !p.absent.includes(s.id));
  const last = p.drawn[p.drawn.length - 1];

  const display = h('div', { class: 'draw-display' + (justDrawn ? ' pop' : ''), 'aria-live': 'polite' },
    remaining.length === 0 && p.drawn.length ? 'Alle er trukket! 🎉' : (last ? nameOf(last) : 'Klar?'));
  justDrawn = false;

  root.append(h('section', { class: 'view' },
    h('div', { class: 'view-head' }, h('h2', {}, 'Trekk et navn')),
    h('div', { class: 'panel draw-panel' },
      display,
      h('div', { class: 'row center' },
        h('button', {
          class: 'btn primary big',
          disabled: !remaining.length || spinning,
          onclick: () => draw(p, remaining, display),
        }, '🎲 Trekk navn'),
        h('button', { class: 'btn', onclick: () => {
          if (!p.drawn.length || confirm('Starte en ny runde? Alle kan trekkes på nytt.')) {
            p.drawn = [];
            store.savePicker();
            rr();
          }
        } }, 'Ny runde')),
      h('p', { class: 'muted' },
        `${remaining.length} igjen · ${p.drawn.length} trukket — alle trekkes én gang før noen trekkes igjen`)),
    h('div', { class: 'panel' },
      h('p', { class: 'muted' }, 'Trykk på et navn for å markere fravær – de holdes utenfor trekningen.'),
      h('div', { class: 'chips' }, cls.students.map(s => {
        const drawnIdx = p.drawn.indexOf(s.id);
        const absent = p.absent.includes(s.id);
        return h('button', {
          class: 'chip' + (drawnIdx >= 0 ? ' done' : '') + (absent ? ' absent' : ''),
          onclick: () => {
            if (drawnIdx >= 0) return;
            absent ? (p.absent = p.absent.filter(x => x !== s.id)) : p.absent.push(s.id);
            store.savePicker();
            rr();
          },
        }, drawnIdx >= 0 ? `${drawnIdx + 1}. ${s.name}` : s.name);
      })))));
}

function draw(p, remaining, display) {
  if (spinning || !remaining.length) return;
  spinning = true;
  const winner = remaining[Math.floor(Math.random() * remaining.length)];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    display.textContent = winner.name;
    p.drawn.push(winner.id);
    store.savePicker();
    spinning = false;
    rr();
    return;
  }
  let i = 0;
  const iv = setInterval(() => {
    display.textContent = remaining[Math.floor(Math.random() * remaining.length)].name;
    if (++i >= 12) {
      clearInterval(iv);
      display.textContent = winner.name;
      p.drawn.push(winner.id);
      store.savePicker();
      spinning = false;
      justDrawn = true;
      rr();
    }
  }, 60);
}
