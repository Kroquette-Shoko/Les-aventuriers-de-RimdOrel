// ============================================================
// Plateau de jeu — 03-connexion-et-annonce-de-match
// Connexion/session, gel du rendu, écran d annonce de match, préchargement des images, mise à jour de l état, tour de l IA
// (Chargé dans l ordre depuis spellcraft-server-board.html : tout est partagé, comme avant.)
// ============================================================
// ---------------- Connexion / session ----------------

function afterConnected(code){
  document.getElementById('app-outer').classList.add('show');
  MY_KEY = GS_ROLE === 'p2' ? 'p2' : 'p1';
  OPP_KEY = MY_KEY === 'p1' ? 'p2' : 'p1';
  gsConnect(onStateUpdate, onEmoteMessage, onGameChatMessage);
  debugLog('Connecté (rôle : ' + GS_ROLE + ')', 'log-ok');
  gsFetchState().then(res=>{
    if(res.error){ debugLog('État initial → ' + res.error, 'log-error'); return; }
    onStateUpdate(res.state);
  });

  // Filet de sécurité : la diffusion temps réel devrait suffire à elle
  // seule, mais si un message venait à être manqué (déconnexion brève,
  // souci de livraison...), l'écran resterait figé sur un état périmé —
  // menant à des refus "wrong-phase" alors que tout semble normal à
  // l'écran. Une resynchronisation silencieuse toutes les 6 secondes
  // garantit qu'on ne dérive jamais durablement de la vérité serveur.
  setInterval(()=>{
    if(ACTION_IN_FLIGHT || !S || S.gameOver) return;
    gsFetchState().then(res=>{
      if(!res || res.error || !res.state) return;
      onStateUpdate(res.state);
    });
  }, 6000);

  // Minuteur de tour retiré pour l'instant (sondage toutes les 3s trop
  // lourd pour le serveur) — la logique reste construite côté serveur,
  // simplement jamais sollicitée, pour pouvoir la réactiver facilement.
}

let __pendingStateWhileAnimating = null;

// État reçu juste AVANT l'état courant S (null au tout premier état). Pendant
// une animation de combat, c'est exactement ce que le plateau affiche encore
// (voir "gel du rendu" plus bas) — utile pour comparer avant/après (diff de
// stats ou de mots-clés, estimation de dégâts de repli...). Mis à jour dans
// onStateUpdate uniquement, au moment où S est réaffecté.
let PREV_S = null;

// ---------------- Gel du rendu du plateau pendant une animation de combat ----
// Problème : le serveur renvoie l'état FINAL de l'action ; render() le dessinait
// tout de suite, donc au moment où l'animation de frappe jouait, les PV/ATK
// étaient déjà à leur valeur finale et les créatures mortes déjà disparues.
// Solution retenue (option A) : tant que des animations de combat sont dans la
// file, on NE reconstruit PAS le plateau — le DOM reste celui de l'ancien état
// (stats d'avant, créatures mortes encore visibles). S est quand même mis à
// jour tout de suite. À la fin de la file (ou au timeout de sécurité) on
// rend l'état final d'un coup. Pourquoi A plutôt que "afficher les stats
// d'avant sur le nouveau rendu" (B) : renderLane reconstruit tout le DOM, B
// aurait demandé de ré-insérer les cartes mortes et de réécrire les stats
// après chaque rendu, beaucoup plus invasif ; A ne touche qu'à render().
let __boardRenderFrozen = false;
let __boardRenderDirty = false;
function freezeBoardRender(){ __boardRenderFrozen = true; __boardRenderDirty = false; }
function unfreezeBoardRender(){
  if(!__boardRenderFrozen) return;
  __boardRenderFrozen = false;
  __boardRenderDirty = false;
  render(); // S est déjà l'état final : on l'affiche maintenant
}
// Une entrée « X bloque la créature Y avec Z » (et elle seule) = combat bloqué. Ne PAS se
// contenter de « 2 identifiants » : les dégâts au héros de deux attaquants non bloqués ont
// aussi 2 identifiants et se faisaient passer pour un blocage (les deux créatures
// se frappaient au lieu d'attaquer le héros).
function isBlockLogEntry(entry){
  return !!(entry && entry.raw && entry.highlightIds && entry.highlightIds.length===2 && /bloque la cr[ée]ature/.test(entry.raw));
}
// Cette entrée de journal va-t-elle jouer une animation de combat qui doit se
// dérouler sur l'ANCIEN plateau ? (même tri que dans renderGameLog)
function entryAnimatesBoardCombat(entry){
  if(!entry) return false;
  if(combatInstant()) return false; // mode instantané : rien à animer, donc pas de gel
  if(entry.raw){
    if(entry.raw.includes('attaque avec')) return false; // simple son
    if(isBlockLogEntry(entry)) return true; // combat bloqué
    return entry.raw.includes('perdu') && entry.raw.includes('point') && (entry.highlightIds||[]).length>0; // dégâts au héros
  }
  if(entry.deadInstId) return true;
  return (entry.effects||[]).some(eff=>/meurt au combat|est détruite|^détruit "|^sacrifie "/i.test(eff.text||''));
}

