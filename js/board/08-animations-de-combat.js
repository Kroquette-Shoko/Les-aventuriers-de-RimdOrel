// ============================================================
// Plateau de jeu — 08-animations-de-combat
// Animations de combat : élan, impact, mort de carte, badges de mots-clés, file d animations, vitesse, pose animée
// (Chargé dans l ordre depuis spellcraft-server-board.html : tout est partagé, comme avant.)
// ============================================================
/* ============================================================
   DURÉES DES ANIMATIONS DE COMBAT (ms, à vitesse NORMALE)
   Un seul endroit pour les régler. Elles sont passées dans cms() au moment de
   jouer l'animation : Rapide les divise par 2, Instantanée les supprime
   (voir « Vitesse des animations de combat » dans spellcraft-shared.js).
   ============================================================ */
const ANIM_LUNGE_WINDUP_MS = 150;  // recul d'élan avant la charge
const ANIM_LUNGE_CHARGE_MS = 200;  // course jusqu'au centre de la cible
const ANIM_IMPACT_HOLD_MS  = 130;  // arrêt à l'impact (laisse voir le choc, flash et chiffres)
const ANIM_LUNGE_RETURN_MS = 270;  // retour à sa place
//   => une charge dure 750 ms (480 ms avant), dont 130 ms d'arrêt à l'impact.
const ANIM_IMPACT_FX_MS = 450;     // anneau + éclat de lumière à l'impact
const ANIM_ARROW_LEAD_MS = 200;    // la flèche attaquant -> cible s'affiche seule avant que la charge parte

/* ============================================================
   FLÈCHES DE BLOCAGE — affichent les assignations bloqueur → attaquant
   ============================================================ */
// Flèche (ligne en pointillés + pointe) de (x1,y1) vers (x2,y2), ajoutée dans
// `parent` (le calque SVG #block-arrows-layer ou un <g> dedans). Style :
// .block-arrow-line / .block-arrow-head. La pointe s'arrête avant le centre
// de la cible pour ne pas la masquer.
function appendArrowShape(parent, x1, y1, x2, y2){
  const angle = Math.atan2(y2-y1, x2-x1);
  const shorten = 44;
  const ex = x2 - Math.cos(angle)*shorten, ey = y2 - Math.sin(angle)*shorten;

  const line = document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', ex); line.setAttribute('y2', ey);
  line.setAttribute('class', 'block-arrow-line');
  parent.appendChild(line);

  const backX = x2 - Math.cos(angle)*32, backY = y2 - Math.sin(angle)*32;
  const perpX = Math.cos(angle+Math.PI/2)*13, perpY = Math.sin(angle+Math.PI/2)*13;
  const arrow = document.createElementNS('http://www.w3.org/2000/svg','polygon');
  arrow.setAttribute('points', `${ex+Math.cos(angle)*32},${ey+Math.sin(angle)*32} ${backX+perpX},${backY+perpY} ${backX-perpX},${backY-perpY}`);
  arrow.setAttribute('class', 'block-arrow-head');
  parent.appendChild(arrow);
}
// Ancienne version : dessine bloqueur -> attaquant d'après UI.pendingBlockAssignments
// (jamais alimenté aujourd'hui, donc sans effet) ; garde la même géométrie via
// appendArrowShape. La flèche utilisée en jeu est showCombatArrow, ci-dessous.
function drawBlockArrows(){
  const svg = document.getElementById('block-arrows-layer');
  if(!svg || !S) return;
  svg.innerHTML = '';
  (UI.pendingBlockAssignments||[]).forEach(({attackerInstId, blockerInstId})=>{
    const attWrap = document.querySelector(`[data-instid="${attackerInstId}"]`);
    const blkWrap = document.querySelector(`[data-instid="${blockerInstId}"]`);
    if(!attWrap || !blkWrap) return;
    const a = attWrap.getBoundingClientRect();
    const b = blkWrap.getBoundingClientRect();
    appendArrowShape(svg, b.left + b.width/2, b.top + b.height/2, a.left + a.width/2, a.top + a.height/2);
  });
}
// Trace une flèche attaquant -> cible dans le calque #block-arrows-layer
// (fixed, hors du plateau mis à l'échelle : coordonnées d'écran, comme les
// autres animations). Renvoie la fonction qui la retire (idempotente) ; elle
// est aussi retirée si la file d'animations est interrompue. Le calque a
// pointer-events:none : aucun clic n'est bloqué au-delà du verrou existant.
function showCombatArrow(fromEl, toEl){
  const svg = document.getElementById('block-arrows-layer');
  if(!svg || !fromEl || !toEl) return ()=>{};
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  appendArrowShape(g, a.left+a.width/2, a.top+a.height/2, b.left+b.width/2, b.top+b.height/2);
  svg.appendChild(g);
  const remove = ()=>g.remove();
  registerCombatCleanup(remove);
  return remove;
}
// Une frappe complète : flèche attaquant -> cible seule pendant ANIM_ARROW_LEAD_MS
// (on voit QUI vise QUOI), puis la charge ; la flèche disparaît à la fin de
// l'arrêt à l'impact. `opts` : voir lungeToward.
function arrowThenLunge(attEl, targetEl, opts){
  opts = opts || {};
  const removeArrow = showCombatArrow(attEl, targetEl);
  const lead = cms(ANIM_ARROW_LEAD_MS);
  const wait = lead ? new Promise(r=>combatTimeout(r, lead)) : Promise.resolve();
  return wait.then(()=>{
    // Duel (opts.mutual) : la cible fonce AUSSI vers l'attaquant, en même temps,
    // et elles se rencontrent à mi-chemin. L'impact (sons, chiffres) n'est déclenché
    // qu'une fois, par l'attaquant.
    const strikes = [lungeToward(attEl, targetEl, Object.assign({}, opts, {
      fraction: opts.mutual ? 0.5 : opts.fraction,
      onImpact: ()=>{
        combatTimeout(removeArrow, cms(ANIM_IMPACT_HOLD_MS));
        if(opts.onImpact) opts.onImpact();
      }
    }))];
    if(opts.mutual) strikes.push(lungeToward(targetEl, attEl, { fraction: 0.5 }));
    return Promise.all(strikes);
  }).then(removeArrow, e=>{ removeArrow(); throw e; });
}

/* ============================================================
   ANIMATION DE MORT — dissolution d'une carte qui quitte le plateau
   (combat, destruction, sacrifice...)
   ============================================================ */
