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
- **1 seul exemplaire** pour les cartes portant le super-type **Légendaire** (case à cocher dans l'éditeur, indépendante de la rareté).
- La rareté **Basique** ne bénéficie d'aucun passe-droit particulier : elle reste soumise aux mêmes règles de classe et de copies que n'importe quelle autre rareté. C'est une catégorie de rareté comme les autres (voir 3.3), pas un pool universel indépendant du deck.

**Limites sur le plateau (en partie) :**
- **8 créatures maximum** simultanément sur le champ de bataille d'un joueur.
- **2 artefacts maximum** simultanément en jeu pour un joueur.

---

## 3. Les six types de cartes

| Type | Coût de mana | Statistiques | Comportement |
|---|---|---|---|
| **Héros** | Aucun | PV | Toujours en jeu dès le début de la partie. Porte la classe du deck, peut avoir des capacités (y compris activées). |
| **Région** | Aucun | — | Toujours en jeu dès le début. Définit la **règle de mana** du deck (remplace ou modifie le gain normal). Peut aussi avoir des capacités. |
| **Créature** | Oui | Force / Endurance | Peut attaquer, bloquer, mourir. Porte la majorité des mots-clés de combat (voir la section 7). |
| **Artefact** | Oui | Usure (charges) | Reste en jeu, s'épuise après N utilisations si limité. |
| **Sortilège** | Oui | — | Effet immédiat à la résolution, puis va en défausse. |
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

---

## 4. Les ressources : trois types de mana

1. **Mana normal** — gagné automatiquement chaque tour (sauf règle de Région différente). Se réinitialise chaque tour. **Dépensé en premier.**
2. **Mana fragile** — obtenu via un effet ponctuel. Reste disponible tant qu'il n'est pas dépensé (ne se réinitialise pas, ne se perd pas en fin de tour). **Dépensé en second**, après le mana normal.
3. **Mana vide** — augmente le mana **maximum** du joueur, mais pas le mana disponible ce tour-ci. Se comporte ensuite comme du mana normal les tours suivants (fait partie du total rechargé chaque tour). **Dépensé en dernier** parmi les mana disponibles au moment de payer un coût, si un choix doit être fait.

> **Point à trancher :** Le mana vide, une fois gagné, augmente-t-il le max *pour toujours*, ou seulement le temps de la partie en cours (ce qui est de toute façon le cas, aucune persistance entre parties) ? Je pars du principe qu'il s'ajoute au maximum de façon permanente pour le reste de la partie.

---

## 5. Structure d'un tour

1. **Début de tour** (dans cet ordre)
   - Les mots-clés temporaires (« ce tour-ci ») de vos créatures sont purgés.
   - Application de la règle de mana de la Région (gain normal, ou règle alternative), puis déclenchement des capacités "Quand vous gagnez un point de mana".
   - Déclenchement des capacités "Au début de votre tour".
   - Les cooldowns des capacités activées diminuent de 1.
   - Pioche d'une carte.
   - Le mal d'invocation de vos créatures prend fin ; les statuts « a déjà attaqué » et « a déjà bloqué » sont réinitialisés. (Gel et Étourdissement ne se terminent pas ici : voir la section 6.)

2. **Phase principale**
   - Jouer des cartes (Créatures, Sortilèges, Artefacts, Pièges) en payant leur coût.
   - Activer des capacités activées (mana + coût additionnel éventuel).
   - Déclenchement des capacités "Quand cette carte entre en jeu" (Début) à la pose.

3. **Phase de combat**
   - Chaque créature non étourdie, non gelée, sans Protecteur et n'ayant pas le mal d'invocation (sauf **Charge**) peut attaquer une fois.
   - Voir Section 6 pour le détail du combat, et la Section 7 pour les règles complètes des créatures.

4. **Fin de tour** (dans cet ordre)
   - Déclenchement des capacités "À la fin de votre tour".
   - Les bonus de Force/Endurance « jusqu'à la fin du tour » arrivent à échéance.
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
   - si l'attaquant a **Envol**, le bloqueur doit avoir **Envol** ou **Portée**.
   - Un attaquant peut être bloqué par **plusieurs** bloqueurs. Le mal d'invocation n'empêche pas de bloquer.
4. **Résolution des dégâts** — **Chaque combat est résolu immédiatement**, au moment où le bloqueur est assigné (il n'y a pas de résolution simultanée à la fin du blocage) :
   - Attaquant bloqué : l'attaquant et le bloqueur s'infligent mutuellement des dégâts égaux à leur Force. Avec plusieurs bloqueurs, l'attaquant inflige **toute** sa Force à **chaque** bloqueur, et chaque bloqueur inflige la sienne à l'attaquant : chaque bloqueur subit donc un combat complet.
   - **Initiative** : si une seule des deux créatures a Initiative, elle frappe en premier ; si sa cible survit, elle riposte, sinon elle ne subit aucun dégât en retour. Si les deux ou aucune n'ont Initiative, les coups sont simultanés.
   - **Brutalité** : un attaquant bloqué fait passer au héros adverse l'excédent de ses dégâts par rapport aux PV restants du ou des bloqueurs (avant le coup). Détails en 7.7.
   - **Vol de vie** : la créature qui inflige des dégâts (attaque ou blocage) soigne son propre héros d'autant.
   - **Toxique** : une créature à qui une créature Toxique inflige au moins 1 dégât au combat meurt (un coup absorbé par l'Armure ou de Force 0 n'a pas cet effet).
   - **Armure** : absorbe le premier dégât positif subi, quelle qu'en soit la source, une seule fois (voir 7.7).
5. **Fin du blocage** — Quand le défenseur termine son blocage, chaque attaquant resté non bloqué inflige toute sa Force au héros adverse (et déclenche « a infligé des blessures au héros »). Les excédents de Brutalité passent alors aussi au héros.
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
| **Envol** | Ne peut être bloquée que par des créatures ayant Envol ou Portée. |
| **Portée** | Peut bloquer les créatures avec Envol sans avoir elle-même Envol. |
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
