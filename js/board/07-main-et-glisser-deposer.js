// ============================================================
// Plateau de jeu — 07-main-et-glisser-deposer
// Main adverse et main du joueur, éventail, glisser-déposer maison, flèches de ciblage
// (Chargé dans l ordre depuis spellcraft-server-board.html : tout est partagé, comme avant.)
// ============================================================
let PREV_HAND_LENGTH = null;
let PREV_ENEMY_HAND = null;
function renderEnemyHand(){
  const el = document.getElementById('enemy-hand-row');
  if(!el || !S) return;
  el.innerHTML = '';
  const opp = S[OPP_KEY];
  if(!opp) return;
  // En mode spectateur, cette main (celle du "haut") devient visible en
  // clair si son propriétaire a activé le partage — sinon dos de cartes
  // comme d'habitude.
  if(GS_ROLE==='spectator' && opp.showHandToSpectators){
    (opp.hand||[]).forEach(card=>{
      const c = cardEl(card, {});
      c.classList.add('enemy-hand-card-revealed');
      el.appendChild(c);
    });
    return;
  }
  const backUrl = opp.cardBackUrl;
  const count = (opp.hand||[]).length;
  const __grown = (PREV_ENEMY_HAND!==null && count>PREV_ENEMY_HAND) ? count-PREV_ENEMY_HAND : 0;
  PREV_ENEMY_HAND = count;
  const __newEnemy = [];
  for(let i=0;i<count;i++){
    const c = document.createElement('div');
    c.className = 'enemy-hand-card';
    if(backUrl) c.style.backgroundImage = `url('${backUrl.replace(/'/g,"")}')`;
    el.appendChild(c);
    if(__grown>0 && i>=count-__grown) __newEnemy.push({ el: c });
  }
  applyEnemyHandFan();
  if(__newEnemy.length && window.BFX){
    BFX.drawFly(document.querySelector('#deck-zone-p2 .deck-back-visual'), __newEnemy, backUrl);
  }
}
// Main adverse (dos de cartes) : même éventail que la nôtre, vu à l'envers (symétrie par rapport au centre du plateau).
function applyEnemyHandFan(){
  const row = document.getElementById('enemy-hand-row');
  if(!row) return;
  const cards = [...row.querySelectorAll(':scope > .enemy-hand-card')];
  const n = cards.length;
  if(!n) return;
  const w = cards[0].offsetWidth || 92;
  const avail = Math.max(200, row.clientWidth - 28);
  let step = w - Math.round(w*0.3);                    // chevauchement d'environ 30 %
  if(n>1 && step*(n-1)+w > avail) step = (avail - w)/(n-1);
  const half = (n-1)/2;
  const ang = n>1 ? Math.min(4.5, 28/(n-1)) : 0;
  const k = half>0 ? Math.min(2.2, 12/(half*half)) : 0;  // descente max ≈ 12 px (la barre du haut est juste au-dessus)
  cards.forEach((c,i)=>{
    const t = i-half;
    c.style.marginLeft = i===0 ? '0px' : (step-w)+'px';
    c.style.setProperty('--er', (-t*ang).toFixed(2)+'deg');
    c.style.setProperty('--ey', (-k*t*t).toFixed(2)+'px');
  });
}
// Option « Montrer ma main aux spectateurs » — rangée dans le menu des options (engrenage du haut),
// réservée aux deux joueurs (un spectateur n'a pas de main à révéler). Reflète l'état réel à chaque rendu.
function installBoardOptionRows(){
  if(typeof scOptionsAddSection !== 'function') return false;
  if(window.__revealSecAdded) return true;
  window.__revealSecAdded = true;
  scOptionsAddSection({
    id:'spectateurs', icon:'👁', label:'Spectateurs',
    visible:()=>GS_ROLE==='p1' || GS_ROLE==='p2',
    render:()=>{ const on = !!(S[MY_KEY] && S[MY_KEY].showHandToSpectators);
      return '<div class="so-row"><span style="font-size:13.5px">Montrer ma main aux spectateurs</span><button type="button" class="so-sw'+(on?' on':'')+'" data-reveal role="switch" aria-checked="'+(on?'true':'false')+'"></button></div>'; },
    bind:(root)=>{ const b = root.querySelector('[data-reveal]'); if(b) b.onclick = ()=>toggleRevealHandToSpectators(); }
  });
  return true;
}
function renderRevealHandToggle(){
  if(!installBoardOptionRows()) return; // le menu d'options n'est pas encore là : réessayé au rendu suivant
  if(window.__scOptionsRefresh) window.__scOptionsRefresh('spectateurs');
}
async function toggleRevealHandToSpectators(){
  const currentlyRevealed = !!S[MY_KEY].showHandToSpectators;
  await runAction('Main révélée', ()=>gsSetShowHandToSpectators(!currentlyRevealed));
}