// Instantané de toutes les cartes actuellement affichées sur le plateau
// (position + clone), repris juste avant que render() ne reconstruise le
// DOM avec le nouvel état. Une carte qui vient de mourir n'existe déjà
// plus dans le nouvel état : sans cet instantané pris à temps, elle serait
// introuvable au moment de jouer son animation de mort (render() l'a déjà
// fait disparaître d'un coup). Refait à chaque mise à jour d'état — peu
// coûteux (quelques cartes tout au plus).
let __lastBoardSnapshot = {};
// Disposition « table en perspective » (html.bd-persp, voir spellcraft-board-persp.css) :
// getBoundingClientRect d'une carte inclinée renvoie la boîte englobante du quadrilatère
// projeté, plus large que la carte réellement vue (effet de biais). Les clones d'animation
// (mort, charge, pose) sont des rectangles droits : on leur donne la hauteur projetée et la
// largeur qui garde les proportions de la carte vue (largeur/hauteur naturelles ÷ cos de
// l'inclinaison), centrés sur le même point. Sans la classe, renvoie le rect tel quel.
const PERSP_TILT_COS = Math.cos(18*Math.PI/180); // = inclinaison de spellcraft-board-persp.css
function persRect(el, r){
  r = r || el.getBoundingClientRect();
  if(!document.documentElement.classList.contains('bd-persp') || !el.closest('#board-scroll-area')) return r; // hors table (main, clone déjà posé) : rien à corriger
  const oh = el.offsetHeight, ow = el.offsetWidth;
  if(!oh || !ow) return r;
  const h = r.height, w = h * ow / (oh * PERSP_TILT_COS);
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  return { left:cx-w/2, top:cy-h/2, width:w, height:h, right:cx+w/2, bottom:cy+h/2 };
}
function snapshotBoardForDeathAnim(){
  const snap = {};
  document.querySelectorAll('[data-instid]').forEach(el=>{
    const id = el.getAttribute('data-instid');
    if(!id || snap[id]) return;
    snap[id] = { rect: persRect(el), clone: stripPostureFromGhost(el.cloneNode(true)) };
  });
  return snap;
}
// Retrouve l'élément d'une carte par son instId — sur le plateau réel si
// elle y est encore, sinon (elle vient de mourir dans le même échange de
// coups) un ghost invisible repositionné à sa dernière position connue
// (voir __lastBoardSnapshot), uniquement pour servir de point de départ ou
// d'arrivée à une animation de charge. Sans ce repli, une créature qui
// meurt pendant son propre assaut (ripostée à mort, piège, etc.) ne fonçait
// jamais sur sa cible : son élément avait déjà disparu du plateau au moment
// où l'animation tentait de le retrouver.
function resolveCombatEl(instId){
  const live = document.querySelector(`[data-instid="${instId}"]`);
  if(live) return { el: live, temp: false };
  const snap = __lastBoardSnapshot[instId];
  if(!snap) return { el: null, temp: false };
  const ghost = snap.clone;
  ghost.style.position = 'fixed';
  ghost.style.left = snap.rect.left+'px';
  ghost.style.top = snap.rect.top+'px';
  ghost.style.width = snap.rect.width+'px';
  ghost.style.height = snap.rect.height+'px';
  ghost.style.margin = '0';
  ghost.style.opacity = '0';
  ghost.style.pointerEvents = 'none';
  document.body.appendChild(ghost);
  return { el: ghost, temp: true };
}
// Joue l'animation de mort d'une carte (identifiée par son instId) à partir
// de l'instantané pris avant sa disparition — jamais sur l'élément réel,
// déjà retiré du plateau à ce stade. Un clone fantôme est placé à sa
// position exacte, éclate en une lueur blanche puis se dissout en tombant
// légèrement, avant d'être retiré.
function playCardDeathAnim(instId){
  playSfx('card-death');
  if(combatInstant()) return Promise.resolve(); // mode instantané : le son seul
  const snap = __lastBoardSnapshot[instId];
  if(!snap) return Promise.resolve();
  // Le plateau est gelé sur l'ancien état (voir "Gel du rendu") : la carte
  // réelle y est encore. On la cache pour ne pas voir l'original ET son
  // clone qui se dissout.
  const liveEl = document.querySelector(`[data-instid="${instId}"]`);
  if(liveEl) liveEl.style.visibility = 'hidden';
  const { rect, clone } = snap;
  // carte à effet continu qui part : son aura se replie
  try{ if(window.BFX2 && clone.classList && clone.classList.contains('bfx-aura-card')) BFX2.auraOff(rect); }catch(e){ /* ignoré */ }
  clone.style.position = 'fixed';
  clone.style.left = rect.left+'px';
  clone.style.top = rect.top+'px';
  clone.style.width = rect.width+'px';
  clone.style.height = rect.height+'px';
  clone.style.margin = '0';
  clone.style.zIndex = '9992';
  clone.style.pointerEvents = 'none';
  document.body.appendChild(clone);
  const deathDur = cms(640);
  const cleanDeath = ()=>{ clone.remove(); };
  registerCombatCleanup(cleanDeath);
  return new Promise(resolve=>{
    const finish = ()=>{ clone.remove(); resolve(); };
    if(clone.animate){
      const anim = clone.animate([
        { transform:'scale(1) rotate(0deg)', opacity:1, filter:'brightness(1) saturate(1)' },
        { transform:'scale(1.08) rotate(-3deg)', opacity:1, filter:'brightness(1.8) saturate(0.2)', offset:0.22 },
        { transform:'scale(0.8) rotate(6deg) translateY(26px)', opacity:0, filter:'brightness(0.3) saturate(0)' }
      ], { duration: deathDur, easing:'ease-in' });
      anim.onfinish = finish;
      anim.oncancel = finish;
    } else {
      setTimeout(finish, deathDur);
    }
  });
}

/* ============================================================
   ANIMATION DES BADGES DE MOTS-CLÉS (gain / perte)
   ============================================================ */
// Un badge GAGNÉ apparaît (zoom + halo vert) ; un badge PERDU laisse un
// fantôme (clone position:fixed à son ancienne place, comme les clones de
// mort) qui rétrécit, rougit et est barré avant de disparaître.
//
// Principe : on compare ce qui était AFFICHÉ au dernier rendu (instantané
// __keywordBadgeSnapshot) à ce qui va l'être (S). Ce n'est volontairement pas
// « PREV_S vs S » : PREV_S peut contenir un état que le gel du rendu n'a
// jamais affiché (deux états reçus pendant une animation de combat). Avec
// l'instantané du dernier rendu : un resync sans changement ou un état rejoué
// à l'identique ne donne aucun écart, le tout premier rendu (instantané nul)
// n'anime rien, et pendant le gel (render() sort tôt) rien ne bouge ; les
// changements issus d'un combat s'animent donc au dégel, APRÈS la file.
const KW_BADGE_GAIN_MS = 700;
const KW_BADGE_LOSS_MS = 800;
// Son discret, UNE fois par lot (existants dans sfx/ ; playSfx respecte la
// sourdine). Gain prioritaire si le lot contient les deux. Conservé en mode
// Instantané, comme le son de mort des cartes : seul le visuel est supprimé.
const KW_BADGE_SFX = { gain:{ key:'cast', volume:0.22 }, loss:{ key:'clic', volume:0.3 } };
let __keywordBadgeSnapshot = null; // null tant qu'aucun rendu n'a eu lieu
function keywordBadgeEl(instId, kw){
  return document.querySelector(`[data-instid="${instId}"] .kw-icon[data-kw="${kw}"]`);
}
// À appeler AVANT que render() ne reconstruise le DOM (S est déjà le nouvel
// état, le DOM encore l'ancien : on y lit la position des badges perdus).
// Ne doit jamais empêcher le rendu : toute erreur renvoie null.
function planKeywordBadgeAnim(){
  try {
    const next = snapshotKeywordBadges(S, [MY_KEY, OPP_KEY]);
    const changes = diffKeywordBadgeSnapshots(__keywordBadgeSnapshot, next);
    __keywordBadgeSnapshot = next;
    if(!changes.length) return null;
    const ghosts = [];
    if(!combatInstant()){
      changes.forEach(ch=>ch.lost.forEach(kw=>{
        const old = keywordBadgeEl(ch.instId, kw);
        if(!old) return; // pas à l'écran (carte au-delà de la 8e, rendu partiel...) : rien à dissoudre
        ghosts.push({ rect: old.getBoundingClientRect(), src: old.getAttribute('src'), filter: getComputedStyle(old).filter });
      }));
    }
    return { changes, ghosts };
  } catch(e){ console.error('Badges de mots-clés : comparaison impossible', e); return null; }
}
function spawnKeywordGhost(g){
  const dur = cms(KW_BADGE_LOSS_MS);
  const wrap = document.createElement('div');
  wrap.className = 'kw-ghost';
  wrap.style.left = g.rect.left+'px';
  wrap.style.top = g.rect.top+'px';
  wrap.style.width = g.rect.width+'px';
  wrap.style.height = g.rect.height+'px';
  wrap.style.animationDuration = dur+'ms';
  const img = document.createElement('img');
  img.src = g.src;
  if(g.filter && g.filter!=='none') img.style.filter = g.filter; // l'ancien badge n'est plus dans .ncard : on recopie son rendu
  const strike = document.createElement('span');
  strike.className = 'kw-ghost-strike';
  strike.style.animationDuration = dur+'ms';
  wrap.appendChild(img);
  wrap.appendChild(strike);
  document.body.appendChild(wrap);
  setTimeout(()=>wrap.remove(), dur+80);
}
// À appeler APRÈS le rendu (classes posées sur le nouveau DOM, par instId).
function playKeywordBadgeChanges(plan){
  if(!plan) return;
  const instant = combatInstant();
  const gainedEls = [];
  plan.changes.forEach(ch=>ch.gained.forEach(kw=>{
    const el = keywordBadgeEl(ch.instId, kw);
    if(el) gainedEls.push({ el, ch, kw });
  }));
  const trailed = new Set();
  const run = ()=>{
    if(!instant){
      gainedEls.forEach(({ el, ch, kw })=>{
        // le DOM a pu être reconstruit entre-temps (rendu pendant la file) : on relit
        const cur = el.isConnected ? el : keywordBadgeEl(ch.instId, kw);
        if(!cur) return;
        cur.classList.remove('kw-badge-pending');
        const dur = cms(KW_BADGE_GAIN_MS);
        cur.style.animationDuration = dur+'ms';
        cur.classList.add('kw-badge-gain');
        if(window.BFX && !trailed.has(ch.instId)){ trailed.add(ch.instId); BFX.keywordTrail(ch.instId, cur); } // lueur qui fait le tour de la carte
        setTimeout(()=>{ cur.classList.remove('kw-badge-gain'); cur.style.animationDuration = ''; }, dur+80);
      });
      plan.ghosts.forEach(spawnKeywordGhost);
    }
    const snd = gainedEls.length ? KW_BADGE_SFX.gain : (plan.changes.some(c=>c.lost.length) ? KW_BADGE_SFX.loss : null);
    if(snd) playSfx(snd.key, snd.volume);
  };
  // Une file d'animations (révélation de capacité...) joue sans gel du
  // plateau : on attend son tour pour ne pas écraser ces animations, en
  // cachant les badges gagnés d'ici là. Si la file est interrompue
  // (« Passer », garde-fou), le nettoyage les remet visibles.
  if(__combatAnimPlaying && !instant){
    gainedEls.forEach(({ el })=>el.classList.add('kw-badge-pending'));
    registerCombatCleanup(()=>gainedEls.forEach(({ el })=>el.classList.remove('kw-badge-pending')));
    queueCombatAnim(run);
  } else {
    run();
  }
}

