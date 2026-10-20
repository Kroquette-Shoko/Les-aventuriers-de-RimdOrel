/* ============================================================
   MOTEUR DU TUTORIEL SCRIPTÉ (version 2 — partie complète, 5 tours)
   ============================================================
   Rejoue un scénario fixe en réutilisant 100% du rendu et des
   interactions du vrai plateau ci-dessus. Aucune requête réseau :
   toutes les fonctions gs*() utilisées par l'interface sont
   réécrites ici (réaffectation d'une fonction globale : JS résout
   un nom de fonction libre au moment de l'appel, donc les appels
   existants plus haut pointent déjà vers ces nouvelles versions).

   Principe : chaque étape (voir TUT_STEPS plus bas) décrit
   - le texte de narration et les éléments à mettre en surbrillance ;
   - ce qu'elle attend du joueur (champ "expect") et ce qui se passe
     quand il le fait (champ "run") ;
   - ou, pour le tour de l'adversaire, ce que l'IA scriptée joue
     (champ "ai").
   Toute autre action du joueur est refusée avec un petit message.

   Scénario (Kyzïre contre Sandroska, PV 20 / 18) :
   T1  pouvoir du héros, créature à Charge, attaque non bloquée,
       jouer APRÈS le combat, pose d'un piège.
   T2  gestion du mana avec le piège, attaque bloquée, piège
       déclenché, défausse adverse, journal.
   T3  artefact (Hache de guerre naine) : Initiative + Brutalité.
   T4  créature à Armure ; l'adversaire attaque : blocage de la
       créature Toxique, impossible de bloquer le Vol.
   T5  attaque contre une créature Tenace, puis sortilège final.
   ============================================================ */

// ---------------- Petit style additionnel ----------------
(function(){
  const st = document.createElement('style');
  st.textContent = `
    .tut-arrow{position:fixed;z-index:99997;font-size:30px;line-height:1;color:var(--gold);text-shadow:0 0 10px rgba(0,0,0,.85);pointer-events:none;animation:tutArrowBounce 1s ease-in-out infinite;}
    @keyframes tutArrowBounce{0%,100%{transform:translate(-50%,0);}50%{transform:translate(-50%,-12px);}}
    .phase-bar-stack{display:flex;flex-direction:column;align-items:stretch;gap:8px;}
    .phase-bar-subrow{display:flex;gap:8px;justify-content:flex-end;}
  `;
  document.head.appendChild(st);
})();

const tutSleep = ms => new Promise(r=>setTimeout(r, ms));

// ---------------- Cartes du tutoriel ----------------
// Vraies cartes de la base Supabase (table public.cards), "Édition de
// base" : Kyzïre joue des cartes Volonté (+ une carte Neutre), Sandroska
// des cartes Arcane/Crépuscule. Aucune carte du set "Conjuration".
function mkTutCard(o){ return Object.assign({ class:'Neutre', keywords:[], subtypes:[] }, o); }

const T_P1_HERO = {
  name:'Kyzïre', type:'Héros', class:'Volonté',
  image:'https://wa-cdn.nyc3.cdn.digitaloceanspaces.com/user-data/production/207996a7-0a7c-4e56-8ad6-619774f27628/uploads/images/d6d300e776d0c9b3086795a4514f3466.jpeg',
  imagePosX:60, imagePosY:3, imageZoom:125,
  emotes:[
    {"id":"em_1786540705955_175","image":"images/Emote/kyzire-hi.png","label":"Salut"},
    {"id":"em_1786540706541_813","image":"images/Emote/kyzire-chill.png","label":"Chill"},
    {"id":"em_1786540706991_55","image":"images/Emote/kyzire-sleep.png","label":"Sleep"},
    {"id":"em_1786540707527_732","image":"images/Emote/kyzire-what.png","label":"Quoi?"},
    {"id":"em_1786540708011_619","image":"images/Emote/kyzire-angry.png","label":"Colère"},
    {"id":"em_1786540708543_689","image":"images/Emote/kyzire-cry.png","label":"Tristesse"}
  ]
};
const T_P2_HERO = {
  name:'Sandroska', type:'Héros', class:'Crépuscule',
  image:'https://i.postimg.cc/fR5B7Yjd/609d3219-ab66-4e24-aebf-590c6babaf9e.jpg',
  imagePosX:50, imagePosY:23, imageZoom:225,
  emotes:[
    {"id":"em_1786491147823_181","image":"images/Emote/sandroska-hi.png","label":"Salut"},
    {"id":"em_1786493527387_6","image":"images/Emote/sandroska-chill.png","label":"Chill"},
    {"id":"em_1786493534209_814","image":"images/Emote/sandroska-what.png","label":"Question"},
    {"id":"em_1786493535353_954","image":"images/Emote/sandroska-angry.png","label":"Colère"},
    {"id":"em_1786493536617_528","image":"images/Emote/sandroska-cry.png","label":"Tristesse"},
    {"id":"em_1786493538169_433","image":"images/Emote/sandroska-sleep.png","label":"Dormir"}
  ]
};
const T_REGION_P1 = {
  name:'Sentier de la gloire', type:'Région', class:'Volonté',
  image:'https://i.pinimg.com/736x/d2/ca/8f/d2ca8f184d4b0c9225975142a4c9ebb7.jpg',
  imagePosX:50, imagePosY:50, imageZoom:100
};
const T_REGION_P2 = {
  name:'Cimetière oublié', type:'Région', class:'Crépuscule',
  image:'https://i.pinimg.com/1200x/e5/ad/bc/e5adbce20d8557ed3a53cd178dc4855c.jpg',
  imagePosX:50, imagePosY:50, imageZoom:100
};
const T_CARDBACK_URL = 'images/card/back/dos-de-carte-base.png';

// ---- Cartes du joueur (Kyzïre) ----
const T_P1_C1 = mkTutCard({
  instId:'t-p1-c1', name:'Gobelin inconscient', type:'Créature', class:'Volonté',
  cost:1, atk:2, hp:1, curAtk:2, curHp:1, keywords:['charge'], subtypes:['Gobelin','Guerrier'],
  image:'https://i.pinimg.com/1200x/7d/38/df/7d38df7947c57ba5a16a9c9ee073d3de.jpg',
  imagePosX:50, imagePosY:50, imageZoom:100
});
const T_P1_C2 = mkTutCard({
  instId:'t-p1-c2', name:'Chevaucheuse de requin des sables', type:'Créature', class:'Volonté',
  cost:3, atk:4, hp:3, curAtk:4, curHp:3, keywords:['charge'],
  image:'https://i.pinimg.com/1200x/0f/fb/01/0ffb01d6a1791d88e2e7459127c522c7.jpg',
  imagePosX:50, imagePosY:50, imageZoom:100
});
const T_P1_TRAP = mkTutCard({
  instId:'t-p1-trap', name:'Frappe preventive', type:'Piège', class:'Volonté',
  cost:1, text:"Avant qu'une créature alliée ne combatte, infligez 3 dégâts à la créature qu'elle va affronter.",
  image:'https://i.pinimg.com/736x/4e/4c/8e/4e4c8eaad6100d2fdd4ebf08d0a5753e.jpg',
  imagePosX:50, imagePosY:45, imageZoom:131
});
// Hache de guerre naine : "abilities" copié tel quel depuis la vraie carte
// pour réutiliser l'interface réelle d'activation et de ciblage.
const T_P1_ARTIFACT = mkTutCard({
  instId:'t-p1-artifact', name:'Hache de guerre naine', type:'Artefact', class:'Volonté',
  cost:6, charges:3,
  text:'Activez (gratuit) : une créature alliée désignée gagne +4/+0, Perçant et Initiative.',
  image:'https://i.pinimg.com/1200x/a1/60/e9/a160e90602996d31136c8edc037ec311.jpg',
  imagePosX:50, imagePosY:50, imageZoom:100,
  abilities:[
    {
      "id":"row_1785368646230_65618", "kind":"triggered", "chainMode":"sequential",
      "effects":[
        {"id":"row_1785368646230_15972","effectType":"buff","usesTarget":"row_1785368663311_537","valueFixed":4,"setStatsAtk":1,"setStatsHp":1},
        {"id":"row_1785368675479_51846","effectType":"grantKeyword","usesTarget":"row_1785368663311_537","grantKeywordKey":"pierce","grantKeywordDuration":"permanent"},
        {"id":"row_1785368693428_64340","effectType":"grantKeyword","usesTarget":"row_1785368663311_537","grantKeywordKey":"initiative","grantKeywordDuration":"permanent"}
      ],
      "targets":[
        {"id":"row_1785368663311_537","countMode":"fixed","countFixed":1,"targetOwner":"ally","selectionMode":"chosen","targetCategory":"creature"}
      ],
      "triggers":[
        {"id":"row_1785368646230_83889","trigger":"activated","useCount":3,"activationCost":0,"activationCooldown":1}
      ]
    }
  ]
});
// Bandit des marais Aral'Anak — Créature Neutre, 2 mana, 2/2, Armure
const T_P1_C3 = mkTutCard({
  instId:'t-p1-c3', name:"Bandit des marais Aral'Anak", type:'Créature', class:'Neutre',
  cost:2, atk:2, hp:2, curAtk:2, curHp:2, keywords:['armor'],
  image:'https://i.pinimg.com/736x/f7/2e/1a/f72e1af4727445a721c7a345b2e2947e.jpg',
  imagePosX:50, imagePosY:50, imageZoom:100
});
const T_P1_SPELL = mkTutCard({
  instId:'t-p1-spell', name:'Découper', type:'Sortilège', class:'Volonté',
  cost:1, text:'Infligez 2 dégâts à un héros ou une créature ennemie désignée.',
  effect:{ type:'damage', targetOwner:'enemy', amount:2, valueFixed:2 },
  image:'https://i.pinimg.com/1200x/13/6f/f0/136ff0c88f888f7ed8c71d300682e9aa.jpg',
  imagePosX:50, imagePosY:50, imageZoom:100
});

