// ============================================================
// Plateau de jeu — 06-posture-de-combat-et-ciblage
// Posture de combat, lignes de créatures, ciblage manuel (nouveau format), clic sur une créature
// (Chargé dans l ordre depuis spellcraft-server-board.html : tout est partagé, comme avant.)
// ============================================================
// ---------------- Posture de combat : retrait persistant + flèche d'attaquant ----------------
// ÉTAT VISUEL (pas une animation) recalculé à chaque rendu à partir de l'état S :
//  - EN RETRAIT (classe .is-withdrawn) : légèrement décalée vers l'arrière de
//    sa ligne, pour repérer d'un coup d'œil ce qui n'est plus actif :
//      * un attaquant qui a été BLOQUÉ (plus un danger) ;
//      * un bloqueur qui a DÉJÀ BLOQUÉ (ne peut plus bloquer).
//    Reste en retrait jusqu'à la fin du tour (voir les champs ci-dessous).
//    « Arrière » : ma ligne (en bas) -> vers le bas ; ligne adverse (en haut) -> vers le haut.
//  - FLÈCHE ROUGE CLIGNOTANTE (.attacker-arrow) : sur chaque attaquant déclaré et
//    encore NON bloqué, donc encore un danger. Au-dessus de mes créatures, en
//    dessous de celles de l'adversaire (elle pointe vers le camp visé). Elle
//    DISPARAÎT dès que l'attaquant est bloqué (il passe alors en retrait : un
//    seul signal à la fois, la flèche = danger, le retrait = neutralisé).
// Champs lus (état serveur, aucune modification serveur) :
//  - S.phase === 'declareBlockersMe' et S.active : combat en cours (seule phase
//    où des attaquants sont « déclarés » dans l'état) ;
//  - S[camp].attackers : instId des attaquants déclarés (vidé à la fin du blocage) ;
//  - créature.hasBeenBlocked : attaquant bloqué PENDANT le combat en cours (le
//    serveur le remet à false dès doFinishBlocking) ;
//  - S.__combatEvents (blockResolved, avec .turn = S.turn et .attackerInstId) :
//    mémoire « cet attaquant a été bloqué ce tour », qui survit à la fin du
//    combat (c'est ce qui garde un survivant en retrait jusqu'à la fin du tour) ;
//  - créature.hasBlockedThisTurn : bloqueur ayant bloqué (remis à false par le
//    serveur au début du tour de son propriétaire).
// Limite connue : les événements sont limités aux 60 derniers côté serveur ;
// un champ serveur dédié (ex. attacker.wasBlockedThisTurn, remis à zéro avec
// hasAttacked) rendrait ce repli inutile — non implémenté (consigne).
// Fonctions pures entre les marqueurs : testées sous Node (aucun accès DOM/global).
// <combat-posture>
const WITHDRAW_OFFSET_PX = 16;        // décalage vers l'arrière (px, échelle 1920×1080 du plateau)
const WITHDRAW_TRANSITION_MS = 220;   // apparition/disparition douce du retrait (passée dans cms() ; 0 en Instantané)
const ATTACKER_ARROW_BLINK_MS = 900;  // période du clignotement de la flèche rouge (fixe en Instantané)

// Contexte de décision pour UNE ligne (camp `ownerKey`), lu dans l'état.
function combatPostureCtx(state, ownerKey){
  const st = state || {};
  const owner = st[ownerKey] || {};
  const blocked = new Set();
  (Array.isArray(st.__combatEvents) ? st.__combatEvents : []).forEach(e=>{
    if(e && e.combatEvent==='blockResolved' && e.turn===st.turn && e.attackerInstId) blocked.add(e.attackerInstId);
  });
  return {
    ownerKey,
    phase: st.phase,
    activeKey: st.active,
    attackerIds: new Set(Array.isArray(owner.attackers) ? owner.attackers : []),
    blockedAttackerIds: blocked
  };
}
// Cette créature (attaquante) a-t-elle été bloquée pendant ce tour ?
function wasBlockedThisTurn(c, ctx){
  return !!(c && (c.hasBeenBlocked === true || ctx.blockedAttackerIds.has(c.instId)));
}
// Attaquant déclaré du combat EN COURS (jamais pendant le choix des attaquants :
// la phase est alors 'main', le contour doré de sélection existe déjà).
function isDeclaredAttacker(c, ctx){
  return !!c && ctx.phase==='declareBlockersMe' && ctx.ownerKey===ctx.activeKey && ctx.attackerIds.has(c.instId);
}
// En retrait : attaquant bloqué (un survivant le reste jusqu'à la fin du tour) ou bloqueur ayant bloqué.
function isWithdrawn(c, ctx){
  if(!c) return false;
  // Seul un bloqueur qui a déjà bloqué recule. Un attaquant bloqué reste en place : il peut encore
  // être bloqué par d'autres créatures, et sa flèche (teinte « bloqué ») continue vers sa cible.
  return c.hasBlockedThisTurn === true;
}
// Flèche rouge : attaquant déclaré du combat en cours, pas (encore) bloqué.
function showAttackerArrow(c, ctx){
  return isDeclaredAttacker(c, ctx) && !wasBlockedThisTurn(c, ctx);
}
// Direction du retrait / position de la flèche selon le camp (isMine : ma ligne, en bas).
function withdrawDirection(isMine){ return isMine ? 'down' : 'up'; }
function attackerArrowPlacement(isMine){ return isMine ? 'above' : 'below'; }
// </combat-posture>

