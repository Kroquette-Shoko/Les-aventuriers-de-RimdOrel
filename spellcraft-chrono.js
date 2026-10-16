// ============================================================
// SPELLCRAFT — Chrono de mesure réseau (outil de diagnostic)
// ============================================================
// Sert à MESURER la fluidité d'une partie avant de décider d'un chantier
// (websockets, état allégé...). N'a AUCUN effet sur le jeu :
//  - désactivé par défaut (aucun calcul, aucun affichage) ;
//  - activé en ajoutant ?chrono=1 à l'adresse de la partie
//    (le réglage est mémorisé ; ?chrono=0 pour le couper).
//
// Ce que le chrono relève (en millisecondes) :
//  - "action:<nom>"    : durée d'un appel au serveur (aller-retour complet)
//                        + taille de la réponse en Ko.
//  - "clic → état"     : temps entre l'envoi d'une de VOS actions et
//                        l'affichage de l'état à jour chez vous.
//  - "diffusion → état": temps entre la réception du signal "l'état a
//                        changé" et l'affichage (= attente du joueur qui
//                        REGARDE l'adversaire jouer).
//  - "affichage"       : durée du dessin de l'écran seul (render).
// ============================================================
(function () {
  'use strict';

  let enabled = false;
  let q = null;
  try { q = new URLSearchParams(location.search).get('chrono'); } catch (e) { /* ignoré */ }
  try {
    if (q === '1') localStorage.setItem('gsChrono', '1');
    if (q === '0') localStorage.removeItem('gsChrono');
    enabled = localStorage.getItem('gsChrono') === '1';
  } catch (e) { enabled = (q === '1'); } // stockage indisponible : on se fie à l'adresse seule

  const MAX_PER_METRIC = 500;
  const data = {};          // nom -> { t: [ms...], kb: [Ko...] }
  let pendingOwnActionAt = null; // moment d'envoi de la dernière action de ce joueur
  let panel = null, body = null;

  function record(name, ms, kb) {
    if (!enabled) return;
    const m = data[name] || (data[name] = { t: [], kb: [] });
    m.t.push(ms);
    if (typeof kb === 'number') m.kb.push(kb);
    if (m.t.length > MAX_PER_METRIC) { m.t.shift(); if (m.kb.length > MAX_PER_METRIC) m.kb.shift(); }
    schedulePaint();
  }

  const sorted = (a) => a.slice().sort((x, y) => x - y);
  function pct(a, p) {
    if (!a.length) return null;
    const s = sorted(a);
    return s[Math.min(s.length - 1, Math.floor(p * s.length))];
  }
  const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const f = (v, d = 0) => v == null ? '–' : v.toFixed(d);

  function summary() {
    return Object.keys(data).sort().map((name) => {
      const m = data[name];
      return {
        mesure: name, n: m.t.length,
        mediane_ms: pct(m.t, 0.5), p95_ms: pct(m.t, 0.95), max_ms: m.t.length ? Math.max.apply(null, m.t) : null,
        taille_moy_ko: avg(m.kb)
      };
    });
  }

  // ---------- Points d'entrée appelés par spellcraft-server-client.js ----------
  const api = {
    get enabled() { return enabled; },
    now: () => performance.now(),
    // Fin d'un appel serveur
    onCall(action, startedAt, result) {
      if (!enabled) return;
      let kb = null;
      try { kb = JSON.stringify(result).length / 1024; } catch (e) { /* ignoré */ }
      record('action:' + action, performance.now() - startedAt, kb);
    },
    // Une action de jeu de CE joueur part vers le serveur
    onOwnActionSent(action, startedAt) {
      if (!enabled || action === 'getState') return;
      pendingOwnActionAt = startedAt;
    },
    // Signal "l'état a changé" reçu
    onBroadcastReceived() { return enabled ? performance.now() : 0; },
    // Etat à jour affiché (render terminé) ; renderMs = durée du callback
    onStateDisplayed(broadcastAt, renderMs) {
      if (!enabled) return;
      const nowT = performance.now();
      record('affichage (render)', renderMs);
      record('diffusion → état affiché', nowT - broadcastAt);
      if (pendingOwnActionAt != null) {
        record('clic → état affiché (vous)', nowT - pendingOwnActionAt);
        pendingOwnActionAt = null;
      }
    },
    summary,
    reset() { Object.keys(data).forEach((k) => delete data[k]); pendingOwnActionAt = null; paint(); },
    toCSV() {
      const rows = [['mesure', 'n', 'mediane_ms', 'p95_ms', 'max_ms', 'taille_moy_ko']];
      summary().forEach((s) => rows.push([s.mesure, s.n, f(s.mediane_ms, 1), f(s.p95_ms, 1), f(s.max_ms, 1), f(s.taille_moy_ko, 1)]));
      return rows.map((r) => r.join(';')).join('\n');
    },
    toJSON() { return JSON.stringify({ date: new Date().toISOString(), resume: summary(), brut: data }, null, 1); }
  };
  window.GS_CHRONO = api;

  // ---------- Panneau d'affichage ----------
  let paintTimer = null;
  function schedulePaint() { if (paintTimer) return; paintTimer = setTimeout(() => { paintTimer = null; paint(); }, 500); }

  function paint() {
    if (!enabled || !body) return;
    const rows = summary();
    body.innerHTML = rows.length ? (
      '<table><tr><th>mesure</th><th>n</th><th>méd.</th><th>p95</th><th>max</th><th>Ko</th></tr>' +
      rows.map((s) => '<tr><td>' + s.mesure + '</td><td>' + s.n + '</td><td>' + f(s.mediane_ms) + '</td><td>' + f(s.p95_ms) + '</td><td>' + f(s.max_ms) + '</td><td>' + f(s.taille_moy_ko) + '</td></tr>').join('') +
      '</table>'
    ) : '<div style="padding:6px">Aucune mesure pour l\'instant. Jouez une action.</div>';
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  function buildPanel() {
    if (!enabled || panel) return;
    panel = document.createElement('div');
    panel.id = 'gs-chrono';
    panel.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99999;font:11px/1.3 monospace;background:rgba(10,10,20,.92);color:#dfe;border:1px solid #4a6;border-radius:6px;max-width:92vw;';
    panel.innerHTML =
      '<style>#gs-chrono table{border-collapse:collapse}#gs-chrono td,#gs-chrono th{padding:2px 6px;text-align:right;white-space:nowrap}#gs-chrono td:first-child,#gs-chrono th:first-child{text-align:left}#gs-chrono button{font:11px monospace;margin:3px;padding:2px 6px;cursor:pointer}</style>' +
      '<div id="gs-chrono-bar" style="padding:3px 6px;cursor:pointer;color:#8f8">⏱ Chrono réseau (clic = replier) — ms</div>' +
      '<div id="gs-chrono-body" style="max-height:40vh;overflow:auto"></div>' +
      '<div id="gs-chrono-btns"><button data-a="copy">Copier (JSON)</button><button data-a="csv">Télécharger CSV</button><button data-a="reset">Remise à zéro</button></div>';
    document.body.appendChild(panel);
    body = panel.querySelector('#gs-chrono-body');
    const btns = panel.querySelector('#gs-chrono-btns');
    panel.querySelector('#gs-chrono-bar').onclick = () => {
      const hide = body.style.display !== 'none';
      body.style.display = hide ? 'none' : ''; btns.style.display = hide ? 'none' : '';
    };
    btns.onclick = (e) => {
      const a = e.target && e.target.getAttribute('data-a');
      if (a === 'copy') { try { navigator.clipboard.writeText(api.toJSON()); } catch (er) { download('chrono.json', api.toJSON(), 'application/json'); } }
      if (a === 'csv') download('chrono.csv', api.toCSV(), 'text/csv');
      if (a === 'reset') api.reset();
    };
    paint();
  }

  if (enabled) {
    if (document.body) buildPanel(); else document.addEventListener('DOMContentLoaded', buildPanel);
  }
})();
