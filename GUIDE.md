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

Sur le téléphone tu as : les scores (±1), le tour, le mur des cartes, et pendant
une épreuve **la réponse et le secret des mimes sous les yeux** (le public ne
voit rien !), le chrono, l'indice de triche, la validation réussi/raté, etc.
Le clavier de l'ordinateur continue de fonctionner en parallèle.

> La connexion passe par internet (WebRTC). Si le Wi-Fi du centre est capricieux,
> le partage de connexion du téléphone vers l'ordinateur marche très bien aussi.

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
