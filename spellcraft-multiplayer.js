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
