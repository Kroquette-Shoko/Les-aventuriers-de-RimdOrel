// ============================================================
// Plateau de jeu — 01-mots-cles-et-regles
// Mots-clés, couleurs des stats, règles d attaque et de blocage côté client, séquencement des actions adverses
// (Chargé dans l ordre depuis spellcraft-server-board.html : tout est partagé, comme avant.)
// ============================================================
// Journal, chat et signalement sont en position:fixed : dans la table inclinée (ou le séparateur
// surélevé), un ancêtre transformé les piégeait et les déformait. On les rattache à #app-outer
// (le même repère que dans la disposition classique), hors de la table.
['journal-panel','chat-panel','bug-report-panel'].forEach(function(id){
  var el = document.getElementById(id), host = document.getElementById('app-outer');
  if(el && host) host.appendChild(el);
});

const KEYWORD_ICON_FILES = {
  charge:'kw-charge.png', flying:'kw-envol.png', reach:'kw-portee.png', pierce:'kw-brutalite.png',
  lifesteal:'kw-volDeVie.png', initiative:'kw-initiative.png', armor:'kw-armure.png',
  stealth:'kw-parade.png', relentless:'kw-tenace.png', fearful:'kw-peureux.png',
  protecteur:'kw-protecteur.png', toxic:'kw-toxique.png',
  discret:'kw-discret.png', imparable:'kw-imparable.png', fugace:'kw-fugace.png',
  assault:'kw-assaut.png', final:'kw-final.png',
  vorace:'kw-vorace.png', insensible:'kw-insensible.png', cycle:'kw-cycle.png'
  // "debut" est volontairement absent : pas d'icône pour ce mot-clé.
};
const KEYWORD_LABELS = {
  charge:'Charge', flying:'Vol', reach:'Portée', pierce:'Brutalité', lifesteal:'Vol de vie',
  initiative:'Initiative', armor:'Armure', stealth:'Parade', relentless:'Tenace',
  fearful:'Peureux', protecteur:'Protecteur', toxic:'Toxique',
  discret:'Discret', imparable:'Imparable', fugace:'Fugace',
  assault:'Assaut', debut:'Arrivée', final:'Final',
  vorace:'Vorace', insensible:'Insensible', cycle:'Cycle'
};
// Texte complet de chaque mot-clé — utilisé par les bulles contextuelles
// affichées à côté de l'aperçu agrandi d'une créature (survol en partie).
const KEYWORD_DESCRIPTIONS = {
  charge: "Peut attaquer dès le tour où elle arrive en jeu, sans attendre le tour suivant.",
  flying: "Ne peut être bloquée que par des créatures qui ont elles-mêmes le Vol ou la Portée.",
  reach: "Peut bloquer une créature avec Vol, sans avoir elle-même ce mot-clé.",
  pierce: "Les dégâts en excès par rapport aux PV restants du bloqueur sont infligés au héros adverse.",
  lifesteal: "Chaque point de dégât qu'elle inflige soigne d'autant votre héros.",
  initiative: "Frappe la première lors d'un combat. Si ce premier coup suffit à tuer sa cible, elle ne subit aucun dégât en retour.",
  armor: "Absorbe le premier dégât subi (combat ou effet), une seule fois.",
  stealth: "Ne peut pas être ciblée par l'adversaire jusqu'au début du prochain tour de son propriétaire.",
  vorace: "Voracité : profite du mana dépensé par l'adversaire pendant son dernier tour (voir le texte de la carte).",
  insensible: "Ne peut pas être ciblée par les sortilèges, y compris les vôtres. Les effets de zone la touchent.",
  cycle: "Au lieu d'aller au cimetière, retourne mélangée dans votre deck, une seule fois (elle revient sans Cycle).",
  relentless: "À sa mort, revient automatiquement en jeu une fois — sans le mot-clé Tenace la seconde fois.",
  fearful: "Ne peut jamais bloquer une créature adverse.",
  protecteur: "Ne peut jamais attaquer.",
  toxic: "Toute créature à qui elle inflige des dégâts au combat meurt, peu importe ses PV restants.",
  discret: "Ne peut jamais être bloquée.",
  imparable: "Ne peut pas être ciblée par un piège.",
  fugace: "Meurt automatiquement à la fin du tour où elle est en jeu.",
  assault: "Étiquette pour les cartes liées au thème de l'attaque/l'agression (sans effet de jeu).",
  debut: "Étiquette pour les cartes liées au tout début d'une partie ou d'un tour (sans effet de jeu).",
  final: "Étiquette pour les cartes liées à la fin d'une partie ou d'un tour (sans effet de jeu)."
};
// Un mot-clé peut être présent sur une carte sans que son effet ne soit
// actif en ce moment précis (ex. Parade ne protège que jusqu'au début du
// prochain tour du propriétaire). Cette fonction dit si l'icône/la bulle doit
// être affichée MAINTENANT pour une créature en jeu ; hors plateau (main,
// aperçu générique), on montre tout — il n'y a pas encore d'état "actif".
function isKeywordActiveNow(k, card, inPlay){
  if(!inPlay) return true;
  if(k==='armor') return !card.armorUsed;
  if(k==='initiative') return !card.initiativeUsed;
  if(k==='stealth') return !!card.summonSick || !!card._paradeRenewed || (card.persistentKeywords||[]).includes('stealth');
  return true;
}
// ---------------- Couleur des stats d'une créature en jeu ----------------
// Compare les stats actuelles à celles du catalogue (carte d'origine).
// Fonction pure : `base` = carte du catalogue ({atk,hp}) ou undefined si le
// catalogue n'est pas (encore) chargé ; `turn` = tour global courant (sert à
// dire quand un bonus temporaire expire).
// Champs lus sur l'instance (voir serveur) : curAtk/curHp = valeurs courantes,
// atk/hp = maximum courant (avec bonus), _tempModifiers = bonus temporaires.
// Renvoie { atk:{cls,title}, hp:{cls,title} } ; cls = 'n-up' (bonus, vert),
// 'n-down' (malus ou dégâts, rouge) ou '' (inchangé).
// <stat-colors>
function creatureStatInfo(card, base, turn){
  const signed = (n)=> (n>0?'+':'') + n;
  const mods = card._tempModifiers || [];
  // Détaille l'écart à la base : part temporaire (par échéance) + part permanente.
  const describeDiff = (diff, field)=>{
    const parts = [];
    let temp = 0;
    mods.forEach(m=>{
      const v = m[field] || 0;
      if(!v) return;
      temp += v;
      parts.push(`${signed(v)} ${m.expiresAtGlobalTurn <= turn ? "jusqu'à la fin du tour" : "jusqu'à la fin du prochain tour"}`);
    });
    const perm = diff - temp;
    if(perm) parts.unshift(`${signed(perm)} permanent`);
    return parts.join(', ');
  };
  const hasBase = !!base && typeof base.atk==='number' && typeof base.hp==='number';

  // --- Force ---
  const curAtk = card.curAtk ?? card.atk ?? 0;
  const atk = { cls:'', title:'' };
  if(hasBase && curAtk !== base.atk){
    atk.cls = curAtk > base.atk ? 'n-up' : 'n-down';
    atk.title = `Force ${curAtk} (base ${base.atk}, ${describeDiff(curAtk - base.atk, 'atk')})`;
  }

  // --- Points de vie ---
  const curHp = card.curHp ?? card.hp ?? 0;
  const maxHp = card.hp ?? curHp;
  const wounded = curHp < maxHp;
  const hp = { cls:'', title:'' };
  if(wounded) hp.cls = 'n-down';                       // dégâts subis : toujours le plus parlant
  else if(hasBase && maxHp > base.hp) hp.cls = 'n-up';
  else if(hasBase && maxHp < base.hp) hp.cls = 'n-down';
  if(wounded || hp.cls){
    let t = `PV ${curHp}/${maxHp}`;
    if(hasBase && maxHp !== base.hp) t += ` (base ${base.hp}, ${describeDiff(maxHp - base.hp, 'hp')})`;
    hp.title = t;
  }
  return { atk, hp };
}
// </stat-colors>

