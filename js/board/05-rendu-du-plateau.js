// ============================================================
// Plateau de jeu — 05-rendu-du-plateau
// Rendu principal (render), mana, héros, rituel, pouvoir de héros, permanents, pioche, artefacts
// (Chargé dans l ordre depuis spellcraft-server-board.html : tout est partagé, comme avant.)
// ============================================================
// ---------------- Rendu principal ----------------


// Choix de cible demandé par le SERVEUR (capacité déclenchée à cible choisie :
// arrivée d'une créature conjurée, attaque, mort, début/fin de tour...).
// Le serveur met la capacité en pause (S.pendingTarget) ; on ouvre le même mode
// de ciblage que pour un sort, puis on renvoie les cibles avec « resolveTarget ».
let __deferredTargetStamp = null;
function syncServerPendingTarget(){
  const pt = S && S.pendingTarget;
  if(!pt || pt.playerKey!==MY_KEY){
    if(UI.pendingNewTarget && UI.pendingNewTarget.kind==='deferred') UI.pendingNewTarget = null;
    __deferredTargetStamp = null;
    return;
  }
  if(UI.pendingNewTarget) return;
  if(__deferredTargetStamp===pt.startedAt) return; // déjà envoyé, on attend la réponse
  const defs = (pt.defs||[]).map(t=>({ ability:null, target:t }));
  if(!defs.length || defs.some(d=>newFormatCandidates(d.target).length===0)){
    // Aucun candidat visible côté client : le serveur tranche (cible au hasard ou capacité ignorée).
    __deferredTargetStamp = pt.startedAt;
    setTimeout(()=>runAction('Choix de cible', ()=>gsResolveTarget({})), 0);
    return;
  }
  UI.pendingNewTarget = { kind:'deferred', queue:defs, step:0, collected:{}, target:defs[0].target, ability:null, selectedInstIds:[], extra:{} };
}
function render(){
  if(!S) return;
  // Écran d'annonce en cours : le plateau (et surtout le mulligan) ne doit
  // pas apparaître avant la fin de l'annonce — finishStateUpdateTail re-rend.
  if(__matchAnnounceActive) return;
  // Plateau gelé pendant une animation de combat : on note qu'il faudra
  // re-rendre (fait par unfreezeBoardRender à la fin de la file).
  if(__boardRenderFrozen){ __boardRenderDirty = true; return; }
  syncServerPendingTarget(); // choix de cible demandé par le serveur (capacité déclenchée)
  const keywordBadgePlan = planKeywordBadgeAnim(); // avant la reconstruction du DOM
  renderManaBox(MY_KEY, 'p1');
  renderManaBox(OPP_KEY, 'p2');
  renderHeroFrame(MY_KEY, 'p1');
  renderHeroFrame(OPP_KEY, 'p2');
  renderDeckZone(MY_KEY, 'p1');
  renderDeckZone(OPP_KEY, 'p2');
  renderLane(MY_KEY, 'p1');
  renderLane(OPP_KEY, 'p2');
  renderArtifactStack(MY_KEY, 'p1');
  renderArtifactStack(OPP_KEY, 'p2');
  if(window.BFX) BFX.syncArrivals(S, MY_KEY, OPP_KEY); // arrivées de créatures / d'artefacts (animations)
  renderHand();
  renderRevealHandToggle();
  renderEnemyHand();
  renderPhaseBar();
  renderGameOverOverlay();
  renderDiscoverChoiceModal();
  renderKeywordChoiceModal();
  syncTargetingArrow();
  playKeywordBadgeChanges(keywordBadgePlan); // après : les classes se posent sur le nouveau DOM
  // renderTurnTimer(); — minuteur désactivé pour l'instant (voir afterConnected)
}

// Démarre/arrête la flèche de ciblage visuelle selon l'état actuel — appelé
// à chaque rendu, une fois le DOM reconstruit (pour pouvoir localiser
// l'élément source).
function syncTargetingArrow(){
  let sourceEl = null, blockMode = false;
  if(UI.pendingNewTarget){
    const extra = UI.pendingNewTarget.extra || {};
    if(UI.pendingNewTarget.kind==='card' && extra.index!==undefined){
      sourceEl = document.querySelector(`.hand-card-slot[data-hand-index="${extra.index}"]`);
    } else if(UI.pendingNewTarget.kind==='hero'){
      sourceEl = document.getElementById('hero-frame-p1');
    } else if(UI.pendingNewTarget.kind==='permanent' && extra.permanentInstId){
      sourceEl = document.querySelector(`[data-instid="${extra.permanentInstId}"]`);
    } else if(UI.pendingNewTarget.kind==='deferred' && S.pendingTarget){
      const ref = S.pendingTarget.sourceRef || {};
      if(ref.kind==='inst') sourceEl = document.querySelector(`[data-instid="${ref.instId}"]`);
      else if(ref.kind==='hero') sourceEl = document.getElementById('hero-frame-p1');
    }
  } else if(UI.pendingCard && UI.pendingCard.index!==undefined){
    sourceEl = document.querySelector(`.hand-card-slot[data-hand-index="${UI.pendingCard.index}"]`);
  } else if(UI.pendingBlocker && S.phase==='declareBlockersMe' && S.active===OPP_KEY){
    // Bloqueur sélectionné : flèche bleu/rouge jusqu'à l'attaquant à bloquer
    sourceEl = document.querySelector(`#lane-p1 [data-instid="${UI.pendingBlocker}"]`);
    blockMode = !!sourceEl;
  }
  document.body.classList.toggle('block-targeting', blockMode);
  if(sourceEl) beginTargeting(sourceEl);
  else endTargeting();
}

