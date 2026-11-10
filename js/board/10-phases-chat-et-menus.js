// ============================================================
// Plateau de jeu — 10-phases-chat-et-menus
// Minuteur de tour, barre de phases, aperçu du héros, menus repliables, émotes, chat, défausse
// (Chargé dans l ordre depuis spellcraft-server-board.html : tout est partagé, comme avant.)
// ============================================================
function renderTurnTimer(){
  const el = document.getElementById('turn-timer');
  if(!el || !S) return;
  if(S.gameOver || S.phase==='mulligan' || !S.active){ el.style.display='none'; return; }

  // minuteur de blocage (45s), prioritaire sur celui de tour
  if(S.phase==='declareBlockersMe' && S.blockClockStartedAt){
    const elapsed = (Date.now()-S.blockClockStartedAt)/1000;
    const remaining = Math.max(0, 45-elapsed);
    el.style.display='flex';
    el.className = 'timer-block' + (remaining<=10?' timer-low':'');
    const who = S.active===MY_KEY ? "L'adversaire bloque" : 'Vous bloquez';
    el.textContent = `${who} — ${Math.ceil(remaining)}s`;
    return;
  }

  const p = S[S.active];
  if(!p || p.isAI){ el.style.display='none'; return; }
  let budget = p.turnTimeBudget ?? 120;
  if(!S.turnClockPaused && S.turnClockStartedAt){
    const elapsed = (Date.now()-S.turnClockStartedAt)/1000;
    budget = Math.max(0, budget-elapsed);
  }
  el.style.display='flex';
  const mins = Math.floor(budget/60), secs = Math.floor(budget%60);
  const label = S.active===MY_KEY ? 'Votre tour' : "Tour adverse";
  el.className = (S.active===MY_KEY?'timer-mine':'') + (budget<=20?' timer-low':'') + (S.turnClockPaused?' timer-paused':'');
  el.textContent = `${label} — ${mins}:${String(secs).padStart(2,'0')}${S.turnClockPaused?' (pause)':''}`;
}

// Rappel clignotant + sonore quand le bouton d'action (combat / fin de tour /
// fin de blocage) reste cliquable trop longtemps sans que le joueur agisse.
// __phaseReminder.key identifie l'état actionnable en cours (pas le texte du
// bouton, qui peut changer sans que l'état change — ex: le nombre
// d'attaquants sélectionnés) : tant que la clé ne change pas, le minuteur
// n'est jamais réinitialisé, y compris à travers les re-rendus périodiques
// (resynchronisation, voir onStateUpdate) qui reconstruisent le bouton.
let __phaseReminder = { key:null, blinking:false, timeoutId:null, intervalId:null };
function clearPhaseReminder(){
  if(__phaseReminder.timeoutId) clearTimeout(__phaseReminder.timeoutId);
  if(__phaseReminder.intervalId) clearInterval(__phaseReminder.intervalId);
  __phaseReminder = { key:null, blinking:false, timeoutId:null, intervalId:null };
}
function startPhaseReminderBlink(phaseKey){
  if(__phaseReminder.key !== phaseKey) return; // l'état a changé entre-temps (annulé plus haut normalement)
  __phaseReminder.blinking = true;
  const btn = document.querySelector('#phase-bar .phase-btn:not(.secondary)');
  if(btn) btn.classList.add('reminder-blink');
  playSfx('phase-reminder');
  __phaseReminder.intervalId = setInterval(()=>{
    if(__phaseReminder.key !== phaseKey){ clearPhaseReminder(); return; }
    playSfx('phase-reminder');
  }, 9000);
}
function setupPhaseReminder(btn, phaseKey){
  if(!phaseKey){ clearPhaseReminder(); return; }
  if(__phaseReminder.key !== phaseKey){
    clearPhaseReminder();
    __phaseReminder.key = phaseKey;
    __phaseReminder.timeoutId = setTimeout(()=>startPhaseReminderBlink(phaseKey), 30000);
  } else if(__phaseReminder.blinking){
    // Même état déjà signalé — le bouton vient d'être recréé (re-rendu), on
    // réapplique juste le clignotement plutôt que de repartir de zéro.
    btn.classList.add('reminder-blink');
  }
}

