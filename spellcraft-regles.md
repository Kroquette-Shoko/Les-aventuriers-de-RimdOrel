# Spellcraft — Règles du jeu

*Document de référence, consolidé à partir de tout ce qui a été conçu dans l'éditeur de cartes. Sert de base pour remettre le moteur de jeu à niveau.*

---

## 1. Objectif

Chaque joueur incarne un **Héros** avec des Points de Vie. Un joueur perd la partie quand ses PV tombent à 0 (ou selon une condition de victoire alternative propre à certaines cartes).

---

## 2. Construction d'un deck

Un deck est composé de :
- **1 Héros** (obligatoire, hors des 30 cartes)
- **1 Région** (obligatoire, hors des 30 cartes) — définit la règle de gain de mana du joueur
- **30 cartes** (Créatures, Sortilèges, Pièges, Artefacts)

**Règles de classe :**
- Le Héros impose une **classe** au deck (Aube, Crépuscule, Volonté, Prima, Arcane).
- Seules les cartes de cette classe, ou de la classe **Neutre**, sont autorisées par défaut.
- Un Héros peut porter une **règle multi-classe** optionnelle : "Autorise jusqu'à X cartes [de tel type précis, ou toutes] d'une autre classe précise." Cette règle est réellement appliquée par le deckbuilder : au-delà du plafond X, ou hors du type autorisé si un type est précisé, la carte est refusée.
- Une carte peut avoir une **classe secondaire** (carte bicolore). Elle compte comme appartenant aux deux classes pour la règle de deckbuilding.

**Règles de copies :**
- **2 exemplaires maximum** par carte.
- **1 seul exemplaire** pour les cartes de rareté **Légendaire**.
- La rareté **Basique** ne bénéficie d'aucun passe-droit particulier : elle reste soumise aux mêmes règles de classe et de copies que n'importe quelle autre rareté. C'est une catégorie de rareté comme les autres (voir 3.2), pas un pool universel indépendant du deck.

**Limites sur le plateau (en partie) :**
- **8 créatures maximum** simultanément sur le champ de bataille d'un joueur.
- **2 artefacts maximum** simultanément en jeu pour un joueur.

---

## 3. Les six types de cartes

| Type | Coût de mana | Statistiques | Comportement |
|---|---|---|---|
| **Héros** | Aucun | PV | Toujours en jeu dès le début de la partie. Porte la classe du deck, peut avoir des capacités (y compris activées). |
| **Région** | Aucun | — | Toujours en jeu dès le début. Définit la **règle de mana** du deck (remplace ou modifie le gain normal). Peut aussi avoir des capacités. |
| **Créature** | Oui | Force / Endurance | Peut attaquer, bloquer, mourir. Porte la majorité des mots-clés de combat. |
| **Artefact** | Oui | Usure (charges) | Reste en jeu, s'épuise après N utilisations si limité. |
| **Sortilège** | Oui | — | Effet immédiat à la résolution, puis va en défausse. |
| **Piège** | Oui | — | Posé, reste dans votre main, réserve son coût en mana. Actif seulement si ce mana est encore disponible en fin de tour. Se déclenche automatiquement selon une condition adverse (attaque, sort, invocation), consomme le mana réservé et va en défausse. Non déclenché avant votre tour suivant : se désarme sans effet. |

### 3.1 Cycle de vie d'un Piège

Contrairement à un Sortilège, poser un Piège ne le retire pas de votre main et ne dépense pas son mana immédiatement :

1. **Réservation** — vous posez le Piège durant votre tour : son coût est réservé (mis de côté), mais la carte reste dans votre main et le mana n'est pas encore dépensé.
2. **Confirmation en fin de tour** — à la fin de votre tour, on vérifie si ce mana réservé est toujours disponible (vous n'avez rien dépensé qui l'aurait entamé) :
   - S'il est toujours disponible : le Piège devient **actif** et le reste jusqu'au début de votre tour suivant.
   - S'il ne l'est plus (vous avez dépensé ce mana ailleurs entre-temps) : le Piège ne s'active pas. La carte redevient une carte normale en main.