// ---- Cartes de l'adversaire (Sandroska) ----
const T_P2_FORGE = mkTutCard({
  instId:'t-p2-c1', name:'Forge-sort', type:'Créature', class:'Arcane',
  cost:2, atk:1, hp:1, curAtk:1, curHp:1, keywords:[],
  image:'https://i.pinimg.com/1200x/9b/f0/45/9bf045ecf28f0bc6a68d99e4cc98a617.jpg',
  imagePosX:50, imagePosY:24, imageZoom:100
});
const T_P2_TRAQUEUR = mkTutCard({
  instId:'t-p2-c2', name:'Traqueur infatigable', type:'Créature', class:'Crépuscule',
  cost:3, atk:3, hp:5, curAtk:3, curHp:5, keywords:[],
  image:'https://i.pinimg.com/1200x/7f/fc/2d/7ffc2d4203cfb12bf770411ffc08e3a4.jpg',
  imagePosX:50, imagePosY:50, imageZoom:100
});
const T_P2_HORREUR = mkTutCard({
  instId:'t-p2-c3', name:'Horreur reptilienne', type:'Créature', class:'Crépuscule',
  cost:2, atk:1, hp:2, curAtk:1, curHp:2, keywords:['toxic'],
  image:'https://i.pinimg.com/1200x/0c/4f/6e/0c4f6e85d07a57fbb6818b8542802d68.jpg',
  imagePosX:50, imagePosY:50, imageZoom:115
});
const T_P2_PHALENE = mkTutCard({
  instId:'t-p2-c4', name:'Phalène lunaire', type:'Créature', class:'Arcane',
  cost:3, atk:1, hp:5, curAtk:1, curHp:5, keywords:['flying'],
  image:'https://i.pinimg.com/1200x/e6/29/fd/e629fdf3d896d569a7af01de95dcd4a4.jpg',
  imagePosX:50, imagePosY:50, imageZoom:100
});
const T_P2_CADAVRE = mkTutCard({
  instId:'t-p2-c5', name:'Cadavre ambulant', type:'Créature', class:'Crépuscule',
  cost:1, atk:1, hp:1, curAtk:1, curHp:1, keywords:['relentless'], subtypes:['Zombie'],
  image:'https://i.pinimg.com/1200x/2b/9a/cc/2b9acc68f5f8aa958ba080c301c506b2.jpg',
  imagePosX:50, imagePosY:10, imageZoom:100
});

const TUT_ALL_CARDS = [T_P1_C1, T_P1_C2, T_P1_TRAP, T_P1_ARTIFACT, T_P1_C3, T_P1_SPELL,
  T_P2_FORGE, T_P2_TRAQUEUR, T_P2_HORREUR, T_P2_PHALENE, T_P2_CADAVRE];
const TUT_BY_ID = {};
TUT_ALL_CARDS.forEach(c=>{ TUT_BY_ID[c.instId] = c; });
function tutFresh(card){ return Object.assign({}, TUT_BY_ID[card.instId] || card); }

function tutBuildInitialState(){
  return {
    phase:'main', active:'p1', turn:1, gameOver:false, winnerKey:null, matchSummary:null,
    pendingSacrifice:null, pendingDiscover:null, pendingKeywordChoice:null,
    __gameLog:[],
    p1:{
      // PV scriptés (consigne du tutoriel) : 20 pour Kyzïre, 18 pour
      // Sandroska — ramenés à 14 dès la première étape par le pouvoir
      // passif de Kyzïre (4 dégâts). Le total est calculé pour que le
      // sortilège final soit exactement mortel (voir tutDamageNotes).
      hero:T_P1_HERO, region:T_REGION_P1, hp:20,
      manaNormal:2, manaNormalMax:2, manaFragile:0,
      hand:[ tutFresh(T_P1_C1), tutFresh(T_P1_TRAP) ],
      deck: Array.from({length:12}, (_,i)=>({ instId:'t-p1-deck-'+i })),
      board:[], relics:[], discard:[], attackers:[],
      cardBackUrl:T_CARDBACK_URL, isAI:false, attackPhaseDone:false, mulliganDone:true, showHandToSpectators:false
    },
    p2:{
      hero:T_P2_HERO, region:T_REGION_P2, hp:18,
      manaNormal:0, manaNormalMax:0, manaFragile:0,
      hand:[ tutFresh(T_P2_FORGE), tutFresh(T_P2_TRAQUEUR), tutFresh(T_P2_HORREUR), tutFresh(T_P2_PHALENE), tutFresh(T_P2_CADAVRE) ],
      deck: Array.from({length:12}, (_,i)=>({ instId:'t-p2-deck-'+i })),
      board:[], relics:[], discard:[], attackers:[],
      cardBackUrl:T_CARDBACK_URL, isAI:true, attackPhaseDone:false, mulliganDone:true, showHandToSpectators:false
    }
  };
}
// Bilan des dégâts sur Sandroska : 18 -4 (pouvoir de Kyzïre) = 14 ;
// -2 (Gobelin, T1) = 12 ; -3 (Brutalité, T3) = 9 ; -7 (Brutalité, T5) = 2 ;
// -2 (Découper, T5) = 0.

