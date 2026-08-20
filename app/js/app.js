import { store, onChange } from './store.js';
import { h, icon } from './ui.js';
import * as verktoy from './views/verktoy.js';
import * as kart from './views/kart.js';
import * as grupper from './views/grupper.js';
import * as trekker from './views/trekker.js';
import * as timer from './views/timer.js';
import * as timeplan from './views/timeplan.js';
import * as aktiviteter from './views/aktiviteter.js';
import * as tavle from './views/tavle.js';
import * as stoy from './views/stoy.js';
import * as stasjoner from './views/stasjoner.js';
import * as klasser from './views/klasser.js';

const views = { verktoy, kart, grupper, trekker, timer, timeplan, aktiviteter, tavle, stoy, stasjoner, klasser };
const TOOLS = new Set(['kart', 'grupper', 'trekker', 'timer', 'timeplan', 'aktiviteter', 'tavle', 'stoy', 'stasjoner']);
const TOOL_TABS = [
  ['kart', 'Kart'],
  ['grupper', 'Grupper'],
  ['trekker', 'Trekker'],
  ['timer', 'Timer'],
  ['tavle', 'Tavle'],
  ['stasjoner', 'Stasjoner'],
  ['stoy', 'Støy'],
  ['timeplan', 'Plan'],
  ['aktiviteter', 'Bank'],
];

const main = document.getElementById('view');
const picker = document.getElementById('classPicker');

function toolNav(active) {
  return h('div', { class: 'toolnav no-print' },
    h('a', { class: 'btn small', href: '#/verktoy' }, '‹ Verktøy'),
    h('div', { class: 'seg' }, TOOL_TABS.map(([route, label]) =>
      h('a', { class: 'seg-btn' + (route === active ? ' active' : ''), href: '#/' + route },
        icon(route), label))));
}

let lastKey = null;
const NAV_ORDER = ['verktoy', 'kart', 'grupper', 'trekker', 'timer', 'tavle', 'stasjoner', 'stoy', 'timeplan', 'aktiviteter', 'klasser'];

function route() {
  const name = location.hash.replace(/^#\//, '') || 'verktoy';
  const key = views[name] ? name : 'verktoy';
  const doRender = () => {
    const tab = TOOLS.has(key) ? 'verktoy' : key;
    document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    document.body.dataset.view = key;
    main.innerHTML = '';
    if (TOOLS.has(key)) main.append(toolNav(key));
    views[key].render(main);
  };
  // Rendringen skjer alltid synkront (View Transitions viste seg å kunne
  // utsette rendringen i skjulte faner). Myk innglidning i ren CSS i stedet,
  // kun ved faktisk fanebytte – ikke ved re-render i samme visning.
  const changed = key !== lastKey && lastKey !== null;
  const dir = NAV_ORDER.indexOf(key) >= NAV_ORDER.indexOf(lastKey) ? 'f' : 'b';
  lastKey = key;
  doRender();
  if (changed) {
    main.dataset.dir = dir;
    main.classList.remove('view-enter');
    void main.offsetWidth; // restart animasjonen
    main.classList.add('view-enter');
  }
}

function syncPicker() {
  const cs = store.classes();
  picker.innerHTML = '';
  if (!cs.length) {
    picker.append(new Option('Ingen klasser', ''));
    picker.disabled = true;
    return;
  }
  picker.disabled = false;
  cs.forEach(c => picker.append(new Option(c.name, c.id)));
  picker.value = store.currentClass()?.id ?? '';
}

picker.addEventListener('change', () => { store.setCurrentClass(picker.value); route(); });
window.addEventListener('hashchange', route);
window.addEventListener('lh:rerender', () => { syncPicker(); route(); });
window.addEventListener('afterprint', () => document.body.classList.remove('print-mode'));
onChange(syncPicker);

syncPicker();
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').then(reg => {
    // Ny versjon lastet ned i bakgrunnen -> gi beskjed i stedet for å vente
    // på neste innlasting i stillhet.
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          document.body.append(h('div', {
            class: 'toast show update-toast',
            role: 'status',
            onclick: () => location.reload(),
          }, '✨ Ny versjon er klar – trykk her for å oppdatere'));
        }
      });
    });
  }).catch(() => {});
}

// Be nettleseren om varig lagring – demper Safaris 7-dagers-sletting av
// data for sider som ikke besøkes på en stund.
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