3. **Déclenchement** — un Piège actif attend sa condition de déclenchement (attaque adverse, sort adverse, invocation adverse selon la carte). S'il se déclenche, il se résout, consomme le mana réservé et part en défausse.
4. **Expiration** — si la condition ne se produit jamais avant le début de votre tour suivant, le Piège se désarme automatiquement sans effet et redevient une carte normale en main (rejouable).

### 3.2 Coût additionnel

En plus de son coût de mana, une Créature, un Sortilège, un Artefact ou un Piège peut porter un **coût additionnel** défini dans l'éditeur : sacrifier une créature alliée, défausser une carte, perdre des PV, ou un coût personnalisé en texte libre. Ce coût s'ajoute au mana à payer pour jouer la carte, il ne le remplace pas.

### 3.3 Rareté et présentation

Cinq raretés existent, de la plus commune à la plus rare : **Basique, Commune, Rare, Épique, Légendaire**. Seule la Légendaire a un effet de règle (1 exemplaire max) ; les autres n'influencent que la copie autorisée (2 par défaut) et l'affichage (couleur de la gemme de rareté).

Une carte peut aussi être marquée **Foil** : purement cosmétique, elle affiche un reflet arc-en-ciel qui balaie la carte au survol de la souris ou automatiquement toutes les 10 secondes. Aucun effet sur les règles.

---

## 4. Les ressources : trois types de mana

1. **Mana normal** — gagné automatiquement chaque tour (sauf règle de Région différente). Se réinitialise chaque tour. **Dépensé en premier.**
2. **Mana fragile** — obtenu via un effet ponctuel. Reste disponible tant qu'il n'est pas dépensé (ne se réinitialise pas, ne se perd pas en fin de tour). **Dépensé en second**, après le mana normal.
3. **Mana vide** — augmente le mana **maximum** du joueur, mais pas le mana disponible ce tour-ci. Se comporte ensuite comme du mana normal les tours suivants (fait partie du total rechargé chaque tour). **Dépensé en dernier** parmi les mana disponibles au moment de payer un coût, si un choix doit être fait.

> **Point à trancher :** Le mana vide, une fois gagné, augmente-t-il le max *pour toujours*, ou seulement le temps de la partie en cours (ce qui est de toute façon le cas, aucune persistance entre parties) ? Je pars du principe qu'il s'ajoute au maximum de façon permanente pour le reste de la partie.

---

## 5. Structure d'un tour

1. **Début de tour**
   - Application de la règle de mana de la Région (gain normal, ou règle alternative).
   - Déclenchement des capacités "Au début de votre tour" et "Quand vous gagnez un point de mana".
   - Pioche d'une carte.
   - Les créatures gelées se dégèlent ; les créatures étourdies redeviennent actives ; le statut "attaque déjà faite ce tour" est réinitialisé.
   - Les cooldowns des capacités activées diminuent de 1.

2. **Phase principale**
   - Jouer des cartes (Créatures, Sortilèges, Artefacts, Pièges) en payant leur coût.
   - Activer des capacités activées (mana + coût additionnel éventuel).
   - Déclenchement des capacités "Quand cette carte entre en jeu" (Début) à la pose.

3. **Phase de combat**
   - Chaque créature non étourdie, non gelée et n'ayant pas la maladie d'invocation (sauf **Charge**) peut attaquer une fois.
   - Voir Section 6 pour le détail du combat.

4. **Fin de tour**
   - Déclenchement des capacités "À la fin de votre tour".
   - Les mots-clés octroyés "ce tour-ci seulement" expirent.
   - Les effets de **Protection** ("jusqu'à votre prochain tour") expirent au *prochain* tour du joueur qui en bénéficie, pas à la fin du tour en cours — à vérifier selon la carte.

---

## 6. Le combat

**Séquence confirmée :**

1. **Déclaration des attaquants** — Le joueur actif choisit, parmi ses créatures éligibles (ni gelée, ni étourdie, ni sous le coup de la maladie d'invocation sauf **Charge**), lesquelles attaquent. Toutes les créatures déclarées attaquent le **héros adverse** par défaut (il n'y a pas de ciblage individuel de créature à la déclaration).
   - Si aucune créature n'attaque, la phase de combat est entièrement sautée : pas de déclencheurs, pas de blocage, on passe directement à la fin du tour.