// Dernier état de retrait RENDU, par créature : sert uniquement à savoir si un
// changement vient d'avoir lieu (pour la transition douce). Une créature
// inconnue (nouvelle, ou premier rendu) apparaît directement dans son état.
const __withdrawnRendered = new Map();
// Pose le retrait sur l'élément .ncard d'une créature en jeu. Le DOM étant
// reconstruit à chaque rendu, la classe vient toujours de l'état ; seule la
// transition est animée : départ dans l'ancien état puis bascule à l'image
// suivante. Propriété CSS `translate` (indépendante de `transform`, utilisé par
// les animations de charge et le survol).
function applyWithdrawState(el, instId, withdrawn, isMine){
  const sign = withdrawDirection(isMine)==='down' ? 1 : -1;
  el.style.setProperty('--withdraw-y', (sign*WITHDRAW_OFFSET_PX)+'px');
  const had = __withdrawnRendered.get(instId);
  __withdrawnRendered.set(instId, withdrawn);
  let reduced = false; // prefers-reduced-motion : pas de transition
  try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch(e){}
  const dur = reduced ? 0 : cms(WITHDRAW_TRANSITION_MS);
  if(had!==undefined && had!==withdrawn && dur>0){
    el.classList.toggle('is-withdrawn', had);
    el.style.transition = `translate ${dur}ms ease-out`;
    requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.toggle('is-withdrawn', withdrawn)));
  } else {
    el.classList.toggle('is-withdrawn', withdrawn);
  }
}
// Flèche rouge clignotante (SVG en ligne, aucune image). Enfant de la carte :
// elle suit donc son clone d'animation de charge (retiré par stripPostureFromGhost).
function buildAttackerArrowEl(isMine){
  const a = document.createElement('div');
  a.className = 'attacker-arrow is-' + attackerArrowPlacement(isMine) + (combatInstant() ? ' is-static' : '');
  a.style.animationDuration = ATTACKER_ARROW_BLINK_MS+'ms';
  a.setAttribute('aria-hidden', 'true');
  a.innerHTML = '<svg viewBox="0 0 40 48" width="100%" height="100%"><path d="M20 2 L38 24 H27 V46 H13 V24 H2 Z" stroke-linejoin="round"/></svg>';
  return a;
}
// Un clone d'animation (charge, mort) est placé à la position VISIBLE réelle
// (getBoundingClientRect, retrait compris) : il ne doit donc ni se décaler une
// 2e fois, ni emporter la flèche.
function stripPostureFromGhost(ghost){
  if(!ghost) return ghost;
  ghost.classList.remove('is-withdrawn');
  ghost.style.translate = 'none';
  ghost.style.transition = 'none';
  ghost.querySelectorAll('.attacker-arrow').forEach(n=>n.remove());
  return ghost;
}

// key = camp réel serveur, slot = 'p1'/'p2' pour l'affichage (moi en bas, adversaire en haut)
function renderLane(key, slot){
  const el = document.getElementById(`lane-${slot}`);
  el.innerHTML = '';
  const p = S[key];
  const postureCtx = combatPostureCtx(S, key);
  (p.board||[]).slice(0,8).forEach(c=>{
    const isMine = key===MY_KEY;
    const attackSelecting = isMine && UI.selectingAttackers && UI.selectedAttackers.includes(c.instId);
    const attackConfirmed = (p.attackers||[]).includes(c.instId) && S.phase!=='main';
    const attacking = attackSelecting || attackConfirmed;
    const isPendingSacrificeTarget = !!(S.pendingSacrifice && S.pendingSacrifice.playerKey===MY_KEY && key===MY_KEY);
    const targetable = isBlockTargetable(key, c) || isValidPendingTarget(key, c) || isValidNewFormatTarget(key, c) || isPendingSacrificeTarget;

    const cardWrap = document.createElement('div');
    cardWrap.className = 'card-slot';
    cardWrap.style.position = 'relative';
    cardWrap.dataset.instId = c.instId;
    const el2 = cardEl(c, { attacking, attackSelecting, targetable, inPlay:true, ownerKey:key, unavailableReason: unavailableReasonFor(key, c), onClick: ()=>onBoardCreatureClick(key, c) });
    cardWrap.appendChild(el2);

    // Posture de combat (état, recalculé à chaque rendu) : retrait des créatures
    // bloquées / bloqueuses + flèche rouge sur les attaquants encore dangereux.
    applyWithdrawState(el2, c.instId, isWithdrawn(c, postureCtx), isMine);
    // (la flèche d'attaquant est désormais une file de chevrons vers la cible : voir renderAttackChevrons)

    // Bloqueur ayant bloqué : le retrait porte maintenant l'information, on ne
    // l'atténue plus (ancienne opacité .5) ; la pastille 🛡 reste, pour les deux camps.
    if(c.hasBlockedThisTurn){
      const tag = document.createElement('div');
      tag.style.cssText = 'position:absolute;top:-8px;left:50%;transform:translateX(-50%);font-size:12px;z-index:5;';
      tag.textContent = '🛡';
      cardWrap.appendChild(tag);
    }
    if(!isMine && c.hasBeenBlocked && S.phase==='declareBlockersMe'){
      const tag = document.createElement('div');
      tag.style.cssText = 'position:absolute;top:-8px;left:50%;transform:translateX(-50%);font-size:12px;z-index:5;';
      // Plusieurs bloqueurs peuvent désormais se ranger sur un même attaquant :
      // le cadenas (« verrouillé ») était trompeur, on indique « déjà bloqué ».
      tag.textContent = '🛡';
      tag.title = "Déjà bloquée : d'autres créatures peuvent encore la bloquer";
      cardWrap.appendChild(tag);
    }
    if(c.instId===UI.pendingBlocker){
      el2.style.outline = '3px solid var(--gold)';
    }
    el.appendChild(cardWrap);
  });
}