// ---------------- Petits utilitaires d'état ----------------
// Le tutoriel parle au plateau EXACTEMENT comme le serveur : chaque entrée du journal et chaque
// événement de combat porte un numéro `seq` (même compteur), et chaque mise à jour est un NOUVEL
// objet d'état (copie) envoyé à onStateUpdate. Le plateau rejoue alors tout seul les animations
// du vrai jeu (pose des créatures, chocs de combat, dégâts au héros, morts, icônes de mots-clés...).
let __tutSeq = 0;
function tutLog(entry){
  if(!S.__gameLog) S.__gameLog = [];
  const seq = ++__tutSeq;
  S.__gameLog.push(Object.assign({ turn: S.turn||1, seq }, entry));
  return seq;
}
// Événement de combat structuré (chiffres exacts) : blockResolved / heroDamage.
function tutCombatEvent(ev){
  if(!S.__combatEvents) S.__combatEvents = [];
  const seq = ++__tutSeq;
  S.__combatEvents.push(Object.assign({ turn: S.turn||1, seq }, ev));
  return seq;
}
// Copie de l'état courant à envoyer au plateau (numérotée : le plateau ignore les états plus anciens).
function tutSnapshot(){
  S.__rev = (S.__rev||0) + 1;
  return JSON.parse(JSON.stringify(S));
}
function tutPush(){ onStateUpdate(tutSnapshot()); }
// Le tutoriel modifie l'état « en place » avant de l'envoyer : le plateau ne peut donc pas retrouver
// l'état d'AVANT (PREV_S) tout seul. On garde une copie du dernier état traité et on la lui rend,
// pour que les animations qui comparent avant / après (mort du héros, plateau intermédiaire...) marchent.
let __tutBaseline = null;
const __tutOrigStateTail = finishStateUpdateTail;
finishStateUpdateTail = function(state){
  if(__tutBaseline) PREV_S = __tutBaseline;
  __tutOrigStateTail(state);
  __tutBaseline = JSON.parse(JSON.stringify(state));
};
// Attend la fin des animations en cours (jamais plus de 20 s), puis une courte pause (vitesse du joueur respectée).
async function tutWaitAnimations(pauseMs){
  const t0 = Date.now();
  await tutSleep(60);
  while(animationsBusy() && Date.now()-t0 < 20000) await tutSleep(80);
  if(pauseMs) await tutSleep(cms(pauseMs));
}
// Étape intermédiaire d'un tour scripté : on affiche l'état, on laisse jouer les animations, on marque une pause.
async function tutPushAndWait(pauseMs){ tutPush(); await tutWaitAnimations(pauseMs); }
// Pose d'une créature à l'emplacement choisi par le joueur (même convention que le serveur :
// 'start' = tout à gauche, un instId = juste après cette créature, rien = tout à droite).
function tutPlaceCreature(key, creature, placeAfter){
  const board = S[key].board;
  let at = board.length;
  if(placeAfter === 'start') at = 0;
  else if(placeAfter){
    const k = board.findIndex(c=>c.instId===placeAfter);
    if(k >= 0) at = k + 1;
  }
  board.splice(at, 0, creature);
}
function tutHasKw(c, k){ return !!(c.keywords && c.keywords.includes(k)); }
function tutCanAttack(c){
  return !c.hasAttacked && (!c.summonSick || tutHasKw(c, 'charge'));
}
function tutRemoveFromBoard(key, c){
  const p = S[key];
  p.board = p.board.filter(x=>x.instId!==c.instId);
}
// Dégâts au héros : ligne du journal + événement de combat (les chiffres que le plateau anime).
function tutHeroHit(heroKey, hits){
  const total = hits.reduce((n,h)=>n + (h.dmg||0) + (h.pierceExcess||0), 0);
  if(total <= 0) return;
  tutLog({ ownerKey:heroKey, raw:`{who} a perdu ${total} point${total>1?'s':''} de vie dans cette attaque`, highlightIds:hits.map(h=>h.instId) });
  tutCombatEvent({ combatEvent:'heroDamage', ownerKey:heroKey, heroOwner:heroKey, total, attackers:hits });
}
// Mort d'une créature : retirée du plateau, carte "neuve" en défausse.
function tutKill(key, c){
  tutRemoveFromBoard(key, c);
  S[key].discard.push(tutFresh(c));
  // Même forme qu'une mort dans le journal du serveur : c'est elle qui déclenche la dissolution de la carte.
  return tutLog({ ownerKey:key, cardName:c.name, cardId:c.instId, deadInstId:c.instId,
    effects:[{ text:'meurt au combat', targetInstIds:[] }] });
}
function tutDrawTo(key, card){
  const p = S[key];
  if(p.deck.length) p.deck.pop();
  if(card) p.hand.push(tutFresh(card));
}
// Début du tour du joueur : mana, pioche, fin du mal d'invocation.
function tutStartP1Turn(mana, drawnCard){
  S.active = 'p1';
  S.phase = 'main';
  S.turn = (S.turn||1) + 1;
  const me = S.p1;
  me.attackPhaseDone = false;
  me.attackers = [];
  me.board.forEach(c=>{ c.summonSick = false; c.hasAttacked = false; c.hasBlockedThisTurn = false; });
  me.relics.forEach(r=>{ r._activatedThisTurn = false; });
  me.manaNormalMax = mana; me.manaNormal = mana;
  tutDrawTo('p1', drawnCard);
}
function tutStartP2Turn(mana){
  S.active = 'p2';
  S.phase = 'main';
  const ai = S.p2;
  ai.board.forEach(c=>{ c.summonSick = false; c.hasBeenBlocked = false; });
  ai.manaNormalMax = mana; ai.manaNormal = mana;
  S.p1.attackPhaseDone = false;
  S.p1.board.forEach(c=>{ c.hasBlockedThisTurn = false; });
}
function tutAiPlay(card){
  const ai = S.p2;
  const idx = ai.hand.findIndex(c=>c.instId===card.instId);
  if(idx>=0) ai.hand.splice(idx,1);
  tutPlaceCreature('p2', Object.assign(tutFresh(card), { summonSick:true }));
  ai.manaNormal -= card.cost;
  if(ai.deck.length) ai.deck.pop();
  tutLog({ ownerKey:'p2', cardName:card.name, cardId:card.instId, kind:'play', sourceInstId: card.type==='Créature' ? card.instId : undefined, effects:[] });
}
function tutPlayerPlay(card, i){
  const me = S.p1;
  me.hand.splice(i, 1);
  me.manaNormal -= card.cost;
  tutLog({ ownerKey:'p1', cardName:card.name, cardId:card.instId, kind:'play', sourceInstId: card.type==='Créature' ? card.instId : undefined, effects:[] });
}

// ---------------- Script des étapes ----------------
const TUT_STEPS_INFO = {};
const TUT_STEP_ORDER = [];
function defStep(o){ TUT_STEP_ORDER.push(o.id); TUT_STEPS_INFO[o.id] = o; }
function tutNextId(id){ const i = TUT_STEP_ORDER.indexOf(id); return TUT_STEP_ORDER[i+1] || null; }
function tutNext(){ const n = tutNextId(TUT.step); if(n) tutSetStep(n); }

const SEL_COMBAT = '#phase-bar button:first-child';
const SEL_COMBAT_BTN = '#phase-bar [data-tut="combat"]';
const SEL_ENDTURN_BTN = '#phase-bar [data-tut="endturn"]';
const SEL_CONFIRM_BTN = '#phase-bar [data-tut="confirm"]';

// ---------- TOUR 1 ----------
defStep({ id:'heroPower', title:'Le pouvoir du héros',
  text:"Chaque héros a un pouvoir. Celui de Kyzïre est passif : il se déclenche tout seul et inflige 4 dégâts au héros ennemi dès le début de la partie. D'autres héros ont un pouvoir à activer en payant du mana, en cliquant sur leur portrait. Cliquez sur « Continuer ».",
  continueBtn:true, highlight:['#hero-frame-p1','#hero-frame-p2'],
  onContinue(){
    S.p2.hp = Math.max(0, S.p2.hp - 4);
    tutLog({ ownerKey:'p1', cardName:T_P1_HERO.name, cardId:'tut-hero-p1', kind:'hero_trigger',
      effects:[{ text:'infligez 4 dégâts au héros ennemi', targetInstIds:[] }] });
  }
});
defStep({ id:'intro1', title:'Bienvenue !',
  text:"En bas, c'est vous : Kyzïre, avec ses 20 points de vie (le chiffre sur son portrait), votre main et votre plateau. En haut, c'est Sandroska, votre adversaire. Un héros tombé à 0 point de vie perd la partie. Suivez les instructions affichées ici, en haut.",
  continueBtn:true, highlight:['#hero-frame-p1','#hero-frame-p2'] });
defStep({ id:'intro2', title:'Le mana',
  text:"À côté de votre héros : votre mana. Chaque carte coûte du mana pour être jouée. Votre réserve se remplit entièrement à chaque tour, avec un peu plus de mana que le tour précédent.",
  continueBtn:true, highlight:['#mana-box-p1'] });
defStep({ id:'intro3', title:'Votre main',
  text:"En bas, votre main. Elle contient quatre types de cartes à jouer : Créature (elle combat), Sortilège (effet immédiat, puis la carte part en défausse), Artefact (reste en jeu et s'utilise plusieurs fois) et Piège (posé à l'avance, il se déclenche tout seul). Survolez une carte pour l'agrandir.",
  continueBtn:true, highlight:['#hand-p1'] });
defStep({ id:'playC1', title:'Jouez votre première créature',
  text:"Gobelin inconscient : Créature à 1 mana (2 attaque / 1 point de vie) avec le mot-clé Charge. Une créature doit normalement attendre le tour suivant pour attaquer (elle « dort », ZZZ) ; avec Charge, elle peut attaquer dès qu'elle est posée. Glissez-la de votre main jusqu'au plateau.",
  highlight:['[data-instid="t-p1-c1"]'],
  expect:{ kind:'play', card:'t-p1-c1' },
  run(info){
    tutPlayerPlay(info.card, info.i);
    tutPlaceCreature('p1', Object.assign(tutFresh(info.card), { summonSick:true }), info.placeAfter);
    tutNext();
  }
});
defStep({ id:'goToAttack1', title:"Passez à l'attaque",
  text:"Le plateau adverse est vide : votre Gobelin peut attaquer sans être bloqué. Cliquez sur « ⚔ Combat », en bas de l'écran.",
  highlight:[SEL_COMBAT_BTN], onSelecting:'selectAttackers1' });
defStep({ id:'selectAttackers1', title:'Choisissez votre attaquant',
  text:"Cliquez sur le Gobelin inconscient pour le désigner comme attaquant, puis sur « Valider ». Une créature que personne ne bloque inflige sa force au héros adverse.",
  highlight:['[data-instid="t-p1-c1"]', SEL_CONFIRM_BTN], backTo:'goToAttack1',
  expect:{ kind:'attack', ids:['t-p1-c1'] },
  async run(){
    const g = S.p1.board.find(c=>c.instId==='t-p1-c1');
    tutLog({ ownerKey:'p1', raw:'{who} attaque avec 1 créature', highlightIds:[g.instId] });
    g.hasAttacked = true;
    S.p2.hp = Math.max(0, S.p2.hp - g.curAtk);
    tutHeroHit('p2', [{ instId:g.instId, dmg:g.curAtk, pierceExcess:0 }]);
    S.p1.attackPhaseDone = true;
    S.p1.attackers = [];
    tutNext();
  }
});
defStep({ id:'playTrap', title:'Jouer des cartes après le combat',
  text:"Le Gobelin, non bloqué, a infligé 2 dégâts à Sandroska. Après un combat, vous gardez la main : vous pouvez encore jouer des cartes avant de finir le tour. Glissez Frappe préventive (Piège, 1 mana) sur le plateau pour la poser : la carte reste dans votre main, armée, et aucun mana n'est dépensé.",
  highlight:['[data-instid="t-p1-trap"]'],
  expect:{ kind:'trap', card:'t-p1-trap' },
  run(info){
    info.card.activeTrap = true;
    tutLog({ ownerKey:'p1', cardName:info.card.name, cardId:info.card.instId, kind:'play', effects:[] });
    tutNext();
  }
});
defStep({ id:'trapInfo', title:'Comment fonctionne un piège',
  text:"Un piège armé attend sa condition : ici, qu'une de vos créatures aille combattre. Son coût (1 mana) n'est payé qu'au moment du déclenchement, avec le mana disponible à cet instant : pas assez de mana, pas de déclenchement. Un piège non déclenché avant votre prochain tour se désarme. Cliquez sur « Continuer ».",
  continueBtn:true, highlight:['[data-instid="t-p1-trap"]','#mana-box-p1'] });
