// ============================================================
// Plateau de jeu — 02-etat-et-journal
// Échelle du plateau, état partagé (S, UI), signalement de bug, suivi du journal, évènements de combat, journal de partie
// (Chargé dans l ordre depuis spellcraft-server-board.html : tout est partagé, comme avant.)
// ============================================================
// ---------------- Mise à l'échelle du plateau ----------------
// Tout le plateau est construit pour une résolution de référence fixe
// (1920x1080) — plutôt que de retoucher chaque positionnement en pixels
// un par un pour chaque taille d'écran (risqué, aurait pu casser
// l'agencement déjà réglé), toute la zone se redimensionne uniformément
// pour s'adapter à l'écran réel du joueur, en conservant les proportions
// (letterboxing si le ratio d'écran diffère de 16:9).
const BOARD_REF_WIDTH = 1920, BOARD_REF_HEIGHT = 1080;
function updateBoardScale(){
  const outer = document.getElementById('app-outer');
  if(!outer) return;
  // Le tutoriel (window.SC_BOARD_LAYOUT) remplace la barre du haut par sa bande de narration :
  // il réserve cette hauteur en haut de l'écran et retire d'autant la hauteur de référence.
  const lay = window.SC_BOARD_LAYOUT || {};
  const top = lay.topReserve ? lay.topReserve() : 0;
  const baseH = lay.baseH || BOARD_REF_HEIGHT;
  if(window.SCBoardFit){ SCBoardFit.fit(outer, {refW:BOARD_REF_WIDTH, baseH:baseH, topReserve:top, phone:true}); return; }
  const scale = Math.min(window.innerWidth / BOARD_REF_WIDTH, (window.innerHeight - top) / baseH);
  outer.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', updateBoardScale);
updateBoardScale();

let S = null; // état de la partie reçu du serveur
let MY_KEY = null, OPP_KEY = null;
let UI = { selectingAttackers:false, selectedAttackers:[], pendingBlocker:null };
// Dernière action envoyée au serveur qui peut exiger un sacrifice (carte
// jouée, piège, pouvoir de héros, capacité activée) avec ses paramètres
// exacts. Si le serveur répond « sacrifice en attente », c'est cette action
// qu'on lui renvoie, complétée de la créature choisie (sacrificeInstId).
let LAST_SACRIFICEABLE_ACTION = null;

// ---------------- Signalement de problème ----------------
// Capture l'état complet de la partie au moment du clic (main, plateau,
// journal encore disponible) — pour éviter le "ça a buggé mais je ne sais
// plus exactement quand" pendant les sessions de test.
function openBugReportPanel(){
  document.getElementById('bug-report-status').textContent = '';
  document.getElementById('bug-report-text').value = '';
  document.getElementById('bug-report-panel').classList.add('show');
}
function closeBugReportPanel(){
  document.getElementById('bug-report-panel').classList.remove('show');
}
async function submitBugReport(){
  const desc = document.getElementById('bug-report-text').value.trim();
  const statusEl = document.getElementById('bug-report-status');
  if(!desc){ statusEl.textContent = 'Décris au moins brièvement ce qui se passe.'; return; }
  statusEl.textContent = 'Envoi en cours...';
  const res = await gsReportBug(desc, GS_SESSION_ID, S);
  if(res.error){ statusEl.textContent = 'Erreur : ' + res.error; return; }
  statusEl.textContent = 'Envoyé, merci !';
  setTimeout(closeBugReportPanel, 1200);
}

function debugLog(msg, cls){
  return; // panneau de débogage retiré de l'écran
  const el = document.getElementById('debug-log');
  const line = document.createElement('div');
  line.className = cls||'';
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.prepend(line);
}
// ---------------- Mise en surbrillance du journal ----------------
// Assombrit tout le plateau sauf les cibles concernées, au survol d'un
// effet du journal — uniquement pour les cibles encore présentes sur le
// plateau actuel. Si une cible a disparu depuis (morte, renvoyée en
// main...), elle est simplement ignorée : pas de reconstitution de l'état
// passé du plateau (jugée pas assez utile pour sa complexité).
function applySpotlight(highlightIds){
  const board = document.getElementById('board');
  board.classList.add('journal-spotlight-active');
  (highlightIds||[]).forEach(id=>{
    if(id==='hero-p1' || id==='hero-p2'){
      const slot = id==='hero-p1' ? 'p1' : 'p2';
      const el = document.getElementById(`hero-frame-${slot}`);
      if(el) el.classList.add('journal-highlight-hero');
    } else {
      document.querySelectorAll(`[data-instid="${id}"]`).forEach(elc=>elc.classList.add('journal-highlight'));
    }
  });
}
function clearSpotlight(){
  const board = document.getElementById('board');
  board.classList.remove('journal-spotlight-active');
  document.querySelectorAll('.journal-highlight').forEach(el=>el.classList.remove('journal-highlight'));
  document.querySelectorAll('.journal-highlight-hero').forEach(el=>el.classList.remove('journal-highlight-hero'));
}
function onJournalEffectHover(entry, highlightIds){
  applySpotlight(highlightIds);
}
function onJournalEffectLeave(){
  clearSpotlight();
}

// Reconstruit l'affichage du journal à partir de S.__gameLog — traduit
// "Vous"/"L'adversaire" selon le rôle du joueur qui regarde (la donnée
// stockée côté serveur est neutre, sans ça les deux joueurs verraient
// "Vous" pour les mêmes actions).

// ---------------- Suivi des entrées de journal déjà jouées ----------------
// Avant : un simple compteur (nombre d'entrées vues) + slice(compteur). Or le
// serveur élague le journal (il ne garde que les derniers tours) : le tableau
// pouvait RACCOURCIR, le slice ne renvoyait plus rien et sons/animations des
// nouvelles entrées étaient perdus. Et au rechargement de la page le compteur
// repartait à 0 : tout l'historique récent était rejoué d'un coup.
//
// createGameLogTracker() renvoie un suivi indépendant de la taille du tableau :
//  - entrée avec `seq` (compteur croissant posé par le serveur, jamais
//    réutilisé) : elle est nouvelle si seq > dernier seq traité ;
//  - entrée SANS seq (ancien serveur / partie commencée avant la mise à jour) :
//    on retrouve la position de la dernière entrée vue grâce à une empreinte
//    "tour # rang dans le tour # contenu". Le rang dans le tour ne change pas
//    quand les tours anciens sont élagués, donc l'empreinte reste valable ;
//  - tout premier appel (chargement de la page) : on considère tout ce qui
//    existe comme déjà vu, sans rien rejouer ;
//  - si le journal semble avoir été remis à zéro (seq plus petit qu'avant,
//    empreinte introuvable alors qu'elle devrait être là) : on se recale
//    silencieusement plutôt que de rejouer ou de planter.
// peek(entries) = liste des nouvelles entrées SANS rien mémoriser ;
// take(entries) = pareil, et mémorise (à n'appeler qu'une fois par rendu).
// Les entrées reviennent dans l'ordre du tableau (donc dans l'ordre du jeu),
// même si une reconnexion en apporte plusieurs d'un coup.
function createGameLogTracker(){
  let st = { initialized:false, lastSeq:-1, lastFp:null, lastFpTurn:null };
  const hasSeq = e => e && typeof e.seq==='number' && isFinite(e.seq);
  // Empreinte de chaque entrée sans seq (rang calculé par tour).
  function fingerprints(list){
    const rank = {};
    return list.map(e=>{
      const t = (e && typeof e.turn==='number') ? e.turn : 0;
      rank[t] = (rank[t]||0)+1;
      const content = JSON.stringify([
        e.ownerKey, e.raw, e.kind, e.cardId, e.cardName, e.deadInstId,
        e.highlightIds, (e.effects||[]).map(x=>x && x.text)
      ]);
      return { fp: t+'#'+rank[t]+'#'+content, turn:t };
    });
  }
  // État de référence après lecture de tout le tableau (rien à rejouer).
  function baseline(entries){
    const legacy = entries.filter(e=>!hasSeq(e));
    const fps = fingerprints(legacy);
    const last = fps.length ? fps[fps.length-1] : null;
    let maxSeq = -1;
    entries.forEach(e=>{ if(hasSeq(e) && e.seq>maxSeq) maxSeq = e.seq; });
    return { initialized:true, lastSeq:maxSeq, lastFp:last?last.fp:null, lastFpTurn:last?last.turn:null };
  }
  function scan(entries){
    entries = Array.isArray(entries) ? entries.filter(Boolean) : [];
    if(!st.initialized) return { fresh:[], next:baseline(entries) };

    const seqd = entries.filter(hasSeq);
    const legacy = entries.filter(e=>!hasSeq(e));
    let maxSeq = -1;
    seqd.forEach(e=>{ if(e.seq>maxSeq) maxSeq = e.seq; });
    // Compteur du serveur reparti plus bas : nouvelle partie / journal remis à zéro.
    if(seqd.length && maxSeq < st.lastSeq) return { fresh:[], next:baseline(entries) };

    // Entrées sans seq : retrouver la dernière entrée vue.
    const freshLegacy = new Set();
    const fps = fingerprints(legacy);
    if(legacy.length){
      if(st.lastFp===null){
        legacy.forEach(e=>freshLegacy.add(e));
      } else {
        let idx = -1;
        for(let i=fps.length-1;i>=0;i--){ if(fps[i].fp===st.lastFp){ idx=i; break; } }
        if(idx>=0){
          legacy.slice(idx+1).forEach(e=>freshLegacy.add(e));
        } else if(st.lastFpTurn < Math.min(...fps.map(f=>f.turn))){
          // la dernière entrée vue a été élaguée : tout ce qui reste est plus récent
          legacy.forEach(e=>freshLegacy.add(e));
        } else {
          return { fresh:[], next:baseline(entries) }; // journal incohérent : on se recale
        }
      }
    }
    const fresh = entries.filter(e=> hasSeq(e) ? e.seq>st.lastSeq : freshLegacy.has(e));
    const lastLegacy = fps.length ? fps[fps.length-1] : null;
    return { fresh, next:{
      initialized:true,
      lastSeq: Math.max(st.lastSeq, maxSeq),
      lastFp: lastLegacy ? lastLegacy.fp : st.lastFp,
      lastFpTurn: lastLegacy ? lastLegacy.turn : st.lastFpTurn
    }};
  }
  return {
    peek(entries){ return scan(entries).fresh; },
    take(entries){ const r = scan(entries); st = r.next; return r.fresh; }
  };
}
const GAMELOG_TRACKER = createGameLogTracker();
// Nouvelles entrées de S.__gameLog depuis le dernier rendu. commit=false :
// simple aperçu (ne marque rien comme vu).
function getNewGameLogEntries(commit=true){
  const entries = (S && S.__gameLog) || [];
  return commit ? GAMELOG_TRACKER.take(entries) : GAMELOG_TRACKER.peek(entries);
}
// ---------------- Événements de combat structurés (S.__combatEvents) ----------------
// Le serveur publie, en plus du journal, un tableau SÉPARÉ des 60 derniers
// événements de combat avec les dégâts RÉELS (après amplificateurs) :
//  - blockResolved : un attaquant bloqué par une créature (dégâts dans les
//    deux sens, armure absorbée, morts) ;
//  - heroDamage : dégâts non bloqués au héros, par attaquant.
// Même compteur `seq` que le journal : on réutilise donc la fabrique de suivi
// createGameLogTracker() (nouveaux = seq plus grand que le dernier vu). Le
// journal (S.__gameLog) continue de piloter QUELLE animation joue ; ces
// événements ne fournissent que les CHIFFRES. Sans événement (ancien serveur,
// partie commencée avant le déploiement, événement manquant) on retombe sur
// une estimation à partir de l'état affiché (PREV_S), sans erreur.
// <combat-events>
const SFX_ARMOR_ABSORB = 'clic';       // son léger déjà présent dans sfx/ (0,2 s) : coup absorbé par l'armure
const SFX_RIPOSTE_GAP_MS = 110;        // décalage entre le coup de l'attaquant et la riposte du bloqueur
// Son d'impact selon les dégâts : ≤4 léger, 5 à 10 moyen, au-delà fort.
// Seuils conservés : ils couvrent bien les créatures courantes (Force 1-10)
// et restent cohérents avec les dégâts au héros déjà réglés ainsi.
function hitSfxForDamage(n){ return n<=4 ? 'hitLight' : n<=10 ? 'hitMedium' : 'hitLarge'; }
function isCombatNumber(x){ return typeof x==='number' && isFinite(x); }
function cleanDamage(x){ return isCombatNumber(x) ? Math.max(0, Math.round(x)) : null; }
// Créature (état de jeu) par instId sur l'un des deux plateaux, ou null.
function findCreatureInState(state, instId){
  if(!state || !instId) return null;
  for(const key of ['p1','p2']){
    const c = ((state[key] && state[key].board) || []).find(x=>x && x.instId===instId);
    if(c) return c;
  }
  return null;
}
// Retire du lot `pool` (modifié) le premier événement `kind` qui satisfait
// `pred`, et le renvoie ; null sinon. Chaque événement sert donc une seule fois.
function takeCombatEvent(pool, kind, pred){
  if(!Array.isArray(pool)) return null;
  const i = pool.findIndex(e=>e && e.combatEvent===kind && (!pred || pred(e)));
  return i>=0 ? pool.splice(i,1)[0] : null;
}
// Résultat d'un blocage lu dans un événement blockResolved. Champ absent ou
// invalide = null (« inconnu »), complété ensuite par l'estimation.
function blockOutcomeFromEvent(ev){
  const dB = cleanDamage(ev.dmgToBlocker), dA = cleanDamage(ev.dmgToAttacker);
  const absB = typeof ev.armorAbsorbedBlocker==='boolean' ? ev.armorAbsorbedBlocker
             : (ev.armorAbsorbed===true && dB===0);
  const absA = typeof ev.armorAbsorbedAttacker==='boolean' ? ev.armorAbsorbedAttacker
             : (ev.armorAbsorbed===true && dA===0);
  return { exact:true, dmgToBlocker:dB, dmgToAttacker:dA, absorbedBlocker:absB, absorbedAttacker:absA,
           attackerDied:!!ev.attackerDied, blockerDied:!!ev.blockerDied };
}
// APPROXIMATIF (repli sans événement) : dégâts = force affichée (curAtk) de
// chaque créature dans l'état précédent PREV_S, donc sans amplificateurs,
// Initiative ni armure. Mort = présente avant, absente maintenant.
function estimateBlockOutcome(prevState, state, attackerId, blockerId){
  const att = findCreatureInState(prevState, attackerId);
  const blk = findCreatureInState(prevState, blockerId);
  return {
    exact:false,
    dmgToBlocker: att ? cleanDamage(att.curAtk ?? att.atk) : null,
    dmgToAttacker: blk ? cleanDamage(blk.curAtk ?? blk.atk) : null,
    absorbedBlocker:false, absorbedAttacker:false,
    attackerDied: !!att && !findCreatureInState(state, attackerId),
    blockerDied: !!blk && !findCreatureInState(state, blockerId)
  };
}
function resolveBlockOutcome(ev, prevState, state, attackerId, blockerId){
  const est = estimateBlockOutcome(prevState, state, attackerId, blockerId);
  if(!ev) return est;
  const out = blockOutcomeFromEvent(ev);
  if(out.dmgToBlocker===null){ out.dmgToBlocker = est.dmgToBlocker; out.exact = false; }
  if(out.dmgToAttacker===null){ out.dmgToAttacker = est.dmgToAttacker; out.exact = false; }
  return out;
}
// Dégâts au héros par attaquant : dmg + pierceExcess (excédent de Perforant)
// = ce que CET attaquant a réellement fait au héros ; la somme vaut `total`.
// Sans événement : amounts vide, seul le total (lu dans le journal) est connu.
function heroOutcome(ev, fallbackTotal){
  const amounts = {};
  let exact = false;
  if(ev && Array.isArray(ev.attackers)){
    exact = true;
    ev.attackers.forEach(a=>{
      if(a && a.instId) amounts[a.instId] = (cleanDamage(a.dmg)||0) + (cleanDamage(a.pierceExcess)||0);
    });
  }
  const total = (ev && cleanDamage(ev.total)!==null) ? cleanDamage(ev.total) : (cleanDamage(fallbackTotal)||0);
  return { exact, total, amounts };
}
// Chiffre flottant : {text, cls} ou null s'il n'y a rien à montrer (inconnu).
// Bouclier si l'armure a absorbé, « 0 » discret si aucun dégât, sinon -N
// (taille/couleur selon N : ≤4 petit, ≤10 moyen, au-delà grand).
function damagePopupSpec(amount, absorbed){
  if(absorbed) return { text:'🛡', cls:'dmg-shield' };
  if(!isCombatNumber(amount)) return null;
  if(amount<=0) return { text:'0', cls:'dmg-zero' };
  return { text:'-'+amount, cls: amount<=4 ? 'dmg-s' : amount<=10 ? 'dmg-m' : 'dmg-l' };
}
// Sons d'un blocage : un son par coup réellement porté (le coup de l'attaquant,
// puis la riposte SFX_RIPOSTE_GAP_MS plus tard : on les entend comme deux
// coups, pas comme un seul son écrasé). Armure absorbée = son léger distinct ;
// 0 dégât sans armure = silence (Initiative qui empêche le second coup...).
// Tout inconnu (aucun événement, aucune estimation) : ancien comportement,
// un hitMedium.
function planBlockSounds(o){
  const strikes = [
    { dmg:o.dmgToBlocker, absorbed:!!o.absorbedBlocker },
    { dmg:o.dmgToAttacker, absorbed:!!o.absorbedAttacker }
  ];
  if(!isCombatNumber(strikes[0].dmg) && !isCombatNumber(strikes[1].dmg) && !strikes[0].absorbed && !strikes[1].absorbed){
    return [{ key:'hitMedium', delayMs:0, volume:0.6 }];
  }
  const out = [];
  strikes.forEach(s=>{
    const key = s.absorbed ? SFX_ARMOR_ABSORB : (isCombatNumber(s.dmg) && s.dmg>0 ? hitSfxForDamage(s.dmg) : null);
    if(key) out.push({ key, delayMs: out.length*SFX_RIPOSTE_GAP_MS, volume: out.length ? 0.5 : 0.6 });
  });
  return out;
}
// Le plus fort des sons planifiés (mode instantané : un seul son, sans décalage).
function pickLoudestSound(plan){
  const rank = k => k==='hitLarge' ? 3 : k==='hitMedium' ? 2 : k==='hitLight' ? 1 : 0;
  let best = null;
  (plan||[]).forEach(p=>{ if(!best || rank(p.key)>rank(best.key)) best = p; });
  return best ? { key:best.key, delayMs:0, volume:best.volume } : null;
}
// Plus gros coup d'un blocage (pour le tremblement d'écran) ; null si inconnu.
function maxBlockDamage(o){
  const v = [o.dmgToBlocker, o.dmgToAttacker].filter(isCombatNumber);
  return v.length ? Math.max(...v) : null;
}
// </combat-events>
const COMBAT_EVENT_TRACKER = createGameLogTracker();
// Nouveaux événements de combat depuis le dernier rendu (voir getNewGameLogEntries).
// On ignore ce qui n'a pas de seq numérique : le suivi par empreinte du journal
// ne convient pas à ces objets, et le contrat serveur garantit un seq.
function getNewCombatEvents(commit=true){
  const all = (S && Array.isArray(S.__combatEvents)) ? S.__combatEvents : [];
  const evs = all.filter(e=>e && e.combatEvent && isCombatNumber(e.seq));
  return commit ? COMBAT_EVENT_TRACKER.take(evs) : COMBAT_EVENT_TRACKER.peek(evs);
}
// Fait trembler tout l'écran sur un gros coup — jamais sur un petit pichenette
// (tier 'hitLight' ignoré), pour que ça reste marquant plutôt que fatiguant.
function shakeScreen(tier){
  if(tier!=='hitMedium' && tier!=='hitLarge') return;
  const outer = document.getElementById('board-scale-outer');
  if(!outer) return;
  const cls = tier==='hitLarge' ? 'shake-large' : 'shake-medium';
  outer.classList.remove('shake-medium','shake-large');
  void outer.offsetWidth; // force le reflow pour pouvoir rejouer l'animation si elle tourne déjà
  outer.classList.add(cls);
  setTimeout(()=>outer.classList.remove(cls), tier==='hitLarge' ? 460 : 360);
}

// ---------------- Journal : accords grammaticaux et perspective ----------------
// Le serveur écrit les effets à la 3e personne du singulier ("inflige 3
// dégâts à ...") et, pour les héros, avec des tournures figées sur p1
// ("votre héros" = p1, "l'adversaire" = p2). Ces fonctions les remettent à
// la bonne personne et dans la perspective du joueur local (MY_KEY).
const JOURNAL_VERB_IRREGULAR = {
  fait:'faites', met:'mettez', détruit:'détruisez', étourdit:'étourdissez',
  réduit:'réduisez', gèle:'gelez', récupère:'récupérez', renforcera:'renforcerez',
  renvoie:'renvoyez', envoie:'envoyez', dit:'dites'
};
function journalConjugateYou(verb){
  if(Object.prototype.hasOwnProperty.call(JOURNAL_VERB_IRREGULAR, verb)) return JOURNAL_VERB_IRREGULAR[verb];
  if(/era$/.test(verb)) return verb.slice(0,-1)+'ez';        // futur : renforcera -> renforcerez
  if(/è([^aeiouyéèêàâîôûç]+)e$/.test(verb)) return verb.replace(/è([^aeiouyéèêàâîôûç]+)e$/, 'é$1ez');
  if(/e$/.test(verb)) return verb+'z';                        // inflige -> infligez
  if(/it$/.test(verb)) return verb.slice(0,-1)+'ssez';       // verbes en -ir
  return verb;
}
// Mots-clés internes (anglais) -> libellés français, uniquement entre
// guillemets ou parenthèses pour ne pas toucher aux noms de cartes.
function journalFrenchKeywords(text){
  return text.replace(/(["(])(charge|flying|reach|pierce|lifesteal|initiative|armor|stealth|relentless|fearful|protecteur|toxic|discret|imparable|fugace|assault|debut|final)([")])/g,
    (m,a,k,b)=>a+(KEYWORD_LABELS[k]||k)+b);
}
// Remplace la tournure "votre héros" / "l'adversaire" par celle qui est juste
// pour le joueur local, d'après le héros réellement visé (id "hero-p1"/"hero-p2").
function journalFixHeroPerspective(text, eff, actorKey){
  const ids = (eff && eff.targetInstIds || []).filter(id=>id==='hero-p1' || id==='hero-p2');
  if(ids.length!==1) return text;
  const heroKey = ids[0]==='hero-p1' ? 'p1' : 'p2';
  let phrase;
  if(heroKey===MY_KEY) phrase = 'votre héros';
  else if(heroKey===actorKey) phrase = 'son héros';
  else phrase = "l'adversaire";
  return text.replace(/votre héros|l'adversaire/, phrase);
}
// Phrase complète pour un effet : sujet + verbe accordé + complément. Jamais "undefined".
function journalEffectSentence(eff, actorKey){
  let t = String((eff && eff.text) || '').trim();
  t = t.replace(/\s*undefined\s*/g, ' ').replace(/\s+/g,' ').trim();
  if(!t) return '';
  t = journalFrenchKeywords(journalFixHeroPerspective(t, eff, actorKey));
  const isMe = actorKey===MY_KEY;
  const first = t.split(' ')[0];
  const rest = t.slice(first.length);
  // Texte qui porte déjà son sujet (nom de carte entre guillemets, "trop de sorts...") : tel quel.
  if(/^["«]/.test(t) || /^(trop|le|la|les|un|une|des|l')$/i.test(first) || /^l'/i.test(first)) return t + '.';
  if(!/^[a-zéèêëàâîïôûùç]+$/i.test(first)) return t + '.';
  if(isMe) return `Vous ${journalConjugateYou(first)}${rest}.`;
  return `L'adversaire ${first}${rest}.`;
}

// Chocs de blocage en attente (voir renderGameLog) : le serveur indique, par
// `clashAfterSeq` sur l'événement blockResolved, le numéro du journal juste
// AVANT le choc. Tout ce qui est écrit avant (pièges de combat, capacités
// « quand bloquée / quand bloque ») s'anime d'abord ; le choc se joue dès la
// première entrée suivante (mort au combat...) ou à la fin du lot. Un choc
// `pending` attend que le serveur ait réellement résolu le combat (capacité à
// cible choisie en pause avant le combat : S.pendingCombat) ; son événement
// arrive alors dans un lot ultérieur.
let AWAITING_STRIKES = [];
function flushAwaitingStrikes(curSeq, newCombatEvents){
  if(!AWAITING_STRIKES.length) return;
  const keep = [];
  AWAITING_STRIKES.forEach(job=>{
    if(job.pending){
      const ev = takeCombatEvent(newCombatEvents, 'blockResolved',
        e=>e.attackerInstId===job.attackerInstId && e.blockerInstId===job.blockerInstId);
      if(ev){
        job.ev = ev; job.pending = false;
        job.afterSeq = isCombatNumber(ev.clashAfterSeq) ? ev.clashAfterSeq : -1;
        job.duel = newCombatEvents.filter(e=>e && e.combatEvent==='blockResolved' &&
          (e.attackerInstId===job.attackerInstId || e.blockerInstId===job.blockerInstId)).length === 0;
      } else if(S && S.pendingCombat && S.pendingCombat.attackerId===job.attackerInstId && S.pendingCombat.blockerId===job.blockerInstId){
        keep.push(job); return; // le combat n'a pas encore eu lieu côté serveur
      } else {
        job.pending = false; job.afterSeq = -1; // plus de pause et pas d'événement : repli sur l'estimation
      }
    }
    if(job.ev && job.ev.combatCancelled) return; // combat annulé : rien à animer
    const ready = !isCombatNumber(curSeq) || curSeq===Infinity || job.afterSeq < curSeq;
    if(!ready){ keep.push(job); return; }
    playCombatStrike(job.attackerInstId, job.blockerInstId,
      resolveBlockOutcome(job.ev, PREV_S, S, job.attackerInstId, job.blockerInstId), job.duel);
  });
  AWAITING_STRIKES = keep;
}

function renderGameLog(){
  const el = document.getElementById('log');
  if(!el || !S) return;

  // Anime et sonorise les NOUVELLES entrées depuis le dernier rendu (marche
  // pour les deux joueurs, pas seulement celui qui vient d'agir, puisque
  // c'est basé sur l'état reçu et pas sur une action locale).
  // Événements de combat structurés (chiffres exacts) : une seule lecture par
  // rendu ; chaque entrée de journal « consomme » son événement (takeCombatEvent).
  const newCombatEvents = getNewCombatEvents();
  const __batchEntries = getNewGameLogEntries();
  const __batchDeadIds = collectBatchDeadIds(__batchEntries);
  // Cartes qui retournent dans le deck (Cycle) : leur spirale remplace la dissolution de mort
  const __batchCycleIds = new Set(__batchEntries.filter(e=>e && e.kind==='cycle' && e.sourceInstId).map(e=>e.sourceInstId));
  __batchEntries.forEach(entry=>{
    flushAwaitingStrikes(entry.seq, newCombatEvents);
    if(entry.raw){
      if(entry.raw.includes('attaque avec')){
        playSfx('attack');
      } else if(isBlockLogEntry(entry)){
        // "bloque la créature X avec Y" : les deux se ruent l'une sur l'autre
        const [attackerInstId, blockerInstId] = entry.highlightIds;
        debugLog(`[anim] combat bloqué détecté : attaquant=${attackerInstId} bloqueur=${blockerInstId}`, 'log-ok');
        // Chiffres exacts via l'événement blockResolved ; sans lui, estimation
        // depuis PREV_S (état encore affiché). Le(s) son(s) d'impact jouent
        // au moment du choc, dans playCombatStrike.
        const blockEv = takeCombatEvent(newCombatEvents, 'blockResolved',
          e=>e.attackerInstId===attackerInstId && e.blockerInstId===blockerInstId);
        // Combat annulé (un piège type « Frappe préventive » a éliminé une des
        // deux créatures avant l'affrontement) : aucun choc à animer.
        if(!(blockEv && blockEv.combatCancelled)){
          // Duel strict : cet attaquant n'a qu'UN bloqueur et ce bloqueur ne bloque que lui.
          const duel = newCombatEvents.filter(e=>e && e.combatEvent==='blockResolved' &&
            (e.attackerInstId===attackerInstId || e.blockerInstId===blockerInstId)).length === 0;
          // Le choc n'est PAS joué tout de suite : le journal écrit « X bloque Y »
          // avant les effets qui se déclenchent avant le combat (pièges comme
          // « Force de géant », capacités « quand cette créature est bloquée »...).
          // On le garde en attente jusqu'à la première entrée écrite APRÈS le
          // moment du choc (voir flushAwaitingStrikes), pour que ces effets
          // s'animent d'abord.
          const waiting = !blockEv && S && S.pendingCombat &&
            S.pendingCombat.attackerId===attackerInstId && S.pendingCombat.blockerId===blockerInstId;
          AWAITING_STRIKES.push({ attackerInstId, blockerInstId, ev:blockEv||null, duel, pending:!!waiting,
            afterSeq: (blockEv && isCombatNumber(blockEv.clashAfterSeq)) ? blockEv.clashAfterSeq : -1 });
        }
      } else if(entry.raw.includes('perdu') && entry.raw.includes('point')){
        // dégâts non bloqués au héros : popup + son selon l'ampleur, et
        // chaque attaquant se rue vers le héros (même animation que pour
        // un combat bloqué, la cible étant simplement le héros ici)
        const m = entry.raw.match(/(\d+) point/);
        if(m){
          const dmg = parseInt(m[1]);
          const heroSlot = entry.ownerKey===MY_KEY ? 'p1' : 'p2';
          // Événement heroDamage correspondant (même héros, même total) :
          // donne les dégâts de CHAQUE attaquant. Sans lui : un seul chiffre
          // (le total du journal) et un seul son, au premier choc.
          const heroEv = takeCombatEvent(newCombatEvents, 'heroDamage',
            e=>e.heroOwner===entry.ownerKey && e.total===dmg);
          const ho = heroOutcome(heroEv, dmg);
          const attackers = entry.highlightIds||[];
          const hitHero = (amount)=>{
            const heroEl = document.getElementById(`hero-frame-${heroSlot}`);
            if(heroEl){ flashCombatImpact(heroEl); spawnDamageNumber(heroEl, amount); }
            playSfx(hitSfxForDamage(amount));
            shakeScreen(hitSfxForDamage(amount));
          };
          if(!attackers.length){
            hitHero(ho.total); // aucun attaquant à animer : tout de suite, comme avant
          }
          let totalShown = false;
          if(combatInstant() && attackers.length){
            // mode instantané : pas de charge ni de chiffre, un seul son (le plus fort)
            const loudest = ho.exact ? Math.max(0, ...Object.values(ho.amounts)) : ho.total;
            if(loudest>0) playSfx(hitSfxForDamage(loudest));
            return;
          }
          attackers.forEach(attackerInstId=>{
            queueCombatAnim(()=>{
              const attRes = resolveCombatEl(attackerInstId);
              const attEl = attRes.el;
              const heroEl = document.getElementById(`hero-frame-${heroSlot}`);
              const onImpact = ()=>{
                if(ho.exact){
                  const amount = ho.amounts[attackerInstId];
                  if(amount>0) hitHero(amount);
                } else if(!totalShown){
                  totalShown = true;
                  hitHero(ho.total);
                }
              };
              // Pas d'élément à animer : on montre quand même chiffre et son.
              if(!attEl || !heroEl){ if(attRes.temp && attEl) attEl.remove(); onImpact(); return Promise.resolve(); }
              return arrowThenLunge(attEl, heroEl, { onImpact }).then(()=>{ if(attRes.temp) attEl.remove(); });
            });
          });
        }
      }
    } else if(entry.deadInstId){
      // Une créature vient de mourir au combat (voir logDirect côté
      // serveur) — cas à part : ni son de carte jouée, ni flèche
      // d'effet, juste l'animation de dissolution.
      if(combatInstant()) playSfx('card-death'); // mode instantané : le son seul, sans file
      else if(!__batchCycleIds.has(entry.deadInstId)) queueCombatAnim(()=>playCardDeathAnim(entry.deadInstId));
    } else if(entry.kind==='cycle'){
      // Cycle : la carte retourne mélangée dans le deck (spirale verte vers la pioche de son propriétaire)
      playSfx('cardPlay');
      if(window.BFX2 && !combatInstant()){
        const __deck = document.getElementById(`deck-zone-${entry.ownerKey===MY_KEY?'p1':'p2'}`);
        queueCombatAnim(()=>BFX2.cycle(entry.sourceInstId, __deck));
      }
    } else if(entry.cardName){
      const full = entry.cardId ? JOURNAL_CARD_LOOKUP[entry.cardId] : null;
      if(entry.kind==='trap'){
        playSfx('trap');
      } else {
        playSfx(full && full.type==='Sortilège' ? 'cast' : (full && full.type==='Créature' ? 'creature-arrive' : 'cardPlay'));
      }

      // Révélation 3D — uniquement pour une carte qui vient d'être jouée ou
      // un piège qui se déclenche (pas les capacités qui s'enchaînent
      // ensuite : ça spammerait l'écran à chaque tour un peu chargé).
      // Important : on ne teste PAS `full` ici (il peut encore être
      // manquant si JOURNAL_CARD_LOOKUP — chargé en arrière-plan — n'a pas
      // fini de se remplir à cet instant précis, typique en tout début de
      // partie), sinon l'animation est silencieusement sautée pour cette
      // carte. On relit JOURNAL_CARD_LOOKUP au moment où l'animation
      // s'exécute réellement (dans la file, donc après un léger délai qui
      // laisse largement le temps au chargement de se terminer).
      // Créature posée (déjà sur le plateau) : pose animée petite, sans grande carte au milieu
      // Sort avec cibles visibles : la carte devient un orbe qui part vers elles (voir
      // playSpellOrb). Les flèches de capacité vers ces mêmes cibles ne sont alors pas rejouées.
      const spellOrbTargets = (entry.kind==='play' && full && full.type==='Sortilège' && window.BFX && !entry.faille)
        ? planSpellOrbTargets(entry) : [];
      const spellOrbIds = new Set(spellOrbTargets.map(t=>t.id));
      let landed = false;
      if(entry.kind==='play' && entry.sourceInstId && window.BFX && !combatInstant()
         && (document.querySelector(`.lane .card-slot[data-inst-id="${entry.sourceInstId}"]`) || __boardRenderFrozen)){
        const crOnBoard = findCreatureInState(S, entry.sourceInstId);
        if(crOnBoard){
          // Plateau gelé (une mort est dans le même lot) : la créature n'est pas encore à l'écran ;
          // sa pose affichera d'abord le plateau « jusqu'ici » (voir renderStagedBoardView), pour
          // qu'elle arrive AVANT que ses effets (cible détruite...) ne se voient.
          planCreatureLanding(entry, (entry.cardId && JOURNAL_CARD_LOOKUP[entry.cardId]) || crOnBoard, { stageDeadIds: __batchDeadIds });
          landed = true;
        }
      }
      if(!landed && (entry.kind==='play' || entry.kind==='trap')){
        const ownerP = S[entry.ownerKey];
        const ownerBackUrl = ownerP ? ownerP.cardBackUrl : null;
        const cardId = entry.cardId;
        queueCombatAnim(()=>{
          const fullAtAnimTime = cardId ? JOURNAL_CARD_LOOKUP[cardId] : null;
          if(!fullAtAnimTime) return Promise.resolve(); // carte vraiment introuvable (cas rarissime) : on ne bloque pas la file pour autant
          return playCardFlipReveal(fullAtAnimTime, {isTrap: entry.kind==='trap', isSpell: fullAtAnimTime.type==='Sortilège', backUrl: ownerBackUrl, fxMine: entry.ownerKey===MY_KEY, orbTargets: spellOrbTargets}).then(()=>{
            // (le tremblement des créatures de 10 de force ou plus est joué par BFX à leur arrivée sur le plateau)
          });
        });
      }

      // Faille : brèche qui s'ouvre et révèle la carte qui se déclenche (avant les flèches vers les cibles)
      if(entry.faille && !combatInstant()){
        const __fCardId = entry.cardId, __fMine = entry.ownerKey===MY_KEY;
        playSfx('cast');
        queueCombatAnim(()=>{
          const fc = __fCardId ? JOURNAL_CARD_LOOKUP[__fCardId] : null;
          return fc ? playFailleRift(fc, {fxMine: __fMine}) : Promise.resolve();
        });
      }

      // Effets de capacité des créatures et artefacts (panoplie BFX2) : déclenchement (or),
      // Arrivée (cyan), Assaut (rouge), Final (violet). Les sorts gardent leur orbe, les pièges leur éclat.
      if(window.BFX2 && entry.trigger && entry.sourceInstId && !combatInstant()
         && (entry.kind==='creature_trigger' || entry.kind==='artifact_trigger'
             || (entry.kind==='play' && full && full.type!=='Sortilège' && full.type!=='Piège'))){
        const __fxKind = BFX2.kindOf(entry.trigger);
        if(__fxKind){
          const __fxId = entry.sourceInstId;
          queueCombatAnim(()=>BFX2.playOnCard(__fxKind, __fxId));
        }
      }
      // Pouvoir de héros activé : invocation runique autour du portrait du héros
      if(window.BFX2 && entry.kind==='hero_activate' && !combatInstant()){
        const __hMine = entry.ownerKey===MY_KEY;
        queueCombatAnim(()=>BFX2.heroPower(document.getElementById(`hero-portrait-${__hMine?'p1':'p2'}`), __hMine));
      }

      // Artefact utilisé : rouage qui s'emballe, éclats et reflet sur l'artefact
      if(entry.kind==='artifact_activate' && window.BFX){
        queueCombatAnim(()=>BFX.artifactUse(resolveLogSourceEl(entry), entry.ownerKey===MY_KEY));
      }

      // Flèche d'effet vers chaque cible touchée par une capacité — ou
      // éclat doré distinct si la capacité s'est ciblée elle-même. Si le
      // texte de l'effet indique que la cible meurt (détruite, sacrifiée...),
      // l'animation de dissolution remplace la flèche — une flèche vers une
      // carte déjà retirée du plateau ne pouvait de toute façon rien viser.
      (entry.effects||[]).forEach(eff=>{
        const isDeath = /meurt au combat|est détruite|^détruit "|^sacrifie "/i.test(eff.text||'');
        (eff.targetInstIds||[]).forEach(targetInstId=>{
          if(!isDeath && spellOrbIds.has(targetInstId)) return; // déjà atteinte par l'orbe du sort
          queueCombatAnim(()=>{
            if(isDeath) return playCardDeathAnim(targetInstId);
            const sourceEl = resolveLogSourceEl(entry);
            const fxMine = entry.ownerKey ? entry.ownerKey===MY_KEY : true; // bleu = vous, rouge = adversaire
            if(entry.sourceInstId && targetInstId===entry.sourceInstId){
              return flashSelfTrigger(sourceEl, fxMine);
            }
            const targetEl = resolveLogTargetEl(targetInstId);
            return fireAbilityArrow(sourceEl, targetEl, fxMine);
          });
        });
      });
    }
  });
  flushAwaitingStrikes(Infinity, newCombatEvents);

  journalRenderList(el, S.__gameLog||[]);
}

// ============================================================
// JOURNAL — affichage (visibilité + exécution)
// ============================================================
// - Séparateurs de tour (« Tour 3 · Votre tour »).
// - Trait de couleur par joueur (bleu = vous, rouge = adversaire) et icône
//   par type d'entrée ; dégâts en rouge, soins en vert, mana en bleu.
// - Un combat (attaque → blocage → dégâts → morts) est regroupé en un bloc.
// - Mise à jour incrémentale : les lignes déjà affichées sont réutilisées
//   (le survol / la surbrillance en cours n'est plus coupé), seules les
//   nouvelles sont ajoutées, et le panneau reste calé sur la dernière ligne
//   sauf si le joueur est remonté lire plus haut.
const JOURNAL_ACTIVE_KINDS = new Set(['play','hero_activate','artifact_activate','creature_activate','region_activate']);

// Verbes des lignes « brutes » du serveur, conjugués selon le sujet.
function journalRawSentence(entry){
  const isMe = entry.ownerKey===MY_KEY;
  let r = String(entry.raw||'').replace(/\s*undefined\s*/g,' ').replace(/\s+/g,' ').trim();
  let m;
  if((m = r.match(/^\{who\} attaque avec (\d+) créatures?$/))){
    const n = parseInt(m[1],10);
    return `${isMe?'Vous attaquez':"L'adversaire attaque"} avec ${n} créature${n>1?'s':''}.`;
  }
  if((m = r.match(/^\{who\} bloque la créature "(.+)" avec "(.+)"$/))){
    return `${isMe?'Vous bloquez':"L'adversaire bloque"} "${m[1]}" avec "${m[2]}".`;
  }
  if((m = r.match(/^\{who\} a perdu (\d+) points? de vie dans cette attaque$/))){
    const n = parseInt(m[1],10);
    return `${isMe?'Vous perdez':"L'adversaire perd"} ${n} point${n>1?'s':''} de vie.`;
  }
  return journalFrenchKeywords(r.replace('{who}', isMe?'Vous':"L'adversaire"));
}
// Échappe puis colore les chiffres importants (dégâts, soins, mana, stats).
function journalRich(text){
  let h = escapeHtmlGS(String(text));
  const heal = /soign|gagn|récupér/i.test(text) && !/dégâts/i.test(text);
  h = h.replace(/(\d+) (dégâts?|points? de vie)/g, (m,n,w)=> heal && /vie/.test(w) ? m : `<span class="jr-dmg">${n} ${w}</span>`);
  h = h.replace(/(\d+) PV/g, (m,n)=> /soigne/i.test(text) ? `<span class="jr-heal">${n} PV</span>` : `<span class="jr-dmg">${n} PV</span>`);
  h = h.replace(/(\d+) mana( fragile)?/g, '<span class="jr-mana">$1 mana$2</span>');
  h = h.replace(/([+-]\d+\/[+-]\d+)/g, '<span class="jr-stat">$1</span>');
  return h;
}
function journalIcon(entry){
  if(entry.raw){
    const r = String(entry.raw);
    if(/attaque avec/.test(r)) return '⚔';
    if(/bloque/.test(r)) return '🛡';
    if(/a perdu/.test(r)) return '💥';
    if(/meurt|détruit/.test(r)) return '☠';
    return '•';
  }
  switch(entry.kind){
    case 'trap': return '🪤';
    case 'hero_trigger': case 'hero_activate': return '👑';
    case 'artifact_activate': case 'artifact_trigger': return '⚒';
    case 'creature_trigger': case 'creature_activate': return '✦';
  }
  if(typeof entry.kind==='string' && entry.kind.indexOf('region')===0) return '🌍';
  const c = entry.cardId ? (JOURNAL_CARD_LOOKUP||{})[entry.cardId] : null;
  const t = c && c.type;
  if(t==='Sortilège') return '✨';
  if(t==='Artefact') return '⚒';
  if(t==='Piège') return '🪤';
  if(t==='Créature') return '🐾';
  return '🃏';
}
// Qui joue chaque tour : déduit des entrées (attaque, carte jouée, activation),
// puis propagé par alternance aux tours sans indice.
function journalTurnOwners(entries){
  const owners = {};
  entries.forEach(e=>{
    const t = e.turn;
    if(typeof t!=='number' || owners[t]) return;
    const leads = (e.raw && /attaque avec/.test(e.raw)) || JOURNAL_ACTIVE_KINDS.has(e.kind);
    if(leads) owners[t] = e.ownerKey;
  });
  const known = Object.keys(owners).map(Number);
  if(known.length){
    entries.forEach(e=>{
      const t = e.turn;
      if(typeof t!=='number' || owners[t]) return;
      const ref = known[0];
      owners[t] = ((t-ref)%2===0) ? owners[ref] : (owners[ref]==='p1' ? 'p2' : 'p1');
    });
  }
  return owners;
}
function journalEntrySig(e){
  return JSON.stringify([e.seq, e.turn, e.ownerKey, e.raw||null, e.cardName||null, e.kind||null,
    (e.effects||[]).map(x=>x&&x.text), e.highlightIds||null]);
}
function journalSeparatorEl(turn, owner){
  const d = document.createElement('div');
  const round = Math.ceil(turn/2);
  const mine = owner===MY_KEY;
  d.className = 'journal-turn ' + (owner ? (mine ? 'mine' : 'opp') : '');
  d.textContent = owner ? `Tour ${round} · ${mine ? 'Votre tour' : "Tour de l'adversaire"}` : `Tour ${round}`;
  return d;
}

// Construit la ligne d'une entrée du journal.
function buildJournalEntryEl(entry){
    const who = entry.ownerKey===MY_KEY ? 'Vous' : "L'adversaire";
    const isMe = entry.ownerKey===MY_KEY;
    const line = document.createElement('div');
    line.className = 'journal-entry ' + (isMe ? 'mine' : 'opp');
    // Entrées de région : le texte vient toujours de la carte (nom + effets du
    // serveur), jamais d'un libellé figé côté client. Si le nom manque, on le
    // relit sur la région du joueur concerné ; si l'entrée n'a ni nom ni
    // effet lisible, on affiche une phrase neutre plutôt que « undefined ».
    const isRegionKind = typeof entry.kind==='string' && entry.kind.indexOf('region')===0;
    if(!entry.raw && !entry.cardName && isRegionKind){
      const rp = S[entry.ownerKey];
      if(rp && rp.region && rp.region.name){ entry.cardName = rp.region.name; if(!entry.cardId) entry.cardId = rp.region.id; }
    }
    if(!entry.raw && !entry.cardName){
      const plain = (typeof entry.text==='string' && entry.text) || (typeof entry.message==='string' && entry.message) || '';
      entry.raw = plain || (isRegionKind ? '{who} : une région se déclenche.' : '');
    }
    if(entry.raw){
      // message de combat : {who} est remplacé, et si des créatures sont
      // listées, tout le texte devient survolable — surbrillance sur
      // place si tout est encore là, sinon voyage dans le temps.
      const rawSentence = journalRawSentence(entry);
      line.innerHTML = `<span class="jicon">${journalIcon(entry)}</span>` + journalRich(rawSentence);
      if(entry.highlightIds && entry.highlightIds.length){
        line.classList.add('hl-ref');
        line.onmouseenter = ()=>onJournalEffectHover(entry, entry.highlightIds);
        line.onmouseleave = onJournalEffectLeave;
      }
    } else {
      const nameSpan = `<span class="card-name-ref" data-cardid="${escapeHtmlGS(String(entry.cardId||''))}">"${escapeHtmlGS(String(entry.cardName||''))}"</span>`;
      // Une phrase d'en-tête distincte par catégorie — validées ensemble,
      // voir la conversation sur la refonte du journal.
      const headerPhrase = ({
        play: isMe ? `Vous jouez la carte ${nameSpan}.` : `L'adversaire joue la carte ${nameSpan}.`,
        trap: isMe ? `Votre piège ${nameSpan} se déclenche.` : `Le piège ${nameSpan} de l'adversaire se déclenche.`,
        creature_trigger: `La capacité de ${nameSpan} se déclenche.`,
        creature_activate: isMe ? `Vous activez la capacité de ${nameSpan}.` : `L'adversaire active la capacité de ${nameSpan}.`,
        hero_activate: isMe ? `Vous activez le pouvoir de votre héros ${nameSpan}.` : `L'adversaire active le pouvoir de son héros ${nameSpan}.`,
        hero_trigger: isMe ? `Le pouvoir de votre héros ${nameSpan} se déclenche.` : `Le pouvoir du héros adverse ${nameSpan} se déclenche.`,
        artifact_activate: isMe ? `Vous activez ${nameSpan}.` : `L'adversaire active ${nameSpan}.`,
        artifact_trigger: `La capacité de ${nameSpan} se déclenche.`,
        region_trigger: isMe ? `La capacité de votre région ${nameSpan} se déclenche.` : `La capacité de la région adverse ${nameSpan} se déclenche.`,
        region_activate: isMe ? `Vous activez la capacité de votre région ${nameSpan}.` : `L'adversaire active la capacité de sa région ${nameSpan}.`,
        // La région remplace le gain de mana du début de tour (le texte précis
        // de l'effet suit, fourni par le serveur) :
        region_replace: isMe ? `Votre région ${nameSpan} remplace votre gain de mana.` : `La région adverse ${nameSpan} remplace son gain de mana.`,
      })[entry.kind] || (isRegionKind
        ? (isMe ? `La capacité de votre région ${nameSpan} se déclenche.` : `La capacité de la région adverse ${nameSpan} se déclenche.`)
        : `${who} joue ${nameSpan}.`);
      // On ignore les effets sans texte (évite « Vous undefined. »).
      const effects = (entry.effects || []).filter(e=>e && typeof e.text==='string' && journalEffectSentence(e, entry.ownerKey));
      const header = document.createElement('div');
      header.className = 'journal-entry-card';
      const iconHtml = `<span class="jicon">${journalIcon(entry)}</span>`;
      if(effects.length <= 1){
        // Un seul effet (ou aucun) : deux phrases distinctes plutôt qu'une
        // seule avec "et" — "Vous jouez X. Vous gagnez 1 mana fragile."
        const eff = effects[0];
        header.innerHTML = iconHtml + (eff
          ? `${headerPhrase} <span class="effect-sentence">${journalRich(journalEffectSentence(eff, entry.ownerKey))}</span>`
          : headerPhrase);
        if(eff && eff.targetInstIds && eff.targetInstIds.length){
          const effSpan = header.querySelector('.effect-sentence');
          effSpan.classList.add('hl-ref');
          effSpan.onmouseenter = ()=>onJournalEffectHover(entry, eff.targetInstIds);
          effSpan.onmouseleave = onJournalEffectLeave;
        }
      } else {
        header.innerHTML = `${iconHtml}${headerPhrase} <span class="effect-count">(${effects.length} effets)</span>`;
      }
      line.appendChild(header);
      if(effects.length > 1){
        const list = document.createElement('div');
        list.className = 'journal-entry-effects';
        effects.forEach(eff=>{
          const effLine = document.createElement('div');
          effLine.className = 'journal-effect-line';
          effLine.innerHTML = journalRich(journalEffectSentence(eff, entry.ownerKey));
          if(eff.targetInstIds && eff.targetInstIds.length){
            effLine.classList.add('hl-ref');
            effLine.onmouseenter = ()=>onJournalEffectHover(entry, eff.targetInstIds);
            effLine.onmouseleave = onJournalEffectLeave;
          }
          list.appendChild(effLine);
        });
        line.appendChild(list);
      }
      const ref = line.querySelector('.card-name-ref');
      if(ref && entry.cardId){
        ref.onmouseenter = (ev)=>{ const c = JOURNAL_CARD_LOOKUP[entry.cardId]; if(c) showCardPreviewHover(c, ev); };
        ref.onmousemove = moveHeroPreview;
        ref.onmouseleave = hidePreview;
      }
    }
    return line;
}

// Découpe le journal en éléments affichables : séparateurs de tour, lignes
// isolées et blocs de combat. Chaque élément porte une signature : si elle
// est identique à celle d'un rendu précédent, l'élément DOM est réutilisé.
function journalBuildItems(entries){
  const owners = journalTurnOwners(entries);
  const items = [];
  let lastTurn = null;
  let i = 0;
  while(i < entries.length){
    const e = entries[i];
    if(e.turn !== lastTurn){
      lastTurn = e.turn;
      const owner = owners[e.turn] || null;
      items.push({ sig:`turn|${e.turn}|${owner}`, make:()=>journalSeparatorEl(e.turn, owner) });
    }
    if(e.raw && /attaque avec/.test(e.raw)){
      const group = [e];
      let j = i+1;
      while(j < entries.length && entries[j].turn === e.turn && !JOURNAL_ACTIVE_KINDS.has(entries[j].kind)){
        group.push(entries[j]); j++;
      }
      const side = e.ownerKey===MY_KEY ? 'mine' : 'opp';
      items.push({
        sig:'combat|' + group.map(journalEntrySig).join('|'),
        make:()=>{
          const box = document.createElement('div');
          box.className = 'journal-combat ' + side;
          const head = document.createElement('div');
          head.className = 'journal-combat-head';
          head.textContent = '⚔ Combat';
          box.appendChild(head);
          group.forEach(g=>box.appendChild(buildJournalEntryEl(g)));
          return box;
        }
      });
      i = j;
    } else {
      items.push({ sig:'e|' + journalEntrySig(e), make:()=>buildJournalEntryEl(e) });
      i++;
    }
  }
  return items;
}

let JOURNAL_RENDERED_ONCE = false;
function journalRenderList(el, entries){
  const items = journalBuildItems(entries);
  const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 30;
  const existing = new Map();
  Array.from(el.children).forEach(c=>{ if(c.dataset && c.dataset.sig) existing.set(c.dataset.sig, c); });
  const keep = new Set();
  items.forEach((it, idx)=>{
    let node = existing.get(it.sig);
    if(!node){
      node = it.make();
      node.dataset.sig = it.sig;
      if(JOURNAL_RENDERED_ONCE) node.classList.add('journal-fresh');
    }
    keep.add(node);
    if(el.children[idx] !== node) el.insertBefore(node, el.children[idx] || null);
  });
  Array.from(el.children).forEach(c=>{ if(!keep.has(c)) c.remove(); });
  // Reste calé sur la dernière ligne, sauf si le joueur est remonté lire.
  if(!JOURNAL_RENDERED_ONCE || nearBottom) el.scrollTop = el.scrollHeight;
  JOURNAL_RENDERED_ONCE = true;
}