// Les attaquants adverses (objets) pendant ma phase de blocage.
function currentAttackersOpp(){
  const opp = S[OPP_KEY];
  if(S.phase!=='declareBlockersMe' || S.active!==OPP_KEY) return [];
  return (opp.attackers||[]).map(id=>(opp.board||[]).find(x=>x.instId===id)).filter(Boolean);
}
// Raison pour laquelle cette créature est grisée en ce moment, ou null.
// Uniquement dans les deux phases concernées (choix des attaquants, choix des
// bloqueurs) pour ne pas encombrer le plateau le reste du temps.
//  - choix des attaquants : mes créatures qui ne peuvent pas attaquer ;
//  - choix des bloqueurs : mes créatures qui ne peuvent bloquer aucun
//    attaquant ; et, une fois un bloqueur choisi, les attaquants adverses
//    qu'il ne peut pas bloquer (Discret, Vol).
function unavailableReasonFor(key, c){
  const isMine = key===MY_KEY;
  if(isMine && UI.selectingAttackers && S.active===MY_KEY && S.phase==='main') return reasonCannotAttack(c);
  if(S.phase!=='declareBlockersMe' || S.active!==OPP_KEY) return null;
  if(isMine) return reasonCannotBlockAny(c, currentAttackersOpp());
  if(UI.pendingBlocker && (S[OPP_KEY].attackers||[]).includes(c.instId)){
    const blocker = (S[MY_KEY].board||[]).find(x=>x.instId===UI.pendingBlocker);
    return blocker ? reasonCannotBlock(blocker, c) : null;
  }
  return null;
}
// Message court (toast existant) expliquant pourquoi l'action est impossible.
function explainCannot(c, reason){
  showActionError(`${c.name||'Cette créature'} : ${reason}`);
}

// Une créature adverse est-elle cliquable en ce moment pour lui assigner
// mon bloqueur déjà sélectionné (elle doit être parmi les attaquants) ?
function isBlockTargetable(key, c){
  if(!UI.pendingBlocker) return false;
  if(key!==OPP_KEY) return false;
  if(S.phase!=='declareBlockersMe' || S.active!==OPP_KEY) return false;
  if(!(S[OPP_KEY].attackers||[]).includes(c.instId)) return false;
  // pas de surbrillance si le bloqueur choisi ne peut pas bloquer cet attaquant
  const blocker = (S[MY_KEY].board||[]).find(x=>x.instId===UI.pendingBlocker);
  return !blocker || canBlockClient(blocker, c);
}

