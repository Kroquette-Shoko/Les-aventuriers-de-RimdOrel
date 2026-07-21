/* ============================================================
   SPELLCRAFT — DONNÉES ET FONCTIONS PARTAGÉES
   ============================================================
   Chargé par spellcraft-card-editor.html, spellcraft-deckbuilder.html
   et spellcraft-prototype.html via <script src="spellcraft-shared.js">.

   But de ce fichier : être la SEULE source de vérité pour :
   - les listes de référence (classes, raretés, types, mots-clés)
   - la forme complète d'une carte (migrateCard)
   - quelques fonctions utilitaires utilisées partout (escapeHtml, getClassColor)

   RÈGLE : si un champ existe sur une carte, il DOIT être déclaré dans
   migrateCard() ci-dessous avec sa valeur par défaut. C'est ce qui a manqué
   à plusieurs reprises (image, rareté, set, logo, foil...) et causé des
   régressions silencieuses d'un outil à l'autre. Toute nouvelle case ajoutée
   dans l'éditeur doit être ajoutée ici en même temps, jamais après coup.
   ============================================================ */

const CLASSES = ['Aube','Crépuscule','Volonté','Prima','Arcane','Neutre'];
const CLASS_COLORS = {
  Aube:'#d4af37', Crépuscule:'#4b0082', Prima:'#228b22',
  Volonté:'#8b0000', Arcane:'#4682b4', Neutre:'#c0c0c0'
};
function getClassColor(className){ return CLASS_COLORS[className] || CLASS_COLORS.Neutre; }

const RARITIES = ['Basique','Commune','Rare','Épique','Mythique'];
const CARD_TYPES = ['Héros','Région','Créature','Artefact','Sortilège','Piège'];

const KEYWORDS = [
  {key:'charge', label:'Charge', desc:'Peut attaquer au tour où elle arrive.'},
  {key:'flying', label:'Vol', desc:'Ne peut être bloquée que par des créatures volantes ou à portée.'},
  {key:'reach', label:'Portée', desc:'Peut bloquer les créatures volantes sans avoir elle-même le Vol.'},
  {key:'pierce', label:'Perçant', desc:"L'excédent de dégâts passe sur le héros adverse."},
  {key:'lifesteal', label:'Vol de vie', desc:'Les dégâts infligés soignent votre héros.'},
  {key:'initiative', label:'Initiative', desc:'Frappe avant son adversaire (si elle tue sa cible, elle ne subit pas de dégâts).'},
  {key:'armor', label:'Armure', desc:"Annule la première fois qu'elle subit des dégâts."},
  {key:'stealth', label:'Furtif', desc:"Ne peut pas être la cible d'un sortilège le tour où elle arrive."},
  {key:'relentless', label:'Tenace', desc:'Quand elle meurt, revient en jeu une fois (sans Tenace).'},
  {key:'fearful', label:'Peureux', desc:'Ne peut pas bloquer.'},
  {key:'protecteur', label:'Protecteur', desc:'Ne peut pas attaquer.'},
  {key:'toxic', label:'Toxique', desc:'Tue toute créature à qui elle inflige des dégâts.'}
];

/* ============================================================
   ESCAPE HTML — utilisé par les trois outils pour tout texte
   injecté dans innerHTML (nom de carte, texte, etc.)
   ============================================================ */
function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ============================================================
   MIGRATE CARD — garantit que toute carte manipulée par l'un des
   trois outils possède tous les champs connus, avec leur valeur
   par défaut. À appeler sur CHAQUE carte chargée depuis le storage
   ou reçue d'un autre outil, avant de l'utiliser.
   ============================================================ */
