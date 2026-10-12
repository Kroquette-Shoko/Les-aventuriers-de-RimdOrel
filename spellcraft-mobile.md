# Chantier « jeu sur téléphone »

Statut : **état des lieux fait, aucun code modifié**. Rien n'a été testé sur un vrai téléphone.

## État des lieux (11 pages sans balise `viewport` ou sans règles adaptées)

| Page | `viewport` | Règles `@media` | Remarque |
|---|---|---|---|
| hub, calendar, grimoire, atelier-boutique, atelier-annonce, calendar-admin | oui | 0 à 2 | meilleures bases |
| deckbuilder | oui | 2 | classeur 2×2 de 432 px, panneau de deck → à repenser |
| server-board (partie) | oui | 0 utile | **canevas fixe 1920×1080 mis à l'échelle** (`#app-outer`) |
| tutorial | oui | 2 | même principe que le plateau |
| shop, quests, profile, lobby, match-history, achievements(-editor), card-editor | **non** | 0 à 1 | pensées pour écran large |

Constats clés :
- **Plateau** : sur un téléphone en paysage (~844×390) l'échelle est ≈ 0,36 (cartes de 170 px → ~61 px, texte illisible) ; en portrait ≈ 0,2.
- Les actions du plateau reposent beaucoup sur le survol (aperçu de carte, `mouseover`) : sur écran tactile il faut un « appui long » ou un tap pour l'aperçu (un bouton existe déjà via `@media (hover:none)`).
- Ajouter la balise `viewport` à une page non adaptée la **dégrade** (défilement horizontal) : on ne l'ajoute qu'en même temps que les règles adaptées.

## Plan proposé (du plus rentable au plus lourd)
1. **Socle commun** (ui-kit + shared.js) : tailles de boutons ≥ 44 px, barre du haut compacte, menu Options plein écran, `touch-action`, zones sûres (encoches).
2. **Pages « menu »** : hub, boutique, quêtes, profil, calendrier, lobby, historique → une colonne, `viewport` + `@media`.
3. **Collection / deckbuilder** : classeur 1×2 ou 2×2 réduit, deck en tiroir.
4. **Plateau de partie** : décision de conception nécessaire (paysage obligatoire ? disposition dédiée au lieu du canevas 1920×1080 réduit ?), cartes plus grandes, aperçu au tap/appui long, glisser-déposer tactile.
5. **Éditeur de cartes et pages d'admin** : hors périmètre téléphone (usage ordinateur).
6. Test sur de vrais appareils (iOS Safari / Android Chrome).