const TARGETED_EFFECTS = ['damage','heal','stun','freeze','bounce','destroy','silence','weaken','buff','grantKeyword','keywordChoice'];
function cardPlayEffectClient(card){
  if(card.type==='Sortilège') return card.effect;
  if(card.type==='Créature') return card.onPlayEffect;
  if(card.type==='Artefact') return card.triggeredEffects && card.triggeredEffects.onPlay;
  return null;
}
function needsTargetClient(card){
  const eff = cardPlayEffectClient(card);
  return !!eff && TARGETED_EFFECTS.includes(eff.type) && eff.targetOwner!=='self' && eff.targetOwner!=='trigger';
}
// ---------------- Ciblage manuel : nouveau format (card.abilities) ----------------
// Miroir côté client des règles du serveur (validateSpellPlay /
// resolveNewTargetEntry) : le joueur ne peut choisir que des cibles que le
// serveur acceptera. Le serveur reste l'arbitre (il refuse sinon).
const NEW_FORMAT_MANUAL_CATEGORIES = ['creature','hero_creature','artifact','player','hero'];
// Effets de sort qui n'utilisent jamais de cible désignée (même liste que le serveur).
const SPELL_TARGETLESS_EFFECTS_CLIENT = ['grantMana','discard','setStatsGroup','resource','emptyManaEffect','fragileManaEffect','refillMana','burnMana','draw','conjure','drawTyped','discardSelf','setStats','extraCombat'];
function effectTargetRefsClient(e){
  const refs = [e.usesTarget, e.fightFirstTargetId, e.destroyDealAtkSecondTargetId];
  if(e.transformMode==='another_target') refs.push(e.transformSourceTargetId);
  if(e.reduceCostSelectionMode==='chosen') refs.push(e.reduceCostTargetId);
  if(e.stealStatReceiver==='chosen') refs.push(e.stealStatReceiverTargetId);
  return refs.filter(Boolean);
}
// Une capacité de sort se lance depuis la main si elle n'a aucun déclencheur
// ou un déclencheur "onPlay". Une capacité "quand piochée" (onDrawn) non.
function spellAbilityRunsClient(ab){
  const t = ab.triggers || [];
  return t.length===0 || t.some(x=>x.trigger==='onPlay');
}
// Sort jouable depuis la main ? (miroir de spellIsPlayable côté serveur)
function spellIsPlayableClient(card){
  const abs = card.abilities || [];
  if(!abs.length) return true;
  return !!card.effect || abs.some(spellAbilityRunsClient) || cardHasOfferingClient(card);
}
// Sort dont tout l'effet passe par l'Offrande : l'Offrande est obligatoire (miroir serveur : offering-required)
function offeringRequiredClient(card){
  return !!card && card.type==='Sortilège' && !card.effect && cardHasOfferingClient(card) && !(card.abilities||[]).some(spellAbilityRunsClient);
}
// Effets + définitions de cibles d'une capacité, selon le choix A/B/C/D déjà fait.
function newFormatAbilityView(ab, choiceKey){
  if(!ab.useChoice) return { effects: ab.effects || [], defs: ab.targets || [] };
  const k = choiceKey || 'A';
  const ch = (k==='A'||k==='B'||k==='C'||k==='D') ? ab['choice'+k] : null;
  if(!ch) return null;
  return { effects: ch.effects || [], defs: [...(ab.targets||[]), ...(ch.targets||[])] };
}
// Liste ordonnée des cibles que le joueur doit désigner (selectionMode
// 'chosen'), y compris celles propres au choix A/B (choiceX.targets) et les
// cartes à plusieurs cibles (ex : Lancer, Chasse préparée : allié puis ennemi).
//  - sort (opts.spell) : capacités jouables depuis la main, cibles réellement
//    utilisées par un effet, camp allié/ennemi/n'importe lequel ;
//  - autres (créature, artefact, pouvoir, capacité activée) : capacités du
//    déclencheur donné (triggerName), camp autre que self/trigger.
function findNewFormatChosenTargets(source, triggerName, choiceKey, opts){
  const out = [];
  if(!source || !source.abilities) return out;
  const spell = !!(opts && opts.spell);
  const seen = new Set();
  for(const ab of source.abilities){
    if(ab.kind!=='triggered') continue;
    if(spell){ if(!spellAbilityRunsClient(ab)) continue; }
    else if(triggerName && !(ab.triggers||[]).some(te=>te.trigger===triggerName)) continue;
    const view = newFormatAbilityView(ab, choiceKey);
    if(!view) continue;
    for(const tgt of view.defs){
      if(seen.has(tgt.id)) continue;
      if(tgt.selectionMode!=='chosen') continue;
      if(NEW_FORMAT_MANUAL_CATEGORIES.indexOf(tgt.targetCategory)<0) continue; // zones (main, défausse...) : pas de choix manuel côté client
      if(spell){
        if(tgt.targetOwner!=='ally' && tgt.targetOwner!=='enemy' && tgt.targetOwner!=='any') continue;
        if(!view.effects.some(e=>!SPELL_TARGETLESS_EFFECTS_CLIENT.includes(e.effectType) && effectTargetRefsClient(e).includes(tgt.id))) continue;
      } else if(tgt.targetOwner==='self' || tgt.targetOwner==='trigger'){
        continue;
      } else if(ab.useChoice && !view.effects.some(e=>effectTargetRefsClient(e).includes(tgt.id))){
        continue; // capacité à choix : une cible propre à l'autre choix ne se demande pas
      }
      seen.add(tgt.id);
      out.push({ ability: ab, target: tgt });
    }
  }
  return out;
}
// Compatibilité : première cible à choisir (ou null).
function findNewFormatChosenTarget(source, triggerName, choiceKey, opts){
  const all = findNewFormatChosenTargets(source, triggerName, choiceKey, opts);
  return all.length ? all[0] : null;
}
function newFormatTargetIsDynamic(tgt){ return tgt.countMode==='dynamic'; }
// Nombre maximal de cibles : "X cibles" = de 1 jusqu'à X. Valeur dynamique :
// incalculable côté client, on laisse choisir autant de candidats que voulu
// (bouton Valider) et le serveur tranche.
function newFormatTargetMax(tgt, nCandidates){
  if(newFormatTargetIsDynamic(tgt)) return Math.max(1, nCandidates||1);
  return Math.max(1, tgt.countFixed || 1);
}
function newFormatStatOf(c, stat){
  if(stat==='atk') return c.curAtk;
  if(stat==='hp') return c.curHp;
  if(stat==='cost') return c.cost;
  if(stat==='charges') return c.charges;
  return null;
}
// Filtres du serveur applicables côté client : sous-type, mot-clé, statistique.
// (Non reproduits, car l'état client ne les expose pas : "cartes hors deck de
// base" et "a attaqué au tour précédent" — le serveur les vérifie.)
function newFormatMatchesFilters(tgt, c){
  if(tgt.subtypeFilter){
    const __has = (c.subtypes||[]).some(s=>String(s).toLowerCase()===String(tgt.subtypeFilter).toLowerCase());
    if(tgt.subtypeFilterExclude ? __has : !__has) return false;
  }
  if(tgt.keywordFilter){
    const __hk = (c.keywords||[]).includes(tgt.keywordFilter);
    if(tgt.keywordFilterExclude ? __hk : !__hk) return false;
  }
  if(tgt.woundedFilter && !(typeof c.curHp==='number' && typeof c.hp==='number' && c.curHp<c.hp)) return false;
  if(tgt.notAttackedFilter && c.hasAttacked) return false;
  // rareté, région et comparaison à la carte source : tranchés par le serveur
  if(tgt.statFilterEnabled){
    const stat = newFormatStatOf(c, tgt.statFilterStat);
    if(stat==null) return false;
    // Valeur dynamique : incalculable côté client, le serveur tranche (comme le nombre de cibles).
    if(tgt.statFilterValueMode==='dynamic') return true;
    if(tgt.statFilterMode==='atLeast' && !(stat>=tgt.statFilterValue)) return false;
    if(tgt.statFilterMode==='atMost' && !(stat<=tgt.statFilterValue)) return false;
    if(tgt.statFilterMode==='exactly' && stat!==tgt.statFilterValue) return false;
  }
  return true;
}
function newFormatHasAnyFilter(tgt){
  return !!(tgt.subtypeFilter || tgt.keywordFilter || tgt.statFilterEnabled || tgt.zoneTypeFilterEnabled || tgt.attackedLastTurnFilter || tgt.woundedFilter || tgt.notAttackedFilter || tgt.sourceCompareFilter || tgt.rarityFilter || tgt.classFilter);
}
// Candidats valides pour une définition de cible : camp, catégorie, Parade
// (créature adverse protégée exclue), filtres. `selected` = marqueurs déjà pris.
function newFormatCandidates(tgt, selected){
  const out = [];
  if(!S || !tgt) return out;
  const oppKey = MY_KEY==='p1' ? 'p2' : 'p1';
  const keys = tgt.targetOwner==='ally' ? [MY_KEY] : tgt.targetOwner==='enemy' ? [oppKey] : [MY_KEY, oppKey];
  const cat = tgt.targetCategory;
  keys.forEach(k=>{
    const pl = S[k]; if(!pl) return;
    if(cat==='creature' || cat==='hero_creature'){
      (pl.board||[]).forEach(c=>{
        if(isStealthProtectedClient(c, k, MY_KEY)) return; // Parade : aussi pour les sorts
        if(clientSpellTargeting() && hasKw(c, 'insensible')) return; // Insensible : jamais ciblée par un sort
        if(newFormatMatchesFilters(tgt, c)) out.push({ key:k, marker:c.instId });
      });
    }
    if(cat==='artifact'){
      (pl.relics||[]).forEach(r=>{ if(newFormatMatchesFilters(tgt, r)) out.push({ key:k, marker:r.instId }); });
    }
    if(cat==='player' || cat==='hero' || cat==='hero_creature'){
      // un filtre (sous-type, mot-clé, statistique) exclut les héros, comme le serveur
      if(!newFormatHasAnyFilter(tgt)) out.push({ key:k, marker:`hero:${k}`, hero:true });
    }
  });
  return selected && selected.length ? out.filter(x=>!selected.includes(x.marker)) : out;
}
// Une créature/artefact est-il un choix valide pour la cible actuellement en attente ?
function isValidNewFormatTarget(key, c){
  if(!UI.pendingNewTarget) return false;
  const pn = UI.pendingNewTarget;
  return newFormatCandidates(pn.target, pn.selectedInstIds).some(x=>x.key===key && x.marker===c.instId);
}
function isValidNewFormatHeroTarget(key){
  if(!UI.pendingNewTarget) return false;
  const pn = UI.pendingNewTarget;
  return newFormatCandidates(pn.target, pn.selectedInstIds).some(x=>x.hero && x.key===key);
}
// Invite lisible pour la cible en cours : "Choisissez une créature ennemie (Force ≤ 3)".
function newFormatTargetPrompt(tgt){
  const cat = tgt.targetCategory;
  let noun, fem;
  if(cat==='artifact'){ noun='artefact'; fem=false; }
  else if(cat==='player' || cat==='hero'){ noun='héros'; fem=false; }
  else if(cat==='hero_creature'){ noun='cible (créature ou héros)'; fem=true; }
  else { noun='créature'; fem=true; }
  const adj = tgt.targetOwner==='ally' ? (fem?'alliée':'allié') : tgt.targetOwner==='enemy' ? (fem?'ennemie':'ennemi') : '';
  const pluralNoun = noun==='héros' ? 'héros' : noun==='artefact' ? 'artefacts' : noun.startsWith('cible') ? 'cibles (créatures ou héros)' : 'créatures';
  const pluralAdj = adj ? (adj+'s') : '';
  const max = newFormatTargetMax(tgt, 0);
  const extras = [];
  if(tgt.subtypeFilter) extras.push(tgt.subtypeFilterExclude ? `non-${tgt.subtypeFilter}` : `de type ${tgt.subtypeFilter}`);
  if(tgt.keywordFilter) extras.push(`${tgt.keywordFilterExclude ? 'sans' : 'avec'} ${KEYWORD_LABELS[tgt.keywordFilter] || tgt.keywordFilter}`);
  if(tgt.woundedFilter) extras.push('blessée');
  if(tgt.notAttackedFilter) extras.push("n'ayant pas attaqué");
  if(tgt.statFilterEnabled){
    const statLabel = ({atk:'Force', hp:'Endurance', cost:'Coût', charges:'Utilisations'})[tgt.statFilterStat] || tgt.statFilterStat;
    const op = ({atLeast:'≥', atMost:'≤', exactly:'='})[tgt.statFilterMode] || '=';
    extras.push(`(${statLabel} ${op} ${tgt.statFilterValueMode==='dynamic' ? 'une valeur variable' : tgt.statFilterValue})`);
  }
  const tail = extras.length ? ' ' + extras.join(' ') : '';
  if(newFormatTargetIsDynamic(tgt)) return `Choisissez des ${pluralNoun}${pluralAdj?' '+pluralAdj:''}${tail}`;
  if(max>1) return `Choisissez jusqu'à ${max} ${pluralNoun}${pluralAdj?' '+pluralAdj:''}${tail}`;
  return `Choisissez ${fem?'une':'un'} ${noun}${adj?' '+adj:''}${tail}`;
}
function noValidTargetMessage(kind){
  if(kind==='hero') return "Aucune cible valide : le pouvoir n'est pas utilisé.";
  if(kind==='permanent') return "Aucune cible valide : la capacité n'est pas utilisée.";
  return "Aucune cible valide : la carte n'est pas jouée et reste en main (rien n'est dépensé).";
}
// Ouvre le mode ciblage (séquence de cibles) — sauf si une cible n'a aucun
// candidat : message clair, rien n'est ouvert, rien n'est envoyé.
function startNewFormatTargeting(kind, defs, extra){
  if(!defs.length) return false;
  __CLIENT_SPELL_CHECK = !!(extra && extra.spell);
  if(defs.some(d=>newFormatCandidates(d.target).length===0)){
    showActionError(noValidTargetMessage(kind));
    render();
    return false;
  }
  UI.pendingNewTarget = { kind, queue: defs, step: 0, collected: {}, target: defs[0].target, ability: defs[0].ability, selectedInstIds: [], extra: extra || {} };
  render();
  return true;
}
// Valide la sélection de la cible en cours, puis passe à la suivante ou envoie l'action.
function advanceNewFormatTargeting(){
  const pn = UI.pendingNewTarget;
  if(!pn) return;
  pn.collected[pn.target.id] = pn.selectedInstIds.slice();
  if(pn.step+1 < pn.queue.length){
    pn.step++;
    pn.target = pn.queue[pn.step].target;
    pn.ability = pn.queue[pn.step].ability;
    pn.selectedInstIds = [];
    render();
    return;
  }
  const chosenTargets = pn.collected;
  const kind = pn.kind;
  const extra = pn.extra || {};
  UI.pendingNewTarget = null;
  if(kind==='deferred'){
    __deferredTargetStamp = S.pendingTarget ? S.pendingTarget.startedAt : null;
    runAction('Choix de cible', ()=>gsResolveTarget(chosenTargets));
    return;
  }
  if(kind==='card') uiPlayCard(extra.index, null, chosenTargets, extra.choiceKey); // choiceKey conservé
  else if(kind==='hero') uiActivateHeroPower(null, chosenTargets);
  else if(kind==='permanent') uiActivatePermanent(extra.permanentType, extra.permanentInstId, null, chosenTargets, extra.choiceKey);
}
// Ajoute une cible choisie ; auto-validation au nombre maximal (ou s'il ne
// reste plus de candidat), sinon le joueur peut valider dès 1 cible.
function pickNewFormatTarget(marker){
  const pn = UI.pendingNewTarget;
  if(!pn) return;
  pn.selectedInstIds.push(marker);
  const remaining = newFormatCandidates(pn.target, pn.selectedInstIds).length;
  const max = newFormatTargetMax(pn.target, pn.selectedInstIds.length + remaining);
  if(pn.selectedInstIds.length >= max || remaining===0){
    if(newFormatTargetIsDynamic(pn.target) && remaining>0){ render(); return; } // dynamique : validation manuelle
    advanceNewFormatTargeting();
    return;
  }
  render();
}
// Bouton "Valider" : de 1 jusqu'à X cibles.
function confirmNewFormatTargets(){
  const pn = UI.pendingNewTarget;
  if(!pn || pn.selectedInstIds.length<1) return;
  advanceNewFormatTargeting();
}
function cancelPendingNewTarget(){
  if(UI.pendingNewTarget && UI.pendingNewTarget.kind==='deferred') return; // choix obligatoire (demandé par le serveur)
  UI.pendingNewTarget = null;
  render();
}