function renderHand(){
  const live = document.getElementById('hand-p1');
  let el = live;
  const p = S[MY_KEY];
  const myTurn = S.active===MY_KEY;
  const hand = p.hand||[];
  // Correctif d'un vrai bug préexistant : un spectateur héritait de
  // MY_KEY='p1' par défaut (voir plus haut), ce qui lui montrait la main
  // de p1 en clair sans le vouloir, en permanence. Désormais, en mode
  // spectateur, cette main ne s'affiche en clair que si son propriétaire
  // a explicitement activé le partage — sinon dos de cartes, comme pour
  // l'autre main.
  if(GS_ROLE==='spectator' && !p.showHandToSpectators){
    el.innerHTML = '';
    live.dataset.sig = '';
    const backUrl = p.cardBackUrl;
    hand.forEach(()=>{
      const c = document.createElement('div');
      c.className = 'enemy-hand-card';
      if(backUrl) c.style.backgroundImage = `url('${backUrl.replace(/'/g,"")}')`;
      el.appendChild(c);
    });
    return;
  }
  // anime les cartes nouvellement arrivées en main depuis le dernier rendu
  // (mulligan, pioche normale, etc.) — repose sur le fait que les nouvelles
  // cartes sont toujours ajoutées à la fin côté serveur.
  const newCount = (PREV_HAND_LENGTH!==null && hand.length>PREV_HAND_LENGTH) ? (hand.length-PREV_HAND_LENGTH) : 0;
  PREV_HAND_LENGTH = hand.length;
  if(newCount>0) playSfx('draw');
  const __newDrawn = [];
  // Défausse au choix : une carte à défausser doit être désignée par nous (contour bleu), puis validée
  const pd = (S.pendingDiscard && S.pendingDiscard.playerKey===MY_KEY && GS_ROLE!=='spectator') ? S.pendingDiscard : null;
  if(!pd) UI.discardSel = [];
  else UI.discardSel = (UI.discardSel||[]).filter(i=>i<Math.min(pd.eligible, hand.length));
  if(pd) revealHand();
  // Construction hors du DOM : la main n'est remplacée que si son contenu a vraiment changé (voir plus bas).
  el = document.createElement('div');
  // Ordre d'affichage choisi par le joueur (glisser-déposer). Les index passés aux actions restent les index RÉELS de la main.
  const displayOrder = pd ? hand.map((_,j)=>j) : computeHandDisplayOrder(hand);
  displayOrder.forEach((i)=>{
    const card = hand[i];
    // Un Piège se pose gratuitement (le coût n'est payé qu'au déclenchement) :
    // le mana ne conditionne donc pas sa jouabilité.
    const isTrapCard = card.type==='Piège';
    const affordable = isTrapCard || getEffectiveCostClient(p, card) <= (p.manaNormal + p.manaFragile);
    const isPendingTrap = !!card.pendingTrap;
    const isLockedTrap = !!card.activeTrap; // un piège déjà armé, lui, reste verrouillé
    // Choix bloquant en attente pour nous (sacrifice, découverte, mot-clé) :
    // le serveur refuse toute autre action tant qu'il n'est pas résolu.
    const hasBlockingChoice = [S.pendingSacrifice, S.pendingDiscover, S.pendingKeywordChoice, S.pendingTarget, S.pendingDiscard].some(x=>x && x.playerKey===MY_KEY);
    // Coût supplémentaire : porté par la carte ou par l'une de ses capacités (comme le serveur)
    const extraSrc = card.extraCostEnabled ? card : ((card.abilities||[]).find(a=>a.extraCostEnabled) || card);
    const hasSacrificeCost = !isTrapCard && extraSrc.extraCostEnabled && extraSrc.extraCostType==='sacrificeCreature';
    // Sort "quand piochée" : non jouable depuis la main (serveur : not-playable)
    const drawOnlySpell = card.type==='Sortilège' && !spellIsPlayableClient(card);
    // Plateau plein (8 créatures) / artefacts pleins (2) — sauf si un coût de
    // sacrifice libère de la place (cas incertain : on ne grise pas).
    const noRoom = (card.type==='Créature' && (p.board||[]).length>=8 && !hasSacrificeCost)
                || (card.type==='Artefact' && (p.relics||[]).length>=2 && !hasSacrificeCost);
    // Coût additionnel impayable (pas de piège : pose gratuite, cas incertain)
    const extraCostUnpayable = !isTrapCard && extraSrc.extraCostEnabled && (
         (extraSrc.extraCostType==='sacrificeCreature' && (p.board||[]).length<1)
      || (extraSrc.extraCostType==='discardCard' && hand.filter((c,j)=>j!==i).length<1)
      || (extraSrc.extraCostType==='loseLife' && !(p.hp > (extraSrc.extraCostAmount || 1)))) // PV <= coût : injouable
      || (offeringRequiredClient(card) && (p.board||[]).length<1); // Offrande obligatoire sans créature à sacrifier
    const canPlay = GS_ROLE!=='spectator' && myTurn && S.phase==='main' && affordable && !UI.selectingAttackers && !isLockedTrap && !isPendingTrap
                    && !hasBlockingChoice && !noRoom && !extraCostUnpayable && !drawOnlySpell;
    const el2 = cardEl(card, {});
    el2.classList.add('hand-card');
    el2.dataset.cp = canPlay ? '1' : '0'; // fait partie de la signature : la main n'est pas reconstruite si rien n'a changé
    const slot = document.createElement('div');
    slot.className = 'hand-card-slot';
    slot.dataset.handIndex = String(i);
    if(newCount>0 && i>=hand.length-newCount){ slot.classList.add('card-just-drawn'); __newDrawn.push({ el: slot }); }
    slot.appendChild(el2);
    if(!canPlay && !isPendingTrap) el2.classList.add('hand-card-dim');
    if(drawOnlySpell){
      const dbadge = document.createElement('div');
      dbadge.style.cssText = 'position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;background:hsl(calc(var(--th, 252) + 3) calc(var(--ts-n, 1) * 14.3%) 38.4%);color:#fff;white-space:nowrap;z-index:6;';
      dbadge.textContent = 'Se déclenche à la pioche';
      el2.appendChild(dbadge);
      el2.title = 'Ce sort se déclenche à la pioche : il ne se joue pas depuis la main.';
      slot.title = el2.title;
      if(myTurn){
        el2.style.cursor = 'help';
        el2.addEventListener('click', ()=>showActionError('Ce sort se déclenche à la pioche : il ne se joue pas depuis la main.'));
      }
    }
    if(isPendingTrap || isLockedTrap){
      const badge = document.createElement('div');
      badge.style.cssText = 'position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;background:var(--gold);color:hsl(calc(var(--th, 252) + 4.4) calc(var(--ts-n, 1) * 27.5%) 15.7%);white-space:nowrap;z-index:6;';
      badge.textContent = isLockedTrap ? 'Armé' : 'En attente... (cliquer pour annuler)';
      el2.appendChild(badge);
    }
    if(pd){
      const choosable = i < pd.eligible;
      if(!choosable) el2.classList.add('hand-card-dim');
      if(choosable){
        el2.classList.add('discard-choosable');
        if((UI.discardSel||[]).includes(i)) el2.classList.add('discard-selected');
        el2.addEventListener('click', ()=>toggleDiscardChoice(i));
      }
    }
    el2.addEventListener('mouseenter', (ev)=>{ if(DRAG_STATE) return; revealHand(); showHeroPreview(card, ev); });
    el2.addEventListener('mousemove', (ev)=>{ if(!DRAG_STATE) moveHeroPreview(ev); });
    el2.addEventListener('mouseleave', ()=>{ scheduleHideHand(); hidePreview(); });
    if(canPlay && !pd){
      el2.style.cursor = 'grab';
      el2.style.touchAction = 'none';
      el2.addEventListener('pointerdown', (ev)=>startCardDrag(ev, i, el2));
    } else if(!pd && !isPendingTrap){
      // Carte non jouable pour l'instant : on peut quand même la glisser pour réorganiser sa main.
      el2.style.cursor = 'grab';
      el2.style.touchAction = 'none';
      el2.addEventListener('pointerdown', (ev)=>startCardDrag(ev, i, el2, true));
    } else if(isPendingTrap && myTurn && S.phase==='main' && !UI.selectingAttackers){
      // Toujours interactif — un simple clic annule le piège, pas besoin de
      // glisser-déposer puisqu'il ne s'agit pas de le jouer une seconde fois.
      el2.style.cursor = 'pointer';
      el2.onclick = ()=>uiSetTrap(i);
    }
    el.appendChild(slot);
  });
  // Rien n'a changé (ex. resynchronisation silencieuse toutes les 6 s) : on garde les cartes en place.
  // Les reconstruire faisait retomber puis remonter la carte survolée, d'où l'effet « la main sautille ».
  const sig = el.innerHTML.replace(/\bnd\d+-/g, 'nd#-'); // les identifiants de dégradés SVG changent à chaque rendu : on les ignore
  if(live.dataset.sig === sig && live.children.length === el.children.length && !DRAG_STATE && !__newDrawn.length){
    return;
  }
  live.replaceChildren(...el.childNodes);
  live.dataset.sig = sig;
  applyHandFan();
  // la carte piochée voyage du paquet jusqu'à la main
  if(__newDrawn.length && window.BFX){
    const deckEl = document.querySelector('#deck-zone-p1 .deck-back-visual');
    BFX.drawFly(deckEl, __newDrawn, p.cardBackUrl);
  }
}