defStep({ id:'endTurn1', title:'Terminez votre tour',
  text:"Frappe préventive est armée (badge « Armé »). Cliquez sur « Fin de tour », en bas de l'écran.",
  highlight:[SEL_ENDTURN_BTN],
  expect:{ kind:'endTurn' },
  run(){ tutEndPlayerTurn(); tutNext(); }
});
defStep({ id:'aiTurn1', title:"Tour de l'adversaire",
  text:"Sandroska joue Forge-sort, une créature Arcane à 2 mana (1 attaque / 1 point de vie)...",
  highlight:[],
  async ai(){
    tutStartP2Turn(2);
    tutAiPlay(T_P2_FORGE);
    await tutPushAndWait(700); // la carte se pose et l'on a le temps de la voir avant la suite
    tutStartP1Turn(4, T_P1_C2);
  }
});

// ---------- TOUR 2 ----------
defStep({ id:'playC2', title:'Une deuxième créature',
  text:"Nouveau tour : votre réserve est passée à 4 mana. Vous avez pioché Chevaucheuse de requin des sables (3 mana, 4 attaque / 3 points de vie), elle aussi avec Charge. Glissez-la sur le plateau : en la déposant entre deux créatures (ou à gauche / à droite), vous choisissez son emplacement.",
  highlight:['[data-instid="t-p1-c2"]'],
  expect:{ kind:'play', card:'t-p1-c2' },
  run(info){
    tutPlayerPlay(info.card, info.i);
    tutPlaceCreature('p1', Object.assign(tutFresh(info.card), { summonSick:true }), info.placeAfter);
    tutNext();
  }
});
defStep({ id:'manaTrap', title:'Gardez du mana pour vos pièges',
  text:"Regardez votre mana : il en reste 1, exactement le coût de Frappe préventive. Si vous aviez tout dépensé, le piège n'aurait pas pu se déclencher. À chaque tour, pensez à laisser le mana nécessaire à vos pièges armés. Cliquez sur « Continuer ».",
  continueBtn:true, highlight:['#mana-box-p1','[data-instid="t-p1-trap"]'] });
defStep({ id:'goToAttack2', title:"Passez à l'attaque",
  text:"Attaquez avec votre Chevaucheuse de requin des sables. Cliquez sur « ⚔ Combat ».",
  highlight:[SEL_COMBAT_BTN], onSelecting:'selectAttackers2' });
defStep({ id:'selectAttackers2', title:'Choisissez votre attaquant',
  text:"Cliquez sur la Chevaucheuse de requin des sables, puis validez. Sandroska va bloquer avec Forge-sort : observez ce qui se passe.",
  highlight:['[data-instid="t-p1-c2"]', SEL_CONFIRM_BTN], backTo:'goToAttack2',
  expect:{ kind:'attack', ids:['t-p1-c2'] },
  async run(){
    const chev = S.p1.board.find(c=>c.instId==='t-p1-c2');
    const forge = S.p2.board.find(c=>c.instId==='t-p2-c1');
    const trap = S.p1.hand.find(c=>c.activeTrap);
    chev.hasAttacked = true;
    tutLog({ ownerKey:'p1', raw:'{who} attaque avec 1 créature', highlightIds:[chev.instId] });
    tutLog({ ownerKey:'p2', raw:`{who} bloque la créature "${chev.name}" avec "${forge.name}"`, highlightIds:[chev.instId, forge.instId] });
    forge.hasBeenBlocked = true;
    // Le piège se déclenche AVANT l'échange de coups : son coût (1 mana) est payé maintenant,
    // avec le mana qui restait. Forge-sort meurt avant de combattre : le choc n'a pas lieu.
    S.p1.manaNormal -= trap.cost;
    S.p1.hand.splice(S.p1.hand.indexOf(trap), 1);
    S.p1.discard.push(Object.assign(tutFresh(trap), { activeTrap:false }));
    forge.curHp -= 3;
    const trapSeq = tutLog({ ownerKey:'p1', kind:'trap', cardName:trap.name, cardId:trap.instId, sourceInstId:null,
      effects:[{ text:`inflige 3 dégâts à "${forge.name}"`, targetInstIds:[forge.instId] }] });
    tutKill('p2', forge);
    tutCombatEvent({ combatEvent:'blockResolved', ownerKey:'p2', attackerInstId:chev.instId, blockerInstId:forge.instId,
      dmgToBlocker:0, dmgToAttacker:0, armorAbsorbed:false, armorAbsorbedBlocker:false, armorAbsorbedAttacker:false,
      attackerDied:false, blockerDied:true, combatCancelled:true, clashAfterSeq:trapSeq });
    tutFlash('Frappe préventive se déclenche ! (1 mana payé)');
    S.p1.attackPhaseDone = true;
    S.p1.attackers = [];
    tutNext();
  }
});
defStep({ id:'trapResult', title:'Le piège s\'est déclenché !',
  text:"Sandroska a bloqué avec Forge-sort. Juste avant l'échange de coups, Frappe préventive a payé 1 mana et infligé 3 dégâts : Forge-sort est mort avant de frapper, et votre Chevaucheuse n'a rien subi. Le piège, lui, est parti en défausse. Cliquez sur « Continuer ».",
  continueBtn:true, highlight:['#mana-box-p1','#discard-badge-p1'] });
defStep({ id:'discardOpen', title:'Surveillez la défausse adverse',
  text:"Chaque carte détruite ou utilisée part en défausse, visible de tous. Regarder celle de l'adversaire permet de savoir ce qu'il a déjà joué. Cliquez sur « Défausse » juste à côté du deck adverse, en haut.",
  highlight:['#discard-badge-p2'],
  expect:{ kind:'openDiscard', key:'p2' },
  run(){ tutNext(); }
});
defStep({ id:'discardClose', title:'La défausse adverse',
  text:"Vous y voyez Forge-sort, mort pendant le combat. La vôtre contient Frappe préventive. Certaines cartes peuvent piocher ou ramener une carte depuis la défausse. Fermez la fenêtre avec le bouton prévu.",
  highlight:[],
  expect:{ kind:'closeDiscard' },
  run(){ tutNext(); }
});
defStep({ id:'journalOpen', title:'Le journal',
  text:"Le journal 📜 raconte tout ce qui s'est passé, y compris ce que vous auriez pu manquer. Cliquez sur le bouton 📜 dans les boutons du plateau pour l'ouvrir.",
  highlight:['#journal-toggle-btn'],
  expect:{ kind:'toggleJournal', open:true },
  run(){ tutNext(); }
});
defStep({ id:'journalRead', title:'Lire le journal',
  text:"Le journal se lit de haut en bas : le plus récent est en bas. Un bandeau marque chaque tour (bleu = votre tour, rouge = celui de l'adversaire), et un combat est regroupé dans un seul bloc ⚔. Survolez le nom d'une carte pour la revoir, ou une ligne pour mettre en évidence les créatures concernées. Cliquez sur « Continuer ».",
  continueBtn:true, highlight:['#journal-panel'] });
defStep({ id:'journalClose', title:'Fermez le journal',
  text:"Refermez le journal avec la croix ✕ (ou le même bouton). Vous pourrez le rouvrir à tout moment.",
  highlight:['#journal-panel .close-journal-btn'],
  expect:{ kind:'toggleJournal', open:false },
  run(){ tutNext(); }
});
defStep({ id:'endTurn2', title:'Terminez votre tour',
  text:"Cliquez sur « Fin de tour », en bas de l'écran.",
  highlight:[SEL_ENDTURN_BTN],
  expect:{ kind:'endTurn' },
  run(){ tutEndPlayerTurn(); tutNext(); }
});
defStep({ id:'aiTurn2', title:"Tour de l'adversaire",
  text:"Sandroska joue Traqueur infatigable, une créature Crépuscule à 3 mana (3 attaque / 5 points de vie)...",
  highlight:[],
  async ai(){
    tutStartP2Turn(3);
    tutAiPlay(T_P2_TRAQUEUR);
    await tutPushAndWait(700);
    tutStartP1Turn(6, T_P1_ARTIFACT);
  }
});

