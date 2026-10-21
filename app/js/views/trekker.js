import { store } from '../store.js';
import { h, fmtDate, toast, emptyState, segBtn, rerenderView as rr } from '../ui.js';

let spinning = false;
let justDrawn = false;
let mode = 'en'; // 'en' = trekk én | 'rekkefolge' = fremføringsrekkefølge

export function render(root) {
  const cls = store.currentClass();
  if (!cls) { root.append(emptyState('Lag en klasse først, så kan du trekke navn.', '🎲')); return; }
  if (mode === 'rekkefolge') { renderOrder(root, cls); return; }
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
    h('div', { class: 'view-head' },
      h('h2', {}, 'Trekker'),
      modeSeg()),
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

function modeSeg() {
  return h('div', { class: 'seg' },
    segBtn('Trekk én', mode === 'en', () => { mode = 'en'; rr(); }),
    segBtn('Rekkefølge', mode === 'rekkefolge', () => { mode = 'rekkefolge'; rr(); }));
}

// Fremføringsrekkefølge: trekk en tilfeldig rekkefølge én gang, og kryss av
// etter hvert som elevene har fremført – den vedvarer over flere dager.
function renderOrder(root, cls) {
  const ord = store.order(cls.id);
  const p = store.picker(cls.id);
  const valid = new Set(cls.students.map(s => s.id));
  ord.order = ord.order.filter(id => valid.has(id));
  ord.done = ord.done.filter(id => valid.has(id));
  const nameOf = id => cls.students.find(s => s.id === id)?.name;

  const trekk = () => {
    const present = cls.students.filter(s => !p.absent.includes(s.id));
    if (present.length < 2) { toast('For få elever til å trekke rekkefølge.'); return; }
    const ids = present.map(s => s.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    ord.order = ids;
    ord.done = [];
    ord.at = Date.now();
    store.saveOrder();
    toast('Rekkefølgen er trukket – ingen kan klage på læreren! 🎲');
    rr();
  };

  const view = h('section', { class: 'view' },
    h('div', { class: 'view-head no-print' },
      h('h2', {}, 'Trekker'),
      modeSeg()),
    h('div', { class: 'row wrap no-print', style: 'margin-bottom:12px' },
      h('button', { class: 'btn primary', onclick: () => {
        if (!ord.order.length || confirm('Trekke ny rekkefølge? Den gamle forsvinner.')) trekk();
      } }, '🎲 Trekk rekkefølge'),
      ord.order.length ? h('button', { class: 'btn', onclick: () => {
        document.body.classList.add('print-mode');
        window.print();
      } }, '🖨 Skriv ut') : null));

  if (!ord.order.length) {
    view.append(h('div', { class: 'panel' },
      h('p', {}, 'Trekk en tilfeldig rekkefølge for fremføringer eller presentasjoner. Lista blir stående til du trekker en ny – kryss av underveis, også om fremføringene går over flere dager.'),
      p.absent.length ? h('p', { class: 'muted small' }, 'Elever markert som fraværende i «Trekk én» holdes utenfor.') : null));
  } else {
    view.append(h('div', { class: 'print-caption' }, `${cls.name} · fremføringsrekkefølge · ${fmtDate(ord.at)}`));
    view.append(h('p', { class: 'muted no-print' },
      `${ord.done.length} av ${ord.order.length} ferdige · trykk på et navn for å krysse av`));
    view.append(h('div', { class: 'panel' },
      h('ol', { class: 'rekkefolge-liste' }, ord.order.map(id => {
        const done = ord.done.includes(id);
        return h('li', {},
          h('button', {
            class: 'rekkefolge-navn' + (done ? ' done' : ''),
            onclick: () => {
              ord.done = done ? ord.done.filter(x => x !== id) : [...ord.done, id];
              store.saveOrder();
              rr();
            },
          }, nameOf(id)));
      }))));
  }
  root.append(view);
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