// ---------------- Main en éventail + réorganisation ----------------
// Ordre d'affichage voulu par le joueur : liste de {k, id} (k = JSON de la carte, id = id/nom de repli).
// Les cartes de la main n'ont pas d'identifiant unique côté serveur : on les retrouve par leur contenu
// (deux cartes identiques sont interchangeables). L'ordre ne vit que dans ce navigateur.
let HAND_ORDER = [];
function handCardKey(card){
  try{ const c = {...card}; delete c._drawnOnTurn; return JSON.stringify(c); }catch(e){ return String(card && (card.id||card.name)); }
}
function handCardId(card){ return String(card && (card.id!==undefined ? card.id : card.name)); }
// Renvoie les index réels de la main, dans l'ordre d'affichage ; met HAND_ORDER à jour (cartes jouées retirées, piochées ajoutées à la fin).
function computeHandDisplayOrder(hand){
  const keys = hand.map(handCardKey), ids = hand.map(handCardId);
  const used = new Array(hand.length).fill(false);
  const slots = HAND_ORDER.map(()=>-1);
  HAND_ORDER.forEach((e,pos)=>{                       // 1) même carte, même contenu
    const j = keys.findIndex((kk,idx)=>!used[idx] && kk===e.k);
    if(j>=0){ used[j]=true; slots[pos]=j; }
  });
  HAND_ORDER.forEach((e,pos)=>{                       // 2) carte modifiée entre-temps : même id
    if(slots[pos]>=0) return;
    const j = ids.findIndex((ii,idx)=>!used[idx] && ii===e.id);
    if(j>=0){ used[j]=true; slots[pos]=j; }
  });
  const order = slots.filter(j=>j>=0);
  hand.forEach((_,j)=>{ if(!used[j]) order.push(j); }); // nouvelles cartes : à la fin
  HAND_ORDER = order.map(j=>({k:keys[j], id:ids[j]}));
  return order;
}
// Éventail : inclinaison + léger arc + chevauchement, recalculés à chaque rendu / réorganisation.
function applyHandFan(){
  const row = document.getElementById('hand-p1');
  if(!row) return;
  const slots = [...row.querySelectorAll(':scope > .hand-card-slot')];
  const n = slots.length;
  if(!n) return;
  const z = parseFloat(getComputedStyle(slots[0]).zoom) || 1; // écran compact : les cartes sont réduites (zoom)
  const W = 177 * z;
  const avail = Math.max(300, row.clientWidth - 28);
  let step = W - 30;                                   // chevauchement mini de 30 px
  if(n>1 && step*(n-1)+W > avail) step = (avail - W)/(n-1);
  const half = (n-1)/2;
  const ang = n>1 ? Math.min(4.5, 28/(n-1)) : 0;
  const k = half>0 ? Math.min(3.2, 26/(half*half)) : 0; // descente max ≈ 26 px pour les cartes de bord
  slots.forEach((sl,i)=>{
    const t = i-half;
    sl.style.marginLeft = i===0 ? '0px' : ((step-W)/z)+'px';
    sl.style.setProperty('--fr', (t*ang).toFixed(2)+'deg');
    sl.style.setProperty('--fy', (k*t*t).toFixed(2)+'px');
  });
}
// Pendant un glisser : la carte tenue prend la place visée parmi les autres (aperçu en direct).
function previewHandReorder(ev){
  const st = DRAG_STATE;
  if(!st || !st.slot) return false;
  const row = document.getElementById('hand-p1');
  const rowTop = row.getBoundingClientRect().top;
  if(ev.clientY < rowTop + 30) return false;           // pas dans la zone de la main
  const others = [...row.querySelectorAll(':scope > .hand-card-slot')].filter(x=>x!==st.slot);
  let target = 0;
  others.forEach(o=>{ const r = o.getBoundingClientRect(); if(ev.clientX > r.left + r.width/2) target++; });
  const cur = [...row.children].indexOf(st.slot);
  if(cur !== target){
    row.insertBefore(st.slot, others[target] || null);
    applyHandFan();
  }
  return true;
}
function commitHandReorderFromDom(){
  const row = document.getElementById('hand-p1');
  const hand = (S && S[MY_KEY] && S[MY_KEY].hand) || [];
  const order = [...row.querySelectorAll(':scope > .hand-card-slot')].map(sl=>parseInt(sl.dataset.handIndex,10)).filter(j=>j>=0 && j<hand.length);
  if(order.length!==hand.length) return;
  HAND_ORDER = order.map(j=>({k:handCardKey(hand[j]), id:handCardId(hand[j])}));
}