// ---------------- Badges de mots-clés : quels badges, et leurs changements ----------------
// Fonctions pures (aucune lecture de l'état global ni du DOM) : le rendu
// (cardEl) et la détection de changements (animations de gain/perte) partent
// de la MÊME liste, sinon une animation pourrait viser un badge absent.
// <keyword-diff>
// Mots-clés dont l'icône est déjà dessinée par le cadre de la carte
// (buildNewCardEl : nkeyword-assault / nkeyword-final, au-dessus de la gemme
// de rareté). Ils figuraient AUSSI dans la pile de badges (KEYWORD_ICON_FILES) :
// la même information sortait deux fois. On les retire de la pile.
//
// Images réellement présentes dans le dépôt : images/kw-assaut.png et
// images/kw-final.png (les mêmes fichiers que KEYWORD_ICON_FILES). Le dossier
// images/card/icon/keyword/ n'a jamais existé : l'ancien chemin donnait un
// 404 et l'icône n'apparaissait donc nulle part. (attack.png, lui, est la
// bulle de force « épées croisées » des créatures, pas l'icône du mot-clé.)
const CARD_FRAME_KEYWORD_ICONS = {
  assault: `images/${KEYWORD_ICON_FILES.assault}`,
  final:   `images/${KEYWORD_ICON_FILES.final}`
};
const KEYWORDS_DRAWN_BY_CARD_FRAME = []; // plus aucun mot-clé dessiné par le cadre : tous passent par la pile de badges

