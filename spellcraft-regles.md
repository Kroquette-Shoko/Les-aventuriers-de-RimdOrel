# Spellcraft — Règles du jeu

*Document de référence, consolidé à partir de tout ce qui a été conçu dans l'éditeur de cartes. Sert de base pour remettre le moteur de jeu à niveau.*

---

## 1. Objectif

Chaque joueur incarne un **Héros** avec des Points de Vie. Un joueur perd la partie quand ses PV tombent à 0 (ou selon une condition de victoire alternative propre à certaines cartes).

---

## 2. Construction d'un deck

Un deck est composé de :
- **1 Héros** (obligatoire, hors des 30 cartes)
- **1 Région** (hors des 30 cartes) — elle peut remplacer le gain de mana du joueur (voir 3.4). Elle est facultative : sans Région (ou avec une Région invalide), la **Côte de Rimd'Orël** est utilisée.
- **30 cartes** (Créatures, Sortilèges, Pièges, Artefacts)

**Règles de classe :**
- Le Héros impose une **classe** au deck (Aube, Crépuscule, Volonté, Prima, Arcane).
- Seules les cartes de cette classe, ou de la classe **Neutre**, sont autorisées par défaut.
- La **Région** suit la même idée : elle doit être de la classe du Héros (ou de sa classe secondaire), ou Neutre (voir 3.4). Elle n'entre pas dans le plafond des cartes d'une autre classe d'une règle multi-classe.
- Un Héros peut porter une **règle multi-classe** optionnelle : "Autorise jusqu'à X cartes [de tel type précis, ou toutes] d'une autre classe précise." Cette règle est réellement appliquée par le deckbuilder : au-delà du plafond X, ou hors du type autorisé si un type est précisé, la carte est refusée.
- Une carte peut avoir une **classe secondaire** (carte bicolore). Elle compte comme appartenant aux deux classes pour la règle de deckbuilding.

**Règles de copies :**
- **2 exemplaires maximum** par carte.
- **1 seul exemplaire** pour les cartes portant le super-type **Légendaire** (case à cocher dans l'éditeur, indépendante de la rareté).
- La rareté **Basique** ne bénéficie d'aucun passe-droit particulier : elle reste soumise aux mêmes règles de classe et de copies que n'importe quelle autre rareté. C'est une catégorie de rareté comme les autres (voir 3.3), pas un pool universel indépendant du deck.

**Limites sur le plateau (en partie) :**
- **8 créatures maximum** simultanément sur le champ de bataille d'un joueur.
- **2 artefacts maximum** simultanément en jeu pour un joueur (2 emplacements ; un 3e artefact ne peut pas être joué, voir la section 8).

---

## 3. Les six types de cartes

| Type | Coût de mana | Statistiques | Comportement |
|---|---|---|---|
| **Héros** | Aucun | PV | Toujours en jeu dès le début de la partie. Porte la classe du deck, peut avoir des capacités (y compris activées). |
| **Région** | Aucun | — | Toujours en jeu dès le début, ni jouée, ni détruite, ni ciblable. Peut **remplacer le gain de mana** de votre début de tour (voir 3.4) et peut avoir des capacités automatiques ; elle n'a pas de capacité activée. |
| **Créature** | Oui | Force / Endurance | Peut attaquer, bloquer, mourir. Porte la majorité des mots-clés de combat (voir la section 7). |
| **Artefact** | Oui | Usure (charges) | Reste en jeu (2 au maximum par joueur) sans combattre. Se pose en payant son coût de mana (c'est le seul moment où il en coûte), puis s'utilise gratuitement 1 fois par tour (« Utiliser : … »). Chaque utilisation, et chaque déclenchement automatique d'un effet passif, lui retire 1 charge ; quand sa dernière charge disparaît, il est détruit. Voir la section 8. |
| **Sortilège** | Oui | — | Se joue depuis la main en payant son coût. La carte est **défaussée avant** que ses effets ne se résolvent, puis ses effets s'appliquent. Voir 3.5. |
| **Piège** | Oui | — | Posé face cachée, reste dans votre main, sans payer de mana à la pose. Armé au prochain changement de phase, il attend sa condition adverse (attaque, sort, invocation). Le coût en mana est payé uniquement au déclenchement ; si le mana manque, le Piège ne se déclenche pas et reste armé. Une fois résolu, il va en défausse. Non déclenché avant votre tour suivant : se désarme sans effet. Aucune limite au nombre de Pièges actifs ; s'ils visent le même événement, ils s'utilisent du plus ancien au plus récent, un à la fois. |

### 3.1 Cycle de vie d'un Piège

Contrairement à un Sortilège, poser un Piège ne le retire pas de votre main et ne dépense pas de mana à ce moment-là : le coût n'est payé qu'au déclenchement.

1. **Pose** — vous posez le Piège face cachée durant votre tour. Aucun mana n'est vérifié ni dépensé à ce moment, et la carte reste dans votre main.
2. **Armement** — au prochain changement de phase (la fin de votre tour, ou le passage au combat avec la déclaration des attaquants, selon ce qui arrive en premier), le Piège devient **actif**. Ce n'est pas la phase de blocage qui l'arme.
3. **Surveillance** — un Piège actif attend sa condition de déclenchement (attaque adverse, sort adverse, invocation adverse selon la carte). Vous pouvez avoir autant de Pièges actifs que vous le souhaitez en même temps.
4. **Déclenchement** — quand la condition se produit (et que ses éventuelles conditions supplémentaires sont remplies), le coût en mana du Piège est vérifié et payé à ce moment-là :
   - Si vous avez assez de mana : le Piège se révèle, son effet se résout, puis il part en défausse. Un Piège ne se déclenche qu'une seule fois.
   - Si vous n'avez pas assez de mana : le Piège ne se déclenche pas et reste armé. Il retentera au prochain déclenchement possible.
5. **Désarmement** — si un Piège armé ne s'est pas déclenché avant le début de votre tour suivant, il se désarme sans effet et redevient une carte normale en main (vous pouvez le reposer comme Piège plus tard, ou le jouer autrement).

**Plusieurs Pièges sur le même événement.** Si plusieurs de vos Pièges peuvent se déclencher sur le même événement, ils sont utilisés du plus ancien (posé en premier) au plus récent. Un seul Piège se résout à la fois : le suivant ne peut se déclencher qu'après la résolution complète du précédent, et seulement si l'événement qui le déclenche existe toujours à ce moment-là. Exemple : vous avez deux « Oups » armés et l'adversaire lance un sort. Le premier « Oups » annule ce sort. Comme il n'y a plus de sort à annuler, le second ne se déclenche pas : il reste armé et son coût en mana n'est pas payé.

L'adversaire ne voit pas les Pièges dans votre main : il ne découvre un Piège qu'au moment où il se déclenche.

### 3.2 Coût additionnel

En plus de son coût de mana, une Créature, un Sortilège, un Artefact ou un Piège peut porter un **coût additionnel** défini dans l'éditeur : sacrifier une créature alliée, défausser une carte, perdre des PV, ou un coût personnalisé en texte libre. Ce coût s'ajoute au mana à payer pour jouer la carte, il ne le remplace pas.

### 3.3 Rareté et présentation

Cinq raretés existent, de la plus commune à la plus rare : **Basique, Commune, Rare, Épique, Mythique**. Elles n'influencent que l'affichage (couleur de la gemme de rareté) et les filtres de certains effets. Le **super-type Légendaire** est un réglage à part, indépendant de la rareté : c'est lui (et non la rareté) qui limite la carte à 1 exemplaire par deck.

Une carte peut aussi être marquée **Foil** : purement cosmétique, elle affiche un reflet arc-en-ciel qui balaie la carte au survol de la souris ou automatiquement toutes les 10 secondes. Aucun effet sur les règles.

### 3.4 Les Régions

#### En deux phrases
Votre **Région** est une carte qui reste toujours en jeu, à côté de votre Héros. À chaque début de tour, vous gagnez normalement du mana ; certaines Régions donnent en plus une **chance** (30 %, 40 %...) de faire autre chose **à la place** de ce gain de mana : conjurer une carte, gagner de la vie, infliger des dégâts, etc.

#### Choisir sa Région
- Un deck a **une** Région, choisie en plus de ses 30 cartes. Elle n'est pas obligatoire.
- **Classe :** une Région n'est utilisable que si sa classe est celle du Héros du deck (ou sa classe secondaire), ou **Neutre**. Le deckbuilder ne propose que ces Régions, et le serveur le vérifie aussi au lancement de la partie.
- **Région par défaut :** si le deck n'a pas de Région, ou si la Région choisie est invalide (introuvable, pas de type Région, mauvaise classe), la **Côte de Rimd'Orël** est utilisée à la place. Cela n'empêche pas de lancer la partie : le deckbuilder et l'écran de lancement présentent la Côte comme Région du deck.

#### Quand une Région se déclenche
- Le **compteur de tours** d'une Région est celui de **votre propre tour** : « à partir du tour 5 » signifie « à partir de **votre** 5e tour », et non du 5e tour de la partie. Le joueur qui joue en second n'est donc pas désavantagé : son 1er tour est aussi son tour n°1. Cela vaut pour « À partir du tour X » (`turnAtLeast`) comme pour « Au début de votre tour X » (`startOfTurnX`, exactement ce tour-là). Chaque joueur a son compteur et son propre tirage de chance.
- **Remplacement du gain de mana.** Au début de votre tour, si les conditions de la Région sont remplies (tour personnel atteint, puis tirage de la chance), ses effets ont lieu **à la place** du gain de mana normal : vous ne gagnez pas le mana du tour. Si la condition n'est pas remplie ou si le tirage échoue, vous gagnez le mana normal. L'ordre exact est décrit à la section 5.
- **Début de partie** (`gameStart`, « Au début de la partie ») : se déclenche une seule fois, à la **fin du 2e mulligan du joueur n°1, puis pour le joueur n°2**, avant le gain de mana du tout premier tour. Pendant le mulligan, les effets de début de partie n'ont donc pas encore eu lieu.
- **Tout premier tour du premier joueur :** il ne pioche pas, et ses capacités « Au début de votre tour » (celles de sa Région comprises) ne se déclenchent pas, car le moteur ne lance pas de « début de tour » à cet instant. Seul le gain de mana de ce tour a lieu ; la Région pourrait le remplacer si sa condition était remplie, mais aucune Région actuelle ne le peut au tour 1 (leurs seuils sont au tour 3 ou plus). Le joueur n°2 a, lui, un début de tour complet à son premier tour.
- Une Région n'a pas de « Début » (elle n'est jamais jouée depuis la main), de « Quand je suis détruite » ni de « retour du cimetière », et **pas de capacité activée** : l'éditeur ne propose pas ces options pour une Région.

#### Une Région ne peut jamais être détruite ni ciblée
Aucun sort, effet, piège ou capacité ne peut détruire une Région, ni la prendre pour cible (renvoyer, copier, voler, silencer...). *À venir :* de futurs effets pourront augmenter la chance de déclenchement d'une Région ou la remplacer ; ils ne sont pas encore définis.

#### Règles communes aux effets de Région
- **Conjurer une carte** : elle va en main. Si votre main est pleine (8 cartes), la carte conjurée est **perdue** (envoyée au cimetière), exactement comme une pioche. La carte conjurée n'a **aucune restriction de classe** liée à votre deck.
- **Conjurer une créature directement en jeu** : si votre plateau est plein (8 créatures), la créature est **perdue** ; elle ne passe pas par la main. C'est la même règle que pour les Sortilèges (voir 3.5).
- **Gain de mana vide** : suit la règle générale du mana vide (section 4) : il augmente votre maximum, mais ne peut **pas** être utilisé le tour même.
- Le texte de l'effet affiché dans le jeu est toujours celui de la carte.

#### Les 10 Régions
Elles suivent toutes les règles ci-dessus. Les textes sont ceux des cartes.

| Région | Classe | Effet exact |
|---|---|---|
| **Côte de Rimd'Orël** (Région par défaut) | Neutre | Vous gagnez 1 mana au début de votre tour. Aucune chance, aucun remplacement. |
| **Conduit de Clébreaux** | Prima | À partir de votre tour 6, 30 % de chance, au lieu de gagner du mana, d'infliger **3 points de dégâts répartis au hasard** : chaque point est lancé sur une cible tirée au hasard parmi les créatures adverses et le héros adverse. Une même cible peut recevoir plusieurs points. |
| **Château des Arlow** | Aube | À partir de votre tour 5, 30 % de chance, au lieu de gagner du mana, de conjurer une créature Aube de coût 2 ou moins et de lui donner +1/+1. |
| **Cimetière oublié** | Crépuscule | À partir de votre tour 4, 30 % de chance, au lieu de gagner du mana, de donner +1/+0 **de façon permanente** à chaque créature que vous jouez ce tour-ci. |
| **Sentier de la gloire** | Volonté | À partir de votre tour 5, 30 % de chance, au lieu de gagner du mana, de donner **Parade** et +1/+1 à la première créature que vous jouez ce tour-ci. L'effet en attente disparaît en fin de tour s'il n'a pas servi ; le bonus de statistiques, lui, reste **permanent** sur la créature. |
| **Bibliothèque cachée de Sareldacroix** | Arcane | À partir de votre tour 6, 30 % de chance, au lieu de gagner du mana, de conjurer un sortilège qui coûte 6 ou moins. |
| **La forêt des immensités** | Prima | À partir de votre tour 6, 30 % de chance, au lieu de gagner du mana, de gagner 1 mana par créature que vous avez en jeu, pour ce tour. |
| **Village kobold** | Neutre | Au début de votre tour 3 (exactement), 40 % de chance de conjurer un « Kobold » directement en jeu (perdu si le plateau est plein), puis de gagner 1 mana vide (non utilisable ce tour-ci), au lieu du gain de mana normal. |
| **Antique forge des façonneurs** | Volonté | « Le premier artefact coûte 1 de moins. » À partir de votre tour 5, 30 % de chance, au lieu de gagner du mana, d'ajouter un artefact aléatoire dans votre deck. |
| **Sanctuaire oublié de Sarelcronix** | Crépuscule | Au début de la partie, vous gagnez 2 points de vie. À partir de votre tour 5, 30 % de chance, au lieu de gagner du mana, de gagner 2 points de vie. |

### 3.5 Les Sortilèges

Un Sortilège est un effet ponctuel : on le joue depuis la main, ses effets s'appliquent, puis il ne revient pas. Cette section rassemble toutes les règles qui le concernent ; le serveur de jeu les applique, le client (le plateau) et l'éditeur de cartes s'y conforment.

#### Jouer un sort, pas à pas
1. **Conditions pour le jouer** : c'est votre phase principale, vous avez assez de mana, le **coût additionnel** éventuel peut être payé (voir plus bas) et le sort est bien jouable depuis la main (voir « Sorts quand piochée »).
2. **Choix éventuel** : certaines cartes demandent de choisir entre deux options (A ou B) avant de désigner les cibles. Les cibles demandées dépendent de l'option choisie.
3. **Cibles** : vous désignez les cibles exigées par le sort (voir plus bas). Si une cible exigée est impossible à trouver ou invalide, **le jeu est refusé** et rien n'est dépensé.
4. **Paiement** : mana, puis coût additionnel.
5. **La carte est défaussée AVANT la résolution.** Le sort est déjà dans votre défausse quand ses effets se résolvent. Conséquence : un effet qui regarde votre défausse peut la voir, sauf s'il l'exclut explicitement (la « Déduction » exclut le sort lui-même de ses révélations).
6. **Les effets se résolvent** dans l'ordre de la carte.

Un Piège adverse « quand l'adversaire lance un sortilège » (par exemple « Oups ») peut **contrer** le sort : le mana et le coût additionnel sont perdus, le sort va en défausse et son effet n'a pas lieu.

**Il n'y a aucune limite au nombre de sorts joués par tour** : seul votre mana limite. Un sort à 0 de coût peut être rejoué autant de fois que vous en avez.

#### Ciblage et filtres
- Un sort ne désigne que des cibles **valides**. Une cible valide respecte : le **camp** demandé (allié, ennemi ou les deux), la **catégorie** (créature, artefact, héros...) et tous les **filtres** de la carte.
- **Filtres** : sous-type (ex. « un Dragon »), mot-clé (ex. « une créature avec Vol » pour *Chute mortelle*), statistique (ex. « Force ≤ 2 » pour *Chasser les faibles*, « Force ≥ 4 » pour *Vaincre les forts*, « Force ≤ 3 » pour *Ôter la vie*). Ces restrictions sont des **filtres de ciblage** : la cible ne convient pas = elle n'est tout simplement pas proposée (ce n'est plus une « condition » qui ferait perdre le sort).
- **Parade** : une créature adverse protégée par Parade ne peut pas être ciblée par un sort (voir 7.7). Elle est exclue aussi des sorts de zone et des tirages au sort. Vos propres créatures Parade restent ciblables par vos sorts.
- Un **héros** n'est une cible possible que si la catégorie du sort le permet (« héros », « joueur » ou « héros ou créature »). Un filtre (sous-type, mot-clé, statistique) exclut les héros.
- **Aucune cible valide = refus.** Si le sort exige une cible choisie et qu'aucune cible ne convient (plateau vide, tout le monde sous Parade, filtre qui ne trouve personne...), le jeu est **refusé** (erreur `no-valid-target`) : rien n'est dépensé et la carte **reste en main**. Le client affiche « Aucune cible valide » et n'ouvre pas de ciblage vide.
- **Cible invalide choisie = refus** (`invalid-target`) : cible hors filtre, mauvais camp, créature sous Parade, cible choisie deux fois, ou trop de cibles. Là encore, rien n'est dépensé. Le client grise les cibles interdites pour que cela n'arrive pas.
- **Plusieurs cibles.** Certains sorts ont deux cibles distinctes (*Lancer* et *Chasse préparée* : d'abord un allié, puis un ennemi) : le client vous les demande l'une après l'autre. Quand une cible est de la forme **« X cibles »** (par exemple *Force du groupe*, 2 créatures alliées), vous choisissez **de 1 jusqu'à X cibles différentes** : le bouton « Valider » apparaît dès la première cible choisie, et la validation est automatique quand vous atteignez X. Un sort « X cibles » reste donc jouable avec moins de X candidats.
- S'il n'y a qu'**un seul candidat** valide et que vous n'en désignez aucun, le serveur le prend d'office.
- **Limite connue** : seules les cibles **désignées par le joueur** sont contrôlées. Les cibles aléatoires ou « toutes » ne provoquent jamais de refus : si rien n'est à toucher, le sort est joué sans effet (c'est le cas de *Simple désaccord*, *Tempête du trône*, *De feu et de cendre* option B).

