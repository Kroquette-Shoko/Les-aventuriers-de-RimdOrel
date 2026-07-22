// ============================================================
// SPELLCRAFT — Moteur central (extrait fidèlement du client)
// ============================================================
// Ce fichier contient la VRAIE logique de jeu, copiée directement de
// spellcraft-prototype.html plutôt que retapée à la main — c'est
// justement pour éviter les écarts (Protecteur, Tenace...) qu'on a eu
// en réécrivant la logique dans l'Edge Function.
//
// Convention : les camps s'appellent p1/p2, comme côté client (pas
// player1/player2) — pour que le portage futur reste un copier-coller
// direct depuis prototype.html, sans traduire les noms à chaque fois.
//
// Ce qui est VRAI (copié à l'identique) : les mots-clés de combat, les
// dégâts, la mort/Tenace.
// Ce qui est STUBBÉ (volontairement vide pour l'instant) : les
// déclencheurs de capacités (fireCreatureTrigger, fireWatchTrigger,
// fireHeroTrigger) — reviendra avec le portage des capacités/déclencheurs,
// prévu pour un lot ultérieur. Le son/l'affichage (log, playSfx,
// spawnDamageNumber) sont aussi neutralisés : le serveur n'affiche rien,
// c'est au client de réagir à l'état reçu.
// ============================================================

// ------------------------------------------------------------
// Stubs — signature identique aux vraies fonctions du client, pour que
// le code qui les appelle (copié tel quel) n'ait rien à changer.
// ------------------------------------------------------------
function log(msg) { /* le serveur ne tient pas de journal texte pour l'instant */ }
function playSfx(key, volume) { /* pas de son côté serveur */ }
function spawnDamageNumber(el, amount) { /* pas d'animation côté serveur */ }
function fireCreatureTrigger(key, creature, triggerName) { /* TODO : lot "capacités/déclencheurs" */ }
function fireWatchTrigger(triggerName, eventOwnerKey, eventCreature) { /* TODO : lot "capacités/déclencheurs" */ }
function fireHeroTrigger(key, triggerName) { /* TODO : lot "capacités/déclencheurs" */ }
function fireTrap(ownerKey, triggerType, target) { /* TODO : lot "capacités/déclencheurs" (pièges) */ }
function progressQuest(conditionType, amount) { /* TODO : suivi de quêtes côté serveur */ }
const suppressDamagePopups = true; // toujours vrai côté serveur (pas d'affichage à supprimer)

// ------------------------------------------------------------
// modifyHp — copié tel quel de spellcraft-prototype.html (ligne ~1130)
// ------------------------------------------------------------
function modifyHp(p, delta) {
  p.hp += delta;
  if (delta < 0) p.hpLostThisTurn = (p.hpLostThisTurn || 0) + (-delta);
  else if (delta > 0) {
    p.hpGainedThisTurn = (p.hpGainedThisTurn || 0) + delta;
    const key = p === S.p1 ? 'p1' : p === S.p2 ? 'p2' : null;
    if (key) fireWatchTrigger('watchHeroHealed', key);
  }
}

// ------------------------------------------------------------
// dealDamageToHero — copié tel quel (ligne ~1260), sans les lignes
// d'affichage (spawnDamageNumber, playSfx) qui n'ont pas de sens côté
// serveur. endGame() est la version serveur définie plus bas.
// ------------------------------------------------------------
function dealDamageToHero(targetPlayer, targetKey, amount, sourcePlayer, isCreatureHit) {
  modifyHp(targetPlayer, -amount);
  if (targetPlayer.hp <= 0) {
    endGame(targetKey === 'p1' ? 'p2' : 'p1');
  } else {
    fireHeroTrigger(targetKey, 'onDamaged');
  }
}

// ------------------------------------------------------------
// endGame — version serveur : pas de son/diffusion ici (le code appelant
// dans l'Edge Function s'occupe de sauvegarder et diffuser l'état).
// ------------------------------------------------------------
function endGame(winnerKey) {
  S.gameOver = true;
  S.winnerKey = winnerKey;
  S.phase = 'gameOver';
}