// Mots-clés dont un badge est affiché MAINTENANT dans la pile d'une créature
// en jeu (sans doublon, ordre de la carte conservé).
function activeBadgeKeywords(card){
  const out = [];
  (card.keywords || []).forEach(k=>{
    if(out.includes(k)) return;
    if(!KEYWORD_ICON_FILES[k]) return;
    if(KEYWORDS_DRAWN_BY_CARD_FRAME.includes(k)) return;
    // Parade/Armure ne restent affichées que tant que leur protection l'est
    if(!isKeywordActiveNow(k, card, true)) return;
    out.push(k);
  });
  return out;
}
// Comparaison de deux listes de mots-clés (ensembles : l'ordre ne compte pas,
// un réordonnancement n'est donc jamais un changement).
function diffKeywordLists(before, after){
  const b = new Set(before || []), a = new Set(after || []);
  return {
    gained: [...a].filter(k=>!b.has(k)),
    lost: [...b].filter(k=>!a.has(k))
  };
}
// Instantané des badges de toutes les créatures en jeu :
// { instId: { active:[badges affichés], raw:[mots-clés bruts de la carte] } }.
// `raw` sert à distinguer une vraie perte (le mot-clé a quitté la carte) d'un
// badge qui s'éteint tout seul (Parade après le 1er tour, Armure consommée :
// le mot-clé est toujours sur la carte, c'est seulement sa protection qui est
// épuisée) — voir keywordBadgeChanges.
function snapshotKeywordBadges(state, playerKeys){
  const snap = {};
  if(!state) return snap;
  (playerKeys || []).forEach(key=>{
    const p = state[key];
    ((p && p.board) || []).forEach(c=>{
      if(!c || !c.instId) return;
      snap[c.instId] = { active: activeBadgeKeywords(c), raw: [...(c.keywords || [])] };
    });
  });
  return snap;
}
// Changements de badges d'UNE créature entre deux instantanés.
//  - gagné : badge affiché maintenant, absent avant ET pas déjà sur la carte
//    avant (sinon c'est une protection qui se « réarme », pas un gain) ;
//  - perdu : badge affiché avant, absent maintenant ET plus sur la carte
//    (Parade/Armure qui s'éteignent mais restent sur la carte : pas une perte).
// Un mot-clé temporaire qui expire, une aura retirée, Tenace consommé ou un
// silence SONT des pertes (le mot-clé quitte la carte).
function keywordBadgeChanges(prevEntry, nextEntry){
  const d = diffKeywordLists(prevEntry.active, nextEntry.active);
  return {
    gained: d.gained.filter(k=>!prevEntry.raw.includes(k)),
    lost: d.lost.filter(k=>!nextEntry.raw.includes(k))
  };
}
// Changements pour tout le plateau. Renvoie [{instId, gained, lost}] (seulement
// les créatures qui changent). Rien si l'un des instantanés est nul (premier
// rendu) ; une créature absente d'un des deux côtés (qui arrive ou qui part)
// est ignorée : son apparition/disparition a sa propre animation.
function diffKeywordBadgeSnapshots(prevSnap, nextSnap){
  if(!prevSnap || !nextSnap) return [];
  const out = [];
  Object.keys(nextSnap).forEach(id=>{
    const prev = prevSnap[id];
    if(!prev) return;
    const ch = keywordBadgeChanges(prev, nextSnap[id]);
    if(ch.gained.length || ch.lost.length) out.push({ instId:id, gained:ch.gained, lost:ch.lost });
  });
  return out;
}
// </keyword-diff>

