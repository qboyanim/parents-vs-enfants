# 🎬 Parents VS Enfants — Guide du présentateur

## Lancer le jeu

**En ligne (GitHub Pages)** : ouvre l'adresse du site sur l'ordinateur relié au
vidéoprojecteur, puis `F11` pour le plein écran. Appuie sur **Espace** (ou clique)
pour commencer.

**En local (secours sans internet)** : double-clic sur **index.html** avec Chrome
ou Edge. Tout le jeu fonctionne hors ligne — seules la télécommande téléphone et
la police d'écriture demandent internet.

Vidéoprojecteur : `Touche Windows + P` → « Dupliquer ».

## 📱 Télécommande sur téléphone

Tu peux piloter TOUT le jeu depuis ton téléphone pendant que le grand écran est projeté :

1. Sur le grand écran, un **code à 4 lettres** s'affiche en bas à droite de
   l'écran titre (et dans la barre de régie : `📱 XXXX`).
2. Sur ton téléphone, ouvre **`telecommande.html`** (même adresse que le site,
   en ajoutant `/telecommande.html`).
3. Entre le code → connecté ! (`📱✔` apparaît à côté du code sur l'écran)

Sur le téléphone tu as deux onglets :

**🎮 Jeu** : les scores (±1), le tour, le mur des cartes, et pendant une épreuve
**la réponse et le secret des mimes sous les yeux** (le public ne voit rien !),
le chrono, l'indice de triche, la validation réussi/raté, etc.
Le clavier de l'ordinateur continue de fonctionner en parallèle.

**🗂 Cartes** : le contenu de toutes les cartes, modifiable depuis le téléphone,
trié par public — 🧒 Enfants / 🧑 Parents / 👥 Communes (les enfants ne tombent
que sur le contenu enfants, les parents sur le contenu parents ; les communes
font jouer tout le monde). Touche une carte pour modifier :

- son **type d'épreuve** (question, mime, blind test, bonus, vidéo…) — chaque
  case peut être transformée en n'importe quel type ;
- ses **points**, sa **perte si raté**, son **chrono** ;
- sa question, sa réponse, son indice, son secret de mime ;
- ses **propositions Duo/Carré/Cash** (voir plus bas) ;
- ses **médias** : colle un lien YouTube, ou touche « 📂 PC » → un gros bouton
  apparaît sur le grand écran pour choisir un fichier musique/vidéo de
  l'ordinateur (stocké dans le navigateur, il survit au rechargement).

Puis « 💾 Enregistrer » : le changement est **appliqué immédiatement** et
**sauvegardé sur l'ordinateur**. « ⬇ Télécharger la sauvegarde » te donne un
fichier `cartes.js` prêt à remettre dans le projet pour rendre les modifications
définitives, et « ↩ Rétablir » annule toutes les modifications.

### 💾 Mes jeux (plusieurs configurations)

En bas de l'onglet Cartes : personnalise tes cartes, donne un nom à ta config
(« Maternelles », « Ados », « Veillée Halloween »…) et « 💾 Enregistrer ».
Tu peux créer autant de jeux que tu veux et **lancer celui qui correspond à ton
public** avec « ▶ Lancer ». Les jeux sont stockés sur l'ordinateur de l'écran.

## 🎯 Duo / Carré / Cash

Les questions qui ont des « propositions » déclenchent le choix mythique :
l'équipe annonce **DUO** (2 choix, moitié des points), **CARRÉ** (4 choix,
points normaux) ou **CASH** (sans aide, points doublés !). Choisis le mode avec
les touches `1`/`2`/`3`, un clic sur les boutons de l'écran, ou depuis le
téléphone. `R` révèle la réponse et surligne la bonne proposition.

## 🎵 Pendant les blind tests (télécommande)

Dès qu'une carte a une musique ou une vidéo, la télécommande affiche :

- **la vitesse de lecture** : 3 ralentis (🐌 ×0.25 / ×0.5 / ×0.75), normal (×1)
  et 3 accélérés (⚡ ×1.25 / ×1.5 / ×2). Effet garanti sur un blind test !
  Un badge s'affiche sur le grand écran et les vinyles tournent à la bonne
  vitesse. Tout revient à la normale à la carte suivante.
- **🎤 « Le public chante ! »** : deux boutons +1 (Enfants / Parents) pour
  récompenser la salle quand elle chante — applaudissements, toast à l'écran
  et point ajouté en direct.

## 🎶 Double blind test

Le type « Double blind test » joue **deux musiques en même temps** — il faut
trouver les deux titres ! La carte **19** en est un (We Will Rock You +
Macarena, prête à jouer). Remplis `musique` + `musique2` (fichiers ou 📂 PC)
ou `youtube` + `youtube2` (deux clips côte à côte, cachés par des rideaux).
`M` lance/met en pause les deux **au même volume**. Quand une équipe trouve
UNE des deux musiques, révèle-la individuellement : bouton « 👁 Révéler
musique 1 / 2 » sur le téléphone, ou clic sur son rideau à l'écran. `R`
révèle tout d'un coup.

