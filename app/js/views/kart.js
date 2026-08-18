import { store } from '../store.js';
import { h, fmtDate, toast, emptyState, clone, segBtn, rerenderView as rr } from '../ui.js';
import { assignSeats } from '../engine.js';

// Logiske koordinater: brettet er alltid 960 bredt og skaleres til skjermen.
const W = 960, DW = 110, DH = 64;

let tab = 'kart';
let selected = null;
let snapshotView = null;
let refit = null;
let resizeHooked = false;
const deskCounts = {}; // cid -> valgt antall pulter for nye oppsett

function countFor(cls) {
  return deskCounts[cls.id] ?? Math.max(cls.students.length || 24, 1);
}

export function render(root) {
  if (!resizeHooked) {
    window.addEventListener('resize', () => refit && refit());
    resizeHooked = true;
  }
  const cls = store.currentClass();
  if (!cls) { root.append(emptyState('Lag en klasse først, så kan du bygge klassekart.')); return; }
  const histCount = store.history(cls.id).length;
  const view = h('section', { class: 'view' },
    h('div', { class: 'view-head no-print' },
      h('h2', {}, 'Klassekart'),
      h('div', { class: 'seg' },
        segBtn('Kart', tab === 'kart', () => { tab = 'kart'; snapshotView = null; rr(); }),
        segBtn(`Historikk (${histCount})`, tab === 'hist', () => { tab = 'hist'; rr(); }))));
  view.append(tab === 'kart' ? buildEditor(cls) : buildHistory(cls));
  root.append(view);
}

function sanitizeChart(cls) {
  let chart = store.chart(cls.id);
  if (!chart || !Array.isArray(chart.desks)) chart = { desks: [] };
  const valid = new Set(cls.students.map(s => s.id));
  chart.desks.forEach(d => { if (d.sid && !valid.has(d.sid)) d.sid = null; });
  return chart;
}

function buildEditor(cls) {
  const chart = sanitizeChart(cls);
  if (selected && !chart.desks.some(d => d.id === selected)) selected = null;
  const box = h('div', {});

  const presetSel = h('select', { class: 'input no-print', onchange: e => applyPreset(cls, chart, e.target.value) },
    h('option', { value: '' }, 'Nytt oppsett …'),
    h('option', { value: 'rows2' }, 'Rekker · topulter'),
    h('option', { value: 'rows1' }, 'Rekker · enkeltpulter'),
    h('option', { value: 'u' }, 'Hestesko'),
    h('option', { value: 'g4' }, 'Grupper på fire'));

  box.append(h('div', { class: 'toolbar no-print' },
    presetSel,
    h('div', { class: 'stepper' },
      h('span', { class: 'muted small' }, 'Pulter'),
      h('button', { class: 'btn', onclick: () => { deskCounts[cls.id] = Math.max(1, countFor(cls) - 1); rr(); } }, '−'),
      h('span', { class: 'stepper-val' }, String(countFor(cls))),
      h('button', { class: 'btn', onclick: () => { deskCounts[cls.id] = Math.min(40, countFor(cls) + 1); rr(); } }, '+')),
    h('button', { class: 'btn', onclick: () => addDesk(cls, chart) }, '+ Pult'),
    h('button', { class: 'btn primary', onclick: () => fill(cls, chart) }, '🎲 Fyll tilfeldig'),
    h('button', { class: 'btn', onclick: () => {
      if (!chart.desks.length) return;
      chart.desks.forEach(d => { d.sid = null; });
      store.setChart(cls.id, chart);
      rr();
    } }, 'Tøm navn'),
    h('button', { class: 'btn', onclick: () => saveSnap(cls, chart) }, '💾 Lagre i historikk'),
    h('button', { class: 'btn', onclick: () => { document.body.classList.add('print-mode'); window.print(); } }, '🖨 Skriv ut')));

  if (selected) {
    const d = chart.desks.find(x => x.id === selected);
    const sName = cls.students.find(s => s.id === d.sid)?.name;
    const placed = new Set(chart.desks.map(x => x.sid).filter(Boolean));
    const unplaced = cls.students.filter(s => !placed.has(s.id));
    box.append(h('div', { class: 'contextbar no-print' },
      h('span', {}, sName ? `Valgt: ${sName}` : 'Valgt: ledig pult'),
      h('span', { class: 'muted' }, unplaced.length
        ? 'velg elev nedenfor, eller trykk på en annen pult for å bytte plass'
        : 'trykk på en annen pult for å bytte plass'),
      d.sid && h('button', { class: 'btn small', onclick: () => {
        d.sid = null; selected = null; store.setChart(cls.id, chart); rr();
      } }, 'Fjern navn'),
      h('button', { class: 'btn small danger', onclick: () => {
        chart.desks = chart.desks.filter(x => x.id !== selected);
        selected = null; store.setChart(cls.id, chart); rr();
      } }, 'Fjern pult'),
      unplaced.length ? h('div', { class: 'chips', style: 'flex-basis:100%;margin-top:2px' },
        unplaced.map(s => h('button', { class: 'chip', onclick: () => {
          d.sid = s.id; selected = null; store.setChart(cls.id, chart); rr();
        } }, s.name))) : null));
  }

  box.append(h('div', { class: 'print-caption' },
    `${cls.name} · ${new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}`));

  if (!chart.desks.length) {
    box.append(h('div', { class: 'panel no-print' },
      h('p', {}, 'Start med å velge et oppsett i menyen over – pultene plasseres automatisk ut fra antall elever. Deretter kan du dra pultene dit du vil og trykke «Fyll tilfeldig».')));
  }
  box.append(renderBoard(chart.desks, cls, chart));
  box.append(h('p', { class: 'tip muted no-print' },
    'Dra en pult for å flytte den – pultene er magnetiske og smetter inntil hverandre. Trykk på én pult og så en annen for å bytte plass på elevene.'));
  return box;
}