function toggleDiscardChoice(i){
  const pd = S.pendingDiscard;
  if(!pd || pd.playerKey!==MY_KEY) return;
  const need = Math.min(pd.count, Math.min(pd.eligible, (S[MY_KEY].hand||[]).length));
  const sel = UI.discardSel || (UI.discardSel = []);
  const at = sel.indexOf(i);
  if(at>=0) sel.splice(at,1);
  else if(need===1){ sel.length = 0; sel.push(i); }   // un seul à défausser : un clic sur une autre carte change le choix
  else if(sel.length<need) sel.push(i);
  renderHand(); renderPhaseBar();
}
async function confirmDiscardChoice(){
  const pd = S.pendingDiscard;
  if(!pd || pd.playerKey!==MY_KEY) return;
  const idx = [...(UI.discardSel||[])];
  UI.discardSel = [];
  await runAction('Défausse', ()=>gsResolveDiscardChoice(idx));
}
function renderPhaseBar(){
  const bar = document.getElementById('phase-bar');
  bar.innerHTML = '';
  if(S.gameOver){ clearPhaseReminder(); return; }

  if(S.pendingDiscard && GS_ROLE!=='spectator' && S.pendingDiscard.playerKey===MY_KEY){
    const pd = S.pendingDiscard;
    const need = Math.min(pd.count, Math.min(pd.eligible, (S[MY_KEY].hand||[]).length));
    const got = (UI.discardSel||[]).length;
    const btn = document.createElement('button');
    btn.className = 'phase-btn';
    btn.textContent = got>=need ? `Valider la défausse (${got}/${need})` : `Choisis ${need} carte${need>1?'s':''} à défausser (${got}/${need})`;
    btn.disabled = got!==need;
    btn.onclick = confirmDiscardChoice;
    bar.appendChild(btn);
    clearPhaseReminder();
    return;
  }
  if(S.pendingDiscard){
    const btn = document.createElement('button');
    btn.className = 'phase-btn';
    btn.textContent = S.pendingDiscard.playerKey===OPP_KEY ? "L'adversaire choisit les cartes à défausser..." : 'Défausse en cours...';
    btn.disabled = true;
    bar.appendChild(btn);
    clearPhaseReminder();
    return;
  }

  if(S.pendingSacrifice && S.pendingSacrifice.playerKey===MY_KEY){
    const btn = document.createElement('button');
    btn.className = 'phase-btn';
    btn.textContent = 'Choisis une créature à sacrifier...';
    btn.disabled = true;
    bar.appendChild(btn);
    clearPhaseReminder();
    return;
  }

  if(S.pendingTarget && S.pendingTarget.playerKey!==MY_KEY){
    const btn = document.createElement('button');
    btn.className = 'phase-btn';
    btn.textContent = "L'adversaire choisit une cible...";
    btn.disabled = true;
    bar.appendChild(btn);
    clearPhaseReminder();
    return;
  }

  if(UI.pendingCard || UI.pendingPower || UI.pendingNewTarget){
    const btn = document.createElement('button');
    btn.className = 'phase-btn';
    if(UI.pendingNewTarget){
      const pn = UI.pendingNewTarget;
      const got = pn.selectedInstIds.length;
      const max = newFormatTargetMax(pn.target, got + newFormatCandidates(pn.target, pn.selectedInstIds).length);
      let label = newFormatTargetPrompt(pn.target);
      if(pn.kind==='deferred' && S.pendingTarget) label = `${S.pendingTarget.sourceName || 'Capacité'} : ${label}`;
      if(pn.queue && pn.queue.length>1) label += ` — cible ${pn.step+1}/${pn.queue.length}`;
      if(max>1) label += ` (${got}/${newFormatTargetIsDynamic(pn.target) ? '…' : max})`;
      btn.textContent = label + '...';
    } else {
      btn.textContent = 'Choisis une cible...';
    }
    btn.disabled = true;
    bar.appendChild(btn);
    if(UI.pendingNewTarget && UI.pendingNewTarget.selectedInstIds.length>=1){
      // "X cibles" = de 1 jusqu'à X : on peut valider dès la première.
      const ok = document.createElement('button');
      ok.className = 'phase-btn';
      ok.textContent = 'Valider';
      ok.onclick = confirmNewFormatTargets;
      bar.appendChild(ok);
    }
    if(!(UI.pendingNewTarget && UI.pendingNewTarget.kind==='deferred')){
      const cancel = document.createElement('button');
      cancel.className = 'phase-btn secondary small';
      cancel.textContent = 'Annuler';
      cancel.onclick = UI.pendingNewTarget ? cancelPendingNewTarget : cancelPendingCard;
      bar.appendChild(cancel);
    }
    clearPhaseReminder();
    return;
  }

  if(S.phase==='mulligan'){
    if(!S.mulliganDone[MY_KEY]){
      showMulliganOverlay();
    } else {
      const btn = document.createElement('button');
      btn.className = 'phase-btn';
      btn.textContent = "En attente de l'adversaire...";
      btn.disabled = true;
      bar.appendChild(btn);
    }
    clearPhaseReminder();
    return;
  }

  const myTurn = S.active===MY_KEY;
  const me = S[MY_KEY];
  const btn = document.createElement('button');
  btn.className = 'phase-btn';
  let phaseKey = null; // reste null tant qu'aucune action n'est vraiment attendue du joueur

  if(!myTurn){
    if(S.phase==='declareBlockersMe' && autoFinishPending()){
      // Plus aucun bloqueur disponible : la phase se termine toute seule (serveur
      // à jour, ou repli client maybeAutoFinishBlocking). Pas d'ancien bouton
      // « Passer » en course ; s'il reste affiché en cas d'échec, voir plus bas.
      btn.textContent = 'Résolution du combat...';
      btn.disabled = true;
    } else if(S.phase==='declareBlockersMe'){
      // Normalement le serveur résout seul la phase quand je ne peux pas
      // bloquer (on n'arrive alors jamais ici). Si l'état est resté en
      // attente de blocage (ancienne partie, serveur non à jour), l'ancien
      // bouton reste affiché : on ne cache jamais une action possible.
      btn.textContent = 'Passer (fin du blocage)';
      if(!shouldOfferBlock(S, MY_KEY, OPP_KEY)) btn.title = 'Aucune de vos créatures ne peut bloquer';
      btn.onclick = uiFinishBlocking;
      phaseKey = 'block-pass';
    } else {
      btn.textContent = 'Tour adverse';
      btn.disabled = true;
    }
  } else if(S.phase==='declareBlockersMe'){
    btn.textContent = "En attente du blocage adverse...";
    btn.disabled = true;
  } else if(UI.selectingAttackers){
    if(UI.selectedAttackers.length){
      btn.textContent = `Valider ${UI.selectedAttackers.length} attaquant(s)`;
      btn.onclick = uiConfirmAttackers;
      phaseKey = 'attack-confirm';
    } else {
      // Aucun attaquant choisi : la phase de combat est passée et, comme il n'y
      // a pas eu de combat, la phase principale 2 n'a pas lieu : le serveur
      // termine le tour (règle de la spec des phases du tour, 15 octobre 2026).
      btn.textContent = 'Passer le combat (fin de tour)';
      btn.onclick = uiConfirmAttackers;
      phaseKey = 'attack-confirm';
    }
    // Le bouton "Tout sélectionner" (et "Annuler") passe sous le bouton
    // d'attaque, dans un empilement vertical plutôt qu'à côté.
    const selectAll = document.createElement('button');
    // « Tout sélectionner » prend la place où se trouvait « Combat » (même endroit sous le doigt) :
    // un double clic sur Combat ne peut plus passer le combat par erreur.
    selectAll.className = 'phase-btn';
    selectAll.textContent = 'Tout sélectionner';
    selectAll.onclick = uiSelectAllAttackers;
    const cancel = document.createElement('button');
    cancel.className = 'phase-btn secondary small';
    cancel.textContent = 'Annuler';
    cancel.onclick = ()=>{ UI.selectingAttackers = false; UI.selectedAttackers = []; UI.attackTargets = {}; render(); };
    const subRow = document.createElement('div');
    subRow.className = 'phase-bar-subrow';
    subRow.appendChild(cancel);
    const stack = document.createElement('div');
    stack.className = 'phase-bar-stack';
    stack.appendChild(selectAll);
    if(!UI.selectedAttackers.length) btn.classList.add('secondary'); // « Passer » discret ; « Valider » reste mis en avant
    stack.appendChild(btn);
    stack.appendChild(subRow);
    {
      const __eds = (S[OPP_KEY].relics||[]).filter(isEdificeClient);
      if(__eds.length){
        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:11px;color:#e9d9a8;max-width:220px;text-align:center;';
        hint.textContent = UI.selectedAttackers.length
          ? "Édifice adverse : choisis-le ci-dessous pour y envoyer le dernier attaquant sélectionné (re-clic : retour sur le héros)."
          : "Sélectionne d'abord un attaquant pour pouvoir viser un Édifice adverse.";
        stack.appendChild(hint);
        if(UI.selectedAttackers.length){
          const lastId = UI.lastSelectedAttacker && UI.selectedAttackers.includes(UI.lastSelectedAttacker) ? UI.lastSelectedAttacker : UI.selectedAttackers[UI.selectedAttackers.length-1];
          __eds.forEach(ed=>{
            const eb = document.createElement('button');
            eb.className = 'phase-btn secondary small';
            const on = (UI.attackTargets||{})[lastId]===ed.instId;
            eb.textContent = (on ? '✔ ' : '🏛 ') + 'Attaquer « ' + ed.name + ' » (' + (ed.curHp ?? ed.hp ?? '?') + ')';
            eb.onclick = ()=>toggleAttackTargetEdifice(ed.instId);
            stack.appendChild(eb);
          });
        }
      }
    }
    bar.appendChild(stack);
  } else if(S.phase==='main' && !me.attackPhaseDone && shouldOfferCombat(S, MY_KEY)){
    // Au moins une créature peut attaquer : « Combat », et « Fin de tour »
    // reste utilisable directement (sans passer par le combat).
    btn.textContent = '⚔ Combat';
    btn.onclick = ()=>{ UI.selectingAttackers = true; UI.selectedAttackers = []; UI.attackTargets = {}; UI.lastSelectedAttacker = null; render(); };
    phaseKey = 'to-combat';
    const endNow = document.createElement('button');
    endNow.className = 'phase-btn secondary small';
    endNow.textContent = 'Fin de tour';
    endNow.onclick = uiEndTurn;
    const subRow = document.createElement('div');
    subRow.className = 'phase-bar-subrow';
    subRow.appendChild(endNow);
    const stack = document.createElement('div');
    stack.className = 'phase-bar-stack';
    stack.appendChild(btn);
    stack.appendChild(subRow);
    bar.appendChild(stack);
  } else if(S.phase==='main'){
    // Combat déjà fait, OU aucune créature ne peut attaquer (mal d'invocation,
    // étourdie, plateau vide...) : la phase de combat est sautée, un seul
    // bouton « Fin de tour », disponible tout de suite.
    btn.textContent = 'Fin de tour';
    btn.onclick = uiEndTurn;
    phaseKey = 'end-turn';
  }

  if(!btn.parentNode) bar.appendChild(btn);
  setupPhaseReminder(btn, phaseKey);
}

