> **Document obsolète.** Ce document décrit un état antérieur du projet (prototype local `spellcraft-prototype.html` comme moteur, ancien schéma d'`Ability`). Le moteur de jeu actuel est le serveur de jeu (fonction Supabase) ; pour les règles telles que le moteur les applique, voir `spellcraft-regles.md`. Ne pas s'y fier pour intervenir sur le code sans le recouper avec le code réel.

# Spellcraft — Architecture technique

Ce document est la contrepartie technique de `spellcraft-regles.md` : il décrit comment le code est organisé, pas comment le jeu se joue. Destiné à toute personne (développeur ou future session) qui doit intervenir sur le code.

---

## 1. Vue d'ensemble

Quatre fichiers HTML autonomes, sans build, sans dépendance externe autre que Google Fonts :

| Fichier | Rôle |
|---|---|
| `spellcraft-hub.html` | Page d'accueil, liens vers les trois outils |
| `spellcraft-card-editor.html` | Création/édition de cartes (écrit les sets, un par un) |
| `spellcraft-deckbuilder.html` | Collection + construction de decks (lit tous les sets agrégés, écrit/lit `spellcraft-decks`) |
| `spellcraft-prototype.html` | Moteur de jeu (lit tous les sets agrégés, et `spellcraft-decks`) |
| `spellcraft-shared.js` | Données/fonctions communes (voir section 1) |
| `spellcraft-auth.js` | Authentification Supabase + widget de compte (voir section "Authentification et catalogue") |
| `spellcraft-catalog.js` | Catalogue de cartes sur Supabase (voir même section) |
| `spellcraft-supabase-schema.sql` + `-addendum.sql` | Schéma de base de données à exécuter dans Supabase (une fois) |

Un cinquième fichier, **`spellcraft-shared.js`**, est chargé par les trois outils (pas le hub) via une balise `<script src="spellcraft-shared.js"></script>` placée juste avant leur propre `<script>`. C'est la seule source de vérité pour :
- les listes de référence (`CLASSES`, `CLASS_COLORS`, `RARITIES`, `CARD_TYPES`, `KEYWORDS`)
- `escapeHtml()`
- `getClassColor()`
- `migrateCard()` — voir section 3

**Règle d'or : si les trois fichiers ont besoin de la même donnée ou de la même fonction, elle va dans `spellcraft-shared.js`, jamais copiée-collée trois fois.** C'est l'inverse de ce qui s'est passé jusqu'ici et qui a causé plusieurs bugs (couleurs de classe divergentes entre le deckbuilder et le reste, champs de carte oubliés lors de la traduction vers le moteur de jeu, etc.).

Persistance : le catalogue de cartes vit désormais dans **Supabase** (voir ci-dessous). Les decks et quelques préférences (dernier set ouvert, drapeau de migration) restent pour l'instant en `localStorage` via le wrapper `storageGet`/`storageSet` (dans `spellcraft-shared.js`) — ce sera la prochaine étape à migrer.

### Authentification et catalogue de cartes (Supabase)

Quatre nouveaux fichiers, chargés dans cet ordre précis par les quatre pages :

```
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="spellcraft-shared.js"></script>
<script src="spellcraft-auth.js"></script>
<script src="spellcraft-catalog.js"></script>
```

- **`spellcraft-auth.js`** — client Supabase (`sb`), inscription/connexion/déconnexion (email+mot de passe et Discord), widget de compte flottant (coin supérieur droit) affiché sur les quatre pages via `initSpellcraftAuth()`.
- **`spellcraft-catalog.js`** — le catalogue de cartes (sets + cartes), stocké dans les tables Supabase `card_sets` et `cards` (schéma dans `spellcraft-supabase-schema.sql` + `spellcraft-supabase-schema-addendum.sql`, à la racine du projet, à exécuter dans le SQL Editor de Supabase). Expose les mêmes noms de fonctions que l'ancien système 100% local (`loadSetsIndex`, `loadSetCards`, `saveSetCards`, `loadAllCardsAcrossSets`...) : l'éditeur, le deckbuilder et le jeu n'ont pas eu à changer leur propre logique, seul le "où" a changé.
- Lecture du catalogue (`select`) : publique, tout le monde peut voir toutes les cartes, connecté ou non.
- Écriture (créer/modifier/supprimer un set ou une carte) : réservée aux utilisateurs connectés (règle RLS `auth.role() = 'authenticated'`). L'éditeur vérifie la connexion avant chaque sauvegarde (`requireLoginForEdit()`) plutôt que de laisser Supabase renvoyer une erreur silencieuse.
- **Migration automatique et unique** : au premier chargement de l'éditeur après connexion, si Supabase n'a encore aucun set mais que d'anciennes données existent en `localStorage` (ancien système de sets local, voire le tout premier format à clé unique `spellcraft-cards-v2`), elles sont importées automatiquement dans Supabase (`migrateLocalCatalogToSupabaseIfNeeded()` dans `spellcraft-catalog.js`). Un drapeau (`spellcraft-catalog-migrated-to-supabase`) évite de recommencer à chaque visite. Les anciennes fonctions de lecture locale (renommées `loadLocalSetsIndex`, `loadLocalSetCards`, `loadLegacyMonolithicCards` dans `spellcraft-shared.js`) ne servent plus qu'à cette migration ponctuelle — rien d'autre ne doit les appeler.

---

## 2. Ce qui N'EST PAS encore partagé (et pourquoi)

Le rendu visuel d'une carte (`buildCardEl` dans l'éditeur et le deckbuilder, `cardEl` dans le jeu) reste dupliqué entre les trois fichiers, volontairement, pour cette passe de nettoyage :

- Les trois versions ont des tailles de carte différentes (220×360 dans l'éditeur, 155×217 dans le deckbuilder, 150×204 dans le jeu) et chaque valeur (police, icônes, décalages) a été ajustée à la main pour chacune.
- La version du jeu gère en plus des états que les deux autres n'ont pas (gel, étourdissement, maladie d'invocation, armure, pièges armés, foil, ciblage) — ce n'est pas une simple différence de taille, c'est une fonction plus riche.
- Unifier ça maintenant aurait un risque de régression visuelle élevé sur des dizaines d'heures de réglages fins, pour un gain surtout esthétique (le code dupliqué ici ne cause pas les bugs qu'on a eus — c'est l'absence de schéma de données commun qui les causait).

**Recommandation pour plus tard :** si un développeur reprend ce projet, la unification du rendu de carte (idéalement via des variables CSS `--card-w`/`--card-h` plutôt que des tailles en dur) est un chantier à part, à faire une fois que la stack technique (voir section 5) est stabilisée — pas avant.

### Collection personnelle par joueur

Table `user_cards` (`user_id`, `card_id`, `quantity`). Tant qu'il n'existe pas de vrai système d'acquisition (paquets, récompenses...), **les sets marqués "de base" sont automatiquement donnés à tous les comptes** — pas tout le catalogue par défaut. `card_sets.is_base` (booléen) marque un set comme tel ; coche-le via la case "Set de base" à côté du sélecteur de set dans l'éditeur. Géré côté base de données par `spellcraft-supabase-schema-addendum-3.sql` :
- à la création d'un compte → il reçoit un exemplaire de chaque carte de chaque set marqué `is_base` (2, ou 1 pour les Légendaires)
- à l'ajout d'une nouvelle carte dans un set de base → elle est distribuée à tous les comptes déjà créés
- cocher "Set de base" sur un set existant → distribue immédiatement tout son contenu à tous les comptes (fonction `grant_set_to_all_users`, appelée depuis l'éditeur)

Les sets qui ne sont pas marqués "de base" (futures extensions) ne sont donnés à personne automatiquement — libre d'y construire un vrai système d'acquisition plus tard.

Côté client, `spellcraft-catalog.js` expose `loadUserCollection()` (renvoie `{cardId: quantité}`) et `setUserCardQuantity(cardId, quantité)`. Le deckbuilder (`refreshCollection()`) filtre désormais `collection` pour ne garder que les cartes réellement possédées (`ownedCollection`), et `maxCopiesFor(card)` plafonne le nombre de copies ajoutables à un deck par la quantité possédée, pas seulement par la règle de rareté. Un badge "poss. xN" s'affiche sur chaque carte du classeur. Si le joueur n'est pas connecté, `collection` est vide et un message l'invite à se connecter plutôt que d'afficher un classeur vide sans explication.

### Decks sauvegardés (liés au compte)

Table `user_decks` (`id` uuid, `user_id`, `name`, `data` jsonb, `created_at`, `updated_at`). Le contenu du deck (`heroId`, `regionId`, `cards`) vit dans la colonne `data` (`regionId` est facultatif : s'il est absent ou invalide, la Côte de Rimd'Orël, `card_1784494729484_94`, est utilisée par défaut) ; `id` est généré par Supabase et remplace l'ancien schéma local `deck_<timestamp>`.

Fonctions dans `spellcraft-catalog.js` : `loadUserDecks()`, `saveUserDeck(deck)` (insert ou update selon que `deck.id` est déjà un uuid Supabase), `deleteUserDeck(id)`, et `migrateLocalDecksToSupabaseIfNeeded()` (migration ponctuelle des anciens decks `localStorage`, même logique que pour le catalogue). Le deckbuilder ET le jeu lisent désormais les decks via `loadUserDecks()` — plus aucune des deux pages n'utilise `localStorage` pour les decks. `spellcraft-decks` (l'ancienne clé) ne sert plus que de source pour cette migration ponctuelle.

