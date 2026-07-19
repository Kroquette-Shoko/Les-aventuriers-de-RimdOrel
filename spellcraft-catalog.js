/* ============================================================
   SPELLCRAFT — CATALOGUE DE CARTES (Supabase)
   ============================================================
   Remplace l'ancien système de sets en localStorage (encore présent
   dans spellcraft-shared.js sous des noms préfixés "Local", conservé
   uniquement pour la migration ponctuelle ci-dessous).

   Chargé APRÈS spellcraft-auth.js (a besoin du client `sb`) :

   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="spellcraft-shared.js"></script>
   <script src="spellcraft-auth.js"></script>
   <script src="spellcraft-catalog.js"></script>

   Les fonctions gardent les mêmes noms que l'ancien système local
   (loadSetsIndex, loadSetCards, saveSetCards, loadAllCardsAcrossSets...)
   pour que l'éditeur, le deckbuilder et le jeu n'aient rien à changer
   dans leurs propres appels — seul le "où" a changé.
   ============================================================ */

async function loadSetsIndex(){
  const { data, error } = await sb.from('card_sets').select('id, name, is_base').order('created_at');
  if(error){ console.error('Erreur de chargement des sets', error); return []; }
  return data || [];
}

async function createCardSet(name){
  let id = slugifySetName(name);
  const existing = await loadSetsIndex();
  const usedIds = new Set(existing.map(s=>s.id));
  let uniqueId = id, n = 2;
  while(usedIds.has(uniqueId)){ uniqueId = `${id}-${n}`; n++; }
  const { error } = await sb.from('card_sets').insert({ id: uniqueId, name });
  if(error) return { error: error.message };
  return { id: uniqueId, name };
}

async function renameCardSet(id, newName){
  const { error } = await sb.from('card_sets').update({ name: newName }).eq('id', id);
  if(error) return { error: error.message };
  return true;
}

async function setCardSetIsBase(id, isBase){
  const { error } = await sb.from('card_sets').update({ is_base: isBase }).eq('id', id);
  if(error) return { error: error.message };
  if(isBase){
    // distribue immédiatement tout le set à tous les comptes déjà existants
    const { error: rpcError } = await sb.rpc('grant_set_to_all_users', { target_set_id: id });
    if(rpcError) console.error('Erreur distribution du set de base', rpcError);
  }
  return { ok: true };
}

async function deleteCardSet(id){
  const { error } = await sb.from('card_sets').delete().eq('id', id);
  if(error) return { error: error.message };
  return true;
}

async function loadSetCards(setId){
  const { data, error } = await sb.from('cards').select('id, data').eq('set_id', setId);
  if(error){ console.error('Erreur de chargement des cartes du set', error); return []; }
  const cards = (data||[]).map(row => ({...row.data, id: row.id}));
  cards.forEach(migrateCard);
  return cards;
}

async function saveSetCards(setId, cards){
  const rows = cards.map(c => ({ id: c.id, set_id: setId, data: c, updated_at: new Date().toISOString() }));
  if(rows.length){
    const { error } = await sb.from('cards').upsert(rows);
    if(error){ console.error('Erreur de sauvegarde des cartes', error); return { error: error.message }; }
  }
  // supprime dans Supabase les cartes de ce set qui n'existent plus localement
  const { data: existing } = await sb.from('cards').select('id').eq('set_id', setId);
  const currentIds = new Set(cards.map(c=>c.id));
  const toDelete = (existing||[]).map(r=>r.id).filter(id=>!currentIds.has(id));
  if(toDelete.length){
    await sb.from('cards').delete().in('id', toDelete);
  }
  return { ok: true };
}

// point d'entrée pour le deckbuilder et le jeu : toutes les cartes, tous sets confondus
async function loadAllCardsAcrossSets(){
  const { data, error } = await sb.from('cards').select('id, data');
  if(error){ console.error('Erreur de chargement du catalogue', error); return []; }
  const cards = (data||[]).map(row => ({...row.data, id: row.id}));
  cards.forEach(migrateCard);
  return cards;
}

/* ============================================================
   COLLECTION PERSONNELLE
   ============================================================
   Pour l'instant, chaque compte reçoit automatiquement tout le
   catalogue (voir spellcraft-supabase-schema-addendum-2.sql).
   Ces fonctions lisent/modifient la table user_cards.
   ============================================================ */
