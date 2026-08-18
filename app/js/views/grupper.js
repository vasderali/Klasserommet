import { store } from '../store.js';
import { h, fmtDate, toast, emptyState, segBtn, rerenderView as rr } from '../ui.js';
import { makeGroups } from '../engine.js';

let mode = 'size';
let sizeVal = 4;
let countVal = 4;
let result = null;
let resultCid = null;
let showHist = false;
const excluded = {}; // cid -> Set av elever som holdes utenfor (fravær o.l.)

export function render(root) {
  const cls = store.currentClass();
  if (!cls) { root.append(emptyState('Lag en klasse først, så kan du lage grupper.')); return; }
  if (resultCid !== cls.id) result = null;
  const ex = excluded[cls.id] || (excluded[cls.id] = new Set());
  const nameOf = id => cls.students.find(s => s.id === id)?.name;

  const view = h('section', { class: 'view' },
    h('div', { class: 'view-head no-print' }, h('h2', {}, 'Grupper')));

  const bump = d => {
    if (mode === 'size') sizeVal = Math.min(8, Math.max(2, sizeVal + d));
    else countVal = Math.min(12, Math.max(2, countVal + d));
    rr();
  };

  const generate = () => {
    const included = cls.students.filter(s => !ex.has(s.id));
    if (included.length < 2) { toast('For få elever til å lage grupper.'); return; }
    const res = makeGroups(included, { mode, value: mode === 'size' ? sizeVal : countVal },
      cls.apart || [], store.groupHistory(cls.id));
    result = res.groups;
    resultCid = cls.id;
    store.addGroupSet(cls.id, res.groups);
    if (res.hard > 0) toast('Obs: fikk ikke oppfylt alle «ikke sammen»-reglene.');
    rr();
  };

  view.append(h('div', { class: 'panel no-print' },
    h('div', { class: 'row wrap' },
      h('div', { class: 'seg' },
        segBtn('Gruppestørrelse', mode === 'size', () => { mode = 'size'; rr(); }),
        segBtn('Antall grupper', mode === 'count', () => { mode = 'count'; rr(); })),
      h('div', { class: 'stepper' },
        h('button', { class: 'btn', onclick: () => bump(-1) }, '−'),
        h('span', { class: 'stepper-val' }, String(mode === 'size' ? sizeVal : countVal)),
        h('button', { class: 'btn', onclick: () => bump(1) }, '+')),
      h('button', { class: 'btn primary', onclick: generate }, '🎲 Lag grupper')),
    h('p', { class: 'muted' }, 'Trykk på et navn for å holde noen utenfor (f.eks. fravær). Trekningen følger «ikke sammen»-reglene og unngår par fra de siste rundene.'),
    h('div', { class: 'chips' }, cls.students.map(s =>
      h('button', {
        class: 'chip' + (ex.has(s.id) ? ' absent' : ''),
        onclick: () => { ex.has(s.id) ? ex.delete(s.id) : ex.add(s.id); rr(); },
      }, s.name)))));

  if (result) {
    view.append(h('div', { class: 'print-caption' },
      `${cls.name} · grupper · ${new Date().toLocaleDateString('nb-NO')}`));
    view.append(h('div', { class: 'groups-grid' }, result.map((g, i) =>
      h('div', { class: 'panel group-card' },
        h('h3', {}, `Gruppe ${i + 1}`),
        h('ul', {}, g.map(id => nameOf(id) && h('li', {}, nameOf(id))))))));
    view.append(h('div', { class: 'row no-print', style: 'margin:12px 0' },
      h('button', { class: 'btn', onclick: () => { document.body.classList.add('print-mode'); window.print(); } }, '🖨 Skriv ut')));
  }

  const hist = store.groupHistory(cls.id);
  if (hist.length) {
    view.append(h('button', { class: 'linklike no-print', onclick: () => { showHist = !showHist; rr(); } },
      (showHist ? '▾' : '▸') + ` Tidligere grupper (${hist.length})`));
    if (showHist) {
      view.append(h('div', { class: 'panel no-print' }, hist.map(entry =>
        h('div', { class: 'hist-row' },
          h('strong', {}, fmtDate(entry.at)),
          h('div', { class: 'muted small' },
            entry.groups.map((g, i) => `G${i + 1}: ` + g.map(nameOf).filter(Boolean).join(', ')).join('  ·  '))))));
    }
  }
  root.append(view);
}
