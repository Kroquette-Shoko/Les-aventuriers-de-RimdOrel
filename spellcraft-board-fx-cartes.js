// ============================================================
// SPELLCRAFT — Effets visuels des créatures et artefacts (panoplie BFX2)
// ============================================================
// Couche visuelle uniquement : éléments flottants (position:fixed) supprimés en
// fin d'animation. Chaque effet a sa couleur :
//   Déclenchement = or (contour d'or)        Arrivée = cyan (onde hexagonale)
//   Assaut = rouge (cri de guerre)           Final = violet pâle (braise finale)
//   Cycle = vert (spirale vers le deck)      Continu = bleu (aura)
// Respecte le mode « Instantané » (combatInstant), « réduire les animations »
// et la vitesse choisie (cms), comme spellcraft-board-fx.js.
//
// Utilisé par le journal du plateau (js/board/02-etat-et-journal.js) avec le
// champ `trigger` des entrées de journal (nom du déclencheur de la capacité).
// ============================================================
(function () {
  'use strict';
  const COL = { trig: '#ffd34a', arr: '#5fe3ff', ass: '#ff5a4a', fin: '#c9a8ff', cyc: '#5fe08a', con: '#6fb0ff' };

  function reduced() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  function off() {
    try { if (typeof combatInstant === 'function' && combatInstant()) return true; } catch (e) { /* ignoré */ }
    return reduced();
  }
  function ms(v) { try { return typeof cms === 'function' ? cms(v) : v; } catch (e) { return v; } }
  function later(fn, t) { return setTimeout(fn, t); }
  function wait(t) { return new Promise((r) => setTimeout(r, t)); }

  // Déclencheur du moteur -> famille d'effet. onCycle n'en a pas (le cycle a sa propre entrée).
  function kindOf(trigger) {
    if (!trigger || trigger === 'onCycle') return null;
    if (trigger === 'onPlay') return 'arr';
    if (trigger === 'onAttack') return 'ass';
    if (trigger === 'onDeath' || trigger === 'onDestroyed') return 'fin';
    return 'trig';
  }

  // ---------- Outils ----------
  function fx(css, html, life) {
    const e = document.createElement('div');
    e.style.cssText = 'position:fixed;pointer-events:none;z-index:9993;' + css;
    if (html) e.innerHTML = html;
    document.body.appendChild(e);
    setTimeout(() => e.remove(), life || ms(2200));
    return e;
  }
  // Élément DOM ou rectangle simple -> {x,y,w,h,cx,cy}
  function R(t) {
    const a = t.getBoundingClientRect ? t.getBoundingClientRect() : t;
    const x = a.left, y = a.top, w = a.width, h = a.height;
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  }
  function glow(el, col, dur, k) {
    if (!el || !el.animate) return;
    try { el.animate([{ boxShadow: '0 0 0 0 ' + col + '00' }, { boxShadow: '0 0 ' + k + 'px ' + (k / 4) + 'px ' + col, offset: 0.35 }, { boxShadow: '0 0 0 0 ' + col + '00' }], { duration: ms(dur) }); } catch (e) { /* ignoré */ }
  }
  function ring(r, col, delay, sc, ell) {
    const w = r.w * 1.1, h = ell ? r.w * 0.3 : r.w * 1.1, y = ell ? r.y + r.h - h / 2 : r.cy - h / 2;
    const e = fx('left:' + (r.cx - w / 2) + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;border-radius:50%;border:3px solid ' + col + ';box-shadow:0 0 14px ' + col);
    e.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, offset: 0.15 }, { opacity: 0, transform: 'scale(' + sc + ')' }], { duration: ms(750), delay: ms(delay), fill: 'both', easing: 'ease-out' });
  }
  function spark(x, y, col, sz, dx, dy, dur, delay) {
    const e = fx('left:' + (x - sz / 2) + 'px;top:' + (y - sz / 2) + 'px;width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:' + col + ';box-shadow:0 0 ' + (sz * 2) + 'px ' + col);
    e.animate([{ opacity: 0, transform: 'none' }, { opacity: 1, offset: 0.15 }, { opacity: 0, transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.3)' }], { duration: ms(dur), delay: ms(delay || 0), fill: 'both', easing: 'ease-out' });
  }
  function svgBox(r, inner, pad) {
    pad = pad || 0;
    return fx('left:' + (r.x - pad) + 'px;top:' + (r.y - pad) + 'px;width:' + (r.w + pad * 2) + 'px;height:' + (r.h + pad * 2) + 'px',
      '<svg viewBox="0 0 ' + (r.w + pad * 2) + ' ' + (r.h + pad * 2) + '" width="100%" height="100%" style="overflow:visible">' + inner + '</svg>');
  }
  const isEl = (t) => !!(t && t.nodeType === 1);

  // ---------- Déclenchement : contour d'or ----------
  function trig(t) {
    const r = R(t), c = COL.trig, per = 2 * (r.w + r.h);
    const s = svgBox(r, '<rect x="1.5" y="1.5" width="' + (r.w - 3) + '" height="' + (r.h - 3) + '" rx="9" fill="none" stroke="' + c + '" stroke-width="3.5" stroke-dasharray="' + per + '" stroke-dashoffset="' + per + '" style="filter:drop-shadow(0 0 6px ' + c + ')"><animate attributeName="stroke-dashoffset" from="' + per + '" to="0" dur="' + (ms(500) / 1000) + 's" fill="freeze"/></rect>');
    s.animate([{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: ms(900), fill: 'both' });
    setTimeout(() => {
      if (isEl(t)) glow(t, c, 500, 30);
      const f = fx('left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px;border-radius:9px;background:' + c);
      f.animate([{ opacity: 0.7 }, { opacity: 0 }], { duration: ms(400), fill: 'both' });
    }, ms(480));
    return wait(ms(700));
  }

  // ---------- Arrivée : onde hexagonale ----------
  function arr(t) {
    const r = R(t), c = COL.arr, hex = '50,0 93,25 93,75 50,100 7,75 7,25';
    const sz = Math.max(r.w, 70) * 0.95;
    [0, 150, 300].forEach((d, i) => {
      const s = fx('left:' + (r.cx - sz / 2) + 'px;top:' + (r.cy - sz / 2) + 'px;width:' + sz + 'px;height:' + sz + 'px',
        '<svg viewBox="0 0 100 100" width="100%" height="100%"><polygon points="' + hex + '" fill="' + c + (i ? '00' : '22') + '" stroke="' + c + '" stroke-width="' + (3 - i * 0.6) + '" style="filter:drop-shadow(0 0 6px ' + c + ')"/></svg>');
      s.animate([{ opacity: 1, transform: 'scale(.4) rotate(0)' }, { opacity: 0, transform: 'scale(' + (2.8 + i * 0.6) + ') rotate(30deg)' }], { duration: ms(750), delay: ms(d), fill: 'both', easing: 'ease-out' });
    });
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * 6.283, d = 60 + Math.random() * 30;
      const sh = fx('left:' + (r.cx - 4) + 'px;top:' + (r.cy - 6) + 'px;width:8px;height:12px;background:linear-gradient(#fff,' + c + ');clip-path:polygon(50% 0,100% 100%,0 100%)');
      sh.animate([{ opacity: 0, transform: 'none' }, { opacity: 1, offset: 0.15 }, { opacity: 0, transform: 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px) rotate(' + Math.random() * 360 + 'deg)' }], { duration: ms(800), delay: ms(80), fill: 'both', easing: 'ease-out' });
    }
    if (isEl(t) && t.animate) t.animate([{ filter: 'none' }, { filter: 'brightness(1.8) hue-rotate(-20deg)', offset: 0.15 }, { filter: 'brightness(1.3)', offset: 0.3 }, { filter: 'none' }], { duration: ms(500) });
    return wait(ms(800));
  }

  // ---------- Assaut : cri de guerre ----------
  function ass(t) {
    const r = R(t), c = COL.ass;
    if (isEl(t) && t.animate) t.animate([{ transform: 'none' }, { transform: 'translateY(-14px) scale(1.07)', offset: 0.3 }, { transform: 'none' }], { duration: ms(620), easing: 'ease-out' });
    glow(t, c, 700, 30);
    const w = fx('left:' + (r.cx - 40) + 'px;top:' + (r.cy - 40) + 'px;width:80px;height:80px;border-radius:50%;border:4px solid ' + c + ';box-shadow:0 0 24px ' + c);
    w.animate([{ opacity: 1, transform: 'scale(.5)' }, { opacity: 0, transform: 'scale(2.6)' }], { duration: ms(650), fill: 'both', easing: 'ease-out' });
    for (let i = 0; i < 7; i++) {
      const x = r.x + 6 + i * (r.w - 12) / 6;
      const e = fx('left:' + x + 'px;top:' + r.y + 'px;width:3px;height:' + (30 + Math.random() * 30) + 'px;background:linear-gradient(' + c + ',' + c + '00);border-radius:2px');
      e.animate([{ opacity: 0, transform: 'translateY(0)' }, { opacity: 1, offset: 0.2 }, { opacity: 0, transform: 'translateY(-80px)' }], { duration: ms(520), delay: ms(i * 30), fill: 'both', easing: 'ease-out' });
    }
    for (let i = 0; i < 9; i++) {
      const x = r.x + (i + 0.5) * r.w / 9;
      const e = fx('left:' + (x - 7) + 'px;top:' + (r.y + r.h * 0.4) + 'px;width:14px;height:26px;border-radius:50% 50% 50% 50%/70% 70% 30% 30%;background:linear-gradient(#ffe08a,' + c + ' 60%,#8a1010);filter:blur(.6px)');
      e.animate([{ opacity: 0, transform: 'translateY(10px) scale(.4)' }, { opacity: 0.95, offset: 0.25 }, { opacity: 0, transform: 'translateY(' + (-30 - Math.random() * 20) + 'px) scale(1.2)' }], { duration: ms(700), delay: ms(i * 30), fill: 'both' });
    }
    return wait(ms(700));
  }

  // ---------- Final : braise finale ----------
  function fin(t) {
    const r = R(t), c = COL.fin;
    if (isEl(t) && t.animate) t.animate([{ filter: 'none' }, { filter: 'brightness(.45) saturate(.4)', offset: 0.4 }, { filter: 'brightness(.45) saturate(.4)', offset: 0.75 }, { filter: 'none' }], { duration: ms(1500) });
    const v = fx('left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px;border-radius:9px;box-shadow:inset 0 0 22px 6px ' + c + ',0 0 22px 4px ' + c);
    v.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0.4, offset: 0.6 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: ms(1500), fill: 'both' });
    for (let i = 0; i < 22; i++) {
      const side = Math.random() < 0.5;
      const x = side ? r.x + (Math.random() < 0.5 ? 0 : r.w) : r.x + Math.random() * r.w;
      const y = side ? r.y + Math.random() * r.h : r.y + (Math.random() < 0.5 ? 0 : r.h);
      spark(x, y, i % 3 ? c : '#fff', 3 + Math.random() * 3, (Math.random() - 0.5) * 26, -50 - Math.random() * 70, 900 + Math.random() * 500, i * 45);
    }
    return wait(ms(1500));
  }

  // ---------- Cycle : spirale vers le deck ----------
  // La carte est un clone de l'instantané pris avant sa disparition (voir
  // snapshotBoardForDeathAnim) ; l'original est masqué.
  function cyc(instId, deckEl) {
    try {
      const snap = (typeof __lastBoardSnapshot !== 'undefined') ? __lastBoardSnapshot[instId] : null;
      if (!snap || !deckEl) return Promise.resolve();
      const live = document.querySelector('[data-instid="' + instId + '"]');
      if (live) live.style.visibility = 'hidden';
      const rect = snap.rect, c = COL.cyc;
      const clone = snap.clone.cloneNode(true);
      clone.style.cssText += ';position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;margin:0;z-index:9992;pointer-events:none;';
      document.body.appendChild(clone);
      const r = R(rect), d = R(deckEl), dx = d.cx - r.cx, dy = d.cy - r.cy, kf = [];
      for (let i = 0; i <= 10; i++) { const f = i / 10; kf.push({ transform: 'translate(' + (dx * f) + 'px,' + (dy * f + Math.sin(Math.PI * f) * -40) + 'px) rotate(' + (f * 540) + 'deg) scale(' + (1 - f * 0.65) + ')', opacity: f > 0.9 ? 0 : 1 }); }
      clone.animate(kf, { duration: ms(1000), easing: 'ease-in-out', fill: 'forwards' });
      for (let i = 0; i < 8; i++) {
        const f = i / 8;
        setTimeout(() => {
          const t = fx('left:' + (r.cx + dx * f - 9) + 'px;top:' + (r.cy + dy * f - Math.sin(Math.PI * f) * 40 - 9) + 'px;font:700 18px sans-serif;color:' + c + ';text-shadow:0 0 8px ' + c, '⟳');
          t.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.4) rotate(180deg)' }], { duration: ms(500), fill: 'both' });
        }, ms(f * 850));
      }
      setTimeout(() => {
        try { deckEl.animate([{ transform: 'none', filter: 'none' }, { transform: 'scale(1.1)', filter: 'brightness(1.6)', offset: 0.4 }, { transform: 'none', filter: 'none' }], { duration: ms(500) }); } catch (e) { /* ignoré */ }
        ring(d, c, 0, 2.2);
      }, ms(950));
      return wait(ms(1050)).then(() => clone.remove());
    } catch (e) { return Promise.resolve(); }
  }

  // ---------- Continu : aura ----------
  const AURA_SEL = '.lane .bfx-aura-card, #artifacts-p1 .bfx-aura-card, #artifacts-p2 .bfx-aura-card';
  function auraOn(t) {
    const r = R(t), c = COL.con;
    for (let i = 0; i < 2; i++) ring({ x: r.x, y: r.y, w: r.w * 1.3, h: r.h, cx: r.cx, cy: r.cy }, c, i * 250, 2.6);
    glow(t, c, 800, 30);
    return wait(ms(700));
  }
  function auraOff(t) {
    const r = R(t), c = COL.con;
    ring({ x: r.x, y: r.y, w: r.w * 1.3, h: r.h, cx: r.cx, cy: r.cy }, c, 0, 0.2);
    return wait(ms(500));
  }
  // Halos persistants : un cadre bleu qui respire autour de chaque carte à effet continu
  // en jeu. Resynchronisé après chaque rendu du plateau.
  const halos = new Map();
  function syncAuras() {
    try {
      const live = new Set();
      document.querySelectorAll(AURA_SEL).forEach((el) => {
        const id = el.dataset.instid || ''; if (!id) return;
        live.add(id);
        const r = el.getBoundingClientRect();
        let h = halos.get(id);
        if (!r.width) { if (h) { h.style.display = 'none'; } return; }
        if (!h) { h = document.createElement('div'); h.className = 'bfx-aura-halo'; document.body.appendChild(h); halos.set(id, h); }
        h.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;display:' + (off() ? 'none' : 'block');
      });
      halos.forEach((h, id) => { if (!live.has(id)) { h.remove(); halos.delete(id); } });
    } catch (e) { /* ne casse jamais le rendu */ }
  }
  window.addEventListener('resize', () => { try { syncAuras(); } catch (e) { /* ignoré */ } });

  // ---------- Point d'entrée du journal ----------
  // kind : 'trig' | 'arr' | 'ass' | 'fin'. La carte peut ne pas encore (arrivée) ou ne plus
  // (Final) être à l'écran : on attend un peu, puis on retombe sur l'instantané du plateau.
  async function playOnCard(kind, instId) {
    if (off() || !instId) return;
    const q = () => document.querySelector('[data-instid="' + instId + '"]');
    let el = q();
    if (!el && kind === 'arr') { for (let i = 0; i < 8 && !el; i++) { await wait(100); el = q(); } }
    let target = el;
    if (!target) {
      const snap = (typeof __lastBoardSnapshot !== 'undefined') ? __lastBoardSnapshot[instId] : null;
      if (snap && kind === 'fin') target = snap.rect;
    }
    if (!target) return;
    if (kind === 'arr') return arr(target);
    if (kind === 'ass') return ass(target);
    if (kind === 'fin') return fin(target);
    return trig(target);
  }

  const css = document.createElement('style');
  css.textContent = '.bfx-aura-halo{position:fixed;pointer-events:none;z-index:5;border-radius:10px;animation:bfx-aura-breathe 2.6s ease-in-out infinite;}' +
    '@keyframes bfx-aura-breathe{0%,100%{box-shadow:0 0 7px 1px rgba(111,176,255,.45);}50%{box-shadow:0 0 18px 5px rgba(111,176,255,.9);}}';
  document.head.appendChild(css);

  // ---------- Pouvoir de héros : invocation runique ----------
  // Un cercle de runes se dessine autour du héros, une colonne de lumière monte vers le
  // plateau, le portrait s'élève légèrement. `el` = portrait du héros, `mine` = côté du joueur.
  function heroPower(el, mine) {
    return new Promise((resolve) => {
      try {
        if (!el || off()) { resolve(); return; }
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2 + 30, G = COL.trig;
        const ring = fx('left:' + (cx - R) + 'px;top:' + (cy - R) + 'px;width:' + R * 2 + 'px;height:' + R * 2 + 'px;border-radius:50%;border:3px solid ' + G + ';box-shadow:0 0 18px ' + G + ',inset 0 0 18px ' + G + '66;');
        let gl = '';
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; gl += '<div style="position:absolute;left:' + (R + Math.cos(a) * R - 5) + 'px;top:' + (R + Math.sin(a) * R - 5) + 'px;width:10px;height:10px;background:' + G + ';transform:rotate(45deg);box-shadow:0 0 10px ' + G + '"></div>'; }
        const glyphs = fx('left:' + (cx - R) + 'px;top:' + (cy - R) + 'px;width:' + R * 2 + 'px;height:' + R * 2 + 'px;', gl);
        const open = { duration: ms(500), easing: 'ease-out', fill: 'forwards' };
        const grow = [{ transform: 'scale(.2) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(200deg)', opacity: 1 }];
        ring.animate(grow, open); glyphs.animate(grow, open);
        later(() => {
          const h = Math.min(mine ? cy : window.innerHeight - cy, 320);
          const col = fx('left:' + (cx - 40) + 'px;top:' + (mine ? cy - h : cy) + 'px;width:80px;height:' + h + 'px;filter:blur(6px);background:linear-gradient(' + (mine ? '0deg' : '180deg') + ',' + G + 'cc,' + G + '00);');
          const o = mine ? '50% 100%' : '50% 0%';
          col.animate([{ opacity: 0, transform: 'scaleY(.2)', transformOrigin: o }, { opacity: 1, transform: 'scaleY(1)', transformOrigin: o, offset: .3 }, { opacity: 0, transform: 'scaleY(1)', transformOrigin: o }], { duration: ms(900), fill: 'forwards' });
          if (el.animate) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + (mine ? -14 : 14) + 'px)' }, { transform: 'translateY(0)' }], { duration: ms(700) });
          later(() => col.remove(), ms(950));
        }, ms(450));
        later(() => { [ring, glyphs].forEach((e) => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(300), fill: 'forwards' })); }, ms(1200));
        later(() => { ring.remove(); glyphs.remove(); resolve(); }, ms(1550));
      } catch (e) { resolve(); }
    });
  }


  // ---------- Rituel : runes dorées ----------
  const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹ';
  // Runes qui voyagent de `from` à `to` (élément ou rectangle). onHit(i) à chaque arrivée ;
  // la promesse se résout quand tout est arrivé.
  function runeFlight(from, to, n, onHit) {
    return new Promise((resolve) => {
      try {
        if (off() || !from || !to) { resolve(); return; }
        const a = R(from), b = R(to); let done = 0;
        for (let i = 0; i < n; i++) later(() => {
          const e = fx('left:0;top:0;margin:-11px;font:700 22px Georgia,serif;color:' + COL.trig + ';text-shadow:0 0 10px #ffb400;', RUNES[i % 8], ms(1200));
          const lift = -50 - Math.random() * 40, sx = (Math.random() - .5) * 60, kf = [];
          for (let k = 0; k <= 12; k++) {
            const f = k / 12, cx = (a.cx + b.cx) / 2 + sx, cy = Math.min(a.cy, b.cy) + lift;
            const x = (1 - f) * (1 - f) * a.cx + 2 * (1 - f) * f * cx + f * f * b.cx, y = (1 - f) * (1 - f) * a.cy + 2 * (1 - f) * f * cy + f * f * b.cy;
            kf.push({ transform: 'translate(' + x + 'px,' + y + 'px) scale(' + (k === 0 ? .5 : k === 12 ? .4 : 1) + ')', opacity: (k === 0 || k === 12) ? .2 : 1 });
          }
          const an = e.animate(kf, { duration: ms(650), easing: 'cubic-bezier(.4,0,.7,.7)', fill: 'forwards' });
          an.onfinish = () => { e.remove(); try { onHit && onHit(i); } catch (x) { /* ignoré */ } if (++done >= n) resolve(); };
        }, ms(90) * i);
        later(resolve, ms(90) * n + ms(1000)); // filet de sécurité
      } catch (e) { resolve(); }
    });
  }
  function ritualPulse(el) { glow(el, COL.trig, 380, 30); }
  // Rituel accompli : runes qui s'emballent, colonne de lumière, la carte apparaît puis se disperse en runes.
  // anchor = élément ou rectangle du centre de l'anneau ; cardNode = carte (cardEl) ; up = la carte monte (sinon descend).
  function ritualComplete(anchor, cardNode, up) {
    return new Promise((resolve) => {
      try {
        if (off() || !anchor) { resolve(); return; }
        const r = R(anchor), G = COL.trig, Rr = 60, sgn = up ? -1 : 1;
        const life = ms(4200);
        const ringEl = fx('left:' + (r.cx - 42) + 'px;top:' + (r.cy - 42) + 'px;width:84px;height:84px;border-radius:50%;box-sizing:border-box;border:6px solid ' + G + ';background:radial-gradient(circle at 40% 35%,#2b1d3d,#0e0816);box-shadow:0 0 18px ' + G + ';', '', life);
        ringEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(200), fill: 'forwards' });
        let gl = '';
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2; gl += '<div style="position:absolute;left:' + (Rr + Math.cos(a) * 52 - 11) + 'px;top:' + (Rr + Math.sin(a) * 52 - 11) + 'px;width:22px;text-align:center;font:700 18px Georgia,serif;color:' + G + ';text-shadow:0 0 10px #ffb400">' + RUNES[i] + '</div>'; }
        const runes = fx('left:' + (r.cx - Rr) + 'px;top:' + (r.cy - Rr) + 'px;width:' + Rr * 2 + 'px;height:' + Rr * 2 + 'px;', gl, life);
        later(() => runes.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }], { duration: ms(900), easing: 'ease-in-out', fill: 'forwards' }), ms(200));
        later(() => {
          const h = Math.min(up ? r.cy : window.innerHeight - r.cy, 340), o = up ? '50% 100%' : '50% 0%';
          const col = fx('left:' + (r.cx - 40) + 'px;top:' + (up ? r.cy - h : r.cy) + 'px;width:80px;height:' + h + 'px;filter:blur(6px);background:linear-gradient(' + (up ? '0deg' : '180deg') + ',' + G + 'cc,' + G + '00);', '', ms(1300));
          col.animate([{ opacity: 0, transform: 'scaleX(.2)', transformOrigin: o }, { opacity: 1, transform: 'scaleX(1)', transformOrigin: o, offset: .25 }, { opacity: 0, transform: 'scaleX(.5)', transformOrigin: o }], { duration: ms(1200), fill: 'forwards' });
        }, ms(300));
        // la carte
        const wrap = fx('left:' + r.cx + 'px;top:' + r.cy + 'px;z-index:9994;', '', life);
        if (cardNode) { cardNode.style.position = 'absolute'; cardNode.style.left = '0'; cardNode.style.top = '0'; cardNode.style.transform = 'translate(-50%,-50%) scale(.45)'; cardNode.style.boxShadow = '0 0 26px ' + G; wrap.appendChild(cardNode); }
        const dy = sgn * 150;
        later(() => { wrap.animate([{ opacity: 0, transform: 'translate(0,0) scale(.25)' }, { opacity: 1, transform: 'translate(0,' + dy + 'px) scale(1)' }], { duration: ms(700), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }); }, ms(450));
        later(() => {
          for (let i = 0; i < 16; i++) fx('left:' + (r.cx + (Math.random() - .5) * 90) + 'px;top:' + (r.cy + dy + (Math.random() - .3) * 100) + 'px;font:700 20px Georgia,serif;color:' + G + ';text-shadow:0 0 10px #ffb400', RUNES[i % 8], ms(1700))
            .animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(' + (-70 - Math.random() * 60) + 'px)' }], { duration: ms(1000 + Math.random() * 500), fill: 'forwards' });
          wrap.animate([{ opacity: 1, transform: 'translate(0,' + dy + 'px) scale(1)', filter: 'brightness(1)' }, { opacity: 0, transform: 'translate(0,' + (dy - 50) + 'px) scale(1.08)', filter: 'brightness(3)' }], { duration: ms(800), fill: 'forwards' });
          [ringEl, runes].forEach((e) => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(600), fill: 'forwards' }));
        }, ms(2000));
        later(resolve, ms(2900));
      } catch (e) { resolve(); }
    });
  }
  // Rituel détruit : l'anneau se brise en éclats dorés.
  function ritualDestroy(anchor) {
    return new Promise((resolve) => {
      try {
        if (off() || !anchor) { resolve(); return; }
        const r = R(anchor), G = COL.trig;
        const ringEl = fx('left:' + (r.cx - 42) + 'px;top:' + (r.cy - 42) + 'px;width:84px;height:84px;border-radius:50%;box-sizing:border-box;border:6px solid ' + G + ';background:radial-gradient(circle at 40% 35%,#2b1d3d,#0e0816);box-shadow:0 0 18px ' + G + ';', '', ms(1100));
        ringEl.animate([{ opacity: 1, transform: 'scale(1) rotate(0)' }, { opacity: 1, transform: 'scale(1.08) rotate(-4deg)', offset: .25 }, { opacity: 0, transform: 'scale(.2) rotate(30deg)' }], { duration: ms(700), fill: 'forwards' });
        for (let i = 0; i < 20; i++) {
          const a = Math.random() * 6.28, d = 50 + Math.random() * 80;
          fx('left:' + r.cx + 'px;top:' + r.cy + 'px;width:' + (6 + Math.random() * 7) + 'px;height:' + (12 + Math.random() * 12) + 'px;background:' + (i % 2 ? G : '#ff7a6a') + ';clip-path:polygon(50% 0,100% 100%,0 100%)', '', ms(1000))
            .animate([{ opacity: 1, transform: 'translate(0,0)' }, { opacity: 0, transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d + 40) + 'px) rotate(' + a * 220 + 'deg)' }], { duration: ms(800), fill: 'forwards' });
        }
        fx('left:' + (r.cx - 50) + 'px;top:' + (r.cy - 50) + 'px;width:100px;height:100px;border-radius:50%;border:4px solid #ff7a6a;box-shadow:0 0 22px #ff7a6a', '', ms(700))
          .animate([{ opacity: 1, transform: 'scale(.5)' }, { opacity: 0, transform: 'scale(2.4)' }], { duration: ms(600), fill: 'forwards' });
        later(resolve, ms(800));
      } catch (e) { resolve(); }
    });
  }

  window.BFX2 = { heroPower, runeFlight, ritualPulse, ritualComplete, ritualDestroy, kindOf, playOnCard, cycle: cyc, auraOn, auraOff, syncAuras, colors: COL };
})();