// Affiche les options à choisir quand une capacité "révéler" (discover) est
// en attente — bloque le reste de la partie pour le joueur concerné tant
// qu'un choix n'a pas été fait, comme convenu côté serveur.
// Affiche les options à choisir quand une capacité "choix de mot-clé"
// (keywordChoice) est en attente — même principe que discover.
// Bouton latéral « Voir le plateau » : masque temporairement la fenêtre de choix
// (révéler / mot-clé) pour regarder le plateau, puis la réaffiche. Le choix en attente n'est pas modifié.
function addPeekBoardButton(modal){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'peek-board-btn';
  b.innerHTML = '<span class="peek-ico">👁</span><span class="peek-txt">Voir le plateau</span>';
  b.onclick = (e)=>{
    e.stopPropagation();
    const on = modal.classList.toggle('peek');
    b.querySelector('.peek-ico').textContent = on ? '↩' : '👁';
    b.querySelector('.peek-txt').textContent = on ? 'Revenir au choix' : 'Voir le plateau';
  };
  modal.appendChild(b);
}

function renderKeywordChoiceModal(){
  const existing = document.getElementById('keyword-choice-modal');
  if(!S.pendingKeywordChoice || S.pendingKeywordChoice.playerKey!==MY_KEY){
    if(existing) existing.remove();
    return;
  }
  // Signature des options : si le serveur propose une NOUVELLE liste (2ᵉ choix de « Terrible destinée »),
  // la fenêtre déjà affichée est reconstruite au lieu de garder l'ancienne liste.
  const __sig = (S.pendingKeywordChoice.creatureInstId||'') + '|' + (S.pendingKeywordChoice.options||[]).join(',');
  if(existing){
    if(existing.dataset.sig === __sig) return;
    existing.remove();
  }
  const modal = document.createElement('div');
  modal.dataset.sig = __sig;
  modal.id = 'keyword-choice-modal';
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-box">
      <h2>Choisis un mot-clé</h2>
      <div id="keyword-choice-list" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;"></div>
    </div>
  `;
  document.body.appendChild(modal);
  addPeekBoardButton(modal);
  const list = document.getElementById('keyword-choice-list');
  S.pendingKeywordChoice.options.forEach((kw, i)=>{
    const btn = document.createElement('button');
    btn.className = 'phase-btn';
    btn.style.cssText = 'min-width:140px;padding:16px;font-size:15px;';
    const iconFile = KEYWORD_ICON_FILES[kw];
    btn.innerHTML = `${iconFile ? `<img src="images/${iconFile}" style="width:32px;height:32px;display:block;margin:0 auto 8px;">` : ''}${escapeHtmlGS(KEYWORD_LABELS[kw]||kw)}`;
    btn.onclick = async ()=>{
      modal.remove();
      await runAction('Choix (mot-clé)', ()=>gsResolveKeywordChoice(i));
    };
    list.appendChild(btn);
  });
}

function renderDiscoverChoiceModal(){
  const existing = document.getElementById('discover-choice-modal');
  if(!S.pendingDiscover || S.pendingDiscover.playerKey!==MY_KEY){
    if(existing) existing.remove();
    return;
  }
  if(existing) return; // déjà affichée, ne pas la reconstruire à chaque rendu
  const modal = document.createElement('div');
  modal.id = 'discover-choice-modal';
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-box">
      <h2>Choisis une carte</h2>
      <div id="discover-choice-list" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;"></div>
    </div>
  `;
  document.body.appendChild(modal);
  addPeekBoardButton(modal);
  const list = document.getElementById('discover-choice-list');
  S.pendingDiscover.options.forEach((card, i)=>{
    const wrap = document.createElement('div');
    wrap.style.cursor = 'pointer';
    wrap.appendChild(cardEl(card, {}));
    wrap.onclick = async ()=>{
      modal.remove();
      await runAction('Choix (révéler)', ()=>gsResolveDiscoverChoice(i));
    };
    list.appendChild(wrap);
  });
}

// Le plateau a une hauteur "naturelle" fixe (calculée pour être lisible),
// mais on la réduit (jamais on ne l'agrandit) pour qu'elle tienne toujours
// entièrement dans la fenêtre — jamais de barre de défilement.
// fitBoardToViewport() a été retirée : elle appliquait un DEUXIÈME
// rétrécissement (jusqu'à moitié plus petit) par-dessus la mise à l'échelle
// globale du plateau (updateBoardScale, cadre 1920×1080 → fenêtre réelle)
// dès que le contenu semblait dépasser la hauteur disponible. Depuis la
// refonte visuelle (lanes/cartes/portraits agrandis), ce cas se déclenchait
// quasi systématiquement, ce qui rendait tout minuscule même sur grand
// écran. #board-scroll-area a déjà overflow-y:auto (scrollbar masquée mais
// fonctionnelle) : le débordement, s'il y en a, se gère par un défilement
// normal plutôt que par un rétrécissement silencieux de tout le plateau.

