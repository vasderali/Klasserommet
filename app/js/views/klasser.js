import { store } from '../store.js';
import { h, toast, rerenderView as rr } from '../ui.js';
import { pairKey } from '../engine.js';

let adding = false;
let editId = null;

export function render(root) {
  const classes = store.classes();
  if (!classes.length) adding = true;
  const view = h('section', { class: 'view' },
    h('div', { class: 'view-head' },
      h('h2', {}, 'Klasser'),
      h('button', { class: 'btn primary', onclick: () => { adding = !adding; editId = null; rr(); } }, '+ Ny klasse')));
  if (adding) view.append(addForm(classes.length === 0));
  classes.forEach(c => view.append(editId === c.id ? editCard(c) : classCard(c)));
  view.append(dataPanel());
  root.append(view);
}

// Tåler innliming fra Excel/itslearning: fjerner nummerering og tomme linjer.
function parseNames(text) {
  return text.split(/\r?\n/)
    .map(s => s.replace(/^\s*\d+[.)]?\s*/, '').trim())
    .filter(Boolean);
}

function addForm(first) {
  const nameIn = h('input', { class: 'input', 'aria-label': 'Navn på klassen', placeholder: 'Navn på klassen, f.eks. 9B' });
  const ta = h('textarea', { class: 'input', rows: 8, 'aria-label': 'Elevnavn, ett per linje', placeholder: 'Ett navn per linje – lim gjerne inn hele klasselista fra Excel eller itslearning.' });
  return h('div', { class: 'panel form-col' },
    first && h('p', {}, '👋 Velkommen! Legg inn den første klassen din, så er alle verktøyene klare til bruk.'),
    nameIn, ta,
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: () => {
        const nm = nameIn.value.trim();
        if (!nm) { toast('Gi klassen et navn.'); return; }
        const names = parseNames(ta.value);
        store.addClass(nm, names);
        adding = false;
        toast(names.length ? `«${nm}» opprettet med ${names.length} elever.` : `«${nm}» opprettet.`);
        rr();
      } }, 'Lagre klassen'),
      h('button', { class: 'btn', onclick: () => { adding = false; rr(); } }, 'Avbryt')));
}

function classCard(c) {
  return h('div', { class: 'panel row spread' },
    h('div', {},
      h('strong', {}, c.name),
      h('div', { class: 'muted small' }, `${c.students.length} elever · ${(c.apart || []).length} regler`)),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => { editId = c.id; adding = false; rr(); } }, 'Rediger'),
      h('button', { class: 'btn danger', onclick: () => {
        if (confirm(`Slette klassen «${c.name}»? Kart og historikk slettes også.`)) { store.deleteClass(c.id); rr(); }
      } }, 'Slett')));
}

function editCard(c) {
  const nameIn = h('input', { class: 'input', value: c.name,
    onchange: e => store.renameClass(c.id, e.target.value.trim() || c.name) });
  const addIn = h('textarea', { class: 'input', rows: 2, placeholder: 'Legg til elever – ett navn per linje' });
  const selA = h('select', { class: 'input', 'aria-label': 'Første elev i regelen' }, c.students.map(s => h('option', { value: s.id }, s.name)));
  const selB = h('select', { class: 'input', 'aria-label': 'Andre elev i regelen' }, c.students.map(s => h('option', { value: s.id }, s.name)));
  const nameOf = id => c.students.find(s => s.id === id)?.name || '?';
  return h('div', { class: 'panel form-col' },
    h('div', { class: 'row spread' },
      h('h3', {}, 'Rediger klasse'),
      h('button', { class: 'btn primary', onclick: () => { editId = null; rr(); } }, 'Ferdig')),
    nameIn,
    h('div', { class: 'chips' }, c.students.map(s =>
      h('button', { class: 'chip', onclick: () => {
        if (confirm(`Fjerne ${s.name} fra klassen?`)) { store.removeStudent(c.id, s.id); rr(); }
      } }, s.name + ' ✕'))),
    h('div', { class: 'row' },
      addIn,
      h('button', { class: 'btn', onclick: () => {
        const names = parseNames(addIn.value);
        if (!names.length) return;
        store.addStudents(c.id, names);
        rr();
      } }, 'Legg til')),
    h('h4', {}, 'Regler: skal ikke sitte eller være i gruppe sammen'),
    c.students.length < 2
      ? h('p', { class: 'muted' }, 'Legg til minst to elever for å lage regler.')
      : h('div', { class: 'row wrap' },
          selA, h('span', {}, 'og'), selB,
          h('button', { class: 'btn', onclick: () => {
            const a = selA.value, b = selB.value;
            if (a === b) { toast('Velg to forskjellige elever.'); return; }
            if ((c.apart || []).some(([x, y]) => pairKey(x, y) === pairKey(a, b))) { toast('Regelen finnes allerede.'); return; }
            store.addRule(c.id, a, b);
            rr();
          } }, 'Legg til regel')),
    (c.apart || []).length ? h('div', { class: 'rules' }, c.apart.map(([a, b], i) =>
      h('div', { class: 'rule row spread' },
        h('span', {}, `${nameOf(a)} ↔ ${nameOf(b)}`),
        h('button', { class: 'btn small', 'aria-label': `Fjern regelen ${nameOf(a)} og ${nameOf(b)}`, onclick: () => { store.removeRule(c.id, i); rr(); } }, '✕')))) : null);
}

function dataPanel() {
  const fileIn = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none',
    onchange: e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        if (!confirm('Importere sikkerhetskopien? Dette ERSTATTER alle data på denne enheten.')) { e.target.value = ''; return; }
        try { store.importJson(r.result); toast('Data importert.'); rr(); }
        catch { alert('Kunne ikke lese filen – er det en sikkerhetskopi fra Klasserommet?'); }
      };
      r.readAsText(f);
    } });
  const meta = store.meta();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const needBackup = (meta.changes || 0) >= 25 ||
    (meta.lastExportAt > 0 && Date.now() - meta.lastExportAt > THIRTY_DAYS && (meta.changes || 0) > 0);
  return h('div', { class: 'panel' },
    h('h3', {}, 'Dine data'),
    h('p', { class: 'muted' }, 'Alt lagres kun lokalt på denne enheten – ingenting sendes til noen server. Ta en sikkerhetskopi i blant, eller bruk den til å flytte alt til en annen enhet.'),
    needBackup && h('div', { class: 'contextbar' },
      h('span', {}, '💾 Det har skjedd mye siden forrige sikkerhetskopi – ta en eksport, så er du trygg om noe skulle skje med enheten.')),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn', onclick: exportData }, '⬇️ Eksporter sikkerhetskopi'),
      h('button', { class: 'btn', onclick: () => fileIn.click() }, '⬆️ Importer'),
      fileIn,
      h('button', { class: 'btn danger', onclick: () => {
        if (confirm('Slette ALLE data? Klasser, kart og historikk forsvinner.') &&
            confirm('Helt sikker? Dette kan ikke angres.')) { store.wipe(); rr(); }
      } }, 'Slett alle data')));
}

function exportData() {
  const blob = new Blob([store.exportJson()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'klasserommet-sikkerhetskopi.json';
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  store.markExported();
  rr();
}
