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
  if (error) return { error: error.message || String(error) };
  return data;
}

// Récupère l'état actuel directement (sans attendre une diffusion) —
// à appeler juste après gsConnect, car créer/rejoindre une partie ne
// diffuse rien par elle-même.
async function gsFetchState() { return gsCallAction('getState'); }

// ------------------------------------------------------------
// Création / rejointe
// ------------------------------------------------------------
async function gsCreateSession(deck, vsAI) {
  const { data, error } = await sb.functions.invoke('game-action', {
    body: { action: 'createSession', deck, vsAI }
  });
  if (error) return { error: error.message || String(error) };
  if (data.error) return data;
  GS_SESSION_ID = data.sessionId;
  GS_ROLE = 'p1';
  GS_VS_AI = !!vsAI;
  return data; // { ok, sessionId, code }
}

async function gsJoinAsPlayer(code, deck) {
  const { data, error } = await sb.functions.invoke('game-action', {
    body: { action: 'joinAsPlayer', code, deck }
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
      }, (payload) => onChatMessage(payload.new))
      .subscribe();
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
  GS_OPPONENT_LAST_SEEN = Date.now(); // au démarrage, on laisse une chance à l'adversaire de se connecter
  if (GS_DISCONNECT_TIMER) clearInterval(GS_DISCONNECT_TIMER);
  GS_DISCONNECT_TIMER = setInterval(() => {
    if (!GS_OPPONENT_LAST_SEEN) return;
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
async function gsSendChatMessage(message, senderName) {
  const user = await scGetCurrentUser();
  if (!user) return { error: 'not-logged-in' };
  const { error } = await sb.from('game_chat_messages').insert({
    session_id: GS_SESSION_ID,
    sender_id: user.id,
    sender_name: senderName || user.email || 'Joueur',
    is_spectator: GS_ROLE === 'spectator',
    message: message
  });
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
async function gsPlayCardSimple(handIndex) { return gsCallAction('playCardSimple', { handIndex }); }
async function gsSetShowHandToSpectators(show) { return gsCallAction('setShowHandToSpectators', { show }); }
async function gsProcessAiTurn() { return gsCallAction('processAiTurn'); }