// ---------------- Aperçu d'une créature en jeu : écarts avec la carte de base ----------------
// Fonctions pures. `base` = carte du catalogue (JOURNAL_CARD_LOOKUP) ou
// undefined si le catalogue n'est pas chargé / carte absente (token généré) :
// sans base, on ne compare rien (aucun faux « ajouté »).
// <preview-mods>
const KEYWORD_SOURCE_LABELS = { temp:'temporaire', aura:'aura', permanent:'permanent' };

// Classe chaque mot-clé : 'base' (d'origine), 'added' (+ source : temp / aura /
// permanent, selon _tempKeywords / _auraKeywords) ou 'lost' (d'origine mais
// plus sur la carte). Renvoie null si la comparaison est impossible.
function classifyKeywordsVsBase(card, base){
  if(!base || !Array.isArray(base.keywords)) return null;
  const cur = [...new Set(card.keywords || [])];
  const baseKw = [...new Set(base.keywords)];
  const temp = card._tempKeywords || [], aura = card._auraKeywords || [];
  const rows = cur.map(key=>{
    if(baseKw.includes(key)) return { key, status:'base', source:null };
    return { key, status:'added', source: temp.includes(key) ? 'temp' : aura.includes(key) ? 'aura' : 'permanent' };
  });
  baseKw.forEach(key=>{ if(!cur.includes(key)) rows.push({ key, status:'lost', source:null }); });
  return rows;
}
// Capacités de la base disparues ? Le serveur n'a PAS de marqueur « silenced » :
// l'effet silence (mode abilities/both) met keywords=[], abilities=[],
// triggeredEffects={} et onPlayEffect=null. On ne conclut donc que sur ces
// valeurs EXACTES (tableau/objet vide, null) alors que la base en a ; une
// instance sans champ (undefined) n'a jamais eu ces capacités : pas de conclusion.
function hasLostAbilities(card, base){
  if(!base) return false;
  if(Array.isArray(base.abilities) && base.abilities.length > 0
     && Array.isArray(card.abilities) && card.abilities.length === 0) return true;
  const baseLegacy = !!base.onPlayEffect
    || (!!base.triggeredEffects && typeof base.triggeredEffects==='object' && Object.keys(base.triggeredEffects).length > 0);
  if(baseLegacy && card.onPlayEffect === null
     && !!card.triggeredEffects && typeof card.triggeredEffects==='object' && Object.keys(card.triggeredEffects).length === 0) return true;
  return false;
}
// Résumé des écarts : { rows (ou null), added, lost, silenced, statLines, hasChanges }.
function describeCreatureModifications(card, base, turn){
  const rows = classifyKeywordsVsBase(card, base);
  const added = rows ? rows.filter(r=>r.status==='added') : [];
  const lost = rows ? rows.filter(r=>r.status==='lost') : [];
  const silenced = hasLostAbilities(card, base);
  const statLines = [];
  if(base && typeof base.atk==='number' && typeof base.hp==='number'){
    const info = creatureStatInfo(card, base, turn);
    const curAtk = card.curAtk ?? card.atk ?? 0;
    const maxHp = card.hp ?? card.curHp ?? 0;
    if(curAtk !== base.atk && info.atk.title) statLines.push(info.atk.title);
    // seuls les PV MAX comptent comme modification (une blessure n'en est pas une)
    if(maxHp !== base.hp && info.hp.title) statLines.push(info.hp.title);
  }
  return { rows, added, lost, silenced, statLines,
           hasChanges: !!(added.length || lost.length || silenced || statLines.length) };
}
// </preview-mods>

// ---------------- Règles d'attaque / de blocage (miroir du serveur) ----------------
// Ces fonctions reproduisent EXACTEMENT les règles du serveur, pour griser
// et expliquer côté client ce que le serveur refuserait de toute façon.
// Source : doDeclareAttackers (liste eligibleIds) et doAssignBlock (suite de
// refus) du serveur. Si le serveur change, ces règles doivent suivre.
// Fonctions pures : aucune lecture de l'état global (testables seules).
// <combat-rules>
function hasKw(c, k){ return (c.keywords||[]).includes(k); }