// La main entière glisse hors de l'écran, ne laissant dépasser qu'un tiers
// du haut des cartes — survoler une carte la fait toutes remonter. La zone
// elle-même reste "pointer-events:none" (chaque carte gère son propre survol)
// pour ne jamais bloquer les clics sur ce qu'il y a derrière (héros, défausse...).
let HAND_HIDE_TIMER = null;
function revealHand(){
  if(HAND_HIDE_TIMER){ clearTimeout(HAND_HIDE_TIMER); HAND_HIDE_TIMER = null; }
  document.getElementById('hand-p1').style.transform = 'translateY(0)';
}
function scheduleHideHand(){
  if(HAND_HIDE_TIMER) clearTimeout(HAND_HIDE_TIMER);
  HAND_HIDE_TIMER = setTimeout(()=>{
    if(S && S.pendingDiscard && S.pendingDiscard.playerKey===MY_KEY) return; // la main reste visible pendant le choix de défausse
    if(!DRAG_STATE) document.getElementById('hand-p1').style.transform = '';
  }, 120);
}

// ---------------- Glisser-déposer "fait maison" (événements de pointeur) ----------------
// Remplace le drag-and-drop HTML5 natif, trop capricieux selon les
// navigateurs — ici on suit nous-mêmes le curseur/doigt avec un clone visuel.
let DRAG_STATE = null;