/* ============================================================
   ANIMATION DE FRAPPE — les cartes qui se ruent l'une sur l'autre (ou
   sur le héros) au moment du combat
   ============================================================ */
// Anime une charge de combat — recul exagéré (élan), puis fonce jusqu'au
// centre de la cible en passant par-dessus elle (façon MTG Arena), avant
// de revenir à sa position. Retourne une Promise résolue à la fin, pour
// pouvoir être mise en file (voir queueCombatAnim) plutôt que jouée
// immédiatement.
// Clone flottant (position:fixed dans le <body>) d'un élément du plateau, placé
// exactement sur lui. On anime ce clone plutôt que l'élément réel : celui-ci est
// reconstruit à chaque mise à jour d'état (très fréquent : ta propre action, la
// diffusion, la resynchronisation périodique), ce qui détruisait l'élément en
// cours d'animation avant même qu'elle ait pu se voir à l'écran. L'élément réel
// est masqué le temps de l'animation ; la fonction renvoyée retire le clone et
// le rend visible (idempotente, enregistrée pour une interruption de la file).
function makeCombatGhost(el, rect){
  rect = persRect(el, rect);
  const ghost = stripPostureFromGhost(el.cloneNode(true));
  ghost.style.position = 'fixed';
  ghost.style.left = rect.left+'px';
  ghost.style.top = rect.top+'px';
  ghost.style.width = rect.width+'px';
  ghost.style.height = rect.height+'px';
  ghost.style.margin = '0';
  ghost.style.zIndex = '9995';
  ghost.style.pointerEvents = 'none';
  document.body.appendChild(ghost);
  el.style.opacity = '0';
  const restore = ()=>{ ghost.remove(); if(el && el.style) el.style.opacity=''; };
  registerCombatCleanup(restore);
  return { ghost, restore };
}
// Anime une charge de combat : recul d'élan, course jusqu'au CENTRE de la cible
// en passant par-dessus elle (façon MTG Arena), ARRÊT à l'impact, retour à sa
// place. Durées : constantes ANIM_* ci-dessus. (Le « recul » des créatures
// bloquées / bloqueuses n'est plus une animation : c'est un état visuel
// persistant, voir « Posture de combat » : is-withdrawn.)
// Retourne une Promise résolue à la fin, pour pouvoir être mise en file (voir
// queueCombatAnim) plutôt que jouée immédiatement.
// `opts` (tous facultatifs) :
//  - onImpact : appelé à l'arrivée sur la cible (son, flash, chiffres, tremblement).
//  - fraction : part du trajet parcourue (1 par défaut = jusqu'au centre de la cible ;
//    0.5 pour un duel où les DEUX créatures foncent l'une vers l'autre et se rencontrent à mi-chemin).
function lungeToward(el, targetEl, opts){
  opts = (opts && typeof opts==='object') ? opts : {};
  if(!el || !targetEl) return Promise.resolve();
  const windup = cms(ANIM_LUNGE_WINDUP_MS), charge = cms(ANIM_LUNGE_CHARGE_MS);
  const hold = cms(ANIM_IMPACT_HOLD_MS), ret = cms(ANIM_LUNGE_RETURN_MS);
  if(!(windup+charge+hold+ret)){ if(opts.onImpact) opts.onImpact(); return Promise.resolve(); } // instantané : pas de mouvement
  const a = el.getBoundingClientRect(), b = targetEl.getBoundingClientRect();
  const frac = (typeof opts.fraction==='number' && opts.fraction>0 && opts.fraction<=1) ? opts.fraction : 1;
  const dx = ((b.left+b.width/2) - (a.left+a.width/2)) * frac;
  const dy = ((b.top+b.height/2) - (a.top+a.height/2)) * frac;
  const len = Math.hypot(dx,dy) || 1;
  const ux = dx/len, uy = dy/len;
  const tImpact = windup+charge, tHoldEnd = tImpact+hold, tHome = tHoldEnd+ret, total = tHome;

  const { ghost, restore } = makeCombatGhost(el, a);
  if(opts.onImpact) combatTimeout(opts.onImpact, tImpact);
  return new Promise(resolve=>{
    const done = ()=>{ restore(); resolve(); };
    if(ghost.animate){
      // Recul marqué (élan), puis fonce jusqu'au CENTRE de la cible (dx/dy
      // représentent déjà le vecteur exact jusqu'à ce centre) en le
      // dépassant légèrement, pour donner l'impression de passer par-
      // dessus elle plutôt que de simplement s'y arrêter.
      const hit = `translate(${dx*1.12}px, ${dy*1.12}px) scale(1.22)`;
      const frames = [
        { transform:'translate(0,0) scale(1)', offset:0, easing:'ease-out' },
        { transform:`translate(${-ux*22}px, ${-uy*22}px) scale(1.06)`, offset:windup/total, easing:'cubic-bezier(.5,0,.9,.55)' },
        { transform:hit, offset:tImpact/total, easing:'linear' },
        { transform:hit, offset:tHoldEnd/total, easing:'ease-in-out' }, // arrêt à l'impact
        { transform:'translate(0,0) scale(1)', offset:tHome/total }
      ];
      const anim = ghost.animate(frames, { duration: total });
      anim.onfinish = done;
      anim.oncancel = done;
    } else {
      setTimeout(done, total);
    }
  });
}
// Anneau + éclat rouge/orangé sur la cible d'un coup de combat (distinct de
// l'éclat violet des capacités, voir flashImpact).
function flashCombatImpact(targetEl){
  if(!targetEl) return;
  const fxMs = cms(ANIM_IMPACT_FX_MS);
  if(!fxMs) return;
  const r = targetEl.getBoundingClientRect();
  const ring = document.createElement('div');
  ring.className = 'combat-impact-ring';
  ring.style.left = (r.left+r.width/2)+'px';
  ring.style.top = (r.top+r.height/2)+'px';
  ring.style.animationDuration = fxMs+'ms';
  document.body.appendChild(ring);
  setTimeout(()=>ring.remove(), fxMs+30);
  targetEl.style.animationDuration = fxMs+'ms';
  targetEl.classList.add('combat-hit-flash');
  setTimeout(()=>{ if(targetEl && targetEl.classList){ targetEl.classList.remove('combat-hit-flash'); targetEl.style.animationDuration = ''; } }, fxMs+30);
}