function pendingEffectClient(){
  if(UI.pendingCard) return cardPlayEffectClient(UI.pendingCard.card);
  if(UI.pendingPower) return UI.pendingPower.effect;
  return null;
}
function isValidPendingTarget(key, c){
  const eff = pendingEffectClient();
  if(!eff) return false;
  const oppKey = MY_KEY==='p1' ? 'p2' : 'p1';
  const allowed = eff.targetOwner==='ally' ? [MY_KEY] : eff.targetOwner==='any' ? [MY_KEY, oppKey] : [oppKey];
  if(!allowed.includes(key)) return false;
  if(isStealthProtectedClient(c, key, MY_KEY)) return false; // Parade : protège seulement contre l'adversaire
  return true;
}
function isValidPendingHeroTarget(key){
  const eff = pendingEffectClient();
  if(!eff || (eff.type!=='damage' && eff.type!=='heal')) return false;
  const oppKey = MY_KEY==='p1' ? 'p2' : 'p1';
  const allowed = eff.targetOwner==='ally' ? [MY_KEY] : eff.targetOwner==='any' ? [MY_KEY, oppKey] : [oppKey];
  return allowed.includes(key);
}
// Confirme la cible choisie pour l'action actuellement en attente (carte,
// pouvoir de héros ou capacité activée) et envoie l'action correspondante.
function confirmPendingTarget(targetInfo){
  if(UI.pendingCard){
    const idx = UI.pendingCard.index;
    UI.pendingCard = null;
    uiPlayCard(idx, targetInfo);
  } else if(UI.pendingPower){
    const pw = UI.pendingPower;
    UI.pendingPower = null;
    if(pw.kind==='hero') uiActivateHeroPower(targetInfo);
    else uiActivatePermanent(pw.permanentType, pw.permanentInstId, targetInfo);
  }
}
function cancelPendingCard(){
  UI.pendingCard = null;
  UI.pendingPower = null;
  render();
}