2. **Déclenchement** — Les capacités "Quand cette créature attaque" de tous les attaquants déclarés se déclenchent (dans l'ordre choisi par leur contrôleur si plusieurs).
3. **Déclaration des bloqueurs** — Le joueur défenseur choisit, pour chacune de ses créatures disponibles (ni gelée, ni étourdie), si elle bloque un attaquant et lequel.
   - Une créature avec **Vol** ne peut être bloquée que par une créature ayant **Vol** ou **Portée**.
   - *Par défaut : un bloqueur ne peut intercepter qu'un seul attaquant, et un attaquant ne peut être intercepté que par un seul bloqueur* (pas de gang-up ni de blocage multiple). À corriger si tu veux permettre les blocages groupés.
4. **Résolution des dégâts** — Simultanée pour tous les combats :
   - Attaquant bloqué : l'attaquant et le bloqueur s'infligent mutuellement des dégâts égaux à leur Force.
   - **Initiative** : si la créature avec Initiative inflige des dégâts fatals à sa cible avant l'échange normal, elle ne subit aucun dégât en retour.
   - **Perçant** : si les dégâts de l'attaquant dépassent l'Endurance restante du bloqueur, l'excédent est infligé au héros adverse.
   - **Vol de vie** : la créature qui inflige des dégâts (attaque ou blocage) soigne son propre héros d'autant.
   - **Armure** : absorbe la première fois qu'une créature subit des dégâts (combat ou effet), puis se consomme définitivement pour cette carte.
   - Attaquant non bloqué : dégâts pleins au héros adverse.
5. **Résolution des morts** — Toute créature ayant subi des dégâts ≥ son Endurance meurt : déclenche Finale et "Quand cette carte est détruite" si pertinent ; déclenche "Quand cette carte élimine une créature" chez qui l'a tuée.
6. **Fin du combat.**

**Statuts temporaires** (infligés par des effets, pas des mots-clés intrinsèques) :
- **Gel** : ne peut pas attaquer lors du prochain tour du contrôleur.
- **Étourdi** : ne peut ni attaquer ni bloquer lors du prochain tour du contrôleur.

**Mots-clés de combat :**

| Mot-clé | Effet |
|---|---|
| **Charge** | Peut attaquer le tour où elle arrive en jeu (ignore la maladie d'invocation). |
| **Vol** | Ne peut être bloquée que par des créatures ayant Vol ou Portée. |
| **Portée** | Peut bloquer les créatures volantes sans avoir elle-même Vol. |
| **Perçant** | Si les dégâts infligés dépassent l'Endurance du bloqueur, l'excédent passe au héros adverse. |
| **Vol de vie** | Les dégâts infligés par cette créature soignent son héros d'autant. |
| **Initiative** | Frappe avant son adversaire ; si elle élimine sa cible au moment de l'initiative, elle ne subit aucun dégât en retour. |
| **Protection** | Jusqu'au prochain tour du contrôleur, ne peut pas être ciblée par l'adversaire. *(Réellement appliqué : une créature protégée est exclue du ciblage adverse, y compris pour l'IA.)* |
| **Armure** | Annule la première fois qu'elle subit des dégâts, combat ou effet confondus (usage unique, se "consomme"). |
| **Furtif** | Ne peut pas être la cible d'un **sort** adverse avant d'avoir attaqué au moins une fois (les pouvoirs de héros ne sont pas concernés). *(Réellement appliqué, y compris pour l'IA.)* |
| **Tenace** | Quand elle meurt, revient en jeu une fois (puis perd Tenace). |
| **Peureux** | Ne peut jamais être désignée comme bloqueur. |

---

## 7. Déclencheurs (triggers)

| Déclencheur | Se produit... |
|---|---|
| Au début de la partie | Une fois, à la mise en jeu du Héros/Région |
| Début *(onPlay)* | Quand la carte entre en jeu |
| Quand cette créature attaque | À chaque attaque déclarée |
| Quand cette carte subit des dégâts | À chaque fois qu'elle encaisse des dégâts |
| Finale *(onDeath)* | Quand la créature meurt (dégâts fatals) |
| Quand cette carte est détruite | Quand un effet la détruit spécifiquement |
| Quand cette carte élimine une créature | Après un kill en combat ou par effet |
| Quand cette carte revient du cimetière | Réapparition d'elle-même (ex. via Tenace) |
| Quand vous ramenez une créature de la défausse | Chaque fois que *n'importe quelle* créature revient de votre défausse (récupération, effet...) |
| À chaque utilisation | Artefacts, à chaque activation |
| Au début / à la fin de votre tour | Chaque tour |
| Quand vous gagnez un point de mana | À chaque incrément de mana (normal, fragile ou vide) |
| **Quand vous piochez une carte** | Créature, Héros, Artefact — à chaque pioche, quelle qu'en soit la source |
| Quand vous invoquez une créature du sous-type X | Paramétré : le sous-type est défini carte par carte |
| Capacité activée | Le joueur choisit de payer le coût pour déclencher l'effet |

**Déclencheurs réservés aux Pièges :**

| Déclencheur | Se produit... |
|---|---|
| Quand une créature ennemie attaque | Une créature adverse est déclarée attaquante |
| Quand l'adversaire lance un sortilège | L'adversaire joue une carte de type Sortilège |
| Quand l'adversaire invoque une créature | L'adversaire joue une carte de type Créature |
| **Quand l'adversaire joue une carte** | L'adversaire joue n'importe quelle carte, tout type confondu |
| **À la fin du tour de l'adversaire** | Juste avant que la main ne revienne au propriétaire du Piège |
| **Si l'adversaire cible une créature alliée** | Un sort ou un effet adverse désigne une créature du propriétaire du Piège |
| **Après qu'une créature alliée survit à un combat** | Une créature du propriétaire du Piège termine un combat sans mourir |
| **Après qu'une créature ennemie survit à un combat** | Une créature adverse termine un combat sans mourir |
| **Avant qu'une créature alliée ne combatte** | Juste avant la résolution des dégâts d'un combat impliquant une créature alliée |
| **Si une créature alliée est bloquée** | Une créature alliée attaquante se voit assigner un bloqueur |

---

## 8. Effets disponibles

Dégâts, Soin, Pioche, Renforcement (+Force/+Endurance — accepte aussi des valeurs **négatives**, donc peut servir de malus), Fixer les statistiques, Fixer le coût des cartes (deck ou main, vous ou l'adversaire), **Réduire le coût d'un type/sous-type de carte** (en main, dans le deck, ou les deux — filtrable par type et sous-type), Gel, Étourdir, Renvoi en main, Gain de mana (normal / vide / fragile), Recharge de mana, Réduire le coût d'activation (d'une capacité activée de la même carte), Réduction du prochain achat, Défausse, Explorer (mise en défausse depuis un deck), Destruction, Silence, Amélioration (mot-clé aléatoire), Octroi de mot-clé précis, Choix parmi 3 mots-clés, Invoquer des copies de soi, Combat forcé entre deux créatures désignées, Jet de pièce, Récupération (deck/défausse selon critère), Réveler (3 cartes **depuis votre deck, votre défausse, le deck adverse ou la défausse adverse**, choix d'une, filtrable par type/sous-type via le critère), Conjuration (carte hors deck, selon des critères ou une carte précise par son nom) — ces deux derniers peuvent avoir un effet supplémentaire appliqué à la carte obtenue (renforcement ou mot-clé).

Les effets de Pioche et de mana (normal / vide / fragile / recharge) peuvent tous cibler **Vous**, **L'adversaire**, ou **Les deux** — pas seulement vous.

Chaque effet ciblant une créature peut viser, en plus d'allié/ennemi/peu importe : **"Cette carte"**, c'est-à-dire la carte qui porte la capacité elle-même (utile combiné à une condition, pour un effet conditionnel sur soi-même). Le mode de sélection (désignée / jusqu'à X désignées / aléatoire / toutes) et la valeur (fixe ou dynamique — Force/Endurance de la créature, cartes en main, cartes en défausse, mana dépensé, mana max adverse) restent disponibles pour les autres catégories de cible (créature / héros / artefact / joueur / carte en main).

Les capacités peuvent avoir des **conditions** (santé du héros, taille de main, plateau vide, sous-type contrôlé, statistique en main, numéro de tour, **X% de chance** — exprimé en pourcentage, pas en "1 chance sur X", deck de base d'une seule classe hors Neutre, mana ne venant pas de la région) et des **capacités évolutives** (condition + effet amélioré).

---

## 9. Points secondaires — tranchés par défaut

1. **Mana vide** : augmente le maximum de façon permanente pour le reste de la partie.
2. **Armure** : protège contre les dégâts, qu'ils viennent du combat ou d'un effet — pas contre le Gel/l'Étourdissement (statuts différents, non liés aux dégâts).
3. **Déclencheurs simultanés** : résolus dans l'ordre choisi par le joueur à qui appartiennent les cartes concernées ; si les deux joueurs ont des déclencheurs en même temps, le joueur actif résout les siens en premier.
4. **Sous-types et Régions** : seul le Héros impose la classe du deck. Une Région ne peut pas imposer de classe, mais rien n'empêche qu'une future carte le fasse si besoin s'en fait sentir.
5. **Blocage multiple** : par défaut, un bloqueur = un attaquant (voir Section 6). Dis-moi si tu veux permettre les blocages groupés (plusieurs bloqueurs sur un attaquant, ou un bloqueur qui "déborde" sur plusieurs attaquants).
6. **Pas de PV maximum** : les Points de Vie du héros n'ont aucun plafond. Soigner un héros déjà à sa valeur de départ (ou au-delà) l'augmente quand même — il n'y a pas de "vie maximale" qui bloquerait le soin, contrairement à ce que ferait un `Math.min(hp, maxHp)` classique.

Si l'un de ces choix ne te convient pas, dis-le et je corrige avant de passer au code.

---

## 10. Écarts connus entre l'éditeur et le moteur de jeu

L'éditeur de cartes permet de configurer davantage de choses que ce que `spellcraft-prototype.html` sait actuellement interpréter en partie réelle. Un audit complet (comparant précisément le code de l'éditeur à celui du moteur) a été fait et un grand lot de déclencheurs a été branché suite à cet audit. Cette section garde une trace fidèle de ce qui reste manquant :

**Déclencheurs de carte encore non câblés :**
- **Créature** : `activated` (une créature n'a pas de bouton pour activer une capacité en jeu, contrairement au héros). `onDestroyed` se déclenche désormais exactement comme `onDeath` (aucune distinction entre les deux, par choix).
- **Héros** : `onKill` (le héros ne "tue" jamais directement dans le système actuel).
- **Région** : `onDestroyed`, `activated` (pas d'interface pour activer une région).
- **Artefact** : `onUse`/`activated` (pas de bouton d'activation pour un artefact déjà en jeu — seul son tick automatique en début de tour fonctionne).
- **Piège** : `onOpponentTargetsAlly`, `onAllySurvivesCombat`, `onEnemySurvivesCombat`, `beforeAllyFights` (nécessiteraient de la chirurgie plus fine dans la résolution du ciblage et du combat). Les six autres déclencheurs de Piège fonctionnent.

**Tous les autres déclencheurs fonctionnent réellement**, y compris pour les créatures/héros/artefacts déjà en jeu (ce qui n'était pas le cas avant ce lot de correctifs) : à l'entrée en jeu, revient du cimetière (soi-même via Tenace, ou récupéré par un effet), début/fin de tour, attaque, subit des dégâts, élimine une cible, gain de mana, pioche, invocation d'un sous-type précis, début de partie, capacité activée (héros).

**Effets encore non câblés :**
- **Fixer le coût des cartes, Réduire le coût d'activation, Réveler depuis une source autre que votre propre deck** : configurables dans l'éditeur, pas encore interprétés par le moteur.
- **Invoquer des copies de cette carte** : fonctionne, mais seulement comme capacité "à l'entrée en jeu" d'une Créature — ne fonctionnerait pas utilisé ailleurs (sortilège, pouvoir de héros).
- **Effets Contrer, Rediriger une cible, Désarmer les pièges adverses, Voler du mana** : évoqués par certaines cartes de référence, pas encore des effets utilisables dans le système actuel.

**Autres écarts :**
- **Condition "mana ne vient pas de la région"** : non interprétable sans suivre la provenance exacte de chaque point de mana dépensé ; toujours considérée comme remplie par défaut.
- **Effet alternatif des Régions** (% de chance de faire autre chose que du mana) : le jet de probabilité n'est pas branché, et l'"autre chose" est en texte libre, donc pas structurée pour être exécutée automatiquement.
- **Conditions personnalisées et effets personnalisés** (texte libre) : jamais interprétables par nature, toujours considérés comme remplis / sans effet mécanique.
- **Coût additionnel "Personnalisé"** (texte libre) : comme pour les conditions/effets personnalisés, aucune traduction mécanique possible ; toujours traité comme payable sans conséquence.

Le **coût additionnel** (sacrifice, défausse, perte de PV) est réellement vérifié et payé par le moteur pour jouer une carte, y compris pour l'IA. Pour le joueur humain, s'il y a plus d'une créature possible à sacrifier, le jeu lui demande laquelle plutôt que de choisir automatiquement (l'IA, elle, sacrifie toujours la plus faible). La défausse pioche une carte au hasard parmi les autres cartes en main.

Une capacité peut désormais avoir plusieurs déclencheurs différents en même temps sur une seule carte (avant ce lot de correctifs, une carte de type Créature/Héros/Région/Artefact ne pouvait avoir qu'une seule capacité réellement interprétée par le moteur, même si l'éditeur en acceptait plusieurs).

Tout le reste décrit dans ce document (mana, combat, mots-clés, Pièges, effets listés en section 8 hors les exceptions ci-dessus) est réellement implémenté et appliqué par le moteur.

## 11. Refonte des capacités (2026) — décisions de conception

Cette section trace les décisions prises pendant la refonte complète du système de capacités de l'éditeur (déclencheurs, conditions, effets, cibles, mots-clés), pour ne pas les perdre avant l'implémentation côté moteur. **Rien ci-dessous n'est encore câblé dans `spellcraft-prototype.html`** — uniquement dans l'éditeur pour l'instant.

**Règle générale de ciblage (important, pas encore appliquée dans le moteur) :** pour toute carte qui a besoin d'une cible, si aucune cible valable n'existe (ou si la sélection "Exactement X" ne peut pas être remplie), **la carte ne peut pas être jouée du tout** — ce n'est pas un échec partiel à la résolution, c'est un blocage en amont, au même titre que ne pas avoir assez de mana. Il faudra vérifier la disponibilité de cibles valables AVANT de permettre de jouer la carte, pas après.

**Règle "Regarder" (discover) :** une carte "regardée" depuis le deck, la défausse, ou la main d'un joueur est **toujours retirée de sa zone d'origine**, peu importe où elle finit ensuite (main, jeu...). On ne copie jamais la carte — elle change de zone, elle n'existe jamais à deux endroits en même temps.

**Cas particulier de la règle générale de ciblage :** si un effet "Regarder N cartes" porte sur une zone qui contient moins de N cartes (ex : regarder 3 cartes de la défausse alors qu'il n'y en a que 2, ou 0), l'effet ne peut pas se jouer — même conséquence que l'absence de cible valable : la carte entière ne peut pas être jouée.

**Sous-type vide :** dans une condition/cible qui filtre par sous-type, laisser le champ vide signifie "sans sous-type" (aucun sous-type sur la carte), pas "n'importe quel sous-type".

**Mot-clé Protection retiré**, remplacé par Protecteur (ne peut pas attaquer), qui n'a aucun rapport avec l'ancien Protection (ne peut pas être ciblée par un sort).

**"Mal d'invocation"** est le nom officiel donné à la règle déjà existante (créature sans Charge ne peut pas agir le tour où elle arrive) — reste une règle automatique, pas un mot-clé à cocher sur une carte ; a seulement besoin d'une vraie animation (Zzz).

**Sacrifice en tant qu'effet** (`sacrificeEffect`) est distinct du coût additionnel "sacrifier une créature" pour jouer une carte — l'un est un coût à payer avant de jouer la carte, l'autre est une conséquence de la capacité elle-même une fois déclenchée.

**À faire côté moteur (pas encore fait) :** `spellcraft-prototype.html` a encore toute la logique mécanique de l'ancien mot-clé Protection (y compris une carte de démonstration, "Garde Protégée", qui l'utilise) — à retirer/remplacer par Protecteur et Toxique quand on câblera les mots-clés côté moteur. Idem pour tous les autres points listés ci-dessus : rien de tout ça n'est encore interprété par le moteur, uniquement configurable dans l'éditeur.
