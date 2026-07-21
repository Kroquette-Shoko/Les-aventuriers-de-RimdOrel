/* ============================================================
   SPELLCRAFT — MULTIJOUEUR : MISE EN RELATION (étape 1)
   ============================================================
   Cette première étape ne fait que "créer une invitation" /
   "rejoindre via un lien". La synchronisation de la partie en
   temps réel (les coups joués) est une étape suivante, pas encore
   construite ici.

   Chargé après spellcraft-catalog.js.
   ============================================================ */

async function mpCreateRoom(deck){
  const user = await scGetCurrentUser();
  if(!user) return { error: "Connecte-toi pour créer une invitation." };
  const { data, error } = await sb.from('game_rooms').insert({
    host_id: user.id,
    host_deck: deck,
    status: 'waiting'
  }).select('id').single();
  if(error) return { error: error.message };
  return { id: data.id };
}

async function mpJoinRoom(roomId, deck){
  const user = await scGetCurrentUser();
  if(!user) return { error: "Connecte-toi pour rejoindre une partie." };
  const room = await mpGetRoom(roomId);
  if(!room) return { error: "Cette invitation n'existe pas ou plus." };
  if(room.host_id === user.id) return { error: "Tu ne peux pas rejoindre ta propre invitation." };
  if(room.guest_id) return { error: "Cette invitation a déjà été utilisée." };
  const { error } = await sb.from('game_rooms')
    .update({ guest_id: user.id, guest_deck: deck, status: 'active' })
    .eq('id', roomId)
    .is('guest_id', null);
  if(error) return { error: error.message };
  return { ok: true };
}

async function mpGetRoom(roomId){
  const { data, error } = await sb.from('game_rooms').select('*').eq('id', roomId).single();
  if(error) return null;
  return data;
}

function mpWaitForGuest(roomId, onJoined, intervalMs){
  const timer = setInterval(async ()=>{
    const room = await mpGetRoom(roomId);
    if(room && room.guest_id){
      clearInterval(timer);
      onJoined(room);
    }
  }, intervalMs || 2000);
  return () => clearInterval(timer); // à appeler pour annuler l'attente
}

function mpInviteLink(roomId){
  return `${window.location.origin}${window.location.pathname}?room=${roomId}`;
}

function mpGetRoomIdFromUrl(){
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
}

/* ============================================================
   SYNCHRONISATION DE PARTIE EN TEMPS RÉEL (étape 2)
   ============================================================
   Modèle "hôte source de vérité" : le navigateur de l'hôte fait
   tourner le moteur de jeu normal, sans aucune modification — les
   actions de l'invité arrivent par le réseau et sont appliquées
   exactement comme le seraient celles d'un joueur local (playCard,
   endTurn...), simplement pour 'p2' au lieu de venir de l'IA. L'état
   à jour est rediffusé à l'invité après chaque changement.

   Le navigateur de l'invité, lui, ne fait JAMAIS tourner le moteur :
   il affiche l'état reçu (avec p1/p2 inversés, pour que "S.p1" reste
   toujours "mon propre côté" quel que soit le rôle réel), et envoie
   ses actions au lieu de les exécuter localement.
   ============================================================ */
let MP_MODE = null; // null | 'host' | 'guest'
let MP_ROOM_ID = null;
let MP_CHANNEL = null;

function mpSerializeState(){
  return JSON.parse(JSON.stringify(S));
}
function mpBroadcastState(){
  if(!MP_CHANNEL) return;
  MP_CHANNEL.send({ type:'broadcast', event:'state', payload: mpSerializeState() });
}
function mpSwapPerspective(hostState){
  return {
    ...hostState,
    p1: hostState.p2,
    p2: hostState.p1,
    active: hostState.active==='p1' ? 'p2' : 'p1',
    winnerKey: hostState.winnerKey==='p1' ? 'p2' : (hostState.winnerKey==='p2' ? 'p1' : hostState.winnerKey)
  };
}

