// ============================================================
// SPELLCRAFT — Couche client du serveur de jeu (nouvelle architecture)
// ============================================================
// Remplace progressivement spellcraft-multiplayer.js. Contrairement à
// l'ancien système (un des deux joueurs fait tourner le moteur), ici
// AUCUN client ne fait tourner la logique de jeu — tout passe par la
// fonction serveur "game-action". Ce fichier ne fait que : envoyer des
// actions, recevoir l'état, et gérer la présence (déconnexion).
//
// Fonctionne pour les 3 cas : solo contre l'IA, multijoueur, spectateur —
// même mécanisme partout, comme décidé.
// ============================================================

let GS_SESSION_ID = null;
let GS_ROLE = null; // 'p1' | 'p2' | 'spectator'
let GS_VS_AI = false;
let GS_CHANNEL = null;
let GS_PRESENCE_CHANNEL = null;
let GS_ON_STATE_UPDATE = null; // callback fourni par le jeu : (state) => void
let GS_DISCONNECT_TIMEOUT_MS = 10000;
let GS_OPPONENT_LAST_SEEN = null;
let GS_DISCONNECT_TIMER = null;

// ------------------------------------------------------------
// Appel générique à la fonction serveur "game-action"
// ------------------------------------------------------------
async function gsCallAction(action, params = {}) {
  const { data, error } = await sb.functions.invoke('game-action', {
    body: { action, sessionId: GS_SESSION_ID, ...params }
  });
  if (error) {
    // Le message par défaut de la bibliothèque ("Edge Function returned a
    // non-2xx status code") ne dit rien d'utile — le vrai message qu'on
    // renvoie côté serveur est dans le corps de la réponse, qu'il faut
    // aller lire explicitement pour un diagnostic exploitable.
    let detail = error.message || String(error);
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json();
        if (body && body.error) detail = body.error;
      }
    } catch (e) { /* corps illisible : on garde le message générique */ }
    return { error: detail };
  }
  return data;
}

// Récupère l'état actuel directement (sans attendre une diffusion) —
// à appeler juste après gsConnect, car créer/rejoindre une partie ne
// diffuse rien par elle-même.
async function gsFetchState() { return gsCallAction('getState'); }

// ------------------------------------------------------------
// Création / rejointe
// ------------------------------------------------------------
async function gsCreateSession(deckId, vsAI) {
  const { data, error } = await sb.functions.invoke('game-action', {
    body: { action: 'createSession', deckId, vsAI }
  });
  if (error) return { error: error.message || String(error) };
  if (data.error) return data;
  GS_SESSION_ID = data.sessionId;
  GS_ROLE = 'p1';
  GS_VS_AI = !!vsAI;
  return data; // { ok, sessionId, code }
}

async function gsJoinAsPlayer(code, deckId) {
  const { data, error } = await sb.functions.invoke('game-action', {
    body: { action: 'joinAsPlayer', code, deckId }
  });
  if (error) return { error: error.message || String(error) };
  if (data.error) return data;
  GS_SESSION_ID = data.sessionId;
  GS_ROLE = 'p2';
  return data;
}

async function gsJoinAsSpectator(code) {
  const { data, error } = await sb.functions.invoke('game-action', {
    body: { action: 'joinAsSpectator', code }
  });
  if (error) return { error: error.message || String(error) };
  if (data.error) return data;
  GS_SESSION_ID = data.session_id;
  GS_ROLE = 'spectator';
  return data;
}