// ---------------- File d'animations de combat ----------------
// Toutes les frappes se jouent maintenant une par une, jamais simultanément
// (même quand plusieurs créatures attaquent la même cible) — et les
// actions des deux joueurs sont figées tant que la file n'est pas vide.
let __combatAnimQueue = [];
let __combatAnimPlaying = false;
let __combatAnimGen = 0;      // identifie la "session" de lecture en cours (voir releaseCombatAnimLock)
let __combatAnimWatchdog = null;
let __combatAnimStartedAt = 0;
// Garde-fous : la file ne doit jamais bloquer le jeu (animation qui ne se
// termine pas, onfinish jamais appelé, onglet en arrière-plan...). Passé ces
// délais on abandonne le reste de la file, on rend l'état final et on débloque
// les actions. Depuis que les séquences de combat sont plus longues, le
// minuteur est RELANCÉ avant chaque élément de la file : MAX_MS = temps
// maximal accordé à UN élément, TOTAL_MAX_MS = plafond pour toute la file.
const COMBAT_ANIM_MAX_MS = 10000;
const COMBAT_ANIM_TOTAL_MAX_MS = 30000;

// ---------------- Vitesse des animations de combat (options) ----------------
// Réglage « Vitesse des animations de combat » de la modale d'options
// (spellcraft-shared.js) : Normale (1x), Rapide (2x : toutes les durées /2),
// Instantanée (animations de combat ignorées, état final rendu directement,
// seul un son d'impact par coup est conservé). cms(ms) convertit une durée
// de référence (vitesse normale) en durée réelle ; 0 en mode instantané.
function combatSpeedMode(){
  try { return typeof scGetCombatSpeedMode==='function' ? scGetCombatSpeedMode() : 'normal'; }
  catch(e){ return 'normal'; }
}
function combatInstant(){ return combatSpeedMode()==='instant'; }
function cms(ms){
  try { return typeof scScaleMs==='function' ? scScaleMs(ms, combatSpeedMode()) : ms; }
  catch(e){ return ms; }
}

// Bouton « Passer » : la classe combat-skip-enabled sur <body> (voir CSS de
// #combat-skip-btn) suit la case à cocher des options, y compris changée en
// cours de partie (événement envoyé par spellcraft-shared.js).
function syncCombatSkipButton(){
  let on = false;
  try { on = typeof scGetShowSkipButton==='function' && scGetShowSkipButton(); } catch(e){}
  document.body.classList.toggle('combat-skip-enabled', !!on);
}
window.addEventListener('sc-combat-options-changed', syncCombatSkipButton);
syncCombatSkipButton();