function applyPreset(cls, chart, kind) {
  if (!kind) return;
  if (chart.desks.some(d => d.sid) && !confirm('Erstatte dagens kart? Navnene på pultene fjernes.')) { rr(); return; }
  store.setChart(cls.id, { desks: presetDesks(kind, countFor(cls)) });
  selected = null;
  rr();
}

function presetDesks(kind, n) {
  const out = [];
  const push = (x, y) => out.push({ id: store.uid(), x: Math.round(x), y: Math.round(y), sid: null });
  // Tavla er nederst, så raden med lavest y er bakerst i rommet.
  if (kind === 'rows2') {
    const m = Math.ceil(n / 2);
    for (let p = 0; p < m; p++) {
      const col = p % 3, row = Math.floor(p / 3);
      const x = 106 + col * 264, y = 24 + row * 104;
      push(x, y); push(x + DW, y);
    }
  } else if (kind === 'rows1') {
    for (let i = 0; i < n; i++) {
      push(87 + (i % 6) * 135, 24 + Math.floor(i / 6) * 104);
    }
  } else if (kind === 'u') {
    // Hestesko som åpner seg mot tavla: lukket rad bakerst, armene ned mot tavla.
    const b = Math.min(7, Math.max(3, Math.round(n / 3)));
    const rest = Math.max(0, n - b);
    const L = Math.ceil(rest / 2), R = rest - L;
    for (let i = 0; i < b; i++) {
      push(b === 1 ? (W - DW) / 2 : 32 + i * ((818 - 32) / (b - 1)), 24);
    }
    for (let i = 0; i < L; i++) push(32, 108 + i * 84);
    for (let i = 0; i < R; i++) push(818, 108 + i * 84);
  } else if (kind === 'g4') {
    const c = Math.ceil(n / 4);
    for (let k = 0; k < c; k++) {
      const col = k % 3, row = Math.floor(k / 3);
      const x = 75 + col * 295, y = 24 + row * 198;
      push(x, y); push(x + DW, y); push(x, y + DH); push(x + DW, y + DH);
    }
  }
  return out;
}

function overlapsAny(id, desks, x, y) {
  return desks.some(o => o.id !== id && x < o.x + DW && x + DW > o.x && y < o.y + DH && y + DH > o.y);
}

function findFreeSpot(desks) {
  for (let y = 16; y < 1800; y += 24) {
    for (let x = 8; x <= W - DW - 8; x += 24) {
      if (!overlapsAny(null, desks, x, y)) return { x, y };
    }
  }
  return { x: 8, y: 64 };
}

// Slippes en pult oppå en annen, flyttes den til nærmeste ledige plass
// inntil en pult. Returnerer null bare hvis brettet er helt fullt.
function resolveCollision(id, desks, x, y) {
  if (!overlapsAny(id, desks, x, y)) return { x, y };
  let best = null, bestDist = Infinity;
  for (const o of desks) {
    if (o.id === id) continue;
    const cands = [
      { x: o.x + DW, y: o.y }, { x: o.x - DW, y: o.y },
      { x: o.x, y: o.y + DH }, { x: o.x, y: o.y - DH },
      { x: o.x + DW, y: o.y + DH }, { x: o.x - DW, y: o.y - DH },
      { x: o.x + DW, y: o.y - DH }, { x: o.x - DW, y: o.y + DH },
    ];
    for (const c of cands) {
      const cx = Math.min(Math.max(c.x, 0), W - DW);
      const cy = Math.max(c.y, 8);
      if (overlapsAny(id, desks, cx, cy)) continue;
      const dist = (cx - x) ** 2 + (cy - y) ** 2;
      if (dist < bestDist) { bestDist = dist; best = { x: cx, y: cy }; }
    }
  }
  return best;
}

