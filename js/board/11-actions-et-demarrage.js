// ============================================================
// Plateau de jeu — 11-actions-et-demarrage
// Actions envoyées au serveur, mulligan, démarrage (initFromUrl), panneaux déplaçables
// (Chargé dans l ordre depuis spellcraft-server-board.html : tout est partagé, comme avant.)
// ============================================================
// ---------------- Actions ----------------
// Empêche d'envoyer une nouvelle action tant que la précédente n'a pas
// fini de se traiter — sinon plusieurs clics rapides se marchent dessus
// sur le verrou serveur (409 "session-busy") et la partie semble bloquée.
let ACTION_IN_FLIGHT = false;
// Message d'erreur visible à l'écran (le panneau de débogage est retiré :
// sans ça, une action refusée par le serveur paraissait « ne rien faire »).
const ACTION_ERROR_LABELS = {
  'pending-sacrifice-choice': 'choisis d\'abord la créature à sacrifier.',
  'pending-discard-choice': 'une défausse est en attente : choisis d\'abord les cartes à défausser.',
  'invalid-discard-choice': 'choix de défausse invalide.',
  'cannot-block': 'cette créature ne peut pas bloquer (étourdie, gelée, Peureuse ou a déjà bloqué).',
  'attacker-not-declared': 'cet attaquant n\'est pas déclaré ce tour.',
  'attacker-gone': 'cet attaquant n\'est plus en jeu.',
  // 'no-valid-target' : message adapté à l'action, voir describeActionError()
  'target-required': 'il faut désigner une cible.',
  'ritual-not-now': "Le Rituel se nourrit une fois par tour, au début du tour : avant de jouer une carte ou d'attaquer.",
  'no-ritual': "Vous n'avez pas de Rituel en cours.",
  'ritual-no-offering': "Ce Rituel n'accepte pas d'Offrande.",
  'offering-required': "Ce sort demande une Offrande : sacrifiez une de vos créatures.",
  'invalid-offering': "Offrande impossible : la créature choisie n'est plus en jeu ou la carte n'a pas d'Offrande. Rien n'est dépensé.",
  'invalid-target': 'cible invalide (hors critères, mauvais camp, créature protégée par Parade ou cible en double) : rien n\'est dépensé.',
  'invalid-choice': 'choix invalide : cette option n\'existe pas sur la carte.',
  'board-full': 'votre plateau est plein (8 créatures) : impossible de jouer cette carte.',
  'not-playable': 'ce sort se déclenche à la pioche : il ne se joue pas depuis la main.',
  'cannot-pay-extra-cost': 'impossible de payer le coût supplémentaire (PV insuffisants ou aucune créature alliée à sacrifier).',
  'artifact-slots-full': 'Vos 2 emplacements d\'artefact sont pleins.',
  'already-activated-this-turn': 'cet artefact a déjà été utilisé ce tour-ci.'
};
function describeActionError(err, label){
  const key = String(err);
  if(key==='no-valid-target'){
    if(label==='Capacité activée') return 'Aucune cible valide : l\'artefact n\'est pas utilisé.';
    if(label==='Pouvoir de héros') return noValidTargetMessage('hero');
    return noValidTargetMessage('card');
  }
  return ACTION_ERROR_LABELS[key] || key;
}
let __actionErrorTimer = null;
function showActionError(msg){
  console.error(msg);
  try{ playSfx('illegal-action', 0.5); }catch(e){}
  let box = document.getElementById('action-error-toast');
  if(!box){
    box = document.createElement('div');
    box.id = 'action-error-toast';
    box.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:100000;max-width:80vw;padding:10px 18px;border-radius:10px;background:rgba(120,25,35,.95);color:#fff;border:1.5px solid var(--gold);font-weight:700;font-size:14px;box-shadow:0 4px 18px rgba(0,0,0,.6);pointer-events:none;';
    document.body.appendChild(box);
  }
  box.textContent = msg;
  box.style.display = 'block';
  if(__actionErrorTimer) clearTimeout(__actionErrorTimer);
  __actionErrorTimer = setTimeout(()=>{ box.style.display = 'none'; }, 5000);
}
// Vrai tant qu'une animation (file de combat ou effet visuel du plateau) joue encore.
function animationsBusy(){
  return !!(__combatAnimPlaying || __combatAnimQueue.length || (window.BFX && BFX.busy()));
}
// Attend la fin des animations (jamais plus de 8 s : un blocage visuel ne doit pas figer la partie).
async function waitForAnimationsIdle(){
  const t0 = Date.now();
  while(animationsBusy() && Date.now()-t0 < 8000){
    await new Promise(r=>setTimeout(r, 60));
  }
}
async function runAction(label, fn, opts){
  if(ACTION_IN_FLIGHT){ debugLog(`${label} → une action est déjà en cours, patiente un instant.`, 'log-error'); return; }
  ACTION_IN_FLIGHT = true;
  document.body.classList.add('action-busy');
  try{ if(window.BFX) BFX.actionStart(label); }catch(e){}
  try{
    // Aucune nouvelle action tant qu'une animation tourne encore (clics bloqués
    // par la feuille de style ; ici on couvre aussi les actions automatiques :
    // elles attendent leur tour au lieu d'être perdues).
    await waitForAnimationsIdle();
    const res = await fn();
    if(res && res.error){
      debugLog(`${label} → ${res.error}`, 'log-error');
      // Erreurs attendues et sans gravité pour cette action (ex. « wrong-phase »
      // quand le serveur avait déjà terminé la phase) : pas de bandeau d'erreur.
      if(!(opts && opts.ignoreErrors && opts.ignoreErrors.includes(res.error))){
        showActionError(`${label} : ${describeActionError(res.error, label)}`);
      }
    } else if(res && res.state){
      // Applique directement l'état renvoyé par l'action elle-même — ne
      // dépend plus uniquement de la diffusion temps réel (qui met à jour
      // les AUTRES clients connectés : adversaire, spectateurs). Sans ça,
      // si la diffusion ne passait pas pour une raison quelconque, l'action
      // réussissait silencieusement côté serveur sans jamais se refléter
      // à l'écran pour l'auteur de l'action lui-même.
      onStateUpdate(res.state);
    }
    return res;
  } catch(e){
    debugLog(`${label} → exception : ${e && e.message || e}`, 'log-error');
    showActionError(`${label} : ${e && e.message || e}`);
  } finally {
    ACTION_IN_FLIGHT = false;
    document.body.classList.remove('action-busy');
    try{ if(window.BFX) BFX.actionEnd(); }catch(e){}
  }
}

