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

Table `user_decks` (`id` uuid, `user_id`, `name`, `data` jsonb, `created_at`, `updated_at`). Le contenu du deck (`heroId`, `regionId`, `cards`) vit dans la colonne `data` ; `id` est généré par Supabase et remplace l'ancien schéma local `deck_<timestamp>`.

Fonctions dans `spellcraft-catalog.js` : `loadUserDecks()`, `saveUserDeck(deck)` (insert ou update selon que `deck.id` est déjà un uuid Supabase), `deleteUserDeck(id)`, et `migrateLocalDecksToSupabaseIfNeeded()` (migration ponctuelle des anciens decks `localStorage`, même logique que pour le catalogue). Le deckbuilder ET le jeu lisent désormais les decks via `loadUserDecks()` — plus aucune des deux pages n'utilise `localStorage` pour les decks. `spellcraft-decks` (l'ancienne clé) ne sert plus que de source pour cette migration ponctuelle.

### Multijoueur — mise en relation (étape 1 sur 2)

**Ce qui existe aujourd'hui : uniquement la mise en relation**, pas encore la synchronisation d'une vraie partie en temps réel. Table `game_rooms` (`spellcraft-supabase-schema-addendum-4.sql`) : `host_id`, `guest_id`, `host_deck`, `guest_deck` (snapshots jsonb des decks au moment du match), `status` (`waiting` → `active` → `finished`), `winner`.

Flux (`spellcraft-multiplayer.js`) :
- L'hôte choisit son deck → "Défier un ami" → `mpCreateRoom(deck)` crée la ligne, `mpInviteLink(id)` construit un lien du type `spellcraft-prototype.html?room=<uuid>`.
- L'hôte attend via `mpWaitForGuest()` (sondage simple toutes les 2s sur la ligne — pas de Realtime Postgres Changes pour éviter d'avoir à activer la réplication sur la table pour cette seule étape).
- L'invité ouvre le lien → `initGameSetup()` détecte `?room=` dans l'URL (`mpGetRoomIdFromUrl()`) et route vers `renderMultiplayerJoin()` au lieu du choix de deck normal → choisit son propre deck → `mpJoinRoom(roomId, deck)`.
- Une fois les deux decks connus des deux côtés, **la page ne fait pour l'instant qu'afficher une confirmation** — aucun coup n'est encore synchronisé entre les deux navigateurs.

**Prochaine étape (pas encore construite) :** la synchronisation de la partie elle-même, via un canal Supabase Realtime "Broadcast" (`sb.channel(...).on('broadcast', ...)`, indépendant de la réplication Postgres). Architecture prévue : le navigateur de l'hôte reste la seule source de vérité et fait tourner le moteur de jeu existant sans modification (`S`, `playCard`, `resolveCombat`...) ; les actions de l'invité arrivent par le canal et sont appliquées côté hôte exactement comme le sont aujourd'hui celles de l'IA (`playCard('p2', ...)` etc.) ; l'état à jour est rediffusé à l'invité après chaque action, qui l'affiche avec les rôles p1/p2 inversés (son propre point de vue) en réutilisant tel quel le pipeline de rendu existant.

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
| `heroMultiClass` | Héros | `{enabled:false, allowedClasses:[], maxCount:6, scope:'Toutes'}` |
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
