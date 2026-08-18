import { store } from '../store.js';
import { h, toast, emptyState, segBtn, rerenderView as rr } from '../ui.js';
import { STANDARD_FAG, fagColor } from '../fag.js';

const DAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre'];
const DAYS_FULL = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];

let selCell = null; // { row: rowId, day: 0-4 }
let selRow = null;  // rowId (radredigering)

// Tekstfelt lagrer fortløpende UTEN re-render – en full re-render på blur
// river bort elementet brukeren er i ferd med å trykke på.
function debounced(fn) {
  let t;
  return e => { clearTimeout(t); t = setTimeout(() => fn(e), 250); };
}

function ensure(cid) {
  let tt = store.timetable(cid);
  if (!tt) {
    tt = {
      rows: Array.from({ length: 6 }, (_, i) => ({ id: store.uid(), label: `${i + 1}. time`, type: 'time' })),
      cells: {},
    };
    store.setTimetable(cid, tt);
  }
  return tt;
}

export function render(root) {
  const cls = store.currentClass();
  if (!cls) {
    root.append(emptyState('Lag en klasse (eller et trinn, f.eks. «2. trinn») først, så kan du fylle inn timeplanen.'));
    return;
  }
  const tt = ensure(cls.id);
  if (selCell && !tt.rows.some(r => r.id === selCell.row)) selCell = null;
  if (selRow && !tt.rows.some(r => r.id === selRow)) selRow = null;

  // Rydd bort tomme celler – bortsett fra den som ev. redigeres nå.
  Object.keys(tt.cells).forEach(k => {
    const c = tt.cells[k];
    const inEdit = selCell && k === selCell.row + ':' + selCell.day;
    if (c && !c.fag && !c.rom && !c.info && !inEdit) delete tt.cells[k];
  });

  const usedFag = [...new Set(Object.values(tt.cells).map(c => c.fag).filter(Boolean))];
  const fagListe = [...new Set([...usedFag, ...STANDARD_FAG])];

  const addRow = type => {
    const label = type === 'pause' ? 'Friminutt' : `${tt.rows.filter(r => r.type !== 'pause').length + 1}. time`;
    const row = { id: store.uid(), label, type };
    tt.rows.push(row);
    store.setTimetable(cls.id, tt);
    selRow = row.id;
    selCell = null;
    rr();
  };

  const others = store.classes().filter(c => c.id !== cls.id && store.timetable(c.id));
  const view = h('section', { class: 'view' },
    h('div', { class: 'view-head no-print' },
      h('h2', {}, 'Timeplan'),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn', onclick: () => addRow('time') }, '+ Time'),
        h('button', { class: 'btn', onclick: () => addRow('pause') }, '+ Friminutt'),
        others.length ? h('select', { class: 'input', 'aria-label': 'Kopier timeplan fra en annen klasse', onchange: e => {
          if (e.target.value) copyFrom(cls, tt, e.target.value);
        } },
          h('option', { value: '' }, 'Kopier fra …'),
          others.map(c => h('option', { value: c.id }, c.name))) : null,
        h('button', { class: 'btn', onclick: () => { document.body.classList.add('print-mode'); window.print(); } }, '🖨 Skriv ut'))));

  if (selRow) view.append(rowEditor(cls, tt));
  else if (selCell) view.append(cellEditor(cls, tt, fagListe));

  view.append(h('div', { class: 'print-caption' }, `${cls.name} · timeplan`));
  view.append(grid(tt));
  view.append(h('p', { class: 'tip muted no-print' },
    'Trykk på en rute for å sette inn fag, og på navnet/klokkeslettet til venstre for å endre, flytte eller slette raden. Timeplanen lagres kun på denne enheten – bruk Eksporter under Klasser for å dele den.'));
  root.append(view);
}

// Bruk en annen klasses timeplan som mal – med fag, eller bare tider/rader.
function copyFrom(cls, tt, srcId) {
  const src = store.timetable(srcId);
  if (!src) { rr(); return; }
  if (Object.keys(tt.cells).length && !confirm('Erstatte timeplanen til denne klassen?')) { rr(); return; }
  const withFag = confirm('Ta med fagene også?\nOK = tider og fag · Avbryt = bare tidene/radene');
  const idMap = {};
  const rows = src.rows.map(r => {
    const id = store.uid();
    idMap[r.id] = id;
    return { id, label: r.label, type: r.type };
  });
  const cells = {};
  if (withFag) {
    Object.entries(src.cells).forEach(([k, v]) => {
      const [rid, day] = k.split(':');
      if (idMap[rid]) cells[idMap[rid] + ':' + day] = { ...v };
    });
  }
  store.setTimetable(cls.id, { rows, cells });
  selRow = null;
  selCell = null;
  toast(withFag ? 'Timeplan kopiert med fag.' : 'Tider og rader kopiert.');
  rr();
}

// Lesevisning av rutenettet til bruk andre steder (vikarpakken).
export function staticGrid(tt) {
  return grid(tt);
}