// Relance l'action d'origine (poser un piège, pouvoir de héros, capacité
// activée) en fournissant cette fois la créature à sacrifier choisie par
// le joueur, pour compléter le coût additionnel resté en attente.
async function resolvePendingSacrifice(instId){
  const pending = S.pendingSacrifice;
  if(!pending) return;
  // On privilégie l'action mémorisée côté client (paramètres exacts envoyés),
  // et on se rabat sur les champs du sacrifice en attente fournis par le serveur.
  const mem = LAST_SACRIFICEABLE_ACTION;
  const kind = pending.action || (mem && mem.action);
  const src = (mem && mem.action===kind) ? mem : {
    action: kind,
    handIndex: pending.handIndex,
    targetInfo: pending.targetIsHero ? { isHeroTarget:true, playerKey:pending.targetPlayerKey } : (pending.targetInstId ? { instId:pending.targetInstId } : null),
    chosenTargets: pending.chosenTargets,
    choiceKey: pending.choiceKey,
    placeAfter: pending.placeAfterInstId,
    permanentType: pending.permanentType,
    permanentInstId: pending.permanentInstId
  };
  let res;
  if(kind==='setTrap'){
    res = await runAction('Poser le piège', ()=>gsSetTrap(src.handIndex, instId));
  } else if(kind==='useHeroPower'){
    res = await runAction('Pouvoir de héros', ()=>gsUseHeroPower(src.targetInfo, src.chosenTargets, instId));
  } else if(kind==='activatePermanent'){
    res = await runAction('Capacité activée', ()=>gsActivatePermanent(src.permanentType, src.permanentInstId, src.targetInfo, src.chosenTargets, instId, src.choiceKey));
  } else if(kind==='playCardSimple'){
    res = await runAction('Jouer la carte', ()=>gsPlayCardSimple(src.handIndex, src.targetInfo, src.chosenTargets, src.choiceKey, instId, src.placeAfter, src.offeringInstId || pending.offeringInstId));
  } else {
    showActionError("Impossible de terminer le sacrifice : l'action d'origine est inconnue.");
    return;
  }
  if(res && !res.error) LAST_SACRIFICEABLE_ACTION = null;
}