let mulliganMarked = new Set(); // indices dans S[MY_KEY].hand marqués "à renvoyer"
let mulliganOverlayShown = false; // pour ne pas reconstruire (et perdre la sélection en cours) à chaque rendu
function showMulliganOverlay(){
  if(mulliganOverlayShown) return;
  mulliganOverlayShown = true;
  mulliganMarked = new Set();
  const overlay = document.getElementById('mulligan-overlay');
  const cardsEl = document.getElementById('mulligan-cards');
  cardsEl.innerHTML = '';
  S[MY_KEY].hand.forEach((card, idx)=>{
    const wrap = document.createElement('div');
    wrap.className = 'mulligan-card-wrap';
    wrap.appendChild(cardEl(card, { inPlay:false, isPreview:true }));
    const tag = document.createElement('div');
    tag.className = 'mulligan-tag';
    tag.textContent = 'Garder';
    wrap.appendChild(tag);
    wrap.onclick = ()=>{
      if(mulliganMarked.has(idx)){
        mulliganMarked.delete(idx);
        wrap.classList.remove('marked');
        tag.textContent = 'Garder';
      } else {
        mulliganMarked.add(idx);
        wrap.classList.add('marked');
        tag.textContent = 'Renvoyer';
      }
    };
    cardsEl.appendChild(wrap);
  });
  overlay.classList.add('show');
  playSfx('firsthand');
}
async function confirmMulligan(){
  if(mulliganMarked.size>0) playSfx('mulligan');
  document.getElementById('mulligan-overlay').classList.remove('show');
  await runAction('Mulligan', ()=>gsMulligan([...mulliganMarked]));
  mulliganOverlayShown = false;
}
function getUseChoiceAbility(card){
  if(!card || !card.abilities) return null;
  return card.abilities.find(ab=>ab.kind==='triggered' && ab.useChoice && ab.choiceA && ab.choiceB) || null;
}
async function uiPlayCard(i, targetInfo, chosenTargets, choiceKey, offeringInstId){
  const card = S[MY_KEY].hand[i];
  const choiceAbility = !choiceKey ? getUseChoiceAbility(card) : null;
  if(choiceAbility){
    showCardChoiceModal(card, choiceAbility, (pickedKey)=>{ uiPlayCard(i, targetInfo, chosenTargets, pickedKey, offeringInstId); });
    return;
  }
  const placeAfter = placementFor(i);
  // Offrande (set La guerre élémentaire) : proposer de sacrifier une créature alliée en plus du coût
  if(offeringInstId===undefined && cardHasOfferingClient(card) && (S[MY_KEY].board||[]).length>0){
    showOfferingModal(card, (picked)=>{ uiPlayCard(i, targetInfo, chosenTargets, choiceKey, picked || null); });
    return;
  }
  if(!offeringInstId && offeringRequiredClient(card)){
    showActionError("Ce sort demande une Offrande : sacrifiez une de vos créatures.");
    return;
  }
  LAST_SACRIFICEABLE_ACTION = { action:'playCardSimple', handIndex:i, targetInfo, chosenTargets, choiceKey, placeAfter, offeringInstId: offeringInstId || undefined };
  await runAction('Jouer carte', ()=>gsPlayCardSimple(i, targetInfo, chosenTargets, choiceKey, undefined, placeAfter, offeringInstId || undefined));
}
function cardHasOfferingClient(card){
  return !!card && (card.abilities||[]).some(ab=>(ab.triggers||[]).some(t=>t.trigger==='offering'));
}
// Fenêtre « Offrande » : choisir la créature alliée à sacrifier, jouer sans Offrande, ou annuler.
function showOfferingModal(card, onPick){
  const old = document.getElementById('offering-overlay'); if(old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'offering-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,4,10,.78);z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;';
  const box = document.createElement('div');
  box.style.cssText = "max-width:560px;width:100%;background:hsl(calc(var(--th, 252) + 1.3) calc(var(--ts-n, 1) * 32.1%) 11% / .97);border:2px solid var(--gold);border-radius:12px;padding:18px 20px;color:#f2ead2;font-family:'Cinzel',serif;";
  const title = document.createElement('div');
  title.style.cssText = 'font-weight:700;font-size:17px;color:var(--gold);margin-bottom:6px;';
  title.textContent = `Offrande — ${card.name}`;
  const sub = document.createElement('div');
  sub.style.cssText = "font-family:inherit;font-size:13px;opacity:.85;margin-bottom:12px;";
  const __req = offeringRequiredClient(card);
  sub.textContent = __req ? "Ce sort demande une Offrande : choisissez la créature à sacrifier." : 'Sacrifier une de vos créatures en plus du coût pour obtenir le bonus d\'Offrande ?';
  box.appendChild(title); box.appendChild(sub);
  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;';
  (S[MY_KEY].board||[]).forEach(c=>{
    const b = document.createElement('button');
    b.className = 'phase-btn';
    b.style.cssText = 'font-size:13px;padding:8px 12px;';
    b.textContent = `${c.name} (${c.curAtk ?? c.atk ?? 0}/${c.curHp ?? c.hp ?? 0})`;
    b.onclick = ()=>{ overlay.remove(); onPick(c.instId); };
    list.appendChild(b);
  });
  box.appendChild(list);
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;';
  const none = document.createElement('button'); none.className='phase-btn'; none.textContent='Jouer sans Offrande';
  none.onclick = ()=>{ overlay.remove(); onPick(null); };
  const cancel = document.createElement('button'); cancel.className='phase-btn'; cancel.textContent='Annuler';
  cancel.onclick = ()=>{ overlay.remove(); };
  if(!__req) row.appendChild(none);
  row.appendChild(cancel); box.appendChild(row);
  overlay.appendChild(box);
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
function showCardChoiceModal(card, ability, onPick){
  const overlay = document.createElement('div');
  overlay.id = 'card-choice-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,4,10,.75);z-index:99998;display:flex;align-items:center;justify-content:center;gap:34px;flex-wrap:wrap;';
  const activeLetters = ['A','B','C','D'].slice(0, ability.numChoices||2);
  activeLetters.forEach(ck=>{
    const choice = ability['choice'+ck];
    if(!choice) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;transition:transform .15s ease;';
    wrap.onmouseenter = ()=>{ wrap.style.transform='translateY(-10px) scale(1.04)'; };
    wrap.onmouseleave = ()=>{ wrap.style.transform=''; };
    const cardVisual = cardEl(card, {isPreview:true});
    wrap.appendChild(cardVisual);
    const label = document.createElement('div');
    label.style.cssText = 'font-family:\'Cinzel\',serif;font-weight:700;color:var(--gold);font-size:15px;background:hsl(calc(var(--th, 252) + 1.3) calc(var(--ts-n, 1) * 32.1%) 11% / .9);border:1.5px solid var(--gold);border-radius:8px;padding:8px 16px;max-width:280px;text-align:center;';
    label.textContent = choice.label || `Choix ${ck}`;
    wrap.appendChild(label);
    wrap.onclick = ()=>{ overlay.remove(); onPick(ck); };
    overlay.appendChild(wrap);
  });
  document.body.appendChild(overlay);
}
async function uiSetTrap(i){
  LAST_SACRIFICEABLE_ACTION = { action:'setTrap', handIndex:i };
  await runAction('Poser le piège', ()=>gsSetTrap(i));
}
async function uiEndTurn(){ playSfx('turn-end'); await runAction('Fin de tour', ()=>gsEndTurn()); }
function uiSelectAllAttackers(){
  const me = S[MY_KEY];
  // Mêmes règles que le serveur et que le clic individuel : canAttackClient()
  // (étourdie, gelée, malade sans Charge, Protecteur, déjà attaqué).
  const eligibleIds = (me.board||[])
    .filter(c=>canAttackClient(c))
    .map(c=>c.instId);
  UI.selectedAttackers = eligibleIds;
  UI.attackTargets = {};   // « Tout sélectionner » : tout le monde sur le héros adverse
  render();
}
async function uiConfirmAttackers(){
  // Aucun attaquant : passer le combat termine le tour. On demande confirmation pour éviter les erreurs.
  if(!UI.selectedAttackers.length && !confirm('Passer le combat ?\nSans attaque, votre tour se termine.')) return;
  const targets = {};
  Object.entries(UI.attackTargets||{}).forEach(([a,t])=>{ if(UI.selectedAttackers.includes(a)) targets[a] = t; });
  await runAction('Attaquer', ()=>gsDeclareAttackers(UI.selectedAttackers, targets));
  UI.selectingAttackers = false; UI.selectedAttackers = []; UI.attackTargets = {}; UI.lastSelectedAttacker = null;
  render();
}
async function uiAssignBlock(attackerId){
  if(!UI.pendingBlocker) return;
  const blockerId = UI.pendingBlocker;
  UI.pendingBlocker = null;
  await runAction('Bloquer', ()=>gsAssignBlock(blockerId, attackerId));
  render();
}
async function uiFinishBlocking(){
  UI.pendingBlocker = null;
  await runAction('Terminer blocage', ()=>gsFinishBlocking());
  render();
}
async function uiProcessAi(){
  await runAction('Tour IA', ()=>gsProcessAiTurn());
  // Le moteur ne joue qu'une étape par appel : filet de sécurité si la mise à jour d'état n'a pas relancé le tour.
  if(S && !S.gameOver && S.phase==='main' && S[S.active] && S[S.active].isAI && !aiTurnBlockedByChoice()) scheduleAiTurn();
}



// Arrivée depuis spellcraft-lobby.html — la sélection de deck et la
// création/jointe de partie sont maintenant sur cette page séparée. Le
// plateau se contente de lire l'identifiant de session et le rôle transmis
// dans l'URL, puis se connecte directement.
async function initFromUrl(){
  const params = new URLSearchParams(window.location.search);
  const sid = params.get('sid');
  const role = params.get('role');
  if(!sid || !role){
    window.location.href = 'spellcraft-lobby.html';
    return;
  }
  GS_SESSION_ID = sid;
  GS_ROLE = role;
  // Corrige un vrai bug : mettre GS_VS_AI à false sans condition faisait
  // tourner la détection de déconnexion même contre l'IA — qui n'envoie
  // jamais de présence, donc "expirait" après le délai de grâce et faisait
  // gagner le joueur humain par forfait automatique, comme si l'IA s'était
  // déconnectée.
  GS_VS_AI = params.get('vsai') === '1';
  // Signal de présence régulier, pour que "Regarder une partie" (dans le
  // lobby) sache distinguer une partie vraiment en cours d'une partie
  // abandonnée — uniquement pour les deux joueurs, pas les spectateurs
  // (c'est leur présence à eux qui détermine si la partie est "vivante").
  if((GS_ROLE==='p1' || GS_ROLE==='p2') && !GS_VS_AI){
    gsRecordPresence(GS_SESSION_ID);
    setInterval(()=>gsRecordPresence(GS_SESSION_ID), 20000);
  }
  // Musique dédiée au combat : rotation entre combat-1 à combat-5 (déjà
  // construite dans spellcraft-shared.js) pour toute la durée de la
  // partie — j'utilisais par erreur playMusic('combat',...) qui cherchait
  // un seul fichier combat.ogg inexistant.
  playCombatMusicRotation(0.35);
  // Chargé en arrière-plan (pas besoin d'attendre) — sert aux aperçus de
  // carte au survol dans le journal, ET à l'animation de révélation 3D
  // d'une carte jouée (qui relit ce tableau au moment où elle s'exécute,
  // voir plus haut — c'est pour ça qu'elle n'a pas besoin d'attendre ici).
  // Même promesse que l'écran d'annonce (getCatalogOnce) : une seule lecture.
  getCatalogOnce();
  afterConnected(null);
}
// Le tutoriel (window.SC_TUTORIAL) démarre avec son propre moteur (spellcraft-tutorial-engine.js).
if(!window.SC_TUTORIAL) initSpellcraftAuth().then(initFromUrl);

// ---------------- Fenêtres déplaçables (journal et chat) ----------------
// On les saisit par leur titre ; double-clic sur le titre = position d'origine.
// La position est retenue dans ce navigateur (et ignorée si elle sort de l'écran).
function makeDraggablePanel(panelId){
  const panel = document.getElementById(panelId);
  if(!panel) return;
  const handle = panel.querySelector('h3');
  if(!handle) return;
  const KEY = 'sc_panel_pos_' + panelId;
  handle.style.cursor = 'move';
  handle.style.userSelect = 'none';
  handle.style.touchAction = 'none';
  handle.title = 'Glisser pour déplacer · double-clic pour remettre en place';

  function scaleOf(){ const r = panel.getBoundingClientRect(); return panel.offsetWidth ? r.width / panel.offsetWidth : 1; }
  function apply(left, top){
    panel.style.left = left + 'px'; panel.style.top = top + 'px';
    panel.style.right = 'auto'; panel.style.bottom = 'auto';
  }
  function offscreen(){
    const r = panel.getBoundingClientRect();
    return r.right < 60 || r.left > window.innerWidth - 60 || r.top < 0 || r.top > window.innerHeight - 40;
  }
  function reset(){
    panel.style.left = panel.style.top = panel.style.right = panel.style.bottom = '';
    try{ localStorage.removeItem(KEY); }catch(e){}
  }
  try{
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if(saved && isFinite(saved.left) && isFinite(saved.top)){ apply(saved.left, saved.top); }
  }catch(e){}
  // La fenêtre est masquée au départ : on ne peut la mesurer qu'une fois ouverte.
  new MutationObserver(()=>{
    if(panel.classList.contains('show') && panel.style.left && offscreen()) reset();
  }).observe(panel, { attributes:true, attributeFilter:['class'] });

  let drag = null;
  handle.addEventListener('pointerdown', (e)=>{
    if(e.target.closest('.close-journal-btn') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const r = panel.getBoundingClientRect(), cs = getComputedStyle(panel);
    drag = { x:e.clientX, y:e.clientY, rl:r.left, rt:r.top, cl:parseFloat(cs.left) || 0, ct:parseFloat(cs.top) || 0, k:scaleOf() };
    try{ handle.setPointerCapture(e.pointerId); }catch(_){}
    panel.style.zIndex = '99998';
    const other = document.getElementById(panelId === 'chat-panel' ? 'journal-panel' : 'chat-panel');
    if(other) other.style.zIndex = '99997';
    e.preventDefault();
  });
  handle.addEventListener('pointermove', (e)=>{
    if(!drag) return;
    const nl = Math.max(0, Math.min(window.innerWidth - 80, drag.rl + (e.clientX - drag.x)));
    const nt = Math.max(0, Math.min(window.innerHeight - 40, drag.rt + (e.clientY - drag.y)));
    apply(drag.cl + (nl - drag.rl) / drag.k, drag.ct + (nt - drag.rt) / drag.k);
  });
  const end = ()=>{
    if(!drag) return;
    drag = null;
    try{ localStorage.setItem(KEY, JSON.stringify({ left:parseFloat(panel.style.left), top:parseFloat(panel.style.top) })); }catch(e){}
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
  handle.addEventListener('dblclick', (e)=>{ if(!e.target.closest('.close-journal-btn')) reset(); });
}
makeDraggablePanel('journal-panel');
makeDraggablePanel('chat-panel');