async function loadUserCollection(){
  const user = await scGetCurrentUser();
  if(!user) return {};
  const { data, error } = await sb.from('user_cards').select('card_id, quantity').eq('user_id', user.id);
  if(error){ console.error('Erreur de chargement de la collection', error); return {}; }
  const owned = {};
  (data||[]).forEach(row => { owned[row.card_id] = row.quantity; });
  return owned;
}

// Comme loadUserCollection, mais inclut aussi le nombre d'exemplaires Foil
// séparément — utilisé par la boutique. Ne pas utiliser à la place de
// loadUserCollection() ailleurs, la forme du résultat est différente.
async function loadUserCollectionWithFoil(){
  const user = await scGetCurrentUser();
  if(!user) return {};
  const { data, error } = await sb.from('user_cards').select('card_id, quantity, quantity_foil').eq('user_id', user.id);
  if(error){ console.error('Erreur de chargement de la collection', error); return {}; }
  const owned = {};
  (data||[]).forEach(row => { owned[row.card_id] = { quantity: row.quantity, foil: row.quantity_foil||0 }; });
  return owned;
}

/* ============================================================
   PROFIL — monnaie (or) et fragments
   ============================================================ */
async function loadUserProfile(){
  const user = await scGetCurrentUser();
  if(!user) return null;
  const { data, error } = await sb.from('profiles')
    .select('currency, fragments_aube, fragments_crepuscule, fragments_volonte, fragments_prima, fragments_arcane')
    .eq('id', user.id).single();
  if(error){ console.error('Erreur de chargement du profil', error); return null; }
  return data;
}

async function setUserCardQuantity(cardId, quantity){
  const user = await scGetCurrentUser();
  if(!user) return { error: 'not-logged-in' };
  if(quantity<=0){
    const { error } = await sb.from('user_cards').delete().eq('user_id', user.id).eq('card_id', cardId);
    if(error) return { error: error.message };
    return { ok: true };
  }
  const { error } = await sb.from('user_cards').upsert({ user_id: user.id, card_id: cardId, quantity });
  if(error) return { error: error.message };
  return { ok: true };
}

/* ============================================================
   DECKS SAUVEGARDÉS (liés au compte)
   ============================================================
   Un deck garde la forme { id, name, heroId, regionId, cards }
   utilisée partout dans le deckbuilder et le jeu. Le contenu
   (heroId/regionId/cards) est stocké dans la colonne jsonb `data` ;
   `id` correspond à l'identifiant de la ligne Supabase (uuid).
   ============================================================ */
async function loadUserDecks(){
  const user = await scGetCurrentUser();
  if(!user) return [];
  const { data, error } = await sb.from('user_decks').select('id, name, data, updated_at').order('updated_at', {ascending:false});
  if(error){ console.error('Erreur de chargement des decks', error); return []; }
  return (data||[]).map(row => ({
    id: row.id,
    name: row.name,
    heroId: row.data?.heroId ?? null,
    regionId: row.data?.regionId ?? null,
    cards: row.data?.cards || []
  }));
}

async function saveUserDeck(deck){
  const user = await scGetCurrentUser();
  if(!user) return { error: "Connecte-toi pour sauvegarder un deck." };
  const payload = {
    user_id: user.id,
    name: deck.name || 'Deck sans nom',
    data: { heroId: deck.heroId, regionId: deck.regionId, cards: deck.cards || [] },
    updated_at: new Date().toISOString()
  };
  const isExistingRemoteId = deck.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deck.id);
  if(isExistingRemoteId){
    const { error } = await sb.from('user_decks').update(payload).eq('id', deck.id);
    if(error) return { error: error.message };
    return { id: deck.id };
  } else {
    const { data, error } = await sb.from('user_decks').insert(payload).select('id').single();
    if(error) return { error: error.message };
    return { id: data.id };
  }
}

async function deleteUserDeck(id){
  const { error } = await sb.from('user_decks').delete().eq('id', id);
  if(error) return { error: error.message };
  return { ok: true };
}

const DECKS_MIGRATION_FLAG = 'spellcraft-decks-migrated-to-supabase';
async function migrateLocalDecksToSupabaseIfNeeded(){
  if(localStorage.getItem(DECKS_MIGRATION_FLAG)==='true') return { migrated: false };
  const user = await scGetCurrentUser();
  if(!user) return { migrated: false, reason: 'not-logged-in' };

  const remote = await loadUserDecks();
  if(remote.length>0){
    localStorage.setItem(DECKS_MIGRATION_FLAG, 'true');
    return { migrated: false, reason: 'remote-not-empty' };
  }
  let local = [];
  try{
    const res = await storageGet('spellcraft-decks');
    local = res && res.value ? JSON.parse(res.value) : [];
  }catch(e){ local = []; }
  if(local.length===0){
    localStorage.setItem(DECKS_MIGRATION_FLAG, 'true');
    return { migrated: false, reason: 'nothing-to-migrate' };
  }
  let count = 0;
  for(const d of local){
    const res = await saveUserDeck(d);
    if(!res.error) count++; else console.error('[migration decks] échec pour', d.name, res.error);
  }
  localStorage.setItem(DECKS_MIGRATION_FLAG, 'true');
  console.log(`[migration decks] terminée : ${count}/${local.length} deck(s) migré(s).`);
  return { migrated: true, count };
}