function onBoardCreatureClick(key, c){
  const isMine = key===MY_KEY;
  // confirmation d'un sacrifice en attente (priorité absolue — bloque tout le reste côté serveur)
  if(S.pendingSacrifice && S.pendingSacrifice.playerKey===MY_KEY && isMine){
    resolvePendingSacrifice(c.instId);
    return;
  }
  // confirmation de ciblage nouveau format (priorité absolue)
  if(UI.pendingNewTarget && isValidNewFormatTarget(key, c)){
    pickNewFormatTarget(c.instId);
    return;
  }
  // confirmation de ciblage pour une carte/pouvoir/capacité en attente (priorité sur tout le reste)
  if((UI.pendingCard || UI.pendingPower) && isValidPendingTarget(key, c)){
    confirmPendingTarget({ instId: c.instId });
    return;
  }
  // sélection des attaquants (mon tour, phase principale)
  if(isMine && UI.selectingAttackers){
    const why = reasonCannotAttack(c); // mêmes règles que le serveur
    if(why){ explainCannot(c, why); return; }
    const idx = UI.selectedAttackers.indexOf(c.instId);
    if(idx>=0){ UI.selectedAttackers.splice(idx,1); if(UI.attackTargets) delete UI.attackTargets[c.instId]; }
    else { UI.selectedAttackers.push(c.instId); UI.lastSelectedAttacker = c.instId; }
    render();
    return;
  }
  // choix du bloqueur (l'adversaire m'attaque)
  if(isMine && S.phase==='declareBlockersMe' && S.active===OPP_KEY){
    const why = reasonCannotBlockAny(c, currentAttackersOpp());
    if(why){ explainCannot(c, why); return; }
    UI.pendingBlocker = c.instId;
    render();
    return;
  }
  // assignation du blocage sur un attaquant adverse
  if(!isMine && isBlockTargetable(key, c)){
    uiAssignBlock(c.instId);
    return;
  }
  // attaquant que le bloqueur choisi ne peut pas bloquer : on explique
  if(!isMine && S.phase==='declareBlockersMe' && S.active===OPP_KEY && UI.pendingBlocker && (S[OPP_KEY].attackers||[]).includes(c.instId)){
    const blocker = (S[MY_KEY].board||[]).find(x=>x.instId===UI.pendingBlocker);
    const why = blocker && reasonCannotBlock(blocker, c);
    if(why){ explainCannot(blocker, why); return; }
  }
  // activation d'une créature ayant une capacité activée (mon tour, phase principale)
  if(isMine && S.active===MY_KEY && S.phase==='main' && !UI.selectingAttackers){
    const hasNewActivated = c.abilities && c.abilities.some(ab=>ab.kind==='triggered' && (ab.triggers||[]).some(te=>te.trigger==='activated'));
    const hasOldActivated = c.triggeredEffects && c.triggeredEffects.activated;
    if((hasNewActivated || hasOldActivated) && !c.stunned && (c._activationCooldownRemaining||0)<=0){
      uiActivatePermanent('creature', c.instId);
    }
  }
}