let __tavernRewardChecked = false, __tavernRewardGiven = false; // Baston de taverne : booster offert pour le 1er match de la soirée
let __gameOverSfxPlayed = false; // évite de relancer le jingle à chaque re-rendu tant que l'écran de fin reste affiché
function renderGameOverOverlay(){
  const overlay = document.getElementById('overlay');
  if(!S.gameOver){ overlay.classList.remove('show'); __heroDeathPlayed = false; try{ if(window.BFX) BFX.resetHeroDeath(); }catch(e){} return; }
  document.getElementById('overlay-text').textContent = S.winnerKey===MY_KEY ? 'Victoire !' : 'Défaite...';
  // Musique de fin de partie (victoire/défaite) — jouée une seule fois, coupe
  // la musique de combat en cours. Comme c'est un simple objet Audio() non
  // rattaché au système de reprise entre pages, elle s'arrête automatiquement
  // si le joueur quitte la partie (navigation complète vers une autre page)
  // avant la fin du morceau — pas de code supplémentaire nécessaire pour ça.
  if(!__gameOverSfxPlayed){
    __gameOverSfxPlayed = true;
    playFinalSfx(S.winnerKey===MY_KEY ? 'victory' : 'defeat');
  }

  const summaryEl = document.getElementById('overlay-summary');
  const sm = S.matchSummary;
  if(!sm){ summaryEl.innerHTML = ''; overlay.classList.add('show'); return; }

  const mine = sm[MY_KEY] || {};
  const theirs = sm[OPP_KEY] || {};
  const durationLabel = (ms)=>{
    const totalSec = Math.floor((ms||0)/1000);
    const m = Math.floor(totalSec/60), s = totalSec%60;
    return `${m}:${String(s).padStart(2,'0')}`;
  };
  const row = (label, mineVal, theirsVal)=>`<tr><td>${label}</td><td>${mineVal}</td><td>${theirsVal}</td></tr>`;

  summaryEl.innerHTML = `
    <table>
      <thead><tr><th></th><th>Vous</th><th>Adversaire</th></tr></thead>
      <tbody>
        <tr><td colspan="3" style="text-align:center;color:var(--parchment-dim);font-size:12px;padding-bottom:8px;">Durée de la partie : ${durationLabel(sm.durationMs)}</td></tr>
        ${row('Tours joués', mine.turnsPlayed||0, theirs.turnsPlayed||0)}
        ${row('Dégâts infligés', mine.damageDealt||0, theirs.damageDealt||0)}
        <tr class="summary-sep">${row('Cartes jouées (total)', mine.cardsPlayed?.total||0, theirs.cardsPlayed?.total||0)}</tr>
        ${row('— Créatures', mine.cardsPlayed?.['Créature']||0, theirs.cardsPlayed?.['Créature']||0)}
        ${row('— Sortilèges', mine.cardsPlayed?.['Sortilège']||0, theirs.cardsPlayed?.['Sortilège']||0)}
        ${row('— Artefacts', mine.cardsPlayed?.['Artefact']||0, theirs.cardsPlayed?.['Artefact']||0)}
        ${row('— Pièges', mine.cardsPlayed?.['Piège']||0, theirs.cardsPlayed?.['Piège']||0)}
      </tbody>
    </table>
    ${sm.coinsEarned && sm.coinsEarned[MY_KEY] ? `<div class="summary-coins">🪙 ${sm.coinsEarned[MY_KEY]} pièces gagnées</div>` : ''}
    ${__tavernRewardGiven ? `<div class="summary-coins">🎁 Premier match de la soirée : 1 « Booster + classique » offert (dans « Mes boosters »)</div>` : ''}
  `;
  overlay.classList.add('show');
  if(['taverne','swap','draft','chaos'].includes(S.mode) && !__tavernRewardChecked){
    __tavernRewardChecked = true;
    (async()=>{
      for(let essai=0; essai<3 && !__tavernRewardGiven; essai++){
        try{
          const { data } = await sb.from('tavern_rewards').select('booster_id').eq('session_id', GS_SESSION_ID).maybeSingle();
          if(data){ __tavernRewardGiven = true; renderGameOverOverlay(); break; }
        }catch(e){}
        await new Promise(r=>setTimeout(r, 2500));
      }
    })();
  }
}

// key = camp réel côté serveur (p1/p2) ; slot = 'p1' (moi) ou 'p2' (adversaire)
// — boîte de mana dédiée : illustration de région en fond, empilement des
// pastilles de mana vers le haut à mesure qu'on en gagne.
function renderManaBox(key, slot){
  const p = S[key];
  const el = document.getElementById(`mana-box-${slot}`);
  const region = p.region || {};
  const regionThumbStyle = region.image ? `background-image:url('${region.image.replace(/'/g,"")}');background-position:${region.imagePosX??50}% ${region.imagePosY??50}%;background-size:${(region.imageZoom??100)>100?region.imageZoom+'%':'cover'};` : '';
  // Affichage : [icône mana plein] disponible/max ; si mana fragile, une ligne au-dessus
  // avec des icônes plus grosses. (Les colonnes de points ont été supprimées.)
  const fragileLine = p.manaFragile > 0
    ? `<div class="mana-box-line fragile" title="Mana fragile"><span class="mana-ico"></span><span>${p.manaFragile}</span></div>` : '';
  // Dévotion (Fidèle) : bulle au-dessus du mana, affichée dès qu'un Fidèle est arrivé en jeu
  const devo = (p.__g && p.__g.devotion) || {};
  const devoTotal = Object.values(devo).reduce((a,b)=>a+(b||0),0);
  const devoBubble = devoTotal > 0
    ? `<div class="devotion-bubble" id="devotion-bubble-${slot}" title="Dévotion : ${devoTotal} (Fidèles arrivés en jeu cette partie) — cliquer pour le détail"><span class="devotion-bubble-ico">🙏</span><span class="devotion-bubble-count">${devoTotal}</span></div>` : '';
  el.title = region.name || 'Région';
  el.innerHTML = `
    ${devoBubble}
    ${fragileLine}
    <div class="mana-box-line normal" title="Mana disponible / maximum"><span class="mana-ico"></span><span>${p.manaNormal}/${p.manaNormalMax}</span></div>
    <div class="mana-box-region-thumb" style="${regionThumbStyle}"></div>
  `;
  const devoEl = document.getElementById(`devotion-bubble-${slot}`);
  if(devoEl) devoEl.onclick = (ev)=>{ ev.stopPropagation(); openDevotionModal(key); };
  if(region.name){
    const thumbEl = el.querySelector('.mana-box-region-thumb');
    thumbEl.style.cursor = 'pointer';
    attachHoverPreview(thumbEl, region);
  }
}

// Cadre du héros : le portrait lui-même sert de bouton d'activation quand
// le héros a un pouvoir activable. Survoler affiche son aperçu complet.
/* Repères visuels sur le cadre de certains héros. Données lues dans l'état de partie
   (compteurs de cartes jouées, effets « prochaine carte » en attente, tour actif, PV perdus). */