// ---------- TOUR 3 ----------
defStep({ id:'playArtifact', title:'Un artefact puissant',
  text:"Nouveau tour : 6 mana. Vous avez pioché Hache de guerre naine, un Artefact. Il reste en jeu (2 au maximum), se paie une seule fois à la pose, puis s'utilise gratuitement une fois par tour tant qu'il lui reste des charges (ici 3). Glissez-le sur le plateau.",
  highlight:['[data-instid="t-p1-artifact"]'],
  expect:{ kind:'play', card:'t-p1-artifact' },
  run(info){
    tutPlayerPlay(info.card, info.i);
    S.p1.relics.push(tutFresh(info.card));
    tutNext();
  }
});
defStep({ id:'activateArtifact', title:"Utilisez l'artefact",
  text:"Cliquez sur la Hache de guerre naine posée, puis désignez votre Chevaucheuse : elle gagne +4 attaque, Brutalité et Initiative. Chaque utilisation retire 1 charge à l'artefact (3 → 2).",
  highlight:['.relic-slot:not(.relic-slot-empty)','[data-instid="t-p1-c2"]'],
  expect:{ kind:'activate', target:'t-p1-c2' },
  run(info){
    const art = S.p1.relics.find(r=>r.instId==='t-p1-artifact');
    const target = info.target;
    target.atk += 4; target.curAtk += 4;
    if(!target.keywords.includes('pierce')) target.keywords.push('pierce');
    if(!target.keywords.includes('initiative')) target.keywords.push('initiative');
    art.charges = Math.max(0, (art.charges||1) - 1);
    art._activatedThisTurn = true;
    tutLog({ ownerKey:'p1', cardName:art.name, cardId:art.instId, kind:'artifact_activate', sourceInstId:art.instId,
      effects:[{ text:`donne +4/+0, Perçant et Initiative à ${target.name}`, targetInstIds:[target.instId] }] });
    tutNext();
  }
});
defStep({ id:'keywordsInfo', title:'Trois mots-clés',
  text:"Charge : peut attaquer dès la pose. Initiative : frappe en premier, et si elle tue sa cible elle ne subit aucun coup en retour. Brutalité : si elle est bloquée, les dégâts en trop passent au héros adverse. Survolez la Chevaucheuse pour les relire. Cliquez sur « Continuer ».",
  continueBtn:true, highlight:['[data-instid="t-p1-c2"]'] });
defStep({ id:'goToAttack3', title:"Passez à l'attaque",
  text:"Votre Chevaucheuse, maintenant à 8 attaque, est prête. Cliquez sur « ⚔ Combat ».",
  highlight:[SEL_COMBAT_BTN], onSelecting:'selectAttackers3' });
defStep({ id:'selectAttackers3', title:'Portez le coup décisif',
  text:"Cliquez sur la Chevaucheuse, puis validez. Face au Traqueur infatigable (5 points de vie), Initiative et Brutalité vont faire toute la différence.",
  highlight:['[data-instid="t-p1-c2"]', SEL_CONFIRM_BTN], backTo:'goToAttack3',
  expect:{ kind:'attack', ids:['t-p1-c2'] },
  async run(){
    const chev = S.p1.board.find(c=>c.instId==='t-p1-c2');
    const tr = S.p2.board.find(c=>c.instId==='t-p2-c2');
    chev.hasAttacked = true;
    tutLog({ ownerKey:'p1', raw:'{who} attaque avec 1 créature', highlightIds:[chev.instId] });
    tutLog({ ownerKey:'p2', raw:`{who} bloque la créature "${chev.name}" avec "${tr.name}"`, highlightIds:[chev.instId, tr.instId] });
    tr.hasBeenBlocked = true;
    // Initiative : la Chevaucheuse frappe la première et tue le Traqueur, qui ne peut donc pas
    // riposter. Brutalité : l'excédent passe au héros.
    const excess = chev.curAtk - tr.curHp;
    tr.curHp -= chev.curAtk;
    tutKill('p2', tr);
    tutCombatEvent({ combatEvent:'blockResolved', ownerKey:'p2', attackerInstId:chev.instId, blockerInstId:tr.instId,
      dmgToBlocker:chev.curAtk, dmgToAttacker:0, armorAbsorbed:false, armorAbsorbedBlocker:false, armorAbsorbedAttacker:false,
      attackerDied:false, blockerDied:true, combatCancelled:false });
    S.p2.hp = Math.max(0, S.p2.hp - excess);
    tutHeroHit('p2', [{ instId:chev.instId, dmg:0, pierceExcess:excess }]);
    S.p1.attackPhaseDone = true;
    S.p1.attackers = [];
    tutNext();
  }
});
defStep({ id:'endTurn3', title:'Combo réussi !',
  text:"Initiative : la Chevaucheuse a tué le Traqueur sans subir de riposte. Brutalité : les 3 dégâts en trop ont frappé Sandroska (12 → 9 PV). Cliquez sur « Fin de tour ».",
  highlight:[SEL_ENDTURN_BTN],
  expect:{ kind:'endTurn' },
  run(){ tutEndPlayerTurn(); tutNext(); }
});
defStep({ id:'aiTurn3', title:"Tour de l'adversaire",
  text:"Sandroska joue Horreur reptilienne (2 mana) et Phalène lunaire (3 mana)...",
  highlight:[],
  async ai(){
    tutStartP2Turn(5);
    tutAiPlay(T_P2_HORREUR);
    await tutPushAndWait(700);
    tutAiPlay(T_P2_PHALENE);
    await tutPushAndWait(700);
    tutStartP1Turn(7, T_P1_C3);
  }
});

// ---------- TOUR 4 ----------
defStep({ id:'playC3', title:'Une créature à Armure',
  text:"Nouveau tour : 7 mana. Bandit des marais Aral'Anak (2 mana, 2/2) a Armure : elle absorbe entièrement le premier dégât qu'elle subit, une seule fois (le bouclier disparaît ensuite). Glissez-le sur le plateau.",
  highlight:['[data-instid="t-p1-c3"]'],
  expect:{ kind:'play', card:'t-p1-c3' },
  run(info){
    tutPlayerPlay(info.card, info.i);
    tutPlaceCreature('p1', Object.assign(tutFresh(info.card), { summonSick:true }), info.placeAfter);
    tutNext();
  }
});
defStep({ id:'enemyInfo', title:'Lisez le plateau adverse',
  text:"Survolez les créatures de Sandroska. Phalène lunaire a Vol : seules des créatures avec Vol ou Portée peuvent la bloquer. Horreur reptilienne est Toxique : toute créature qu'elle blesse meurt. Attaquer maintenant serait risqué. Cliquez sur « Continuer ».",
  continueBtn:true, highlight:['[data-instid="t-p2-c3"]','[data-instid="t-p2-c4"]'] });