### Multijoueur — mise en relation (étape 1 sur 2)

**Ce qui existe aujourd'hui : uniquement la mise en relation**, pas encore la synchronisation d'une vraie partie en temps réel. Table `game_rooms` (`spellcraft-supabase-schema-addendum-4.sql`) : `host_id`, `guest_id`, `host_deck`, `guest_deck` (snapshots jsonb des decks au moment du match), `status` (`waiting` → `active` → `finished`), `winner`.

Flux (`spellcraft-multiplayer.js`) :
- L'hôte choisit son deck → "Défier un ami" → `mpCreateRoom(deck)` crée la ligne, `mpInviteLink(id)` construit un lien du type `spellcraft-prototype.html?room=<uuid>`.
- L'hôte attend via `mpWaitForGuest()` (sondage simple toutes les 2s sur la ligne — pas de Realtime Postgres Changes pour éviter d'avoir à activer la réplication sur la table pour cette seule étape).
- L'invité ouvre le lien → `initGameSetup()` détecte `?room=` dans l'URL (`mpGetRoomIdFromUrl()`) et route vers `renderMultiplayerJoin()` au lieu du choix de deck normal → choisit son propre deck → `mpJoinRoom(roomId, deck)`.
- Une fois les deux decks connus des deux côtés, **la page ne fait pour l'instant qu'afficher une confirmation** — aucun coup n'est encore synchronisé entre les deux navigateurs.

**Étape 2 — synchronisation en temps réel (`spellcraft-multiplayer.js`) :** implémentée. Points clés :
- L'hôte fait tourner le moteur normal, sans modification. `render` est enveloppée pour rediffuser `S` (sérialisé en JSON) sur un canal Supabase Realtime "Broadcast" (`game-<roomId>`) après chaque appel.
- Les actions de l'invité arrivent par ce même canal (`mpApplyGuestAction`) et sont appliquées via les fonctions existantes ciblant `'p2'`, exactement comme le ferait un joueur local.
- L'invité ne fait jamais tourner le moteur : à réception d'un état, il l'affiche après avoir inversé p1/p2 (`mpSwapPerspective`), pour que "S.p1" reste toujours "mon propre côté" quel que soit son rôle réel. Ses propres actions (`playCard`, `endTurn`, `confirmAttackers`...) sont remplacées (monkey-patch) par des envois réseau au lieu d'exécuter la logique localement — toute l'interface de sélection (clics sur les cartes/créatures) reste inchangée puisqu'elle continue de raisonner en "p1 = moi".
- Plusieurs fonctions auparavant câblées en dur sur `S.p1`/`S.p2` (`enterDeclareAttackers`, `confirmAttackers`, `confirmBlocks`) ont été généralisées pour raisonner sur `S.active` / le joueur défenseur, sans changer le comportement solo existant.
- `startGame`/`launchWithChosenDeck` acceptent maintenant un paramètre `p2IsAI` (par défaut `true`, donc aucun changement en solo) pour éviter que `runAI()` se déclenche sur le tour d'un vrai joueur distant.

**Statut honnête :** premier jet, pas encore testé en conditions réelles avec deux joueurs humains. Des ajustements sont probables une fois testé.

---

## 3. Schéma d'une carte (`migrateCard`)

Toute carte manipulée par un des trois outils doit être passée dans `migrateCard(c)` (dans `spellcraft-shared.js`) avant d'être utilisée. Cette fonction garantit que **tous** les champs ci-dessous existent, avec une valeur par défaut, même sur une carte créée avant l'ajout d'un champ.

### Champs de base
| Champ | Type | Défaut | Notes |
|---|---|---|---|
| `id` | string | — | généré à la création |
| `name` | string | `'Carte sans nom'` | |
| `type` | string | `'Créature'` | doit être dans `CARD_TYPES` |
| `class` | string | `'Neutre'` | doit être dans `CLASSES` |
| `classSecondary` | string | `''` | carte bicolore si non vide |
| `rarity` | string | `'Commune'` | doit être dans `RARITIES` |
| `foil` | boolean | `false` | purement cosmétique |
| `cost` | number\|null | — | `null` pour les Héros |
| `subtypes` | string[] | `[]` | |
| `keywords` | string[] | `[]` | clés de `KEYWORDS` |
| `hero` | string | `''` | nom du héros requis (carte exclusive) |
| `set` | string | `''` | |
| `setLogo` | string | `''` | URL d'image |
| `image`, `imagePosX`, `imagePosY`, `imageZoom` | string/number | `''`, `50`, `50`, `100` | |
| `text` | string | `''` | texte généré ou manuel |
| `manualText` | boolean | `false` | |
| `abilities` | Ability[] | `[]` | voir ci-dessous |

### Champs spécifiques par type
| Champ | Types concernés | Défaut |
|---|---|---|
| `atk`, `hp` | Créature (les deux), Héros (`hp` seul) | — |
| `charges` | Artefact | — |
| `manaRule`, `altEffectEnabled`, `altEffectChance`, `altEffectText` | Région | `''`, `false`, `30`, `''` |
| `heroMultiClass` | Héros | `{enabled:false, mode:'allowed'\|'multiAny'\|'freeSecond', anySource:'', allowedClasses:[], maxCount:6, scope:'Toutes'}` — `mode` absent = `'allowed'` ; `anySource` vide = source du héros ; `scope` = type de carte concerné ou `'Toutes'` |
| `extraCostEnabled`, `extraCostType`, `extraCostAmount`, `extraCostCustom` | Créature/Sortilège/Artefact/Piège | `false`, `'sacrificeCreature'`, `1`, `''` |

### Une capacité (`Ability`)
```
{
  trigger: string,           // ex. 'onPlay', 'onOpponentAttack', 'activated'...
  triggerSubtype: string,    // pour onSummonSubtype
  conditions: Condition[],
  effects: Effect[],
  activationCost, activationCooldown,  // si trigger === 'activated'
  extraCostEnabled, extraCostType, extraCostAmount, extraCostCustom
}
```

### Un effet (`Effect`)
Une quarantaine de champs possibles selon `effectType` (dégâts, soin, buff, conjuration, récupération, réveler, fixer/réduire le coût...). La liste complète et à jour des champs par défaut est dans `migrateCard()` — ne pas la dupliquer ici, elle serait obsolète en quelques semaines. **En cas de doute sur un champ d'effet, chercher directement dans `spellcraft-shared.js`.**

---

## 4. Le point le plus fragile : `translateCard` (dans le jeu)

`spellcraft-prototype.html` ne travaille pas directement sur les cartes "format éditeur" : il les passe dans `translateCard(raw)` pour produire un objet "format moteur", plus plat. **C'est là que plusieurs bugs ont eu lieu** : un champ ajouté côté éditeur (image, rareté, set, foil...) qui n'était pas recopié explicitement dans `translateCard` disparaissait silencieusement en partie réelle, sans erreur, juste un rendu incomplet.

Depuis cette passe de nettoyage, `LOADED_COLLECTION.forEach(migrateCard)` est appelé avant toute traduction, donc le `raw` reçu par `translateCard` a toujours tous les champs. Mais `translateCard` reste un point de vigilance : **toute nouvelle donnée ajoutée à une carte dans l'éditeur qui doit être visible/utilisable en jeu doit être ajoutée explicitement dans `translateCard`.** ll n'y a pas de mécanisme qui le fasse automatiquement.

---

## 5. Pour un futur développeur — état des lieux honnête

