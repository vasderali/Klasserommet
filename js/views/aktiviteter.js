import { store } from '../store.js';
import { h, toast, rerenderView as rr } from '../ui.js';
import { STANDARD_FAG, fagColor } from '../fag.js';

const HVOR_FORSLAG = ['Klasserommet', 'Ute', 'Gymsal', 'Grupperom'];

let editing = null; // 'new' | aktivitets-id | null
let filterFag = null;
let filterOmrade = null;
let filterHvor = null;
let search = '';

export function render(root) {
  const acts = store.activities();
  const view = h('section', { class: 'view' },
    h('div', { class: 'view-head' },
      h('h2', {}, 'Aktivitetsbank'),
      h('button', { class: 'btn primary', onclick: () => { editing = editing === 'new' ? null : 'new'; rr(); } },
        '+ Ny aktivitet')));

  if (editing) view.append(editForm(acts.find(a => a.id === editing)));

  // Filterlinjer bygges av verdiene som faktisk er i bruk.
  const fags = [...new Set(acts.flatMap(a => a.fag || []))];
  const omrader = [...new Set(acts.map(a => a.omrade).filter(Boolean))];
  const steder = [...new Set(acts.map(a => a.hvor).filter(Boolean))];

  const searchInput = h('input', { class: 'input', placeholder: '🔍 Søk i aktivitetene …', value: search,
    oninput: e => { search = e.target.value; refreshList(); } });

  const filterChip = (label, value, current, setter, colored) =>
    h('button', {
      class: 'chip' + (current === value ? ' done' : ''),
      style: colored && current !== value ? `background:${fagColor(value)};border-color:transparent` : '',
      onclick: () => { setter(current === value ? null : value); rr(); },
    }, label);

  if (acts.length) {
    view.append(h('div', { class: 'panel' },
      searchInput,
      fags.length ? h('div', { class: 'chips' },
        h('span', { class: 'muted small filter-label' }, 'Fag:'),
        fags.map(f => filterChip(f, f, filterFag, v => { filterFag = v; }, true))) : null,
      omrader.length ? h('div', { class: 'chips' },
        h('span', { class: 'muted small filter-label' }, 'Område:'),
        omrader.map(o => filterChip(o, o, filterOmrade, v => { filterOmrade = v; }))) : null,
      steder.length ? h('div', { class: 'chips' },
        h('span', { class: 'muted small filter-label' }, 'Hvor:'),
        steder.map(s => filterChip('📍 ' + s, s, filterHvor, v => { filterHvor = v; }))) : null));
  } else if (!editing) {
    view.append(h('div', { class: 'panel' },
      h('p', {}, '💡 Her samler du aktiviteter og opplegg – navneleker, stasjoner, uteskoleopplegg, fem-minuttere. Legg inn tema, hvordan den gjennomføres, hvor og hvilket utstyr som trengs, så finner du den igjen med filter på fag og område.'),
      h('p', { class: 'muted small' }, 'Banken er personlig og lagres kun på denne enheten – del den med Eksporter/Importer under Klasser.')));
  }

  const listBox = h('div', {});
  view.append(listBox);

  function filtered() {
    const q = search.trim().toLowerCase();
    return store.activities().filter(a =>
      (!filterFag || (a.fag || []).includes(filterFag)) &&
      (!filterOmrade || a.omrade === filterOmrade) &&
      (!filterHvor || a.hvor === filterHvor) &&
      (!q || [a.tema, a.omrade, a.hvordan, a.hvor, a.utstyr, ...(a.fag || [])]
        .filter(Boolean).join(' ').toLowerCase().includes(q)));
  }

  function refreshList() {
    listBox.innerHTML = '';
    const list = filtered();
    if (acts.length && !list.length) {
      listBox.append(h('p', { class: 'muted center' }, 'Ingen aktiviteter matcher filteret.'));
      return;
    }
    list.forEach(a => listBox.append(card(a)));
  }

  function card(a) {
    return h('div', { class: 'panel act-card' },
      h('div', { class: 'row spread' },
        h('strong', { class: 'act-title' }, a.tema),
        h('button', { class: 'btn small', onclick: () => { editing = a.id; rr(); } }, 'Rediger')),
      h('div', { class: 'chips' },
        (a.fag || []).map(f => h('span', { class: 'chip static', style: `background:${fagColor(f)};border-color:transparent` }, f)),
        a.omrade && h('span', { class: 'chip static' }, a.omrade),
        a.hvor && h('span', { class: 'chip static' }, '📍 ' + a.hvor)),
      a.hvordan && h('p', { class: 'act-how' }, a.hvordan),
      a.utstyr && h('p', { class: 'muted small', style: 'margin:4px 0 0' }, '🎒 Utstyr: ' + a.utstyr));
  }

  refreshList();
  root.append(view);
}