const HERO_INDICATOR_BROKEN_SHIELD = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 L35 8 V20 C35 28 28 34 20 37 C12 34 5 28 5 20 V8 Z" fill="var(--ind-fill)" stroke="var(--ind-edge)" stroke-width="2.5" stroke-linejoin="round"/><path d="M20 3 L23 14 L16 20 L22 27 L19 37" fill="none" stroke="var(--ind-crack)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const HERO_INDICATOR_TEAPOT = '<svg viewBox="0 0 48 40" aria-hidden="true"><circle cx="22" cy="5" r="2.6" fill="#000"/><path d="M14 11 Q22 6 30 11 Z" fill="#000"/><ellipse cx="22" cy="23" rx="15" ry="12" fill="#000"/><rect x="12" y="33" width="20" height="4" rx="2" fill="#000"/><path d="M35 20 Q40 22 42 10 L46 8 Q46 24 36 29 Z" fill="#000"/><path d="M8 18 Q-1 16 2 28 Q4 31 8 29" fill="none" stroke="#000" stroke-width="3.4" stroke-linecap="round"/></svg>';
const HERO_INDICATORS = {
  "nayenn'der": { kind:'sharks',    icon:'🦈', label:'Requins blancs = créatures jouées vers le prochain Squale affamé' },
  "rascal":     { kind:'progress',  icon:'⚡', label:'sortilège(s) joué(s) vers le prochain effet' },
  "linéasthasia": { kind:'progress', icon:'⚡', label:'sortilège(s) joué(s) ce tour-ci vers l\'effet' },
  "brick":      { kind:'pending',   icon:'🔍', label:'Mot-clé en attente : votre prochaine créature jouée l\'obtiendra' },
  "aurore":     { kind:'pending',   icon:'☀️', label:'Prête : la prochaine créature alliée jouée gagnera +1/+1' },
  "nowa":       { kind:'myTurn',    icon:HERO_INDICATOR_TEAPOT, svg:true, label:'C\'est votre tour : vos capacités « Final » sont doublées' },
  "la tortue":  { kind:'turtle',    icon:HERO_INDICATOR_BROKEN_SHIELD, svg:true, label:'Passif prêt : vos créatures arrivent avec +1/+0 supplémentaire' }
};
function heroIndicatorsHtml(key, hero, slot){
  try{
    const p = S[key];
    const name = String((hero && hero.name) || '').toLowerCase().replace(/[\u2019\u2018]/g, "'").trim();
    const cfg = HERO_INDICATORS[name];
    if(!cfg) return '';
    const __wrap = (r)=>{
      if(r && typeof r==='object'){
        const rows = [`<div class="hero-ind-row">${r.main}</div>`, r.sub ? `<div class="hero-ind-row sub">${r.sub}</div>` : ''];
        return (slot==='p1' ? rows.reverse() : rows).join('');
      }
      return r ? `<div class="hero-ind-row">${r}</div>` : '';
    };
    const esc = (t)=>String(t).replace(/"/g,'&quot;');
    const one = (cls)=>`<span class="hero-indicator ${cls||''}" title="${esc(cfg.label)}">${cfg.icon}</span>`;
    if(cfg.kind==='sharks' || cfg.kind==='progress'){
      const allTr = (hero.abilities||[]).flatMap(a=>a.triggers||[]);
      const te = allTr.find(t=>t.trigger==='playedCardTypeCountMatch') || allTr.find(t=>t.trigger==='playedCardTypeCountThisTurn');
      if(!te) return '';
      const perTurn = te.trigger==='playedCardTypeCountThisTurn';
      const filter = (perTurn ? te.playedCardTypeFilter : te.playedCardTypeMatchFilter) || 'any';
      const threshold = Math.max(1, (perTurn ? te.playedCardTypeCount : te.playedCardTypeMatchCount) || (perTurn ? 1 : 3));
      const counts = (perTurn ? p.cardsPlayedThisTurnByType : p.matchCardsPlayedByType) || {};
      const total = filter==='any' ? Object.values(counts).reduce((a,n)=>a+(n||0),0) : (counts[filter]||0);
      const done = (!perTurn && te.playedCardTypeMatchReset) ? (total % threshold) : Math.min(total, threshold);
      if(cfg.kind==='sharks'){
        const sharks = Array.from({length:threshold}, (_, i)=>one(i<done ? 'shark-white' : 'shark-black')).join('');
        // Améliorations permanentes des créatures conjurées (ex. « Squale affamé ») : mots-clés + un « + » par point de bonus
        const conj = (hero.abilities||[]).flatMap(a=>(a.effects||[])).find(e=>e.effectType==='conjure' && e.conjureSpecificName);
        const upg = (p.conjurationUpgrades||{})[(conj && conj.conjureSpecificName) || 'Squale affamé'] || null;
        let sub = '';
        if(upg){
          const kws = (upg.keywords||[]).map(k=>KEYWORD_ICON_FILES[k] ? `<img src="images/${KEYWORD_ICON_FILES[k]}" alt="" title="${esc(KEYWORD_LABELS[k]||k)} (définitif)">` : `<span class="hero-ind-plus" title="${esc(KEYWORD_LABELS[k]||k)} (définitif)">${esc((KEYWORD_LABELS[k]||k)[0])}</span>`).join('');
          const n = Math.max(upg.atkBonus||0, upg.hpBonus||0);
          const plus = n>0 ? `<span class="hero-ind-plus" title="+${upg.atkBonus||0}/+${upg.hpBonus||0} définitif">${n<=8 ? '+'.repeat(n) : '+'+n}</span>` : '';
          sub = kws + plus;
        }
        return __wrap({ main: sharks, sub });
      }
      return __wrap(Array.from({length:threshold}, (_, i)=>one(i<done ? 'shark-white' : 'shark-black')).join(''));
    }
    if(cfg.kind==='pending'){
      return __wrap((p.pendingNextCardEffects && p.pendingNextCardEffects.length) ? one('shark-white ready') : one('shark-black'));
    }
    if(cfg.kind==='myTurn'){
      return __wrap(S.active===key ? one('shark-white') : one('shark-black'));
    }
    if(cfg.kind==='turtle'){
      const oppKey = key==='p1' ? 'p2' : 'p1';
      return __wrap((S.active===key && (S[oppKey].hpLostThisTurn||0) > 0) ? one('turtle-white ready') : one('turtle-black'));
    }
  }catch(e){}
  return '';
}

// Pouvoir prêt : cercle de runes qui tourne lentement autour du portrait (6 glyphes).
// Le décalage d'animation suit l'horloge : la rotation ne repart pas de zéro à chaque rendu.
function heroRunesHtml(){
  let gl = '';
  for(let i=0;i<6;i++){ const a = i*Math.PI/3; gl += `<i style="left:calc(50% + ${(Math.cos(a)*50).toFixed(2)}% - 5px);top:calc(50% + ${(Math.sin(a)*50).toFixed(2)}% - 5px)"></i>`; }
  return `<span class="hero-runes" aria-hidden="true" style="animation-delay:-${Date.now()%10000}ms">${gl}</span>`;
}
function renderHeroFrame(key, slot){
  const p = S[key];
  const el = document.getElementById(`hero-frame-${slot}`);
  const hero = p.hero || {};
  const heroName = hero.name || (slot==='p1' ? 'Moi' : 'Adversaire');
  const heroPortraitStyle = hero.image ? `background-image:url('${hero.image.replace(/'/g,"")}');background-position:${hero.imagePosX??50}% ${hero.imagePosY??50}%;background-size:${(hero.imageZoom??100)>100?hero.imageZoom+'%':'cover'};` : '';
  const hasNewFormatPower = !!(hero.abilities && hero.abilities.some(ab=>ab.kind==='triggered' && (ab.triggers||[]).some(te=>te.trigger==='activated')));
  const canActivate = slot==='p1' && S.active===MY_KEY && S.phase==='main' && (!!hero.activeEffect || hasNewFormatPower);
  const isPendingTarget = isValidPendingHeroTarget(key) || isValidNewFormatHeroTarget(key);
  const clickable = canActivate || isPendingTarget;

  el.innerHTML = `
    <button class="hero-portrait-big ${canActivate?'can-activate':''} ${isPendingTarget?'targetable':''}" id="hero-portrait-${slot}" style="${heroPortraitStyle}" ${clickable?'':'disabled'}>
      ${hero.image ? '' : (heroName[0]||'?')}
      ${canActivate ? heroRunesHtml() : ''}
      <span class="hp-badge-big">${p.hp}</span>
    </button>
    ${(()=>{ const h = heroIndicatorsHtml(key, hero, slot); return h ? `<div class="hero-indicators">${h}</div>` : ''; })()}
  `;
  const btn = el.querySelector('.hero-portrait-big');
  btn.onmouseenter = (ev)=>showHeroPreview(hero, ev);
  btn.onmousemove = moveHeroPreview;
  btn.onmouseleave = hidePreview;
  if(UI.pendingNewTarget && isValidNewFormatHeroTarget(key)){
    btn.onclick = ()=>pickNewFormatTarget(`hero:${key}`);
  } else if(isPendingTarget){
    btn.onclick = ()=>{
      confirmPendingTarget({ isHeroTarget:true, playerKey:key });
    };
  } else if(canActivate){
    btn.onclick = uiActivateHeroPower;
  }
  ritualWatch(key, slot, el);
  renderRitualSlot(key, slot, el);
}

// ---------------- Rituel (set La guerre élémentaire) ----------------
// p.ritual = { card, mana, pouredTurn } (moteur : doPourRitual / doRitualOffering).
function ritualTotalClient(r){ return Math.max(0, parseInt(r && r.card && r.card.cost) || 0); }
function canPourRitualClient(){
  const me = S[MY_KEY];
  if(!me || !me.ritual || S.gameOver || S.active!==MY_KEY || S.phase!=='main') return false;
  if(me.ritual.pouredTurn===S.turn || me.attackPhaseDone) return false;
  const played = Object.values(me.cardsPlayedThisTurnByType||{}).reduce((a,b)=>a+(b||0),0);
  return played===0 && ((me.manaNormal||0)+(me.manaFragile||0))>0;
}
// --- Animation du Rituel (runes) : détectée en comparant l'état d'un rendu au suivant ---
// (le moteur n'écrit pas ces événements dans le journal structuré).
//   mana en hausse  -> runes de la réserve de mana vers l'anneau ;
//   mana en baisse  -> les runes quittent l'anneau ;
//   Rituel disparu  -> « accompli » (p.ritualsDone a augmenté) ou « détruit ».
const __RIT_SEEN = {};   // key -> { mana, total, card, done }
const __RIT_HOLD = {};   // key -> mana affiché pendant qu'une animation est en cours
function ritualRunesHtml(mana, tot){
  const lit = tot>0 ? Math.round(Math.min(mana,tot)/tot*8) : 0;
  let h = '';
  for(let i=0;i<8;i++){
    const a = i/8*Math.PI*2 - Math.PI/2;
    h += `<span class="rit-rune ${i<lit?'lit':''}" style="left:${(42+Math.cos(a)*54).toFixed(1)}px;top:${(42+Math.sin(a)*54).toFixed(1)}px">${'ᚠᚢᚦᚨᚱᚲᚷᚹ'[i]}</span>`;
  }
  return h;
}
function ritualRingSet(key, mana){
  const slot = key===MY_KEY ? 'p1' : 'p2';
  const wrap = document.querySelector(`#hero-frame-${slot} .ritual-slot`);
  const r = S[key] && S[key].ritual; if(!wrap || !r) return;
  const tot = ritualTotalClient(r);
  const ring = wrap.querySelector('.ritual-ring'), num = wrap.querySelector('.rit-num'), runes = wrap.querySelector('.ritual-runes');
  if(ring) ring.style.setProperty('--rit-p', tot>0 ? Math.round(mana*100/tot) : 0);
  if(num) num.textContent = `${mana}/${tot}`;
  if(runes) runes.innerHTML = ritualRunesHtml(mana, tot);
}
function ritualAnchorRect(slot, frameEl){
  const f = frameEl.getBoundingClientRect();
  return slot==='p1'
    ? { left:f.right+14+59, top:f.bottom-74, width:0, height:0 }
    : { left:f.left-14-59, top:f.top+42, width:0, height:0 };
}
function ritualWatch(key, slot, frameEl){
  const p = S && S[key];
  const r = p && p.ritual && p.ritual.card ? p.ritual : null;
  const done = (p && p.ritualsDone) || 0;
  const prev = __RIT_SEEN[key];
  const cur = r ? { mana:Math.min(r.mana||0, ritualTotalClient(r)), total:ritualTotalClient(r), card:r.card, done } : { gone:true, done };
  __RIT_SEEN[key] = cur;
  if(!prev || !window.BFX2 || combatInstant()) return;
  const mine = key===MY_KEY;
  if(prev.card && cur.gone){
    const accomplished = done > (prev.done||0);
    const anchor = ritualAnchorRect(slot, frameEl);
    const node = accomplished && typeof cardEl==='function' ? cardEl(prev.card) : null;
    queueCombatAnim(()=>{ if(accomplished){ try{ playSfx('ritual-complete'); }catch(e){} } return accomplished ? BFX2.ritualComplete(anchor, node, mine) : BFX2.ritualDestroy(anchor); });
  } else if(prev.card && cur.card && prev.card===cur.card || (prev.card && cur.card && (prev.card.id||prev.card.name)===(cur.card.id||cur.card.name))){
    if(cur.mana > prev.mana){
      __RIT_HOLD[key] = prev.mana;
      queueCombatAnim(()=>{
        const fromEl = document.getElementById(`mana-box-${slot}`) || frameEl;
        const ringEl = frameEl.querySelector('.ritual-ring');
        const n = Math.min(10, cur.mana - prev.mana + 2);
        return BFX2.runeFlight(fromEl, ringEl, n, (i)=>{
          const m = Math.min(cur.mana, prev.mana + Math.ceil((i+1)*(cur.mana-prev.mana)/n));
          ritualRingSet(key, m);
          BFX2.ritualPulse(frameEl.querySelector('.ritual-ring'));
        }).then(()=>{ delete __RIT_HOLD[key]; ritualRingSet(key, cur.mana); });
      });
    } else if(cur.mana < prev.mana){
      __RIT_HOLD[key] = prev.mana;
      queueCombatAnim(()=>{
        const ringEl = frameEl.querySelector('.ritual-ring');
        const up = ringEl ? ringEl.getBoundingClientRect() : null;
        const away = up ? { left:up.left+up.width/2+30, top:-20, width:0, height:0 } : null;
        return BFX2.runeFlight(ringEl, away, Math.min(10, prev.mana-cur.mana+2), null)
          .then(()=>{ delete __RIT_HOLD[key]; ritualRingSet(key, cur.mana); });
      });
    }
  }
}
function renderRitualSlot(key, slot, frameEl){
  const r = S[key] && S[key].ritual;
  if(!r || !r.card) return;
  const tot = ritualTotalClient(r), mana = Math.min(__RIT_HOLD[key]!=null ? __RIT_HOLD[key] : (r.mana||0), tot);
  const pct = tot>0 ? Math.round(mana*100/tot) : 0;
  const color = (typeof getClassColor==='function' ? getClassColor(r.card.class) : null) || '#c98bff';
  const mine = key===MY_KEY;
  const canPour = mine && canPourRitualClient();
  const canOffer = mine && !!r.card.ritualOfferingEnabled && S.active===MY_KEY && S.phase==='main' && (S[MY_KEY].board||[]).length>0;
  const wrap = document.createElement('div');
  wrap.className = 'ritual-slot';
  wrap.innerHTML = `
    <div class="ritual-ringwrap">
      <div class="ritual-runes">${ritualRunesHtml(mana, tot)}</div>
      <button class="ritual-ring ${canPour?'can-pour':''}" style="--rit-p:${pct};--rit-c:${color};" title="Rituel : ${escapeHtml(r.card.name||'')} — ${mana}/${tot} mana (clic : voir la carte)">
        <div class="ritual-ring-inner"><span class="rit-num">${mana}/${tot}</span><span class="rit-lbl">Rituel</span></div>
      </button>
    </div>
    <div class="ritual-name">${escapeHtml(r.card.name||'Rituel')}</div>`;
  wrap.querySelector('.ritual-ring').onclick = ()=>openRitualCardModal(key);
  if(canPour){
    const b = document.createElement('button'); b.className='phase-btn'; b.textContent='Verser du mana';
    b.onclick = uiPourRitual; wrap.appendChild(b);
  }
  if(canOffer){
    const b = document.createElement('button'); b.className='phase-btn secondary'; b.textContent=`Offrande (+${r.card.ritualOfferingMana||2})`;
    b.onclick = uiRitualOffering; wrap.appendChild(b);
  }
  frameEl.appendChild(wrap);
}
function openRitualCardModal(key){
  const r = S[key] && S[key].ritual; if(!r) return;
  document.getElementById('discard-modal-title').textContent = `Rituel — ${ritualTotalClient(r) ? Math.min(r.mana||0, ritualTotalClient(r)) + '/' + ritualTotalClient(r) + ' mana' : ''}`;
  const box = document.getElementById('discard-modal-list');
  box.innerHTML = '';
  box.appendChild(cardEl(r.card));
  document.getElementById('discard-modal').classList.add('show');
}
// Petite fenêtre de choix (boutons) réutilisée par le Rituel.
function showChoiceButtonsModal(titleText, subText, choices, onPick){
  const old = document.getElementById('offering-overlay'); if(old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'offering-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,4,10,.78);z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;';
  const box = document.createElement('div');
  box.style.cssText = "max-width:560px;width:100%;background:hsl(calc(var(--th, 252) + 1.3) calc(var(--ts-n, 1) * 32.1%) 11% / .97);border:2px solid var(--gold);border-radius:12px;padding:18px 20px;color:#f2ead2;font-family:'Cinzel',serif;";
  box.innerHTML = `<div style="font-weight:700;font-size:17px;color:var(--gold);margin-bottom:6px;">${escapeHtml(titleText)}</div><div style="font-size:13px;opacity:.85;margin-bottom:12px;">${escapeHtml(subText)}</div>`;
  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;';
  choices.forEach(ch=>{
    const b = document.createElement('button'); b.className='phase-btn'; b.style.cssText='font-size:13px;padding:8px 12px;';
    b.textContent = ch.label; b.onclick = ()=>{ overlay.remove(); onPick(ch.value); };
    list.appendChild(b);
  });
  box.appendChild(list);
  const row = document.createElement('div'); row.style.cssText='display:flex;justify-content:flex-end;';
  const cancel = document.createElement('button'); cancel.className='phase-btn'; cancel.textContent='Annuler'; cancel.onclick = ()=>overlay.remove();
  row.appendChild(cancel); box.appendChild(row);
  overlay.appendChild(box);
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
function uiPourRitual(){
  const me = S[MY_KEY]; const r = me && me.ritual; if(!r) return;
  const need = ritualTotalClient(r) - (r.mana||0);
  const max = Math.min(need, (me.manaNormal||0)+(me.manaFragile||0));
  if(max<=0) return;
  const choices = [];
  for(let n=1; n<=max; n++) choices.push({ label: n===need ? `${n} (accomplir)` : String(n), value:n });
  showChoiceButtonsModal(`Rituel — ${r.card.name}`, `Combien de mana verser ? (une fois par tour, avant de jouer une carte ou d'attaquer) — ${r.mana||0}/${ritualTotalClient(r)}`, choices,
    (n)=>runAction('Verser dans le Rituel', ()=>gsPourRitual(n)));
}
function uiRitualOffering(){
  const me = S[MY_KEY]; const r = me && me.ritual; if(!r) return;
  showChoiceButtonsModal(`Offrande au Rituel — ${r.card.name}`, `Sacrifier une créature ajoute ${r.card.ritualOfferingMana||2} mana au Rituel.`,
    (me.board||[]).map(c=>({ label:`${c.name} (${c.curAtk ?? c.atk ?? 0}/${c.curHp ?? c.hp ?? 0})`, value:c.instId })),
    (id)=>runAction('Offrande au Rituel', ()=>gsRitualOffering(id)));
}

async function uiActivateHeroPower(targetInfo, chosenTargets){
  if(!targetInfo && !chosenTargets){
    const hero = S[MY_KEY].hero;
    const chosenDefs = findNewFormatChosenTargets(hero, 'activated');
    if(chosenDefs.length){
      startNewFormatTargeting('hero', chosenDefs, {});
      return;
    }
    const eff = hero && hero.activeEffect;
    if(eff && TARGETED_EFFECTS.includes(eff.type) && eff.targetOwner!=='self' && eff.targetOwner!=='trigger'){
      UI.pendingPower = { kind:'hero', effect: eff };
      render();
      return;
    }
  }
  LAST_SACRIFICEABLE_ACTION = { action:'useHeroPower', targetInfo, chosenTargets };
  await runAction('Pouvoir de héros', ()=>gsUseHeroPower(targetInfo, chosenTargets));
}
async function uiActivatePermanent(permanentType, permanentInstId, targetInfo, chosenTargets, choiceKey){
  if(!targetInfo && !chosenTargets){
    let permanent = null;
    const p = S[MY_KEY];
    if(permanentType==='creature') permanent = p.board.find(c=>c.instId===permanentInstId);
    else if(permanentType==='artifact') permanent = p.relics.find(r=>r.instId===permanentInstId);
    else if(permanentType==='region') permanent = p.region;
    // Capacité activée « Choisissez : A ou B » : on demande d'abord le choix (comme pour une carte jouée)
    if(permanent && !choiceKey && permanent.abilities){
      const choiceAb = permanent.abilities.find(ab=>ab.kind==='triggered' && ab.useChoice && ab.choiceA && ab.choiceB && (ab.triggers||[]).some(te=>te.trigger==='activated'));
      if(choiceAb){
        showCardChoiceModal(permanent, choiceAb, (pickedKey)=>{ uiActivatePermanent(permanentType, permanentInstId, null, null, pickedKey); });
        return;
      }
    }
    const chosenDefs = permanent ? findNewFormatChosenTargets(permanent, 'activated', choiceKey) : [];
    if(chosenDefs.length){
      startNewFormatTargeting('permanent', chosenDefs, { permanentType, permanentInstId, choiceKey });
      return;
    }
    const eff = permanent && permanent.triggeredEffects && permanent.triggeredEffects.activated;
    if(eff && TARGETED_EFFECTS.includes(eff.type) && eff.targetOwner!=='self' && eff.targetOwner!=='trigger'){
      UI.pendingPower = { kind:'permanent', effect: eff, permanentType, permanentInstId };
      render();
      return;
    }
  }
  LAST_SACRIFICEABLE_ACTION = { action:'activatePermanent', permanentType, permanentInstId, targetInfo, chosenTargets, choiceKey };
  const res = await runAction('Capacité activée', ()=>gsActivatePermanent(permanentType, permanentInstId, targetInfo, chosenTargets, undefined, choiceKey));
  if(permanentType==='artifact' && res && !res.error){
    // Le nouveau rendu (qui grise l'artefact désormais utilisé) vient de
    // reconstruire l'élément — on attend une frame pour cibler le NOUVEL
    // élément avant de lancer le flash, sinon on animerait un nœud déjà
    // remplacé et donc invisible.
    requestAnimationFrame(()=>{
      const el = document.querySelector(`[data-instid="${permanentInstId}"]`);
      if(el){
        el.classList.add('artifact-activate-flash');
        el.addEventListener('animationend', ()=>el.classList.remove('artifact-activate-flash'), {once:true});
      }
    });
  }
}

// La zone deck : visuel du dos de carte + nombre de cartes restantes +
// nombre de cartes en défausse (clic pour en voir le contenu).
function renderDeckZone(key, slot){
  const p = S[key];
  const el = document.getElementById(`deck-zone-${slot}`);
  // Champs facultatifs : le moteur ne les envoie pas encore (nouvelles mécaniques à venir).
  const exiled = Array.isArray(p.exile) ? p.exile : [];
  const buffs = Array.isArray(p.deckBuffs) ? p.deckBuffs : [];
  const backStyle = p.cardBackUrl ? `style="background-image:url('${p.cardBackUrl.replace(/'/g,"")}');background-size:cover;background-position:center;"` : '';
  el.innerHTML = `
    <div class="deck-back-visual" ${backStyle} title="${p.deck.length} carte(s) restante(s)"></div>
    <div class="deck-counts">
      <div class="badge deck" title="Cartes restantes"><span class="badge-icon">🂠</span><span class="badge-count">${p.deck.length}</span><span class="badge-label">Deck</span></div>
      <div class="badge discard ${p.discard.length>0?'has-cards':''}" title="Défausse" id="discard-badge-${slot}"><span class="badge-icon">🪦</span><span class="badge-count">${p.discard.length}</span><span class="badge-label">Défausse</span></div>
      <div class="badge exile ${exiled.length>0?'has-cards':''}" title="Exil : cartes retirées de la partie (définitivement ou temporairement)" id="exile-badge-${slot}"><span class="badge-icon">🌀</span><span class="badge-count">${exiled.length}</span><span class="badge-label">Exil</span></div>
      <div class="badge deckbuffs ${buffs.length>0?'has-cards':''}" title="Bonus permanents ajoutés aux cartes de la pioche" id="deckbuffs-badge-${slot}"><span class="badge-icon">✨</span><span class="badge-count">${buffs.length}</span><span class="badge-label">Bonus</span></div>
    </div>
  `;
  document.getElementById(`discard-badge-${slot}`).onclick = ()=>openDiscardModal(key);
  document.getElementById(`exile-badge-${slot}`).onclick = ()=>openExileModal(key);
  document.getElementById(`deckbuffs-badge-${slot}`).onclick = ()=>openDeckBuffsModal(key);
}

function isEdificeClient(c){
  return !!c && c.type==='Artefact' && (c.subtypes||[]).some(s=>String(s).trim().toLowerCase()==='édifice');
}
function toggleAttackTargetEdifice(edId){
  if(!UI.attackTargets) UI.attackTargets = {};
  const last = UI.lastSelectedAttacker && UI.selectedAttackers.includes(UI.lastSelectedAttacker) ? UI.lastSelectedAttacker : UI.selectedAttackers[UI.selectedAttackers.length-1];
  if(!last) return;
  if(UI.attackTargets[last]===edId) delete UI.attackTargets[last]; else UI.attackTargets[last] = edId;
  render();
}
function renderArtifactStack(key, slot){
  const el = document.getElementById(`artifacts-${slot}`);
  el.innerHTML = '';
  const p = S[key];
  const relics = p.relics || [];
  for(let i=0; i<2; i++){
    const wrap = document.createElement('div');
    wrap.className = 'relic-slot';
    if(relics[i]){
      const r = relics[i];
      // Un artefact peut être la cible en attente d'un sort/capacité en
      // cours de ciblage (ex : "Passage du temps", "détruisez un artefact
      // ennemi de votre choix") — ce cas manquait entièrement ici jusque-là :
      // isValidNewFormatTarget/pickNewFormatTarget n'étaient câblés que sur
      // les créatures (voir renderLane), jamais sur les artefacts. La cible
      // se mettait bien en attente côté client, mais il n'existait aucun
      // moyen de cliquer sur l'artefact visé pour la confirmer — le
      // ciblage restait bloqué indéfiniment, sans erreur visible.
      const isTargetable = UI.pendingNewTarget && isValidNewFormatTarget(key, r);
      const cardElNode = cardEl(r, {inPlay:true, targetable: isTargetable});
      wrap.appendChild(cardElNode);
      const isEdi = isEdificeClient(r);
      if(isEdi){
        // l'Endurance (vivante) est affichée dans la bulle d'endurance de la carte elle-même
        // Attaquants qui visent cet Édifice (sélection en cours, ou attaque adverse déclarée)
        const tgtMap = key===OPP_KEY && UI.selectingAttackers ? (UI.attackTargets||{}) : (S[key===MY_KEY?OPP_KEY:MY_KEY].__attackTargets||{});
        const liveAtk = key===OPP_KEY && UI.selectingAttackers ? UI.selectedAttackers : (S[key===MY_KEY?OPP_KEY:MY_KEY].attackers||[]);
        const nAtk = Object.entries(tgtMap).filter(([a,t])=>t===r.instId && liveAtk.includes(a)).length;
        if(nAtk>0){ const b=document.createElement('div'); b.className='edifice-target-badge'; b.textContent=`⚔ ${nAtk}`; wrap.appendChild(b); }
      }
      if(isEdi && key===OPP_KEY && UI.selectingAttackers && UI.selectedAttackers.length){
        // Clic : le dernier attaquant choisi attaque cet Édifice (re-clic : il revient sur le héros)
        wrap.classList.add('edifice-clickable');
        wrap.title = "Envoyer le dernier attaquant choisi sur cet Édifice (re-cliquer : retour sur le héros)";
        wrap.onclick = ()=>toggleAttackTargetEdifice(r.instId);
      } else if(isTargetable){
        cardElNode.style.cursor = 'pointer';
        cardElNode.onclick = ()=>pickNewFormatTarget(r.instId);
      } else if(slot==='p1' && S.active===MY_KEY && S.phase==='main' && !UI.selectingAttackers){
        // Nouveau format (card.abilities) — celui que l'éditeur actuel
        // produit. L'ancien format (triggeredEffects.activated) reste
        // vérifié en repli pour les cartes plus anciennes.
        const hasNewActivated = r.abilities && r.abilities.some(ab=>ab.kind==='triggered' && (ab.triggers||[]).some(te=>te.trigger==='activated'));
        const hasOldActivated = r.triggeredEffects && r.triggeredEffects.activated;
        // Les artefacts sont désormais toujours gratuits et limités à une
        // fois par tour (voir _activatedThisTurn côté serveur) — plus de
        // cooldown à vérifier pour ce type de carte précis.
        const alreadyUsed = !!r._activatedThisTurn;
        if((hasNewActivated || hasOldActivated) && !alreadyUsed){
          cardElNode.style.cursor = 'pointer';
          cardElNode.onclick = ()=>uiActivatePermanent('artifact', r.instId);
        } else if((hasNewActivated || hasOldActivated) && alreadyUsed){
          cardElNode.classList.add('artifact-used-this-turn');
        }
      }
    } else {
      wrap.classList.add('relic-slot-empty');
      if(slot==='p1') wrap.dataset.artifactSlot = 'true';
    }
    el.appendChild(wrap);
  }
}