// ---------------- Flèches d'attaque (chevrons) ----------------
// Pendant la phase de blocage, chaque attaquant déclaré a une file de chevrons qui part de sa carte
// et va jusqu'à sa cible : le héros adverse ou un Édifice (S[camp].__attackTargets). Elle reste
// affichée même une fois l'attaquant bloqué (il peut l'être encore) ; seule la teinte change :
//   adversaire : rouge -> orange (bloqué)     nous : bleu clair -> bleu foncé (bloqué)
function attackChevronsLayer(){
  let l = document.getElementById('attack-chevrons-layer');
  if(!l){
    l = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    l.id = 'attack-chevrons-layer';
    document.body.appendChild(l);
  }
  return l;
}
// Point où la ligne centre -> (tx,ty) sort du rectangle de l'élément (marge `pad`)
function rectEdgePoint(r, tx, ty, pad){
  const cx = r.left+r.width/2, cy = r.top+r.height/2, dx = tx-cx, dy = ty-cy, L = Math.hypot(dx,dy) || 1;
  const ux = dx/L, uy = dy/L;
  const t = Math.min(ux ? (r.width/2)/Math.abs(ux) : Infinity, uy ? (r.height/2)/Math.abs(uy) : Infinity);
  return { x: cx+ux*(t+pad), y: cy+uy*(t+pad) };
}
function renderAttackChevrons(){
  try{
    const layer = attackChevronsLayer();
    const active = (typeof S!=='undefined' && S) ? S.active : null;
    const show = !!S && S.phase==='declareBlockersMe' && active && S[active];
    if(!show){ if(layer.firstChild) layer.innerHTML = ''; return; }
    const owner = S[active], mine = active===MY_KEY;
    const defSlot = mine ? 'p2' : 'p1';
    const ctx = combatPostureCtx(S, active);
    const tgtMap = owner.__attackTargets || {};
    layer.innerHTML = '';
    (owner.attackers||[]).forEach(id=>{
      const c = (owner.board||[]).find(x=>x && x.instId===id);
      if(!c) return;
      const srcEl = document.querySelector(`[data-instid="${id}"]`);
      const edId = tgtMap[id];
      const tgtEl = (edId && document.querySelector(`[data-instid="${edId}"]`)) || document.getElementById(`hero-portrait-${defSlot}`);
      if(!srcEl || !tgtEl) return;
      const sr = persRect(srcEl), tr = persRect(tgtEl);
      const tx = tr.left+tr.width/2, ty = tr.top+tr.height/2, sx = sr.left+sr.width/2, sy = sr.top+sr.height/2;
      const a = rectEdgePoint(sr, tx, ty, 2);
      const b = rectEdgePoint(tr, sx, sy, 8);
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'chev-arrow chev-atk-' + (mine ? 'mine' : 'enemy') + (wasBlockedThisTurn(c, ctx) ? '-blocked' : ''));
      layer.appendChild(g);
      chevronArrowSet(g, a.x, a.y, b.x, b.y, 0);
    });
  }catch(e){ /* l'affichage des flèches ne doit jamais gêner le jeu */ }
}
setInterval(renderAttackChevrons, 200);