- **Pas de build, pas de tests, pas de contrôle de version visible dans cet environnement.** Fonctionne pour itérer vite en conversation, pas pour un développement en équipe.
- **~7000 lignes cumulées** de logique assez dense (système d'effets/conditions/déclencheurs, moteur de combat) sans aucun test automatisé. C'est le risque principal si le projet grossit encore.
- **Rendu de carte dupliqué en trois versions** (voir section 2) — assumé pour l'instant, à traiter séparément.
- Si le projet passe à une vraie stack (comptes utilisateurs, backend, base de données — voir la suite du projet), c'est le bon moment pour réévaluer : garder trois pages HTML autonomes, ou migrer vers une SPA avec un bundler (Vite/React ou équivalent) qui rendrait le partage de code (y compris le rendu de carte) natif plutôt que manuel comme avec `spellcraft-shared.js`.

Ce fichier (`spellcraft-shared.js`) et ce document sont un premier pas : ils éliminent la classe de bug la plus fréquente rencontrée jusqu'ici (données dupliquées qui divergent), sans tout réécrire. La suite (unification du rendu, tests, éventuelle vraie stack) est un choix à faire consciemment, pas à improviser au fil des demandes.

## Tutoriel (page générée)

`spellcraft-tutorial.html` n'est **plus édité à la main** : il est généré à partir du plateau réel
(`spellcraft-server-board.html`) par `python3 tools/build_tutorial.py`. Il reprend donc automatiquement
toutes les animations et fonctionnalités du plateau ; il suffit de relancer le script après chaque
modification du plateau (le script s'arrête avec un message clair si le plateau a changé d'une façon
qu'il ne sait plus adapter).

Ce qui est propre au tutoriel :
- `spellcraft-tutorial-engine.js` : le scénario scripté (étapes, cartes, tours de l'adversaire). Il parle
  au plateau comme le serveur : entrées de journal numérotées (`tutLog`), événements de combat
  (`tutCombatEvent`, `tutHeroHit`), états envoyés en copie (`tutSnapshot` / `tutPush`).
- `tools/tutorial/tutorial.css` (bande de narration, surbrillance, écran de fin) et
  `tools/tutorial/topbar.html` (leur structure HTML).

## Sécurité du temps réel (canaux, émotes, chat)

- **Canal de partie privé** : `session-<id>` (et `presence-<id>`) sont créés avec `private: true`. La lecture est réservée aux deux joueurs et aux spectateurs inscrits (`game_spectators`) par une règle sur `realtime.messages` qui appelle `public.rt_is_session_member(realtime.topic())`. Aucune règle d'écriture pour `session-…` : un navigateur ne peut **rien diffuser** sur ce canal.
- **Seul le serveur diffuse** (fonction `__rtBroadcast` de `game-action`, appel REST `/realtime/v1/api/broadcast` avec la clé de service). Il n'envoie plus jamais l'état de partie, seulement le signal `stateChanged` (chaque client va chercher son état expurgé via `getState`).
- **Émotes** : le client envoie le *numéro* de l'émote (`sendEmote`). Le serveur vérifie que l'appelant est joueur de la partie, lit l'image dans `state[p].hero.emotes`, fixe lui-même `senderKey`, limite à 1 émote / 0,6 s. Le plateau n'affiche une émote reçue que si l'image fait partie des émotes du héros de l'émetteur.
- **Chat** : `sendChat` (joueurs et spectateurs). Le serveur impose le rôle et le pseudo (table `profiles`), nettoie le texte (200 caractères), limite à 1 message / 1,2 s.
- **Transition** : le serveur envoie aussi `stateChanged` sur l'ancien canal public tant que le réglage Realtime « Allow public access » est actif. Une fois le site publié avec ce code, désactiver ce réglage (Supabase → Realtime → Settings) pour fermer définitivement les canaux publics.
- **Progression** : `progress_achievement`, `progress_achievement_peak`, `progress_collection_achievements` et `progress_quest` ignorent `p_user_id` quand l'appel vient d'un navigateur connecté (compte forcé = soi). Le serveur (clé de service) peut encore cibler un joueur.
- **Tables `_backup_*`** : RLS activée (le générateur `mk.py` l'active désormais à la création).
- **Limite connue** : les compteurs de succès/quêtes envoyés par le navigateur (ex. `emotes_single_match_max`) restent déclarés par le client ; seul un déplacement de leur calcul côté serveur les rendrait infalsifiables.
## Saison 0 : compte à rebours, remise à zéro, héros et cartes associées

- **Compte à rebours** (`spellcraft-hub.html`, sous le titre) : cible fixe `Date.UTC(2026, 9, 19, 22, 0, 0)` = mardi 20/10/2026 00h00 à Paris (UTC+2). À la fin du compte à rebours la boîte disparaît (et ne revient plus). L'horloge utilisée est celle du navigateur.
- **Remise à zéro** : fonction `public.saison0_reset(p_force)` (sans droit pour les navigateurs), appelée toutes les 5 minutes par pg_cron (`saison0-reset`) ; elle ne fait rien avant la date, ni si le drapeau `app_flags.saison0_reset_done` est posé, et se déprogramme à la fin. Les données remplacées sont copiées avant dans `_saison0_bak_*` (RLS activée).
  - Remis à zéro : collection (`user_cards`, `user_card_variants`, `user_minisets`), or, fragments, succès (donc titres), dos de cartes (sauf `base`), profils (stats, avatar, titre équipé, succès mis en avant), classements (`player_ratings`, `rating_changes`, `season_reward_claims`), héros (font partie de `user_cards`), decks, quêtes (`user_quests`), pass (`user_pass`, `pass_claims`, `pass_xp_log`), calendrier (`user_cal`, `cal_opens`, `cal_final_claims`, `cal_game_log`).
  - Non touchés : boosters non ouverts, historique de parties, achats boutique, pseudo, avatar Discord, état du tutoriel.
  - Cadeau : toutes les cartes des sets `is_base` (2 exemplaires, 1 si légendaire — même règle que `grant_full_catalog_to_user`), 3000 or, dos `back_1792339255407` (« Le premier royaume »), titre `title_1792339273271` (« Premier / Première »).
- **Héros et cartes associées** : une carte est associée à un héros si `data.hero` = nom du héros. Déclencheur `on_user_card_hero_grant` (sur `user_cards`) : toute obtention d'un héros donne ses cartes associées en 2 exemplaires. Déclencheur `on_card_hero_associated` (sur `cards`) : une carte créée ou rattachée à un héros est donnée aux joueurs qui possèdent déjà ce héros (héros « en attente de cartes »). Ces règles ne retirent ni ne diminuent jamais de cartes.

- Blocage : quand un bloqueur est sélectionné (`UI.pendingBlocker`), `syncTargetingArrow()` affiche la flèche de ciblage depuis cette créature, avec la classe `body.block-targeting` : la flèche alterne bleu/rouge (animations `block-target-line` / `block-target-fill`) jusqu'au choix de l'attaquant.

- Main en éventail : `applyHandFan()` (joueur) et `applyEnemyHandFan()` (adversaire, vue à l'envers) posent l'inclinaison (`--fr`/`--er`), la descente des cartes de bord (`--fy`/`--ey`) et un chevauchement (marge négative) ; au survol la carte se redresse et passe devant.
- Réorganiser sa main : glisser une carte dans la zone de la main (`previewHandReorder`, aperçu en direct) ; l'ordre est gardé côté navigateur uniquement (`HAND_ORDER`, retrouvé par le contenu des cartes car elles n'ont pas d'identifiant unique côté serveur). Les actions envoyées au serveur utilisent toujours l'index réel de la carte (`data-hand-index`). Une carte non jouable peut aussi être glissée pour se réordonner.

## Finitions de cartes : foil et premium

- **Données** : `user_cards.quantity` (normales) et `quantity_foil` (foil) existaient déjà. S'y ajoutent `premium_normal` et `premium_foil` : ce sont des *marqueurs* posés sur des exemplaires existants (toujours `premium_normal <= quantity` et `premium_foil <= quantity_foil`, imposé par le trigger `user_cards_clamp_premium`). Plafonds de copies, craft et désassemblage ne changent donc pas ; au désassemblage les exemplaires non premium partent en premier. Le nombre total d'exemplaires d'une carte = `quantity + quantity_foil` (`loadUserCollection()` renvoie ce total, `loadUserCollectionDetailed()` le détail).
- **Tirage** : `open_booster` / `open_boosters_bulk` appellent `roll_card_finish()` (5 % foil, 1 % premium, indépendants) puis `grant_card_finish()`, et renvoient `foil` / `premium` pour chaque carte. Les boosters « tout le set » et les récompenses de quête ne tirent pas de finition.
- **Deck** : chaque entrée de `user_decks.data.cards` peut porter `finish` (`foil` | `premium` | `premium_foil`, absent = normale) et `variantId` (illustration alternative). À l'ajout d'une carte au deck, `finish` vaut la plus haute finition possédée.
- **Partie** : `resolveDeck` (moteur, via `loadDeckFinishes`) copie `foil` / `premium` et l'illustration choisie sur les cartes du deck, seulement si le joueur possède cette version. Les instances en jeu gardent ces champs.
- **Rendu** : `spellcraft-premium.js` (`SCFinish.apply`), appelé à la fin de `SCCardRender.decorate`, donc par tous les `buildNewCardEl`. Foil = calque arc-en-ciel animé. Premium = les enfants de `.ncard` sont regroupés dans `.nfin` (inclinaison 3D), l'illustration est déplacée dans `.nart-in` (décalage de parallaxe) et un calque de reflet suit le pointeur ; la position du pointeur est écrite dans `--px` / `--py`.
- **Collection** : le classeur montre la version choisie dans le deck ouvert, sinon la plus haute possédée. Une illustration alternative débloquée passe avant toute finition : par défaut (classeur et ajout au deck) on prend la dernière variante possédée (`bestVariant`) avec la plus haute finition. Une étoile en haut à droite (si la carte existe en plusieurs versions) ouvre `openVariantModal`, qui propose finitions possédées × illustrations débloquées.
- **Scripts SQL** : `finitions_foil_premium_20261019.sql` puis `moteur_finitions_20261019.sql` (le second doit passer après le premier).
- **Craft des finitions** : RPC `craft_card_finish(p_card_id, p_finish)` (script `craft_finitions_20261019.sql`). Prix en gemmes de la classe : foil = 2 x le prix de base, premium = 4 x, premium foil = 8 x. Le plafond de copies (foil et premium comptent comme des exemplaires) s'applique comme pour le craft normal. Boutons dans la fenêtre de craft (`renderCraftAction`, `doCraftFinish`).

### Désassemblage en masse et finitions
La fenêtre de désassemblage liste une ligne par (carte, finition). Par défaut seuls les exemplaires normaux en trop sont sélectionnés ; les foils, premiums et premium foils restent de côté jusqu'au clic sur « Ajouter les foils / premiums / premium foils ». Si une finition est sélectionnée, le client appelle `disenchant_cards_bulk_v2(p_items jsonb)` (`[{card_id, finish}]`, script `desenchant_finitions_20261019.sql`), sinon l'ancienne `disenchant_cards_bulk`. Remboursement : ¼ du prix de base, quelle que soit la finition.

Le bouton 🔨 (survol d'une carte possédée de la collection) ouvre la fenêtre de craft ; les boutons foil/premium/premium foil y sont proposés même au plafond d'exemplaires : `craft_card_finish` remplace alors un exemplaire normal sans premium (ou un foil simple pour un premium).

Conjuration : si la carte source d'un effet « conjure » (créature ou sort) est foil ou premium, la carte conjurée reçoit `foil: true` (jamais `premium`). Patch moteur : `conjuration_foil_20261019.sql` (`mapped.srcFoil` dans `applyNewAbilityEffects`, lu dans le `case "conjure"`).

Ciblage multiple : pendant le choix de plusieurs cibles, les flèches vers les cibles déjà choisies (étape en cours et étapes précédentes, `pn.selectedInstIds` + `pn.collected`) restent affichées (`#target-fixed`, classes `.target-fixed-line` / `.target-fixed-head`) ; seule la flèche vers le curseur suit la souris.

### Ouverture automatique des boosters (boutique)
Bouton « ⚡ Ouverture automatique » dans « Mes boosters » (quand on en a plusieurs) : même RPC `open_boosters_bulk`, sans animation, puis une fenêtre de résumé : pastilles de totaux (cartes, nouvelles, par rareté, par finition), 6 cartes en vitrine et la liste complète. Les 6 cartes sont d'abord les NOUVELLES (`is_new`), classées par `AUTO_RANK`, complétées par les meilleures restantes. Ordre (du plus faible au meilleur) : Commune < Commune foil < Rare < Rare foil < Commune premium < Épique < Épique foil < Commune premium foil < Rare premium < Rare premium foil < Épique premium < Épique premium foil < Mythique < Mythique foil < Mythique premium < Mythique premium foil. Le statut légendaire n'intervient pas.

### Bruno (boutique)
Bruno n'est plus dans un encadré : portrait flottant fixé en bas à droite (`#bruno-float`, ~300 px, 150 px sur mobile, par-dessus la page, sans bloquer les clics) avec une bulle `#bruno-bubble` au-dessus de lui, qui disparaît seule. Textes (dans spellcraft-shop.html) : `BRUNO_WELCOME_LINES` (arrivée), `BRUNO_IDLE_LINES` (2 min sans clic/touche/défilement, `BRUNO_IDLE_MS`), `BRUNO_EVENT_LINES` par événement : `single` (carte à l'unité ; conditions sur la rareté / légendaire), `cardback` (dos ; cas « Fierté florale » et « Ma véritable place »), `booster` (1 seul booster, 10 et plus). Une réplique peut être `{ t, when(ctx), force }`. API : `brunoSay(html, ms)`, `brunoSayEvent(clé, ctx, ms)`. Le succès secret « Habitué de la boutique » (`ach_secret_bruno`, objectif 37) compte les 37 répliques de Bruno : chaque réplique a un numéro fixe (`BRUNO_LINE_GROUPS` : accueil 0–4, inactivité 5–9, carte à l'unité 10–14, dos 15–20, boosters 21–26, héros 27–36 via `BRUNO_HERO_LINES` / `brunoSayHero(cardId)` à l'achat d'un héros) enregistré par `brunoMarkSeen(idx)` → RPC `mark_bruno_line_seen`. Ne jamais réordonner ni insérer au milieu : ajouter à la fin de la liste, décaler les offsets suivants et relever l'objectif. Les anciennes phrases ont été supprimées (script `bruno_succes_20261019.sql`).

Cartes à l'unité de la boutique (`buy_single_card`) : 4 % de chance d'être foil, jamais premium ni premium foil (script `carte_unite_foil_20261019.sql`).

Images de Bruno (4 poses, `images/bruno_base.png`, `bruno_buy.png`, `bruno_wait.png`, `bruno_sleep.png`) : `base` par défaut ; `buy` pendant la réplique d'achat puis retour à `base` ; `wait` dès la réplique d'inactivité jusqu'au prochain achat (ou changement de page) ; `sleep` de 22h30 à 7h00 (heure de l'appareil, vérifiée chaque minute), sans aucun changement possible. Une pose dont le fichier manque retombe sur la base, puis sur `images/vendor-bruno.png`. Code : `BRUNO_POSES`, `brunoSetPose(nom, retourBaseMs)`, `brunoIsNight()`.

Récompenses « carte » (coffres de Velkrin, pass…) : `pass_grant_rewards` accepte `card_id` (carte précise, sinon tirage par `rarity`), `finish` (normal / foil / premium / premium_foil ; l'ancien `foil` booléen reste lu) et `variant_id` (débloque l'illustration alternative). Éditeur : spellcraft-calendar-admin.html (mode « Au hasard » / « Une carte précise », illustration, traitement). Script : `coffres_cartes_precises_20261019.sql`.

## Classement (à partir de la saison 0)

- **Points** : on commence à 0 à chaque saison (plus de report). Victoire = +20. Défaite : 0 avant l'Argent (< 150 pts), -10 de 150 à 499 pts, -20 à partir de 500 pts (Platine) ; le rang pris en compte est celui d'avant la partie, et les points ne descendent jamais sous 0. Seules les parties contre un joueur comptent (pas l'IA). La limite « 3 parties en 24 h contre le même adversaire » a été retirée le 21/10/2026 (trop peu de joueurs) : script `sans_limite_meme_adversaire_20261021.sql` (classement, cases du calendrier, XP du pass). Pour la remettre : voir le retour arrière du script.
- **Parties contre un bot** (script `classement_bots_20261020.sql`) : victoire = +3 points quel que soit le rang, tant que le ladder de la saison compte moins de 10 joueurs (joueurs avec au moins une partie) ; à partir de 10 joueurs, une victoire contre un bot ne rapporte plus rien. Une défaite contre un bot fait perdre autant que contre un joueur. Ces parties comptent dans parties / victoires / défaites.
- **Rangs** (`ranked_league`) : Non classé 0-49 · Bronze 50 · Argent 150 · Or 300 · Platine 500 · Diamant 800 · Maître 1000+.
- **Récompenses de fin de saison** (`ranked_league_gold`, `ranked_league_boosters`, réclamées via `claim_season_rewards`, 5 parties classées minimum) : Bronze 200 or + 1 booster · Argent 400 + 1 · Or 600 + 2 · Platine 1000 + 2 · Diamant 2000 + 3 · Maître 3000 + 5 ; Non classé rien. Les boosters sont ceux du set de base (`resolve_booster_by_set_type('base')`), donnés par `pass_grant_rewards`. La colonne `season_reward_claims.boosters` garde ce qui a été donné.
- **Moteur** : trigger `ranked_apply_match` (+ `ranked_loss_points`), `ranked_ensure_row` (départ à 0), `get_ranked_profile` (paliers, récompenses en attente). Script `classement_saison0_20261019.sql`, à lancer après la remise à zéro de la saison 0 (il refuse de tourner avant).
- **Client** : `spellcraft-achievements.html` (barre de progression, liste des récompenses, règles).


**Page classement** (`spellcraft-achievements.html`, bouton « Voir le classement ») : deux colonnes. Gauche = tableau des joueurs (RPC `get_ranked_board(p_search, p_limit, p_offset)` : tout joueur ayant `total_games_played > 0` ou des parties classées, même contre des bots ; rang, ligue, titre équipé, badges mis en avant, nom cliquable vers `spellcraft-profile.html?uid=`), recherche par nom, 10 par page. Droite = tableau des grades (paliers + récompenses), carte de progression du joueur (`get_ranked_profile`). SQL : `classement_tableau_20261019.sql`.

## Boîtes de dialogue (`spellcraft-dialogs.js`)

Ne jamais utiliser `alert()` / `confirm()` / `prompt()` natifs : les navigateurs (ou les joueurs) peuvent les bloquer. Le module expose `await scAlert(msg)`, `await scConfirm(msg, {danger, okText, cancelText, title})` (renvoie `true` / `false`) et `await scPrompt(msg, valeurParDefaut)` (texte, ou `null` si annulé). `window.alert` est redirigé vers `scAlert` ; `confirm` et `prompt` doivent être remplacés à la main (la fonction englobante devient `async`). Toutes les pages qui en avaient besoin chargent le module dans leur `<head>`.

## Bibliothèque (`spellcraft-deckbuilder.html`) : ergonomie

- Menu de gauche : « Parcourir » (cartes / héros / dos), la vue courante est surlignée (`updateNavActive`) ; « Fabriquer des cartes » n'est actif que dans « Voir les cartes ».
- Barre rapide au-dessus du classeur (vue cartes uniquement) : onglets par source, recherche par nom (un nombre tapé = filtre de coût : `3`, `5+`, `2-`) et pastilles de coût 0 à 7+. Elle écrit dans les mêmes `filters` que le panneau « Filtres avancés ».
- Plus d'aperçu au survol : clic droit sur une carte (ou sur sa ligne dans le deck) pour l'agrandir, nom cliquable dans le deck, cartes liées d'un héros cliquables ; tout ouvre la fenêtre de détail (`showCraftModal`).
- Plus de page qui tourne : un fondu de 0,14 s (`bp-fade`). Le deck reste toujours à droite (mise en page sans retour à la ligne, le classeur est réduit par `fitBinderToWidth`).
- Les textes de l'interface font au moins 14 px.

## Panneau « Votre deck » (spellcraft-deckbuilder.html)
- Ordre : ✕ fermer · titre · nom · ligne Héros · ligne Région · ligne Dos · compteur · courbe de mana · onglets « Deck list » (défaut, trié par coût, ligne colorée par source + icône de type) / « Détails » (types, sources, sous-types, conjuration, coût moyen) · Vider (confirmation) · Sauvegarder.
- Un clic sur Héros / Région / Dos ouvre la page correspondante du classeur (`openDeckHeroPage`, `openDeckRegionPage`, `openDeckBackPage`) ; « Voir les cartes » → `openDeckCardsPage`. Plus de bandeau d'étape (`#wizard-hint` supprimé).
- Avec un deck ouvert, la page des dos choisit le dos du deck (`currentDeck.cardBackId`, `null` = dos de base) au lieu d'équiper. Le lobby utilise le dos de base si le deck n'en a pas choisi.
- Sauvegarde : héros ET région obligatoires (message centré via `scAlert`) ; si le nom n'a pas été modifié, `scPrompt` demande le nom (re-validation).

## Éditeur de cartes : options ajoutées pour les archétypes (octobre 2026)

Ces options existent dans l'éditeur (`spellcraft-card-editor.html`), dans `migrateCard` (valeurs par défaut) et dans le moteur (`game-action`, script `editeur_nouvelles_capacites_20261021.sql`) :

- **Valeurs dynamiques** `thisKeywordCount` / `targetKeywordCount` : nombre de mots-clés de cette créature / de la cible. Utilisables dans un bonus de Force/Endurance, y compris en capacité continue (aura recalculée en permanence).
- **Effet `copyKeyword`** : la cible copie un mot-clé (au hasard) ou tous les mots-clés d'une autre créature (alliée, ennemie ou les deux), de façon permanente ou « ce tour-ci ». Champs : `copyKeywordDonorOwner`, `copyKeywordMode`, `copyKeywordDuration`. Non pris en charge en capacité continue.
- **Effet `upgrade`** (amélioration aléatoire) : champs `upgradeCount` (1 à 6) et `upgradeDuration` (permanent / thisTurn).
- **Déclencheur** : case `oncePerTurn` (« une seule fois par tour »). Le moteur mémorise le tour du dernier déclenchement sur la carte (`__oncePerTurn[id de la capacité]`) après vérification des conditions.

## Éditeur de cartes : constructeur de déclencheur (octobre 2026)

L'étape « Déclencheur » d'une capacité est un **constructeur pas à pas** (`buildTriggerBuilder`, tables `TB_MOMENTS` / `TB_INDEX` dans `spellcraft-card-editor.html`) : **1. Moment** (Arrivée, Final, Assaut, Au début, À la fin, Après avoir, Quand, Remplace le gain de mana) → **2. Qui / quoi** (seulement pour « Quand ») → **3. Précision** → détails (valeurs, types, sous-types). Il écrit les **mêmes clés `te.trigger`** qu'avant : les cartes existantes et le moteur ne changent pas. Seuls les choix présents dans `TRIGGERS_BY_TYPE` du type de carte sont proposés. Un choix grisé (`key:null`) n'existe pas dans le moteur (2e phase principale, « avoir gagné X PV »).

- **Type de capacité « Activation »** : option de l'éditeur seulement (Créature, Héros, Artefact). Elle enregistre `kind:'triggered'` avec le déclencheur `activated` ; le moteur ne change pas. Voir `isActivationAbility`.
- **Filtre type / sous-type** sur les déclencheurs « Quand une carte … » (`TB_FILTERABLE`) : champs `watchCardType` et `watchSubtype` du déclencheur. Case « Exception » (`watchSubtypeExclude`) : tout sauf ce sous-type. Appliqué par le moteur dans `matched` de `runNewFormatAbilities` (script `filtre_declencheurs_20261021.sql`).
- **Pas encore géré par le moteur** : phase principale 2 (elle n'existe pas dans le jeu, voir `spec-phases-du-tour`), « après avoir gagné X PV », sous-type pour « Après avoir joué X cartes ».

## Conditions : inverser, OU, nouvelles conditions (21/10/2026)
- Chaque condition a `negate` (case « Inverser (NON) ») et, à partir de la 2e, `orPrev` (ET/OU avec la précédente). Moteur : `evalCondition` applique `negate` ; `conditionsMet` regroupe les conditions reliées par OU (`some`) puis fait un ET entre groupes (le OU lie plus fort que le ET). Texte généré : « il n'est pas vrai que … », « … ou … ».
- `boardEmpty` est fusionné dans `resourceCompare` (adversaire, créatures en jeu, exactement 0) ; l'ancien type reste géré par le moteur pour les cartes déjà en base, et `migrateCard` le convertit à l'ouverture dans l'éditeur.
- `resourceCompare.resourceType` accepte `artifacts`.
- Nouveaux types : `playerCompare` (vous − adversaire sur PV/créatures/main/défausse/deck/mana/artefacts, `playerCompareRel` more/less/equal, `playerCompareMargin`), `turnParity` (parité de `myTurnCount` du lanceur), `cardNameInPlay` (nom vide = un artefact quelconque ; cherche sur plateau + reliques), `creatureState` (`self`/`target` ; `wounded` = curHp < hp, `attacked` = hasAttacked).
- Le menu « Condition » est groupé (`COND_GROUPS`), « Condition personnalisée » est dans « Avancé » (dernier groupe).
- Script moteur : `conditions_20261021.sql` (morceau 0, sauvegarde `_backup_game_action_chunks_20261021_conditions`).

## Effets : menu par familles (21/10/2026)
- `EFFECT_GROUPS` range le menu « Type d'effet » en 7 familles ; un effet absent des familles tombe dans « Autres ».
- « Donner un mot-clé » regroupe 3 effets du moteur (clés inchangées) via un sous-choix : `grantKeyword` (précis), `upgrade` (aléatoire parmi les mots-clés positifs), `keywordChoice` (au choix parmi 3). Aucun changement moteur.
- Audit : les 52 effets de l'éditeur ont un exécuteur nommé dans le moteur ; `custom` (texte libre) n'a aucun effet en jeu. Effets présents dans le moteur mais sans entrée éditeur (anciens) : freeze, emptyManaEffect, fragileManaEffect, buffPlayedThisTurn, setStats, loseLife.

## Cibles : constructeur en 4 temps, exceptions, nouveaux filtres (21/10/2026)
- Éditeur : « 1. Quoi ? » (cette carte / la carte qui déclenche / son adversaire au combat / dernière carte piochée / à choisir parmi…) → « 2. Camp, Catégorie, Façon de choisir » → « 3. Combien ? » → « 4. Filtres ». Les valeurs enregistrées (`targetOwner`, `targetCategory`, `selectionMode`) sont inchangées : « Quoi ? » n'est qu'un affichage de `targetOwner`.
- Nouveaux champs de cible (tous faux/vides par défaut) : `subtypeFilterExclude`, `keywordFilterExclude`, `woundedFilter` (curHp < hp), `notAttackedFilter` (!hasAttacked), `sourceCompareFilter` (stronger/weaker/costlier/cheaper vs la carte source), `rarityFilter`, `classFilter`.
- Moteur : morceau 5 (`cibles_20261021.sql`). Client (`spellcraft-server-board.html`, `spellcraft-tutorial.html`) : exceptions + blessée + n'a pas attaqué ; rareté, région et comparaison à la source sont tranchés par le serveur.
- « Même cible que A » : inutile, chaque effet choisit sa cible (`usesTarget`) et plusieurs effets peuvent partager la même.
- Suggestions de cibles : celles liées au déclencheur passent en tête avec « ⭐ Suggérée ».

## Évolutions : liste de changements (21/10/2026)
- Une évolution = déclencheurs + `changes[]`. Chaque changement a un `kind` : `value` (nouvelle valeur d'un effet), `keyword` (mot-clé d'un effet « Octroi »), `duration` (permanent / ce tour-ci), `targetCount` (nombre de cibles d'une cible), `addEffect`, `replaceEffect` (`newEffect` = définition complète d'effet, éditée avec le même éditeur d'effet).
- Anciennes évolutions (`targetEffectId` + `newValue*`) : converties à l'ouverture dans l'éditeur (`migrateEvolutionLegacy`) ; le moteur gère encore l'ancien format. Aucune carte en base n'utilise d'évolution à cette date.
- Moteur (`evolutions_20261021.sql`, morceaux 5 et 6) : `__evoChanges`, `getEvolvedEffectsList`, `patchEvolvedEffect`, `patchEvolvedTarget` ; étapes cumulatives (l'étape N applique aussi 0…N-1). Une étape ne se déclenche qu'une fois, permanente.
- Limite : le client ne connaît pas un nouveau nombre de cibles ; le serveur tranche.

## Repères visuels sur le cadre des héros (21/10/2026)
- `spellcraft-server-board.html` : `HERO_INDICATORS` (clé = nom du héros en minuscules) + `heroIndicatorsHtml(key, hero)`, affiché dans `renderHeroFrame` (bas gauche du portrait adverse, haut droite du portrait du joueur). Purement client : lit l'état déjà envoyé (`matchCardsPlayedByType`, `pendingNextCardEffects`, `S.active`, `hpLostThisTurn`) ; aucun script SQL.
- Nayenn'der 🦈 = 3 requins noirs qui deviennent blancs à chaque créature jouée (retour à noir après le déclenchement) ; Rascal ⚡ = sortilèges joués vers le seuil (allumés / éteints) ; Brick 🔍 et Aurore ☀️ = effet « prochaine carte » en attente ; Nowa 🍵 = c'est son tour ; La tortue = bouclier brisé (SVG) quand c'est son tour et que l'adversaire a perdu des PV ce tour-ci.
- Seuil et type de carte des compteurs lus dans le déclencheur « playedCardTypeCountMatch » du héros. Pour ajouter un héros : une entrée dans `HERO_INDICATORS`.

## Affichage du mana (21/10/2026)
- `renderManaBox` (plateau et tutoriel) : plus de colonnes de points. Pile verticale identique pour les deux camps : [mana fragile : grosse icône + nombre, seulement s'il y en a] / [icône pleine + disponible/max] / illustration de la région. Le nombre « disponible » = `manaNormal` (le fragile est affiché à part ; le calcul de coût/jouabilité utilise toujours normal + fragile).

### Nayenn'der : améliorations permanentes des requins
Sur le cadre du héros, une 2e rangée s'affiche à côté des icônes de requin (au-dessus pour le joueur, en dessous pour l'adversaire). Elle lit `conjurationUpgrades['Squale affamé'].keywords` (une icône par mot-clé) et affiche un « + » par point de bonus (max(atkBonus, hpBonus), « +N » au-delà de 8). Client uniquement (`heroIndicatorsHtml` dans `spellcraft-server-board.html`).

### Indicateurs de héros : noir = inactif, blanc = actif
Rascal (éclairs), Brick (loupe), Aurore (soleil) et Nowa (théière SVG `HERO_INDICATOR_TEAPOT`) affichent toujours leur icône : noire (classe `shark-black`) tant que la condition n'est pas remplie, blanche (`shark-white`) quand elle l'est. Les « + » et icônes de mots-clés des requins ne changent pas de couleur.
La tortue (bouclier brisé SVG) suit la même règle : noir (`turtle-black`) par défaut, blanc (`turtle-white`) quand le passif est prêt ; la fissure est inversée pour rester visible.
Linéasthasia : mêmes éclairs que Rascal, mais lus sur `p.cardsPlayedThisTurnByType` (déclencheur « joué X cartes [type] ce tour-ci », sans cycle : le compteur repart à 0 à chaque tour).

## Baston de taverne (mode du vendredi 18h → samedi 2h, heure de Paris)
- **Principe** : deck SANS héros (`user_decks.data.taverne = true`, `heroId`/`regionId` nuls), 3 couleurs maximum (Neutre ne compte pas), aucune carte liée à un héros (`card.hero`). À chaque partie, le serveur tire un héros au hasard parmi tous les héros du catalogue (`pickTavernHero`) ; région = Côte de Rimd'Orël par défaut.
- **Accès** : bouton « 🍺 Baston de taverne » du lobby (menu « Type de partie », sous la recherche de partie ; « Créer une partie privée » est passé sous « Affronter l'IA ») → `spellcraft-lobby.html?mode=taverne` (seule la recherche d'adversaire existe) ; construction du deck : `spellcraft-deckbuilder.html?mode=taverne` (`TAVERN`, `loadScopedDecks`, `tavernDeckColors`, règle dans `classAllowedByDeck`). Les decks de taverne n'apparaissent que dans ce mode, les decks normaux n'y apparaissent pas.
- **Horaires** : `scTavernOpenNow()` (spellcraft-shared.js, affichage) et `tavernIsOpenNow()` (moteur, fait foi). Hors horaires : erreur `taverne-fermee`, sauf compte « Kroquette » (test). Le deck peut être construit à tout moment.
- **File d'attente** : colonne `matchmaking_queue.mode` ('normal' | 'taverne'), `try_match_opponent(p_user_id, p_deck_id, p_mode)` ne rapproche que deux joueurs du même mode. `joinMatchmaking` reçoit `mode` ; un deck de taverne est refusé partout ailleurs (`deck-taverne-matchmaking-uniquement`) et un deck normal refusé en taverne (`deck-non-taverne`).
- **Effets** : l'état de partie porte `mode: 'taverne'` ; `ranked_apply_match` l'ignore (le classement ne bouge pas). Quêtes, succès, coffres du calendrier et passe comptent comme une partie normale. Les compteurs « héros/classe joués » ne sont pas incrémentés.
- Script : `taverne_20261021.sql` (sauvegardes `_backup_game_action_chunks_20261021_taverne`, `_backup_functions_20261021_taverne`).
- **Récompense** : à la fin du premier match de la soirée (vendredi 18h → samedi 2h, heure de Paris), chaque joueur reçoit 1 « Booster + classique » (`booster_1786099811111`), victoire ou défaite. Trigger `taverne_after_match` (sur `match_history`) → `taverne_first_match_reward()`, table `tavern_rewards (user_id, evening)` pour ne donner qu'un booster par soirée. L'écran de fin de partie (`renderGameOverOverlay`) interroge `tavern_rewards` pour l'annoncer. Script : `taverne_recompense_20261021.sql` (à lancer après `taverne_20261021.sql`). Pour passer à « une seule fois dans toute la vie du joueur », remplacer la clé primaire par `user_id` seul.

### Déclencheur « une carte reçoit un bonus ou un malus » (`watchBuffed`)
Éditeur (étape « Précision » de Quand → une carte, et Quand → cette carte pour les créatures : déclencheur `onBuffed`, même réglage, joué par `fireBuffTrigger` via `runNewFormatAbilities`) : champ `te.buffKind` = `statUp` (défaut, ancien sens) | `statDown` | `keywordGain` (+ `te.buffKeyword`, `any` = peu importe) | `keywordLoss` (silence) | `any`. Moteur : `fireBuffTrigger(creature, ownerKey, kind, keyword)` (morceau 7) pose `__buffChange` puis lance `watchBuffed` avec la créature concernée ; `matchesNewTriggerEntry` (morceau 4) compare `buffKind`/`buffKeyword`. Sources : effet « bonus/malus de stats » (`buff`, positif ou négatif), `grantKeyword`, `upgrade`, `copyKeyword`, choix de mot-clé, `silence`. Non couverts : `setStat`/`setStats`, bonus temporaires qui expirent, gains par aura. Script : `bonus_malus_20261021.sql`.
- **Ouverture exceptionnelle** : ligne `app_flags.tavern_force_open` (vraie) = taverne ouverte 2 h à partir de `updated_at` (client : `scTavernForcedOpen()`, serveur : `tavernAllowed`). Script : `taverne_ouverture_exceptionnelle_20261022.sql` (relancer sa dernière instruction pour rouvrir).

## Texte automatique des cartes : mots-clés sans explication (octobre 2026)
- `buildCardText` (éditeur de cartes) écrit désormais seulement le **nom** des mots-clés, séparés par des virgules (« Armure, Tenace »), sans l'explication entre parenthèses. L'explication reste dans `KEYWORDS[].desc` (liste de l'éditeur, grimoire, infobulles).
- Les cartes déjà enregistrées avec l'ancien format ont été nettoyées par `texte_mots_cles_20261022.sql`.

## Accélération des actions : mesure et allègement (octobre 2026)
- Mesure (22 oct.) : l'état d'une partie pèse en moyenne 385 Ko dans `game_sessions.state` (max 564 Ko) ; chaque action le lit, le réécrit et le renvoie. Paquet ≈ 104 Ko par joueur, défausse ≈ 50 Ko par joueur. Retour du joueur : 2 à 5 s entre le clic et l'animation d'une carte jouée.
- Une action = un seul appel `game-action` (la réponse contient déjà l'état, voir `runAction`) : verrou (RPC) → lecture de la session → catalogue (mis en cache 5 min, test de fraîcheur) → moteur → écriture → diffusion → libération du verrou.
- `acceleration_1_20261022.sql` : `redactStateForViewer` fait une copie légère (plus de `JSON.parse(JSON.stringify())`), masque aussi le paquet du joueur (le plateau n'utilise que `deck.length`) et retire `destroyedLastTurn`, `destroyedThisTurn`, `lastPlayedCard`, `matchPlayedCardsLog`, `matchDrawnCardsLog` de la réponse (la base garde tout). Chaque réponse porte `_t` (temps cumulés auth/lock/load/catalog/dispatch/redact, en ms), affichés par le chrono (`?chrono=1`).
- `precharge_images_20261022.sql` : le serveur envoie `deckImages` (illustrations du paquet du joueur, sans ordre) et le client précharge toutes les images connues (`preloadStateImages` dans `spellcraft-server-board.html`, 3 à la fois). L'enregistrement des parties (`match_history.final_state`) n'est pas modifié.

## Cible « La créature attaquante » (octobre 2026)
- Nouveau `targetOwner: 'combat_attacker'` (éditeur : étape Cibles, « La créature attaquante (en combat) », suggérée avec les déclencheurs `onBlocked` / `onDamaged`). Le moteur mémorise `blocker._combatAttackerId = attacker.instId` dans `doAssignBlock` (effacé dans `doEndTurn`) ; `resolveNewTargetEntry` retrouve l'attaquant s'il est encore en jeu et déclaré attaquant. Sans attaquant connu (blessure par un sort, attaquant mort) : aucune cible. Script : `cible_attaquante_20261022.sql`.

## Cadres de cartes : rendu dessiné uniquement (22/10/2026)

Les cadres PNG (`images/card/big frame/`, `images/card/small frame/`) sont supprimés. Toutes les cartes sont dessinées en SVG/CSS par `spellcraft-card-render.js` (généré par `python3 tools/build_module.py spellcraft-card-render.js` à partir de `tools/gen.py` + `tools/module_tpl.js` — ne pas éditer le .js à la main). L'option « Style des cartes » a disparu des réglages et l'ancienne clé `sc-card-style` est effacée du navigateur. `ncardRealPath` / `ncardHalfFramePath` n'existent plus dans les pages. Les icônes (mana, stats, rareté, bandeau du nom) restent des images dans `images/card/icon/`.

Note : `tools/build_tutorial.py` échouait déjà avant ce changement (« démarrage » introuvable dans le plateau) ; `spellcraft-tutorial.html` a donc été modifié directement, de la même façon que le plateau.

## Initiative permanente (22 oct. 2026)
- Retour à l'Initiative de base : elle ne s'épuise plus (`initiativeUsed` n'est plus jamais mis à `true` : `applyDamage` et le coup au héros dans `resolveCombat…` ne le font plus). Les textes (éditeur, bulles, grimoire, règles §7.5/7.7) sont à jour. Script : `initiative_permanente_20261022.sql`. Le test `!initiativeUsed` reste dans le moteur mais est toujours vrai.

## Ciblage et pièges : effets non listés (23 oct. 2026)
- `applySpellEffect` ne reconnaissait comme « ciblant » que les effets de `TARGETED_EFFECTS` (dégâts, soin, étourdissement, gel, renvoi, destruction, silence, affaiblissement, bonus, mot-clé). `applyNewAbilityEffects` marque maintenant `mapped.__designated` quand la cible est **désignée** (`selectionMode:'chosen'`, camp `enemy`/`ally`/`any`) : ces effets (fight, copyCard, stealStat, swapStats…) réveillent aussi `fireTrap('onOpponentTargetsAlly')`, `watchTargeted` et `onTargeted`. Script : `ciblage_piege_20261023.sql`.

## « Réduit le coût » déclenché : Portée respectée (23 oct.)
- L'éditeur propose la Portée (En main / Dans le deck / Les deux) pour l'effet `reduceCost`, mais le moteur l'ignorait : il posait toujours une réduction permanente (`activeCostReductions`) sur toutes les cartes concernées du joueur.
- Correctif (script `reduce_cost_portee_20261023.sql`, morceaux 2 et 5 de `game-action`) : `mapEffect` transmet `scope`; `case "reduceCostAura"` applique, si `scope` ∈ hand/deck/both, un `_instanceCostReduction` unique sur chaque carte concernée de la zone choisie (type `any`/vide = tous, sous-type vide = tous).
- Sans `scope` : ancien comportement. Les auras continues (`recalculateContinuousEffects`, morceau 6) ne sont pas modifiées.

## Quêtes de progression cumulatives (23 oct.)
- Avant : chaque quête de progression avait son propre `progress_count`, qui démarrait à 0 à son apparition (« Vétéran » ne comptait que les victoires postérieures à son apparition).
- Maintenant (script `quete_progression_cumulative_20261023.sql`, fonction `get_active_quests`) : à chaque lecture, les quêtes de progression non réclamées (`play_games_total`, `win_games_total`) prennent `profiles.total_games_played` / `profiles.total_wins`, plafonné à l'objectif. Les quêtes réclamées ne sont pas modifiées.

## Sélection de deck (lobby) : tuiles de taille fixe (27 oct.)
- La grille `#deck-grid` utilisait `repeat(3, 1fr)` : un nom de deck long (texte `nowrap`) élargissait sa colonne et donc sa tuile. Passage à `repeat(3, minmax(0, 1fr))` + `min-width:0` sur `.deck-tile-wrap`; nom et région sont tronqués avec « … ».

## Amplification continue (aura) corrigée (27 oct.)
- `recalculateContinuousEffects` (morceau 6) lisait `eff.category` / `eff.amount` sur la capacité brute alors que l'éditeur écrit `amplifyCategory` / `valueFixed` : l'amplificateur posé valait +undefined (Licorne du bosquet n'augmentait pas les soins). Lecture corrigée (script `amplification_continue_20261027.sql`). La version ponctuelle (`mapEffect` → `case "amplifyEffect"`) était déjà correcte.

## Capacités activées « Choisissez » (Reseph-Kaamen) (27 oct.)
- Avant : `activatePermanent` n'avait pas de `choiceKey` : le client n'affichait aucune fenêtre de choix et le moteur appliquait toujours le choix A.
- Maintenant : `uiActivatePermanent` affiche `showCardChoiceModal` pour une capacité `activated` à `useChoice`, puis le ciblage du choix retenu (`findNewFormatChosenTargets(..., choiceKey)`, qui ignore les cibles non utilisées par le choix) ; `gsActivatePermanent` envoie `choiceKey` ; `doActivatePermanent` (morceau 8) le transmet à `applyNewAbilityEffects` et à `abilityMissingChosenTarget` (morceau 6), et le conserve dans `pendingSacrifice`. Script `choix_capacite_activee_20261027.sql` (morceaux 6, 8, 11). Le tutoriel n'est pas modifié (aucune carte à choix activé).

## Régions : pouvoir qui remplace le gain de mana = +1 mana vide (27 oct.)
- `tryReplaceManaGain` (morceau 9) : avant, aucun nouveau cristal (mana max inchangé, mana rechargé à l'ancien max). Maintenant `manaNormalMax + 1` (cristal vide) sauf si la capacité contient déjà un `grantMana` de type `empty` (Village kobold) ; déclenche `onManaGained`. Script `region_mana_vide_20261027.sql`. Les textes des cartes ne sont pas modifiés.

## Premier joueur aléatoire contre l'IA (27 oct.)
- `buildInitialState` (morceau 11) : `active = vsAI ? "p1" : hasard` → `active = hasard` (50/50 dans tous les cas). Le client relance déjà le tour de l'IA quand elle est active en phase `main` (`scheduleAiTurn`). Script `premier_joueur_aleatoire_20261027.sql`.

## Classeur : « poss. xN » sous la carte (27 oct.)
- `.card-owned-badge` (deckbuilder) était posé sur le bas de la carte ; il est maintenant centré sous la carte (`top:calc(100% + 5px)`), dans l'espace entre deux rangées (gap 32 px, 22 px sur téléphone).

## Isolation des parties : verrou global sur `S` (27 oct., urgent)
- Symptômes : tours qui ne passent plus, cartes qui repartent en main, joueur qui arrive dans la partie d'un autre. Preuve en base : deux sessions IA créées à 8 s d'intervalle avaient leurs `state.p1.userId` échangés (`game_sessions.player1_id` ≠ `state.p1.userId`).
- Cause : l'état de partie `S` (et les files `QUEST_PROGRESS_QUEUE`, `ACHIEVEMENT_*`) sont des variables globales du module ; `withSave` fait plusieurs `await` (quêtes, récompenses, historique) avant d'écrire `state: S`. Pendant ces attentes, une action d'une autre session (même isolate) exécute `S = session.state` et la sauvegarde écrit alors l'état de l'autre partie. Le verrou par session (`acquireLock`) ne protège pas entre sessions différentes.
- Correctif (script `urgent_isolation_parties_20261027.sql`, morceaux 9 et 10) : `__withS(fn)` met `dispatchAction` en file (une action à la fois par isolate, attente max 25 s).
- Piste durable : supprimer l'état global (passer `S` et les files par requête, ex. `AsyncLocalStorage`) pour retrouver le parallélisme.

## Agent de Sandroska : doublement « ce tour-ci » limité au tour (27 oct.)
Symptôme : « double les effets de votre héros ce tour-ci » restait actif plus longtemps que le tour de l'attaque.
Moteur (`game-action`, morceaux 4 et 7) : chaque entrée de `_doubledTriggersThisTurn` porte maintenant `turn: S.turn`.
`hasActiveDoublerOnBoard` ignore toute entrée dont `turn` ≠ `S.turn`, et `doubleEffectsTrigger` retire les entrées périmées avant d'en poser une nouvelle.
Le nettoyage de `doEndTurn` est conservé (ceinture + bretelles). Script : `agent_sandroska_ce_tour_20261027.sql`.

## « Réduit le coût » : « Tous types », Portée et filtre hors deck de base (27 oct.)
Symptôme : Cauchemare envahissant (« réduit de 1 le coût de toutes les cartes qui ne viennent pas de votre deck de base ») ne réduisait rien.
Causes : (1) l'ancien chemin posait une réduction permanente dont le type valait `"any"`, comparé au vrai type de la carte (`getEffectiveCost`) → jamais vrai → aucune carte réduite ; (2) `scope` ignoré (le script du 23 oct. n'était pas en base) ; (3) pas de filtre « hors deck de base » sur l'effet.
Correctif (`reduction_cout_hors_deck_20261027.sql`, morceaux 2 et 5) : `mapEffect` transmet `scope`, `notInBaseDeck` (`reduceCostNotInBaseDeck`) et lit le montant en nombre ; `reduceCostAura` pose `_instanceCostReduction` sur chaque carte de la zone (main/deck/les deux) qui respecte type (« tous » accepté), sous-type et `!_isBaseDeckCard`. Sans portée : ancien chemin, avec `"any"` converti en « tous ».
Éditeur : case « Seulement les cartes hors de votre deck de base » sur l'effet `reduceCost` (+ texte généré). Données : Cauchemare envahissant reçoit `reduceCostNotInBaseDeck: true`. Ce script remplace aussi `reduce_cost_portee_20261023.sql` (Familier de Jaäne) : ne pas exécuter les deux.

## 2026-10-28 — Set des Veilleurs : cartes alignées sur leur texte
- Nouveaux effets moteur : `destroySelf` (la carte source se détruit : artefact → `destroyArtifact`, créature → mort) et `removeFromCombat` (retire la créature ciblée de `S[p].attackers`, tableau partagé avec `validIds` dans la déclaration d'attaque). Ajoutés à l'éditeur (groupes « Artefacts et pièges » / « Créatures et plateau ») avec leur texte généré.
- `fireTrap(..., "onOpponentAttack")` reçoit maintenant la 1re créature attaquante non imparable comme cible (`resolveNewTargetEntry` « trigger »).
- Données (script `veilleurs_texte_fidele_20261028.sql`) : A bout de bras (removeFromCombat), Tract (destroySelf), Acolyte (le +1/+1 « je gagne » cible la source), Fan (plus « une fois par tour »), Compagnon zélé / Cultiste solitaire (triggerOwner « any »), Déstructeur (cible choisie), Nécromancienne (zone `discard`), Un groupe soudé (durée fin de tour), Géant à deux têtes (cible pour chaque choix).
- Points ambigus laissés tels quels : Talent de l'ingénieur (révèle 3 artefacts du deck), Nouveau contrat (« artefacts en jeu » = les deux camps ou le sien).
- Condition `singleAttacker` (chunk 0, `evalConditionBase`) : vraie si l'adversaire attaque avec exactement 1 créature. Utilisée par À bout de bras (script `a_bout_de_bras_un_seul_attaquant_20261028.sql`) ; ajoutée à l'éditeur.

## 2026-10-28 — Collection : filtre « Nouvelles cartes »
- `spellcraft-deckbuilder.html` : nouveau filtre `filters.newOnly` (bouton 🆕 dans la barre rapide, à côté de 🙈). Il ne garde que les cartes présentes dans `newCardIds` (cartes obtenues depuis la dernière ouverture, qui ont encore la mention « Nouveau »). Une carte survolée perd sa mention, donc sort du filtre au prochain affichage. Réinitialisé par « Réinitialiser ».

## 2026-10-28 — Icônes de rareté par set
- Dossiers d'icônes (nom de fichier = slug de rareté, repli automatique sur `images/card/icon/rare/` si absent) : `images/card/icon/rare/oeil/` (commun, rare, epique, mythique ; pas de basique/legendaire) pour La quête des Veilleurs, `images/card/icon/rare/lord/` (rare seulement) pour le set Lord.
- Script `icones_rarete_veilleurs_lord_20261028.sql` : `card_sets.rarity_icon_dir` + `rarityIconDir` sur les cartes du set (le rendu lit le dossier dans la carte), création du set « Lord » (masqué : hors boutique, récompenses et collection).
- Gemmes de rareté : `object-fit:contain` ajouté sur `.nrarity-gem` / `.nlegendary-gem` (6 pages). La boîte garde le ratio 231/297 des icônes d'origine ; une icône carrée (ex. œil 1024×1024) y était étirée.
- Gemmes de rareté personnalisées : `rarityGemImg` ajoute la classe `gem-custom` quand le set a son propre dossier d'icônes ; ces icônes (carrées) sont affichées plus grandes (18 % grande carte / 16,5 % petite, ratio 1:1). Retirée si le repli sur l'icône par défaut se produit.
- Icônes œil/lord : marges transparentes rognées (œil : 679×834 pour les 4 raretés, ratio identique ; lord : 800×869) pour que le dessin remplisse la gemme. `.gem-custom` : largeur 13,5 % (grande) / 12,2 % (petite), ratio 679/834, y compris dans le rendu « dessiné » (`spellcraft-card-render.js`, `top` recalé pour garder le même centre).
- ESSAI (28/10) : pas de cadre ovale doré autour des icônes de rareté perso. `decorateFrame` ajoute la classe `n-gem-free` quand `card.rarityIconDir` est défini ; règle CSS `.ncard.n-gem-free .nd-fr ellipse[stroke]{display:none;}` (cache l'ellipse de la gemme dans le cadre dessiné). Retour arrière : supprimer cette règle et la ligne `n-gem-free` dans `spellcraft-card-render.js`. Les icônes classiques gardent leur cadre.

## 2026-10-28 — Boosters / mini-sets : description et cartes mises en avant
- Table `boosters` : colonnes `description` (text) et `showcase_cards` (jsonb, ≤ 6 ids de cartes). Script `boosters_description_cartes_20261028.sql`.
- `spellcraft-atelier-boutique.html` : champ description + sélecteur de cartes (cartes du set source, recherche, 6 max ; changer de set vide la sélection). Sans les colonnes, l'enregistrement refuse avec un message qui renvoie au script SQL.
- `spellcraft-shop.html` : la description remplace/complète le texte générique de l'étagère (boosters et mini-sets) ; bouton « 🔍 Voir le contenu » → modale `pack-preview-modal` avec description et cartes (rendu `buildBoosterCardEl`, aperçu au survol).
- Boutique : si un booster/mini-set a une description, l'étagère n'affiche QUE cette description (plus le texte générique). Mini-sets : le bouton « Voir le contenu » est toujours présent et la fenêtre ajoute la liste complète des cartes du set (pastille de classe, nom, classe, rareté ; triée par rareté puis nom) sous les cartes mises en avant.

## 2026-10-28 — Cartes rognées sur les bords (boutique, quêtes, deckbuilder)
- Cause : les cadres dessinés (`n-drawn`) ont des éléments qui dépassent légèrement de la carte (gemme de coût en haut à gauche, emblèmes de stats en bas). Les boîtes qui entouraient les cartes réduites avaient `overflow:hidden` et les coupaient.
- Correction : `overflow:visible` sur les holders de `spellcraft-shop.html` (aperçu de pack, étagères, offres du jour, révélation de booster), `.craft-linked-card .ncard` et `.hp-linked-slot` (deckbuilder), `.reward-card-mini` (quêtes). Espacement des cartes de l'aperçu de pack augmenté (22px/24px).

## 2026-10-28 — Ouverture de booster carte par carte + récapitulatif
- `dealBoosterCards` (spellcraft-shop.html) refait : une grande carte face cachée au centre (taille adaptée à la hauteur d'écran), compteur « n / total », 1er clic/Espace/Entrée = retourne, 2e = carte suivante. Les cartes vues s'alignent en miniatures (liseré selon rareté). Bouton « Tout révéler » = saute au récapitulatif. Plus de barre de défilement.
- Fin d'ouverture (`finishBoosterOpening`) : ferme l'écran de révélation, affiche le toast de fragments puis le même récapitulatif (tableau) que l'ouverture automatique (`showAutoSummary`), titre au singulier/pluriel (`lastBoosterQty`). « Fermer » ramène à la liste des boosters (`closeAutoSummary`).
- `closeBoosterOpening` conservé mais n'est plus appelé par le flux normal.

## 2026-10-28 — Transition « on change de carte » à l'ouverture de booster
- Dans `dealBoosterCards` : la carte vue s'envole vers la gauche (rotation + fondu, 0,3 s) pendant que la suivante arrive depuis la droite ; une pioche de 1–2 dos de carte (dos équipé, variable CSS `--rv-back`) reste visible derrière tant qu'il reste des cartes. Verrou `busy` contre les doubles clics.
