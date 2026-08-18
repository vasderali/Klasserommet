import { store } from '../store.js';
import { h, icon, toast, rerenderView as rr } from '../ui.js';

const DEMO_NAVN = ['Emma', 'Noah', 'Olivia', 'Liam', 'Ella', 'Oskar', 'Maja', 'Aksel',
  'Sofie', 'Theo', 'Ingrid', 'Jakob', 'Nora', 'Elias', 'Selma', 'Henrik',
  'Ada', 'Magnus', 'Live', 'Sander', 'Tuva', 'Mathias', 'Frida', 'Johannes'];

const TOOLS = [
  ['kart', 'Klassekart', 'Plasser pulter, fyll tilfeldig med regler, historikk og utskrift.'],
  ['grupper', 'Grupper', 'Tilfeldige grupper som unngår de samme parene som sist.'],
  ['trekker', 'Trekker', 'Trekk elevnavn – alle trekkes én gang før noen trekkes igjen.'],
  ['timer', 'Timer', 'Stor nedtelling for tavla og projektoren, med tavlemodus.'],
  ['tavle', 'Dagens plan', 'Dagens økter fra timeplanen på storskjerm – med klokke og avhuking.'],
  ['stoy', 'Støymåler', 'Trafikklys for arbeidsro – lyden analyseres kun på enheten.'],
  ['timeplan', 'Timeplan', 'Ukeplan med fargekodede fag – for klassen eller hele trinnet.'],
  ['aktiviteter', 'Aktivitetsbank', 'Dine aktiviteter og opplegg – filtrer på fag, område og sted.'],
];

export function render(root) {
  const cls = store.currentClass();
  root.append(h('section', { class: 'view' },
    h('div', { class: 'view-head' },
      h('h2', {}, 'Verktøy'),
      cls && h('span', { class: 'muted' }, cls.name)),
    !cls && h('div', { class: 'panel' },
      h('p', {}, '👋 Velkommen! Legg inn en klasse under Klasser, så er alle verktøyene klare til bruk – eller ta en titt med en eksempelklasse først.'),
      h('div', { class: 'row wrap' },
        h('a', { class: 'btn primary', href: '#/klasser' }, 'Legg inn klassen min'),
        h('button', { class: 'btn', onclick: () => {
          store.addClass('7A (eksempel)', DEMO_NAVN);
          toast('Eksempelklasse med 24 fiktive navn er klar – slett den under Klasser når du vil.');
          rr();
        } }, '✨ Prøv med eksempelklasse'))),
    h('div', { class: 'tool-grid' }, TOOLS.map(([route, title, desc]) =>
      h('a', { class: 'tool-card panel', href: '#/' + route },
        h('span', { class: 'tool-ico' }, icon(route)),
        h('span', { class: 'tool-info' },
          h('strong', {}, title),
          h('span', { class: 'muted small' }, desc)))))));
}