defStep({ id:'endTurn4', title:'Rien ne vous oblige à attaquer',
  text:"Vous pouvez finir votre tour sans passer par le combat : gardez vos créatures pour défendre. Cliquez directement sur « Fin de tour ».",
  highlight:[SEL_ENDTURN_BTN],
  expect:{ kind:'endTurn' },
  run(){ tutEndPlayerTurn(); tutNext(); }
});
defStep({ id:'aiTurn4', title:"Tour de l'adversaire",
  text:"Sandroska pose Cadavre ambulant, puis attaque...",
  highlight:[],
  async ai(){
    tutStartP2Turn(6);
    tutAiPlay(T_P2_CADAVRE);
    await tutPushAndWait(900); // on laisse voir la pose avant l'attaque
    const att = S.p2.board.filter(c=>c.instId==='t-p2-c3' || c.instId==='t-p2-c4');
    S.p2.attackers = att.map(c=>c.instId);
    att.forEach(c=>{ c.hasAttacked = true; });
    tutLog({ ownerKey:'p2', raw:'{who} attaque avec 2 créatures', highlightIds:S.p2.attackers.slice() });
    S.phase = 'declareBlockersMe';
  }
});
defStep({ id:'blockHorreur', title:'On vous attaque !',
  text:"Sandroska attaque avec Phalène lunaire (Vol) et Horreur reptilienne (Toxique). Pour bloquer : cliquez sur votre défenseur (Bandit des marais), puis sur l'attaquant à bloquer (Horreur reptilienne). L'Armure du Bandit encaissera le coup Toxique. Vous pourriez aussi ne pas bloquer.",
  highlight:['[data-instid="t-p1-c3"]','[data-instid="t-p2-c3"]'],
  expect:{ kind:'block', blocker:'t-p1-c3', attacker:'t-p2-c3' },
  async run(){
    const bandit = S.p1.board.find(c=>c.instId==='t-p1-c3');
    const horreur = S.p2.board.find(c=>c.instId==='t-p2-c3');
    const phalene = S.p2.board.find(c=>c.instId==='t-p2-c4');
    bandit.hasBlockedThisTurn = true;
    horreur.hasBeenBlocked = true;
    tutLog({ ownerKey:'p1', raw:`{who} bloque la créature "${horreur.name}" avec "${bandit.name}"`, highlightIds:[horreur.instId, bandit.instId] });
    // Armure : le premier dégât (ici le coup Toxique) est absorbé, donc Toxique ne tue pas.
    // Le Bandit riposte et tue Horreur reptilienne.
    bandit.armorUsed = true;
    horreur.curHp -= bandit.curAtk;
    tutKill('p2', horreur);
    tutCombatEvent({ combatEvent:'blockResolved', ownerKey:'p1', attackerInstId:horreur.instId, blockerInstId:bandit.instId,
      dmgToBlocker:0, dmgToAttacker:bandit.curAtk, armorAbsorbed:true, armorAbsorbedBlocker:true, armorAbsorbedAttacker:false,
      attackerDied:true, blockerDied:false, combatCancelled:false });
    // Plus aucune créature ne peut bloquer la Phalène (Vol) : la phase de blocage se termine
    // d'elle-même, les dégâts passent au héros.
    S.p1.hp = Math.max(0, S.p1.hp - phalene.curAtk);
    tutHeroHit('p1', [{ instId:phalene.instId, dmg:phalene.curAtk, pierceExcess:0 }]);
    S.p2.attackers = [];
    S.phase = 'main';
    tutNext();
  }
});
defStep({ id:'blockResult', title:'Résultat du blocage',
  text:"Armure : le Bandit a absorbé l'unique coup de la créature Toxique, il survit et a tué Horreur reptilienne. Aucune de vos créatures n'a Vol ou Portée : la Phalène ne pouvait pas être bloquée, le blocage s'est terminé tout seul et elle vous a infligé 1 dégât. Cliquez sur « Continuer ».",
  continueBtn:true, highlight:['[data-instid="t-p1-c3"]','#hero-frame-p1'],
  onContinue(){ tutStartP1Turn(8, T_P1_SPELL); }
});

// ---------- TOUR 5 ----------
defStep({ id:'goToAttack5', title:'Dernier assaut',
  text:"Nouveau tour : 8 mana. Sandroska n'a plus que Cadavre ambulant, une créature Tenace (elle reste en jeu une fois quand elle devrait mourir), et la Phalène. Attaquez avec votre Chevaucheuse : cliquez sur « ⚔ Combat ».",
  highlight:[SEL_COMBAT_BTN], onSelecting:'selectAttackers5' });
defStep({ id:'selectAttackers5', title:'Choisissez votre attaquant',
  text:"Cliquez sur la Chevaucheuse, puis validez. Sandroska va bloquer avec Cadavre ambulant.",
  highlight:['[data-instid="t-p1-c2"]', SEL_CONFIRM_BTN], backTo:'goToAttack5',
  expect:{ kind:'attack', ids:['t-p1-c2'] },
  async run(){
    const chev = S.p1.board.find(c=>c.instId==='t-p1-c2');
    const cad = S.p2.board.find(c=>c.instId==='t-p2-c5');
    chev.hasAttacked = true;
    tutLog({ ownerKey:'p1', raw:'{who} attaque avec 1 créature', highlightIds:[chev.instId] });
    tutLog({ ownerKey:'p2', raw:`{who} bloque la créature "${chev.name}" avec "${cad.name}"`, highlightIds:[chev.instId, cad.instId] });
    cad.hasBeenBlocked = true;
    const excess = chev.curAtk - cad.curHp;
    tutCombatEvent({ combatEvent:'blockResolved', ownerKey:'p2', attackerInstId:chev.instId, blockerInstId:cad.instId,
      dmgToBlocker:chev.curAtk, dmgToAttacker:0, armorAbsorbed:false, armorAbsorbedBlocker:false, armorAbsorbedAttacker:false,
      attackerDied:false, blockerDied:false, blockerRevived:true, combatCancelled:false });
    S.p2.hp = Math.max(0, S.p2.hp - excess);
    tutHeroHit('p2', [{ instId:chev.instId, dmg:0, pierceExcess:excess }]);
    // Tenace : la créature reste en jeu à pleine Endurance et perd Tenace.
    cad.curHp = cad.hp;
    cad.keywords = cad.keywords.filter(k=>k!=='relentless');
    tutLog({ ownerKey:'p2', raw:`"${cad.name}" reste en jeu grâce à Tenace`, highlightIds:[cad.instId] });
    tutFlash('Tenace : Cadavre ambulant reste en jeu !');
    S.p1.attackPhaseDone = true;
    S.p1.attackers = [];
    tutNext();
  }
});
defStep({ id:'finalSpell', title:'Un sortilège pour finir',
  text:"Initiative a tué Cadavre ambulant sans riposte et Brutalité a fait passer 7 dégâts (9 → 2 PV), mais Tenace le garde en jeu, une seule fois. Il reste Découper (Sortilège, 1 mana) : « Infligez 2 dégâts à un héros ou une créature ennemie ». Jouez-le après le combat : glissez-le sur le plateau puis désignez le héros de Sandroska. La carte part en défausse, puis l'effet s'applique.",
  highlight:['[data-instid="t-p1-spell"]','#hero-frame-p2'],
  expect:{ kind:'play', card:'t-p1-spell', needsHeroTarget:true },
  run(info){
    tutPlayerPlay(info.card, info.i);
    S.p1.discard.push(tutFresh(info.card));
    S.p2.hp = Math.max(0, S.p2.hp - 2);
    // Dans le journal, l'effet est détaillé juste après la carte jouée.
    S.__gameLog[S.__gameLog.length-1].effects = [{ text:'infligez 2 dégâts au héros ennemi', targetInstIds:[] }];
    if(S.p2.hp<=0){
      S.gameOver = true;
      S.winnerKey = 'p1';
      setTimeout(tutRewireGameOverButton, 50);
    }
    tutNext();
  }
});
defStep({ id:'done', title:'Tutoriel terminé',
  text:'Vous savez maintenant jouer des créatures, attaquer et bloquer, utiliser les principaux mots-clés, activer un artefact, poser un piège, lancer un sortilège et lire le journal !',
  highlight:[] });

// Les ~40 étapes sont regroupées en 10 « parties » : c'est ce que voit le
// joueur dans la pastille en haut à gauche (plus lisible qu'un « 17/40 »).
const TUT_CHAPTERS = [
  { name:'Bienvenue',            steps:['heroPower','intro1','intro2','intro3'] },
  { name:'Première créature',    steps:['playC1','goToAttack1','selectAttackers1'] },
  { name:'Poser un piège',       steps:['playTrap','trapInfo','endTurn1','aiTurn1'] },
  { name:'Mana et piège',        steps:['playC2','manaTrap','goToAttack2','selectAttackers2','trapResult'] },
  { name:'Défausse et journal',  steps:['discardOpen','discardClose','journalOpen','journalRead','journalClose','endTurn2','aiTurn2'] },
  { name:'Les artefacts',        steps:['playArtifact','activateArtifact'] },
  { name:'Mots-clés de combat',  steps:['keywordsInfo','goToAttack3','selectAttackers3','endTurn3','aiTurn3'] },
  { name:'Se défendre',          steps:['playC3','enemyInfo','endTurn4','aiTurn4','blockHorreur','blockResult'] },
  { name:'Tenace',               steps:['goToAttack5','selectAttackers5'] },
  { name:'Le sortilège final',   steps:['finalSpell','done'] }
];
const TUT_CHAPTER_OF = {};
TUT_CHAPTERS.forEach((c, i)=>{ c.steps.forEach(id=>{ TUT_CHAPTER_OF[id] = { n:i+1, name:c.name }; }); });

let TUT = { step:'heroPower' };

// Fin du tour du joueur : on passe la main, les créatures reprennent
// leurs statuts de début de tour au prochain tour de leur propriétaire.
function tutEndPlayerTurn(){
  S.p1.attackPhaseDone = false;
  S.p1.attackers = [];
  UI.selectingAttackers = false; UI.selectedAttackers = [];
  S.active = 'p2';
  // Comme sur le serveur : S.turn avance à CHAQUE tour de joueur (le journal
  // en déduit les séparateurs « Tour N · Votre tour / Tour de l'adversaire »).
  S.turn = (S.turn||1) + 1;
}