function addDesk(cls, chart) {
  const spot = findFreeSpot(chart.desks);
  chart.desks.push({ id: store.uid(), x: spot.x, y: spot.y, sid: null });
  store.setChart(cls.id, chart);
  rr();
}

function fill(cls, chart) {
  if (!cls.students.length) { toast('Klassen har ingen elever ennå.'); return; }
  if (!chart.desks.length) { toast('Legg til pulter først – velg et oppsett i menyen.'); return; }
  if (chart.desks.length < cls.students.length) {
    alert(`Klassen har ${cls.students.length} elever, men kartet har bare ${chart.desks.length} pulter. Legg til flere pulter først.`);
    return;
  }
  const hist = store.history(cls.id).map(s => s.desks);
  const res = assignSeats(cls.students, chart.desks, cls.apart || [], hist);
  chart.desks.forEach(d => { d.sid = res.seating[d.id] || null; });
  store.setChart(cls.id, chart);
  selected = null;
  if (res.hard > 0) toast('Obs: fikk ikke oppfylt alle «ikke sammen»-reglene med dette oppsettet.');
  else toast(hist.length ? 'Nytt kart – unngår naboer fra de siste lagrede kartene.' : 'Kartet er fylt tilfeldig.');
  rr();
}

function saveSnap(cls, chart) {
  if (!chart.desks.some(d => d.sid)) { toast('Fyll inn navn på kartet før du lagrer.'); return; }
  store.saveSnapshot(cls.id, chart.desks);
  toast('Lagret i historikken 👍');
  rr();
}

function buildHistory(cls) {
  const list = store.history(cls.id);
  const box = h('div', {});
  if (snapshotView) {
    const snap = list.find(s => s.id === snapshotView);
    if (snap) {
      box.append(h('div', { class: 'toolbar no-print' },
        h('strong', {}, fmtDate(snap.at)),
        h('button', { class: 'btn', onclick: () => { snapshotView = null; rr(); } }, 'Tilbake'),
        h('button', { class: 'btn primary', onclick: () => {
          store.setChart(cls.id, { desks: clone(snap.desks) });
          tab = 'kart'; snapshotView = null;
          toast('Kartet er hentet inn – du kan endre og lagre det på nytt.');
          rr();
        } }, 'Bruk som utgangspunkt'),
        h('button', { class: 'btn danger', onclick: () => {
          if (confirm('Slette dette kartet fra historikken?')) {
            store.deleteSnapshot(cls.id, snap.id);
            snapshotView = null; rr();
          }
        } }, 'Slett')));
      box.append(renderBoard(snap.desks, cls, null));
      return box;
    }
    snapshotView = null;
  }
  if (!list.length) {
    box.append(h('div', { class: 'panel' },
      h('p', { class: 'muted' }, 'Ingen lagrede kart ennå. Lagre kartet fra Kart-fanen, så dukker det opp her – og «Fyll tilfeldig» bruker historikken til å unngå at de samme sitter sammen igjen.')));
    return box;
  }
  list.forEach(s => box.append(h('button', { class: 'hist-item', onclick: () => { snapshotView = s.id; rr(); } },
    h('span', {}, fmtDate(s.at)),
    h('span', { class: 'muted' }, `${s.desks.filter(d => d.sid).length} elever · ${s.desks.length} pulter`))));
  return box;
}

// chart == null gir et lesevisnings-brett (historikk).
function renderBoard(desks, cls, chart) {
  const interactive = !!chart;
  const nameOf = id => cls.students.find(s => s.id === id)?.name || '';
  // Tavla ligger nederst – kartet vises fra lærerens perspektiv, og flytter
  // seg lenger ned hvis pulter dras nedover.
  const H = Math.max(520, desks.reduce((m, d) => Math.max(m, d.y + DH), 0) + 130);
  const wrap = h('div', { class: 'board-wrap' + (interactive ? '' : ' readonly') });
  const board = h('div', { class: 'board', style: `width:${W}px;height:${H}px` });
  board.append(h('div', { class: 'board-front', style: `top:${H - 44}px` }, 'TAVLE'));
  for (const d of desks) {
    const name = d.sid ? nameOf(d.sid) : '';
    board.append(h('div', {
      class: 'desk' + (name ? '' : ' free') + (interactive && selected === d.id ? ' sel' : ''),
      'data-id': d.id,
      style: `left:${d.x}px;top:${d.y}px`,
    }, h('span', { class: 'desk-name' }, name || 'Ledig')));
  }
  wrap.append(board);
  if (interactive) attachPointer(board, desks, cls, chart);
  const fit = () => {
    const cw = wrap.clientWidth;
    if (!cw) return;
    const s = Math.min(1, cw / W);
    board.style.transform = `scale(${s})`;
    board._scale = s;
    wrap.style.height = Math.ceil(H * s) + 'px';
  };
  refit = fit;
  requestAnimationFrame(fit);
  return wrap;
}