// ---------------- Aperçu du héros au survol ----------------

function showHeroPreview(hero, ev){ showCardPreviewHover(hero, ev); }
function moveHeroPreview(ev){
  if(DRAG_STATE) return;
  __lastPreviewEvent = ev;
  const box = document.getElementById('card-preview');
  // Décalage large et volontaire — sur le plateau, les cartes (surtout les
  // artefacts) sont minuscules ; un aperçu trop proche du curseur les
  // recouvre entièrement, rendant impossible de viser le clic précis en
  // dessous (même si l'aperçu lui-même laisse passer les clics).
  // Largeur réelle de la boîte (variable : un héros avec ses cartes liées
  // est bien plus large qu'une carte seule) plutôt qu'une valeur fixe.
  const boxWidth = box.offsetWidth || 300;
  const boxHeight = box.offsetHeight || 420;
  const x = Math.min(ev.clientX + 60, window.innerWidth - boxWidth - 20);
  const y = Math.min(ev.clientY + 60, window.innerHeight - boxHeight - 20);
  box.style.left = x + 'px';
  box.style.top = y + 'px';
}
// `force` : ignore l'épinglage (appui en dehors de l'aperçu). Utilisée aussi
// comme gestionnaire d'événement (le paramètre est alors l'événement : sans effet).
function hidePreview(force){
  if(__previewPinned && force!==true) return;
  __previewPinned = false;
  __previewHoverToken++;
  document.getElementById('card-preview').classList.remove('show');
}