// Nettoyages à exécuter si la file est interrompue (clones flottants à retirer,
// cartes réelles à rendre visibles) — idempotents. Vidés à chaque fin de file.
let __combatCleanups = [];
function registerCombatCleanup(fn){ __combatCleanups.push(fn); }
// setTimeout lié à la session de lecture en cours : si la file est
// interrompue (garde-fou, bouton Passer) entre-temps, le rappel ne s'exécute pas.
function combatTimeout(fn, ms){
  const gen = __combatAnimGen;
  return setTimeout(()=>{ if(gen === __combatAnimGen) fn(); }, ms);
}
function queueCombatAnim(fn){
  __combatAnimQueue.push(fn);
  processCombatAnimQueue();
}
// Fin de lecture (normale ou forcée) : lève le verrou, affiche l'état final
// puis applique l'éventuel état arrivé entre-temps. Idempotent.
function releaseCombatAnimLock(){
  clearTimeout(__combatAnimWatchdog);
  __combatAnimWatchdog = null;
  __combatAnimGen++; // invalide la boucle de lecture éventuellement encore suspendue
  __combatAnimQueue.length = 0;
  const cleanups = __combatCleanups; __combatCleanups = [];
  cleanups.forEach(fn=>{ try{ fn(); }catch(e){} });
  document.body.classList.remove('combat-anim-lock');
  __combatAnimPlaying = false;
  // Rend d'abord l'état final (S) que le gel avait retenu...
  unfreezeBoardRender();
  // ...puis applique maintenant le dernier état arrivé pendant que la file
  // jouait (voir onStateUpdate) — sinon le plateau resterait figé sur un état
  // périmé jusqu'à la prochaine mise à jour, qui peut tarder.
  if(__pendingStateWhileAnimating){
    const pending = __pendingStateWhileAnimating;
    __pendingStateWhileAnimating = null;
    onStateUpdate(pending);
  }
  maybeAutoFinishBlocking();
}
// Interruption immédiate (bouton « Passer » ou garde-fou) : coupe les sons en
// cours, retire tout ce qui flotte encore (chiffres, flèches, révélation,
// clones), puis lève le verrou et rend l'état final.
const COMBAT_ABORT_PURGE_SELECTOR = '.dmg-popup, .ability-reveal-overlay, .land-fly, .ability-bolt, .ability-impact-ring, .ability-self-burst, .combat-impact-ring, .kw-ghost, .faille-overlay';
function abortCombatAnimations(){
  try { if(typeof stopAllSfx==='function') stopAllSfx(); } catch(e){}
  document.querySelectorAll(COMBAT_ABORT_PURGE_SELECTOR).forEach(n=>n.remove());
  releaseCombatAnimLock();
}
// (Ré)arme le garde-fou : au plus MAX_MS pour l'élément qui démarre, sans
// jamais dépasser TOTAL_MAX_MS depuis le début de la lecture.
function armCombatWatchdog(){
  clearTimeout(__combatAnimWatchdog);
  const left = COMBAT_ANIM_TOTAL_MAX_MS - (Date.now() - __combatAnimStartedAt);
  __combatAnimWatchdog = setTimeout(()=>{
    console.warn('File d\'animations de combat : délai dépassé, rendu final forcé');
    abortCombatAnimations();
  }, Math.max(0, Math.min(COMBAT_ANIM_MAX_MS, left)));
}
async function processCombatAnimQueue(){
  if(__combatAnimPlaying) return;
  __combatAnimPlaying = true;
  const gen = ++__combatAnimGen;
  __combatAnimStartedAt = Date.now();
  document.body.classList.add('combat-anim-lock');
  while(__combatAnimQueue.length){
    if(gen !== __combatAnimGen) return; // déblocage forcé entre-temps
    const fn = __combatAnimQueue.shift();
    armCombatWatchdog();
    try { await fn(); } catch(e) { console.error('Erreur animation de combat', e); }
  }
  if(gen !== __combatAnimGen) return;
  releaseCombatAnimLock();
}
// Chiffre flottant au centre de `anchorEl`. Ancien appel (amount seul) : « -N »
// (rien si 0). `opts.spec` = résultat de damagePopupSpec (bouclier, « 0 »...).
function spawnDamageNumber(anchorEl, amount, opts){
  opts = opts || {};
  const spec = opts.spec || (amount ? damagePopupSpec(amount, false) : null);
  if(!anchorEl || !spec) return;
  const r = anchorEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'dmg-popup ' + spec.cls;
  el.textContent = spec.text;
  el.style.left = (r.left+r.width/2)+'px';
  el.style.top = (r.top+r.height/2)+'px';
  const lifeMs = cms(1400);
  el.style.animationDuration = lifeMs+'ms';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), lifeMs+50);
}
// Effets du choc d'un blocage, appelés au moment de l'impact : sons selon les
// dégâts (voir planBlockSounds), chiffres sur chacune des deux créatures, et
// tremblement d'écran selon le plus gros coup.
function applyBlockImpact(attEl, blkEl, o){
  planBlockSounds(o).forEach(snd=>{
    if(snd.delayMs>0) combatTimeout(()=>playSfx(snd.key, snd.volume), cms(snd.delayMs));
    else playSfx(snd.key, snd.volume);
  });
  // Le coup de l'attaquant (chiffre sur le bloqueur) puis la riposte (chiffre
  // sur l'attaquant, à son emplacement d'origine), avec le même décalage que les sons.
  const specB = damagePopupSpec(o.dmgToBlocker, o.absorbedBlocker);
  const specA = damagePopupSpec(o.dmgToAttacker, o.absorbedAttacker);
  flashCombatImpact(blkEl);
  if(specB) spawnDamageNumber(blkEl, 0, { spec:specB });
  if(specA) combatTimeout(()=>spawnDamageNumber(attEl, 0, { spec:specA }), cms(SFX_RIPOSTE_GAP_MS));
  const big = maxBlockDamage(o);
  if(big!==null) shakeScreen(hitSfxForDamage(big));
}
// Joue l'animation de frappe pour un combat entre deux instId (créature vs
// créature) — appelé juste après avoir reçu la confirmation du serveur.
// Seul l'attaquant charge — le bloqueur ne fait jamais de charge en
// retour, même s'il riposte (voir la discussion sur les animations : la
// bloqueuse ripostant n'est pas "agressive" au sens visuel du terme).
// `outcome` : résultat du blocage (voir resolveBlockOutcome) — dégâts exacts
// si le serveur a envoyé l'événement blockResolved, estimés sinon.
function playCombatStrike(attackerInstId, blockerInstId, outcome, duel){
  if(combatInstant()){
    // mode instantané : pas de charge, de chiffres ni de tremblement ; un seul
    // son d'impact, celui du coup le plus fort
    const snd = pickLoudestSound(planBlockSounds(outcome || {}));
    if(snd) playSfx(snd.key, snd.volume);
    return;
  }
  queueCombatAnim(()=>{
    const attRes = resolveCombatEl(attackerInstId);
    const heroSlot = S.active===MY_KEY ? 'p2' : 'p1';
    const blkRes = blockerInstId ? resolveCombatEl(blockerInstId) : { el: document.getElementById(`hero-frame-${heroSlot}`), temp: false };
    const attEl = attRes.el, blkEl = blkRes.el;
    debugLog(`[anim] playCombatStrike : attEl=${!!attEl} blkEl=${!!blkEl}`, attEl&&blkEl ? 'log-ok' : 'log-error');
    const cleanup = ()=>{ if(attRes.temp) attEl.remove(); if(blkRes.temp) blkEl.remove(); };
    if(!attEl || !blkEl){ cleanup(); return Promise.resolve(); }
    // Dernier repli (ni événement ni créature dans PREV_S) : force lue dans le
    // DOM encore affiché — approximatif, comme avant l'ajout des événements.
    const domAtk = el=>{
      const t = el.querySelector('.nstat-wrap.n-atk .nstat-txt');
      return t ? (parseInt(t.textContent, 10) || 0) : null;
    };
    const o = Object.assign({}, outcome || {});
    if(!isCombatNumber(o.dmgToBlocker)) o.dmgToBlocker = domAtk(attEl);
    if(!isCombatNumber(o.dmgToAttacker)) o.dmgToAttacker = domAtk(blkEl);
    // Pas de recul en fin de coup : le retrait des créatures bloquées / bloqueuses
    // est un état persistant, posé par le rendu au dégel (voir « Posture de combat »).
    return arrowThenLunge(attEl, blkEl, {
      // duel : exactement deux créatures face à face (un attaquant, un seul bloqueur)
      // → elles se frappent l'une l'autre ; sinon seul l'attaquant charge.
      mutual: !!duel && !!blockerInstId && !blkRes.temp && !attRes.temp,
      onImpact: ()=>applyBlockImpact(attEl, blkEl, o)
    }).then(cleanup);
  });
}

/* ============================================================
   RÉVÉLATION 3D — carte jouée / piège déclenché (voir renderGameLog,
   plus bas, qui appelle ceci via queueCombatAnim pour chaque nouvelle
   entrée kind==='play' ou kind==='trap').
   ============================================================ */
