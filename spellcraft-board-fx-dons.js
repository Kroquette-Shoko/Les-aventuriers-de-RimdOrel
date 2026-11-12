// ============================================================
// SPELLCRAFT — Animations spéciales des « Dons » (sorts épiques)
// ============================================================
// Couche visuelle uniquement (éléments position:fixed supprimés en fin
// d'animation). Appelée par le journal du plateau (js/board/02-etat-et-journal.js)
// après la révélation du sort, à la place de l'orbe et des flèches habituelles.
//   Don de la guerre : cartes rouges + épée qui se dessine (1,5 s)
//   Don de Zenithas  : météorites sur les créatures touchées
//   Don angélique    : ailes d'ange qui grandissent sur la cible
//   Don de savoir    : éclairs puis les sorts lancés, dans l'ordre
//   Don de jaäne     : crânes qui explosent sur les cartes détruites
// Respecte le mode « Instantané » et « réduire les animations ».
// ============================================================
(function () {
  'use strict';
  function reduced() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  function off() {
    try { if (typeof combatInstant === 'function' && combatInstant()) return true; } catch (e) { /* ignoré */ }
    return reduced();
  }
  function ms(v) { try { return typeof cms === 'function' ? cms(v) : v; } catch (e) { return v; } }
  const wait = (t) => new Promise((r) => setTimeout(r, t));
  const live = [];
  function fx(css, html) {
    const e = document.createElement('div');
    e.style.cssText = 'position:fixed;pointer-events:none;z-index:9994;' + css;
    if (html) e.innerHTML = html;
    document.body.appendChild(e); live.push(e);
    return e;
  }
  function clean() { live.splice(0).forEach((e) => { try { e.remove(); } catch (x) { /* ignoré */ } }); }
  function rects(els) { return els.filter(Boolean).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0); }
  function anim(el, kf, opt) { try { return el.animate(kf, opt); } catch (e) { return null; } }
  const SKULL = '<svg viewBox="0 0 100 100" width="100%" height="100%"><path d="M50 6C27 6 12 22 12 44c0 13 6 21 14 26v14c0 4 3 6 6 6h36c3 0 6-2 6-6V70c8-5 14-13 14-26C88 22 73 6 50 6z" fill="#f2ecdc" stroke="#2a2030" stroke-width="3"/><ellipse cx="34" cy="46" rx="10" ry="12" fill="#1a1020"/><ellipse cx="66" cy="46" rx="10" ry="12" fill="#1a1020"/><path d="M50 58l-6 12h12z" fill="#1a1020"/><path d="M36 80v12M46 80v12M54 80v12M64 80v12" stroke="#2a2030" stroke-width="3"/></svg>';

  // ---------- Guerre ----------
  async function guerre(els) {
    const rs = rects(els); if (!rs.length) return;
    const T = ms(1500);
    const SW = '<svg viewBox="0 0 100 150" width="100%" height="100%" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 6px #ff4a55)"><path class="sw" pathLength="1" d="M80 14 L38 96"/><path class="sw" pathLength="1" d="M74 10 L86 18 L44 100 L36 96 Z"/><path class="sw" pathLength="1" d="M24 88 L58 108"/><path class="sw" pathLength="1" d="M36 100 L22 128"/></svg>';
    rs.forEach((r, i) => {
      const d = i * ms(60);
      const red = fx(`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:8px;background:rgba(224,50,60,.6);box-shadow:0 0 18px 4px rgba(224,50,60,.8);opacity:0`);
      anim(red, [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: T, delay: d, fill: 'both' });
      const sw = fx(`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`, SW);
      sw.querySelectorAll('.sw').forEach((p, k) => {
        p.style.strokeDasharray = '1';
        anim(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: ms(420), delay: d + k * ms(140), fill: 'both', easing: 'ease-out' });
      });
      anim(sw, [{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: T, delay: d, fill: 'both' });
      const el = els[i]; if (el) anim(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)', offset: .15 }, { transform: 'translateX(3px)', offset: .3 }, { transform: 'translateX(0)', offset: .45 }], { duration: T, delay: d });
    });
    await wait(T + rs.length * ms(60) + 100); clean();
  }

  // ---------- Zenithas ----------
  async function zenithas(els) {
    const rs = rects(els); if (!rs.length) return;
    rs.forEach((r, i) => {
      const tx = r.left + r.width / 2, ty = r.top + r.height / 2, d = i * ms(220);
      const m = fx(`left:${tx - 23}px;top:${ty - 23}px;opacity:0`,
        '<div style="width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffe9b0,#ff8a2a 55%,#7a2208);box-shadow:0 0 22px 8px rgba(255,140,40,.8);position:relative;z-index:2"></div><div style="position:absolute;left:20px;top:-150px;width:6px;height:170px;background:linear-gradient(to top,rgba(255,150,40,.9),rgba(255,150,40,0));transform:translateX(-3px)"></div>');
      anim(m, [{ transform: 'translate(-80px,-300px) scale(.6)', opacity: 1 }, { transform: 'translate(0,0) scale(1)', opacity: 1, offset: .97 }, { transform: 'translate(0,0) scale(1)', opacity: 0 }], { duration: ms(620), delay: d, easing: 'cubic-bezier(.5,0,1,.6)', fill: 'both' });
      setTimeout(() => {
        const fl = fx(`left:${tx - 50}px;top:${ty - 50}px;width:100px;height:100px;border-radius:50%;background:radial-gradient(#fff,rgba(255,160,50,.9) 40%,transparent 70%)`);
        anim(fl, [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: ms(450), fill: 'both' });
        for (let k = 0; k < 9; k++) {
          const a = Math.random() * 6.28, dist = 40 + Math.random() * 50;
          const s = fx(`left:${tx}px;top:${ty}px;width:7px;height:7px;background:#ffb04a;border-radius:2px`);
          anim(s, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist}px) rotate(200deg)`, opacity: 0 }], { duration: ms(600), fill: 'both' });
        }
        const el = els[i];
        if (el) { anim(el, [{ transform: 'translate(0,0)' }, { transform: 'translate(-4px,3px)' }, { transform: 'translate(4px,-3px)' }, { transform: 'translate(-2px,0)' }, { transform: 'translate(0,0)' }], { duration: ms(350) });
          anim(el, [{ filter: 'brightness(2.2)' }, { filter: 'brightness(1)' }], { duration: ms(450) }); }
      }, d + ms(560));
    });
    await wait(ms(620) + rs.length * ms(220) + ms(700)); clean();
  }

  // ---------- Angélique ----------
  function wing(flip, id) {
    return '<svg viewBox="0 0 120 150" width="100%" height="100%" style="' + (flip ? 'transform:scaleX(-1);' : '') + 'filter:drop-shadow(0 0 8px #fff7c8)"><defs><linearGradient id="wg' + id + '" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf0"/><stop offset="1" stop-color="#cfe6ff"/></linearGradient></defs><g fill="url(#wg' + id + ')" stroke="#e8c76a" stroke-width="2"><path d="M118 70C90 52 50 56 12 34c6 20 18 30 38 38-14 0-28-4-44-14 8 18 24 28 46 32-12 4-24 4-38 0 14 14 36 20 58 14z"/><path d="M118 76C96 80 70 92 54 112c14-4 26-6 40-6-8 8-20 14-34 16 18 6 38 0 58-20z"/></g></svg>';
  }
  async function ange(els) {
    const rs = rects(els); if (!rs.length) return;
    const T = ms(1600);
    rs.forEach((r, n) => {
      const W = r.width * .9, H = r.height * .8;
      const halo = fx(`left:${r.left - 10}px;top:${r.top - 10}px;width:${r.width + 20}px;height:${r.height + 20}px;border-radius:12px`);
      anim(halo, [{ boxShadow: '0 0 0 rgba(255,240,170,0)' }, { boxShadow: '0 0 34px 10px rgba(255,240,170,.75)', offset: .5 }, { boxShadow: '0 0 0 rgba(255,240,170,0)' }], { duration: T, fill: 'both' });
      [[r.left - W + 12, 'right center', false], [r.left + r.width - 12, 'left center', true]].forEach(([x, o, flip], k) => {
        const w = fx(`left:${x}px;top:${r.top + r.height / 2 - H / 2 - 6}px;width:${W}px;height:${H}px;transform-origin:${o}`, wing(flip, n + '' + k));
        anim(w, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(.7)', opacity: 1, offset: .35 }, { transform: 'scale(1.12)', opacity: 1, offset: .75 }, { transform: 'scale(1.12)', opacity: 0 }], { duration: T, easing: 'ease-out', fill: 'both' });
      });
      const el = els[n]; if (el) anim(el, [{ filter: 'brightness(1)' }, { filter: 'brightness(1.5)', offset: .5 }, { filter: 'brightness(1)' }], { duration: T });
    });
    await wait(T + 100); clean();
  }

  // ---------- Savoir ----------
  function bolt(x1, y1, x2, y2) {
    const p = [[x1, y1]], n = 7;
    for (let i = 1; i < n; i++) { const t = i / n; p.push([x1 + (x2 - x1) * t + (Math.random() - .5) * 50, y1 + (y2 - y1) * t]); }
    p.push([x2, y2]); return p.map((a) => a.join(',')).join(' ');
  }
  // cards : [{name, imageUrl?}] des sorts lancés (ordre de lancement) — peut être vide
  async function savoir(cards) {
    const W = window.innerWidth, H = window.innerHeight;
    const ov = fx('left:0;top:0;width:100vw;height:100vh;background:#cfd8ff;opacity:0');
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:9995'; document.body.appendChild(svg); live.push(svg);
    const cy = H / 2;
    for (let b = 0; b < 3; b++) {
      svg.innerHTML = '';
      for (let k = 0; k < 3; k++) {
        const x = W * (.25 + Math.random() * .5);
        const pl = document.createElementNS(NS, 'polyline');
        pl.setAttribute('points', bolt(x, 0, W / 2 + (x - W / 2) * .5, cy));
        pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', '#f4f0ff'); pl.setAttribute('stroke-width', 3);
        pl.style.filter = 'drop-shadow(0 0 6px #8fa6ff) drop-shadow(0 0 12px #9b6bff)';
        svg.appendChild(pl);
      }
      anim(ov, [{ opacity: .5 }, { opacity: 0 }], { duration: ms(200) });
      await wait(ms(240)); svg.innerHTML = ''; await wait(ms(110));
    }
    const list = (cards || []).slice(0, 4);
    if (list.length) {
      const sw = Math.min(110, (W - 60) / list.length - 10), sh = sw * 1.4, gap = 12;
      const total = list.length * sw + (list.length - 1) * gap, x0 = (W - total) / 2, y0 = cy - sh / 2;
      const slots = [];
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const bg = c.imageUrl ? `background:#2a2140 url('${String(c.imageUrl).replace(/'/g, '%27')}') center/cover;` : 'background:linear-gradient(160deg,#5a4e7a,#2b3f5e);';
        const s = fx(`left:${x0 + i * (sw + gap)}px;top:${y0}px;width:${sw}px;height:${sh}px;border-radius:8px;border:2px solid #cdbbff;${bg}box-shadow:0 0 18px #9b6bff;opacity:0`,
          `<div style="position:absolute;left:0;right:0;bottom:0;padding:3px 4px;background:rgba(20,14,34,.82);color:#fff;font:700 ${Math.max(9, sw / 9)}px system-ui;text-align:center;border-radius:0 0 6px 6px">${String(c.name || '').replace(/</g, '&lt;')}</div>` +
          `<div style="position:absolute;left:50%;top:-16px;transform:translateX(-50%);background:#e8b84a;color:#251a06;font:800 12px system-ui;border-radius:9px;min-width:18px;text-align:center;padding:0 5px">${i + 1}</div>`);
        slots.push(s);
        anim(s, [{ transform: 'rotateY(90deg) scale(.8)', opacity: 0 }, { transform: 'rotateY(0) scale(1.12)', opacity: 1, offset: .6 }, { transform: 'rotateY(0) scale(1)', opacity: 1 }], { duration: ms(380), fill: 'both' });
        anim(ov, [{ opacity: .3 }, { opacity: 0 }], { duration: ms(200) });
        await wait(ms(520));
      }
      await wait(ms(400));
      slots.forEach((s) => anim(s, [{ opacity: 1 }, { opacity: 0 }], { duration: ms(350), fill: 'both' }));
      await wait(ms(380));
    }
    clean();
  }

  // ---------- Jaäne ----------
  async function jaane(els) {
    const rs = rects(els); if (!rs.length) return;
    rs.forEach((r, j) => {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = j * ms(200);
      const sk = fx(`left:${cx - 34}px;top:${cy - 34}px;width:68px;height:68px;opacity:0;filter:drop-shadow(0 0 8px #9bff7a)`, SKULL);
      anim(sk, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: .35 }, { transform: 'scale(1)', opacity: 1, offset: .55 }, { transform: 'scale(1.7)', opacity: 0 }], { duration: ms(900), delay: d, fill: 'both' });
      const el = els[j]; if (el) anim(el, [{ filter: 'none' }, { filter: 'grayscale(1) brightness(.7)' }], { duration: ms(550), delay: d, fill: 'forwards' });
      setTimeout(() => {
        const fl = fx(`left:${cx - 55}px;top:${cy - 55}px;width:110px;height:110px;border-radius:50%;background:radial-gradient(rgba(190,255,150,.9),rgba(120,60,200,.5) 50%,transparent 70%)`);
        anim(fl, [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 0 }], { duration: ms(450), fill: 'both' });
        for (let k = 0; k < 10; k++) {
          const a = k / 10 * 6.28 + Math.random() * .4, dist = 50 + Math.random() * 40;
          const s = fx(`left:${cx - 9}px;top:${cy - 9}px;width:18px;height:18px`, SKULL);
          anim(s, [{ transform: 'translate(0,0) scale(.6)', opacity: 1 }, { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist}px) scale(1) rotate(${Math.random() * 300 - 150}deg)`, opacity: 0 }], { duration: ms(650), fill: 'both' });
        }
      }, d + ms(550));
    });
    await wait(ms(1200) + rs.length * ms(200)); clean();
  }

  // Nom de carte -> animation (sans accents, minuscules)
  const NAMES = { 'don de la guerre': 'guerre', 'don de zenithas': 'zenithas', 'don angelique': 'ange', 'don de savoir': 'savoir', 'don de jaane': 'jaane' };
  function keyOf(name) {
    const n = String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    return NAMES[n] || null;
  }
  const RUN = { guerre, zenithas, ange, savoir, jaane };
  window.BFXDONS = {
    keyOf,
    off,
    // els : éléments DOM des cartes touchées ; savoir : liste des sorts lancés
    play(key, els, extra) {
      if (off() || !RUN[key]) return Promise.resolve();
      try { return Promise.resolve(RUN[key](key === 'savoir' ? extra : els)).catch(clean); } catch (e) { clean(); return Promise.resolve(); }
    }
  };
})();
