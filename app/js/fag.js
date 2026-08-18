// Delte fagdefinisjoner: brukes av timeplanen og aktivitetsbanken, slik at
// samme fag alltid har samme farge overalt i appen.

export const STANDARD_FAG = ['Matematikk', 'Norsk', 'Engelsk', 'Naturfag', 'Samfunnsfag',
  'KRLE', 'Kroppsøving', 'Musikk', 'Kunst og håndverk', 'Mat og helse'];

const FAG_FARGER = {
  'matematikk': '#cfe3f7',
  'norsk': '#f7d8d2',
  'engelsk': '#e7d9f5',
  'naturfag': '#d5eed4',
  'samfunnsfag': '#f5e9c6',
  'krle': '#e9e1d1',
  'kroppsøving': '#ffddba',
  'gym': '#ffddba',
  'musikk': '#f9d2e6',
  'kunst og håndverk': '#d7f0ea',
  'mat og helse': '#f1e5c0',
  'uteskole': '#dcf0c9',
};

// Ukjente fag får en stabil farge utledet av navnet.
export function fagColor(name) {
  const key = name.trim().toLowerCase();
  if (FAG_FARGER[key]) return FAG_FARGER[key];
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${hash} 45% 86%)`;
}