// ---- Pose animée d'une créature (les deux camps) ----
// La carte part de la main (celle de l'adversaire en haut), se retourne en
// petit, puis rétrécit jusqu'à la taille de son emplacement et s'y pose. Plus
// de grande carte au milieu de l'écran. L'emplacement réel est caché pendant
// le vol (règle CSS dynamique) et l'arrivée automatique de BFX est réservée.
let LAND_HIDE = new Set();
function syncLandHideStyle(){
  let st = document.getElementById('land-hide-style');
  if(!st){ st = document.createElement('style'); st.id = 'land-hide-style'; document.head.appendChild(st); }
  st.textContent = [...LAND_HIDE].map(id=>`.lane .card-slot[data-inst-id="${String(id).replace(/"/g,'')}"]{visibility:hidden !important;}`).join('\n');
}
function releaseCreatureLanding(id){
  LAND_HIDE.delete(id); syncLandHideStyle();
  try{ if(window.BFX) BFX.unclaim(id); }catch(e){}
}
// Appelée de façon synchrone à la lecture du journal : réserve la créature
// (cachée + arrivée BFX retenue), puis met le vol en file.
function planCreatureLanding(entry, card, opts){
  const id = entry.sourceInstId, mine = entry.ownerKey===MY_KEY;
  LAND_HIDE.add(id); syncLandHideStyle();
  if(window.BFX) BFX.claim(id);
  let flyer = null;
  registerCombatCleanup(()=>{ if(flyer) flyer.remove(); releaseCreatureLanding(id); });
  const ownerP = S[entry.ownerKey];
  queueCombatAnim(async ()=>{
    let slot = document.querySelector(`.lane .card-slot[data-inst-id="${id}"]`);
    if(!slot && opts && opts.stageDeadIds && __boardRenderFrozen){
      renderStagedBoardView(opts.stageDeadIds);
      slot = document.querySelector(`.lane .card-slot[data-inst-id="${id}"]`);
    }
    if(!slot){ releaseCreatureLanding(id); return; }
    const W = 260, H = 366;
    const sr = persRect(slot);
    const cx = sr.left+sr.width/2, cy = sr.top+sr.height/2;
    let sx, sy;
    const drop = mine && window.BFX && BFX.getDrop();
    if(drop){ sx = drop.x; sy = drop.y; }
    else {
      const h = document.getElementById(mine ? 'hand-p1' : 'enemy-hand-row');
      const r = h ? h.getBoundingClientRect() : null;
      sx = r ? r.left+r.width/2 : window.innerWidth/2;
      sy = r ? r.top+r.height/2 : (mine ? window.innerHeight : 0);
    }
    const mx = (sx+cx)/2, my = (sy+cy)/2;
    const s0 = 0.3, s1 = 0.55, s2 = Math.max(0.1, sr.width/W);
    const pos = (x,y,k)=>`translate(${x-W*k/2}px,${y-H*k/2}px) scale(${k})`;
    flyer = document.createElement('div');
    flyer.className = 'land-fly ' + (mine ? 'fx-mine' : 'fx-enemy');
    const inner = document.createElement('div'); inner.className = 'ability-reveal-inner';
    const back = document.createElement('div'); back.className = 'ability-reveal-face ability-reveal-back';
    if(ownerP && ownerP.cardBackUrl){
      back.style.backgroundImage = `url('${String(ownerP.cardBackUrl).replace(/'/g,'')}')`;
      back.style.backgroundSize = 'cover'; back.style.backgroundPosition = 'center';
    }
    const front = document.createElement('div'); front.className = 'ability-reveal-face ability-reveal-front';
    try { front.appendChild(cardEl(card, {isPreview:true})); } catch(e) { console.error('Erreur pose créature (cardEl)', e); }
    inner.appendChild(back); inner.appendChild(front); flyer.appendChild(inner);
    flyer.style.transform = pos(sx,sy,s0); flyer.style.opacity = '0';
    document.body.appendChild(flyer);
    const wait = t=>new Promise(r=>combatTimeout(r, t));
    try {
      combatTimeout(()=>inner.classList.add('flipped'), cms(170));
      await flyer.animate([{transform:pos(sx,sy,s0),opacity:0},{transform:pos(mx,my,s1),opacity:1}],
        {duration:cms(380), easing:'cubic-bezier(.2,.8,.3,1)', fill:'forwards'}).finished;
      await wait(cms(300));
      await flyer.animate([{transform:pos(mx,my,s1),opacity:1},{transform:pos(cx,cy,s2),opacity:1}],
        {duration:cms(420), easing:'cubic-bezier(.5,0,.75,.4)', fill:'forwards'}).finished;
    } catch(e) { /* animation interrompue (bouton Passer) : le nettoyage s'en charge */ }
    if(flyer){ flyer.remove(); flyer = null; }
    releaseCreatureLanding(id);
    const cr = findCreatureInState(S, id) || {};
    const power = Number(cr.curAtk != null ? cr.curAtk : cr.atk) || 0;
    try { if(window.BFX) BFX.creatureArrive(slot, mine, power, true); } catch(e) {}
    await wait(cms(160));
  });
}

/* ============================================================
   ORBE DE SORT — la carte du sort se condense en orbe d'énergie qui part
   vers chaque cible (1 à 3 cibles : un orbe par cible, en éventail ; 4 ou
   plus : une onde balaie tout le camp visé). Le cœur de l'orbe indique
   l'effet (dégâts / soin / bonus), le halo indique qui lance le sort
   (classes .fx-mine / .fx-enemy). Les cibles qui meurent ne sont pas gérées
   ici : leur animation de mort reste jouée par le journal, juste après.
   ============================================================ */
// Cibles « orbe » d'une entrée de journal de sort : [{id, type}] sans doublon,
// hors cibles détruites (animation de mort) et hors la carte elle-même.
function planSpellOrbTargets(entry){
  const out = [], seen = new Set();
  (entry.effects||[]).forEach(eff=>{
    const text = eff.text||'';
    if(/meurt au combat|est détruite|^détruit "|^sacrifie "/i.test(text)) return;
    const type = /soign|regagne|récupèr/i.test(text) ? 'heal'
               : /[+]\d+\/[+]\d+|gagne [+]/i.test(text) ? 'buff' : 'dmg';
    (eff.targetInstIds||[]).forEach(id=>{
      if(!id || id===entry.sourceInstId) return;
      const key = id+'|'+type;
      if(seen.has(key)) return; seen.add(key);
      out.push({id, type});
    });
  });
  return out;
}
const SPELL_ORB_CORE = { dmg:'#ff8a2b', heal:'#5fe08a', buff:'#ffd34a' };
function spellOrbImpact(item, fxCls){
  const el = item.el, r = el.getBoundingClientRect();
  const x = r.left+r.width/2, y = r.top+r.height/2;
  const f = document.createElement('div');
  f.className = 'spell-impact ' + fxCls;
  f.style.left = x+'px'; f.style.top = y+'px';
  f.style.setProperty('--core', SPELL_ORB_CORE[item.type]||SPELL_ORB_CORE.dmg);
  document.body.appendChild(f);
  setTimeout(()=>f.remove(), 620);
  flashImpact(el, fxCls==='fx-enemy' ? false : true);
  if(item.type==='dmg'){
    el.classList.add('spell-hit-shake');
    setTimeout(()=>{ if(el.classList) el.classList.remove('spell-hit-shake'); }, 420);
    if((el.id||'').indexOf('hero-frame')===0 && typeof shakeScreen==='function'){
      try{ shakeScreen('hitMedium'); }catch(e){ /* ignoré */ }
    }
  }
}
// Renvoie une promesse (résolue au dernier impact) ou null si aucune cible n'est
// à l'écran : l'appelant retombe alors sur l'ancienne consumation de la carte.
// onLaunch() est appelé quand l'orbe quitte la carte (on ferme alors la révélation).
function playSpellOrb(flipEl, targets, fxMine, onLaunch){
  if(!flipEl || !flipEl.animate) return null;
  const items = (targets||[]).map(t=>({ el: resolveLogTargetEl(t.id), type: t.type })).filter(t=>t.el);
  if(!items.length) return null;
  const fxCls = fxMine===false ? 'fx-enemy' : 'fx-mine';
  return new Promise(resolve=>{
    if(!cms(1000)){ // mode instantané : pas d'orbe, juste les impacts
      if(onLaunch) onLaunch();
      items.forEach(it=>spellOrbImpact(it, fxCls));
      resolve(); return;
    }
    const r = flipEl.getBoundingClientRect();
    const x0 = r.left+r.width/2, y0 = r.top+r.height/2;
    const condense = cms(450);
    flipEl.animate([
      { transform:'scale(1)', filter:'brightness(1)' },
      { transform:'scale(.2)', filter:'brightness(2.4)', offset:.8 },
      { transform:'scale(.2)', filter:'brightness(2.4)', opacity:0 }
    ], { duration: condense, easing:'ease-in', fill:'forwards' });
    let last = 0;
    const ends = [];
    setTimeout(()=>{
      if(onLaunch) onLaunch();
      const wave = items.length >= 4;
      if(wave){
        const w = document.createElement('div');
        w.className = 'spell-wave ' + fxCls;
        w.style.left = x0+'px'; w.style.top = y0+'px';
        w.style.setProperty('--core', SPELL_ORB_CORE[items[0].type]);
        document.body.appendChild(w);
        const dur = cms(800);
        w.animate([
          { transform:'translate(-50%,-50%) scale(.3)', opacity:1 },
          { transform:'translate(-50%,-50%) scale(9,3)', opacity:.9, offset:.7 },
          { transform:'translate(-50%,-50%) scale(12,3.4)', opacity:0 }
        ], { duration: dur, easing:'ease-in', fill:'forwards' });
        setTimeout(()=>w.remove(), dur+50);
        items.forEach(it=>{
          const b = it.el.getBoundingClientRect();
          const d = cms(300) + cms(Math.hypot(b.left+b.width/2-x0, b.top+b.height/2-y0) * 0.9);
          setTimeout(()=>spellOrbImpact(it, fxCls), d);
          last = Math.max(last, d);
        });
        setTimeout(resolve, last + cms(450));
        return;
      }
      const n = items.length, dur = cms(580);
      items.forEach((it, i)=>{
        const b = it.el.getBoundingClientRect();
        const dx = b.left+b.width/2-x0, dy = b.top+b.height/2-y0;
        const arc = n>1 ? (i-(n-1)/2)*34 : (dx>=0 ? -40 : 40);
        const delay = cms(90)*i;
        const o = document.createElement('div');
        o.className = 'spell-orb ' + fxCls;
        o.style.left = x0+'px'; o.style.top = y0+'px';
        o.style.setProperty('--core', SPELL_ORB_CORE[it.type]||SPELL_ORB_CORE.dmg);
        o.style.opacity = '0';
        document.body.appendChild(o);
        const kf = [];
        for(let k=0;k<=10;k++){
          const f = k/10;
          kf.push({ transform:`translate(${dx*f+arc*Math.sin(Math.PI*f)}px,${dy*f}px) scale(${1+.3*Math.sin(Math.PI*f)})`, opacity: 1 });
        }
        o.animate(kf, { duration: dur, delay, easing:'cubic-bezier(.4,0,.8,.6)', fill:'both' });
        for(let k=0;k<14;k++){
          const f = k/14;
          setTimeout(()=>{
            const t = document.createElement('div');
            t.className = 'spell-trail ' + fxCls;
            t.style.left = (x0+dx*f*f+arc*Math.sin(Math.PI*f*f))+'px';
            t.style.top = (y0+dy*f*f)+'px';
            document.body.appendChild(t);
            t.animate([{opacity:.9,transform:'scale(1)'},{opacity:0,transform:'scale(.2)'}], {duration:cms(380), fill:'both'});
            setTimeout(()=>t.remove(), cms(380)+30);
          }, delay + f*dur);
        }
        setTimeout(()=>{ o.remove(); spellOrbImpact(it, fxCls); }, delay+dur);
        last = Math.max(last, delay+dur);
      });
      setTimeout(resolve, last + cms(450));
    }, condense);
  });
}

