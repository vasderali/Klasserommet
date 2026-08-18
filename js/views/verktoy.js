import { store } from '../store.js';
import { h } from '../ui.js';

const TOOLS = [
  ['kart', '🪑', 'Klassekart', 'Plasser pulter, fyll tilfeldig med regler, historikk og utskrift.'],
  ['grupper', '👥', 'Grupper', 'Tilfeldige grupper som unngår de samme parene som sist.'],
  ['trekker', '🎲', 'Trekker', 'Trekk elevnavn – alle trekkes én gang før noen trekkes igjen.'],
  ['timer', '⏱️', 'Timer', 'Stor nedtelling for tavla og projektoren, med tavlemodus.'],
  ['timeplan', '📅', 'Timeplan', 'Ukeplan med fargekodede fag – for klassen eller hele trinnet.'],
  ['aktiviteter', '💡', 'Aktivitetsbank', 'Dine aktiviteter og opplegg – filtrer på fag, område og sted.'],
];

export function render(root) {
  const cls = store.currentClass();
  root.append(h('section', { class: 'view' },
    h('div', { class: 'view-head' },
      h('h2', {}, 'Verktøy'),
      cls && h('span', { class: 'muted' }, cls.name)),
    !cls && h('div', { class: 'panel' },
      h('p', {}, '👋 Velkommen! Legg inn en klasse under Klasser, så er alle verktøyene klare til bruk.')),
    h('div', { class: 'tool-grid' }, TOOLS.map(([route, ico, title, desc]) =>
      h('a', { class: 'tool-card panel', href: '#/' + route },
        h('span', { class: 'tool-ico' }, ico),
        h('span', { class: 'tool-info' },
          h('strong', {}, title),
          h('span', { class: 'muted small' }, desc)))))));
}