#### Pièges de ciblage et effets annulés
Le Piège « si l'adversaire cible une créature alliée » (contre, redirection) peut annuler ou rediriger l'effet d'un sort sur **une cible**. Dans ce cas, **tous les effets du même sort sur cette cible** sont annulés (ou redirigés) : par exemple *Intimidation* contrée n'inflige ni dégâts ni Peureux. Les effets du sort sur **d'autres cibles** ne changent pas. Détails du déclenchement de ce Piège : voir la section 9.

#### Plateau plein, main pleine, deck vide
- **Créature conjurée « directement en jeu » par un sort, plateau plein : elle est perdue** (ni en main, ni au cimetière). Le journal l'indique : « (plateau plein : N perdus) ». C'est la même règle que pour une Région (3.4) et la même que pour la limite de 8 créatures (7.3).
- **Changer en bonbon** et **Contrôle d'Irajani** (qui placent une créature sur **votre** plateau) sont **refusés** si votre plateau est plein (`board-full`) : rien n'est dépensé.
- **Main pleine** (8 cartes) : toute carte qui arriverait en main est défaussée (carte conjurée, volée, renvoyée, révélée puis choisie...). Une carte **piochée** avec la main pleine est défaussée **sans** déclencher son effet « quand piochée ».
- **Deck vide** : piocher dans un deck vide est une **défaite immédiate**, même au milieu de la résolution d'un sort (il n'y a pas de fatigue progressive).

#### Coût supplémentaire
- **Perdre des PV** (ex. *Régicide*) : le sort est **injouable si vos PV sont inférieurs ou égaux au coût** (vous ne pouvez pas vous tuer pour le jouer). Erreur `cannot-pay-extra-cost`, rien n'est dépensé.
- **Sacrifier une créature** (ex. *Don de jaäne*) : sans créature alliée à sacrifier, le jeu est refusé (`cannot-pay-extra-cost`). Si vous avez plusieurs créatures, le jeu vous demande laquelle.
- **Défausser une carte** : il faut une autre carte en main.

#### Sorts « quand piochée »
Quelques sorts (*Cauchemar*, *Vigueur naturelle*, *Force naturelle*, *Récompense naturelle*) se déclenchent **quand ils sont piochés**, pas quand on les joue. Ils sont **injouables depuis la main** (`not-playable`) : le client les grise et affiche « Se déclenche à la pioche ». Seule la **pioche** les déclenche ; une carte qui arrive en main autrement (conjuration, révélation, *Déduction*) ne déclenche rien. Un sort qui a **aussi** une capacité « quand cette carte entre en jeu » reste jouable.