/* ============================================================
   MIGRATION PONCTUELLE — anciennes données locales → Supabase
   ============================================================
   Ne se déclenche que si l'utilisateur est connecté, que Supabase
   n'a encore aucun set, et qu'il existe des données locales à
   récupérer (nouveau système de sets local, ou très ancien format
   à clé unique). Marque un drapeau une fois fait pour ne jamais
   recommencer.
   ============================================================ */
const CATALOG_MIGRATION_FLAG = 'spellcraft-catalog-migrated-to-supabase';

async function migrateLocalCatalogToSupabaseIfNeeded(){
  if(localStorage.getItem(CATALOG_MIGRATION_FLAG)==='true'){
    console.log('[migration] déjà marquée comme faite (drapeau localStorage) — rien à faire.');
    return { migrated: false };
  }
  const user = await scGetCurrentUser();
  if(!user){
    console.log('[migration] utilisateur non connecté, on retentera plus tard.');
    return { migrated: false, reason: 'not-logged-in' };
  }

  const { count, error: countError } = await sb.from('cards').select('*', { count: 'exact', head: true });
  if(countError) console.warn('[migration] impossible de compter les cartes distantes', countError);
  if(count && count>0){
    console.log(`[migration] Supabase contient déjà ${count} carte(s) — migration considérée comme faite.`);
    localStorage.setItem(CATALOG_MIGRATION_FLAG, 'true');
    return { migrated: false, reason: 'remote-not-empty' };
  }

  let localIndex = await loadLocalSetsIndex();
  let localGroups = [];
  if(localIndex.length>0){
    console.log(`[migration] ${localIndex.length} set(s) trouvé(s) en local :`, localIndex.map(s=>s.name));
    for(const s of localIndex){
      const cards = await loadLocalSetCards(s.id);
      console.log(`[migration]   - "${s.name}" : ${cards.length} carte(s)`);
      if(cards.length) localGroups.push({ name: s.name, cards });
    }
  } else {
    console.log('[migration] aucun set local trouvé, tentative avec le très ancien format à clé unique...');
    const legacy = await loadLegacyMonolithicCards();
    console.log(`[migration] format à clé unique : ${legacy.length} carte(s) trouvée(s)`);
    if(legacy.length){
      const byName = {};
      legacy.forEach(c=>{
        const name = (c.set && c.set.trim()) ? c.set.trim() : 'Édition de base';
        (byName[name] = byName[name]||[]).push(c);
      });
      localGroups = Object.keys(byName).map(name=>({ name, cards: byName[name] }));
    }
  }

  if(localGroups.length===0){
    console.log('[migration] rien à migrer.');
    localStorage.setItem(CATALOG_MIGRATION_FLAG, 'true');
    return { migrated: false, reason: 'nothing-to-migrate' };
  }

  const remoteIndex = await loadSetsIndex(); // peut contenir un set vide déjà créé (ex. "Édition de base" par défaut)
  let totalCards = 0;
  for(const group of localGroups){
    let target = remoteIndex.find(s=>s.name===group.name);
    if(!target){
      const res = await createCardSet(group.name);
      if(res.error){ console.error('[migration] échec création du set', group.name, res.error); continue; }
      target = { id: res.id, name: res.name };
      remoteIndex.push(target);
    }
    console.log(`[migration] envoi de ${group.cards.length} carte(s) vers le set "${group.name}" (${target.id})...`);
    const saveRes = await saveSetCards(target.id, group.cards);
    if(saveRes && saveRes.error){ console.error('[migration] échec sauvegarde des cartes pour', group.name, saveRes.error); continue; }
    totalCards += group.cards.length;
  }
  localStorage.setItem(CATALOG_MIGRATION_FLAG, 'true');
  console.log(`[migration] terminée : ${localGroups.length} set(s), ${totalCards} carte(s) au total.`);
  return { migrated: true, sets: localGroups.length, cards: totalCards };
}
