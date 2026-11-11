// ============================================================
// Plateau de jeu — 09-pose-par-glisser
// Glisser une carte sur le plateau : zone de dépôt, placement, validation
// (Chargé dans l ordre depuis spellcraft-server-board.html : tout est partagé, comme avant.)
// ============================================================
let JOURNAL_CARD_LOOKUP = {}; // id -> carte complète, pour les aperçus au survol dans le journal

function startCardDrag(ev, handIndex, sourceEl, reorderOnly){
  ev.preventDefault();
  playSfx('card-take', 0.5);
  const slotEl = sourceEl.parentElement && sourceEl.parentElement.classList.contains('hand-card-slot') ? sourceEl.parentElement : null;
  // Mesure à plat (sans l'inclinaison de l'éventail ni l'effet de survol) pour que le fantôme ait la bonne taille.
  let rect;
  if(slotEl){
    const prevT = sourceEl.style.transition, prevTf = sourceEl.style.transform;
    sourceEl.style.transition = 'none'; sourceEl.style.transform = 'scale(0.59)';
    rect = sourceEl.getBoundingClientRect();
    sourceEl.style.transform = prevTf; void sourceEl.offsetWidth; sourceEl.style.transition = prevT;
  } else rect = sourceEl.getBoundingClientRect();
  const ghost = sourceEl.cloneNode(true);
  ghost.style.position = 'fixed';
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  ghost.style.width = rect.width + 'px';
  ghost.style.height = rect.height + 'px';
  ghost.style.margin = '0';
  ghost.style.zIndex = '9999';
  ghost.style.pointerEvents = 'none';
  ghost.style.transform = 'scale(1.08) rotate(-2deg)';
  ghost.style.boxShadow = '0 16px 30px rgba(0,0,0,.6)';
  ghost.classList.add('drag-ghost');
  document.body.appendChild(ghost);

  const wasDim = sourceEl.classList.contains('hand-card-dim'); // carte déjà assombrie (non jouable) : le reste après le glisser
  sourceEl.classList.add('hand-card-dim');

  hidePreview();
  if(slotEl) slotEl.classList.add('hand-reorder-src');
  DRAG_STATE = {
    handIndex, ghost, slot: slotEl, reorderOnly: !!reorderOnly, wasDim,
    domOrder0: slotEl ? [...slotEl.parentElement.children].map(x=>x.dataset.handIndex).join(',') : '',
    offsetX: ev.clientX - rect.left,
    offsetY: ev.clientY - rect.top,
    sourceEl
  };

  document.addEventListener('pointermove', onCardDragMove);
  document.addEventListener('pointerup', onCardDragEnd);
}

function isOverDropZone(ev){
  const lane = document.getElementById('lane-p1');
  const laneRect = lane.getBoundingClientRect();
  // La zone valide s'étend du haut de la voie de combat jusqu'à une petite
  // marge en dessous (un geste vers le haut depuis la main suffit) — mais
  // PAS jusqu'à la main elle-même, sinon relâcher la carte sans vraiment la
  // déplacer (ou la reposer dans sa main) jouerait la carte par erreur.
  const forgivingMargin = 70;
  if(ev.clientX>=laneRect.left && ev.clientX<=laneRect.right && ev.clientY>=laneRect.top && ev.clientY<=laneRect.bottom+forgivingMargin) return true;

  // les emplacements d'artefacts comptent aussi comme zone de dépôt valide
  const slots = document.querySelectorAll('#artifacts-p1 .relic-slot');
  for(const s of slots){
    const r = s.getBoundingClientRect();
    if(ev.clientX>=r.left && ev.clientX<=r.right && ev.clientY>=r.top && ev.clientY<=r.bottom) return true;
  }
  return false;
}

// ----- Placement d'une créature : où la poser parmi les autres -----
// Renvoie { slots, index } : index = nombre de créatures situées « avant » le point du curseur
// (de gauche à droite, rangée par rangée si la voie passe sur plusieurs lignes).
function computeInsertion(ev){
  const lane = document.getElementById('lane-p1');
  const slots = [...lane.querySelectorAll(':scope > .card-slot[data-inst-id]')];
  let index = 0;
  slots.forEach(sl=>{
    const r = sl.getBoundingClientRect();
    const before = ev.clientY > r.bottom || (ev.clientY >= r.top && ev.clientX > r.left + r.width/2);
    if(before) index++;
  });
  return { slots, index };
}
function clearInsertionPreview(){
  document.querySelectorAll('#lane-p1 .ins-shift-left, #lane-p1 .ins-shift-right').forEach(el=>el.classList.remove('ins-shift-left','ins-shift-right'));
}
function showInsertionPreview(ev){
  clearInsertionPreview();
  const { slots, index } = computeInsertion(ev);
  // Tout le groupe de gauche recule, tout le groupe de droite avance : un vrai vide s'ouvre, sans chevauchement.
  slots.forEach((sl, i)=>sl.classList.add(i<index ? 'ins-shift-left' : 'ins-shift-right'));
}
// Mémorise l'emplacement choisi jusqu'à l'envoi de l'action au serveur
let PENDING_PLACEMENT = null;
function placementFor(handIndex){
  const pl = PENDING_PLACEMENT; PENDING_PLACEMENT = null;
  if(!pl || pl.handIndex!==handIndex || Date.now()-pl.at>120000) return null;
  return pl.afterInstId;
}

function onCardDragMove(ev){
  if(!DRAG_STATE) return;
  const { ghost, offsetX, offsetY } = DRAG_STATE;
  ghost.style.left = (ev.clientX - offsetX) + 'px';
  ghost.style.top = (ev.clientY - offsetY) + 'px';

  const zone = document.getElementById('lane-p1');
  const over = !DRAG_STATE.reorderOnly && isOverDropZone(ev);
  zone.classList.toggle('drop-target', over);
  if(!over) previewHandReorder(ev);
  const dragCard = S && S[MY_KEY] ? S[MY_KEY].hand[DRAG_STATE.handIndex] : null;
  if(over && dragCard && dragCard.type==='Créature') showInsertionPreview(ev);
  else clearInsertionPreview();
}