// Serveur : eligibleIds = !frozen && !stunned && !hasAttacked
//           && !protecteur && (!summonSick || charge)
// Renvoie la raison (courte) du refus, ou null si la créature peut attaquer.
function reasonCannotAttack(c){
  if(c.stunned) return 'étourdie, elle ne peut pas attaquer';
  if(c.frozen) return 'gelée, elle ne peut pas attaquer';
  if(c.hasAttacked) return 'a déjà attaqué ce tour';
  if(hasKw(c, 'protecteur')) return 'Protecteur : ne peut jamais attaquer';
  if(c.summonSick && !hasKw(c, 'charge')) return "malade d'invocation, elle ne peut pas attaquer ce tour (sauf Charge)";
  return null;
}
function canAttackClient(c){ return reasonCannotAttack(c) === null; }

// Parade (serveur : isStealthProtected) : la créature n'est protégée que contre
// l'ADVERSAIRE de son propriétaire, tant qu'elle est « summonSick » (jusqu'au
// début du prochain tour de son propriétaire). Mes propres créatures Parade
// restent donc ciblables par mes sorts. `ownerKey` = camp de la créature,
// `viewerKey` = camp de celui qui cible (moi).
// Insensible (set La guerre élémentaire) : jamais ciblable par un sortilège, même allié.
// Vrai quand le ciblage en cours vient d'un sortilège (serveur : __SPELL_CTX).
let __CLIENT_SPELL_CHECK = false;
function clientSpellTargeting(){
  const pn = UI && UI.pendingNewTarget;
  if(pn) return !!(pn.extra && pn.extra.spell);
  return __CLIENT_SPELL_CHECK;
}
function isStealthProtectedClient(c, ownerKey, viewerKey){
  return !!c && hasKw(c, 'stealth') && (!!c.summonSick || !!c._paradeRenewed || (c.persistentKeywords||[]).includes('stealth')) && ownerKey !== viewerKey;
}

// Étourdissement / gel : la créature « perd son prochain tour complet ». Le
// serveur garde `stunned`/`frozen` vrais pendant tout ce tour (ce sont des
// booléens : les règles ci-dessus n'ont pas besoin d'autre chose).
const STATUS_DURATION_TEXT = "perd son prochain tour complet : ne peut pas attaquer ni bloquer jusqu'à la fin du prochain tour de son propriétaire";
// Précision optionnelle, UNIQUEMENT si le serveur fournit `_stunUntilTurn`
// (numéro de tour global, comparé à `state.turn`) : on ne dit que ce qui est
// sûr — l'effet se termine à la fin du tour en cours quand ce tour est celui
// du propriétaire et que `_stunUntilTurn` est atteint. Sinon : chaîne vide.
function statusDurationNote(c, ownerKey, state){
  if(!c || !state || !isCombatNumberLike(c._stunUntilTurn) || !isCombatNumberLike(state.turn)) return '';
  if(state.active === ownerKey && c._stunUntilTurn === state.turn) return "Se termine à la fin de ce tour.";
  return '';
}
function isCombatNumberLike(x){ return typeof x==='number' && isFinite(x); }

// Serveur (doAssignBlock), dans cet ordre : déjà bloqué -> étourdie/gelée ->
// Peureux -> attaquant Discret -> attaquant Vol (bloqueur sans Vol ni Portée).
// Sans `attacker` : seules les raisons propres au bloqueur sont testées
// (« ne peut bloquer aucun attaquant »). Avec `attacker` : on ajoute les
// restrictions liées à l'attaquant. (Imparable ne concerne que les pièges,
// pas le blocage : volontairement absent ici.)
function reasonCannotBlock(c, attacker){
  if(c.hasBlockedThisTurn) return 'a déjà bloqué ce tour';
  if(c.stunned) return 'étourdie, elle ne peut pas bloquer';
  if(c.frozen) return 'gelée, elle ne peut pas bloquer';
  if(hasKw(c, 'fearful')) return 'Peureux : ne peut jamais bloquer';
  if(attacker){
    if(hasKw(attacker, 'discret')) return 'cet attaquant est Discret : on ne peut pas le bloquer';
    if(hasKw(attacker, 'flying') && !hasKw(c, 'flying') && !hasKw(c, 'reach'))
      return 'cet attaquant a Vol : seules les créatures Vol ou Portée peuvent le bloquer';
  }
  return null;
}
function canBlockClient(c, attacker){ return reasonCannotBlock(c, attacker) === null; }