// ===== Écran d'annonce de match =====
let __matchAnnounceActive = false;
let __matchAnnounceDone = false;

// Catalogue : UNE seule lecture par chargement du plateau. La promesse est
// partagée entre l'écran d'annonce (cadrage des héros / avatars), les aperçus
// au survol du journal et l'animation de révélation 3D. Lancé dès initFromUrl
// (donc en parallèle de la connexion) ; une réponse vide ou en erreur n'est
// pas mémorisée, pour qu'un appel ultérieur puisse retenter.
let __catalogPromise = null;
function getCatalogOnce(){
  if(!__catalogPromise){
    __catalogPromise = Promise.resolve().then(()=>loadAllCardsAcrossSets()).then(cards=>{
      const list = Array.isArray(cards) ? cards : [];
      if(!list.length){ __catalogPromise = null; return list; }
      const lookup = {};
      list.forEach(c=>{ lookup[c.id] = c; });
      JOURNAL_CARD_LOOKUP = lookup;
      return list;
    }).catch(()=>{ __catalogPromise = null; return []; });
  }
  return __catalogPromise;
}

// Durées de l'écran d'annonce (ms) : fondu d'entrée + maintien + fondu de
// sortie = 6 s au total (avant : 8 s = 300 + 7400 + 300 ; encore avant 12 s).
// Les trois temps sont réduits dans le même rapport 3/4 (225 + 5550 + 225).
// Un clic n'importe où passe l'écran (fondu de sortie court, SKIP_FADE_MS).
// Fonction pure (testée sous Node).
// <match-announce-timings>
const MATCH_ANNOUNCE_TOTAL_MS = 6000;
const MATCH_ANNOUNCE_FADE_MS = 225;
const MATCH_ANNOUNCE_SKIP_FADE_MS = 200;
// Délai maximal pendant lequel on attend le catalogue et les profils avant
// d'afficher l'écran (au-delà, il s'affiche avec les infos déjà connues et
// se complète dès que les données arrivent).
const MATCH_ANNOUNCE_DATA_WAIT_MS = 600;
function matchAnnounceTimings(total, fade){
  total = total==null ? MATCH_ANNOUNCE_TOTAL_MS : total;
  fade = fade==null ? MATCH_ANNOUNCE_FADE_MS : fade;
  const hold = Math.max(0, total - 2*fade);
  return { fadeIn: fade, hold, fadeOut: fade, total: fade + hold + fade };
}
// </match-announce-timings>
const MATCH_ANNOUNCE_CLASS_ACCENT = {
  'Aube':'#D4AF37', 'Crépuscule':'hsl(calc(var(--th, 252) + 11.6) calc(var(--ts-n, 1) * 42%) 39.2%)', 'Volonté':'#8B2E3C', 'Prima':'#1F6F54', 'Arcane':'#2C4A7C', 'Neutre':'#6b6b6b'
};
function matchAnnounceEscapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Construit les infos d'affichage d'un camp à partir de l'état de jeu (hero,
// dos de carte, nom de deck — déjà connus côté client) et, si ce n'est pas
// l'IA, du profil du joueur (titre équipé, badges mis en avant, avatar,
// pseudo) — récupéré via gsGetProfile (voir fetchMatchAnnounceProfile),
// comme sur la page de profil. Fonction synchrone : le profil (ou null) et le
// catalogue (ou null) sont fournis par l'appelant, ce qui permet de lancer
// leurs chargements en parallèle et de construire une version de base sans eux.
function buildMatchAnnounceSide(playerState, heroCollection, side, profile){
  const accent = MATCH_ANNOUNCE_CLASS_ACCENT[playerState?.hero?.class] || MATCH_ANNOUNCE_CLASS_ACCENT.Neutre;
  // Cadrage dédié à l'écran d'annonce, réglé par héros ET par côté dans l'éditeur
  // de cartes (onglet "Cadrage héros — écran d'annonce") — indépendant du cadrage
  // utilisé sur la carte elle-même. Le côté droit utilise ses propres champs et
  // s'affiche en miroir pour que le héros fasse face au centre de l'écran.
  const isRight = side === 'right';
  let heroImageX = 50, heroImageY = 50, heroImageZoom = 100;
  // Par défaut : côté gauche normal, côté droit en miroir (pour faire face
  // au centre). Chaque héros peut cependant forcer son propre réglage par
  // côté (champs imageMirrorAnnounce / imageMirrorAnnounceRight, réglables
  // dans l'éditeur de cartes) — utile par exemple quand l'illustration
  // d'origine du héros est déjà orientée dans un sens qui rend le miroir
  // par défaut incorrect pour l'un des deux côtés, voire les deux.
  let heroImageMirror = isRight;
  if(playerState?.hero?.name && heroCollection){
    const heroCard = heroCollection.find(c=>c.name===playerState.hero.name && c.type==='Héros');
    if(heroCard){
      heroImageX = (isRight ? heroCard.imagePosXAnnounceRight : heroCard.imagePosXAnnounce) ?? 50;
      heroImageY = (isRight ? heroCard.imagePosYAnnounceRight : heroCard.imagePosYAnnounce) ?? 50;
      heroImageZoom = (isRight ? heroCard.imageZoomAnnounceRight : heroCard.imageZoomAnnounce) ?? 100;
      const mirrorField = isRight ? 'imageMirrorAnnounceRight' : 'imageMirrorAnnounce';
      if(heroCard[mirrorField] !== undefined) heroImageMirror = !!heroCard[mirrorField];
    }
  }
  const info = {
    accent,
    heroImage: playerState?.hero?.image || null,
    heroImageX, heroImageY, heroImageZoom, heroImageMirror,
    cardBackUrl: playerState?.cardBackUrl || null,
    deckName: playerState?.deckName || null,
    isAI: !!playerState?.isAI,
    userId: (!playerState?.isAI && playerState?.userId) ? String(playerState.userId) : null,
    name: playerState?.isAI ? 'Intelligence artificielle' : 'Joueur',
    title: null,
    avatarUrl: null,
    badges: []
  };
  if(playerState?.isAI || !playerState?.userId) return info;
  try{
    if(profile && !profile.error){
      info.name = profile.username || info.name;
      info.title = profile.equippedTitle || null;
      info.badges = (profile.featuredAchievements || []).slice(0,5);
      if(profile.avatarHeroName && heroCollection){
        const hero = heroCollection.find(c=>c.name===profile.avatarHeroName && c.type==='Héros');
        if(hero && hero.image) info.avatarUrl = hero.image;
      }
      if(!info.avatarUrl && profile.discordAvatarUrl) info.avatarUrl = profile.discordAvatarUrl;
    }
  }catch(e){ /* un profil indisponible ne doit jamais bloquer le lancement de la partie */ }
  return info;
}
// Profil d'un camp pour l'annonce (null pour l'IA / en cas d'échec). Ne rejette jamais.
function fetchMatchAnnounceProfile(playerState){
  if(!playerState || playerState.isAI || !playerState.userId) return Promise.resolve(null);
  return Promise.resolve().then(()=>gsGetProfile(playerState.userId)).catch(()=>null);
}