// ---------------- Menus repliables ----------------

function toggleJournal(){
  const panel = document.getElementById('journal-panel');
  panel.classList.toggle('show');
  // Un panneau masqué ne peut pas défiler : à l'ouverture, on se cale sur la
  // dernière ligne (le plus récent).
  if(panel.classList.contains('show')){
    const log = document.getElementById('log');
    if(log) log.scrollTop = log.scrollHeight;
  }
}
// Quitter proprement : si la partie est déjà terminée (ou si on la regarde seulement), on part
// directement. Sinon, partir = CONCÉDER : le serveur donne la victoire à l'adversaire tout de suite
// (même action que le forfait automatique, mais pour soi-même) et on quitte ensuite.
let __leaving = false;
async function uiLeaveGame(){
  if(__leaving) return;
  const isPlayer = (GS_ROLE === 'p1' || GS_ROLE === 'p2');
  const ongoing = S && !S.gameOver && isPlayer;
  if(ongoing){
    if(!await scConfirm("Quitter maintenant compte comme un abandon — ton adversaire gagnera la partie immédiatement. Confirmer ?")) return;
    __leaving = true;
    try{
      // On attend la réponse du serveur (5 s maximum) pour que l'abandon soit bien enregistré avant de quitter.
      const res = await Promise.race([
        gsCallAction('claimForfeit', { disconnectedPlayer: GS_ROLE }),
        new Promise((r)=>setTimeout(()=>r({ error: 'timeout' }), 5000))
      ]);
      if(res && res.error && res.error !== 'game-already-over') console.error('Abandon → ' + res.error);
    }catch(e){ console.error('Abandon →', e); }
  }
  gsDisconnect();
  window.location.href = 'spellcraft-lobby.html';
}
function toggleEmotePanel(){
  const panel = document.getElementById('emote-panel');
  const willShow = !panel.classList.contains('show');
  panel.classList.toggle('show');
  if(willShow) renderEmoteGrid();
}
function renderEmoteGrid(){
  const grid = document.getElementById('emote-grid');
  const hero = S && S[MY_KEY] && S[MY_KEY].hero;
  // Les émotes-images d'origine (hero.emotes) ne sont plus proposées : seules les émotes animées le sont.
  grid.innerHTML = '';
  grid.style.display = 'none';
  // Émotes animées avec le portrait du héros (6 communes à tous les héros)
  let ag = document.getElementById('emote-anim-grid');
  if(!ag){ ag = document.createElement('div'); ag.id = 'emote-anim-grid'; grid.parentNode.appendChild(ag); }
  ag.innerHTML = '';
  EMOTE_ANIMS.forEach(em=>{
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'emote-anim-btn'; b.title = em.label;
    b.innerHTML = `<div class="ea-mini">${animEmoteHtml(hero, em.key)}</div><span>${em.label}</span>`;
    b.onclick = ()=>{ uiSendAnimEmote(em.key); document.getElementById('emote-panel').classList.remove('show'); };
    ag.appendChild(b);
  });
}
// ---- Émotes animées : portrait du héros + 6 animations ----
const EMOTE_ANIMS = [
  {key:'salut',label:'Salut',say:'Salut !'},{key:'bravo',label:'Bien joué',say:'Bravo !'},{key:'oups',label:'Oups',say:'Oups…'},
  {key:'colere',label:'Colère',say:'Grrr !'},{key:'reflechit',label:'Je réfléchis',say:'Hmm…'},{key:'gg',label:'GG',say:'GG !'},
  {key:'joues',label:'Tu joues ?',say:'Tu joues ?'},{key:'aie',label:'Aïe',say:'Aïe !'},{key:'toutca',label:"C'est tout ?",say:"C'est tout ?"}
];
const EMOTE_GEM = {'Aube':'#ffd54a','Crépuscule':'#c98bff','Volonté':'#ff6a72','Prima':'#62e69f','Arcane':'#62b0ff','Neutre':'#f2b06a'};
function __eaStar(x,y,r){ return 'M'+x+' '+(y-r)+'Q'+x+' '+y+' '+(x+r)+' '+y+'Q'+x+' '+y+' '+x+' '+(y+r)+'Q'+x+' '+y+' '+(x-r)+' '+y+'Q'+x+' '+y+' '+x+' '+(y-r)+'Z'; }
// Éléments qui bougent AVEC le portrait (anneau de source, voile rouge, sourcils…)
function __eaBodySvg(hero, k){
  const g1 = EMOTE_GEM[hero && hero.class] || EMOTE_GEM.Neutre;
  const g2 = hero && hero.classSecondary && hero.classSecondary !== hero.class ? (EMOTE_GEM[hero.classSecondary] || null) : null;
  let o = `<circle cx="60" cy="60" r="49" fill="none" stroke="${g1}" stroke-width="5"/>`;
  if(g2) o += `<path d="M60 11a49 49 0 0 1 0 98" fill="none" stroke="${g2}" stroke-width="5"/>`;
  if(k==='oups') o += '<circle class="dim" cx="60" cy="60" r="47" fill="#0b0a14"/>';
  if(k==='colere') o += '<circle class="flush" cx="60" cy="60" r="47" fill="#ff2d2d"/><path d="M33 40l22 10M87 40L65 50" stroke="#2a0606" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M33 40l22 10M87 40L65 50" stroke="#ff8a8a" stroke-width="2.5" stroke-linecap="round" fill="none"/>';
  if(k==='aie') o += '<circle class="flash" cx="60" cy="60" r="47" fill="#fff"/>';
  if(k==='toutca') o += '<defs><clipPath id="ea-lidclip"><circle cx="60" cy="60" r="47"/></clipPath></defs><g clip-path="url(#ea-lidclip)"><rect class="lid" x="0" y="0" width="120" height="46" fill="#0b0a14" opacity=".62"/></g>';
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${o}</svg>`;
}
function __eaBurst(cx,cy,R,r,n){ let d=''; for(let i=0;i<n*2;i++){ const a=Math.PI*i/n-Math.PI/2, rr=i%2?r:R; d+=(i?'L':'M')+(cx+rr*Math.cos(a)).toFixed(1)+' '+(cy+rr*Math.sin(a)).toFixed(1); } return d+'Z'; }
// Bandeau de texte (onomatopée / petit message) sous le portrait
function __eaBanner(text){
  const w = Math.min(128, 30 + text.length * 9), x = 60 - w/2, fs = text.length > 9 ? 14 : 17;
  return `<g class="banner"><rect x="${x.toFixed(1)}" y="96" width="${w.toFixed(1)}" height="22" rx="8" fill="#14101f" stroke="#ffd54a" stroke-width="2.5"/><text x="60" y="${fs>14?112.5:111}" text-anchor="middle" font-family="Cinzel,Georgia,serif" font-weight="700" font-size="${fs}" fill="#ffd54a">${escapeHtmlBoard(text)}</text></g>`;
}
// Éléments qui restent en place autour du portrait (vagues, étincelles, goutte, vapeur, couronne…)
function __eaFxSvg(hero, k){
  const gem = EMOTE_GEM[hero && hero.class] || EMOTE_GEM.Neutre;
  let o = '';
  if(k==='salut') o = `<g transform="translate(101 54)"><g class="hw"><rect x="-6" y="-1" width="12" height="9" rx="2" fill="${gem}" stroke="#14101f" stroke-width="1.5"/><g fill="#ffd2a1" stroke="#7a4d2a" stroke-width="1.5" stroke-linejoin="round"><rect x="-17" y="-14" width="9" height="5.5" rx="2.7" transform="rotate(-35 -12 -11)"/><rect x="-11" y="-30" width="5" height="16" rx="2.5"/><rect x="-5.5" y="-34" width="5" height="20" rx="2.5"/><rect x="0" y="-33" width="5" height="19" rx="2.5"/><rect x="5.5" y="-29" width="5" height="15" rx="2.5"/><rect x="-11" y="-17" width="22" height="19" rx="6"/></g></g></g>`;
  else if(k==='bravo') o = [[18,24,9,'#ffe27a'],[104,30,8,'#fff3c2'],[98,100,7,'#ffe27a'],[20,92,6,'#fff3c2']].map((a,i)=>`<path class="sp s${i+1} ab" d="${__eaStar(a[0],a[1],a[2])}" fill="${a[3]}"/>`).join('');
  else if(k==='oups') o = '<path class="sweat" d="M94 30q-7 10-7 15a7 7 0 0 0 14 0q0-5-7-15Z" fill="#8fd3ff" stroke="#e8f7ff" stroke-width="1.5"/>';
  else if(k==='colere') o = '<circle class="st t1 ab" cx="22" cy="22" r="7" fill="#e9e6f5"/><circle class="st t2 ab" cx="98" cy="20" r="8" fill="#e9e6f5"/><circle class="st t3 ab" cx="60" cy="8" r="6" fill="#e9e6f5"/>';
  else if(k==='reflechit') o = [88,100,112].map((x,i)=>`<circle class="dt d${i+1}" cx="${x}" cy="22" r="4" fill="${gem}"/>`).join('');
  else if(k==='gg') o = '<g class="crown"><path d="M42 20 44 4 52 12 60 0 68 12 76 4 78 20Z" fill="#ffd54a" stroke="#7a4d00" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="1" r="2.6" fill="#ff6a72"/></g>';
  else if(k==='joues') o = '<g class="clock"><circle cx="98" cy="26" r="12" fill="#14101f" stroke="#e9e6f5" stroke-width="2.5"/><path d="M98 26V19" stroke="#e9e6f5" stroke-width="2.5" stroke-linecap="round"/><path class="hand" d="M98 26h6" stroke="#ffd54a" stroke-width="2.5" stroke-linecap="round"/></g>';
  else if(k==='aie') o = `<path class="burst ab" d="${__eaBurst(22,28,17,8,8)}" fill="#ff5d4a" stroke="#fff2a8" stroke-width="2.5" stroke-linejoin="round"/><path class="sp s2 ab" d="${__eaStar(104,34,7)}" fill="#fff3c2"/><path class="sp s3 ab" d="${__eaStar(100,88,6)}" fill="#ffe27a"/>`;
  else if(k==='toutca') o = [88,100,112].map((x,i)=>`<circle class="dt d${i+1}" cx="${x}" cy="22" r="4" fill="#9a97ad"/>`).join('');
  const say = (EMOTE_ANIMS.find(e=>e.key===k)||{}).say;
  if(say) o += __eaBanner(say);
  return `<svg class="ea-fx" viewBox="-6 -6 132 132" xmlns="http://www.w3.org/2000/svg">${o}</svg>`;
}
function animEmoteHtml(hero, k){
  hero = hero || {};
  const pic = hero.image
    ? `style="background-image:url('${String(hero.image).replace(/['"()\\]/g,'')}');background-position:${Number(hero.imagePosX ?? 50)}% ${Number(hero.imagePosY ?? 50)}%;background-size:${(hero.imageZoom ?? 100) > 100 ? Number(hero.imageZoom) + '%' : 'cover'}"`
    : '';
  const initial = hero.image ? '' : escapeHtmlBoard(((hero.name || '?')[0]) || '?');
  return `<div class="ea-stage ea-${k}"><div class="ea-body"><div class="ea-pic" ${pic}>${initial}</div>${__eaBodySvg(hero, k)}</div>${__eaFxSvg(hero, k)}</div>`;
}
const EMOTE_ANIM_KEYS = EMOTE_ANIMS.map(e=>e.key);
function showAnimEmote(senderKey, anim){
  if(!EMOTE_ANIM_KEYS.includes(anim)) return;
  const hero = S && S[senderKey] && S[senderKey].hero;
  const isMine = senderKey===MY_KEY;
  const anchor = document.getElementById(isMine ? 'hero-frame-p1' : 'hero-frame-p2');
  const bubble = document.createElement('div');
  bubble.className = 'emote-bubble emote-anim';
  if(anchor){
    const rect = anchor.getBoundingClientRect();
    bubble.style.left = (rect.left + rect.width/2 - 66) + 'px';
    bubble.style.top = isMine ? (rect.top - 140) + 'px' : (rect.bottom + 10) + 'px';
  } else {
    bubble.style.left = '50%'; bubble.style.top = '50%';
    bubble.style.transform = 'translate(-50%,-50%)';
  }
  bubble.innerHTML = animEmoteHtml(hero, anim);
  document.body.appendChild(bubble);
  setTimeout(()=>bubble.remove(), 2700);
}
async function uiSendAnimEmote(anim){
  const res = await gsSendAnimEmote(anim);
  if(res && res.error === 'too-fast') return;
  if(res && res.error){ console.error('Émote → ' + res.error); return; }
  __emotesSentThisMatch++;
  try{ await sb.rpc('progress_achievement_peak', { p_condition_type: 'emotes_single_match_max', p_value: __emotesSentThisMatch }); }catch(e){ /* un succès raté ne doit jamais gêner la partie */ }
}
// Succès secret "Trop expressif" — émotes envoyées sur CETTE partie, comptées
// côté client (la partie dure le temps de cette page). Le mécanisme « pic »
// côté serveur (progress_achievement_peak) ne garde que le record : pas besoin
// de remise à zéro explicite, une nouvelle page = un nouveau compteur.
let __emotesSentThisMatch = 0;
async function uiSendEmote(emoteIndex){
  // Seul le numéro part au serveur : c'est lui qui retrouve l'image et détermine le camp de l'émetteur.
  const res = await gsSendEmote(emoteIndex);
  if(res && res.error === 'too-fast') return; // anti-spam serveur : on ignore silencieusement
  if(res && res.error){ console.error('Émote → ' + res.error); alert("L'émote n'a pas pu être envoyée : " + res.error); return; }
  __emotesSentThisMatch++;
  try{ await sb.rpc('progress_achievement_peak', { p_condition_type: 'emotes_single_match_max', p_value: __emotesSentThisMatch }); }catch(e){ /* un succès raté ne doit jamais gêner la partie */ }
}
// Reçue via le canal de diffusion de la partie (broadcast, event 'emote')
// — le payload transporte directement l'image, l'info-bulle et le camp de
// l'émetteur, plus besoin de passer par la base de données.
function onEmoteMessage(payload){
  if(!payload) return;
  const senderKey = payload.senderKey === 'p1' || payload.senderKey === 'p2' ? payload.senderKey : null;
  if(senderKey && payload.anim){ showAnimEmote(senderKey, payload.anim); return; } // émote animée (portrait du héros)
  // Défense en profondeur : même si un message falsifié arrivait, on n'affiche QUE une image
  // faisant partie des émotes réelles du héros de l'émetteur (jamais une URL arbitraire).
  const senderEmotes = (senderKey && S && S[senderKey] && S[senderKey].hero && S[senderKey].hero.emotes) || [];
  const known = senderEmotes.find(e=>e && e.image === payload.image);
  if(!senderKey || !known) return;
  payload = { ...payload, label: known.label || '' };
  const isMine = senderKey===MY_KEY;
  const anchorId = isMine ? 'hero-frame-p1' : 'hero-frame-p2';
  const anchor = document.getElementById(anchorId);
  console.log('Émote reçue', {senderKey, MY_KEY, OPP_KEY, anchorId, anchorFound: !!anchor});
  const bubble = document.createElement('div');
  bubble.className = 'emote-bubble';
  if(anchor){
    const rect = anchor.getBoundingClientRect();
    bubble.style.left = (rect.left + rect.width/2 - 57) + 'px';
    // Notre propre cadre est en bas de l'écran : la bulle flotte au-dessus.
    // Le cadre adverse est en haut : la bulle flotte en dessous. Les deux
    // se rapprochent donc du centre du plateau, plutôt que de toujours
    // remonter (ce qui, pour le cadre adverse déjà en haut, la poussait
    // hors de l'écran ou la rendait à peine visible).
    bubble.style.top = isMine ? (rect.top - 100) + 'px' : (rect.bottom + 20) + 'px';
  } else {
    // Repli de diagnostic : si le cadre n'est pas trouvé, on affiche quand
    // même la bulle, bien visible au centre de l'écran, pour savoir si le
    // souci est la réception (rien n'apparaît jamais) ou le positionnement
    // (la bulle existe mais était invisible/mal placée).
    console.warn('Cadre de héros introuvable (' + anchorId + ') — affichage de secours au centre.');
    bubble.style.left = '50%';
    bubble.style.top = '50%';
    bubble.style.transform = 'translate(-50%,-50%)';
  }
  bubble.innerHTML = `<img src="${escapeHtmlBoard(payload.image||'')}" title="${escapeHtmlBoard(payload.label||'')}">`;
  document.body.appendChild(bubble);
  setTimeout(()=>bubble.remove(), 2700);
}
// ---------------- Chat de la partie ----------------
// Joueurs et spectateurs écrivent dans le même fil. Les messages passent par le canal temps réel
// de la session (comme les émotes) : rien n'est enregistré, et un nouvel arrivant ne voit que
// les messages envoyés après son arrivée. Le texte n'est jamais interprété comme du HTML.
const CHAT_MAX_MESSAGES = 100, CHAT_MIN_GAP_MS = 1500;
let CHAT_UNREAD = 0, CHAT_LAST_SENT = 0, CHAT_MY_NAME = null;
function chatPanelOpen(){ const p = document.getElementById('chat-panel'); return !!(p && p.classList.contains('show')); }
function toggleChatPanel(){
  const panel = document.getElementById('chat-panel');
  panel.classList.toggle('show');
  if(panel.classList.contains('show')){
    CHAT_UNREAD = 0; updateChatBadge();
    const list = document.getElementById('chat-list'); if(list) list.scrollTop = list.scrollHeight;
    const inp = document.getElementById('chat-input'); if(inp) inp.focus();
  }
}
function updateChatBadge(){
  const b = document.getElementById('chat-unread-badge'); if(!b) return;
  b.style.display = CHAT_UNREAD>0 ? 'block' : 'none';
  b.textContent = CHAT_UNREAD>9 ? '9+' : String(CHAT_UNREAD);
}
async function chatMyName(){
  if(CHAT_MY_NAME) return CHAT_MY_NAME;
  try{
    const user = await scGetCurrentUser();
    if(user){
      const { data } = await sb.from('profiles').select('username').eq('id', user.id).maybeSingle();
      CHAT_MY_NAME = (data && data.username) || 'Joueur';
    }
  }catch(e){ /* le chat reste utilisable avec un nom par défaut */ }
  return CHAT_MY_NAME || 'Joueur';
}
async function uiSubmitChat(ev){
  if(ev && ev.preventDefault) ev.preventDefault();
  const inp = document.getElementById('chat-input');
  const text = (inp.value||'').trim();
  if(!text) return false;
  const now = Date.now();
  if(now - CHAT_LAST_SENT < CHAT_MIN_GAP_MS) return false; // anti-spam : un message toutes les 1,5 s
  CHAT_LAST_SENT = now;
  inp.value = '';
  const res = await gsSendChat(await chatMyName(), text);
  if(res && res.error && res.error!=='empty') appendChatMessage({ role:'spectator', name:'Système', text:"Le message n'a pas pu être envoyé ("+res.error+")." }, true);
  return false;
}
function onGameChatMessage(payload){
  if(!payload || typeof payload.text!=='string') return;
  appendChatMessage(payload, false);
}
function appendChatMessage(p, isSystem){
  const list = document.getElementById('chat-list'); if(!list) return;
  const empty = list.querySelector('.chat-empty'); if(empty) empty.remove();
  const role = (p.role==='p1' || p.role==='p2') ? p.role : 'spectator';
  const mine = !isSystem && role===MY_KEY && GS_ROLE!=='spectator';
  const el = document.createElement('div');
  el.className = 'chat-msg ' + (mine ? 'mine' : (role==='spectator' ? 'spec' : 'opp'));
  const name = document.createElement('span'); name.className = 'chat-name'; name.textContent = String(p.name||'Joueur').slice(0,24);
  el.appendChild(name);
  if(role==='spectator'){ const tag = document.createElement('span'); tag.className = 'chat-tag'; tag.textContent = isSystem ? 'système' : 'spectateur'; el.appendChild(tag); }
  el.appendChild(document.createTextNode(' : ' + String(p.text).slice(0,200)));
  const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 24;
  list.appendChild(el);
  while(list.children.length > CHAT_MAX_MESSAGES) list.removeChild(list.firstChild);
  if(atBottom || mine) list.scrollTop = list.scrollHeight;
  if(!mine && !isSystem && !chatPanelOpen()){ CHAT_UNREAD++; updateChatBadge(); }
}
function escapeHtmlBoard(s){
  return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---------------- Défausse ----------------

function openDiscardModal(key){
  document.getElementById('discard-modal-title').textContent = 'Défausse';
  const p = S[key];
  const box = document.getElementById('discard-modal-list');
  box.innerHTML = '';
  if((p.discard||[]).length===0){
    box.innerHTML = '<p style="font-size:12px;color:#c8beb0;">Défausse vide.</p>';
  } else {
    p.discard.forEach(c=>{
      const wrap = document.createElement('div');
      wrap.style.display = 'inline-block';
      wrap.style.margin = '4px';
      wrap.appendChild(cardEl(c));
      box.appendChild(wrap);
    });
  }
  document.getElementById('discard-modal').classList.add('show');
}
// Exil : cartes hors de la partie (non ressuscitables), parfois temporairement.
function openExileModal(key){
  const p = S[key];
  const list = Array.isArray(p.exile) ? p.exile : [];
  if(list.length===0) return;
  document.getElementById('discard-modal-title').textContent = 'Exil';
  const box = document.getElementById('discard-modal-list');
  box.innerHTML = '';
  list.forEach(c=>{
    const wrap = document.createElement('div');
    wrap.style.display = 'inline-block';
    wrap.style.margin = '4px';
    wrap.appendChild(cardEl(c));
    box.appendChild(wrap);
  });
  document.getElementById('discard-modal').classList.add('show');
}
// Dévotion (Fidèle) : une ligne par dieu.
function openDevotionModal(key){
  const devo = (S[key].__g && S[key].__g.devotion) || {};
  // Dévotion : une seule réserve partagée par tous les dieux (nombre de Fidèles arrivés en jeu, jamais consommée)
  const total = Object.values(devo).reduce((a,v)=>a+(v||0),0);
  if(!total) return;
  const bless = (S[key].__godBlessings || []).length;
  document.getElementById('discard-modal-title').textContent = 'Dévotion';
  const box = document.getElementById('discard-modal-list');
  box.innerHTML = '';
  [`Dévotion : ${total}`, 'Nombre de Fidèles arrivés en jeu de ce côté pendant la partie (partagée par tous les dieux, jamais consommée).', bless ? `Bénédictions reçues par les dieux de la Dévotion : ${bless}` : ''].filter(Boolean).forEach((t)=>{
    const line = document.createElement('div');
    line.className = 'zone-list-line';
    line.textContent = t;
    box.appendChild(line);
  });
  document.getElementById('discard-modal').classList.add('show');
}
// Bonus permanents appliqués aux cartes de la pioche (une ligne de texte chacun).
function openDeckBuffsModal(key){
  const p = S[key];
  const list = Array.isArray(p.deckBuffs) ? p.deckBuffs : [];
  if(list.length===0) return;
  document.getElementById('discard-modal-title').textContent = 'Bonus permanents de la pioche';
  const box = document.getElementById('discard-modal-list');
  box.innerHTML = list.map(b=>`<div class="zone-list-line">${escapeHtmlBoard(typeof b==='string' ? b : (b.text||b.label||b.name||''))}</div>`).join('');
  document.getElementById('discard-modal').classList.add('show');
}
function closeDiscardModal(){
  document.getElementById('discard-modal').classList.remove('show');
}