// Pendant la phase de blocage : la créature peut-elle bloquer AU MOINS un des
// attaquants adverses ? Renvoie la raison si elle n'en peut bloquer aucun.
function reasonCannotBlockAny(c, attackers){
  const own = reasonCannotBlock(c);
  if(own) return own;
  if(!attackers || !attackers.length) return null;
  if(attackers.some(a=>canBlockClient(c, a))) return null;
  return 'ne peut bloquer aucun des attaquants (Discret ou Vol)';
}

// ---- Résolution automatique du combat (lecture fluide) ----
// Le serveur peut exposer des booléens `canAttack` / `canBlock` dans la vue
// d'état (sur le joueur, ou à la racine, éventuellement par camp). Noms
// prévus, non confirmés : on les lit s'ils existent, sinon on calcule la
// valeur côté client avec les règles ci-dessus (miroir du serveur).
// Règle de prudence : le client ne cache JAMAIS une action que le serveur
// autoriserait — on ne masque que si le serveur ne dit pas « oui » ET que le
// calcul client dit « non ». En cas de doute, le bouton reste affiché.
function pickServerFlag(state, myKey, name){
  if(!state) return undefined;
  const me = state[myKey];
  if(me && typeof me[name]==='boolean') return me[name];
  const top = state[name];
  if(typeof top==='boolean') return top;
  if(top && typeof top==='object' && typeof top[myKey]==='boolean') return top[myKey];
  return undefined;
}
// Au moins une de mes créatures peut attaquer maintenant (calcul client).
function clientCanAttack(board){ return (board||[]).some(c=>canAttackClient(c)); }
// Au moins une de mes créatures peut bloquer au moins un des attaquants
// (calcul client). `attackers` vide/inconnu : on teste seulement les raisons
// propres au bloqueur. `usedBlockerIds` (Set facultatif d'instId) : bloqueurs
// qui ont déjà bloqué ce tour d'après le journal d'événements, au cas où le
// drapeau hasBlockedThisTurn ne serait pas exposé par le serveur. Multi-bloc :
// un bloqueur LIBRE peut encore bloquer un attaquant déjà bloqué (le serveur ne
// l'interdit pas) ; seuls comptent l'état du bloqueur et les restrictions de
// l'attaquant.
function clientCanBlock(defBoard, attackers, usedBlockerIds){
  const atk = (attackers||[]).filter(Boolean);
  return (defBoard||[]).some(c=>{
    if(usedBlockerIds && usedBlockerIds.has(c.instId)) return false;
    if(reasonCannotBlock(c)) return false;
    if(!atk.length) return true;
    return atk.some(a=>canBlockClient(c, a));
  });
}
// Faut-il proposer l'étape de combat ? (ne renvoie false que si le serveur ne
// dit pas « oui » et que le calcul client dit « non »)
function shouldOfferCombat(state, myKey){
  if(pickServerFlag(state, myKey, 'canAttack') === true) return true;
  const me = state && state[myKey];
  return clientCanAttack(me && me.board);
}
// Même principe pour le blocage : faux uniquement si aucune créature ne peut
// bloquer selon le client ET que le serveur ne dit pas « oui ».
function shouldOfferBlock(state, myKey, oppKey){
  if(pickServerFlag(state, myKey, 'canBlock') === true) return true;
  if(!state || !state[myKey] || !state[oppKey]) return true; // doute : on laisse
  const atkBoard = state[oppKey].board || [];
  const attackers = (state[oppKey].attackers||[]).map(id=>atkBoard.find(c=>c.instId===id)).filter(Boolean);
  return clientCanBlock(state[myKey].board, attackers, blockersAlreadyUsed(state, myKey));
}
// Bloqueurs de `myKey` ayant déjà bloqué pendant ce tour d'après les événements
// blockResolved (S.__combatEvents, 60 derniers côté serveur) — complète le
// drapeau hasBlockedThisTurn de la créature.
function blockersAlreadyUsed(state, myKey){
  const used = new Set();
  (Array.isArray(state && state.__combatEvents) ? state.__combatEvents : []).forEach(e=>{
    if(e && e.combatEvent==='blockResolved' && e.turn===state.turn && e.ownerKey===myKey && e.blockerInstId) used.add(e.blockerInstId);
  });
  return used;
}
// Attaquants déclarés par `oppKey` et encore en jeu (objets).
function liveDeclaredAttackers(state, oppKey){
  const opp = state && state[oppKey];
  if(!opp) return [];
  const board = opp.board || [];
  return (opp.attackers||[]).map(id=>board.find(c=>c && c.instId===id)).filter(Boolean);
}
// Blocage automatique : la phase de blocage en attente n'a plus d'intérêt (plus
// aucun attaquant en jeu, ou plus aucun de mes bloqueurs libres ne peut bloquer
// un attaquant restant). Le serveur à jour la termine seul dans la même réponse
// que le dernier blocage ; ce calcul sert au masquage de l'ancien bouton et au
// repli pour un serveur plus ancien. Prudent : jamais si le serveur dit
// canBlock=true, ni pendant un choix en attente.
function blockPhaseNeedsAutoFinish(state, myKey, oppKey){
  if(!state || state.gameOver || state.phase!=='declareBlockersMe' || state.active!==oppKey) return false;
  if(!state[myKey] || !state[oppKey]) return false;
  if(state.pendingDiscover || state.pendingKeywordChoice || state.pendingSacrifice || state.pendingTarget || state.pendingDiscard) return false;
  if(pickServerFlag(state, myKey, 'canBlock') === true) return false;
  const atk = liveDeclaredAttackers(state, oppKey);
  if(!atk.length) return true;
  return !clientCanBlock(state[myKey].board, atk, blockersAlreadyUsed(state, myKey));
}
// Identifiant d'une phase de blocage (verrou « une seule fois »).
function blockPhaseKey(state, oppKey){
  return String(state && state.turn) + '|' + String(state && state.active) + '|' + ((state && state[oppKey] && state[oppKey].attackers) || []).slice().sort().join(',');
}
// </combat-rules>

