import { store } from '../store.js';
import { h, fmtDate, toast, emptyState, rerenderView as rr } from '../ui.js';

// Klasseromsjobber: faste jobber som roterer rettferdig. Trekningen
// prioriterer elever som har ventet lengst, og unngår at noen får samme
// jobb som sist.

const FORSLAG = ['Ordenselev', 'Dele ut bøker', 'Vanne plantene', 'Vaske tavla', 'Lysansvarlig', 'Hente melk'];

export function render(root) {
  const cls = store.currentClass();
  if (!cls) { root.append(emptyState('Lag en klasse først, så kan du sette opp klasseromsjobber.', '🧹')); return; }
  const jobs = store.jobs(cls.id);
  const valid = new Set(cls.students.map(s => s.id));
  const nameOf = id => cls.students.find(s => s.id === id)?.name;
  const current = jobs.rounds[0];

  const nyJobbIn = h('input', { class: 'input', placeholder: 'Ny jobb – f.eks. «Ordenselev»', list: 'jobb-forslag' });

  const view = h('section', { class: 'view' },
    h('div', { class: 'view-head no-print' },
      h('h2', {}, 'Klasseromsjobber'),
      h('div', { class: 'row wrap' },
        jobs.list.length > 0 && h('button', { class: 'btn primary', onclick: () => draw(cls) }, '🔄 Ny runde'),
        current && h('button', { class: 'btn', onclick: () => {
          document.body.classList.add('print-mode');
          window.print();
        } }, '🖨 Skriv ut'))));

  // Jobblista
  view.append(h('div', { class: 'panel no-print form-col' },
    h('h3', {}, 'Jobbene'),
    jobs.list.length ? h('div', { class: 'chips' }, jobs.list.map((navn, i) =>
      h('button', { class: 'chip', 'aria-label': `Fjern jobben ${navn}`, onclick: () => {
        if (confirm(`Fjerne jobben «${navn}»?`)) {
          jobs.list.splice(i, 1);
          store.saveJobs(cls.id);
          rr();
        }
      } }, navn + ' ✕')))
      : h('p', { class: 'muted' }, 'Legg inn jobbene i klassen, så fordeles de rettferdig – de som har ventet lengst, står først i køen.'),
    h('div', { class: 'row' },
      nyJobbIn,
      h('datalist', { id: 'jobb-forslag' }, FORSLAG.filter(f => !jobs.list.includes(f)).map(f => h('option', { value: f }))),
      h('button', { class: 'btn', onclick: () => {
        const navn = nyJobbIn.value.trim();
        if (!navn) return;
        if (jobs.list.includes(navn)) { toast('Jobben finnes allerede.'); return; }
        jobs.list.push(navn);
        store.saveJobs(cls.id);
        rr();
      } }, 'Legg til'))));

  // Gjeldende runde
  if (current) {
    view.append(h('div', { class: 'print-caption' }, `${cls.name} · klasseromsjobber · ${fmtDate(current.at)}`));
    view.append(h('div', { class: 'panel' },
      h('div', { class: 'row spread no-print' },
        h('h3', {}, 'Denne runden'),
        h('span', { class: 'muted small' }, `Satt ${fmtDate(current.at)} · runde ${jobs.rounds.length}`)),
      h('div', { class: 'jobb-liste' }, current.assign.map(([jobb, sid]) =>
        h('div', { class: 'jobb-rad' },
          h('span', { class: 'jobb-navn' }, jobb),
          h('span', { class: 'jobb-elev' }, valid.has(sid) ? nameOf(sid) : '–'))))));
  }
  root.append(view);
}

// Vektet trekning: lenge siden sist jobb = først i køen; samme jobb som
// forrige gang straffes ekstra.
function draw(cls) {
  const jobs = store.jobs(cls.id);
  if (!jobs.list.length) { toast('Legg til minst én jobb først.'); return; }
  if (!cls.students.length) { toast('Klassen har ingen elever.'); return; }

  const lastRoundOf = {};  // sid -> hvor mange runder siden sist (1 = forrige)
  const lastJobOf = {};    // sid -> jobbnavn sist
  jobs.rounds.forEach((r, idx) => {
    r.assign.forEach(([jobb, sid]) => {
      if (lastRoundOf[sid] === undefined) {
        lastRoundOf[sid] = idx + 1;
        lastJobOf[sid] = jobb;
      }
    });
  });

  const n = jobs.list.length;
  let best = null, bestScore = Infinity;
  for (let t = 0; t < 400; t++) {
    const order = [...cls.students.map(s => s.id)];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const chosen = order.slice(0, n);
    let score = 0;
    chosen.forEach((sid, i) => {
      const siden = lastRoundOf[sid];
      if (siden === 1) score += 10;
      else if (siden === 2) score += 5;
      else if (siden === 3) score += 2;
      if (lastJobOf[sid] === jobs.list[i]) score += 3;
    });
    if (score < bestScore) {
      bestScore = score;
      best = chosen;
      if (score === 0) break;
    }
  }

  jobs.rounds.unshift({
    id: store.uid(),
    at: Date.now(),
    assign: jobs.list.map((jobb, i) => [jobb, best[i] ?? null]),
  });
  store.saveJobs(cls.id);
  toast('Ny jobbrunde er klar! 🧹');
  rr();
}