// Skjemaet er bevisst frikoblet fra rr(): fag-chips oppdaterer seg selv, så
// tekst i feltene ikke går tapt underveis.
function editForm(existing) {
  const valgtFag = new Set(existing?.fag || []);
  const temaIn = h('input', { class: 'input', placeholder: 'Tema – f.eks. «Stafett med gangetabellen»', value: existing?.tema || '' });
  const omradeIn = h('input', { class: 'input', placeholder: 'Område – f.eks. «Tall og algebra», «Oppstart», «Lesing»', value: existing?.omrade || '', list: 'omrade-forslag' });
  const hvordanIn = h('textarea', { class: 'input', rows: 4, placeholder: 'Hvordan – kort beskrivelse av gjennomføringen' }, existing?.hvordan || '');
  const hvorIn = h('input', { class: 'input', placeholder: 'Hvor – f.eks. «Ute», «Gymsal», «Klasserommet»', value: existing?.hvor || '', list: 'hvor-forslag' });
  const utstyrIn = h('input', { class: 'input', placeholder: 'Utstyr – f.eks. «kjegler, terninger, oppgavekort»', value: existing?.utstyr || '' });

  const alleFag = [...new Set([...STANDARD_FAG, ...valgtFag])];
  const eksisterendeOmrader = [...new Set(store.activities().map(a => a.omrade).filter(Boolean))];

  return h('div', { class: 'panel form-col' },
    h('h3', {}, existing ? 'Rediger aktivitet' : 'Ny aktivitet'),
    temaIn,
    h('div', { class: 'chips' }, alleFag.map(f => {
      const chip = h('button', { class: 'chip' + (valgtFag.has(f) ? ' done' : ''), onclick: () => {
        valgtFag.has(f) ? valgtFag.delete(f) : valgtFag.add(f);
        chip.classList.toggle('done', valgtFag.has(f));
      } }, f);
      return chip;
    })),
    omradeIn,
    h('datalist', { id: 'omrade-forslag' }, eksisterendeOmrader.map(o => h('option', { value: o }))),
    hvordanIn,
    hvorIn,
    h('datalist', { id: 'hvor-forslag' }, HVOR_FORSLAG.map(s => h('option', { value: s }))),
    utstyrIn,
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn primary', onclick: () => {
        const tema = temaIn.value.trim();
        if (!tema) { toast('Gi aktiviteten et tema/navn.'); return; }
        const data = {
          tema,
          fag: [...valgtFag],
          omrade: omradeIn.value.trim(),
          hvordan: hvordanIn.value.trim(),
          hvor: hvorIn.value.trim(),
          utstyr: utstyrIn.value.trim(),
        };
        if (existing) store.updateActivity(existing.id, data);
        else store.addActivity(data);
        editing = null;
        toast(existing ? 'Aktiviteten er oppdatert.' : 'Aktiviteten er lagt i banken.');
        rr();
      } }, 'Lagre'),
      h('button', { class: 'btn', onclick: () => { editing = null; rr(); } }, 'Avbryt'),
      existing && h('button', { class: 'btn danger', onclick: () => {
        if (confirm(`Slette «${existing.tema}» fra banken?`)) {
          store.deleteActivity(existing.id);
          editing = null;
          rr();
        }
      } }, 'Slett')));
}
