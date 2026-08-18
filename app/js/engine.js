// Felles trekkemotor for klassekart og grupper: tilfeldige forsøk som skårer
// hvert utfall. «Ikke sammen»-regler er harde krav, gjentatte naboer/gruppepar
// fra historikken er myke krav som minimeres.

export function pairKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pulter regnes som naboer når sentrene er nær nok til at elevene sitter
// inntil hverandre (side om side, rett foran/bak eller i samme firergruppe).
export function deskNeighborPairs(desks, maxDist = 150) {
  const out = [];
  for (let i = 0; i < desks.length; i++) {
    for (let j = i + 1; j < desks.length; j++) {
      const a = desks[i], b = desks[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) <= maxDist) out.push([a.id, b.id]);
    }
  }
  return out;
}

// historyDesks: tidligere kart (nyeste først) – de tre siste teller, med
// synkende vekt, slik at ferske nabopar unngås sterkest.
export function assignSeats(students, desks, apartPairs, historyDesks) {
  const neigh = deskNeighborPairs(desks);
  const apart = new Set((apartPairs || []).map(([a, b]) => pairKey(a, b)));
  const past = new Map();
  (historyDesks || []).slice(0, 3).forEach((snap, idx) => {
    const w = 3 - idx;
    const byId = Object.fromEntries(snap.map(d => [d.id, d]));
    deskNeighborPairs(snap).forEach(([da, db]) => {
      const sa = byId[da].sid, sb = byId[db].sid;
      if (sa && sb) { const k = pairKey(sa, sb); past.set(k, (past.get(k) || 0) + w); }
    });
  });

  let best = null, bestScore = Infinity, bestHard = 0;
  for (let t = 0; t < 600; t++) {
    const order = shuffle(students.map(s => s.id));
    const sit = {};
    desks.forEach((d, i) => { sit[d.id] = order[i] ?? null; });
    let hard = 0, soft = 0;
    for (const [da, db] of neigh) {
      const a = sit[da], b = sit[db];
      if (!a || !b) continue;
      const k = pairKey(a, b);
      if (apart.has(k)) hard++;
      soft += past.get(k) || 0;
    }
    const score = hard * 1000 + soft;
    if (score < bestScore) {
      bestScore = score; best = sit; bestHard = hard;
      if (score === 0) break;
    }
  }
  return { seating: best, hard: bestHard };
}

// historySets: tidligere grupperunder (nyeste først) – de fem siste teller.
export function makeGroups(students, opt, apartPairs, historySets) {
  const ids = students.map(s => s.id);
  const n = ids.length;
  if (!n) return { groups: [], hard: 0 };
  const count = opt.mode === 'count'
    ? Math.max(1, Math.min(opt.value, n))
    : Math.max(1, Math.round(n / opt.value));

  const apart = new Set((apartPairs || []).map(([a, b]) => pairKey(a, b)));
  const past = new Map();
  (historySets || []).slice(0, 5).forEach((set, idx) => {
    const w = 5 - idx;
    set.groups.forEach(g => {
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) {
          const k = pairKey(g[i], g[j]);
          past.set(k, (past.get(k) || 0) + w);
        }
      }
    });
  });

  let best = null, bestScore = Infinity, bestHard = 0;
  for (let t = 0; t < 500; t++) {
    const order = shuffle(ids);
    const groups = Array.from({ length: count }, () => []);
    order.forEach((id, i) => groups[i % count].push(id));
    let hard = 0, soft = 0;
    groups.forEach(g => {
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) {
          const k = pairKey(g[i], g[j]);
          if (apart.has(k)) hard++;
          soft += past.get(k) || 0;
        }
      }
    });
    const score = hard * 1000 + soft;
    if (score < bestScore) {
      bestScore = score; best = groups; bestHard = hard;
      if (score === 0) break;
    }
  }
  return { groups: best, hard: bestHard };
}