function tutSetStep(id){
  TUT.step = id;
  const info = TUT_STEPS_INFO[id];
  if(!info) return;
  // La logique de l'étape est immédiate, mais le TEXTE de narration attend la fin des animations en
  // cours : sinon il annonce un résultat (« 12 → 9 PV ») pendant que le coup est encore à l'écran.
  if(animationsBusy()){
    tutWaitAnimations().then(()=>{ if(TUT.step===id) tutShowStepText(id); });
  } else {
    tutShowStepText(id);
  }
  if(info.ai) tutScheduleAi(id);
}
function tutShowStepText(id){
  const info = TUT_STEPS_INFO[id];
  if(!info) return;
  const badge = document.getElementById('tut-step-badge');
  if(badge){
    const ch = TUT_CHAPTER_OF[id];
    badge.textContent = ch ? `Partie ${ch.n}/${TUT_CHAPTERS.length} · ${ch.name}` : '';
  }
  const titleEl = document.getElementById('tut-title');
  if(titleEl) titleEl.textContent = info.title;
  const textEl = document.getElementById('tut-text');
  if(textEl) textEl.textContent = info.text;
  const hintEl = document.getElementById('tut-hint');
  if(hintEl){ hintEl.style.display = 'none'; hintEl.textContent = ''; }
  const contBtn = document.getElementById('tut-continue-btn');
  if(contBtn) contBtn.style.display = info.continueBtn ? 'inline-block' : 'none';
}

// Tour de l'IA : lancé automatiquement, relancé tant qu'il n'a pas eu lieu
// (une action déjà en cours, un onglet en arrière-plan... ne doivent
// jamais bloquer le tutoriel).
const AI_DONE = {};
function tutScheduleAi(id){
  const tick = ()=>{
    if(TUT.step!==id || AI_DONE[id]) return;
    if(ACTION_IN_FLIGHT || animationsBusy()){ setTimeout(tick, 300); return; }
    uiProcessAi();
    setTimeout(tick, 1500);
  };
  setTimeout(tick, 900);
}

function tutApplyHighlight(){
  document.querySelectorAll('.tut-glow').forEach(el=>el.classList.remove('tut-glow'));
  document.querySelectorAll('.tut-arrow').forEach(el=>el.remove());
  const info = TUT_STEPS_INFO[TUT.step];
  if(!info) return;
  let firstEl = null;
  (info.highlight||[]).forEach(sel=>{
    try{
      const el = document.querySelector(sel);
      if(el){ el.classList.add('tut-glow'); if(!firstEl) firstEl = el; }
    }catch(e){ /* sélecteur invalide, on ignore */ }
  });
  if(firstEl) tutPointTo(firstEl);
}
function tutPointTo(el){
  const rect = el.getBoundingClientRect();
  if(rect.width===0 && rect.height===0) return;
  const arrow = document.createElement('div');
  arrow.className = 'tut-arrow';
  arrow.textContent = '▼';
  arrow.style.left = (rect.left + rect.width/2) + 'px';
  arrow.style.top = Math.max(96, rect.top - 34) + 'px';
  document.body.appendChild(arrow);
}

let __tutFlashTimer = null;
function tutFlash(msg){
  const el = document.getElementById('tut-flash');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(__tutFlashTimer);
  __tutFlashTimer = setTimeout(()=>el.classList.remove('show'), 3200);
}

const __tutOrigGameOverOverlay = renderGameOverOverlay;
renderGameOverOverlay = function(){
  __tutOrigGameOverOverlay();
  if(S && S.gameOver) tutRewireGameOverButton();
};
function tutRewireGameOverButton(){
  const btn = document.querySelector('#overlay button');
  if(!btn) return;
  btn.textContent = 'Continuer';
  btn.onclick = function(){
    document.getElementById('overlay').classList.remove('show');
    tutShowEndScreen();
  };
}
function tutShowEndScreen(){
  const el = document.getElementById('tut-end-screen');
  if(el) el.classList.add('show');
}