// ---- Séquencement des actions adverses (tour de l'IA) ----
// Le serveur joue tout le tour de l'IA en UNE réponse : état final (attaquants
// déjà désignés, phase de blocage) + journal. Le client rejoue le journal dans
// la file d'animations ; pour garder l'ordre chronologique, l'affichage des
// attaquants est RETENU jusqu'à la fin des révélations/capacités, puis une
// courte pause (COMBAT_PRE_ATTACK_PAUSE_MS, passée dans cms()) précède leur
// désignation. Fonctions pures entre les marqueurs (testées sous Node).
// <combat-sequencing>
const COMBAT_PRE_ATTACK_PAUSE_MS = 350; // pause entre la dernière carte jouée et la désignation des attaquants
const BLOCK_AUTO_FINISH_DELAY_MS = 400; // beat avant la fin automatique du blocage (serveur ancien)
// Cette entrée de journal joue-t-elle une animation de CARTE/capacité (révélation
// 3D, flèche d'effet, mort) dans la file ? Indépendant de la vitesse : l'appelant
// teste combatInstant().
function entryQueuesCardAnimation(entry){
  if(!entry || entry.raw) return false;
  if(entry.deadInstId) return true;
  if(!entry.cardName) return false;
  if(entry.kind==='play' || entry.kind==='trap') return true;
  if(entry.faille) return true;
  return (entry.effects||[]).some(eff=>eff && (eff.targetInstIds||[]).length>0);
}
// Faut-il retenir l'affichage des attaquants adverses derrière la file ?
// Oui si l'état reçu est ma phase de blocage ET que le lot contient une animation.
function shouldHoldCombatReveal(state, myKey, oppKey, batchAnimates){
  if(!batchAnimates || !state || state.gameOver) return false;
  if(state.phase!=='declareBlockersMe' || state.active!==oppKey) return false;
  const opp = state[oppKey];
  return !!(opp && Array.isArray(opp.attackers) && opp.attackers.length>0);
}
// Vue « avant désignation des attaquants » : même état, mais sans attaquants
// déclarés et en phase principale — la flèche rouge, la surbrillance et le
// bouton de blocage dépendent de ces deux champs. Copie superficielle.
function combatHeldView(state, oppKey){
  const held = Object.assign({}, state, { phase:'main' });
  held[oppKey] = Object.assign({}, state[oppKey], { attackers:[] });
  return held;
}
// </combat-sequencing>
function escapeHtmlGS(s){ return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