## 🎵 Blind tests préremplis

Tous les blind tests ont déjà un clip YouTube vérifié (image cachée par le
rideau, seul le son joue) — modifie les liens dans l'onglet 🗂 Cartes pour
créer tes variantes :

| Carte | 🧒 Enfants (6-12 ans) | 🧑 Parents (25-45 ans) |
|---|---|---|
| 3 | Libérée, Délivrée (La Reine des Neiges) | I Will Survive — Gloria Gaynor |
| 7 | Générique Pokémon | Les Démons de Minuit — Images |
| 14 | Happy — Pharrell Williams | Freed from Desire — Gala |
| 19 | Double : We Will Rock You + Macarena (commun) | |
| 26 | Générique Miraculous | Mistral Gagnant — Renaud |
| 32 | Petit Génie — Jungeli | Moi… Lolita — Alizée |
| 35 | Ce rêve bleu (Aladdin) | Envole-moi — J.-J. Goldman |
| 39 | Just Dance : Waka Waka (commun, tout le monde danse !) | |

## 🕹 Musique d'ambiance

Une petite boucle arcade douce (générée par l'appli, volume bas) joue sur
l'écran titre et le mur de cartes, avec fondu d'entrée et de sortie — elle
s'efface automatiquement pendant les épreuves et les défis surprise.

## 🔒 Suspense final : les scores secrets

Quand il ne reste plus que **10 cartes**, une bannière annonce « 🔒 SCORES
SECRETS JUSQU'À LA FIN ! » et les scores affichés au public deviennent
**« ??? »** — plus personne ne sait qui mène jusqu'à l'écran de victoire, qui
révèle enfin les vrais chiffres. Les gains (+2, −1…) continuent de s'afficher
en animation : les équipes savent ce qu'elles marquent, mais plus où elles en
sont !

**Toi, tu vois toujours les vrais scores** sur la télécommande (avec un rappel
« le public voit ??? »), et tu peux toujours les corriger avec les ±1.

Pour changer le seuil ou désactiver : champ `scoresSecretsDernieresCartes` en
haut de `cartes.js` (mets `0` pour ne jamais cacher les scores).

## Autres raccourcis utiles

- `H` (ou « 🎲 Carte au hasard » sur le téléphone) : tire une carte au hasard
  quand les équipes n'arrivent pas à se décider.
- Le mur affiche le **nombre de cartes restantes** ; quand la dernière carte
  est jouée, l'écran de victoire se lance tout seul.

## 🔊 Bruit-o-mètre : qui commence ?

Pour lancer la soirée : touche `B` (ou « 🔊 Bruit-o-mètre » sur le téléphone).
L'écran affiche deux grandes jauges — **l'équipe qui crie le plus fort gagne
le droit de commencer la partie !**

1. Au premier lancement, **autorise le micro** sur l'ordinateur (le navigateur
   le demande une seule fois).
2. Depuis le téléphone, choisis qui crie en premier : « 🎤 Les ENFANTS
   crient ! » ou « 🎤 Les PARENTS crient ! » (tu choisis l'ordre — touches
   `E` / `P` au clavier aussi).
3. 3… 2… 1… **CRIEZ !** — 10 secondes de mesure, la jauge monte en direct
   avec le bruit (et tremble quand ça hurle vraiment).
4. Suspense : roulement de tambour, la jauge **se remplit à fond toute
   seule**… puis retombe en rebondissant sur le vrai score !
5. Quand les deux équipes ont crié : couronne 👑 sur la plus bruyante, et
   **c'est elle qui commence** (le tour est réglé automatiquement). Referme
   le bruit-o-mètre (`B`, `Échap` ou le bouton) et c'est parti.

En cas d'égalité parfaite, **les enfants gagnent automatiquement** (avantage
aux petits !). Tu peux aussi refaire crier une équipe (son score est remplacé).

## 🥁 Défi surprise

À TOUT MOMENT de la soirée : touche `S` (ou le gros bouton « 🥁 DÉFI SURPRISE »
du téléphone) → roulement de tambour, l'écran tremble… et PAF, un défi surprise
tiré au hasard s'affiche avec Lilou ! Le défi reste affiché jusqu'à ce que tu
rappuies sur `S` (ou le bouton) — le jeu reprend exactement où il en était.

**Modifier les défis** : onglet 🗂 Cartes du téléphone, section « 🥁 Défis
surprise ». Tu peux réécrire chaque défi, en supprimer (🗑), en ajouter
(➕) puis « 💾 Enregistrer ». Comme les cartes, ils sont sauvegardés sur
l'ordinateur, enregistrés avec tes jeux nommés et inclus dans le fichier
`cartes.js` téléchargé. (Ils restent aussi modifiables directement dans
`cartes.js`, champ `defisSurprise`.)

