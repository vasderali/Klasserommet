import { store } from '../store.js';
import { h, emptyState, segBtn, rerenderView as rr } from '../ui.js';
import { fagColor } from '../fag.js';

const DAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre'];

let full = false;
let selDay = null;   // 0-4; null = i dag (eller mandag i helgen)
let clockStarted = false;

function todayIdx() {
  const d = new Date().getDay();
  return d >= 1 && d <= 5 ? d - 1 : null;
}

function todayKey() { return new Date().toISOString().slice(0, 10); }

function tickClock() {
  const el = document.getElementById('tavleClock');
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

export function render(root) {
  if (!clockStarted) { setInterval(tickClock, 5000); clockStarted = true; }
  const cls = store.currentClass();
  if (!cls) { root.append(emptyState('Lag en klasse først – tavlemodus viser dagens plan fra timeplanen.')); return; }
  const tt = store.timetable(cls.id);
  const today = todayIdx();
  const day = selDay ?? today ?? 0;
  const isToday = today !== null && day === today;

  // Avhukingen nullstilles automatisk hver dag.
  if (tt && (!tt.done || tt.done.date !== todayKey())) {
    tt.done = { date: todayKey(), rows: [] };
  }

  const view = h('section', { class: 'view tavle-view' + (full ? ' full' : '') },
    full && h('button', { class: 'btn tavle-exit', onclick: () => { full = false; rr(); } }, '✕ Lukk'),
    h('div', { class: 'tavle-head' },
      h('div', {},
        h('div', { class: 'tavle-clock', id: 'tavleClock' },
          new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })),
        h('div', { class: 'tavle-date muted' },
          cls.name + ' · ' + new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' }))),
      h('div', { class: 'row wrap no-print' },
        h('div', { class: 'seg' }, DAYS.map((d, i) => segBtn(d, day === i, () => { selDay = i; rr(); }))),
        !full && h('button', { class: 'btn primary', onclick: () => { full = true; rr(); } }, '🖥 Tavlemodus'))));

  if (!tt || !tt.rows.length) {
    view.append(h('div', { class: 'panel' },
      h('p', {}, 'Timeplanen er tom. Fyll den inn under '),
      h('a', { class: 'btn', href: '#/timeplan' }, '📅 Timeplan')));
    root.append(view);
    return;
  }

  const agenda = h('div', { class: 'tavle-agenda' });
  tt.rows.forEach(row => {
    if (row.type === 'pause') {
      agenda.append(h('div', { class: 'tavle-pause' }, row.label));
      return;
    }
    const cell = tt.cells[row.id + ':' + day];
    const done = isToday && tt.done.rows.includes(row.id);
    const detaljer = [cell?.rom, cell?.info].filter(Boolean).join(' · ');
    agenda.append(h('button', {
      class: 'tavle-item' + (done ? ' done' : '') + (cell?.fag ? '' : ' empty'),
      style: cell?.fag ? `background:${fagColor(cell.fag)}` : '',
      disabled: !isToday,
      'aria-label': `${row.label}: ${cell?.fag || 'ingen økt'}${done ? ' – gjennomført' : ''}`,
      onclick: () => {
        if (!isToday) return;
        tt.done.rows = done ? tt.done.rows.filter(x => x !== row.id) : [...tt.done.rows, row.id];
        store.setTimetable(cls.id, tt);
        rr();
      },
    },
      h('span', { class: 'tavle-check', 'aria-hidden': 'true' }, done ? '✓' : ''),
      h('span', { class: 'tavle-label' }, row.label),
      h('span', { class: 'tavle-fag' }, cell?.fag || '–'),
      detaljer && h('span', { class: 'tavle-detalj muted' }, detaljer)));
  });
  view.append(agenda);
  if (isToday) {
    view.append(h('p', { class: 'tip muted no-print' }, 'Trykk på en økt for å krysse den av etter hvert som dagen går.'));
  }
  root.append(view);
}
