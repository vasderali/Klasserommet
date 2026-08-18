import { store, onChange } from './store.js';
import { h } from './ui.js';
import * as verktoy from './views/verktoy.js';
import * as kart from './views/kart.js';
import * as grupper from './views/grupper.js';
import * as trekker from './views/trekker.js';
import * as timer from './views/timer.js';
import * as timeplan from './views/timeplan.js';
import * as aktiviteter from './views/aktiviteter.js';
import * as klasser from './views/klasser.js';

const views = { verktoy, kart, grupper, trekker, timer, timeplan, aktiviteter, klasser };
const TOOLS = new Set(['kart', 'grupper', 'trekker', 'timer', 'timeplan', 'aktiviteter']);
const TOOL_TABS = [
  ['kart', '🪑 Kart'],
  ['grupper', '👥 Grupper'],
  ['trekker', '🎲 Trekker'],
  ['timer', '⏱️ Timer'],
  ['timeplan', '📅 Plan'],
  ['aktiviteter', '💡 Bank'],
];

const main = document.getElementById('view');
const picker = document.getElementById('classPicker');

function toolNav(active) {
  return h('div', { class: 'toolnav no-print' },
    h('a', { class: 'btn small', href: '#/verktoy' }, '‹ Verktøy'),
    h('div', { class: 'seg' }, TOOL_TABS.map(([route, label]) =>
      h('a', { class: 'seg-btn' + (route === active ? ' active' : ''), href: '#/' + route }, label))));
}

let lastKey = null;

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
  lastKey = key;
  doRender();
  if (changed) {
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
  navigator.serviceWorker.register('sw.js');
}