function mpSwapLogPerspective(msg){
  // les messages du journal sont écrits côté hôte avec "Vous" / "L'adversaire" ;
  // on inverse ces deux mots pour que le message ait du sens du point de vue de l'invité
  return msg
    .replace(/\bVous\b/g, '\u0000VOUS\u0000')
    .replace(/L'adversaire/g, 'Vous')
    .replace(/\u0000VOUS\u0000/g, "L'adversaire");
}

/* ---------- CÔTÉ HÔTE ---------- */
function mpStartAsHost(roomId, guestDeck){
  MP_MODE = 'host';
  MP_ROOM_ID = roomId;

  MP_CHANNEL = sb.channel(`game-${roomId}`, { config:{ broadcast:{ self:false } } });
  MP_CHANNEL.on('broadcast', {event:'action'}, ({payload})=>{ mpApplyGuestAction(payload); });
  MP_CHANNEL.subscribe((status)=>{
    if(status!=='SUBSCRIBED') return;
    const realRender = render;
    render = function(){
      realRender();
      if(MP_MODE==='host') mpBroadcastState();
    };
    const realLog = log;
    log = function(msg){
      realLog(msg);
      if(MP_MODE==='host' && MP_CHANNEL) MP_CHANNEL.send({ type:'broadcast', event:'log', payload:{ msg } });
    };
    const realShowCardReveal = showCardReveal;
    showCardReveal = function(card){
      realShowCardReveal(card);
      if(MP_MODE==='host' && MP_CHANNEL) MP_CHANNEL.send({ type:'broadcast', event:'reveal', payload:{ card } });
    };
    launchWithChosenDeck(guestDeck, false);
  });
}

function mpApplyGuestAction(action){
  if(!action || S.gameOver) return;
  switch(action.type){
    case 'playCard': playCard('p2', action.handIndex, action.targetInfo); break;
    case 'setTrap': setTrap('p2', action.handIndex); break;
    case 'useHeroPower': useHeroPower('p2', action.targetInfo || {}); break;
    case 'endTurn': if(S.active==='p2') endTurn(); break;
    case 'enterDeclareAttackers': if(S.active==='p2') enterDeclareAttackers(); break;
    case 'confirmAttackers':
      if(S.active==='p2'){ S.selectedAttackers = action.selectedAttackers || []; confirmAttackers(); }
      break;
    case 'beginPlayerBlock':
      if(S.phase==='declareBlockersMe') beginPlayerBlock(action.instId);
      break;
    case 'assignBlock':
      if(S.phase==='declareBlockersMe') assignBlock(action.attackerInstId);
      break;
    case 'finishBlocking':
      if(S.phase==='declareBlockersMe') finishBlocking();
      break;
  }
}

/* ---------- CÔTÉ INVITÉ ---------- */
function mpSendAction(type, extra){
  if(!MP_CHANNEL) return;
  MP_CHANNEL.send({ type:'broadcast', event:'action', payload: { type, ...extra } });
}

function mpStartAsGuest(roomId){
  MP_MODE = 'guest';
  MP_ROOM_ID = roomId;

  // remplace les fonctions d'action par des envois réseau au lieu d'exécuter localement
  playCard = function(key, handIndex, targetInfo){
    if(key!=='p1') return false;
    mpSendAction('playCard', { handIndex, targetInfo });
    return true;
  };
  setTrap = function(key, handIndex){
    if(key!=='p1') return false;
    mpSendAction('setTrap', { handIndex });
    return true;
  };
  useHeroPower = function(key, targetInfo){
    if(key!=='p1') return;
    mpSendAction('useHeroPower', { targetInfo });
  };
  endTurn = function(){ mpSendAction('endTurn'); };
  enterDeclareAttackers = function(){ mpSendAction('enterDeclareAttackers'); };
  confirmAttackers = function(){ mpSendAction('confirmAttackers', { selectedAttackers: S.selectedAttackers||[] }); };
  beginPlayerBlock = function(myCreatureInstId){
    mpSendAction('beginPlayerBlock', { instId: myCreatureInstId });
    S.pendingBlocker = myCreatureInstId; // retour visuel local immédiat (surbrillance) en attendant l'état officiel
    render();
  };
  assignBlock = function(attackerInstId){
    if(!S.pendingBlocker) return;
    mpSendAction('assignBlock', { blockerInstId: S.pendingBlocker, attackerInstId });
    S.pendingBlocker = null;
  };
  finishBlocking = function(){ mpSendAction('finishBlocking'); };

  MP_CHANNEL = sb.channel(`game-${roomId}`, { config:{ broadcast:{ self:false } } });
  MP_CHANNEL.on('broadcast', {event:'state'}, ({payload})=>{
    S = mpSwapPerspective(payload);
    document.getElementById('deck-select-overlay').style.display='none';
    render();
  });
  MP_CHANNEL.on('broadcast', {event:'log'}, ({payload})=>{ log(mpSwapLogPerspective(payload.msg)); });
  MP_CHANNEL.on('broadcast', {event:'reveal'}, ({payload})=>{ showCardReveal(payload.card); });
  MP_CHANNEL.subscribe();
}