/* ============================================================
   CIBLAGE VISUEL — ligne fléchée qui suit la souris (portée depuis
   l'ancien prototype)
   ============================================================ */
let targetSource = null;
let targetMouse = null;
let lastMousePos = null; // dernière position connue de la souris (la flèche ne repart pas de la source à chaque rendu)

function elCenter(el){
  const r = el.getBoundingClientRect();
  return {x:r.left+r.width/2, y:r.top+r.height/2};
}
function beginTargeting(el){
  if(!el) return;
  hidePreview();
  targetSource = elCenter(el);
  targetMouse = lastMousePos ? {...lastMousePos} : {...targetSource};
  document.body.classList.add('targeting');
  drawTargetLine();
}
// Flèches fixes vers les cibles déjà choisies (étape en cours + étapes précédentes) :
// elles restent affichées pendant qu'on choisit les suivantes, pour garder le compte.
function pickedTargetEl(marker){
  if(typeof marker==='string' && marker.startsWith('hero:')){
    const k = marker.slice(5);
    return document.getElementById(k===MY_KEY ? 'hero-frame-p1' : 'hero-frame-p2');
  }
  return document.querySelector(`[data-instid="${marker}"]`);
}
function drawFixedTargets(){
  const g = document.getElementById('target-fixed');
  if(!g) return;
  g.innerHTML = '';
  const pn = UI.pendingNewTarget;
  if(!pn || !targetSource) return;
  const markers = [];
  Object.values(pn.collected || {}).forEach(arr=>(arr||[]).forEach(m=>markers.push(m)));
  (pn.selectedInstIds || []).forEach(m=>markers.push(m));
  const NS = 'http://www.w3.org/2000/svg';
  markers.forEach(m=>{
    const el = pickedTargetEl(m);
    if(!el) return;
    const {x:x2,y:y2} = elCenter(el);
    const {x:x1,y:y1} = targetSource;
    const angle = Math.atan2(y2-y1, x2-x1);
    const ln = document.createElementNS(NS, 'line');
    ln.setAttribute('class', 'target-fixed-line');
    ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
    ln.setAttribute('x2', x2 - Math.cos(angle)*22); ln.setAttribute('y2', y2 - Math.sin(angle)*22);
    g.appendChild(ln);
    const backX = x2 - Math.cos(angle)*26, backY = y2 - Math.sin(angle)*26;
    const perpX = Math.cos(angle+Math.PI/2)*12, perpY = Math.sin(angle+Math.PI/2)*12;
    const hd = document.createElementNS(NS, 'polygon');
    hd.setAttribute('class', 'target-fixed-head');
    hd.setAttribute('points', `${x2},${y2} ${backX+perpX},${backY+perpY} ${backX-perpX},${backY-perpY}`);
    g.appendChild(hd);
  });
}
function endTargeting(){
  const fx = document.getElementById('target-fixed'); if(fx) fx.innerHTML = '';
  targetSource = null; targetMouse = null;
  document.body.classList.remove('targeting');
  document.body.classList.remove('block-targeting');
  document.getElementById('target-line').style.display='none';
  document.getElementById('target-origin').style.display='none';
  document.getElementById('target-arrow').style.display='none';
}
function drawTargetLine(){
  if(!targetSource || !targetMouse) return;
  const {x:x1,y:y1} = targetSource;
  const {x:x2,y:y2} = targetMouse;
  drawFixedTargets();
  const line = document.getElementById('target-line');
  const origin = document.getElementById('target-origin');
  const arrow = document.getElementById('target-arrow');
  const angle = Math.atan2(y2-y1, x2-x1);
  const shorten = 22;
  const ex = x2 - Math.cos(angle)*shorten, ey = y2 - Math.sin(angle)*shorten;
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', ex); line.setAttribute('y2', ey);
  line.style.display='block';
  origin.setAttribute('cx', x1); origin.setAttribute('cy', y1);
  origin.style.display='block';
  const backX = x2 - Math.cos(angle)*26, backY = y2 - Math.sin(angle)*26;
  const perpX = Math.cos(angle+Math.PI/2)*12, perpY = Math.sin(angle+Math.PI/2)*12;
  arrow.setAttribute('points', `${x2},${y2} ${backX+perpX},${backY+perpY} ${backX-perpX},${backY-perpY}`);
  arrow.style.display='block';
}
document.addEventListener('mousemove', (e)=>{
  lastMousePos = {x:e.clientX, y:e.clientY};
  if(!targetSource) return;
  targetMouse = {x:e.clientX, y:e.clientY};
  drawTargetLine();
});
document.addEventListener('keydown', (e)=>{
  if(e.key==='Escape'){
    if(UI.pendingNewTarget){ cancelPendingNewTarget(); }
    else if(UI.pendingCard){ cancelPendingCard(); }
  }
});