#### « Ce tour-ci », compteurs du tour
- Un mot-clé accordé **« ce tour-ci »** disparaît à la **fin du tour courant** (voir 5 et 7.7). Un mot-clé que la créature avait déjà (de naissance ou par un octroi permanent) est conservé (ex. *Évasion d'Irajani*, *De la terre au ciel*).
- Le compteur de morts de *Pillage de cadavre* compte les créatures mortes **pendant le tour courant**, **des deux camps**, et repart à zéro à la fin de chaque tour.

#### Dégâts et perte de PV
Une **perte de PV** (effet de dégâts marqué « perte de PV » dans l'éditeur, par exemple *Cauchemar* ou *Régicide*) retire directement des PV à un **héros** : ce n'est **pas** un dégât. Elle n'est pas augmentée par les effets qui amplifient les dégâts, et ne compte pas comme « le héros subit des dégâts ». Sur une créature, le même effet inflige des dégâts normaux.

#### Soin, mana
- **Soin du héros** : aucun plafond de PV (voir 11, point 6). Soigner une créature la ramène au plus à son Endurance de référence.
- **Plafond de mana** : le mana maximum ne dépasse jamais **20**.

#### Sorts conjurés et *Don de savoir*
- Comportement actuel du moteur : un sort conjuré avec la destination « lancé » est **gratuit**, ses cibles sont **tirées au hasard**, et il ne compte pas comme un sort joué depuis la main.
- ***Don de savoir*** lance **4 sortilèges** de coût **5 ou plus**, tirés au hasard ; *Don de savoir* et *Don de jaäne* sont exclus du tirage. Un **garde-fou** limite l'imbrication à **3 niveaux** : au-delà, la carte lancée est perdue (une ligne du journal le signale).
- ***Confrontation épique*** conjure en main une créature **ou un artefact Mythique** au hasard.
- Les révélations **aléatoires** ne proposent que des types de cartes **jouables depuis la main** (Créature, Sortilège, Artefact, Piège), jamais un Héros ni une Région. *Déduction* exclut le sort lui-même.
- ***Chasse préparée*** : deux cibles (un allié, puis un ennemi). L'allié choisi gagne **+1/+1**, puis **combat** l'ennemi choisi.

#### L'IA et les sorts
L'IA ne joue un sort que s'il a une **cible valide** et utile (elle ne vise jamais ses propres créatures avec un effet nuisible), choisit une option A/B valide, et gère les sorts à deux cibles (*Lancer*, *Chasse préparée*).

#### Interface et messages d'erreur
Le client traduit les refus du serveur : `no-valid-target` (aucune cible valide), `target-required` (cible à désigner), `invalid-target` (cible invalide), `invalid-choice` (choix inexistant), `board-full` (plateau plein), `not-playable` (sort « quand piochée »), `cannot-pay-extra-cost` (coût supplémentaire impayable).

---

## 4. Les ressources : trois types de mana

1. **Mana normal** — gagné automatiquement chaque tour (sauf si votre Région le remplace ce tour-là, voir 3.4). Se réinitialise chaque tour. **Dépensé en premier.**
2. **Mana fragile** — obtenu via un effet ponctuel. Reste disponible tant qu'il n'est pas dépensé (ne se réinitialise pas, ne se perd pas en fin de tour). **Dépensé en second**, après le mana normal.
3. **Mana vide** — augmente le mana **maximum** du joueur, mais pas le mana disponible ce tour-ci. Se comporte ensuite comme du mana normal les tours suivants (fait partie du total rechargé chaque tour). **Dépensé en dernier** parmi les mana disponibles au moment de payer un coût, si un choix doit être fait. Cette règle générale s'applique aussi au mana vide donné par une Région (par exemple le Village kobold) : il n'est pas utilisable le tour où il est gagné.

> **Point à trancher :** Le mana vide, une fois gagné, augmente-t-il le max *pour toujours*, ou seulement le temps de la partie en cours (ce qui est de toute façon le cas, aucune persistance entre parties) ? Je pars du principe qu'il s'ajoute au maximum de façon permanente pour le reste de la partie.

---

## 5. Structure d'un tour

1. **Début de tour** (dans cet ordre)
   - Application de la règle de mana de la Région : si ses conditions sont remplies (tour personnel atteint, puis chance), ses effets remplacent le gain normal, sinon vous gagnez le mana normal (voir 3.4) ; puis déclenchement des capacités "Quand vous gagnez un point de mana".
   - Déclenchement des capacités "Au début de votre tour" (chaque capacité d'artefact qui se résout lui retire 1 charge, voir la section 8).
   - Les cooldowns des capacités activées diminuent de 1.
   - Pioche d'une carte.
   - Le mal d'invocation de vos créatures prend fin ; les statuts « a déjà attaqué » et « a déjà bloqué » sont réinitialisés. (Gel et Étourdissement ne se terminent pas ici : voir la section 6.)
   - *Tout premier tour du premier joueur :* il ne pioche pas, et seul le gain de mana de ce tour a lieu (voir 3.4) : ses capacités « Au début de votre tour » ne se déclenchent pas.

2. **Phase principale**
   - Jouer des cartes (Créatures, Sortilèges, Artefacts, Pièges) en payant leur coût.
   - Activer des capacités activées (mana + coût additionnel éventuel ; pour un artefact : « Utiliser », gratuit, 1 fois par tour, voir la section 8).
   - Déclenchement des capacités "Quand cette carte entre en jeu" (Début) à la pose.

3. **Phase de combat**
   - Chaque créature non étourdie, non gelée, sans Protecteur et n'ayant pas le mal d'invocation (sauf **Charge**) peut attaquer une fois.
   - **Résolution automatique** : si aucune de vos créatures ne peut attaquer (mal d'invocation sans Charge, gel, étourdissement, Protecteur, déjà attaqué, plateau vide), la phase de combat est sautée : l'interface ne propose plus que « Fin de tour ». Quand une créature peut attaquer, le bouton « Fin de tour » reste utilisable directement, sans passer par le combat. Après le combat (qu'il y ait eu une attaque ou que vous ayez choisi « Passer le combat »), vous revenez en phase principale : vous pouvez encore jouer des cartes avant de cliquer sur « Fin de tour ». Si une carte jouée rend une créature capable d'attaquer (Charge, par exemple) alors que le combat n'a pas été fait, le bouton « ⚔ Combat » réapparaît.
   - Voir Section 6 pour le détail du combat, et la Section 7 pour les règles complètes des créatures.

4. **Fin de tour** (dans cet ordre)
   - Déclenchement des capacités "À la fin de votre tour" (usure automatique des artefacts concernés, voir la section 8).
   - Les bonus de Force/Endurance « jusqu'à la fin du tour » arrivent à échéance, et les mots-clés accordés « ce tour-ci » disparaissent (voir 7.7).
   - Gel et Étourdissement qui arrivent à échéance prennent fin (voir la section 6).
   - Les créatures **Fugaces** de votre plateau meurent.
   - Les cartes temporaires restant en main sortent de la partie.

---

## 6. Le combat

**Séquence (telle que le moteur l'exécute) :**

1. **Déclaration des attaquants** — Une seule fois par tour, le joueur actif choisit, parmi ses créatures éligibles, lesquelles attaquent. Est éligible une créature ni gelée, ni étourdie, sans **Protecteur**, qui n'a pas déjà attaqué ce tour-ci et qui n'a pas le mal d'invocation (sauf **Charge**). Toutes les créatures déclarées attaquent le **héros adverse** par défaut (il n'y a pas de ciblage individuel de créature à la déclaration). Une fois la déclaration faite, même vide, on ne peut plus en refaire une ce tour-ci.
   - Si aucune créature n'attaque, la phase de combat est entièrement sautée : pas de déclencheurs, pas de blocage, on reste en phase principale.
2. **Déclenchement** — Pour chaque attaquant, dans l'ordre de la déclaration, la capacité "Quand cette créature attaque" (Assaut) se déclenche. Puis, une seule fois, les Pièges adverses « une créature ennemie attaque » peuvent se déclencher.
3. **Déclaration des bloqueurs** — Le défenseur désigne ses bloqueurs un par un (le blocage est limité à 45 secondes ; passé ce délai, il se termine avec les blocages déjà faits). Pour qu'un bloqueur soit accepté :
   - l'attaquant doit avoir été déclaré ce tour-ci et être toujours en jeu ;
   - le bloqueur ne doit être ni gelé, ni étourdi, ni **Peureux**, et ne doit pas avoir déjà bloqué ce tour-ci (un bloqueur ne bloque qu'**un seul** attaquant par tour) ;
   - l'attaquant ne doit pas être **Discret** ;
   - si l'attaquant a **Vol**, le bloqueur doit avoir **Vol** ou **Portée**.
   - Un attaquant peut être bloqué par **plusieurs** bloqueurs. Le mal d'invocation n'empêche pas de bloquer.
4. **Résolution des dégâts** — **Chaque combat est résolu immédiatement**, au moment où le bloqueur est assigné (il n'y a pas de résolution simultanée à la fin du blocage) :
   - Attaquant bloqué : l'attaquant et le bloqueur s'infligent mutuellement des dégâts égaux à leur Force. Avec plusieurs bloqueurs, l'attaquant inflige **toute** sa Force à **chaque** bloqueur, et chaque bloqueur inflige la sienne à l'attaquant : chaque bloqueur subit donc un combat complet.
   - **Initiative** : si une seule des deux créatures a Initiative, elle frappe en premier ; si sa cible survit, elle riposte, sinon elle ne subit aucun dégât en retour. Si les deux ou aucune n'ont Initiative, les coups sont simultanés.
   - **Brutalité** : un attaquant bloqué fait passer au héros adverse l'excédent de ses dégâts par rapport aux PV restants du ou des bloqueurs (avant le coup). Détails en 7.7.
   - **Vol de vie** : la créature qui inflige des dégâts (attaque ou blocage) soigne son propre héros d'autant.
   - **Toxique** : une créature à qui une créature Toxique inflige au moins 1 dégât au combat meurt (un coup absorbé par l'Armure ou de Force 0 n'a pas cet effet).
   - **Armure** : absorbe le premier dégât positif subi, quelle qu'en soit la source, une seule fois (voir 7.7).
5. **Fin du blocage** — Quand le défenseur termine son blocage, chaque attaquant resté non bloqué inflige toute sa Force au héros adverse (et déclenche « a infligé des blessures au héros »). Les excédents de Brutalité passent alors aussi au héros.
   - **Blessures directes automatiques** : si le défenseur n'a aucune créature capable de bloquer (aucun bloqueur légal pour les attaquants déclarés : gelées, étourdies, Peureux, déjà bloqué, Vol / Discret des attaquants), il n'y a pas d'attente de blocage : le moteur passe directement à cette étape et les attaquants non bloqués infligent leur Force au héros, avec les mêmes événements que si le défenseur avait passé.
   - **Fin automatique du blocage** : la phase de blocage se termine toute seule dès qu'il n'y a plus rien à bloquer — plus aucun attaquant en jeu, ou plus aucun bloqueur libre capable de bloquer un des attaquants restants (tous ont déjà bloqué, ou ne le peuvent pas). Le défenseur n'a pas à cliquer sur « Passer ». Un bloqueur libre peut encore bloquer un attaquant déjà bloqué (blocage multiple) : tant qu'il en existe un, la phase reste en attente. Côté interface (serveur plus ancien), le client envoie lui-même la fin du blocage, une seule fois, après les animations.
   - **Présentation (interface, sans effet sur les règles)** : au début de la partie, l'écran d'annonce dure 6 secondes et peut être passé d'un clic n'importe où ; un clic sur le nom d'un joueur ouvre son profil dans un nouvel onglet (pas de profil pour l'IA). Pendant le tour de l'IA, l'interface rejoue les actions dans l'ordre : cartes jouées et capacités d'abord, puis une courte pause, puis la désignation des attaquants et la phase de blocage.
6. **Résolution des morts** — Après chaque combat, toute créature dont l'Endurance courante est ≤ 0 meurt (voir 7.5) : Tenace, Finale et "Quand cette carte est détruite" selon le cas. "Quand cette carte élimine une créature" se déclenche chez la créature qui a mis sa cible à 0 PV **à condition qu'elle soit encore en vie à la fin de l'échange** (si les deux meurent, aucune des deux ne le déclenche).
7. **Fin du combat** — la partie revient en phase principale (le joueur actif peut encore jouer des cartes, mais ne peut plus attaquer ce tour-ci).

**Statuts temporaires** (infligés par des effets, pas des mots-clés intrinsèques) :
- **Gel** et **Étourdissement** : deux noms pour **le même effet**. La créature perd son prochain tour complet : tant que l'état dure, elle ne peut pas bloquer, pas attaquer, pas activer ses capacités (ses capacités qui se déclenchent toutes seules continuent de fonctionner). L'état disparaît à la **fin** du tour concerné, jamais au début :
  - posé sur une créature **pendant le tour de son adversaire** (le cas courant : vous gelez une créature ennemie pendant votre tour) : elle ne bloque plus pendant le reste de ce tour, elle n'attaque pas à son prochain tour, l'état se termine à la fin de ce prochain tour, et elle peut de nouveau bloquer ensuite ;
  - posé sur une créature **pendant le tour de son propre propriétaire** : l'état dure jusqu'à la fin de son **prochain** tour (elle ne bloque donc pas pendant le tour adverse intermédiaire, et n'attaque pas à son tour suivant) ;
  - un nouvel effet sur une créature déjà gelée ou étourdie ne raccourcit jamais l'état : l'échéance la plus lointaine est conservée.

**Mots-clés de combat** (résumé ; les règles complètes sont en 7.7) :

| Mot-clé | Effet |
|---|---|
| **Charge** | Peut attaquer le tour où elle arrive en jeu (ignore le mal d'invocation). |
| **Vol** | Ne peut être bloquée que par des créatures ayant Vol ou Portée. |
| **Portée** | Peut bloquer les créatures avec Vol sans avoir elle-même Vol. |
| **Brutalité** | Bloquée, elle fait passer au héros adverse l'excédent de ses dégâts par rapport aux PV restants du ou des bloqueurs. |
| **Vol de vie** | Les dégâts infligés par cette créature soignent son héros d'autant. |
| **Initiative** | Frappe avant son adversaire ; si elle élimine sa cible avec ce premier coup, elle ne subit aucun dégât en retour. |
| **Armure** | Absorbe le premier dégât positif qu'elle subit (combat, sort ou effet), une seule fois, sans jamais se réarmer. |
| **Parade** | Tant qu'elle a le mal d'invocation (jusqu'au début du prochain tour de son propriétaire), l'adversaire ne peut pas la cibler. |
| **Tenace** | Quand elle meurt, revient une fois à pleine Endurance (puis perd Tenace). |
| **Peureux** | Ne peut jamais bloquer. |
| **Protecteur** | Ne peut jamais attaquer. |
| **Toxique** | Toute créature à qui elle inflige des dégâts de combat meurt. |
| **Discret** | Ne peut pas être bloquée. |
| **Imparable** | Aucun piège ne se déclenche à cause d'un événement qui la concerne. |
| **Fugace** | Meurt à la fin du tour de son propriétaire. |

Trois étiquettes (**Assaut**, **Début**, **Final**) existent aussi sous forme de mots-clés, mais elles n'ont aucun effet de jeu (voir 7.7).

---

## 7. Les créatures

*Cette section décrit les créatures exactement comme le moteur de jeu (le serveur) les traite, d'après un relevé du code déployé au 6 octobre 2026. Quand le texte dit « le moteur », c'est ce comportement réel, pas une intention de design. Elle sert de référence unique ; les sections 3 et 6 n'en donnent que des résumés.*

### 7.1 Qu'est-ce qu'une créature ?

Il faut distinguer deux choses :

- **La carte du catalogue** : la « carte papier » créée dans l'éditeur. Elle porte un nom, un coût, une **Force** et une **Endurance** (ses PV), des mots-clés, des sous-types, des capacités, une classe, une rareté, éventuellement le super-type Légendaire, un visuel. Tant qu'elle est dans un deck, dans une main ou dans une défausse, c'est une carte : elle ne combat pas, elle ne peut pas être blessée.
- **La créature en jeu** : quand la carte arrive sur le plateau, le moteur en fabrique un **exemplaire vivant**, avec son propre identifiant et son propre état (PV restants, bonus reçus, états subis, mots-clés gagnés ou perdus…). Deux exemplaires d'une même carte sur le plateau sont deux créatures indépendantes : blesser l'une ne touche pas l'autre.

Une créature en jeu quitte le plateau par sa **mort** (elle va dans la défausse de son propriétaire), par un **renvoi en main**, par une **transformation** (elle est remplacée par une autre créature) ou par un **contrôle** (elle passe du côté de l'adversaire). Elle n'est jamais « la carte du catalogue » : ce qui lui arrive ne modifie pas le catalogue.

### 7.2 Statistiques

Une créature en jeu a trois niveaux de valeurs :

- **Valeurs de base** : la Force et l'Endurance imprimées sur la carte du catalogue.
- **Valeurs de référence** : base + bonus de Force/Endurance reçus. Elles servent de **plafond de soin** et de PV de retour pour Tenace.
- **Valeurs courantes** : ce qui compte vraiment en partie. La **Force courante** est ce que la créature inflige ; l'**Endurance courante** (ses PV restants) est ce qu'elle peut encore encaisser. Les dégâts baissent uniquement l'Endurance courante.

Comment les valeurs changent :

- **Bonus permanent** (+X Force / +Y Endurance) : s'ajoute à la fois à la référence et au courant, et reste tant que la créature est sur le plateau. Un malus (valeur négative) fonctionne de la même façon ; la Force ne descend jamais sous 0 ; une Endurance qui tombe à 0 ou moins tue la créature (l'Armure n'y change rien).
- **Bonus temporaire** : « jusqu'à la fin de ce tour » (il s'arrête à la fin du tour en cours) ou « jusqu'à la fin du prochain tour » (il s'arrête à la fin du tour suivant, quel qu'en soit le joueur : lancé pendant votre tour, il dure donc jusqu'à la fin du tour de l'adversaire). À l'échéance, Force et Endurance baissent d'autant ; l'Endurance courante baisse aussi, donc une créature blessée peut mourir à ce moment-là.
- **Aura** : bonus donné par une capacité continue d'une autre carte (« tant que cette carte est en jeu… »). Il s'ajoute aux valeurs **courantes** seulement. Le moteur retire puis recalcule toutes les auras à des moments précis (après qu'une carte est jouée, à la fin du blocage, au début d'un tour), pas instantanément après chaque événement : une aura peut donc rester un court instant après la disparition de sa source. Quand une aura disparaît, l'Endurance courante baisse d'autant (la créature peut mourir). Une aura d'Endurance ne relève pas le plafond de soin.
- **Soin** : l'Endurance courante devient le plus petit de (plafond, Endurance courante + soin). Un soin qui n'ajoute rien (créature déjà au plafond) ne déclenche rien.
- **Effets qui fixent ou déplacent des statistiques** : « Fixer une statistique » ne modifie que les valeurs courantes ; « Échanger Force et Endurance » échange la référence et le courant ; « Voler une statistique » met la statistique de la cible à 0 (une cible dont l'Endurance est volée meurt) et l'ajoute aux valeurs courantes du receveur ; « Évolution » ajoute ses bonus aux valeurs courantes.
- **Mort** : dès que l'Endurance courante est **0 ou moins**, la créature meurt (voir 7.5). Le moteur vérifie cela après chaque combat et après chaque effet.

### 7.3 Limites

| Zone | Limite | Quand elle est dépassée |
|---|---|---|
| **Plateau** | **8 créatures** par joueur | On ne peut pas jouer une créature depuis la main (la carte reste en main, aucun mana n'est dépensé). Pour une créature créée par un effet : les copies de soi s'arrêtent à la 8e ; une carte **conjurée** « directement en jeu » (par un sort ou une Région) est **perdue** : ni main ni défausse (voir 3.5) ; une carte **récupérée** « directement en jeu » va en main à la place (ou en défausse si la main est pleine) ; une copie de créature, un renvoi en jeu ou un contrôle (vol) n'ont pas lieu. |
| **Main** | **8 cartes** | Toute carte qui arrive en main au-delà est **défaussée** : carte piochée (elle est perdue, sans déclencher « quand vous piochez »), carte renvoyée en main, carte volée, copiée, conjurée, récupérée depuis le deck. **Cas particulier** : une récupération depuis la **défausse** vers une main pleine n'a pas lieu, la carte reste dans la défausse. Chaque joueur commence avec 4 cartes en main. |
| **Deck** | **30 cartes** exactement (hors Héros et Région) | **2 exemplaires** maximum d'une même carte, **1 seul** si elle porte le super-type Légendaire. Le serveur vérifie la taille et le nombre d'exemplaires au lancement d'une partie et la refuse sinon. |

### 7.4 Jetons et invocations

Le jeu n'a pas de type « jeton » : toute créature créée par un effet est une créature ordinaire, issue d'une carte du catalogue (ou d'une créature déjà en jeu). Les effets qui créent une créature sont :

- **Invoquer des copies de cette carte** : chaque copie reprend les valeurs de référence actuelles de la créature d'origine (bonus permanents compris), sans dégâts ni états ;
- **Conjuration** et **Récupération** avec la destination « directement en jeu » (la variante « en jeu et attaquante » de la Conjuration ajoute la créature aux attaquants du tour, sans mal d'invocation et sans déclencher d'Assaut) ;
- **Copie** d'une créature ciblée ;
- **Transformation** et **Évolution** avec transformation (la créature d'origine est remplacée) ;
- **Renvoi en jeu d'une créature détruite le tour dernier**.

Règles communes à toutes ces créatures :

- elles arrivent **sans payer de coût**, avec Force et Endurance courantes égales à leur référence ;
- elles ont le **mal d'invocation**, sauf si elles ont **Charge** (dans ce cas elles ne l'ont pas du tout, et donc pas non plus la protection de Parade) ;
- elles déclenchent « Quand une créature arrive en jeu (quelle que soit la source) » et « Quand vous invoquez une créature du sous-type X » ;
- elles **ne déclenchent pas** leur propre capacité « Début » (« quand cette carte entre en jeu » ne concerne que la carte jouée depuis la main), ni « Quand une créature est jouée (depuis la main) », ni les Pièges de l'adversaire « l'adversaire invoque une créature » ou « joue une carte », ni les bonus « chaque créature jouée ce tour-ci » ;
- exception : les copies créées par « Invoquer des copies de cette carte » ne déclenchent **aucun** effet d'arrivée, pas même « quand une créature arrive en jeu ».

### 7.5 Cycle de vie d'une créature

#### Étape 1 : dans la main

Une créature en main est une carte (voir 7.1). Elle reste en main tant qu'elle n'est pas jouée ; elle n'en sort que par le jeu, une défausse, un vol de carte ou la fin de la partie. Les capacités « Quand cette carte est piochée » s'appliquent à elle dès la pioche.

#### Étape 2 : être jouée

Pour jouer une créature depuis la main, il faut que ce soit votre phase principale, que vous ayez assez de mana (coût réduit ou augmenté par les effets en cours, jamais en dessous de 0), qu'il reste de la place sur le plateau (moins de 8 créatures), que le coût additionnel éventuel puisse être payé, et que la cible éventuellement désignée pour la capacité « Début » soit valable (une cible refusée annule la pose). Le moteur paie alors le coût additionnel (sacrifice, défausse, PV), puis le mana (le mana normal d'abord, le mana fragile ensuite), et la carte quitte la main.

#### Étape 3 : l'arrivée, dans l'ordre exact

1. Les **Pièges** de l'adversaire « l'adversaire invoque une créature » puis « l'adversaire joue une carte » peuvent se déclencher (du plus ancien au plus récent). Si l'un d'eux **contre** la carte, la créature va directement en défausse et n'arrive jamais en jeu (le mana et le coût additionnel sont perdus). Une créature **Imparable** ne déclenche aucun piège.
2. La créature entre sur le plateau, **à la suite des autres** (l'ordre du plateau compte pour l'ordre des déclencheurs). Elle a le **mal d'invocation**, même avec Charge.
3. Les bonus « chaque créature jouée ce tour-ci » en attente s'appliquent (bonus permanents).
4. Les effets « sur la prochaine carte jouée » en attente s'appliquent.
5. Les capacités « Quand une créature est jouée (depuis la main) » se déclenchent, chez les deux joueurs (selon que chaque capacité surveille ses créatures alliées ou ennemies).
6. Les capacités « Quand une créature arrive en jeu » se déclenchent, chez les deux joueurs, puis « Quand vous invoquez une créature du sous-type X » chez son propriétaire (ses créatures en jeu, y compris la nouvelle, puis son héros, sa région, ses artefacts, ses Pièges armés).
7. La capacité « **Début** » de la créature elle-même se résout (avec les cibles choisies à la pose).
8. Les créatures mortes en chemin sont retirées, puis les **auras** sont recalculées : la nouvelle créature ne reçoit donc ses bonus d'aura qu'**après** tous ces déclencheurs.

Quand plusieurs cartes réagissent au même événement, le moteur ne laisse **pas** le joueur choisir l'ordre : pour les capacités qui surveillent les deux camps, il traite d'abord le **joueur n°1** de la partie, puis le joueur n°2 ; pour un joueur donné, ses créatures dans l'ordre de son plateau, puis son héros, sa région, ses artefacts et ses Pièges armés.

#### Étape 4 : sur le plateau

La créature peut attaquer (section 6), bloquer, activer ses capacités et subir des effets. Les compteurs suivants sont tenus : « a déjà attaqué » (remis à zéro au début du tour de son propriétaire), « a déjà bloqué » (remis à zéro au début du tour de son propriétaire, ce qui limite un bloqueur à un seul attaquant par tour de l'adversaire), « mal d'invocation » (voir 7.6).

#### Étape 5 : la mort

Le moteur contrôle les morts après chaque combat et chaque effet, pour les deux joueurs (le joueur n°1 d'abord). Pour chaque créature dont l'Endurance courante est ≤ 0 :

1. **Si elle a Tenace**, elle ne meurt pas : voir « Résurrection » ci-dessous.
2. Sinon, elle **quitte le plateau** et va dans la **défausse** de son propriétaire, remise en ordre : les bonus temporaires, les mots-clés d'aura et temporaires et les états (Gel, Étourdissement, mal d'invocation, Armure utilisée) sont effacés, et ses PV sont remis au plafond. Ses **bonus permanents**, son éventuel **Silence** et les mots-clés qu'elle avait perdus (Tenace consommée comprise) restent sur la carte en défausse.
3. Si elle attaquait avec **Brutalité**, l'excédent est infligé au héros adverse **avant** ses déclencheurs de mort.
4. Les déclencheurs se résolvent, dans cet ordre pour chaque morte : « **Finale** » (quand cette créature meurt), « quand cette carte est détruite » (le moteur les traite exactement de la même façon : une carte qui a les deux les déclenche les deux), puis « quand une carte meurt » chez toutes les cartes qui surveillent les morts.

Cela vaut pour toutes les causes de mort : dégâts, Destruction, sacrifice (effet ou coût additionnel), mort Fugace, malus d'Endurance, disparition d'une aura… Parmi ces causes, seuls les dégâts peuvent être absorbés par l'Armure (voir 7.7). Quand plusieurs créatures meurent en même temps, elles sont toutes retirées du plateau d'abord, les Tenaces reviennent (« Quand cette carte revient du cimetière » se déclenche), puis les Finales se résolvent créature par créature.

#### Résurrection (Tenace)

Une créature Tenace dont l'Endurance courante tombe à 0 ou moins ne quitte pas le plateau : elle perd Tenace, son Endurance courante est remise à son plafond (Endurance de référence), et elle garde sa place, ses bonus, ses états et son Armure déjà utilisée. Ce n'est pas une mort : ni « Finale » ni « est détruite » ne se déclenchent, la créature n'est pas comptée comme morte ce tour-ci ; c'est « Quand cette carte revient du cimetière » qui se déclenche. Tenace n'agit qu'une fois. Elle ne protège de rien d'autre que d'une Endurance à 0 : elle sauve aussi d'une Destruction ou d'un sacrifice, et même d'un Fugace (la créature survit une fois à la fin du tour).

#### Retour depuis la défausse

Quand un effet récupère une créature depuis la défausse (en main ou en jeu), c'est la carte **telle qu'elle est morte** : bonus permanents, Silence et mots-clés perdus compris. Elle repart avec ses PV au plafond, sans état, sans bonus temporaire ni d'aura. « Renvoyer en jeu une créature détruite le tour dernier » (créatures mortes depuis le début de votre tour précédent) la remet en jeu d'après son état au moment de sa mort.

#### Autres sorties du plateau

- **Retour en main** : voir 7.10. Pas de mort, pas de Finale.
- **Contrôle** : voir 7.10.

### 7.6 États

| État | Il commence | Il se termine | Effet |
|---|---|---|---|
| **Mal d'invocation** | À l'arrivée de la créature (jouée depuis la main : toujours ; créée par un effet : sauf si elle a Charge) | Au **début du prochain tour de son propriétaire**, après ses capacités de début de tour et sa pioche | Ne peut pas attaquer (sauf **Charge**). N'empêche **ni de bloquer, ni d'activer ses capacités**. Active la protection de **Parade**. |
| **Gel** / **Étourdissement** | Quand un effet les pose | À la **fin** du tour concerné (voir 6) | Ne peut ni bloquer, ni attaquer, ni activer ses capacités. |
| **Silence** | Quand un effet le pose | Jamais : ne disparaît que si la créature quitte le plateau | Voir ci-dessous. |

**Gel et Étourdissement** sont **un seul et même état** : seule l'étiquette change. Leurs durées exactes sont décrites en section 6.

**Silence.** Le Silence **retire tous les mots-clés et toutes les capacités** de la créature : mots-clés de la carte, mots-clés temporaires, capacités (y compris continues, donc plus d'aura émise), effet « Début », effet d'arrivée et doublements de déclencheurs. Il **ne modifie ni ses PV ni sa Force** : pas de soin, et les dégâts subis, les bonus (Évolution, « fixer une statistique », « voler une statistique », renforcements) et les malus sont conservés. L'Armure déjà utilisée et les états (Gel…) ne sont pas touchés.
- Le Silence dure **tant que la créature est en jeu** ; une créature silencée qui meurt reste silencée en défausse (et si elle est récupérée depuis la défausse, elle le reste).
- Une créature silencée **continue de bénéficier des auras des autres cartes** (bonus de stats et mots-clés d'aura, recalculés normalement) ; en revanche elle n'émet plus aucune aura, puisqu'elle n'a plus de capacité.
- Une créature silencée qui est **renvoyée en main** redevient une carte neuve, normale.
- L'ancien réglage de l'éditeur (« capacités », « bonus de stats », « les deux ») n'a plus d'effet côté moteur : les trois, et l'absence de réglage, font la même chose (retirer mots-clés et capacités, ne pas toucher aux statistiques).

### 7.7 Les mots-clés

Il y a 15 mots-clés de jeu et 3 étiquettes sans effet. Chacun n'a qu'**un seul nom officiel** (la « clé » entre parenthèses est le nom interne utilisé par l'éditeur et le moteur). Une créature peut en cumuler plusieurs.

**D'où viennent les mots-clés d'une créature ?** De la carte elle-même ; d'un octroi permanent ; d'un octroi **temporaire** (« ce tour-ci », voir ci-dessous) ; d'une aura (tant que sa source est en jeu) ; des effets « Amélioration » (un mot-clé aléatoire parmi Charge, Vol, Portée, Brutalité, Vol de vie, Initiative, Armure, Parade, Tenace, Toxique, Discret, Imparable, que la créature n'a pas déjà) et « Choix parmi 3 mots-clés » (3 mots-clés tirés parmi Charge, Vol, Portée, Brutalité, Vol de vie, Initiative, Armure, Parade, Tenace, Peureux, Protecteur, Toxique, que la créature n'a pas déjà). L'effet « Retire un mot-clé » le retire quelle que soit son origine (un mot-clé d'aura peut revenir au recalcul suivant).

**Mots-clés temporaires.** Un mot-clé accordé « ce tour-ci » est retiré à la **fin du tour courant** (que ce soit le tour de son propriétaire ou celui de l'adversaire : il ne dure donc pas pendant le tour adverse suivant). Une créature qui possède déjà le mot-clé (de naissance ou par un octroi permanent) ne le perd pas : seul un mot-clé réellement ajouté par l'effet temporaire est retiré.

**Charge** (`charge`) — La créature peut attaquer le tour où elle arrive en jeu. Elle a quand même le mal d'invocation (et donc la protection de Parade, si elle l'a) : Charge ne fait que l'autoriser à attaquer. L'IA en tient compte. Voir 7.4 pour les créatures créées par un effet.

**Vol** (`flying`) — Une créature avec Vol ne peut être bloquée que par une créature qui a **Vol** ou **Portée**. Vol ne limite pas les créatures qu'elle-même peut bloquer.

**Portée** (`reach`) — La créature peut bloquer une créature avec Vol sans avoir elle-même Vol.

**Brutalité** (`pierce`) — Ne joue que quand la créature **attaque** et est **bloquée**. Le moteur retient, pour chaque bloqueur, ses **PV restants avant le coup** (au plus 1 par bloqueur si l'attaquante est aussi Toxique). L'**excédent** = Force de l'attaquante − somme de ces PV ; s'il est positif, il est infligé au héros adverse. Il est infligé à la fin du blocage si l'attaquante est toujours en jeu, ou immédiatement à sa mort si elle est morte au combat (avant ses déclencheurs de mort). Si l'Armure d'un bloqueur absorbe le coup, ce bloqueur n'entre pas dans le calcul : s'il est le seul bloqueur, aucun excédent ne passe. L'excédent est un dégât ordinaire au héros ; il ne déclenche pas Vol de vie. Un attaquant non bloqué inflige de toute façon toute sa Force au héros.

**Vol de vie** (`lifesteal`) — Chaque fois que la créature inflige des dégâts au combat à une créature (coup non absorbé), son propriétaire soigne son héros du **montant des dégâts infligés** (pas seulement des PV réellement retirés). Une attaquante non bloquée soigne son héros de sa Force. Aucun effet pour les dégâts de sorts et d'effets, ni pour un « Combat forcé ». Un héros à qui un effet interdit de se soigner ne gagne rien.

**Initiative** (`initiative`) — Au combat, si **une seule** des deux créatures a Initiative, elle frappe d'abord ; si sa cible a encore des PV après ce coup elle riposte, sinon elle ne subit **aucun** dégât. Si les deux ou aucune n'ont Initiative, les coups sont simultanés. Si le premier coup est absorbé par l'Armure, la cible survit et riposte normalement. Vaut pour l'attaquante comme pour la bloqueuse, combat par combat.

**Armure** (`armor`) — Absorbe le **premier dégât positif** subi, **quelle qu'en soit la source** : combat, sort, jet de pièce, « Combat forcé », second coup de « Détruit la cible puis inflige sa Force ». Le coup est entièrement annulé : aucune perte de PV, pas de déclencheur « subit des dégâts », pas d'effet de Toxique ni de Vol de vie de l'adversaire pour ce coup. Elle ne sert qu'**une seule fois** : une fois utilisée, elle ne se réarme jamais tant que la créature reste en jeu (même si Tenace la ramène, même si elle perd puis regagne le mot-clé). Un coup de Force 0 ne la consomme pas. L'Armure **n'arrête pas** : la Destruction, le sacrifice, la mort Fugace, les malus d'Endurance, « fixer une statistique », « voler une statistique », l'échange Force/Endurance, la disparition d'une aura, l'expiration d'un bonus temporaire, le Gel/Étourdissement, le Silence ni le renvoi en main.

**Parade** (`stealth`) — Tant que la créature a le mal d'invocation (de son arrivée **jusqu'au début du prochain tour de son propriétaire**), l'**adversaire** ne peut pas la cibler : ni en la désignant, ni par ciblage automatique ou aléatoire, ni par un effet de zone (elle est simplement exclue de ses cibles possibles : sorts, capacités, pouvoirs de héros, Pièges). Les effets de son **propriétaire** peuvent la cibler. Elle peut attaquer (avec Charge), bloquer et combattre normalement. Remarque : un effet qui vise « la créature qui a déclenché l'événement » (par exemple celle qui vient de bloquer) ne vérifie pas la Parade.

**Tenace** (`relentless`) — Voir « Résurrection » en 7.5 : une fois, au lieu de mourir, la créature reste en jeu à pleine Endurance et perd Tenace.

**Peureux** (`fearful`) — La créature ne peut jamais être désignée comme bloqueur (l'IA ne la désigne jamais non plus).

**Protecteur** (`protecteur`) — La créature ne peut jamais attaquer, même avec Charge. Elle peut bloquer et activer ses capacités. Sans rapport avec l'ancien mot-clé « Protection » (voir 7.11).

**Toxique** (`toxic`) — Quand la créature inflige au moins 1 dégât de combat à une autre créature, celle-ci meurt, quels que soient ses PV restants. Un coup absorbé par l'Armure ne tue pas. Ne vaut pas pour les héros, ni pour les sorts, ni pour un « Combat forcé ».

**Discret** (`discret`) — La créature ne peut pas être bloquée.

**Imparable** (`imparable`) — Aucun piège (de n'importe quel joueur) ne se déclenche à cause d'un événement qui concerne cette créature : son invocation (donc ni « l'adversaire invoque une créature » ni « l'adversaire joue une carte »), le fait qu'elle soit **ciblée**, **bloquée**, qu'elle **combatte** ou qu'elle **survive à un combat**. Attention : la déclaration d'attaque (« une créature ennemie attaque ») ne désigne aucune créature en particulier, et les Pièges qui s'y déclenchent ne sont donc pas empêchés par Imparable.

**Fugace** (`fugace`) — La créature meurt à la **fin du tour de son propriétaire** (après ses déclencheurs de fin de tour et l'expiration de ses bonus temporaires). Elle compte comme morte ; sa Finale se déclenche. Seule Tenace peut la sauver une fois.

**Étiquettes sans effet de jeu** : **Assaut** (`assault`), **Début** (`debut`), **Final** (`final`). Ces trois mots-clés ne font rien par eux-mêmes ; ils servent de marqueur pour qu'une autre carte puisse repérer ce type de carte (filtres de Conjuration, de Récupération, de Révélation…). Ne pas les confondre avec les noms courts de déclencheurs **Début** (quand la carte entre en jeu), **Assaut** (quand la créature attaque) et **Finale** (quand elle meurt), qui s'affichent sur les cartes.

### 7.8 Combat des créatures

La séquence générale (déclaration, blocage, résolution) est décrite en section 6. Voici les règles précises qui s'y ajoutent.

**Pour chaque bloqueur assigné, dans cet ordre :**
1. l'attaquant est marqué « bloqué » et le bloqueur « a bloqué » ;
2. les Pièges du joueur attaquant « une créature alliée est bloquée » peuvent se déclencher ;
3. les capacités « Quand cette créature a été bloquée » (de l'attaquant) puis « Quand cette créature a bloqué » (du bloqueur) se déclenchent ;
4. les Pièges « avant qu'une créature alliée ne combatte » peuvent se déclencher (d'abord pour l'attaquant, puis pour le bloqueur) ;
5. l'échange de dégâts a lieu (Initiative, Armure, Toxique, Vol de vie, Brutalité : voir 7.7) ;
6. « Quand cette carte subit des dégâts » se déclenche pour chaque créature qui a perdu des PV **et survit** ;
7. « Quand cette carte élimine une créature » se déclenche pour chaque créature qui a mis sa cible à 0 PV **et qui est encore en vie après l'échange** (même si la victime revient grâce à Tenace) ;
8. les morts sont résolues tout de suite (7.5). Si l'attaquant est mort, il ne peut plus recevoir de bloqueur.

**Plusieurs bloqueurs sur un attaquant** : les étapes ci-dessus se répètent pour chaque bloqueur, l'un après l'autre. L'attaquant inflige toute sa Force à chacun ; il subit les dégâts de chacun, et peut donc mourir avant d'avoir « affronté » tous les bloqueurs (les suivants ne peuvent alors plus être assignés).

**À la fin du blocage** : dans l'ordre de la déclaration, chaque attaquant resté non bloqué inflige sa Force au héros adverse, puis se déclenche « Quand cette créature a infligé des blessures au héros adverse » et son Vol de vie ; ensuite viennent les excédents de Brutalité ; puis les Pièges « une créature alliée / ennemie survit à un combat » ; puis les morts ; enfin le recalcul des auras.

**Dégâts amplifiés.** Certains effets augmentent les dégâts de combat entre créatures (« Augmente les dégâts de votre camp ») : ce bonus s'applique aux coups entre créatures, pas aux dégâts infligés au héros.

**Combat forcé (effet).** Les deux créatures s'infligent mutuellement leur Force actuelle, en même temps. Seule l'**Armure** compte : ni Initiative, ni Toxique, ni Vol de vie, ni Brutalité, ni Pièges de combat, ni « subit des dégâts ». « Élimine une créature » se déclenche chez la créature qui a tué l'autre en survivant.

**Dégâts d'un sort ou d'un effet.** Ils passent par l'Armure ; « Quand cette carte subit des dégâts » se déclenche même si le coup est fatal (contrairement au combat, où il ne se déclenche que si la créature survit) ; « élimine une créature » ne se déclenche pas.

**Ordre de jeu de l'IA.** L'IA attaque avec toutes ses créatures éligibles, et désigne **au plus un** bloqueur par attaquant. Elle ne déclenche pas elle-même les capacités activées de ses créatures, mais elle utilise ses artefacts (1 fois par tour chacun, voir 8.7).

### 7.9 Capacités et déclencheurs d'une créature

Une capacité se lit « déclencheur → conditions → effet » (voir section 9). Pour une créature en jeu, voici quand chaque déclencheur se produit exactement :

| Déclencheur | Se produit… |
|---|---|
| **Début** (entre en jeu) | Quand la carte est **jouée depuis la main** (7.5, étape 3). Pas pour une créature créée par un effet. |
| **Assaut** (attaque) | Quand elle est déclarée attaquante (dans l'ordre de la déclaration). |
| Est bloquée / a bloqué | À chaque bloqueur assigné, avant l'échange de dégâts. |
| A infligé des blessures au héros adverse | À la fin du blocage, pour chaque attaquant non bloqué. |
| Subit des dégâts | Combat : seulement si elle survit. Sort ou effet de dégâts : à chaque dégât non absorbé, même fatal (sauf jet de pièce et « Combat forcé », qui ne le déclenchent pas). Jamais si l'Armure absorbe. |
| Est soignée | Seulement si le soin lui a réellement rendu des PV. |
| **Finale** (meurt) et « est détruite » | À la mort (7.5, étape 5). Identiques pour le moteur. Pas en cas de résurrection par Tenace. |
| Élimine une créature | Voir 7.8 (combat, ou Combat forcé) : le tueur doit être encore en vie. |
| Revient du cimetière | À la résurrection par Tenace. |
| Est désignée | Quand elle est ciblée par l'un de ces effets : Dégâts, Soin, Étourdissement/Gel, Renvoi en main, Destruction, Silence, Renforcement/Affaiblissement, Octroi de mot-clé, Choix de mot-clé. Un sort de zone désigne chaque créature touchée, une par une ; un artefact visé par l'un de ces effets est lui aussi « désigné ». Les effets Fixer une statistique, Vol, Transformation et Combat forcé ne comptent pas comme une désignation, pas plus que *Lancer* ni un héros visé. |
| Début / fin de votre tour | Dans l'ordre : vos créatures (ordre du plateau), votre héros, votre région, vos artefacts (chaque capacité d'artefact résolue lui retire 1 charge, voir 8.4), vos Pièges armés. |
| Quand une carte… (surveillance du plateau) | Voir 7.5 pour l'arrivée et la mort ; ces capacités surveillent les deux camps, le joueur n°1 d'abord. |

**Capacités activées.** Un clic du joueur, pendant sa phase principale, tant que la créature n'est pas gelée ni étourdie (le mal d'invocation n'empêche **pas** d'activer). Il faut payer le coût de mana indiqué (réductible par des effets, jamais en dessous de 0), le coût additionnel éventuel, et que le **cooldown** soit écoulé : à chaque utilisation, un compteur est posé ; il baisse de 1 au début de chaque tour de son propriétaire, et la capacité est de nouveau utilisable quand il atteint 0. Avec un cooldown de 0 la capacité peut être utilisée plusieurs fois dans le même tour.

**Plusieurs déclencheurs sur une même capacité** fonctionnent en **OU** : l'un d'eux suffit, une seule fois.

### 7.10 Copies et transformations

- **Retour en main (renvoi)** : la créature quitte le plateau **sans mourir** (pas de Finale) et revient en main sous la forme d'une **carte neuve, comme dans le catalogue** : sa rareté, son super-type Légendaire et son visuel sont conservés ; les bonus, le Silence, les mots-clés gagnés ou perdus, les dégâts et les états sont effacés. Si la main est pleine (8), la carte va en défausse. Si la carte est introuvable dans le catalogue, le moteur se rabat sur les valeurs actuelles de la créature.
- **Contrôle (vol de créature)** : la créature passe sur le plateau de l'adversaire de son propriétaire (il faut qu'il y ait de la place). C'est la **même** créature : elle garde bonus, dégâts, mots-clés, Silence et Armure utilisée. Le mal d'invocation lui est **remis**, même si elle a Charge (donc la Parade s'applique de nouveau) ; ses statuts « a attaqué » et « a bloqué » sont remis à zéro. Elle ne déclenche aucun effet d'arrivée. Attention : le code teste « mal d'invocation **ou** Charge » pour autoriser l'attaque : une créature volée qui a Charge **peut donc quand même attaquer** tout de suite.
- **Copie** : copie une carte ou une créature vers le deck, la main ou le plateau. La copie reprend les valeurs de **référence** actuelles, les mots-clés et les capacités actuels (Silence compris), sans dégâts ni états. Sur le plateau, elle suit les règles de 7.4.
- **Invocation de copies de soi** : voir 7.4.
- **Transformation** : la créature est **remplacée** par une carte neuve du catalogue (précise, ou tirée au hasard) : plus aucun bonus ni état. La nouvelle créature se place à la fin du plateau, arrive selon les règles de 7.4 (mal d'invocation sauf Charge, pas de « Début »).
- **Évolution** : peut transformer la créature (comme ci-dessus), puis ajouter un bonus de Force/Endurance (valeurs courantes) et/ou un mot-clé.

### 7.11 Glossaire et anciens noms

| Nom actuel | Ancien nom ou usage | Remarque |
|---|---|---|
| **Vol** | Envol | Le mot-clé s'est brièvement appelé Envol avant de redevenir Vol. |
| **Brutalité** | Perçant | |
| **Parade** | Furtif | L'ancien Furtif visait seulement les sorts et durait jusqu'à la première attaque ; Parade vise tout ciblage adverse et dure jusqu'à la fin du mal d'invocation. |
| **Tenace** | « Implacable » | |
| **Mal d'invocation** | « Fatigue d'invocation », « maladie d'invocation » | Règle automatique, pas un mot-clé. |
| *(retiré)* | **Protection** (« ne peut pas être ciblée jusqu'au prochain tour ») | N'existe plus. À ne pas confondre avec **Protecteur** (« ne peut pas attaquer »), qui n'a aucun rapport. |
| **Assaut**, **Début**, **Final** | « Assault » (orthographe anglaise visible dans l'éditeur) | Étiquettes sans effet de jeu (7.7). |
| **Gel**, **Étourdissement** | | Même effet, deux noms. |
| **Endurance** | PV d'une créature | Les PV du Héros s'appellent « PV ». |
| **Rareté** | Basique, Commune, Rare, Épique, Mythique | **Légendaire** est un super-type distinct. |

---

## 8. Les artefacts

*Cette section décrit les artefacts tels que les règles validées les définissent (état d'octobre 2026). Le moteur de jeu (le serveur) est modifié en parallèle pour appliquer les points marqués « nouveau » ; tant que ce n'est pas déployé, le comportement réel peut encore différer. Les points qui ne sont pas tranchés sont regroupés en 8.8.*

### 8.1 Qu'est-ce qu'un artefact ?

Comme pour les créatures (voir 7.1), il faut distinguer la **carte** du catalogue (dans un deck, une main ou une défausse) et l'**artefact en jeu**, un exemplaire vivant avec son propre identifiant et son propre état.

Un artefact n'a ni Force ni Endurance : il ne combat pas, ne bloque pas, n'attaque pas, et n'a pas de **mal d'invocation**. Sa seule statistique est son nombre de **charges**, appelé **Usure** dans l'éditeur (de 1 à 10) et **« utilisation »** dans certains textes de cartes. Les charges se lisent sur la pastille de la carte (par exemple « 3x »). Chaque charge représente une utilisation ou un déclenchement avant que l'artefact ne disparaisse (voir 8.5).

Ne pas confondre ces **charges** avec le mot-clé de créature **Charge** (voir 7.7) : ils n'ont aucun rapport.

Un artefact en jeu peut être la cible d'effets (par exemple « détruisez un artefact ennemi ») ; une capacité peut aussi modifier ses charges (voir 8.8).

### 8.2 Emplacements (limite)

- Chaque joueur dispose de **2 emplacements d'artefact**, donc **2 artefacts en jeu au maximum**.
- Si les 2 emplacements sont pris, un 3e artefact **ne peut pas être joué** : la carte est refusée (le serveur répond `artifact-slots-full`, et le client affiche « Vos 2 emplacements d'artefact sont pleins. »).
- **Débordement par un effet** : si un effet crée ou copie un artefact alors que les 2 emplacements sont pris, l'artefact créé est **perdu** et rien d'autre ne se passe.

### 8.3 Jouer un artefact

Pour jouer un artefact depuis la main, il faut que ce soit votre **phase principale**, que vous ayez assez de **mana** (le coût de mana est payé **uniquement à la pose**), que le **coût additionnel** éventuel (voir 3.2) puisse être payé et qu'un emplacement soit libre. Il arrive alors en jeu avec toutes ses charges ; sa capacité « Début » (quand la carte entre en jeu) se résout. Les Pièges adverses « l'adversaire joue une carte » peuvent se déclencher à la pose et la contrer (voir 3.1).

### 8.4 Les deux façons dont un artefact agit

Un artefact peut avoir une capacité de chaque famille, les deux, ou aucune.

**a) La capacité « Utiliser : … » (capacité activée, déclenchée par vous).** Règles :

- **Gratuite** : elle ne coûte aucun mana. Le coût de mana n'est payé qu'à la pose (8.3).
- **1 fois par tour et par artefact**, pendant la **phase principale du tour de son propriétaire**. Une deuxième tentative dans le même tour est refusée (`already-activated-this-turn`).
- **Utilisable dès le tour où il est posé** (pas de mal d'invocation).
- Chaque utilisation **consomme 1 charge**.
- Il n'y a pas de cooldown : la limite « 1 fois par tour » en tient lieu (le cooldown décrit en 7.9 ne concerne que les créatures).
- **Utilisation sans cible valide (nouveau)** : si l'effet exige une cible **choisie** et qu'aucune cible valide n'existe, l'utilisation est **refusée** (code serveur `no-valid-target`, message « Aucune cible valide : l'artefact n'est pas utilisé. »). Aucune charge n'est perdue et l'artefact reste utilisable ce tour-ci.
- Côté interface, l'artefact n'est grisé « déjà utilisé ce tour-ci » que si le serveur a accepté l'utilisation ; une action refusée ne le grise pas.

**b) Les effets passifs (capacités déclenchées automatiquement).** Ce sont les capacités qui se déclenchent toutes seules : « au début / à la fin de votre tour », « quand vous piochez une carte », « quand une créature ennemie attaque », « quand vous gagnez un point de mana », les surveillances du plateau, etc. (voir 9).

**Usure automatique (nouveau).** Chaque fois qu'une de ces capacités déclenchées **se résout réellement**, l'artefact **perd 1 charge**. Ne comptent **pas** :

- la capacité « Utiliser » (elle a sa propre charge, voir ci-dessus) ;
- l'arrivée en jeu (« Début ») ;
- « Quand je suis détruit ».

L'effet « retirez 1 utilisation » n'est donc plus nécessaire dans le texte des cartes pour représenter l'usure (il reste disponible dans l'éditeur et le moteur pour d'autres usages, voir 8.8).

**Exemple : Pacte avec Aileblanche.** Il ne perd plus de charge à chaque début de tour. Il s'use uniquement quand il se déclenche, c'est-à-dire à chaque attaque adverse qui l'active.

### 8.5 Charges et destruction

Un artefact est **détruit** dans deux cas (nouveau) :

1. un effet le **détruit** directement ;
2. sa **dernière charge disparaît**, que ce soit par une utilisation, par l'usure automatique ou par un effet qui retire des charges.

Quand il est détruit, son « **Quand je suis détruit** » se déclenche, puis il va dans la **défausse (cimetière)** de son **propriétaire**, libérant l'emplacement.

Un artefact n'est **pas** considéré comme détruit s'il est simplement **renvoyé en main**, **transformé** ou **remplacé** : son « Quand je suis détruit » ne se déclenche pas.

### 8.6 Ordre des déclencheurs

Pour un joueur donné, quand plusieurs cartes réagissent au même événement, ses artefacts se résolvent après ses créatures, son héros et sa région, et avant ses Pièges armés (voir 7.5, étape 3, et le point 3 de la section 11). Le joueur ne choisit pas l'ordre. Pour les capacités qui surveillent les deux camps, le joueur n°1 de la partie est traité avant le joueur n°2.

### 8.7 L'adversaire contrôlé par l'IA (nouveau)

L'IA utilise désormais ses artefacts, **1 fois par tour chacun**, selon les mêmes règles que le joueur (gratuit, phase principale, 1 charge par utilisation, refus si aucune cible valide).

### 8.8 Ce qui n'est pas tranché ou reste tel quel

- **Ordre à la dernière charge (tranché dans le moteur)** : l'effet de l'artefact se résout **complètement** ; ensuite la charge est retirée ; si elle tombe à 0, l'artefact quitte le jeu pour le cimetière, puis son « Quand je suis détruit » se résout (une seule fois). Exemple : le Tombeau de la maudite pioche d'abord, puis inflige X dégâts, X étant le nombre de cartes en main à ce moment-là. L'ordre entre « Quand je suis détruit » et les réactions d'**autres** cartes à la même destruction n'est pas précisé.
- **Déclenchement « réel » (tranché dans le moteur)** : l'usure automatique n'a lieu que si au moins un effet de la capacité a **vraiment été appliqué**. Une condition qui échoue, ou une cible aléatoire sans candidat, n'use donc pas l'artefact. Le cas d'un effet « X % de chance » qui rate n'a pas été vérifié.
- **Déclencheur « À chaque utilisation »** (`onUse`) : il ne retire **pas** de charge en plus de celle de l'utilisation (le moteur l'exclut explicitement de l'usure).
- **Effet « Épuiser un artefact »** (`exhaustArtifact`, « il ne peut plus être activé ce tour-ci ») : pris en charge par le moteur (l'artefact reçoit la marque « déjà activé ce tour-ci », levée au tour suivant).
- **Effet « Retirer des utilisations »** (`removeArtifactCharges`) : reste utilisable. Si ce retrait fait tomber l'artefact à 0, il est détruit (règle 8.5, point 2).
- **Effet « Ajouter des charges »** (`addCharges`) et **« Fixer les utilisations »** (option de « Fixer une statistique ») : configurables dans l'éditeur ; les règles validées ne disent rien de plus. En particulier, **fixer les utilisations à 0** : on ne précise pas si l'artefact est alors détruit (par analogie avec 8.5, ce serait logique, mais ce n'est pas écrit). Il n'y a pas non plus de nombre maximum de charges précisé.
- **« Voler une statistique » (Utilisation)** : peut mettre les charges d'un artefact à 0 ; même question : destruction ou non, non précisée.
- **Réduire le coût d'activation** : sans effet utile sur un artefact, puisque son utilisation est gratuite.
- **Artefacts renvoyés en main ou copiés** : les règles validées ne détaillent pas le nombre de charges de la carte qui revient en main ou de la copie (on suppose les charges d'origine, comme une carte neuve).
- **Utiliser une capacité de Héros** : inchangé (elle garde son coût en mana et son éventuel cooldown) ; seul l'artefact est gratuit et limité à une fois par tour. Une Région n'a pas de capacité activée (voir 3.4).

---

## 9. Déclencheurs (triggers)

| Déclencheur | Se produit... |
|---|---|
| Au début de la partie | Une fois, à la fin du 2e mulligan du joueur n°1 puis pour le joueur n°2, avant le gain de mana du 1er tour (Héros, Région ; voir 3.4) |
| Début *(onPlay)* | Quand la carte est jouée depuis la main (une créature créée par un effet ne le déclenche pas) ; pour un Piège, quand il est armé |
| Quand cette créature attaque | À chaque attaque déclarée |
| Quand cette carte subit des dégâts | Quand elle perd des PV : au combat seulement si elle survit ; par un sort ou un effet de dégâts même si le coup est fatal ; jamais si l'Armure absorbe le coup (voir 7.9) |
| Finale *(onDeath)* | Quand la créature meurt (Endurance ≤ 0, quelle qu'en soit la cause) ; pas en cas de résurrection par Tenace |
| Quand cette carte est détruite | Exactement comme Finale, à chaque mort : le moteur ne les distingue pas |
| Quand cette carte élimine une créature | Chez la créature qui met sa cible à 0 PV au combat (attaque ou blocage) ou par « Combat forcé », **si elle est encore en vie** à la fin de l'échange (voir 7.8) |
| Quand cette carte revient du cimetière | Réapparition d'elle-même par Tenace |
| Quand vous ramenez une créature de la défausse | Chaque fois qu'une carte (de n'importe quel type) est récupérée depuis votre défausse |
| À chaque utilisation *(onUse)* | Artefacts : à chaque utilisation de l'artefact. Il ne retire pas de charge en plus de celle de l'utilisation (voir 8.8) |
| Quand je suis détruit *(onDestroyed)* | Artefacts : quand un effet le détruit ou que sa dernière charge disparaît (voir 8.5). Ne retire pas de charge |
| Au début / à la fin de votre tour | Chaque tour (pour un artefact, chaque résolution lui retire 1 charge) |
| Quand vous gagnez un point de mana | À chaque incrément de mana (normal, fragile ou vide) |
| **Quand vous piochez une carte** | Créature, Héros, Artefact — à chaque pioche, quelle qu'en soit la source (pour un artefact, chaque résolution lui retire 1 charge) |
| **Quand cette carte est piochée** *(onDrawn)* | Sortilège (et les autres types) — quand **cette** carte est piochée. Pour un Sortilège qui n'a que ce déclencheur, la carte est **injouable depuis la main** (voir 3.5). Ne se produit pas pour une carte qui arrive en main autrement (conjuration, révélation) ni quand la main est pleine (la carte piochée est défaussée sans effet) |
| Quand vous invoquez une créature du sous-type X | Quand une créature de ce sous-type arrive en jeu chez vous, quelle qu'en soit la source (main ou effet) ; le sous-type est défini carte par carte |
| Capacité activée | Le joueur choisit de payer le coût pour déclencher l'effet (créature, Héros ; voir 7.9 pour les créatures ; une Région n'en a pas). Pour un artefact (« Utiliser : … »), aucun mana : gratuit, 1 fois par tour, 1 charge consommée (voir 8.4) |

**Artefacts et usure.** Pour un artefact, tout déclencheur ci-dessus qui se résout réellement lui retire 1 charge, sauf « Début » (arrivée en jeu), « Quand je suis détruit » et la capacité « Utiliser » (qui a sa propre charge). Détails en 8.4.

**Déclencheurs réservés aux Pièges :**

| Déclencheur | Se produit... |
|---|---|
| Quand une créature ennemie attaque | Une créature adverse est déclarée attaquante |
| Quand l'adversaire lance un sortilège | L'adversaire joue une carte de type Sortilège |
| Quand l'adversaire invoque une créature | L'adversaire joue une carte de type Créature |
| **Quand l'adversaire joue une carte** | L'adversaire joue n'importe quelle carte, tout type confondu |
| **À la fin du tour de l'adversaire** | Juste avant que la main ne revienne au propriétaire du Piège |
| **Si l'adversaire cible une créature alliée** | Un sort ou un effet adverse désigne une créature du propriétaire du Piège. Se déclenche aussi pour un **artefact** visé, et, pour un sort de **zone**, **une fois par créature touchée** (chaque Piège ne protège qu'une créature : 3 créatures et 1 Piège = 1 sauvée, 2 touchées). Ne se déclenche pas pour un héros visé, ni pour Fixer une statistique, Vol, Transformation, Combat forcé, ni pour *Lancer*. Si le Piège annule ou redirige l'effet, **tous les effets du même sort sur cette cible** le sont aussi (voir 3.5) |
| **Après qu'une créature alliée survit à un combat** | Une créature du propriétaire du Piège termine un combat sans mourir |
| **Après qu'une créature ennemie survit à un combat** | Une créature adverse termine un combat sans mourir |
| **Avant qu'une créature alliée ne combatte** | Juste avant la résolution des dégâts d'un combat impliquant une créature alliée |
| **Si une créature alliée est bloquée** | Une créature alliée attaquante se voit assigner un bloqueur |

---

## 10. Effets disponibles

Dégâts, Soin, Pioche, Renforcement (+Force/+Endurance — accepte aussi des valeurs **négatives**, donc peut servir de malus), Fixer les statistiques, Fixer le coût des cartes (deck ou main, vous ou l'adversaire), **Réduire le coût d'un type/sous-type de carte** (en main, dans le deck, ou les deux — filtrable par type et sous-type), Gel, Étourdir, Renvoi en main, Gain de mana (normal / vide / fragile), Recharge de mana, Réduire le coût d'activation (d'une capacité activée de la même carte), Réduction du prochain achat, Défausse, Explorer (mise en défausse depuis un deck), Destruction, Silence, Amélioration (mot-clé aléatoire), Octroi de mot-clé précis, Choix parmi 3 mots-clés, Invoquer des copies de soi, Combat forcé entre deux créatures désignées, Jet de pièce, Récupération (deck/défausse selon critère), Réveler (3 cartes **depuis votre deck, votre défausse, le deck adverse ou la défausse adverse**, choix d'une, filtrable par type/sous-type via le critère), Conjuration (carte hors deck, selon des critères ou une carte précise par son nom) — ces deux derniers peuvent avoir un effet supplémentaire appliqué à la carte obtenue (renforcement ou mot-clé).

Effets propres aux artefacts : **Destruction** d'un artefact ciblé, **Retirer des utilisations** (`removeArtifactCharges`), **Ajouter des charges** (`addCharges`), **Épuiser un artefact** (`exhaustArtifact`), et l'option « Utilisations » de « Fixer une statistique » ou « Voler une statistique ». Voir 8.5 et 8.8 pour leur interaction avec l'usure et la destruction. L'effet « Retirer des utilisations » n'est plus nécessaire pour représenter l'usure d'un effet passif : elle est automatique.

L'effet **Dégâts** peut être marqué « **perte de PV** » : sur un héros, c'est alors une perte directe de PV et non des dégâts (voir 3.5). Une **condition** « nombre de cartes d'un sous-type » peut ne pas compter les cartes **conjurées** (set « Conjuration »). Une **Conjuration** par critères peut exclure des cartes par leur nom.

Les effets de Pioche et de mana (normal / vide / fragile / recharge) peuvent tous cibler **Vous**, **L'adversaire**, ou **Les deux** — pas seulement vous.

Chaque effet ciblant une créature peut viser, en plus d'allié/ennemi/peu importe : **"Cette carte"**, c'est-à-dire la carte qui porte la capacité elle-même (utile combiné à une condition, pour un effet conditionnel sur soi-même). Le mode de sélection (désignée / jusqu'à X désignées / aléatoire / toutes) et la valeur (fixe ou dynamique — Force/Endurance de la créature, cartes en main, cartes en défausse, mana dépensé, mana max adverse) restent disponibles pour les autres catégories de cible (créature / héros / artefact / joueur / carte en main).

Les capacités peuvent avoir des **conditions** (santé du héros, taille de main, plateau vide, sous-type contrôlé, statistique en main, numéro de tour, **X% de chance** — exprimé en pourcentage, pas en "1 chance sur X", deck de base d'une seule classe hors Neutre, mana ne venant pas de la région) et des **capacités évolutives** (condition + effet amélioré).

---

## 11. Points secondaires — tranchés par défaut

1. **Mana vide** : augmente le maximum de façon permanente pour le reste de la partie.
2. **Armure** : absorbe le premier dégât positif subi, qu'il vienne du combat, d'un sort ou d'un effet de dégâts. Elle ne protège ni de la destruction directe, ni du sacrifice, ni des malus d'Endurance, ni du Gel/de l'Étourdissement (voir 7.7).
3. **Déclencheurs simultanés** : le joueur ne choisit pas l'ordre (artefacts : voir 8.6). Pour un joueur donné, ses créatures se résolvent dans l'ordre de leur plateau, puis son héros, sa région, ses artefacts et ses Pièges armés. Pour les capacités qui surveillent les deux camps (et pour les morts simultanées), le moteur traite d'abord le joueur n°1 de la partie, puis le joueur n°2, que ce soit son tour ou non.
4. **Sous-types et Régions** : le Héros impose la classe du deck. Une Région doit être de la classe du Héros (ou de sa classe secondaire) ou Neutre ; une Région d'une autre classe est refusée par le deckbuilder et par le serveur, et la Côte de Rimd'Orël la remplace (voir 3.4). Une Région n'impose elle-même aucune classe aux cartes de votre deck ni aux cartes qu'elle conjure.
5. **Blocage multiple** : plusieurs bloqueurs peuvent bloquer un même attaquant, et chacun subit alors un combat complet ; en revanche un bloqueur ne peut bloquer qu'**un seul** attaquant par tour (voir Section 6). Une exception à cette dernière règle pourra exister via un effet de carte précis ; elle n'est pas implémentée.
6. **Pas de PV maximum** : les Points de Vie du héros n'ont aucun plafond. Soigner un héros déjà à sa valeur de départ (ou au-delà) l'augmente quand même — il n'y a pas de "vie maximale" qui bloquerait le soin, contrairement à ce que ferait un `Math.min(hp, maxHp)` classique.

Ces points décrivent le comportement du moteur actuel.

---

## 12. Écarts connus entre l'éditeur et le moteur de jeu

L'éditeur de cartes permet de configurer certaines choses que le moteur n'interprète pas (ou pas entièrement). Cette section garde une trace fidèle de l'état réel, relevé dans le code du serveur de jeu (le moteur déployé) le 6 octobre 2026. L'ancien `spellcraft-prototype.html` n'est plus la référence du moteur.

**Déclencheurs de carte non câblés :**
- **Héros** : `onKill` (le héros ne « tue » jamais directement) : retiré de la liste proposée par l'éditeur pour un Héros.
- **Région** : `onPlay`, `onDestroyed` et `onReturnFromGraveyard` : sans effet (une Région n'est jamais jouée, détruite ni ramenée du cimetière) ; l'éditeur ne les propose plus pour une Région.
- **Surveillance « Quand un joueur révèle »** (`watchReveal`) : câblée le 8 octobre 2026 ; se déclenche quand l'effet « Révéler » propose ses choix (avant le choix du joueur, et seulement s'il y a au moins une carte à proposer). À côté, « Quand vous découvrez une carte » (`watchDiscovered`) l'est quand le joueur choisit une carte révélée, et « Quand une carte arrive après avoir été révélée » (`watchAfterReveal`) l'est par la Conjuration et le Vol de carte.
- **« Quand vous défaussez une carte depuis votre main »** (`onHandDiscard`) : déclenché par l'effet « Défausser » et, depuis le 8 octobre 2026, par le coût additionnel « défausser une carte ». Il n'est **pas** déclenché quand une carte piochée ou ajoutée est défaussée parce que la main est pleine (elle n'est jamais entrée dans la main).

**Déclencheurs qui fonctionnent**, y compris pour les cartes déjà en jeu : toutes les capacités **activées** (créatures, artefacts, pouvoir du Héros ; pas les Régions, qui n'en ont pas) ; à l'utilisation d'un artefact (`onUse`, voir 8.8 pour son lien avec les charges) ; **tous les déclencheurs de Pièges** (y compris « si l'adversaire cible une créature alliée », « après qu'une créature alliée / ennemie survit à un combat », « avant qu'une créature alliée ne combatte » et « si une créature alliée est bloquée ») ; ainsi que l'entrée en jeu, le retour du cimetière, début/fin de tour, attaque, blocage, dégâts, soin, mort, élimination d'une cible, gain de mana, pioche, invocation d'un sous-type précis, début de partie, et les déclencheurs de surveillance du plateau (y compris `watchReveal`). Le moment exact de chaque déclencheur de créature est décrit en 7.9.

**Effets non pris en charge :**
- **Effets personnalisés** (texte libre) : jamais interprétables par nature, toujours sans effet mécanique.

**Effets qui fonctionnent avec une limite :**
- **Fixer une statistique, y compris le coût** : fonctionne sur une créature ou un artefact **en jeu**. Sur une carte en main ou dans le deck, « Fixer le coût » n'a aucun effet (on peut en revanche réduire le coût d'une carte précise avec « Réduire le coût », ou fixer Force/Endurance d'un groupe de cartes en main ou en deck).
- **Invoquer des copies de cette carte** : la créature qui porte la capacité (ou la créature ciblée) sert de modèle ; sans modèle, l'effet ne fait rien (voir 7.4).
- **Réveler** : fonctionne depuis votre deck, votre défausse, le deck adverse ou la défausse adverse, ou depuis une liste de cartes nommées. Le choix se fait parmi 3 cartes au plus, la carte choisie va en main (la destination « directement en jeu » n'existe pas pour Réveler) et elle est retirée de sa zone d'origine.
- **Réduire le coût d'activation** : réduit le coût d'activation de la carte qui porte la capacité.
- **Sacrifice (effet)** : sacrifie une créature **tirée au hasard** parmi celles du camp visé (la cible désignée n'est pas utilisée).

**Effets qui fonctionnent :**
- **Contrer** : annule la carte jouée par l'adversaire (elle va en défausse, son effet n'a pas lieu).
- **Rediriger une cible** : remplace la cible d'un effet adverse visant une créature alliée par une autre cible.
- **Désarmer les pièges adverses** : tous les Pièges posés de l'adversaire redeviennent des cartes normales en main.
- **Voler du mana** : pendant X tours, au début de son tour, l'adversaire perd X mana (le normal d'abord, puis le fragile) et vous le recevez en mana fragile.

**Autres écarts :**
- **Condition "mana ne vient pas de la région"** : non interprétable sans suivre la provenance exacte de chaque point de mana dépensé ; toujours considérée comme remplie par défaut.
- **Remplacement du gain de mana d'une Région** : fonctionne (si les conditions de la capacité, y compris « X % de chance », sont remplies, ses effets remplacent le gain normal ; sinon le gain normal a lieu). Seul un effet « autre chose » écrit en texte libre n'est pas exécutable.
- **Régions : règles décidées le 6 octobre 2026, à vérifier côté serveur.** Les règles de la section 3.4 (tours personnels, classe vérifiée par le serveur, Côte de Rimd'Orël par défaut, Régions jamais ciblées ni détruites, conjuration perdue si main ou plateau plein, Conduit de Clébreaux réparti au hasard, Sentier de la gloire avec Parade et fin de tour, Cimetière oublié permanent, Village kobold en jeu puis mana vide) sont la décision de conception. Leur application dans le moteur serveur est en cours, menée séparément de la mise à jour du client, de l'éditeur et de cette documentation ; au dernier relevé du moteur (avant cette décision), le serveur ne vérifiait pas la classe de la Région, n'avait pas de Région par défaut, ne remettait pas à zéro l'effet du Sentier de la gloire en fin de tour, et n'écrivait aucune entrée de journal pour un remplacement du gain de mana. Tant que le déploiement n'est pas confirmé, le comportement réel peut différer de la section 3.4.
- **Conditions personnalisées et effets personnalisés** (texte libre) : jamais interprétables par nature, toujours considérés comme remplis / sans effet mécanique.
- **Coût additionnel "Personnalisé"** (texte libre) : comme pour les conditions/effets personnalisés, aucune traduction mécanique possible ; toujours traité comme payable sans conséquence.

**Sorts : règles décidées le 6 octobre 2026 (section 3.5).** Elles sont appliquées par le moteur serveur et par les données des cartes ; le client, l'éditeur et cette documentation ont été alignés dessus. Limites et points non tranchés relevés dans le moteur :
- Le refus pour cible invalide ne concerne que les cibles « désignées par le joueur » (voir 13) ; les sorts lancés par *Don de savoir* gardent des cibles aléatoires.
- *Don de la guerre* n'a aucun déclencheur défini : le moteur le traite comme jouable.
- Une capacité « Récupération » depuis la défausse n'exclut pas le sort lui-même (seule la révélation, donc *Déduction*, l'exclut).
- « Détruisez » met l'Endurance à un très grand négatif : une créature **Tenace** détruite revient donc (par ex. avec *Lancer* ou *Don de jaäne*). **Décidé le 7 octobre 2026 : c'est voulu.** Tenace protège de toutes les causes de mort, destruction directe comprise.
- **Décidé le 7 octobre 2026 (comportement actuel confirmé) :** piocher dans un deck vide reste une défaite immédiate (pas de fatigue) ; le soin du héros n'a pas de plafond de PV ; il n'y a aucune limite de sorts par tour. Ces trois règles ne sont plus « à trancher ».
- Un sort **contré** fait perdre le mana et le coût additionnel ; il compte dans « cartes jouées ce tour ».
- Une réduction de coût s'applique aux sorts (plancher à 0).
- Aucun sort n'utilise l'effet Silence ; il ne touche que les créatures.
- Deux cartes (*Vigueur naturelle* et *Récompense naturelle*) ont strictement le même effet (soin de 4 PV à toutes vos créatures).

Le **coût additionnel** (sacrifice, défausse, perte de PV) est réellement vérifié et payé par le moteur pour jouer une carte, y compris pour l'IA. Pour le joueur humain, s'il y a plus d'une créature possible à sacrifier, le jeu lui demande laquelle plutôt que de choisir automatiquement (l'IA, elle, sacrifie toujours la plus faible). La défausse pioche une carte au hasard parmi les autres cartes en main.

Une capacité peut avoir plusieurs déclencheurs différents en même temps sur une seule carte (ils fonctionnent en OU).

Tout le reste décrit dans ce document (mana, combat, créatures, mots-clés, Pièges, effets listés en section 10 hors les exceptions ci-dessus) est réellement implémenté et appliqué par le moteur. Exception : les règles d'artefact marquées « nouveau » en section 8 (usure automatique, destruction à la dernière charge, refus `no-valid-target`, usage par l'IA) sont en cours d'application dans le moteur ; tant qu'elles ne sont pas déployées, le comportement réel peut différer.

## 13. Refonte des capacités (2026) — décisions de conception

Cette section trace les décisions prises pendant la refonte complète du système de capacités de l'éditeur (déclencheurs, conditions, effets, cibles, mots-clés). Le moteur en applique désormais une grande partie ; l'état de chaque décision, relevé dans le code du serveur le 6 octobre 2026, est indiqué ci-dessous.

**Règle générale de ciblage — appliquée pour les Sortilèges (serveur et client) :** pour un sort qui exige une cible **désignée par le joueur**, si aucune cible valide n'existe, **le sort ne peut pas être joué** (erreur `no-valid-target`, rien n'est dépensé, la carte reste en main) ; une cible invalide désignée est refusée (`invalid-target`). Le client n'ouvre pas de ciblage vide et n'autorise que les cibles valides (voir 3.5). **Limites :** (1) pour les Créatures, Artefacts joués depuis la main, capacités de Héros et d'autres capacités, la carte reste jouable faute de cible et l'effet est simplement ignoré ; (2) seul le mode « Désignée par le joueur » (de 1 à X cibles) est contrôlé : les modes « Jusqu'à X désignées » et « Exactement X » ne produisent pas de refus propre, ni les cibles aléatoires ou « toutes » ; (3) l'**utilisation d'un artefact** dont l'effet exige une cible choisie est refusée s'il n'existe aucune cible valide (`no-valid-target`, voir 8.4).

**Règle "Regarder" (discover) — appliquée :** une carte révélée depuis un deck ou une défausse (la vôtre ou celle de l'adversaire) est **toujours retirée de sa zone d'origine**, peu importe où elle finit ensuite. On ne copie jamais la carte. Les cartes proposées mais non choisies restent dans leur zone. La main d'un joueur n'est pas une source possible dans le moteur.

**Cas particulier de la règle générale de ciblage — non appliqué :** si un effet "Regarder N cartes" porte sur une zone qui contient moins de N cartes, le moteur propose simplement les cartes disponibles (jusqu'à 3) et ne fait rien s'il n'y en a aucune ; la carte reste jouable.

**Sous-type vide — non appliqué :** la décision voulue est que, dans une condition/cible qui filtre par sous-type, un champ vide signifie "sans sous-type". Dans le moteur, un sous-type vide dans un filtre de cible signifie "pas de filtre" (n'importe quel sous-type), et dans une condition de comptage il ne correspond à aucune carte.

**Mot-clé Protection retiré — appliqué :** il n'existe plus dans le moteur. Il est remplacé par Protecteur (ne peut pas attaquer), qui n'a aucun rapport avec l'ancien Protection (ne peut pas être ciblée par un sort). Protecteur et Toxique sont câblés.

**"Mal d'invocation" — appliqué :** nom officiel de la règle (créature sans Charge ne peut pas attaquer le tour où elle arrive) ; c'est une règle automatique, pas un mot-clé à cocher sur une carte. L'animation (Zzz) existe côté interface.

**Sacrifice en tant qu'effet** (`sacrificeEffect`) est distinct du coût additionnel "sacrifier une créature" pour jouer une carte — l'un est un coût à payer avant de jouer la carte, l'autre est une conséquence de la capacité elle-même une fois déclenchée. Dans le moteur, l'effet sacrifie une créature tirée au hasard dans le camp visé.
