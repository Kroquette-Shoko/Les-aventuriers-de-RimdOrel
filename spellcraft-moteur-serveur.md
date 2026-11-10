# Moteur de jeu serveur (fonction Supabase `game-action`) — plan des modules

Le moteur (≈ 360 000 caractères, 7 400 lignes) est stocké en base, et non en fichiers du dépôt.
Pour le lire sans tout charger, il est découpé en **18 modules** dans la table `_edge_fn_modules`
(colonnes `ord`, `name`, `descr`, `content`). Mis bout à bout dans l'ordre (`ord`), ils redonnent EXACTEMENT
le code exécuté (vérifié par empreinte md5 : a214dc357990391f6b5622dd1a8b78d8).

L'ordre ne doit pas changer : le code du haut (constantes `const`/`let`) doit exister avant celui du bas.

| # | Module | Contenu |
|---|---|---|
| 01 | base-quetes-succes | Constantes, files de progression des quêtes/succès, limite de main |
| 02 | set-guerre-elementaire | Set « La guerre élémentaire » : bénédictions, dévotion, failles, voracité, rituel, insensible, cycle |
| 03 | catalogue-et-journal | Cache du catalogue de cartes, journal de partie, évènements de combat |
| 04 | conditions-et-valeurs | Conditions, valeurs dynamiques, recherche de cartes |
| 05 | effets-de-base | Création de créatures, conjuration, mana, pioche, `applySpellEffect` (tous les effets de sorts) |
| 06 | capacites-nouveau-format | Évolutions, cibles, valeurs, effets continus, artefacts, déclencheurs de comptage |
| 07 | pauses-declencheurs-pieges | Pauses/différés de capacités, déclencheurs créatures/héros/permanents, pièges, coûts supplémentaires |
| 08 | choix-heros-permanents | Choix mot-clé/défausse/découverte, pose de piège, pouvoir de héros, permanents |
| 09 | degats-combat-morts | Dégâts, PV, fin de partie, combat unitaire, morts |
| 10 | mana-regions-couts | Régions, gain/vol de mana, coût effectif |
| 11 | routeur-http | `Deno.serve` : authentification, aiguillage des actions, mesure des temps (`__T`) |
| 12 | http-sessions-profils | Fonctions `handle…` : sessions, matchmaking, profils, admin, chat, temps réel, taverne, decks |
| 13 | dispatch-et-sauvegarde | `dispatchAction`, horloge de tour, `withSave`, récompenses de fin, historique, forfait |
| 14 | swap-et-etat-initial | Mode swap, état initial, mulligan |
| 15 | fin-de-tour-et-combat | Fin de tour, attaquants, blocages, combats différés |
| 16 | jouer-une-carte | Jouer une carte, validation des sorts, cibles |
| 17 | ia | Intelligence artificielle (v1, v2, v3) |
| 18 | stats-des-decks | `loadDeckFinishes` |

## Retrouver une fonction
`select * from game_action_where('doEndTurn');` → module + numéro de ligne dans le module.

## Lire un module
`select content from _edge_fn_modules where fn_name='game-action' and name='15-fin-de-tour-et-combat';`

## Modifier le moteur
1. Modifier le texte du module concerné (`update _edge_fn_modules set content = replace(content, 'ancien', 'nouveau') where …`).
2. `select rebuild_game_action_bootstrap(true);` : simulation, vérifie que tout se recolle.
3. `select rebuild_game_action_bootstrap(false);` : écrit le résultat dans `_edge_fn_bootstrap`, que le serveur relit
   à son prochain démarrage (les instances déjà démarrées gardent l'ancien code jusqu'à leur redémarrage).

Sauvegarde du bloc d'origine (10/11/2026) : table `_edge_fn_bootstrap_backup_20261110`.

## Note
Le routeur mesure déjà des temps par étape (`__T`, `performance.now()`) : à exploiter pour savoir où part le temps d'une action.
