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

Un cinquième fichier, **`spellcraft-shared.js`**, est chargé par les trois outils (pas le hub) via une balise `<script src="spellcraft-shared.js"></script>` placée juste avant leur propre `<script>`. C'est la seule source de vérité pour :
- les listes de référence (`CLASSES`, `CLASS_COLORS`, `RARITIES`, `CARD_TYPES`, `KEYWORDS`)
- `escapeHtml()`
- `getClassColor()`
- `migrateCard()` — voir section 3

**Règle d'or : si les trois fichiers ont besoin de la même donnée ou de la même fonction, elle va dans `spellcraft-shared.js`, jamais copiée-collée trois fois.** C'est l'inverse de ce qui s'est passé jusqu'ici et qui a causé plusieurs bugs (couleurs de classe divergentes entre le deckbuilder et le reste, champs de carte oubliés lors de la traduction vers le moteur de jeu, etc.).

Persistance : un wrapper `storageGet`/`storageSet` (dans `spellcraft-shared.js`, sur `localStorage`) fait office de base de données. Actuellement local à chaque navigateur — c'est le point qui devra changer en premier quand on ajoutera un vrai système de comptes.

### Stockage des cartes par sets

Depuis cette passe de nettoyage, les cartes ne sont plus stockées dans un seul gros JSON (`spellcraft-cards-v2`). Elles sont réparties par **set**, chacun dans sa propre clé :

- `spellcraft-sets-index` → `[{id, name}, ...]`, la liste des sets existants
- `spellcraft-cards-set-<id>` → le tableau de cartes de ce set

Fonctions disponibles dans `spellcraft-shared.js` : `loadSetsIndex`, `saveSetsIndex`, `loadSetCards(id)`, `saveSetCards(id, cards)`, `loadAllCardsAcrossSets()` (agrège tous les sets — c'est ce qu'utilisent le deckbuilder et le jeu, qui n'ont pas besoin de connaître la notion de set), et `migrateLegacyCardsToSets()` (migration automatique et unique depuis l'ancien format, déclenchée si `spellcraft-sets-index` est vide mais que `spellcraft-cards-v2` contient des cartes — réparties selon leur champ `set` existant).

L'éditeur seul travaille "set par set" : un sélecteur dans l'en-tête (`#set-selector`) détermine quel set est actif, `cards` ne contient que les cartes de ce set, et `persistCards()` sauvegarde dans la clé de ce set uniquement. Le dernier set actif est retenu (clé `spellcraft-last-set-id`) pour rouvrir l'éditeur au même endroit. Créer/renommer/supprimer un set se fait depuis les boutons ➕ / ✏️ / 🗑️ à côté du sélecteur.

Le deckbuilder et le jeu, eux, n'ont pas de notion de set : ils appellent `loadAllCardsAcrossSets()` et travaillent sur la liste agrégée, exactement comme avant ce changement — aucune de leurs pages n'a eu besoin d'être modifiée en profondeur pour ça, seul le point de chargement a changé.

---

## 2. Ce qui N'EST PAS encore partagé (et pourquoi)

Le rendu visuel d'une carte (`buildCardEl` dans l'éditeur et le deckbuilder, `cardEl` dans le jeu) reste dupliqué entre les trois fichiers, volontairement, pour cette passe de nettoyage :

- Les trois versions ont des tailles de carte différentes (220×360 dans l'éditeur, 155×217 dans le deckbuilder, 150×204 dans le jeu) et chaque valeur (police, icônes, décalages) a été ajustée à la main pour chacune.
- La version du jeu gère en plus des états que les deux autres n'ont pas (gel, étourdissement, maladie d'invocation, armure, pièges armés, foil, ciblage) — ce n'est pas une simple différence de taille, c'est une fonction plus riche.
- Unifier ça maintenant aurait un risque de régression visuelle élevé sur des dizaines d'heures de réglages fins, pour un gain surtout esthétique (le code dupliqué ici ne cause pas les bugs qu'on a eus — c'est l'absence de schéma de données commun qui les causait).

**Recommandation pour plus tard :** si un développeur reprend ce projet, la unification du rendu de carte (idéalement via des variables CSS `--card-w`/`--card-h` plutôt que des tailles en dur) est un chantier à part, à faire une fois que la stack technique (voir section 5) est stabilisée — pas avant.

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