function onCardDragEnd(ev){
  if(!DRAG_STATE) return;
  const { handIndex, ghost, sourceEl, slot, reorderOnly, domOrder0, wasDim } = DRAG_STATE;
  const zone = document.getElementById('lane-p1');
  const over = !reorderOnly && isOverDropZone(ev);
  PENDING_PLACEMENT = null;
  // Réorganisation de la main : la nouvelle disposition est gardée si on a lâché la carte dans la main.
  if(slot){
    slot.classList.remove('hand-reorder-src');
    const row = slot.parentElement;
    const changed = row && [...row.children].map(x=>x.dataset.handIndex).join(',') !== domOrder0;
    if(changed && !over) commitHandReorderFromDom();
    else if(changed){ row.dataset.sig = ''; setTimeout(()=>renderHand(), 0); } // carte jouée / abandonnée : on remet l'ordre mémorisé
  }
  if(over){
    try{ if(window.BFX) BFX.setDrop(ev.clientX, ev.clientY); }catch(e){}
    const dc = S[MY_KEY].hand[handIndex];
    if(dc && dc.type==='Créature'){
      const { slots, index } = computeInsertion(ev);
      if(slots.length){
        const left = index>0 ? slots[index-1] : null;
        PENDING_PLACEMENT = { handIndex, afterInstId: left ? left.dataset.instId : 'start', at: Date.now() };
      }
    }
  }
  clearInsertionPreview();
  zone.classList.remove('drop-target');
  ghost.remove();
  if(sourceEl && !wasDim) sourceEl.classList.remove('hand-card-dim');
  document.removeEventListener('pointermove', onCardDragMove);
  document.removeEventListener('pointerup', onCardDragEnd);
  DRAG_STATE = null;

  if(over){
    const card = S[MY_KEY].hand[handIndex];
    // Le choix A/B (s'il y en a un) doit être résolu EN PREMIER, avant
    // toute logique de ciblage — sinon une carte qui a à la fois une
    // cible désignée ET un choix ne proposait jamais son choix, puisque
    // le sélecteur de cible prenait la main avant que uiPlayCard() (qui
    // contient cette vérification) n'ait jamais la moindre chance de
    // s'exécuter.
    const choiceAbility = card ? getUseChoiceAbility(card) : null;
    if(card && card.type==='Piège'){
      uiSetTrap(handIndex);
    } else if(choiceAbility){
      showCardChoiceModal(card, choiceAbility, (pickedKey)=>{ continueCardDragDecision(handIndex, pickedKey); });
    } else {
      continueCardDragDecision(handIndex, null);
    }
  }
}
// Suite de la décision après glisser-déposer — extrait de onCardDragEnd
// pour pouvoir être rejouée une fois un choix A/B résolu (voir ci-dessus),
// avec le choix maintenant connu (choiceKey).
function continueCardDragDecision(handIndex, choiceKey){
    const card = S[MY_KEY].hand[handIndex];
    if(!card) return;
    const isSpell = card.type==='Sortilège';
    __CLIENT_SPELL_CHECK = isSpell;
    if(isSpell && !spellIsPlayableClient(card)){
      showActionError('Ce sort se déclenche à la pioche : il ne se joue pas depuis la main.');
      return;
    }
    // sortilège : toutes les capacités jouables depuis la main ; autres cartes : "onPlay"
    let defs = findNewFormatChosenTargets(card, isSpell ? null : 'onPlay', choiceKey, { spell: isSpell });
    if(isSpell){
      // Règle des sorts : une cible exigée sans aucun candidat valide = jeu refusé
      // (rien n'est dépensé, la carte reste en main). On n'ouvre pas de ciblage vide.
      if(defs.some(d=>newFormatCandidates(d.target).length===0)){
        showActionError(noValidTargetMessage('card'));
        return;
      }
    } else {
      // Créature / artefact : l'effet à la pose ne fait simplement rien faute de
      // cible, la carte doit quand même pouvoir être jouée.
      defs = defs.filter(d=>newFormatCandidates(d.target).length>0);
    }
    if(defs.length){
      startNewFormatTargeting('card', defs, { index: handIndex, choiceKey, spell: isSpell });
    } else if(card && needsTargetClient(card)){
      if(isSpell && !oldFormatSpellHasCandidate(card)){
        showActionError(noValidTargetMessage('card'));
        return;
      }
      UI.pendingCard = { index: handIndex, card, choiceKey };
      render();
    } else {
      uiPlayCard(handIndex, null, null, choiceKey);
    }
}
// Ancien format (card.effect) : existe-t-il au moins une cible valide pour ce sort ?
function oldFormatSpellHasCandidate(card){
  const eff = cardPlayEffectClient(card);
  if(!eff) return true;
  if(eff.type==='damage' || eff.type==='heal') return true; // un héros est une cible valide
  const oppKey = MY_KEY==='p1' ? 'p2' : 'p1';
  const allowed = eff.targetOwner==='ally' ? [MY_KEY] : eff.targetOwner==='any' ? [MY_KEY, oppKey] : [oppKey];
  return allowed.some(k=>(S[k].board||[]).some(c=>!isStealthProtectedClient(c, k, MY_KEY)));
}

// Affiche un compte à rebours — interpolé localement entre deux passages du
// serveur (qui, lui, fait foi ; ceci n'est qu'un affichage). Rafraîchi
// toutes les 500ms, indépendamment des mises à jour d'état.