> La connexion passe par un relais internet (MQTT) : peu importe que le téléphone
> soit en 4G et l'ordinateur en Wi-Fi, il faut juste que les deux aient internet.
> L'écran et le téléphone se reconnectent tout seuls en cas de coupure.

## 🕺 Vidéos Just Dance

La carte **39** est une épreuve vidéo : colle un lien YouTube de Just Dance
(depuis l'onglet 🗂 Cartes du téléphone, champ « Lien YouTube », ou dans
`cartes.js`) et la vidéo s'affiche en grand sur l'écran. Touche `M` (ou le
bouton ▶⏸ du téléphone) pour lancer / mettre en pause. Tout le monde danse,
et tu donnes les points à l'équipe la plus motivée !

Pour ajouter d'autres épreuves vidéo : dans `cartes.js`, mets `type: "video"`
sur une carte et un champ `youtube:` (lien YouTube) ou `video:` (fichier local
dans un dossier `videos/`).

## Déroulement d'un tour

1. Le bandeau du haut indique **quelle équipe joue** (panneau qui brille + « À VOUS DE JOUER »).
2. L'équipe choisit un numéro → **clique sur la carte** (ou tape le numéro puis `Entrée`).
3. La carte se retourne et l'épreuve s'affiche, **adaptée automatiquement à l'équipe**.
4. Tu animes l'épreuve, puis tu valides :
   - `O` = réussi ✔ (les points sont ajoutés avec l'animation)
   - `N` = raté ✘
   - Pour les épreuves **communes** (questions diaboliques, blind tests géants, défis) :
     `E` = les Enfants gagnent, `P` = les Parents gagnent, `N` = personne.
5. Retour automatique au mur, l'autre équipe joue.

## Raccourcis clavier (les indispensables)

| Touche | Action |
|---|---|
| `R` | Révéler la réponse |
| `I` | Faire apparaître l'indice de triche (discret ou flash selon la carte) |
| `T` | Lancer / pauser le chrono — `Maj+T` remise à zéro |
| `O` / `N` | Réussi / Raté |
| `E` / `P` | Épreuve commune : victoire Enfants / Parents |
| `V` (maintenir) | 🤫 Voir le secret d'un mime (petit encart en bas à gauche) |
| `M` | Musique du blind test : lecture / pause |
| `C` | Changer d'équipe manuellement |
| `F` | Écran de victoire finale (confettis !) |
| `Échap` | Quitter une épreuve sans valider (la carte redevient disponible) |
| `?` | Aide à l'écran |

**Barre de régie** : amène la souris **tout en bas de l'écran** → une barre de gros
boutons apparaît (points manuels ±1, changement de tour, nouvelle partie…).
Elle se cache toute seule. Le public ne la voit jamais si tu n'y vas pas.

## Les mimes secrets (cartes 11 et 28)

Le public voit seulement « 🎭 QUI EST-CE ? ». Toi seul peux voir le nom :
maintiens `V`, un petit encart apparaît en bas à gauche. Montre-le discrètement
à la personne qui va mimer (ou chuchote-lui), puis relâche `V`.

⚠️ **Avant la soirée** : ouvre `cartes.js` et remplace les noms d'animateurs
placeholder des cartes **11** et **28** par les vrais prénoms de ton centre.

## La triche (questions diaboliques 😈)

Les deux équipes reçoivent la même question difficile. Appuie sur `I` :
un indice **discret** apparaît quelque part en bas de l'écran (ou flashe
2 secondes selon la carte). À toi de jouer avec : « Regardez bien l'écran… 👀 ».
La carte 23 contient un **faux indice volontairement inutile**. 😈

## Bonus et malus

Ils s'appliquent automatiquement (vol de points, jackpot, −2…) avec animations.
Les effets « prochaine épreuve » apparaissent en **badge** sous le score de
l'équipe (✨x2, 🤐, 🔁…). Un badge se consomme tout seul au bon moment ;
tu peux aussi **cliquer dessus** pour le retirer manuellement.

## Personnaliser le contenu

Tout le contenu est dans **`cartes.js`** (ouvrable avec le Bloc-notes) :
questions, réponses, mimes, indices, points, chronos… La structure est
expliquée en commentaires en haut du fichier.

Pour les **blind tests** : dépose tes `.mp3` dans le dossier `musiques/`
et renseigne le champ `musique:` de la carte (voir `musiques/LISEZ-MOI.txt`).
Sinon, lance simplement les musiques depuis un téléphone : l'écran Blind Test
et la réponse fonctionnent quand même.

## Bon à savoir

- La partie est **sauvegardée automatiquement** : si l'ordinateur plante ou
  que la page se recharge, scores et cartes retournées sont conservés.
- « ♻ Nouvelle partie » (dans la barre de régie) remet tout à zéro.
- Les jingles sonores sont générés par l'application — pense à monter le son !
