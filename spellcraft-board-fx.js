// ============================================================
// SPELLCRAFT — Animations du plateau (couche visuelle uniquement)
// ============================================================
// Aucune de ces animations ne change le jeu : elles se posent PAR-DESSUS le
// plateau (éléments flottants, supprimés en fin d'animation) ou sur la carte
// qui vient d'arriver. Toutes respectent :
//  - le mode « Instantané » des options de combat (combatInstant()) : rien ne s'anime ;
//  - le réglage système « réduire les animations » (prefers-reduced-motion) ;
//  - la vitesse choisie dans les options (cms(), quand elle existe).
//
// Liste :
//  1. bfxActionStart / bfxActionEnd : pastille de chargement pendant qu'une carte jouée attend sa résolution.
//  2. (hook plateau) tremblement d'écran à la pose d'une créature de 10 de force ou plus.
//  3. bfxSyncArrivals : arrivée d'une créature (chute + onde de choc + poussière).
//  4. bfxKeywordTrail : lueur qui fait le tour de la carte quand elle gagne un mot-clé.
//  5. bfxArtifactUse : activation d'un artefact (rouage + éclats + reflet).
//  6. bfxDrawFly : la carte piochée voyage du paquet jusqu'à la main.
//  7. bfxBurnReveal : un sort se joue en éclair lumineux, puis la carte se consume.
//  8. bfxSyncArrivals : arrivée d'un artefact (rouages qui tournent autour de la carte).
//  9. bfxTrapSnap : un piège se déclenche (éclat en étoile, claquement).
// ============================================================
(function () {
  'use strict';

  // ---------- Garde-fous ----------
  function reduced() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function off() {
    try { if (typeof combatInstant === 'function' && combatInstant()) return true; } catch (e) { /* ignoré */ }
    return reduced();
  }
  function ms(v) {
    try { return typeof cms === 'function' ? cms(v) : v; } catch (e) { return v; }
  }
  function later(fn, t) { return setTimeout(fn, t); }
  function rgbOf(mine) { return mine === false ? '255,69,69' : '61,155,255'; } // rouge = adversaire, bleu = vous

  // ---------- Style ----------
  const css = `
/* 1. Pastille de chargement (carte jouée en attente de résolution) */
.bfx-pending{position:fixed;z-index:9990;width:64px;height:64px;margin:-32px 0 0 -32px;pointer-events:none;opacity:0;animation:bfx-fade-in .18s ease-out forwards;}
.bfx-pending .ring{position:absolute;inset:0;border-radius:50%;
  background:conic-gradient(from 0deg, rgba(61,155,255,0) 0%, rgba(61,155,255,.15) 30%, #3d9bff 100%);
  -webkit-mask:radial-gradient(circle, transparent 0 58%, #000 60%);mask:radial-gradient(circle, transparent 0 58%, #000 60%);
  animation:bfx-spin .9s linear infinite;filter:drop-shadow(0 0 8px rgba(61,155,255,.9));}
.bfx-pending .dot{position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:#bfe0ff;box-shadow:0 0 14px #3d9bff;animation:bfx-pulse 1.2s ease-in-out infinite;}
@keyframes bfx-spin{to{transform:rotate(360deg);}}
@keyframes bfx-pulse{0%,100%{transform:scale(.7);opacity:.6;}50%{transform:scale(1.25);opacity:1;}}
@keyframes bfx-fade-in{to{opacity:1;}}

/* 3. Arrivée d'une créature */
.bfx-arrive{animation:bfx-drop var(--bfx-dur,.62s) cubic-bezier(.2,.7,.25,1) both;transform-origin:50% 100%;}
@keyframes bfx-drop{
  0%{transform:translateY(-120px) scale(1.4);opacity:0;filter:brightness(2.4) saturate(1.4);}
  45%{transform:translateY(0) scale(1.04);opacity:1;filter:brightness(1.7);}
  62%{transform:translateY(8px) scale(.97,1.04);filter:brightness(1.2);}
  80%{transform:translateY(-3px) scale(1.01);filter:none;}
  100%{transform:none;opacity:1;filter:none;}
}
.bfx-shock{position:fixed;z-index:9988;pointer-events:none;border-radius:50%;border:4px solid rgba(var(--bfx-rgb),.9);
  box-shadow:0 0 22px rgba(var(--bfx-rgb),.85), inset 0 0 18px rgba(var(--bfx-rgb),.5);
  transform:scale(.1);opacity:0;animation:bfx-shock .7s ease-out forwards;animation-delay:var(--bfx-delay,.26s);}
@keyframes bfx-shock{0%{transform:scale(.1);opacity:.95;}100%{transform:scale(1);opacity:0;}}
.bfx-dust{position:fixed;z-index:9988;pointer-events:none;border-radius:50%;background:radial-gradient(circle, rgba(220,210,190,.75), rgba(220,210,190,0) 70%);
  opacity:0;animation:bfx-dust .75s ease-out forwards;animation-delay:var(--bfx-delay,.28s);}
@keyframes bfx-dust{0%{opacity:.8;transform:translate(0,0) scale(.4);}100%{opacity:0;transform:translate(var(--bfx-dx),var(--bfx-dy)) scale(1.6);}}

/* 4. Lueur qui fait le tour de la carte (mot-clé gagné) */
.bfx-trail{position:absolute;inset:-4px;pointer-events:none;z-index:30;overflow:visible;}
.bfx-trail svg{width:100%;height:100%;overflow:visible;}
.bfx-trail rect{fill:none;stroke:rgb(var(--bfx-c,255,233,160));stroke-width:5;stroke-linecap:round;filter:drop-shadow(0 0 6px rgb(var(--bfx-cg,255,210,63))) drop-shadow(0 0 14px rgb(var(--bfx-cg,255,179,0)));
  stroke-dasharray:22 78;stroke-dashoffset:0;animation:bfx-trail var(--bfx-dur,.9s) linear 2 both;}
.bfx-trail rect.base{stroke:rgba(var(--bfx-c,255,226,140),.35);stroke-dasharray:none;animation:bfx-trail-base calc(var(--bfx-dur,.9s) * 2) ease-out both;filter:drop-shadow(0 0 8px rgba(var(--bfx-cg,255,210,63),.8));}
@keyframes bfx-trail{to{stroke-dashoffset:-100;}}
@keyframes bfx-trail-base{0%{opacity:0;}15%{opacity:1;}100%{opacity:0;}}

/* 5/8. Artefacts : activation et arrivée */
.bfx-overlay{position:fixed;z-index:9989;pointer-events:none;}
.bfx-gear{position:absolute;color:#d9c48a;filter:drop-shadow(0 0 5px rgba(255,200,90,.85));}
.bfx-gear svg{width:100%;height:100%;display:block;}
.bfx-orbit{position:absolute;inset:0;animation:bfx-spin var(--bfx-orbit,1.6s) linear infinite;}
.bfx-gear.cw{animation:bfx-spin 1.1s linear infinite;}
.bfx-gear.ccw{animation:bfx-spin-rev 0.9s linear infinite;}
@keyframes bfx-spin-rev{to{transform:rotate(-360deg);}}
.bfx-sweep{position:absolute;inset:0;overflow:hidden;border-radius:10px;}
.bfx-sweep::after{content:'';position:absolute;top:-10%;bottom:-10%;width:38%;left:-60%;
  background:linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,246,214,.85) 50%, rgba(255,255,255,0) 100%);transform:skewX(-14deg);
  animation:bfx-sweep .7s ease-in-out forwards;animation-delay:var(--bfx-sweep-delay,.15s);}
@keyframes bfx-sweep{to{left:130%;}}
.bfx-pulse{position:absolute;inset:-6px;border-radius:12px;border:3px solid rgba(var(--bfx-rgb),.95);box-shadow:0 0 24px rgba(var(--bfx-rgb),.9);
  opacity:0;animation:bfx-pulse-ring .8s ease-out forwards;}
@keyframes bfx-pulse-ring{0%{opacity:1;transform:scale(.92);}100%{opacity:0;transform:scale(1.35);}}
.bfx-spark{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:#fff3c4;box-shadow:0 0 10px 2px rgba(var(--bfx-rgb),.95);
  opacity:0;animation:bfx-spark .65s ease-out forwards;}
@keyframes bfx-spark{0%{opacity:1;transform:translate(0,0) scale(1);}100%{opacity:0;transform:translate(var(--bfx-dx),var(--bfx-dy)) scale(.2);}}

/* 6. Pioche : carte qui voyage du paquet à la main */
.bfx-flyer{position:fixed;z-index:9991;pointer-events:none;border-radius:8px;background:linear-gradient(145deg,#241d3d,#100c1e);
  background-size:cover;background-position:center;border:2px solid var(--gold,#d4af37);box-shadow:0 10px 22px rgba(0,0,0,.6), 0 0 14px rgba(255,255,255,.18);}

/* 7. Sort : flash puis la carte se consume */
.bfx-flash{position:absolute;inset:-30%;border-radius:50%;pointer-events:none;background:radial-gradient(circle, rgba(255,255,255,.95), rgba(255,235,170,.55) 35%, rgba(255,255,255,0) 70%);
  opacity:0;animation:bfx-flash .42s ease-out forwards;}
@keyframes bfx-flash{0%{opacity:0;transform:scale(.4);}25%{opacity:1;}100%{opacity:0;transform:scale(1.5);}}
.bfx-burning{-webkit-mask-image:linear-gradient(to bottom,#000 0,#000 33.3%,transparent 40%,transparent 100%);mask-image:linear-gradient(to bottom,#000 0,#000 33.3%,transparent 40%,transparent 100%);
  -webkit-mask-size:100% 300%;mask-size:100% 300%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:0 4%;mask-position:0 4%;
  animation:bfx-burn var(--bfx-burn,.95s) linear forwards, bfx-heat var(--bfx-burn,.95s) ease-in forwards;}
@keyframes bfx-burn{to{-webkit-mask-position:0 56%;mask-position:0 56%;}}
@keyframes bfx-heat{0%{filter:none;}30%{filter:sepia(.7) saturate(2.2) brightness(1.15);}100%{filter:sepia(1) saturate(3.5) brightness(.75) contrast(1.2);}}
.bfx-fire{position:absolute;left:-6%;right:-6%;height:24%;pointer-events:none;z-index:5;mix-blend-mode:screen;
  background:linear-gradient(to bottom, rgba(255,120,20,0) 0%, rgba(255,150,30,.85) 38%, rgba(255,235,140,.95) 52%, rgba(255,110,10,.7) 68%, rgba(120,20,0,0) 100%);
  filter:blur(2px);top:100%;animation:bfx-fire var(--bfx-burn,.95s) linear forwards;}
@keyframes bfx-fire{0%{top:100%;}100%{top:-24%;}}
.bfx-ember{position:absolute;width:5px;height:5px;border-radius:50%;background:#ffb347;box-shadow:0 0 8px 2px rgba(255,140,30,.9);pointer-events:none;opacity:0;
  animation:bfx-ember var(--bfx-ember-dur,1s) ease-out forwards;animation-delay:var(--bfx-ember-delay,0s);}
@keyframes bfx-ember{0%{opacity:0;transform:translate(0,0) scale(1);}15%{opacity:1;}100%{opacity:0;transform:translate(var(--bfx-dx),var(--bfx-dy)) scale(.2);}}

/* 9. Piège déclenché */
.bfx-starburst{position:absolute;left:50%;top:50%;width:150%;aspect-ratio:1;margin-left:-75%;margin-top:-75%;border-radius:50%;pointer-events:none;
  background:repeating-conic-gradient(from 0deg, rgba(255,70,50,.0) 0 5deg, rgba(255,90,60,.7) 5deg 8deg);
  -webkit-mask:radial-gradient(circle, #000 20%, transparent 68%);mask:radial-gradient(circle, #000 20%, transparent 68%);
  opacity:0;transform:scale(.3) rotate(0deg);animation:bfx-starburst .75s ease-out forwards;}
@keyframes bfx-starburst{0%{opacity:0;transform:scale(.3) rotate(0deg);}20%{opacity:1;}100%{opacity:0;transform:scale(1.25) rotate(22deg);}}
.bfx-redflash{position:fixed;inset:0;z-index:9993;pointer-events:none;background:radial-gradient(circle at 50% 50%, rgba(255,60,40,.0) 30%, rgba(255,40,20,.35) 100%);opacity:0;animation:bfx-redflash .5s ease-out forwards;}
@keyframes bfx-redflash{0%{opacity:0;}20%{opacity:1;}100%{opacity:0;}}
`;
  const st = document.createElement('style');
  st.setAttribute('data-bfx', '1');
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  // ---------- Outils ----------
  function gearSvg(teeth) {
    // Roue dentée : couronne dentée + trou central
    const cx = 50, cy = 50, rOut = 46, rIn = 36, n = teeth || 8;
    let d = '';
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.22) / n) * Math.PI * 2, a2 = ((i + 0.5) / n) * Math.PI * 2, a3 = ((i + 0.72) / n) * Math.PI * 2;
      const p = (r, a) => (cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1);
      d += (i === 0 ? 'M' : 'L') + p(rIn, a0) + ' L' + p(rOut, a1) + ' L' + p(rOut, a2) + ' L' + p(rIn, a3) + ' ';
    }
    d += 'Z';
    return '<svg viewBox="0 0 100 100"><path d="' + d + '" fill="currentColor" stroke="#6b5420" stroke-width="2"/><circle cx="50" cy="50" r="13" fill="#2a1f08" stroke="#6b5420" stroke-width="2"/></svg>';
  }
  function overlayAt(el, grow) {
    const r = el.getBoundingClientRect();
    const g = grow || 0;
    const o = document.createElement('div');
    o.className = 'bfx-overlay';
    o.style.left = (r.left - g) + 'px';
    o.style.top = (r.top - g) + 'px';
    o.style.width = (r.width + g * 2) + 'px';
    o.style.height = (r.height + g * 2) + 'px';
    document.body.appendChild(o);
    return { o, r };
  }

  // ---------- 1. Pastille de chargement ----------
  const pending = { timer: null, el: null, drop: null };
  function bfxSetDrop(x, y) { pending.drop = { x, y, at: Date.now() }; }
  function bfxActionStart(label) {
    try {
      bfxActionEnd();
      if (off() || !/^Jouer/i.test(String(label || ''))) return;
      pending.timer = later(() => {
        pending.timer = null;
        let x = window.innerWidth / 2, y = window.innerHeight * 0.55;
        if (pending.drop && Date.now() - pending.drop.at < 5000) { x = pending.drop.x; y = pending.drop.y; }
        else { const lane = document.getElementById('lane-p1'); if (lane) { const r = lane.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; } }
        const el = document.createElement('div');
        el.className = 'bfx-pending';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.innerHTML = '<div class="ring"></div><div class="dot"></div>';
        document.body.appendChild(el);
        pending.el = el;
      }, 140); // inutile de montrer le chargement si le serveur répond tout de suite
    } catch (e) { /* ne casse jamais le jeu */ }
  }
  function bfxActionEnd() {
    if (pending.timer) { clearTimeout(pending.timer); pending.timer = null; }
    if (pending.el) { const e = pending.el; pending.el = null; e.style.transition = 'opacity .15s'; e.style.opacity = '0'; later(() => e.remove(), 170); }
  }

  // ---------- 3. Arrivée d'une créature ----------
  function bfxCreatureArrive(slotEl, mine, power) {
    if (!slotEl || off()) return;
    // grosse créature (10 de force ou plus) : l'écran tremble au moment où elle touche le sol
    if (power >= 10 && typeof window.shakeScreen === 'function') later(() => window.shakeScreen('hitLarge'), ms(260));
    const card = slotEl.firstElementChild || slotEl;
    const dur = ms(620);
    card.style.setProperty('--bfx-dur', dur + 'ms');
    card.classList.add('bfx-arrive');
    later(() => { card.classList.remove('bfx-arrive'); card.style.removeProperty('--bfx-dur'); }, dur + 60);
    const r = slotEl.getBoundingClientRect();
    const rgb = rgbOf(mine);
    const w = Math.max(60, r.width), baseY = r.bottom - 6;
    // onde de choc aplatie au sol
    const shock = document.createElement('div');
    shock.className = 'bfx-shock';
    shock.style.setProperty('--bfx-rgb', rgb);
    shock.style.setProperty('--bfx-delay', ms(260) + 'ms');
    shock.style.left = (r.left + r.width / 2 - w * 0.9) + 'px';
    shock.style.top = (baseY - w * 0.18) + 'px';
    shock.style.width = (w * 1.8) + 'px';
    shock.style.height = (w * 0.36) + 'px';
    document.body.appendChild(shock);
    later(() => shock.remove(), ms(260) + 760);
    // poussière
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1, k = (i % 3) + 1;
      const d = document.createElement('div');
      d.className = 'bfx-dust';
      const s = 26 + k * 8;
      d.style.width = d.style.height = s + 'px';
      d.style.left = (r.left + r.width / 2 + side * w * 0.28 - s / 2) + 'px';
      d.style.top = (baseY - s / 2) + 'px';
      d.style.setProperty('--bfx-dx', (side * (w * 0.2 + k * 22)) + 'px');
      d.style.setProperty('--bfx-dy', (-8 - k * 6) + 'px');
      d.style.setProperty('--bfx-delay', (ms(260) + k * 30) + 'ms');
      document.body.appendChild(d);
      later(() => d.remove(), ms(260) + 900);
    }
  }

  // ---------- 8. Arrivée d'un artefact : rouages ----------
  function bfxArtifactArrive(relicEl, mine) {
    if (!relicEl || off()) return;
    const { o, r } = overlayAt(relicEl, 0);
    o.style.setProperty('--bfx-rgb', rgbOf(mine));
    const size = Math.min(r.width, r.height);
    // 3 rouages en orbite autour de la carte
    const orbit = document.createElement('div');
    orbit.className = 'bfx-orbit';
    orbit.style.setProperty('--bfx-orbit', ms(2200) + 'ms');
    [[0, 0.34, 'cw', 10], [120, 0.26, 'ccw', 8], [240, 0.30, 'cw', 9]].forEach(([deg, k, dir, teeth]) => {
      const g = document.createElement('div');
      g.className = 'bfx-gear ' + dir;
      const gs = size * k;
      g.style.width = g.style.height = gs + 'px';
      const rad = deg * Math.PI / 180, R = Math.max(r.width, r.height) * 0.62;
      g.style.left = (r.width / 2 + Math.cos(rad) * R - gs / 2) + 'px';
      g.style.top = (r.height / 2 + Math.sin(rad) * R - gs / 2) + 'px';
      g.innerHTML = gearSvg(teeth);
      orbit.appendChild(g);
    });
    o.appendChild(orbit);
    const sweep = document.createElement('div');
    sweep.className = 'bfx-sweep';
    sweep.style.setProperty('--bfx-sweep-delay', ms(700) + 'ms');
    o.appendChild(sweep);
    const pulse = document.createElement('div');
    pulse.className = 'bfx-pulse';
    pulse.style.animationDelay = ms(900) + 'ms';
    o.appendChild(pulse);
    o.style.opacity = '0';
    o.style.transition = 'opacity .25s';
    requestAnimationFrame(() => { o.style.opacity = '1'; });
    later(() => { o.style.opacity = '0'; }, ms(1500));
    later(() => o.remove(), ms(1500) + 320);
  }

  // ---------- 5. Activation d'un artefact ----------
  function bfxArtifactUse(el, mine) {
    if (!el || off()) return Promise.resolve();
    return new Promise((resolve) => {
      const { o, r } = overlayAt(el, 0);
      o.style.setProperty('--bfx-rgb', rgbOf(mine));
      const size = Math.min(r.width, r.height);
      // un gros rouage qui s'emballe au centre, translucide
      const g = document.createElement('div');
      g.className = 'bfx-gear cw';
      g.style.width = g.style.height = (size * 0.7) + 'px';
      g.style.left = (r.width / 2 - size * 0.35) + 'px';
      g.style.top = (r.height / 2 - size * 0.35) + 'px';
      g.style.opacity = '.75';
      g.style.animationDuration = '.55s';
      g.innerHTML = gearSvg(12);
      o.appendChild(g);
      const sweep = document.createElement('div'); sweep.className = 'bfx-sweep'; o.appendChild(sweep);
      const pulse = document.createElement('div'); pulse.className = 'bfx-pulse'; o.appendChild(pulse);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4, dist = size * (0.55 + Math.random() * 0.35);
        const s = document.createElement('div');
        s.className = 'bfx-spark';
        s.style.left = (r.width / 2) + 'px'; s.style.top = (r.height / 2) + 'px';
        s.style.setProperty('--bfx-dx', (Math.cos(a) * dist) + 'px');
        s.style.setProperty('--bfx-dy', (Math.sin(a) * dist) + 'px');
        s.style.animationDelay = (Math.random() * 120) + 'ms';
        o.appendChild(s);
      }
      o.style.transition = 'opacity .2s';
      later(() => { o.style.opacity = '0'; }, ms(780));
      later(() => { o.remove(); resolve(); }, ms(780) + 220);
    });
  }

  // ---------- 4. Lueur qui fait le tour de la carte (mot-clé gagné) ----------
  // Couleur dominante (la plus saturée) de l'icône du mot-clé, lue une seule fois par image.
  const iconColors = {};
  function iconColor(img) {
    try {
      if (!img || !img.complete || !img.naturalWidth) return null;
      const key = img.currentSrc || img.src;
      if (iconColors[key] !== undefined) return iconColors[key];
      const c = document.createElement('canvas'); c.width = c.height = 24;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data;
      let r = 0, g = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3]; if (a < 100) continue;
        const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        const sat = mx ? (mx - mn) / mx : 0, wt = (sat * sat + 0.02) * (a / 255);
        r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
      }
      if (!w) return (iconColors[key] = null);
      r /= w; g /= w; b /= w;
      const m = Math.max(r, g, b) || 1, k = 255 / m; // on remonte la luminosité pour que ça brille
      return (iconColors[key] = [r * k, g * k, b * k].map((v) => Math.round(Math.min(255, v))));
    } catch (e) { return null; } // image bloquée ou introuvable : lueur dorée par défaut
  }

  function bfxKeywordTrail(instId, iconEl) {
    try {
      if (off() || !instId) return;
      const host = document.querySelector('[data-instid="' + instId + '"]');
      if (!host) return;
      const card = host.querySelector('.ncard, .card') || host;
      const cs = getComputedStyle(card);
      if (cs.position === 'static') card.style.position = 'relative';
      const dur = ms(900);
      const box = document.createElement('div');
      box.className = 'bfx-trail';
      box.style.setProperty('--bfx-dur', dur + 'ms');
      box.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><rect class="base" x="1" y="1" width="98" height="98" rx="6" ry="6" pathLength="100" vector-effect="non-scaling-stroke"/><rect x="1" y="1" width="98" height="98" rx="6" ry="6" pathLength="100" vector-effect="non-scaling-stroke"/></svg>';
      const col = iconColor(iconEl);
      if (col) {
        const pale = col.map((v) => Math.round(v + (255 - v) * 0.55)).join(',');
        box.style.setProperty('--bfx-c', pale);
        box.style.setProperty('--bfx-cg', col.join(','));
      }
      card.appendChild(box);
      later(() => box.remove(), dur * 2 + 120);
    } catch (e) { /* ignoré */ }
  }

  // ---------- 6. La carte piochée voyage du paquet à la main ----------
  // fromEl : le dos du paquet ; targets : [{ el, delay }] éléments de la main qui viennent d'arriver.
  function bfxDrawFly(fromEl, targets, backUrl) {
    try {
      if (off() || !fromEl || !targets || !targets.length) return;
      const a = fromEl.getBoundingClientRect();
      if (!a.width) return;
      targets.forEach((t, idx) => {
        const target = t.el;
        const b = target.getBoundingClientRect();
        if (!b.width) return;
        const prevVis = target.style.visibility;
        target.style.visibility = 'hidden';
        const f = document.createElement('div');
        f.className = 'bfx-flyer';
        if (backUrl) f.style.backgroundImage = "url('" + String(backUrl).replace(/'/g, '') + "')";
        f.style.left = a.left + 'px'; f.style.top = a.top + 'px';
        f.style.width = a.width + 'px'; f.style.height = a.height + 'px';
        f.style.opacity = '0';
        document.body.appendChild(f);
        const dur = ms(520), delay = ms(idx * 160);
        const mx = (a.left + b.left) / 2, my = Math.min(a.top, b.top) - 40;
        const keyframes = [
          { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', opacity: 0, transform: 'rotate(0deg)' },
          { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', opacity: 1, transform: 'rotate(0deg)', offset: 0.1 },
          { left: mx + 'px', top: my + 'px', width: (a.width + b.width) / 2 + 'px', height: (a.height + b.height) / 2 + 'px', opacity: 1, transform: 'rotate(-6deg)', offset: 0.55 },
          { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px', opacity: 1, transform: 'rotate(0deg)' }
        ];
        const done = () => { f.remove(); target.style.visibility = prevVis; };
        try {
          const anim = f.animate(keyframes, { duration: dur, delay, easing: 'cubic-bezier(.3,.1,.2,1)', fill: 'both' });
          anim.onfinish = done;
          anim.oncancel = done;
          later(done, dur + delay + 400); // filet de sécurité
        } catch (e) { done(); }
      });
    } catch (e) { /* ignoré */ }
  }

  // ---------- 7. Sort : éclair lumineux, puis la carte se consume ----------
  // flipEl : la carte révélée (.ability-reveal-flip) ; retourne une promesse résolue quand elle a disparu.
  function bfxBurnReveal(flipEl) {
    return new Promise((resolve) => {
      try {
        if (!flipEl || off()) { resolve(); return; }
        const dur = ms(950);
        flipEl.style.setProperty('--bfx-burn', dur + 'ms');
        // le « front de feu » et les braises vivent dans la carte, qui est masquée progressivement ;
        // on les place donc sur un parent non masqué
        const wrap = flipEl.parentElement;
        const fr = flipEl.getBoundingClientRect();
        const fx = document.createElement('div');
        fx.style.cssText = 'position:fixed;pointer-events:none;z-index:2;left:' + fr.left + 'px;top:' + fr.top + 'px;width:' + fr.width + 'px;height:' + fr.height + 'px;overflow:visible;--bfx-burn:' + dur + 'ms;';
        const clip = document.createElement('div');
        clip.style.cssText = 'position:absolute;inset:0;overflow:hidden;border-radius:12px;';
        const fire = document.createElement('div');
        fire.className = 'bfx-fire';
        clip.appendChild(fire);
        fx.appendChild(clip);
        for (let i = 0; i < 22; i++) {
          const e = document.createElement('div');
          e.className = 'bfx-ember';
          const t = Math.random();                       // position le long du front
          e.style.left = (8 + Math.random() * 84) + '%';
          e.style.top = (100 - t * 100) + '%';
          e.style.setProperty('--bfx-dx', ((Math.random() - 0.5) * 70) + 'px');
          e.style.setProperty('--bfx-dy', (-50 - Math.random() * 90) + 'px');
          e.style.setProperty('--bfx-ember-dur', (600 + Math.random() * 500) + 'ms');
          e.style.setProperty('--bfx-ember-delay', (t * dur * 0.85) + 'ms');
          fx.appendChild(e);
        }
        (wrap || document.body).appendChild(fx);
        flipEl.classList.add('bfx-burning');
        later(() => { fx.remove(); resolve(); }, dur + 650);
      } catch (e) { resolve(); }
    });
  }
  // Éclair lumineux à l'apparition du sort
  function bfxSpellFlash(flipEl) {
    try {
      if (!flipEl || off()) return;
      const f = document.createElement('div');
      f.className = 'bfx-flash';
      flipEl.appendChild(f);
      later(() => f.remove(), 520);
    } catch (e) { /* ignoré */ }
  }

  // ---------- 9. Piège déclenché ----------
  function bfxTrapSnap(flipEl) {
    try {
      if (!flipEl || off()) return;
      const sb = document.createElement('div');
      sb.className = 'bfx-starburst';
      flipEl.appendChild(sb);
      later(() => sb.remove(), 820);
      const rf = document.createElement('div');
      rf.className = 'bfx-redflash';
      document.body.appendChild(rf);
      later(() => rf.remove(), 560);
      try { if (typeof shakeScreen === 'function') shakeScreen('hitMedium'); } catch (e) { /* ignoré */ }
    } catch (e) { /* ignoré */ }
  }

  // ---------- Suivi des arrivées (créatures et artefacts) ----------
  const seen = { creatures: null, relics: null };
  function ids(list) { return (list || []).map((c) => c && c.instId).filter(Boolean); }
  // À appeler après renderLane et renderArtifactStack.
  function bfxSyncArrivals(S, myKey, oppKey) {
    try {
      if (!S || !S[myKey] || !S[oppKey]) return;
      const nowC = {}, nowR = {};
      [myKey, oppKey].forEach((k) => { nowC[k] = ids(S[k].board); nowR[k] = ids(S[k].relics); });
      const prevC = seen.creatures, prevR = seen.relics;
      seen.creatures = nowC; seen.relics = nowR;
      if (!prevC || off()) return; // tout premier rendu : rien à animer
      [myKey, oppKey].forEach((k) => {
        const mine = k === myKey;
        const old = new Set(prevC[k] || []);
        nowC[k].filter((id) => !old.has(id)).slice(0, 4).forEach((id, i) => {
          const el = document.querySelector('.lane .card-slot[data-inst-id="' + id + '"]');
          const cr = (S[k].board || []).find((c) => c && c.instId === id) || {};
          const power = Number(cr.curAtk != null ? cr.curAtk : cr.atk) || 0;
          if (el) later(() => bfxCreatureArrive(el, mine, power), i * 120);
        });
        const oldR = new Set(prevR[k] || []);
        nowR[k].filter((id) => !oldR.has(id)).slice(0, 2).forEach((id, i) => {
          const holder = document.getElementById(mine ? 'artifacts-p1' : 'artifacts-p2');
          const el = holder && holder.querySelector('[data-instid="' + id + '"]');
          if (el) later(() => bfxArtifactArrive(el.closest('.relic-slot') || el, mine), i * 150);
        });
      });
    } catch (e) { /* ne casse jamais le rendu */ }
  }

  window.BFX = {
    setDrop: bfxSetDrop, actionStart: bfxActionStart, actionEnd: bfxActionEnd,
    syncArrivals: bfxSyncArrivals, creatureArrive: bfxCreatureArrive, artifactArrive: bfxArtifactArrive,
    artifactUse: bfxArtifactUse, keywordTrail: bfxKeywordTrail, drawFly: bfxDrawFly,
    burnReveal: bfxBurnReveal, spellFlash: bfxSpellFlash, trapSnap: bfxTrapSnap
  };
})();