// Magnetisk snapping: når en pult dras nær en annen, smetter den inntil
// kanten og retter seg inn etter naboen. Slippes den med litt avstand,
// blir den stående for seg selv.
const SNAP = 18;
function magnet(id, desks, x, y) {
  let outX = x, outY = y, bestDx = SNAP + 1, bestDy = SNAP + 1;
  let alignY = null, alignX = null;
  for (const o of desks) {
    if (o.id === id) continue;
    const nearBandY = y + DH > o.y - SNAP && y < o.y + DH + SNAP;
    const nearBandX = x + DW > o.x - SNAP && x < o.x + DW + SNAP;
    if (nearBandY) {
      const dRight = Math.abs(x - (o.x + DW));
      const dLeft = Math.abs((x + DW) - o.x);
      if (dRight < bestDx) { bestDx = dRight; outX = o.x + DW; alignY = o; }
      if (dLeft < bestDx) { bestDx = dLeft; outX = o.x - DW; alignY = o; }
    }
    if (nearBandX) {
      const dBottom = Math.abs(y - (o.y + DH));
      const dTop = Math.abs((y + DH) - o.y);
      if (dBottom < bestDy) { bestDy = dBottom; outY = o.y + DH; alignX = o; }
      if (dTop < bestDy) { bestDy = dTop; outY = o.y - DH; alignX = o; }
    }
  }
  const sx = bestDx <= SNAP, sy = bestDy <= SNAP;
  let rx = sx ? outX : x, ry = sy ? outY : y;
  if (sx && !sy && alignY && Math.abs(y - alignY.y) <= SNAP) ry = alignY.y;
  if (sy && !sx && alignX && Math.abs(x - alignX.x) <= SNAP) rx = alignX.x;
  return { x: rx, y: ry, snapped: sx || sy };
}

function attachPointer(board, desks, cls, chart) {
  let drag = null;
  board.addEventListener('pointerdown', e => {
    const el = e.target.closest('.desk');
    if (!el) { if (selected) { selected = null; rr(); } return; }
    const d = desks.find(x => x.id === el.dataset.id);
    if (!d) return;
    drag = { d, el, sx: e.clientX, sy: e.clientY, ox: d.x, oy: d.y, moved: false, snapped: false };
    try { el.setPointerCapture(e.pointerId); } catch { /* eldre Safari */ }
    e.preventDefault();
  });
  board.addEventListener('pointermove', e => {
    if (!drag) return;
    const s = board._scale || 1;
    const dx = (e.clientX - drag.sx) / s, dy = (e.clientY - drag.sy) / s;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 7) {
      drag.moved = true;
      drag.el.classList.add('dragging');
    }
    if (drag.moved) {
      const rawX = Math.min(Math.max(Math.round(drag.ox + dx), 0), W - DW);
      const rawY = Math.max(Math.round(drag.oy + dy), 8);
      const m = magnet(drag.d.id, desks, rawX, rawY);
      drag.d.x = Math.min(Math.max(m.x, 0), W - DW);
      drag.d.y = Math.max(m.y, 8);
      drag.snapped = m.snapped;
      drag.el.classList.toggle('snap', m.snapped);
      drag.el.style.left = drag.d.x + 'px';
      drag.el.style.top = drag.d.y + 'px';
    }
  });
  const up = () => {
    if (!drag) return;
    const { d, moved, snapped, ox, oy } = drag;
    drag = null;
    if (moved) {
      if (!snapped) {
        d.x = Math.round(d.x / 8) * 8;
        d.y = Math.round(d.y / 8) * 8;
      }
      const res = resolveCollision(d.id, desks, d.x, d.y);
      if (res) { d.x = res.x; d.y = res.y; }
      else { d.x = ox; d.y = oy; }
      store.setChart(cls.id, chart);
      rr();
    } else if (selected === null) {
      selected = d.id; rr();
    } else if (selected === d.id) {
      selected = null; rr();
    } else {
      const o = desks.find(x => x.id === selected);
      if (o) { const t = d.sid; d.sid = o.sid; o.sid = t; }
      selected = null;
      store.setChart(cls.id, chart);
      rr();
    }
  };
  board.addEventListener('pointerup', up);
  board.addEventListener('pointercancel', () => { drag = null; rr(); });
}
