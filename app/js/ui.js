export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}

export const clone = x => JSON.parse(JSON.stringify(x));

// Ikon fra spriten i index.html, f.eks. icon('kart').
export function icon(name, cls = 'icon') {
  const NS = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('class', cls);
  s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(NS, 'use');
  u.setAttribute('href', '#i-' + name);
  s.append(u);
  return s;
}

export function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' kl. ' + d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

export function toast(msg) {
  document.querySelectorAll('.toast:not(.update-toast)').forEach(t => t.remove());
  const t = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }, msg);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
}

export function segBtn(label, active, onclick) {
  return h('button', { class: 'seg-btn' + (active ? ' active' : ''), onclick }, label);
}

export function emptyState(msg) {
  return h('div', { class: 'empty panel' },
    h('div', { class: 'empty-icon', 'aria-hidden': 'true' }, '📋'),
    h('p', {}, msg),
    h('a', { class: 'btn primary', href: '#/klasser' }, 'Gå til Klasser'));
}

export function rerenderView() { window.dispatchEvent(new Event('lh:rerender')); }