// Nom du joueur : lien vers sa page de profil (nouvel onglet, lecture seule :
// spellcraft-profile.html?uid=… affiche le profil d'un autre joueur sans le
// bouton d'édition). L'IA n'a pas de profil : texte simple avec info-bulle.
// Pure (testée sous Node).
function matchAnnounceProfileUrl(userId){
  return userId ? 'spellcraft-profile.html?uid=' + encodeURIComponent(userId) : null;
}
function matchAnnounceNameHtml(info){
  const name = matchAnnounceEscapeHtml(info.name);
  const url = matchAnnounceProfileUrl(info.userId);
  if(url) return `<div class="ma-name"><a class="ma-name-link" href="${url}" target="_blank" rel="noopener" title="Voir le profil de ${name}">${name}</a></div>`;
  if(info.isAI) return `<div class="ma-name" title="Adversaire IA">${name}</div>`;
  return `<div class="ma-name">${name}</div>`;
}

function matchAnnounceSideHtml(side, info){
  const badgesHtml = Array.from({length:5}).map((_,i)=>{
    const b = info.badges[i];
    const titleAttr = b && b.name ? ` title="${matchAnnounceEscapeHtml(b.name)}"` : '';
    return `<div class="ma-badge" ${titleAttr} style="${b && b.imageUrl ? `background-image:url('${b.imageUrl.replace(/'/g,'')}')` : `border:2px dashed rgba(241,230,200,.3);background-color:transparent;`}"></div>`;
  }).join('');
  const deckNameHtml = info.deckName ? `<div class="ma-deckname">${matchAnnounceEscapeHtml(info.deckName)}</div>` : '';
  const titleHtml = info.title ? `<div class="ma-title" style="color:${info.accent};">« ${matchAnnounceEscapeHtml(info.title)} »</div>` : '';
  return `
    <div class="ma-block ma-block-${side}">
      <div class="ma-cardback" style="border:2px solid ${info.accent};background-color:#1a1510;${info.cardBackUrl ? `background-image:url('${info.cardBackUrl.replace(/'/g,'')}')` : `background:linear-gradient(160deg, ${info.accent}55, #1a1510 70%);`}"></div>
      ${matchAnnounceNameHtml(info)}
      ${deckNameHtml}
      <div class="ma-avatar" style="border:3px solid ${info.accent};${info.avatarUrl ? `background-image:url('${info.avatarUrl.replace(/'/g,'')}')` : `background:radial-gradient(circle at 35% 30%, ${info.accent}, #1a1510);`}"></div>
      ${titleHtml}
      <div class="ma-badges">${badgesHtml}</div>
    </div>`;
}

function matchAnnounceHtml(myInfo, oppInfo){
  return `
      <div class="ma-side ma-side-left" style="background:linear-gradient(145deg, ${myInfo.accent} 0%, #241a10 55%, #120d08 100%);">
        ${myInfo.heroImage ? `<div class="ma-side-bg" style="background-image:url('${myInfo.heroImage.replace(/'/g,'')}');background-size:${myInfo.heroImageZoom>100?myInfo.heroImageZoom+'%':'cover'};background-position:${myInfo.heroImageX}% ${myInfo.heroImageY}%;${myInfo.heroImageMirror?'transform:scaleX(-1);':''}"></div>` : ''}
      </div>
      <div class="ma-side ma-side-right" style="background:linear-gradient(215deg, ${oppInfo.accent} 0%, #241a10 55%, #120d08 100%);">
        ${oppInfo.heroImage ? `<div class="ma-side-bg" style="background-image:url('${oppInfo.heroImage.replace(/'/g,'')}');background-size:${oppInfo.heroImageZoom>100?oppInfo.heroImageZoom+'%':'cover'};background-position:${oppInfo.heroImageX}% ${oppInfo.heroImageY}%;${oppInfo.heroImageMirror?'transform:scaleX(-1);':''}"></div>` : ''}
      </div>
      <div class="ma-side ma-vignette-left"></div>
      <div class="ma-side ma-vignette-right"></div>
      <div class="ma-side ma-divider-glow"></div>
      <div class="ma-vs-badge" style="border:3px solid #D4AF37;"><span style="color:#D4AF37;">VS</span></div>
      ${matchAnnounceSideHtml('left', myInfo)}
      ${matchAnnounceSideHtml('right', oppInfo)}
      <div class="ma-skip-hint">Cliquez n'importe où pour passer</div>
    `;
}

async function playMatchAnnouncement(state){
  const el = document.getElementById('match-announce-overlay');
  const T = matchAnnounceTimings();
  const myState = state[MY_KEY], oppState = state[OPP_KEY];
  // Catalogue (promesse partagée, déjà en cours depuis initFromUrl) et profils
  // des deux joueurs : lancés ensemble, en parallèle.
  const dataP = Promise.all([
    getCatalogOnce(),
    fetchMatchAnnounceProfile(myState),
    fetchMatchAnnounceProfile(oppState)
  ]);
  const buildAll = (collection, pMy, pOpp)=>[
    buildMatchAnnounceSide(myState, collection, 'left', pMy),
    buildMatchAnnounceSide(oppState, collection, 'right', pOpp)
  ];
  // On attend les données au plus MATCH_ANNOUNCE_DATA_WAIT_MS : si elles sont
  // là, l'écran s'affiche complet d'emblée ; sinon il s'affiche tout de suite
  // avec les infos de l'état (héros, deck) et se complète à l'arrivée des
  // données — les chargements ne retardent plus l'annonce.
  let waitTimer = null;
  const early = await Promise.race([
    dataP,
    new Promise(r=>{ waitTimer = setTimeout(()=>r(null), MATCH_ANNOUNCE_DATA_WAIT_MS); })
  ]);
  clearTimeout(waitTimer);
  let infos = early ? buildAll(early[0], early[1], early[2]) : buildAll(null, null, null);
  let running = true;
  el.style.transitionDuration = T.fadeIn + 'ms';
  el.innerHTML = matchAnnounceHtml(infos[0], infos[1]);
  el.classList.add('show');
  if(!early){
    dataP.then(([collection, pMy, pOpp])=>{
      if(!running) return;
      const full = buildAll(collection, pMy, pOpp);
      el.innerHTML = matchAnnounceHtml(full[0], full[1]);
    }).catch(()=>{});
  }
  return new Promise(resolve=>{
    // fondu d'entrée, puis maintien, puis fondu de sortie — 6 s au total
    // (compté à partir de l'affichage de l'écran, pas du chargement). Un clic
    // n'importe où (hors lien vers un profil) saute directement au fondu de
    // sortie court. `ending` garantit qu'on ne sort qu'UNE fois : une seule
    // résolution de la promesse (donc une seule suite : mulligan, rendu...),
    // et aucun minuteur ne survit à la fin.
    let ending = false, holdTimer = null, endTimer = null;
    const finish = ()=>{
      clearTimeout(holdTimer); clearTimeout(endTimer);
      running = false;
      el.onclick = null;
      el.classList.remove('show','visible');
      el.innerHTML = '';
      resolve();
    };
    const startFadeOut = (fadeMs)=>{
      if(ending) return;
      ending = true;
      clearTimeout(holdTimer);
      el.style.transitionDuration = fadeMs + 'ms';
      el.classList.remove('visible');
      endTimer = setTimeout(finish, fadeMs);
    };
    el.onclick = (ev)=>{
      // Clic sur le nom d'un joueur : le lien s'ouvre dans un nouvel onglet,
      // l'écran et la partie ne sont pas touchés.
      if(ev.target && ev.target.closest && ev.target.closest('a.ma-name-link')) return;
      startFadeOut(MATCH_ANNOUNCE_SKIP_FADE_MS);
    };
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ if(!ending) el.classList.add('visible'); }); });
    holdTimer = setTimeout(()=>startFadeOut(T.fadeOut), T.fadeIn + T.hold);
  });
}
// Compare l'état mana avant/après pour jouer le bon son de gain — un même
// son pour le mana normal ("plein") ET le mana fragile (comme demandé), un
// son distinct pour le mana "vide" (le maximum augmente sans qu'aucun mana
// utilisable ne soit gagné dans le même mouvement, ex: emptyManaEffect).
function detectAndPlayManaGainSfx(oldS, newS){
  if(!oldS) return; // pas d'état précédent (première connexion) : rien à comparer
  ['p1','p2'].forEach(key=>{
    const before = oldS[key], after = newS[key];
    if(!before || !after) return;
    const deltaNormal = (after.manaNormal||0) - (before.manaNormal||0);
    const deltaFragile = (after.manaFragile||0) - (before.manaFragile||0);
    const deltaMax = (after.manaNormalMax||0) - (before.manaNormalMax||0);
    if(deltaNormal > 0 || deltaFragile > 0){
      playSfx('mana-full');
    } else if(deltaMax > 0){
      playSfx('mana-empty');
    }
  });
}
// Début de MON tour : le tour passe de l'adversaire à moi.
function detectAndPlayTurnStartSfx(oldS, newS){
  if(!oldS || !newS || typeof MY_KEY==='undefined') return;
  if(oldS.active && oldS.active!==MY_KEY && newS.active===MY_KEY) playSfx('turn-start');
}
// Préchargement des images : chaque illustration (main, plateau, défausse, héros, région, reliques, dos
// de cartes, et celles du paquet du joueur envoyées par le serveur) est téléchargée en tâche de fond
// DÈS qu'on la connaît, pour qu'elle soit déjà prête quand la carte est piochée ou posée.
const __preloadedImages = new Set();
const __preloadQueue = [];
let __preloadTimer = null;
function __preloadNext(){
  __preloadTimer = null;
  // 3 images à la fois, pour ne pas concurrencer l'affichage de la partie
  for(let i=0; i<3 && __preloadQueue.length; i++){
    const img = new Image();
    img.decoding = 'async';
    img.src = __preloadQueue.shift();
  }
  if(__preloadQueue.length) __preloadTimer = setTimeout(__preloadNext, 120);
}
function preloadStateImages(state){
  try{
    const urls = [];
    const add = u => { if(typeof u === 'string' && /^https?:\/\//.test(u) && !__preloadedImages.has(u)){ __preloadedImages.add(u); urls.push(u); } };
    ['p1','p2'].forEach(k=>{
      const p = state[k]; if(!p) return;
      add(p.cardBackUrl);
      [p.hero, p.region].forEach(c=>{ if(c) add(c.image); });
      ['hand','board','discard','relics'].forEach(z=>{ (p[z]||[]).forEach(c=>{ if(c && !c.hidden) add(c.image); }); });
      (p.deckImages||[]).forEach(add);
    });
    if(!urls.length) return;
    // Les cartes visibles tout de suite d'abord (elles sont déjà en tête de liste), le paquet ensuite
    __preloadQueue.push(...urls);
    if(!__preloadTimer) __preloadTimer = setTimeout(__preloadNext, 0);
  }catch(e){}
}
function onStateUpdate(state){
  if(!state || !state.p1){
    debugLog("En attente d'un adversaire pour démarrer la partie...", 'log-ok');
    return;
  }
  preloadStateImages(state);
  // Anti-« retour en arrière » : l'état arrive par trois chemins (réponse de
  // l'action, signal temps réel, resynchro toutes les 6 s) et une réponse
  // lancée plus tôt peut arriver APRÈS une plus récente. Le serveur numérote
  // chaque sauvegarde (__rev) : on ignore tout état plus ancien que celui déjà
  // affiché ou déjà mis en attente pendant une animation.
  {
    const rev = (state.__rev|0);
    const known = Math.max((S && S.__rev)|0, (__pendingStateWhileAnimating && __pendingStateWhileAnimating.__rev)|0);
    if(rev < known){ return; }
    // NB : un état de même numéro n'est volontairement PAS ignoré — le message identique qui suit une action sert aussi à relancer
    // le tour de l'IA (onStateUpdate le replanifie quand ACTION_IN_FLIGHT vient de retomber). La main, elle, n'est plus reconstruite
    // si rien n'a changé (voir renderHand).
  }
  // Une animation de combat est en cours (voir queueCombatAnim) : re-rendre
  // maintenant reconstruirait la carte en plein vol et la ferait
  // réapparaître à sa position d'origine, PENDANT que son clone animé
  // continue de se déplacer ailleurs — donnant l'impression trompeuse que
  // la carte s'est dédoublée. On garde donc cet état de côté, appliqué dès
  // que la file d'animation sera vide (voir processCombatAnimQueue).
  if(__combatAnimPlaying){
    __pendingStateWhileAnimating = state;
    return;
  }
  // Son de gain de mana — comparé à l'état précédent plutôt que lu dans le
  // journal, car le gain automatique en début de tour n'y est jamais
  // consigné (voir applyManaGain côté serveur, silencieux). Doit rester
  // AVANT la réaffectation de S ci-dessous.
  detectAndPlayManaGainSfx(S, state);
  detectAndPlayTurnStartSfx(S, state);

  // Instantané des cartes affichées AVANT que render() ne les remplace —
  // voir playCardDeathAnim plus bas, seul moyen d'animer la disparition
  // d'une carte qui vient de mourir (déjà absente du nouvel état).
  __lastBoardSnapshot = snapshotBoardForDeathAnim();

  // vue toujours du point de vue du joueur local : si je suis p2 côté
  // serveur, j'affiche quand même "moi" en bas et "adversaire" en haut,
  // en lisant simplement S[MY_KEY]/S[OPP_KEY] partout dans le rendu.
  PREV_S = S;
  S = state;

  // Écran d'annonce de match : dès que les deux joueurs sont connus pour la
  // première fois, on affiche quelques secondes un écran plein écran avec
  // les infos des deux camps AVANT de laisser apparaître le plateau (et
  // l'éventuel mulligan). Pendant qu'il tourne, S reste à jour mais le
  // rendu normal est suspendu — on rend une dernière fois à la fin, avec
  // l'état le plus récent reçu entre-temps.
  if(!__matchAnnounceDone && !__matchAnnounceActive && state.p2){
    __matchAnnounceActive = true;
    playMatchAnnouncement(state).catch(e=>{
      // Une erreur d'affichage de l'annonce ne doit jamais bloquer la partie.
      debugLog("Annonce de match → " + (e && e.message || e), 'log-error');
      const ov = document.getElementById('match-announce-overlay');
      if(ov){ ov.classList.remove('show','visible'); ov.innerHTML = ''; }
    }).then(()=>{
      __matchAnnounceActive = false;
      __matchAnnounceDone = true;
      finishStateUpdateTail(S);
    });
    return;
  }
  if(__matchAnnounceActive) return; // S est à jour ; le rendu reprendra à la fin de l'annonce

  finishStateUpdateTail(state);
}

// Héros vaincu à jouer pour CET état : { loserKey, slot } ou null. Une seule fois par
// partie, seulement si l'écran de fin n'était pas déjà affiché (rechargement de page
// sur une partie finie = pas d'animation) et si les PV du perdant sont bien à 0.
let __heroDeathPlayed = false;
function heroDeathToPlay(state){
  try{
    if(__heroDeathPlayed || combatInstant() || !window.BFX) return null;
    if(!state || !state.gameOver || !PREV_S || PREV_S.gameOver || !state.winnerKey) return null;
    const loserKey = state.winnerKey==='p1' ? 'p2' : 'p1';
    if(!state[loserKey] || (state[loserKey].hp||0) > 0) return null;
    return { loserKey, slot: loserKey===MY_KEY ? 'p1' : 'p2' };
  } catch(e){ return null; }
}
function queueHeroDeathAnim(d){
  __heroDeathPlayed = true;
  queueCombatAnim(()=>{
    const frame = document.getElementById(`hero-frame-${d.slot}`);
    // le cadre encore affiché est celui d'avant les derniers dégâts : on le remet
    // à jour (PV à 0) juste avant qu'il n'explose
    try{ renderHeroFrame(d.loserKey, d.slot); }catch(e){}
    registerCombatCleanup(()=>{ try{ BFX.clearDeathLayers(); }catch(e){} });
    return BFX.heroDeath(frame, d.loserKey===MY_KEY);
  });
}

function finishStateUpdateTail(state){
  // Si ce lot contient une animation de combat, on garde l'ancien plateau à
  // l'écran jusqu'à la fin de la file (voir "Gel du rendu"). L'aperçu
  // (commit=false) ne marque rien comme vu : renderGameLog s'en charge.
  // Barrière du tour adverse : si l'état reçu est ma phase de blocage et que le
  // lot contient des animations de cartes/capacités, le plateau est gelé aussi
  // (les attaquants désignés ne doivent pas apparaître avant la fin des
  // révélations) ; une étape de fin de file affiche ensuite les cartes jouées,
  // marque une courte pause, puis la libération montre les attaquants.
  const newEntries = getNewGameLogEntries(false);
  // Mort d'un héros : la partie vient de se terminer parce que ses PV sont tombés à 0.
  // On gèle le plateau (le résumé et la musique attendent la fin de la file) et on
  // joue l'explosion du cadre en dernier, après les coups et les chiffres de dégâts.
  const heroDeath = heroDeathToPlay(state);
  if(heroDeath && !__boardRenderFrozen) freezeBoardRender();
  const holdAttackers = !combatInstant() &&
    shouldHoldCombatReveal(state, MY_KEY, OPP_KEY, newEntries.some(entryQueuesCardAnimation));
  // Cartes jouées, sorts, capacités déclenchées : leurs animations (révélation, orbe, flèches) doivent
  // se jouer AVANT que leurs effets (PV, stats, créatures posées ou détruites, défausse...) n'apparaissent.
  // Avant, seuls les combats et les morts gelaient le plateau : tout le reste s'affichait déjà à l'état final.
  const holdForCardAnims = !combatInstant() && newEntries.some(entryQueuesCardAnimation);
  if(!__boardRenderFrozen && (newEntries.some(entryAnimatesBoardCombat) || holdForCardAnims || holdAttackers)){
    freezeBoardRender();
  }
  render(); // sans effet si le plateau est gelé (voir render)
  renderGameLog();
  // Artefact / Édifice détruit : animation à partir de l'instantané pris avant le rendu
  if(!combatInstant()){
    detectDestroyedRelics(PREV_S, state, newEntries).forEach(d=>{
      const snap = __lastBoardSnapshot[d.instId]; // l'instantané est remplacé à la mise à jour suivante : on le garde
      queueCombatAnim(()=>{ if(snap && !__lastBoardSnapshot[d.instId]) __lastBoardSnapshot[d.instId] = snap; return playRelicDestroyAnim(d.instId, d.edifice); });
    });
  }
  if(heroDeath) queueHeroDeathAnim(heroDeath);
  if(holdAttackers && __boardRenderFrozen && (__combatAnimPlaying || __combatAnimQueue.length)){
    queueCombatAnim(()=>{
      renderHeldCombatView();
      return new Promise(resolve=>{ combatTimeout(resolve, cms(COMBAT_PRE_ATTACK_PAUSE_MS)); });
    });
  }
  // Gel demandé mais rien n'est finalement parti dans la file : on affiche.
  if(__boardRenderFrozen && !__combatAnimPlaying && !__combatAnimQueue.length) unfreezeBoardRender();
  maybeAutoFinishBlocking();

  // Diagnostic temporaire : affiche les traces envoyées par le serveur
  // (voir recalculateContinuousEffects côté serveur) pour repérer où une
  // capacité continue s'arrête de fonctionner.
  if(state.__serverLog){
    const already = window.__seenServerLogCount || 0;
    state.__serverLog.slice(already).forEach(msg => debugLog(msg, 'log-ok'));
    window.__seenServerLogCount = state.__serverLog.length;
  }

  // Si c'est le tour de l'IA (et qu'elle a fini son mulligan), on déclenche
  // son tour automatiquement — le bouton de debug reste utilisable en secours,
  // mais on ne doit plus jamais avoir besoin d'y penser pour que la partie avance.
  // IMPORTANT : uniquement en phase 'main' — pendant declareBlockersMe,
  // S.active reste l'attaquant (donc l'IA si c'est elle qui attaque) alors
  // que c'est le joueur HUMAIN qui doit agir (bloquer). Sans cette
  // restriction, le client du joueur humain tentait de faire "jouer l'IA"
  // toutes les 700ms pendant qu'il essayait lui-même de bloquer, entrant en
  // conflit avec son propre clic ("une action est déjà en cours").
  const activeIsAI = S[S.active] && S[S.active].isAI;
  if(activeIsAI && !S.gameOver && S.phase==='main' && !ACTION_IN_FLIGHT && !aiTurnBlockedByChoice()){
    scheduleAiTurn();
  }
}
// Tour de l'IA : 700 ms de « réflexion » (cms : réduit en Rapide, nul en
// Instantané), mais jamais tant qu'une animation tourne encore (révélations de
// MES dernières actions) ni pendant une autre action. Un seul minuteur à la fois.
let __aiTurnTimer = null;
const AI_STEP_PAUSE_MS = 1000; // pause avant chaque étape du tour de l'IA
// Choix en attente côté joueur (défausse, cible, découverte...) : le tour de l'IA attend.
function aiTurnBlockedByChoice(){
  return !!(S && (S.pendingTarget || S.pendingDiscard || S.pendingDiscover || S.pendingSacrifice || S.pendingKeywordChoice || (S.targetQueue && S.targetQueue.length)));
}
function scheduleAiTurn(){
  if(__aiTurnTimer) return;
  const attempt = ()=>{
    __aiTurnTimer = null;
    if(!S || S.gameOver || aiTurnBlockedByChoice() || S.phase!=='main' || !(S[S.active] && S[S.active].isAI)) return; // plus d'actualité (la résolution d'un choix relancera le tour)
    if(__matchAnnounceActive || animationsBusy() || ACTION_IN_FLIGHT){
      __aiTurnTimer = setTimeout(attempt, 150);
      return;
    }
    uiProcessAi();
  };
  // Le moteur joue le tour de l'IA pas à pas (une carte, puis les artefacts, puis l'attaque) :
  // chaque étape est précédée de cette pause, après la fin des animations.
  __aiTurnTimer = setTimeout(attempt, cms(AI_STEP_PAUSE_MS));
}

// Vue intermédiaire du plateau pendant la pause avant la désignation des
// attaquants : S est remplacé le temps d'un rendu par combatHeldView(S) (cartes
// jouées visibles, aucun attaquant, phase principale). S reste l'état réel
// ensuite ; le gel est conservé (la libération de la file rend l'état final).
// Créatures qui meurent (ou sont détruites / sacrifiées) dans ce lot d'entrées du journal.
function collectBatchDeadIds(entries){
  const ids = [];
  (entries||[]).forEach(e=>{
    if(!e || e.raw) return;
    if(e.deadInstId) ids.push(e.deadInstId);
    (e.effects||[]).forEach(eff=>{
      if(/meurt au combat|est détruite|^détruit "|^sacrifie "/i.test(eff.text||'')) (eff.targetInstIds||[]).forEach(i=>ids.push(i));
    });
  });
  return ids;
}
// Plateau « jusqu'ici » : l'état final, mais avec les créatures qui vont mourir plus loin dans
// le lot remises à leur place (prises dans l'état précédent). Fonction pure.
function stagedBoardView(real, prev, deadIds){
  const view = Object.assign({}, real);
  ['p1','p2'].forEach(k=>{
    if(!real[k] || !prev || !prev[k]) return;
    const board = (real[k].board||[]).slice();
    const prevBoard = prev[k].board||[];
    (deadIds||[]).forEach(id=>{
      const i = prevBoard.findIndex(c=>c && c.instId===id);
      if(i<0 || board.some(c=>c && c.instId===id)) return;
      board.splice(Math.min(i, board.length), 0, prevBoard[i]);
    });
    view[k] = Object.assign({}, real[k], { board });
  });
  return view;
}
// Affiche ce plateau intermédiaire le temps d'un rendu ; S reste l'état réel, le gel est conservé.
function renderStagedBoardView(deadIds){
  if(!S) return;
  const real = S, wasFrozen = __boardRenderFrozen;
  try{
    S = stagedBoardView(real, PREV_S, deadIds);
    __boardRenderFrozen = false;
    render();
  } catch(e){
    console.error('Plateau intermédiaire', e);
  } finally {
    S = real;
    __boardRenderFrozen = wasFrozen;
    __boardRenderDirty = false;
  }
}
function renderHeldCombatView(){
  if(!S) return;
  const real = S, wasFrozen = __boardRenderFrozen;
  try{
    S = combatHeldView(real, OPP_KEY);
    __boardRenderFrozen = false;
    render();
  } catch(e){
    console.error('Vue intermédiaire du combat', e);
  } finally {
    S = real;
    __boardRenderFrozen = wasFrozen;
    __boardRenderDirty = false;
  }
}

// Blocage automatique, repli pour un serveur plus ancien : phase de blocage en
// attente alors qu'aucun de mes bloqueurs libres ne peut bloquer (ou plus aucun
// attaquant en jeu) -> on envoie finishBlocking UNE fois par phase, après la
// fin des animations. L'erreur « wrong-phase » (le serveur a déjà fini) est
// ignorée. En cas d'échec réel, l'ancien bouton « Passer » redevient visible.
const __autoFinish = { key:null, status:null, timer:null }; // status : 'sending' | 'settled'
function autoFinishPending(){
  if(!S || !blockPhaseNeedsAutoFinish(S, MY_KEY, OPP_KEY)) return false;
  const key = blockPhaseKey(S, OPP_KEY);
  return !(__autoFinish.key===key && __autoFinish.status==='settled');
}
function maybeAutoFinishBlocking(){
  if(!S || !blockPhaseNeedsAutoFinish(S, MY_KEY, OPP_KEY)) return;
  const key = blockPhaseKey(S, OPP_KEY);
  if(__autoFinish.key===key) return;       // déjà envoyé (ou en cours) pour cette phase
  if(__autoFinish.timer) return;           // minuteur déjà armé
  const attempt = ()=>{
    __autoFinish.timer = null;
    if(!S || !blockPhaseNeedsAutoFinish(S, MY_KEY, OPP_KEY)) return; // le serveur a fini entre-temps
    if(blockPhaseKey(S, OPP_KEY)!==key) return maybeAutoFinishBlocking();
    if(__matchAnnounceActive || __combatAnimPlaying || __combatAnimQueue.length || __boardRenderFrozen || ACTION_IN_FLIGHT){
      __autoFinish.timer = setTimeout(attempt, 150); // animations en cours : on attend
      return;
    }
    __autoFinish.key = key; __autoFinish.status = 'sending';
    UI.pendingBlocker = null;
    runAction('Fin du blocage (auto)', ()=>gsFinishBlocking(), { ignoreErrors:['wrong-phase'] })
      .catch(()=>{})
      .then(()=>{ if(__autoFinish.key===key) __autoFinish.status = 'settled'; render(); });
  };
  __autoFinish.timer = setTimeout(attempt, cms(BLOCK_AUTO_FINISH_DELAY_MS));
}