// ------------------------------------------------------------
// Connexion au canal temps réel de la session (état de jeu + chat)
// et à la présence (pour détecter une déconnexion adverse).
// ------------------------------------------------------------
function gsConnect(onStateUpdate, onChatMessage) {
  GS_ON_STATE_UPDATE = onStateUpdate;

  GS_CHANNEL = sb.channel(`session-${GS_SESSION_ID}`, { config: { broadcast: { self: true } } });
  GS_CHANNEL.on('broadcast', { event: 'state' }, ({ payload }) => {
    if (GS_ON_STATE_UPDATE) GS_ON_STATE_UPDATE(payload.state);
  });
  GS_CHANNEL.subscribe();

  // Chat : on écoute directement les insertions dans la table (pas besoin
  // de passer par la fonction serveur, ça ne touche pas l'état de jeu).
  if (onChatMessage) {
    sb.channel(`chat-${GS_SESSION_ID}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'game_chat_messages',
        filter: `session_id=eq.${GS_SESSION_ID}`
      }, (payload) => { console.log('Événement brut game_chat_messages reçu', payload); onChatMessage(payload.new); })
      .subscribe((status, err) => {
        console.log('Statut abonnement émotes/chat :', status, err || '');
      });
  }

  gsSetupPresence();
}

// ------------------------------------------------------------
// Présence : chaque client "pointe" régulièrement. Si l'adversaire ne
// pointe plus depuis GS_DISCONNECT_TIMEOUT_MS, on déclare forfait pour lui.
// (Les spectateurs n'ont pas besoin de faire ça, seuls les 2 joueurs comptent.)
// ------------------------------------------------------------
function gsSetupPresence() {
  if (GS_ROLE === 'spectator') return;
  if (GS_VS_AI) return; // l'IA n'envoie jamais de présence — pas de déconnexion à surveiller contre elle

  GS_PRESENCE_CHANNEL = sb.channel(`presence-${GS_SESSION_ID}`, {
    config: { presence: { key: GS_ROLE } }
  });

  GS_PRESENCE_CHANNEL.on('presence', { event: 'sync' }, () => {
    const state = GS_PRESENCE_CHANNEL.presenceState();
    const opponentKey = GS_ROLE === 'p1' ? 'p2' : 'p1';
    if (state[opponentKey] && state[opponentKey].length > 0) {
      GS_OPPONENT_LAST_SEEN = Date.now();
    }
  });

  GS_PRESENCE_CHANNEL.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await GS_PRESENCE_CHANNEL.track({ online_at: new Date().toISOString() });
      gsStartDisconnectWatch();
    }
  });
}

function gsStartDisconnectWatch() {
  const opponentKey = GS_ROLE === 'p1' ? 'p2' : 'p1';
  // Ne présume pas que l'adversaire est déjà là : on attend un vrai signal
  // de présence avant de faire courir le délai de déconnexion. Sans ça, le
  // joueur qui arrive en premier sur le plateau (ex: celui qui rejoint par
  // code, arrivé plus vite que celui qui attendait sur le lobby) pouvait
  // déclarer forfait pour son adversaire avant même qu'il n'ait eu le temps
  // d'arriver — d'où une "victoire" immédiate au lieu du mulligan.
  GS_OPPONENT_LAST_SEEN = null;
  const connectStartedAt = Date.now();
  const initialGraceMs = 25000; // le temps d'arriver depuis le lobby (sondage + navigation)
  if (GS_DISCONNECT_TIMER) clearInterval(GS_DISCONNECT_TIMER);
  GS_DISCONNECT_TIMER = setInterval(() => {
    if (!GS_OPPONENT_LAST_SEEN) {
      // jamais vu du tout depuis la connexion : on patiente jusqu'à la fin
      // de la période de grâce initiale avant de considérer ça comme un abandon
      if (Date.now() - connectStartedAt > initialGraceMs) {
        clearInterval(GS_DISCONNECT_TIMER);
        gsCallAction('claimForfeit', { disconnectedPlayer: opponentKey });
      }
      return;
    }
    const elapsed = Date.now() - GS_OPPONENT_LAST_SEEN;
    if (elapsed > GS_DISCONNECT_TIMEOUT_MS) {
      clearInterval(GS_DISCONNECT_TIMER);
      gsCallAction('claimForfeit', { disconnectedPlayer: opponentKey });
    }
  }, 2000);
}

function gsDisconnect() {
  if (GS_DISCONNECT_TIMER) clearInterval(GS_DISCONNECT_TIMER);
  if (GS_CHANNEL) sb.removeChannel(GS_CHANNEL);
  if (GS_PRESENCE_CHANNEL) sb.removeChannel(GS_PRESENCE_CHANNEL);
}

// ------------------------------------------------------------
// Chat
// ------------------------------------------------------------
async function gsSendEmote(image, label) {
  const user = await scGetCurrentUser();
  if (!user) return { error: 'not-logged-in' };
  if (GS_ROLE !== 'p1' && GS_ROLE !== 'p2') return { error: 'spectators-cannot-emote' };
  console.log('Envoi émote — session:', GS_SESSION_ID, 'rôle:', GS_ROLE);
  const { error } = await sb.from('game_chat_messages').insert({
    session_id: GS_SESSION_ID,
    sender_id: user.id,
    sender_name: GS_ROLE, // détourné : porte 'p1'/'p2' plutôt qu'un nom d'affichage, pour savoir où faire apparaître la bulle
    is_spectator: false,
    message: JSON.stringify({ image, label })
  });
  console.log('Résultat insertion émote — erreur:', error || 'aucune');
  if (error) return { error: error.message };
  return { ok: true };
}

// ------------------------------------------------------------
// Actions de jeu — chacune retourne { ok, state } ou { error }.
// Le jeu n'a jamais besoin d'appeler gsCallAction directement pour ces cas.
// ------------------------------------------------------------
async function gsMulligan(cardIndexesToReturn) { return gsCallAction('mulligan', { cardIndexesToReturn }); }
async function gsEndTurn() { return gsCallAction('endTurn'); }
async function gsDeclareAttackers(attackerIds) { return gsCallAction('declareAttackers', { attackerIds }); }
async function gsAssignBlock(blockerId, attackerId) { return gsCallAction('assignBlock', { blockerId, attackerId }); }
async function gsFinishBlocking() { return gsCallAction('finishBlocking'); }
async function gsSetTrap(handIndex, sacrificeInstId) {
  const body = { handIndex };
  if (sacrificeInstId) body.sacrificeInstId = sacrificeInstId;
  return gsCallAction('setTrap', body);
}
async function gsResolveDiscoverChoice(chosenIndex) { return gsCallAction('resolveDiscoverChoice', { chosenIndex }); }
async function gsResolveKeywordChoice(chosenIndex) { return gsCallAction('resolveKeywordChoice', { chosenIndex }); }
async function gsUseHeroPower(targetInfo, chosenTargets, sacrificeInstId) {
  const body = {};
  if (targetInfo) {
    if (targetInfo.isHeroTarget) { body.targetIsHero = true; body.targetPlayerKey = targetInfo.playerKey; }
    else { body.targetInstId = targetInfo.instId; }
  }
  if (chosenTargets) body.chosenTargets = chosenTargets;
  if (sacrificeInstId) body.sacrificeInstId = sacrificeInstId;
  return gsCallAction('useHeroPower', body);
}
async function gsActivatePermanent(permanentType, permanentInstId, targetInfo, chosenTargets, sacrificeInstId) {
  const body = { permanentType, permanentInstId };
  if (targetInfo) {
    if (targetInfo.isHeroTarget) { body.targetIsHero = true; body.targetPlayerKey = targetInfo.playerKey; }
    else { body.targetInstId = targetInfo.instId; }
  }
  if (chosenTargets) body.chosenTargets = chosenTargets;
  if (sacrificeInstId) body.sacrificeInstId = sacrificeInstId;
  return gsCallAction('activatePermanent', body);
}
async function gsPlayCardSimple(handIndex, targetInfo, chosenTargets, choiceKey) {
  const body = { handIndex };
  if (targetInfo) {
    if (targetInfo.isHeroTarget) { body.targetIsHero = true; body.targetPlayerKey = targetInfo.playerKey; }
    else { body.targetInstId = targetInfo.instId; }
  }
  if (chosenTargets) body.chosenTargets = chosenTargets;
  if (choiceKey) body.choiceKey = choiceKey;
  return gsCallAction('playCardSimple', body);
}
async function gsSetShowHandToSpectators(show) { return gsCallAction('setShowHandToSpectators', { show }); }
async function gsProcessAiTurn() { return gsCallAction('processAiTurn'); }
async function gsCheckTimer() { return gsCallAction('checkTimer'); }