function migrateCard(c){
  if(!c.abilities) c.abilities = [];
  c.abilities.forEach(ab=>{
    if(ab.activationCost===undefined) ab.activationCost = 2;
    if(ab.activationCooldown===undefined) ab.activationCooldown = 0;
    if(ab.triggerSubtype===undefined) ab.triggerSubtype = '';
    if(ab.triggerOwner===undefined) ab.triggerOwner = 'ally';
    if(ab.triggerTurn===undefined) ab.triggerTurn = 1;
    if(ab.extraCostEnabled===undefined) ab.extraCostEnabled = false;
    if(ab.extraCostType===undefined) ab.extraCostType = 'sacrificeCreature';
    if(ab.extraCostAmount===undefined) ab.extraCostAmount = 1;
    if(ab.extraCostCustom===undefined) ab.extraCostCustom = '';
    (ab.conditions||[]).forEach(cond=>{
      if(cond.healthChangeDirection===undefined) cond.healthChangeDirection='lost';
      if(cond.healthChangeOwner===undefined) cond.healthChangeOwner='self';
      if(cond.healthChangeMode===undefined) cond.healthChangeMode='atLeast';
      if(cond.owner===undefined) cond.owner='self';
      if(cond.valueMode===undefined) cond.valueMode='fixed';
      if(cond.valueFixed===undefined) cond.valueFixed = parseInt(cond.value)||3;
      if(cond.valueDynamic===undefined) cond.valueDynamic='handSize';
      if(cond.resourceType===undefined) cond.resourceType='hp';
      if(cond.compareMode===undefined) cond.compareMode='atLeast';
      if(cond.countThisTurnType===undefined) cond.countThisTurnType='creature';
      if(cond.countThisTurnEvent===undefined) cond.countThisTurnEvent='died';
      if(cond.subtypeCardType===undefined) cond.subtypeCardType='creature';
      if(cond.subtypeZone===undefined) cond.subtypeZone='board';
      if(cond.subtype===undefined) cond.subtype='';
      if(cond.statType===undefined) cond.statType='force';
      if(cond.statScope===undefined) cond.statScope='target';
      if(cond.statCompareMode===undefined) cond.statCompareMode='greater';
      if(cond.deckCompMode===undefined) cond.deckCompMode='singleClassAny';
      if(cond.deckCompClass===undefined) cond.deckCompClass='Aube';
      if(cond.deckCompValue===undefined) cond.deckCompValue=1;
    });
    (ab.effects||[]).forEach(eff=>{
      if(eff.valueMode2===undefined) eff.valueMode2 = eff.valueMode||'fixed';
      if(eff.retrieveSource===undefined) eff.retrieveSource='deck';
      if(eff.setStatTarget===undefined) eff.setStatTarget='force';
      if(eff.setStatScope===undefined) eff.setStatScope='board';
      if(eff.setStatOwner===undefined) eff.setStatOwner='ally';
      if(eff.setStatValue===undefined) eff.setStatValue=2;
      if(eff.manaType===undefined) eff.manaType='normal';
      if(eff.silenceMode===undefined) eff.silenceMode='both';
      if(eff.retrieveCriteria===undefined) eff.retrieveCriteria='random';
      if(eff.retrieveValue===undefined) eff.retrieveValue='2';
      if(eff.retrieveCardType===undefined) eff.retrieveCardType='Créature';
      if(eff.retrieveSubtype===undefined) eff.retrieveSubtype='';
      if(eff.retrieveKeyword===undefined) eff.retrieveKeyword='charge';
      if(eff.retrieveDestination===undefined) eff.retrieveDestination='hand';
      if(eff.retrieveRepeat===undefined) eff.retrieveRepeat='once';
      if(eff.conjureTypes===undefined) eff.conjureTypes=['Sortilège'];
      if(eff.conjureClass===undefined) eff.conjureClass='any';
      if(eff.conjureDestination===undefined) eff.conjureDestination='hand';
      if(eff.conjureCostMode===undefined) eff.conjureCostMode='any';
      if(eff.conjureCostValue===undefined) eff.conjureCostValue=2;
      if(eff.conjureAtkMode===undefined) eff.conjureAtkMode='any';
      if(eff.conjureAtkValue===undefined) eff.conjureAtkValue=1;
      if(eff.conjureHpMode===undefined) eff.conjureHpMode='any';
      if(eff.conjureHpValue===undefined) eff.conjureHpValue=1;
      if(eff.conjureSubtype===undefined) eff.conjureSubtype='';
      if(eff.conjureMode===undefined) eff.conjureMode='filter';
      if(eff.conjureSpecificName===undefined) eff.conjureSpecificName='';
      if(eff.exploreOwner===undefined) eff.exploreOwner='own';
      if(eff.discoverCriteria===undefined) eff.discoverCriteria='random';
      if(eff.discoverValue===undefined) eff.discoverValue='2';
      if(eff.discoverCardType===undefined) eff.discoverCardType='Créature';
      if(eff.discoverSubtype===undefined) eff.discoverSubtype='';
      if(eff.discoverSource===undefined) eff.discoverSource='deck';
      if(eff.setStatsScope===undefined) eff.setStatsScope='board';
      if(eff.setStatsOwner===undefined) eff.setStatsOwner='ally';
      if(eff.setStatsAtk===undefined) eff.setStatsAtk=1;
      if(eff.setStatsHp===undefined) eff.setStatsHp=1;
      if(eff.setCostScope===undefined) eff.setCostScope='deck';
      if(eff.setCostOwner===undefined) eff.setCostOwner='ally';
      if(eff.setCostValue===undefined) eff.setCostValue=1;
      if(eff.reduceCostScope===undefined) eff.reduceCostScope='hand';
      if(eff.reduceCostOwner===undefined) eff.reduceCostOwner='ally';
      if(eff.reduceCostType===undefined) eff.reduceCostType='any';
      if(eff.reduceCostSubtype===undefined) eff.reduceCostSubtype='';
      if(eff.reduceCostAmount===undefined) eff.reduceCostAmount=1;
      if(eff.nextDiscountType===undefined) eff.nextDiscountType='Sortilège';
      if(eff.grantKeywordKey===undefined) eff.grantKeywordKey='charge';
      if(eff.grantKeywordDuration===undefined) eff.grantKeywordDuration='permanent';
      if(eff.fightAllySelection===undefined) eff.fightAllySelection='chosen';
      if(eff.fightEnemySelection===undefined) eff.fightEnemySelection='chosen';
      if(eff.coinFlipTargetCategory===undefined) eff.coinFlipTargetCategory='creature';
      if(eff.coinFlipTargetOwner===undefined) eff.coinFlipTargetOwner='enemy';
      if(eff.coinFlipSelectionMode===undefined) eff.coinFlipSelectionMode='all';
      if(eff.coinFlipSuccessEffect===undefined) eff.coinFlipSuccessEffect='destroy';
      if(eff.coinFlipSuccessValue===undefined) eff.coinFlipSuccessValue=2;
      if(eff.followUpEnabled===undefined) eff.followUpEnabled=false;
      if(eff.followUpType===undefined) eff.followUpType='buff';
      if(eff.followUpAtk===undefined) eff.followUpAtk=1;
      if(eff.followUpHp===undefined) eff.followUpHp=1;
      if(eff.followUpKeyword===undefined) eff.followUpKeyword='charge';
      if(eff.followUpDuration===undefined) eff.followUpDuration='permanent';
      if(eff.manaTargetOwner===undefined) eff.manaTargetOwner='self';
      if(eff.conjureTargetOwner===undefined) eff.conjureTargetOwner='self';
    });
  });
  if(!c.subtypes) c.subtypes = [];
  if(!c.keywords) c.keywords = [];
  if(c.manaRule===undefined) c.manaRule = '';
  if(c.altEffectEnabled===undefined) c.altEffectEnabled = false;
  if(c.altEffectChance===undefined) c.altEffectChance = 30;
  if(c.altEffectText===undefined) c.altEffectText = '';
  if(c.setLogo===undefined) c.setLogo = '';
  if(c.foil===undefined) c.foil = false;
  if(c.extraCostEnabled===undefined) c.extraCostEnabled = false;
  if(c.extraCostType===undefined) c.extraCostType = 'sacrificeCreature';
  if(c.extraCostAmount===undefined) c.extraCostAmount = 1;
  if(c.extraCostCustom===undefined) c.extraCostCustom = '';
  if(c.imagePosX===undefined) c.imagePosX = 50;
  if(c.imagePosY===undefined) c.imagePosY = 50;
  if(c.imageZoom===undefined) c.imageZoom = 100;
  if(c.classSecondary===undefined) c.classSecondary = '';
  if(!c.heroMultiClass) c.heroMultiClass = {enabled:false, allowedClasses:[], maxCount:6, scope:'Toutes'};
  if(!c.class) c.class = 'Neutre';
  if(!c.rarity) c.rarity = 'Commune';
  if(!c.type || !CARD_TYPES.includes(c.type)) c.type = 'Créature';
  if(c.manualText===undefined) c.manualText = false;
  if(c.image===undefined) c.image = '';
  if(c.set===undefined) c.set = '';
  if(c.hero===undefined) c.hero = '';
  if(c.text===undefined) c.text = '';
  return c;
}