// ---------------- Boutons de la barre du tutoriel ----------------
async function tutOnContinueClick(){
  const info = TUT_STEPS_INFO[TUT.step];
  if(!info || !info.continueBtn) return;
  if(__tutContinueBusy) return;
  __tutContinueBusy = true;
  try{
    // On ne modifie jamais l'état pendant qu'une animation tourne (le plateau le tient en attente).
    await tutWaitAnimations();
    if(info.onContinue) info.onContinue();
    tutNext();
    tutPush();
  } finally { __tutContinueBusy = false; }
}
let __tutContinueBusy = false;
async function tutMarkCompletedThenGo(url){
  try{ localStorage.setItem('sc-tutorial-completed', '1'); }catch(e){}
  try{
    await Promise.race([
      gsMarkTutorialCompleted(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]);
  }catch(e){
    console.warn('gsMarkTutorialCompleted a échoué ou a expiré, on navigue tout de même :', e);
  }
  window.location.href = url;
}
async function tutSkip(){
  if(!await scConfirm('Passer le tutoriel et retourner au menu ?')) return;
  tutMarkCompletedThenGo('spellcraft-hub.html');
}
function tutFinish(){ tutMarkCompletedThenGo('spellcraft-hub.html'); }
function tutGoToShop(){
  // L'octroi des 3 boosters (grant_tutorial_boosters, idempotent) se fait
  // côté boutique, au chargement de spellcraft-shop.html.
  tutMarkCompletedThenGo('spellcraft-shop.html?fromTutorial=1');
}
function tutOpenGrimoire(){ window.location.href = 'spellcraft-grimoire.html'; }

// ---------------- Barre de phase : mêmes boutons que le vrai plateau ----------------
// (« ⚔ Combat » + « Fin de tour » quand une créature peut attaquer ;
// « Fin de tour » seul sinon ; « Passer (fin du blocage) » en défense.)
const __tutOrigRenderPhaseBar = renderPhaseBar;
renderPhaseBar = function(){
  if(S.gameOver || S.pendingSacrifice || UI.pendingCard || UI.pendingPower || UI.pendingNewTarget){
    return __tutOrigRenderPhaseBar();
  }
  const bar = document.getElementById('phase-bar');
  bar.innerHTML = '';
  const myTurn = S.active===MY_KEY;
  const me = S[MY_KEY];
  const mk = (txt, cls, tut, fn, disabled)=>{
    const b = document.createElement('button');
    b.className = cls; b.textContent = txt;
    if(tut) b.dataset.tut = tut;
    if(fn) b.onclick = fn;
    if(disabled) b.disabled = true;
    return b;
  };
  const stack = (main, ...subs)=>{
    const st = document.createElement('div'); st.className = 'phase-bar-stack';
    st.appendChild(main);
    const row = document.createElement('div'); row.className = 'phase-bar-subrow';
    subs.forEach(s=>row.appendChild(s));
    st.appendChild(row);
    bar.appendChild(st);
  };
  if(!myTurn){
    if(S.phase==='declareBlockersMe'){
      bar.appendChild(mk('Passer (fin du blocage)', 'phase-btn', 'pass-block', uiFinishBlocking));
    } else {
      bar.appendChild(mk('Tour adverse', 'phase-btn', null, null, true));
    }
    return;
  }
  if(S.phase==='declareBlockersMe'){
    bar.appendChild(mk('En attente du blocage adverse...', 'phase-btn', null, null, true));
    return;
  }
  if(UI.selectingAttackers){
    const n = UI.selectedAttackers.length;
    const main = n
      ? mk(`Valider ${n} attaquant(s)`, 'phase-btn', 'confirm', uiConfirmAttackers)
      : mk('Passer le combat', 'phase-btn', 'confirm', uiConfirmAttackers);
    const cancel = mk('Annuler', 'phase-btn secondary small', null, ()=>{ UI.selectingAttackers = false; UI.selectedAttackers = []; render(); });
    stack(main, cancel);
    return;
  }
  if(S.phase==='main' && !me.attackPhaseDone && me.board.some(tutCanAttack)){
    const combat = mk('⚔ Combat', 'phase-btn', 'combat', ()=>{ UI.selectingAttackers = true; UI.selectedAttackers = []; render(); });
    const endNow = mk('Fin de tour', 'phase-btn secondary small', 'endturn', uiEndTurn);
    stack(combat, endNow);
    return;
  }
  bar.appendChild(mk('Fin de tour', 'phase-btn', 'endturn', uiEndTurn));
};

// ---------------- render() : on réutilise 100% le rendu réel ----------------
const __tutRealRender = render;
render = function(){
  __tutRealRender();
  const info = TUT_STEPS_INFO[TUT.step];
  if(info){
    // Entrer / sortir du mode "choix des attaquants" est purement client
    // (aucun appel gs*()) : on le détecte donc ici, à chaque rendu.
    if(info.onSelecting && UI.selectingAttackers) tutSetStep(info.onSelecting);
    else if(info.backTo && !UI.selectingAttackers) tutSetStep(info.backTo);
  }
  tutApplyHighlight();
};

// ---------------- Journal et défausse : étapes qui attendent une ouverture ----------------
const __tutOrigOpenDiscard = openDiscardModal;
openDiscardModal = function(key){
  __tutOrigOpenDiscard(key);
  const e = (TUT_STEPS_INFO[TUT.step]||{}).expect;
  if(e && e.kind==='openDiscard' && e.key===key){ TUT_STEPS_INFO[TUT.step].run(); render(); }
};
const __tutOrigCloseDiscard = closeDiscardModal;
closeDiscardModal = function(){
  __tutOrigCloseDiscard();
  const e = (TUT_STEPS_INFO[TUT.step]||{}).expect;
  if(e && e.kind==='closeDiscard'){ TUT_STEPS_INFO[TUT.step].run(); render(); }
};
const __tutOrigToggleJournal = toggleJournal;
toggleJournal = function(){
  __tutOrigToggleJournal();
  const isOpen = document.getElementById('journal-panel').classList.contains('show');
  const e = (TUT_STEPS_INFO[TUT.step]||{}).expect;
  if(e && e.kind==='toggleJournal' && e.open===isOpen){ TUT_STEPS_INFO[TUT.step].run(); render(); }
};

// ---------------- Actions réseau → simulées localement ----------------
gsConnect = function(){ /* pas de connexion réseau dans le tutoriel */ };
gsFetchState = async function(){ return { state:tutSnapshot() }; };
gsRecordPresence = async function(){ return { ok:true }; };
gsDisconnect = function(){ /* rien à faire */ };
gsSendEmote = async function(){ return { ok:true }; };
gsSetShowHandToSpectators = async function(){ return { ok:true }; };
gsReportBug = async function(){ return { ok:true }; };
gsResolveDiscoverChoice = async function(){ return { state:tutSnapshot() }; };
gsResolveKeywordChoice = async function(){ return { state:tutSnapshot() }; };
gsMulligan = async function(){ return { state:tutSnapshot() }; };
gsUseHeroPower = async function(){
  tutFlash("Kyzïre n'a pas de pouvoir à activer : le sien est passif (déclenché automatiquement en début de partie).");
  return { error:'tutorial-disabled' };
};

// Étape courante si elle attend ce type d'action, sinon null.
function tutExpecting(kind){
  const info = TUT_STEPS_INFO[TUT.step];
  return (info && info.expect && info.expect.kind===kind) ? info : null;
}
function tutWrongStep(){
  tutFlash("Ce n'est pas ce qu'il faut faire pour l'instant — suivez les instructions en haut de l'écran.");
  return { error:'tutorial-wrong-step' };
}

gsPlayCardSimple = async function(i, targetInfo, chosenTargets, choiceKey, sacrificeInstId, placeAfter){
  const card = S.p1.hand[i];
  if(!card) return { error:'Carte introuvable.' };
  const info = tutExpecting('play');
  if(!info || info.expect.card!==card.instId) return tutWrongStep();
  if(info.expect.needsHeroTarget){
    // Sortilège final : seul le héros de Sandroska est une cible valide ici.
    const flat = chosenTargets ? (Array.isArray(chosenTargets) ? chosenTargets : [].concat(...Object.values(chosenTargets))) : [];
    const viaHero = (targetInfo && targetInfo.isHeroTarget && targetInfo.playerKey==='p2') || flat.includes('hero:p2');
    const anyTarget = !!(targetInfo && (targetInfo.instId || targetInfo.isHeroTarget)) || flat.length>0;
    if(anyTarget && !viaHero){
      tutFlash('Pour finir la partie, désignez le héros de Sandroska.');
      return { error:'tutorial-wrong-target' };
    }
  }
  await info.run({ card, i, targetInfo, chosenTargets, placeAfter });
  return { state:tutSnapshot() };
};

gsSetTrap = async function(handIndex){
  const card = S.p1.hand[handIndex];
  const info = tutExpecting('trap');
  if(!info || !card || card.instId!==info.expect.card){
    tutFlash("Ce n'est pas le moment de poser ce piège.");
    return { error:'tutorial-wrong-step' };
  }
  await info.run({ card, i:handIndex });
  return { state:tutSnapshot() };
};

gsActivatePermanent = async function(permanentType, permanentInstId, targetInfo, chosenTargets){
  const info = tutExpecting('activate');
  if(!info){
    tutFlash("Ce n'est pas le moment d'activer cette capacité.");
    return { error:'tutorial-wrong-step' };
  }
  const art = S.p1.relics.find(r=>r.instId===permanentInstId);
  if(!art){
    tutFlash("Ce n'est pas la bonne capacité à activer.");
    return { error:'tutorial-wrong-target' };
  }
  // Le vrai plateau envoie chosenTargets sous la forme d'un OBJET indexé par
  // l'id de la cible de la capacité — { "<targetId>": ["<instId>", ...] }.
  let targetInstId = null;
  if(chosenTargets){
    const arr = Array.isArray(chosenTargets) ? chosenTargets : Object.values(chosenTargets)[0];
    if(arr && arr.length){
      const first = arr[0];
      targetInstId = (typeof first === 'string') ? first : (first && first.instId);
    }
  }
  if(!targetInstId && targetInfo && targetInfo.instId) targetInstId = targetInfo.instId;
  const target = S.p1.board.find(c=>c.instId===targetInstId);
  if(!target){
    tutFlash('Désignez une créature alliée pour recevoir le bonus.');
    return { error:'tutorial-no-target' };
  }
  if(target.instId!==info.expect.target){
    tutFlash('Pour cette démonstration, ciblez plutôt votre Chevaucheuse de requin des sables.');
    return { error:'tutorial-wrong-target' };
  }
  await info.run({ art, target });
  return { state:tutSnapshot() };
};

gsDeclareAttackers = async function(attackerIds){
  const got = attackerIds || [];
  const info = tutExpecting('attack');
  if(!info) return tutWrongStep();
  const want = info.expect.ids;
  if(got.length!==want.length || !want.every(id=>got.includes(id))){
    tutFlash(`Sélectionnez ${want.length>1?'les créatures indiquées':'la créature en surbrillance'}, puis validez.`);
    return { error:'tutorial-wrong-attackers' };
  }
  await info.run();
  return { state:tutSnapshot() };
};

gsEndTurn = async function(){
  const info = tutExpecting('endTurn');
  if(!info){
    tutFlash("Pas encore : suivez les instructions en haut de l'écran.");
    return { error:'tutorial-wrong-step' };
  }
  await info.run();
  return { state:tutSnapshot() };
};

gsAssignBlock = async function(blockerId, attackerId){
  const blk = S.p1.board.find(c=>c.instId===blockerId);
  const att = S.p2.board.find(c=>c.instId===attackerId);
  if(!blk || !att || !(S.p2.attackers||[]).includes(attackerId)){
    tutFlash("Choisissez d'abord votre défenseur, puis l'attaquant à bloquer.");
    return { error:'tutorial-wrong-target' };
  }
  // Règle réelle : une créature avec Vol n'est bloquable que par Vol / Portée.
  if(tutHasKw(att,'flying') && !tutHasKw(blk,'flying') && !tutHasKw(blk,'reach')){
    tutFlash(`${att.name} a Vol : seules des créatures avec Vol ou Portée peuvent la bloquer.`);
    return { error:'cannot-block-flying' };
  }
  const info = tutExpecting('block');
  if(!info || blockerId!==info.expect.blocker || attackerId!==info.expect.attacker){
    tutFlash("Pour ce tutoriel, bloquez Horreur reptilienne avec Bandit des marais Aral'Anak.");
    return { error:'tutorial-wrong-block' };
  }
  await info.run();
  return { state:tutSnapshot() };
};
gsFinishBlocking = async function(){
  tutFlash("Pour ce tutoriel, bloquez d'abord Horreur reptilienne avec Bandit des marais Aral'Anak.");
  return { error:'tutorial-wrong-step' };
};

// Le tour de l'IA est entièrement scripté par l'étape courante (champ "ai").
gsProcessAiTurn = async function(){
  const info = TUT_STEPS_INFO[TUT.step];
  if(!info || !info.ai || AI_DONE[TUT.step]) return {};
  const id = TUT.step;
  AI_DONE[id] = true;
  await info.ai();
  if(TUT.step===id) tutNext();
  return { state:tutSnapshot() };
};

// ---------------- Démarrage ----------------
async function initTutorial(){
  MY_KEY = 'p1'; OPP_KEY = 'p2';
  GS_ROLE = 'p1'; GS_VS_AI = true;
  // Alimente le lookup utilisé par le journal (survol du nom d'une carte
  // → aperçu, détection du son de pose selon le type) avec nos cartes.
  __matchAnnounceDone = true; // pas d'écran d'annonce de match dans le tutoriel
  JOURNAL_CARD_LOOKUP = JOURNAL_CARD_LOOKUP || {};
  TUT_ALL_CARDS.forEach(c=>{ JOURNAL_CARD_LOOKUP[c.instId] = c; });
  const appOuter = document.getElementById('app-outer');
  if(appOuter) appOuter.classList.add('show');
  const aiBtn = document.getElementById('ai-debug-btn');
  if(aiBtn) aiBtn.style.display = 'none';
  S = tutBuildInitialState();
  UI = { selectingAttackers:false, selectedAttackers:[], pendingBlocker:null };
  TUT.step = 'heroPower';
  tutSetStep('heroPower');
  render();
}
initSpellcraftAuth().then(initTutorial);