function grid(tt) {
  const g = h('div', { class: 'tt-grid' });
  g.append(h('div', {}, ''));
  DAYS.forEach(d => g.append(h('div', { class: 'tt-day' }, d)));
  tt.rows.forEach(row => {
    if (row.type === 'pause') {
      g.append(h('button', {
        class: 'tt-pause' + (selRow === row.id ? ' sel' : ''),
        onclick: () => { selRow = selRow === row.id ? null : row.id; selCell = null; rr(); },
      }, row.label));
      return;
    }
    g.append(h('button', {
      class: 'tt-rowlabel' + (selRow === row.id ? ' sel' : ''),
      onclick: () => { selRow = selRow === row.id ? null : row.id; selCell = null; rr(); },
    }, row.label));
    DAYS.forEach((_, di) => {
      const cell = tt.cells[row.id + ':' + di];
      const sel = selCell && selCell.row === row.id && selCell.day === di;
      const detaljer = [cell?.rom, cell?.info].filter(Boolean).join(' · ');
      g.append(h('button', {
        class: 'tt-cell' + (cell?.fag ? '' : ' empty') + (sel ? ' sel' : ''),
        style: cell?.fag ? `background:${fagColor(cell.fag)}` : '',
        onclick: () => { selCell = sel ? null : { row: row.id, day: di }; selRow = null; rr(); },
      },
        cell?.fag && h('span', { class: 'tt-fag' }, cell.fag),
        detaljer && h('span', { class: 'tt-rom' }, detaljer)));
    });
  });
  return g;
}

function rowEditor(cls, tt) {
  const row = tt.rows.find(r => r.id === selRow);
  const idx = tt.rows.indexOf(row);
  const save = () => { store.setTimetable(cls.id, tt); rr(); };
  const move = dir => {
    const j = idx + dir;
    if (j < 0 || j >= tt.rows.length) return;
    [tt.rows[idx], tt.rows[j]] = [tt.rows[j], tt.rows[idx]];
    save();
  };
  const setType = type => {
    if (row.type === type) return;
    if (type === 'pause') {
      const harFag = Object.keys(tt.cells).some(k => k.startsWith(row.id + ':') && tt.cells[k].fag);
      if (harFag && !confirm('Raden har fag i seg – gjøre den om til friminutt? Fagene fjernes.')) { rr(); return; }
      Object.keys(tt.cells).forEach(k => { if (k.startsWith(row.id + ':')) delete tt.cells[k]; });
    }
    row.type = type;
    save();
  };
  return h('div', { class: 'contextbar no-print' },
    h('input', { class: 'input', value: row.label,
      placeholder: 'F.eks. «08:30–09:15» eller «Lunsj»',
      oninput: debounced(e => {
        const v = e.target.value.trim();
        if (v) { row.label = v; store.setTimetable(cls.id, tt); }
      }) }),
    h('div', { class: 'seg' },
      segBtn('Skoletime', row.type !== 'pause', () => setType('time')),
      segBtn('Friminutt', row.type === 'pause', () => setType('pause'))),
    h('button', { class: 'btn small', onclick: () => move(-1) }, '↑ Flytt opp'),
    h('button', { class: 'btn small', onclick: () => move(1) }, '↓ Flytt ned'),
    h('button', { class: 'btn small danger', onclick: () => {
      const harFag = Object.keys(tt.cells).some(k => k.startsWith(row.id + ':') && tt.cells[k].fag);
      if (harFag && !confirm('Raden har fag i seg – slette den likevel?')) return;
      tt.rows = tt.rows.filter(r => r.id !== row.id);
      Object.keys(tt.cells).forEach(k => { if (k.startsWith(row.id + ':')) delete tt.cells[k]; });
      selRow = null;
      save();
    } }, 'Slett rad'),
    h('button', { class: 'btn small', onclick: () => { selRow = null; rr(); } }, 'Lukk'));
}

function cellEditor(cls, tt, fagListe) {
  const key = selCell.row + ':' + selCell.day;
  const cell = tt.cells[key] || (tt.cells[key] = {});
  const rowLabel = tt.rows.find(r => r.id === selCell.row)?.label || '';
  const save = patch => {           // med re-render – brukes av chips/knapper
    Object.assign(cell, patch);
    store.setTimetable(cls.id, tt);
    rr();
  };
  const nyInput = h('input', { class: 'input', placeholder: 'Annet fag …' });
  const romInput = h('input', { class: 'input', placeholder: 'Rom (valgfritt)', value: cell.rom || '',
    oninput: debounced(e => { cell.rom = e.target.value.trim(); store.setTimetable(cls.id, tt); }) });
  const infoInput = h('input', { class: 'input', placeholder: 'Lærer/notat (valgfritt)', value: cell.info || '',
    oninput: debounced(e => { cell.info = e.target.value.trim(); store.setTimetable(cls.id, tt); }) });
  return h('div', { class: 'contextbar no-print' },
    h('strong', {}, `${DAYS_FULL[selCell.day]} · ${rowLabel}`),
    cell.fag && h('button', { class: 'btn small danger', onclick: () => save({ fag: '', rom: '', info: '' }) }, 'Tøm rute'),
    h('button', { class: 'btn small', onclick: () => { selCell = null; rr(); } }, 'Lukk'),
    h('div', { class: 'chips', style: 'flex-basis:100%;margin-top:2px' },
      fagListe.map(f => h('button', {
        class: 'chip',
        style: `background:${fagColor(f)};border-color:transparent`,
        onclick: () => save({ fag: f }),
      }, f))),
    h('div', { class: 'row wrap', style: 'flex-basis:100%' },
      nyInput,
      h('button', { class: 'btn small', onclick: () => {
        const v = nyInput.value.trim();
        if (v) save({ fag: v });
        else toast('Skriv inn et fagnavn først.');
      } }, 'Bruk'),
      romInput,
      infoInput));
}
