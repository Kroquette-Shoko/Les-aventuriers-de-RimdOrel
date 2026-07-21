/* ============================================================
   SPELLCRAFT — ÉCONOMIE (monnaie du jeu)
   ============================================================
   Chargé après spellcraft-auth.js. Toutes les écritures passent par
   des fonctions Supabase sécurisées (grant_currency/spend_currency) —
   jamais d'écriture directe sur profiles.currency depuis le client.
   ============================================================ */

async function loadCurrency(){
  const user = await scGetCurrentUser();
  if(!user) return 0;
  const { data, error } = await sb.from('profiles').select('currency').eq('id', user.id).single();
  if(error){ console.error('Erreur de chargement de la monnaie', error); return 0; }
  return data?.currency ?? 0;
}

async function grantCurrency(amount){
  const user = await scGetCurrentUser();
  if(!user) return { error: 'not-logged-in' };
  const { data, error } = await sb.rpc('grant_currency', { target_user_id: user.id, amount });
  if(error) return { error: error.message };
  return { balance: data };
}

async function spendCurrency(amount){
  const user = await scGetCurrentUser();
  if(!user) return { error: 'not-logged-in' };
  const { data, error } = await sb.rpc('spend_currency', { target_user_id: user.id, amount });
  if(error) return { error: error.message };
  return { balance: data };
}

// Montant gagné à la fin de CHAQUE partie — seule source de monnaie tant
// que quêtes/succès n'existent pas.
const CURRENCY_WIN = 100;
const CURRENCY_LOSS = 25;

async function grantMatchCurrency(won){
  const amount = won ? CURRENCY_WIN : CURRENCY_LOSS;
  const res = await grantCurrency(amount);
  if(res.error){ console.error("Erreur d'octroi de monnaie de fin de partie", res.error); return null; }
  return { balance: res.balance, amount };
}

// Fait progresser toutes les quêtes correspondant à ce type de condition
// (silencieux en cas d'échec — ne doit jamais bloquer le déroulement du jeu).
async function progressQuest(conditionType, amount){
  try{
    const user = await scGetCurrentUser();
    if(!user) return;
    await sb.rpc('progress_quest', { p_condition_type: conditionType, p_amount: amount||1 });
  }catch(e){ console.error('Erreur de progression de quête', e); }
}
