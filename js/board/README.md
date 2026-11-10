# Plateau de jeu (spellcraft-server-board.html) — plan des fichiers

Le JavaScript du plateau (6 300 lignes) était dans la page. Il est maintenant découpé en 11 fichiers chargés
DANS CET ORDRE (ne pas permuter : tout est partagé, comme avant, et certaines lignes s'exécutent au chargement).

| # | Fichier | Contenu |
|---|---|---|
| 00 | balisage | Le HTML du plateau (zones, modales, journal, chat) : partagé avec le tutoriel |
| 01 | mots-cles-et-regles | Mots-clés, couleurs des stats, règles d'attaque/blocage côté client, séquencement adverse |
| 02 | etat-et-journal | Échelle du plateau, état partagé (S, UI), signalement de bug, journal de partie |
| 03 | connexion-et-annonce-de-match | Connexion, gel du rendu, annonce de match, préchargement des images, onStateUpdate, tour de l'IA |
| 04 | rendu-des-cartes | cardEl, noms, aperçus au survol, infobulles |
| 05 | rendu-du-plateau | render, mana, héros, rituel, pouvoir de héros, permanents, pioche, artefacts |
| 06 | posture-de-combat-et-ciblage | Posture de combat, lignes de créatures, ciblage manuel, clic sur créature |
| 07 | main-et-glisser-deposer | Mains, éventail, glisser-déposer, flèches de ciblage |
| 08 | animations-de-combat | Élan, impact, mort de carte, badges de mots-clés, file d'animations, vitesse, pose animée |
| 09 | pose-par-glisser | Poser une carte en la glissant : zone de dépôt, placement |
| 10 | phases-chat-et-menus | Minuteur, barre de phases, aperçu du héros, émotes, chat, défausse |
| 11 | actions-et-demarrage | Actions envoyées au serveur, mulligan, démarrage (initFromUrl), panneaux déplaçables |

Vérifié : le contenu est identique ligne pour ligne à l'ancien code de la page, et le rendu d'une partie simulée est identique avant/après.
Quand un fichier change, penser à augmenter le `?v=` de sa balise dans la page (cache du navigateur).

Ces fichiers (et les CSS `spellcraft-board-base.css` / `-extra.css`) sont aussi chargés par `spellcraft-tutorial.html`.