function playCardFlipReveal(card, opts={}){
  return new Promise(resolve=>{
    if(!card){ resolve(); return; }
    const overlay = document.createElement('div');
    overlay.className = 'ability-reveal-overlay ' + (opts.fxMine===false ? 'fx-enemy' : 'fx-mine'); // lueur : bleue = vous, rouge = adversaire
    const flip = document.createElement('div');
    flip.className = 'ability-reveal-flip';
    const inner = document.createElement('div');
    inner.className = 'ability-reveal-inner';
    const back = document.createElement('div');
    back.className = 'ability-reveal-face ability-reveal-back';
    if(opts.backUrl){
      // Dos personnalisé du joueur propriétaire (celui équipé dans son
      // profil) — cohérent avec ce qu'il voit déjà à l'ouverture d'un
      // booster ou sur son deck. On garde quand même le loup en petit
      // repère visuel pour un piège, discret dans le coin.
      back.style.backgroundImage = `url('${opts.backUrl.replace(/'/g,'')}')`;
      back.style.backgroundSize = 'cover';
      back.style.backgroundPosition = 'center';
      if(opts.isTrap) back.innerHTML = `<span class="trap-reveal-icon trap-reveal-icon-corner">🐺</span>`;
    } else {
      back.innerHTML = `<span class="trap-reveal-icon">${opts.isTrap ? '🐺' : '🃏'}</span>`;
    }
    const front = document.createElement('div');
    front.className = 'ability-reveal-face ability-reveal-front';
    try {
      front.appendChild(cardEl(card, {isPreview:true}));
    } catch(e) {
      console.error('Erreur playCardFlipReveal (cardEl) :', e, card);
    }
    inner.appendChild(back); inner.appendChild(front);
    flip.appendChild(inner);
    overlay.appendChild(flip);
    document.body.appendChild(overlay);

    let done = false;
    const close = ()=>{
      overlay.classList.remove('show');
      overlay.classList.add('closing');
      setTimeout(()=>{ overlay.remove(); resolve(); }, 300);
    };
    const finish = ()=>{
      if(done) return; done = true;
      // un sort ne disparaît pas en fondu : la carte se consume
      // un sort avec cibles visibles : la carte devient un orbe qui part vers elles
      const orb = (opts.isSpell && opts.orbTargets && opts.orbTargets.length)
        ? playSpellOrb(flip, opts.orbTargets, opts.fxMine, ()=>{ overlay.classList.remove('show'); overlay.classList.add('closing'); })
        : null;
      if(orb) orb.then(()=>{ overlay.remove(); resolve(); });
      else if(opts.isSpell && window.BFX) BFX.burnReveal(flip).then(close);
      else close();
    };
    // Un clic sur l'overlay permet d'écourter — utile pour un joueur qui
    // enchaîne vite et ne veut pas attendre la fin de chaque révélation.
    overlay.onclick = finish;

    requestAnimationFrame(()=>{
      overlay.classList.add('show');
      setTimeout(()=>{ inner.classList.add('flipped'); }, 220);
      if(window.BFX && opts.isSpell) setTimeout(()=>BFX.spellFlash(flip), 220+260);   // éclair lumineux à l'apparition d'un sort
      if(window.BFX && opts.isTrap) BFX.trapJaws();                                     // piège : des mâchoires claquent sur l'écran, puis révèlent la carte
    });
    const holdMs = opts.isTrap ? 1500 : (opts.isSpell ? 850 : 1150);
    setTimeout(finish, 220 + 550 + holdMs);
  });
}