// ------------------------------------------------------------
// applyDamage — copié tel quel de spellcraft-prototype.html (ligne ~1300)
// ------------------------------------------------------------
function applyDamage(dealer, dealerP, dealerKey, target, targetP, targetKey, deferKillTrigger) {
  const dmg = dealer.curAtk;
  if (target.keywords.includes('armor') && !target.armorUsed) {
    target.armorUsed = true;
    log(`${target.name} absorbe les dégâts grâce à Armure.`);
    return 0;
  }
  target.curHp -= dmg;
  if (!suppressDamagePopups) spawnDamageNumber(null, dmg);
  if (dmg > 0) playSfx(dmg <= 4 ? 'hitLight' : dmg <= 10 ? 'hitMedium' : 'hitLarge');
  if (dealer.keywords.includes('toxic') && dmg > 0) {
    target.curHp = Math.min(target.curHp, 0);
    log(`${target.name} est empoisonnée par Toxique et meurt.`);
  }
  if (dealer.keywords.includes('lifesteal')) {
    modifyHp(dealerP, dmg);
    log(`${dealer.name} soigne son héros de ${dmg} PV (Vol de vie).`);
  }
  if (dealer.keywords.includes('pierce') && target.curHp < 0) {
    const excess = -target.curHp;
    dealDamageToHero(targetP, targetKey, excess, dealerP, true);
    log(`Perçant : ${excess} dégâts excédentaires passent au héros ennemi.`);
  }
  fireCreatureTrigger(targetKey, target, 'onDamaged');
  fireWatchTrigger('watchDamaged', targetKey);
  if (target.curHp <= 0) {
    // en plein combat, on ne sait pas encore si l'attaquant lui-même va
    // survivre au coup en retour — on diffère donc le déclenchement pour
    // vérifier sa survie avant de le laisser en profiter (bug Miséricorde).
    if (deferKillTrigger) dealer._pendingOnKill = dealerKey;
    else fireCreatureTrigger(dealerKey, dealer, 'onKill');
  }
  return dmg;
}

// ------------------------------------------------------------
// resolveOneCombat — copié tel quel de spellcraft-prototype.html (ligne ~2511)
// ------------------------------------------------------------
function resolveOneCombat(attacker, atkP, atkKey, blocker, defP, defKey) {
  log(`${attacker.name} affronte ${blocker.name}.`);
  fireTrap(atkKey, 'beforeAllyFights', attacker);
  fireTrap(defKey, 'beforeAllyFights', blocker);
  const initA = attacker.keywords.includes('initiative');
  const initB = blocker.keywords.includes('initiative');
  let dmgToBlocker = 0, dmgToAttacker = 0;
  if (initA && !initB) {
    dmgToBlocker = applyDamage(attacker, atkP, atkKey, blocker, defP, defKey, true);
    if (blocker.curHp > 0) dmgToAttacker = applyDamage(blocker, defP, defKey, attacker, atkP, atkKey, true);
  } else if (initB && !initA) {
    dmgToAttacker = applyDamage(blocker, defP, defKey, attacker, atkP, atkKey, true);
    if (attacker.curHp > 0) dmgToBlocker = applyDamage(attacker, atkP, atkKey, blocker, defP, defKey, true);
  } else {
    dmgToBlocker = applyDamage(attacker, atkP, atkKey, blocker, defP, defKey, true);
    dmgToAttacker = applyDamage(blocker, defP, defKey, attacker, atkP, atkKey, true);
  }
  // les deux échanges de dégâts sont maintenant faits : on ne laisse une
  // créature profiter de son "Quand elle tue" que si elle a vraiment
  // survécu au coup en retour, pas grâce à un effet qu'elle vient de gagner.
  [attacker, blocker].forEach(c => {
    if (c._pendingOnKill) {
      const key = c._pendingOnKill;
      delete c._pendingOnKill;
      if (c.curHp > 0) fireCreatureTrigger(key, c, 'onKill');
    }
  });
  if (attacker.curHp > 0) { fireTrap(atkKey, 'onAllySurvivesCombat', attacker); fireTrap(defKey, 'onEnemySurvivesCombat', attacker); }
  if (blocker.curHp > 0) { fireTrap(defKey, 'onAllySurvivesCombat', blocker); fireTrap(atkKey, 'onEnemySurvivesCombat', blocker); }
  return { dmgToBlocker, dmgToAttacker };
}

// ------------------------------------------------------------
// cleanupDeaths — copié tel quel de spellcraft-prototype.html (ligne ~1335),
// simplifié : la partie "capacités à la mort/à la résurrection" (dead[],
// revived[]) est retirée pour l'instant, elle reviendra avec le lot
// "capacités/déclencheurs".
// ------------------------------------------------------------
function cleanupDeaths() {
  ['p1', 'p2'].forEach(key => {
    const p = S[key];
    const survivors = [];
    p.board.forEach(c => {
      if (c.curHp <= 0) {
        if (c.keywords.includes('relentless')) {
          c.curHp = c.hp; // Tenace revient à PLEINE vie
          c.keywords = c.keywords.filter(k => k !== 'relentless');
          log(`${c.name} revient en jeu grâce à Tenace.`);
          survivors.push(c);
        } else {
          p.discard.push(c);
          log(`${c.name} meurt.`);
          p.creaturesDiedThisTurn = (p.creaturesDiedThisTurn || 0) + 1;
        }
      } else {
        survivors.push(c);
      }
    });
    p.board = survivors;
  });
}