/* ============================================================
   STOCKAGE — wrapper localStorage partagé par les trois outils
   ============================================================ */
async function storageGet(key){
  try{
    const raw = localStorage.getItem(key);
    return raw===null ? null : {value: raw};
  }catch(e){ return null; }
}
async function storageSet(key, value){
  try{
    localStorage.setItem(key, value);
    return {value};
  }catch(e){ console.error('localStorage indisponible', e); return null; }
}

/* ============================================================
   SETS DE CARTES — ANCIEN SYSTÈME LOCAL (localStorage)
   ============================================================
   Le catalogue de cartes vit maintenant dans Supabase (tables
   card_sets / cards, voir spellcraft-catalog.js). Les fonctions
   ci-dessous ne servent plus qu'à UNE CHOSE : relire les anciennes
   données locales (si elles existent) pour les migrer vers Supabase
   une seule fois. Rien d'autre ne doit plus les utiliser.
   ============================================================ */
const LOCAL_SETS_INDEX_KEY = 'spellcraft-sets-index';
function localSetCardsKey(setId){ return `spellcraft-cards-set-${setId}`; }

function slugifySetName(name){
  const base = (name||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return base || ('set-' + Date.now());
}

async function loadLocalSetsIndex(){
  try{
    const res = await storageGet(LOCAL_SETS_INDEX_KEY);
    return res && res.value ? JSON.parse(res.value) : [];
  }catch(e){ return []; }
}
async function loadLocalSetCards(setId){
  try{
    const res = await storageGet(localSetCardsKey(setId));
    const cards = res && res.value ? JSON.parse(res.value) : [];
    cards.forEach(migrateCard);
    return cards;
  }catch(e){ return []; }
}
// ancien format à clé unique, encore plus vieux que le système de sets local
async function loadLegacyMonolithicCards(){
  let legacy = [];
  try{
    const res = await storageGet('spellcraft-cards-v2');
    legacy = res && res.value ? JSON.parse(res.value) : [];
  }catch(e){ legacy = []; }
  legacy.forEach(migrateCard);
  return legacy;
}

/* ============================================================
   SYSTÈME SONORE — effets sonores (sfx/) et musique de fond (music/)
   ============================================================ */
const SFX_VARIANTS = {
  coin: ['coin-1','coin-2','coin-3'],
  draw: ['draw-1','draw-2'],
};
let sfxMuted = false;
let musicVolumeLevel = 0.7;
let sfxVolumeLevel = 0.7;
try { sfxMuted = localStorage.getItem('sfxMuted') === 'true'; } catch(e){}
try { const v = parseFloat(localStorage.getItem('musicVolumeLevel')); if(!isNaN(v)) musicVolumeLevel = v; } catch(e){}
try { const v = parseFloat(localStorage.getItem('sfxVolumeLevel')); if(!isNaN(v)) sfxVolumeLevel = v; } catch(e){}

function setSfxMuted(muted){
  sfxMuted = muted;
  try { localStorage.setItem('sfxMuted', muted ? 'true' : 'false'); } catch(e){}
  if(muted) stopMusic();
}
function setMusicVolumeLevel(v){
  musicVolumeLevel = Math.max(0, Math.min(1, v));
  try { localStorage.setItem('musicVolumeLevel', musicVolumeLevel); } catch(e){}
  if(currentMusicAudio) currentMusicAudio.volume = musicVolumeLevel * (currentMusicBaseVolume||0.4);
}
function setSfxVolumeLevel(v){
  sfxVolumeLevel = Math.max(0, Math.min(1, v));
  try { localStorage.setItem('sfxVolumeLevel', sfxVolumeLevel); } catch(e){}
}

// Joue un effet sonore ponctuel depuis sfx/. Si `key` correspond à une famille
// de variantes (ex: 'coin', 'draw'), une variante est choisie au hasard à
// chaque appel pour éviter la répétition exacte du même son.
function playSfx(key, volume=0.6){
  if(sfxMuted || !key) return;
  try{
    let file = key;
    if(SFX_VARIANTS[key]){
      const arr = SFX_VARIANTS[key];
      file = arr[Math.floor(Math.random()*arr.length)];
    }
    const audio = new Audio(`sfx/${file}.mp3`);
    audio.volume = volume * sfxVolumeLevel;
    audio.play().catch(()=>{});
  }catch(e){}
}

let currentMusicAudio = null;
let currentMusicBaseVolume = 0.4;
let musicGeneration = 0;

// Musique simple, en boucle (ex: musique de la boutique).
function playMusic(name, {loop=true, volume=0.4}={}){
  if(sfxMuted) return;
  stopMusic();
  currentMusicBaseVolume = volume;
  try{
    currentMusicAudio = new Audio(`music/${name}.ogg`);
    currentMusicAudio.loop = loop;
    currentMusicAudio.volume = volume * musicVolumeLevel;
    currentMusicAudio.play().catch(()=>{});
  }catch(e){}
}

// Relais aléatoire entre plusieurs pistes : quand l'une se termine, une autre
// (différente de la précédente si possible) prend le relais automatiquement.
const COMBAT_MUSIC_POOL = ['combat-1','combat-2','combat-3','combat-4'];
let lastCombatTrack = null;
function playCombatMusicRotation(volume=0.35){
  if(sfxMuted) return;
  stopMusic();
  currentMusicBaseVolume = volume;
  const myGen = ++musicGeneration;
  const playNext = ()=>{
    if(myGen !== musicGeneration) return; // une autre musique a pris le relais depuis
    let choices = COMBAT_MUSIC_POOL.filter(t=>t!==lastCombatTrack);
    if(choices.length===0) choices = COMBAT_MUSIC_POOL;
    const track = choices[Math.floor(Math.random()*choices.length)];
    lastCombatTrack = track;
    try{
      const audio = new Audio(`music/${track}.ogg`);
      audio.loop = false;
      audio.volume = volume * musicVolumeLevel;
      audio.addEventListener('ended', playNext);
      audio.play().catch(()=>{});
      currentMusicAudio = audio;
    }catch(e){}
  };
  playNext();
}

function stopMusic(){
  musicGeneration++; // invalide toute rotation de musique de combat en cours
  if(currentMusicAudio){
    try{ currentMusicAudio.pause(); currentMusicAudio.currentTime = 0; }catch(e){}
    currentMusicAudio = null;
  }
}
// Coupe la musique en cours pour jouer un son "final" (victoire/défaite) par-dessus.
function playFinalSfx(key, volume=0.8){
  stopMusic();
  playSfx(key, volume);
}

/* ---------- Menu d'options (icône engrenage, en haut à droite de chaque page) ---------- */
function injectOptionsMenu(){
  if(document.getElementById('sc-options-gear')) return; // déjà injecté
  const style = document.createElement('style');
  style.textContent = `
    #sc-options-gear{position:fixed;top:10px;right:10px;z-index:99999;width:46px;height:46px;border-radius:50%;
      background:rgba(23,19,37,.85);border:1px solid rgba(212,175,55,.45);cursor:pointer;padding:0;
      display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.4);transition:transform .15s;}
    #sc-options-gear:hover{transform:rotate(25deg);border-color:#d4af37;}
    #sc-options-gear img{width:26px;height:26px;pointer-events:none;}
    #sc-options-gear .sc-gear-icon{width:26px;height:26px;background-color:#fff;-webkit-mask-image:url('images/gear.png');mask-image:url('images/gear.png');-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;pointer-events:none;}
    #sc-options-modal{display:none;position:fixed;top:62px;right:10px;z-index:99999;
      background:rgba(15,12,20,.97);border:1px solid #d4af37;border-radius:12px;padding:16px 18px;width:230px;
      box-shadow:0 12px 34px rgba(0,0,0,.6);font-family:'Inter',sans-serif;color:#f2ead2;}
    #sc-options-modal.show{display:block;}
    #sc-options-modal .sc-opt-title{font-family:'Cinzel',serif;font-weight:700;color:#d4af37;margin-bottom:12px;font-size:14px;}
    #sc-options-modal label.sc-opt-label{display:block;font-size:11.5px;color:#c8beb0;margin-bottom:5px;text-transform:uppercase;letter-spacing:.3px;}
    #sc-options-modal input[type=range]{width:100%;margin-bottom:14px;accent-color:#d4af37;}
    #sc-options-modal .sc-opt-mute{display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer;padding-top:2px;border-top:1px solid rgba(212,175,55,.2);padding-top:10px;}
  `;
  document.head.appendChild(style);

  const gear = document.createElement('button');
  gear.id = 'sc-options-gear';
  gear.title = 'Options';
  gear.innerHTML = `<span class="sc-gear-icon"></span>`;

  const modal = document.createElement('div');
  modal.id = 'sc-options-modal';
  modal.innerHTML = `
    <div class="sc-opt-title">Options audio</div>
    <label class="sc-opt-label">Musique</label>
    <input type="range" id="sc-music-vol-slider" min="0" max="100" value="${Math.round(musicVolumeLevel*100)}">
    <label class="sc-opt-label">Effets sonores</label>
    <input type="range" id="sc-sfx-vol-slider" min="0" max="100" value="${Math.round(sfxVolumeLevel*100)}">
    <label class="sc-opt-mute">
      <input type="checkbox" id="sc-mute-checkbox" ${sfxMuted?'checked':''}> Tout couper
    </label>
  `;

  document.body.appendChild(gear);
  document.body.appendChild(modal);

  gear.onclick = (e)=>{ e.stopPropagation(); modal.classList.toggle('show'); };
  document.addEventListener('click', (e)=>{
    if(modal.classList.contains('show') && !modal.contains(e.target) && e.target!==gear){
      modal.classList.remove('show');
    }
  });
  document.getElementById('sc-music-vol-slider').oninput = (e)=>setMusicVolumeLevel(e.target.value/100);
  document.getElementById('sc-sfx-vol-slider').oninput = (e)=>setSfxVolumeLevel(e.target.value/100);
  document.getElementById('sc-mute-checkbox').onchange = (e)=>setSfxMuted(e.target.checked);
}
document.addEventListener('DOMContentLoaded', injectOptionsMenu);
