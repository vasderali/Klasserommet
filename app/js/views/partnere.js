import { store } from '../store.js';
import { h, fmtDate, toast, emptyState, rerenderView as rr } from '../ui.js';
import { makeGroups } from '../engine.js';

// Læringspartnere: par som byttes jevnlig. Trekningen følger «ikke
// sammen»-reglene og unngår partnere fra de siste rundene, slik at alle
// etter hvert har jobbet med alle.

export function render(root) {
  const cls = store.currentClass();
  if (!cls) { root.append(emptyState('Lag en klasse først, så kan du trekke læringspartnere.', '🤝')); return; }
  const rounds = store.partnerRounds(cls.id);
  const valid = new Set(cls.students.map(s => s.id));
  const nameOf = id => cls.students.find(s => s.id === id)?.name;
  const current = rounds[0];

  const view = h('section', { class: 'view' },
    h('div', { class: 'view-head no-print' },
      h('h2', {}, 'Læringspartnere'),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn primary', onclick: () => draw(cls) }, '🔄 Nye partnere'),
        current && h('button', { class: 'btn', onclick: () => {
          document.body.classList.add('print-mode');
          window.print();
        } }, '🖨 Skriv ut'))));

  if (!current) {
    view.append(h('div', { class: 'panel' },
      h('p', {}, 'Trekk klassens første læringspartnere! Parene byttes når du vil – appen husker hvem som har vært sammen, så alle etter hvert får jobbet med alle.'),
      cls.students.length < 2 && h('p', { class: 'muted' }, 'Klassen trenger minst to elever.')));
    root.append(view);
    return;
  }

  const groups = current.groups
    .map(g => g.filter(id => valid.has(id)))
    .filter(g => g.length > 0);

  view.append(h('div', { class: 'print-caption' }, `${cls.name} · læringspartnere · ${fmtDate(current.at)}`));
  view.append(h('p', { class: 'muted no-print' },
    `Satt ${fmtDate(current.at)} · runde ${rounds.length} · trykk «Nye partnere» når det er tid for bytte.`));
  view.append(h('div', { class: 'groups-grid' }, groups.map(g =>
    h('div', { class: 'panel group-card partner-card' },
      g.map(id => h('div', { class: 'partner-navn' }, nameOf(id)))))));
  root.append(view);
}

function draw(cls) {
  if (cls.students.length < 2) { toast('Klassen trenger minst to elever.'); return; }
  // floor(n/2) par: ved oddetall blir én gruppe på tre – ingen står alene.
  const count = Math.max(1, Math.floor(cls.students.length / 2));
  const res = makeGroups(cls.students, { mode: 'count', value: count },
    cls.apart || [], store.partnerRounds(cls.id));
  store.addPartnerRound(cls.id, res.groups);
  if (res.hard > 0) toast('Obs: fikk ikke oppfylt alle «ikke sammen»-reglene.');
  else toast('Nye læringspartnere er klare! 🤝');
  rr();
}