// Faille : brèche qui s'ouvre, la carte qui se déclenche en sort (violet = vous, rose = adversaire)
function playFailleRift(card, opts={}){
  return new Promise(resolve=>{
    if(!card){ resolve(); return; }
    const overlay = document.createElement('div');
    overlay.className = 'faille-overlay ' + (opts.fxMine===false ? 'fx-enemy' : 'fx-mine');
    const stage = document.createElement('div'); stage.className = 'faille-stage';
    const glow = document.createElement('div'); glow.className = 'faille-glow';
    const rift = document.createElement('div'); rift.className = 'faille-rift';
    const win = document.createElement('div'); win.className = 'faille-win';
    stage.appendChild(glow); stage.appendChild(rift);
    for(let i=0;i<14;i++){
      const sp = document.createElement('div'); sp.className='faille-spark';
      sp.style.setProperty('--a', (i*360/14 + (i%2?9:0))+'deg');
      stage.appendChild(sp);
    }
    const holder = document.createElement('div'); holder.className = 'faille-card';
    try { holder.appendChild(cardEl(card, {isPreview:true})); }
    catch(e){ console.error('Erreur playFailleRift (cardEl) :', e, card); }
    win.appendChild(holder);
    stage.appendChild(win);
    overlay.appendChild(stage);
    // Affichage limité au plateau adverse (la zone du joueur reste dégagée)
    const __row = document.querySelector('.board-row.enemy');
    if(__row){
      const rc = __row.getBoundingClientRect();
      if(rc.width>0 && rc.height>0){
        overlay.style.inset = 'auto';
        overlay.style.left = rc.left+'px'; overlay.style.top = rc.top+'px';
        overlay.style.width = rc.width+'px'; overlay.style.height = rc.height+'px';
        stage.style.width = '420px'; stage.style.height = '560px'; stage.style.flex = 'none';
        stage.style.transform = 'scale(' + Math.min(1, (rc.height*1.1)/560) + ')';
      }
    }
    document.body.appendChild(overlay);
    // Déchirure : polygone « lentille » aux bords irréguliers, même nombre de points à chaque étape (interpolable)
    const lens = (w, k)=>{
      let seed = 7; const rnd = ()=>{ seed = (seed*16807)%2147483647; return seed/2147483647; };
      const n = 13, L = [], R = [];
      for(let i=0;i<n;i++){
        const y = i/(n-1)*100, prof = Math.pow(Math.sin(Math.PI*i/(n-1)), .45);
        const j = (rnd()-.5)*5*Math.min(1, w/8), j2 = (rnd()-.5)*5*Math.min(1, w/8);
        L.push([50 - w*k*prof*(0.85+rnd()*.3) + j, y]);
        R.push([50 + w*k*prof*(0.85+rnd()*.3) + j2, y]);
      }
      return 'polygon(' + L.concat(R.reverse()).map(p=>p[0].toFixed(1)+'% '+p[1].toFixed(1)+'%').join(',') + ')';
    };
    const W_OUT = 47, W_IN = 40;
    const openFrames = (w)=>[{clipPath:lens(.4,1),opacity:0},{clipPath:lens(1,1),opacity:1,offset:.12},{clipPath:lens(w,1),opacity:1}];
    const openOpts = {duration:cms(850), easing:'cubic-bezier(.2,.9,.25,1)', fill:'forwards'};
    rift.animate(openFrames(W_OUT), openOpts);
    win.animate(openFrames(W_IN), openOpts);
    let done = false;
    const finish = ()=>{
      if(done) return; done = true;
      const closeOpts = {duration:cms(300), easing:'ease-in', fill:'forwards'};
      rift.animate([{clipPath:lens(W_OUT,1),opacity:1},{clipPath:lens(.4,1),opacity:0}], closeOpts);
      win.animate([{clipPath:lens(W_IN,1),opacity:1},{clipPath:lens(.4,1),opacity:0}], closeOpts);
      overlay.classList.remove('show'); overlay.classList.add('closing');
      setTimeout(()=>{ overlay.remove(); resolve(); }, cms(320));
    };
    overlay.onclick = finish;
    requestAnimationFrame(()=>{ overlay.classList.add('show'); });
    setTimeout(finish, cms(2000));
  });
}

/* ============================================================
   RÉSOLUTION SOURCE/CIBLE D'UNE ENTRÉE DE JOURNAL — voir le champ
   sourceInstId ajouté côté serveur (startLogContext/pushLogEntry) et
   les targetInstIds déjà présents par effet. 'hero-p1'/'hero-p2' sont
   des clés synthétiques (voir logCardOutcome côté serveur) qui
   désignent un héros plutôt qu'une créature — jamais un vrai instId.
   ============================================================ */
function resolveLogSourceEl(entry){
  if(entry.sourceInstId){
    const el = document.querySelector(`[data-instid="${entry.sourceInstId}"]`);
    if(el) return el;
  }
  // Repli : portrait du héros propriétaire de la capacité (piège, région,
  // pouvoir de héros, ou simplement une créature qui n'est plus sur le
  // plateau au moment où l'animation se joue).
  const slot = entry.ownerKey===MY_KEY ? 'p1' : 'p2';
  return document.getElementById(`hero-frame-${slot}`);
}
function resolveLogTargetEl(targetInstId){
  if(!targetInstId) return null;
  if(targetInstId==='hero-p1' || targetInstId==='hero-p2'){
    const serverKey = targetInstId==='hero-p1' ? 'p1' : 'p2';
    const slot = serverKey===MY_KEY ? 'p1' : 'p2';
    return document.getElementById(`hero-frame-${slot}`);
  }
  return document.querySelector(`[data-instid="${targetInstId}"]`);
}

/* ============================================================
   FLÈCHE DE CAPACITÉ — un projectile lumineux voyage de la source vers
   la cible, puis un éclat d'impact marque l'arrivée. Anime un élément
   flottant indépendant (comme lungeToward) — jamais l'élément réel de
   la carte, pour ne pas interférer avec son propre rendu.
   ============================================================ */
function fireAbilityArrow(sourceEl, targetEl, fxMine){
  return new Promise(resolve=>{
    if(!sourceEl || !targetEl){ resolve(); return; }
    const a = sourceEl.getBoundingClientRect(), b = targetEl.getBoundingClientRect();
    const x1 = a.left+a.width/2, y1 = a.top+a.height/2;
    const x2 = b.left+b.width/2, y2 = b.top+b.height/2;
    const dx = x2-x1, dy = y2-y1;
    const dist = Math.hypot(dx,dy) || 1;
    const angle = Math.atan2(dy,dx) * 180/Math.PI;

    const bolt = document.createElement('div');
    bolt.className = 'ability-bolt ' + (fxMine===false ? 'fx-enemy' : 'fx-mine');
    bolt.style.left = x1+'px';
    bolt.style.top = y1+'px';
    document.body.appendChild(bolt);

    const boltMs = cms(420);
    if(!bolt.animate || !boltMs){ bolt.remove(); flashImpact(targetEl, fxMine); resolve(); return; }
    const anim = bolt.animate([
      { transform:`translate(0,-50%) rotate(${angle}deg) translateX(0)`, opacity:0 },
      { transform:`translate(0,-50%) rotate(${angle}deg) translateX(0)`, opacity:1, offset:0.08 },
      { transform:`translate(0,-50%) rotate(${angle}deg) translateX(${dist}px)`, opacity:1, offset:0.92 },
      { transform:`translate(0,-50%) rotate(${angle}deg) translateX(${dist}px)`, opacity:0 }
    ], { duration: boltMs, easing:'cubic-bezier(.3,.1,.2,1)' });
    anim.onfinish = ()=>{ bolt.remove(); flashImpact(targetEl, fxMine); resolve(); };
    anim.oncancel = ()=>{ bolt.remove(); resolve(); };
  });
}
function flashImpact(targetEl, fxMine){
  if(!targetEl) return;
  const fxCls = fxMine===false ? 'fx-enemy' : 'fx-mine';
  const r = targetEl.getBoundingClientRect();
  const ring = document.createElement('div');
  ring.className = 'ability-impact-ring ' + fxCls;
  ring.style.left = (r.left+r.width/2)+'px';
  ring.style.top = (r.top+r.height/2)+'px';
  document.body.appendChild(ring);
  setTimeout(()=>ring.remove(), 520);
  targetEl.classList.add('ability-hit-flash', fxCls);
  setTimeout(()=>{ if(targetEl && targetEl.classList) targetEl.classList.remove('ability-hit-flash', 'fx-mine', 'fx-enemy'); }, 520);
}
// Effet distinct quand une capacité se cible elle-même : pas de flèche
// (rien à relier), un éclat doré qui converge sur la carte suffit à bien
// repérer le déclenchement, sans le confondre avec une flèche classique.
function flashSelfTrigger(el, fxMine){
  return new Promise(resolve=>{
    if(!el){ resolve(); return; }
    const fxCls = fxMine===false ? 'fx-enemy' : 'fx-mine';
    el.classList.add('ability-self-trigger', fxCls);
    setTimeout(()=>{ if(el && el.classList) el.classList.remove('ability-self-trigger', 'fx-mine', 'fx-enemy'); }, 900);
    const r = el.getBoundingClientRect();
    const burst = document.createElement('div');
    burst.className = 'ability-self-burst ' + fxCls;
    burst.style.left = (r.left+r.width/2)+'px';
    burst.style.top = (r.top+r.height/2)+'px';
    document.body.appendChild(burst);
    setTimeout(()=>{ burst.remove(); resolve(); }, 650);
  });
}

