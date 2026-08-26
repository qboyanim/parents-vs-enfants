/* ============================================================================
   PARENTS VS ENFANTS — CONTENU DES CARTES
   ============================================================================
   C'EST ICI QUE TU MODIFIES TOUT LE CONTENU DU JEU.

   Chaque carte a cette structure :

   12: {
     type: "question",          // question | triche | blindtest | mime | defi | bonus | malus | piege
     points: 2,                 // points gagnés si réussite
     perte: 0,                  // points perdus si échec (optionnel)
     timer: 20,                 // durée du chrono en secondes (optionnel)

     enfants: { ... },          // contenu si les ENFANTS retournent la carte
     adultes: { ... },          // contenu si les PARENTS retournent la carte
     commun:  { ... },          // si présent : les DEUX équipes jouent en même temps
                                // (remplace enfants/adultes)

     // À l'intérieur de enfants / adultes / commun :
     //   texte:    "La question ou la consigne affichée en grand"
     //   consigne: "Petite ligne d'explication en dessous (optionnel)"
     //   reponse:  "La réponse (révélée avec la touche R)"
     //   indice:   "🦇"        -> indice de triche discret (touche I)
     //   indiceMode: "flash"   -> l'indice apparaît 2 secondes puis disparaît
     //                            (sinon il reste affiché discrètement)
     //   secret:   "ADRIEN"    -> mime secret : le public voit "QUI EST-CE ?",
     //                            seul le présentateur voit le nom (maintenir V)
     //   musique:  "musiques/chanson.mp3"  -> fichier audio pour blind test
     //                            (mets le fichier dans le dossier musiques/)
     //   youtube:  "https://www.youtube.com/watch?v=..."  -> vidéo YouTube
     //                            affichée en grand (Just Dance, extraits…).
     //                            Touche M ou bouton 🎵 pour lancer/mettre en pause.
     //   video:    "videos/fichier.mp4"    -> vidéo locale (dossier videos/ à créer)
   }

   Le type "video" est fait pour les épreuves Just Dance : mets un lien
   YouTube de Just Dance dans le champ youtube et fais danser tout le monde !

   Le type "doubleblindtest" joue DEUX musiques EN MÊME TEMPS :
   remplis musique + musique2 (fichiers) ou youtube + youtube2 (liens).
   Il faut trouver les deux titres ! Pendant tout blind test, la télécommande
   permet de passer la musique au ralenti ou en accéléré (3 vitesses chacun),
   et d'accorder un bonus « 🎤 le public chante » (+1 point).

   DUO / CARRÉ / CASH : ajoute un champ "propositions" à une question :
     propositions: ["la BONNE réponse", "piège 1", "piège 2", "piège 3"]
   (la PREMIÈRE est toujours la bonne ; l'affichage est mélangé).
   L'équipe choisit alors son mode avant de répondre :
     DUO   (2 choix)  -> moitié des points
     CARRÉ (4 choix)  -> points normaux
     CASH  (sans aide) -> points doublés !

   Pour les BONUS / MALUS, ajoute un champ "effet" :
     effet: "double"          -> prochaine épreuve réussie = points x2 (badge x2)
     effet: "vol", valeur: 3  -> vole automatiquement 3 points à l'adversaire
     effet: "gain", valeur: 3 -> gagne directement 3 points
     effet: "perte", valeur: 2 -> perd directement 2 points
     effet: "silence"         -> badge 🤐 : prochaine épreuve sans parler
     effet: "seconde-chance"  -> badge 🔁
     (sans effet : la carte est juste annoncée, le présentateur gère)
   ============================================================================ */

const CONFIG = {

  equipes: {
    enfants: { nom: "ENFANTS", couleur: "#00d9ff", icone: "🧒" },
    adultes: { nom: "PARENTS", couleur: "#ff2e88", icone: "🧑" },
  },

  // Équipe qui commence
  premierTour: "enfants",

  // 🎉 DÉFIS SURPRISE — déclenchés à tout moment par le bouton de la
  // télécommande (ou la touche S) : roulement de tambour… et PAF !
  // Un défi est tiré au hasard dans cette liste. Modifie-la librement.
  defisSurprise: [
    "Tout le monde debout ! 30 secondes de danse des canards, MAINTENANT ! 🦆",
    "Le premier qui apporte un objet ROUGE au présentateur gagne 1 point pour son équipe !",
    "STATUE ! Plus personne ne bouge… Le premier qui bouge fait perdre 1 point à son équipe !",
    "Concours de cri de dinosaure : un volontaire par équipe. Le public vote par applaudissements ! 🦖",
    "Tout le monde échange sa place avec quelqu'un de l'AUTRE équipe. Vous avez 10 secondes !",
    "Les parents font 10 flexions en criant « LES ENFANTS SONT LES MEILLEURS » ! 💪",
    "Silence absolu chez les enfants pendant 20 secondes. Réussi = +2 points ! 🤫",
    "Battle de blagues : un volontaire par équipe. La meilleure blague gagne 1 point ! 🎤",
    "Toute la salle imite une poule jusqu'à ce que le présentateur crie STOP ! 🐔",
    "LA OLA ! Toute la salle fait la ola 3 fois de suite, sinon tout le monde perd 1 point ! 🌊",
    "Chaque équipe fait un câlin collectif géant. L'équipe la plus rapide gagne 1 point ! 🤗",
    "Le premier qui trouve quelqu'un avec des chaussettes dépareillées gagne 1 point ! 🧦",
  ],

  // ⚠️ REMPLACE CES PRÉNOMS par ceux des animateurs de ton centre !
  // (utilisés dans les cartes 11 et 28)

  cartes: {

    /* ------------------------------------------------------------ QUESTIONS */

    1: {
      type: "question", points: 2, timer: 20,
      enfants: {
        texte: "Combien de pattes possède une araignée ?",
        reponse: "8 pattes",
        propositions: ["8", "6", "10", "4"],
      },
      adultes: {
        texte: "En quelle année l'Homme a-t-il marché sur la Lune pour la première fois ?",
        reponse: "1969",
        propositions: ["1969", "1965", "1972", "1958"],
      },
    },

    5: {
      type: "question", points: 2, timer: 20,
      enfants: {
        texte: "Quel est le plus grand océan du monde ?",
        reponse: "L'océan Pacifique",
        propositions: ["L'océan Pacifique", "L'océan Atlantique", "L'océan Indien", "L'océan Arctique"],
      },
      adultes: {
        texte: "Combien de temps met la lumière du Soleil pour arriver jusqu'à la Terre ?",
        reponse: "Environ 8 minutes",
        propositions: ["Environ 8 minutes", "Environ 8 secondes", "Environ 8 heures", "Environ 1 jour"],
      },
    },

    9: {
      type: "question", points: 2, timer: 20,
      enfants: {
        texte: "Comment s'appelle le poisson bleu qui perd la mémoire dans « Le Monde de Nemo » ?",
        reponse: "Dory",
        propositions: ["Dory", "Marin", "Bulle", "Perla"],
      },
      adultes: {
        texte: "Quelle est la monnaie utilisée au Japon ?",
        reponse: "Le yen",
        propositions: ["Le yen", "Le yuan", "Le won", "Le baht"],
      },
    },

    20: {
      type: "question", points: 2, timer: 30,
      enfants: {
        texte: "Combien y a-t-il de minutes dans une heure et demie ?",
        reponse: "90 minutes",
        propositions: ["90 minutes", "60 minutes", "120 minutes", "80 minutes"],
      },
      adultes: {
        texte: "Citez 5 pays qui ont une frontière avec la France.",
        consigne: "En 30 secondes chrono !",
        reponse: "Espagne, Italie, Suisse, Allemagne, Belgique, Luxembourg, Monaco, Andorre…",
      },
    },

    24: {
      type: "question", points: 2, timer: 20,
      enfants: {
        texte: "De quelle couleur est le sang du poulpe ?",
        reponse: "Bleu !",
        propositions: ["Bleu", "Rouge", "Vert", "Transparent"],
      },
      adultes: {
        texte: "Combien d'os possède (environ) le corps humain adulte ?",
        reponse: "206 os",
        propositions: ["206", "186", "226", "156"],
      },
    },

    29: {
      type: "question", points: 2, timer: 20,
      enfants: {
        texte: "Quelle planète est la plus proche du Soleil ?",
        reponse: "Mercure",
        propositions: ["Mercure", "Vénus", "Mars", "La Terre"],
      },
      adultes: {
        texte: "En quelle année la première Game Boy est-elle sortie ?",
        consigne: "À 2 ans près !",
        reponse: "1989 (1990 en France)",
        propositions: ["1989", "1985", "1992", "1995"],
      },
    },

    /* ------------------------------ QUESTIONS DIABOLIQUES (avec triche 🕵️) */
    /* Les deux équipes jouent en même temps. Un indice discret peut
       apparaître à l'écran avec la touche I. Première équipe qui trouve ! */

    4: {
      type: "triche", points: 3, timer: 30,
      commun: {
        texte: "Quel est le seul mammifère capable de voler ?",
        consigne: "Les deux équipes jouent ! Ouvrez l'œil… 👀",
        reponse: "La chauve-souris 🦇",
        indice: "🦇",
      },
    },

    10: {
      type: "triche", points: 3, timer: 30,
      commun: {
        texte: "Combien de cœurs possède une pieuvre ?",
        consigne: "Les deux équipes jouent ! Un indice se cache peut-être…",
        reponse: "3 cœurs ❤️❤️❤️",
        indice: "❤️❤️❤️",
      },
    },

    17: {
      type: "triche", points: 3, timer: 30,
      commun: {
        texte: "Combien de dents possède un adulte, dents de sagesse comprises ?",
        consigne: "Les deux équipes jouent !",
        reponse: "32 dents",
        indice: "🦷 32",
        indiceMode: "flash",
      },
    },

    23: {
      type: "triche", points: 3, timer: 30,
      commun: {
        texte: "Qui a inventé l'ampoule électrique ?",
        consigne: "Les deux équipes jouent ! (l'indice est peut-être… inutile)",
        reponse: "Thomas Edison",
        // Faux indice volontairement inutile 😈
        indice: "💡 Il avait deux oreilles.",
      },
    },

    30: {
      type: "triche", points: 3, timer: 30,
      commun: {
        texte: "Quel pays a offert la Statue de la Liberté aux États-Unis ?",
        consigne: "Les deux équipes jouent !",
        reponse: "La France 🇫🇷",
        indice: "🥖",
      },
    },

    37: {
      type: "triche", points: 3, timer: 30,
      commun: {
        texte: "Quel est l'animal le plus rapide du monde ?",
        consigne: "Attention, ce n'est pas le guépard… Les deux équipes jouent !",
        reponse: "Le faucon pèlerin (plus de 300 km/h en piqué !)",
        indice: "🦅",
        indiceMode: "flash",
      },
    },

    /* ------------------------------------------------------------ BLIND TESTS */
    /* 🎵 Pour chaque blind test :
       - soit tu mets un fichier .mp3 dans le dossier musiques/ et tu remplis
         le champ musique: "musiques/moN-fichier.mp3" (touche M pour jouer)
       - soit tu lances la musique toi-même (téléphone, YouTube…)
       La "reponse" est révélée avec la touche R.
       Les titres ci-dessous sont des SUGGESTIONS : personnalise-les ! */

    3: {
      type: "blindtest", points: 2, timer: 30,
      enfants: {
        texte: "Quel est ce titre, et de quel film vient-il ?",
        consigne: "Levez la main dès que vous savez !",
        reponse: "Libérée, Délivrée — La Reine des Neiges",
        // musique: "musiques/carte03-enfants.mp3",
      },
      adultes: {
        texte: "Qui chante cette chanson ?",
        consigne: "Levez la main dès que vous savez !",
        reponse: "I Will Survive — Gloria Gaynor",
        // musique: "musiques/carte03-adultes.mp3",
      },
    },

    7: {
      type: "blindtest", points: 2, timer: 30,
      enfants: {
        texte: "De quel dessin animé vient ce générique ?",
        reponse: "Pokémon",
        // musique: "musiques/carte07-enfants.mp3",
      },
      adultes: {
        texte: "Quel est ce tube des années 80 ?",
        reponse: "Les Démons de Minuit — Images",
        // musique: "musiques/carte07-adultes.mp3",
      },
    },

    14: {
      type: "blindtest", points: 2, timer: 30,
      enfants: {
        texte: "Quel est ce titre que tout le monde connaît ?",
        reponse: "Happy — Pharrell Williams",
        // musique: "musiques/carte14-enfants.mp3",
      },
      adultes: {
        texte: "Qui chante cette chanson des années 90 ?",
        reponse: "Freed from Desire — Gala",
        // musique: "musiques/carte14-adultes.mp3",
      },
    },

    19: {
      type: "doubleblindtest", points: 3, timer: 45,
      commun: {
        texte: "DOUBLE BLIND TEST ! 🎵🎵",
        consigne: "DEUX musiques jouent EN MÊME TEMPS… Trouvez les deux titres ! Les deux équipes jouent.",
        reponse: "Musique 1 : We Will Rock You — Queen • Musique 2 : Happy — Pharrell (à personnaliser !)",
        // Mets tes deux musiques (fichiers, boutons 📂 PC, ou liens YouTube) :
        // musique: "musiques/carte19-musique1.mp3",
        // musique2: "musiques/carte19-musique2.mp3",
        // youtube: "",
        // youtube2: "",
      },
    },

    26: {
      type: "blindtest", points: 2, timer: 30,
      enfants: {
        texte: "De quel dessin animé vient cette musique ?",
        reponse: "Naruto (à personnaliser selon vos enfants !)",
        // musique: "musiques/carte26-enfants.mp3",
      },
      adultes: {
        texte: "Qui chante cette chanson française culte ?",
        reponse: "Mistral Gagnant — Renaud",
        // musique: "musiques/carte26-adultes.mp3",
      },
    },

    32: {
      type: "blindtest", points: 2, timer: 30,
      enfants: {
        texte: "Quel est ce titre du moment ?",
        consigne: "Une chanson que les enfants adorent en ce moment (à personnaliser !)",
        reponse: "À personnaliser dans cartes.js 😉",
        // musique: "musiques/carte32-enfants.mp3",
      },
      adultes: {
        texte: "Qui chante ce tube des années 2000 ?",
        reponse: "Moi… Lolita — Alizée (à personnaliser !)",
        // musique: "musiques/carte32-adultes.mp3",
      },
    },

    35: {
      type: "blindtest", points: 2, timer: 30,
      enfants: {
        texte: "De quel film vient cette chanson ?",
        reponse: "Les Minions / Moi, Moche et Méchant",
        // musique: "musiques/carte35-enfants.mp3",
      },
      adultes: {
        texte: "Qui chante cette chanson française ?",
        reponse: "Envole-moi — Jean-Jacques Goldman",
        // musique: "musiques/carte35-adultes.mp3",
      },
    },

    39: {
      type: "video", points: 3, timer: 0,
      commun: {
        texte: "JUST DANCE ! 🕺💃",
        consigne: "Tout le monde debout ! Les deux équipes dansent en même temps — l'équipe la plus motivée gagne les points.",
        // ⚠️ Colle ici le lien YouTube du Just Dance de ton choix
        // (modifiable aussi depuis l'onglet Cartes de la télécommande) :
        youtube: "",
        reponse: "L'équipe qui a mis le plus d'ambiance gagne !",
      },
    },

    /* ------------------------------------------------------------ MIMES 🎭 */

    2: {
      type: "mime", points: 2, timer: 60,
      enfants: {
        texte: "Mimez un parent qui marche sur un LEGO pieds nus.",
        consigne: "Un enfant mime, son équipe devine. Interdit de parler !",
        reponse: "Marcher sur un Lego",
      },
      adultes: {
        texte: "Mimez quelqu'un qui découvre le prix de son plein d'essence.",
        consigne: "Un parent mime, son équipe devine. Interdit de parler !",
        reponse: "Le prix du plein d'essence",
      },
    },

    6: {
      type: "mime", points: 2, timer: 60,
      enfants: {
        texte: "Mimez un animateur qui compte les enfants avant de partir… et qui n'arrive jamais au même nombre.",
        consigne: "Un enfant mime, son équipe devine !",
        reponse: "L'animateur qui compte les enfants",
      },
      adultes: {
        texte: "Mimez quelqu'un qui cherche ses lunettes… alors qu'elles sont sur sa tête.",
        consigne: "Un parent mime, son équipe devine !",
        reponse: "Chercher ses lunettes (sur sa tête)",
      },
    },

    11: {
      type: "mime", points: 3, timer: 60,
      // 🤫 MIME SECRET : le public voit seulement "QUI EST-CE ?"
      // Le présentateur maintient la touche V pour voir le nom en bas à gauche,
      // et le montre discrètement au parent qui va mimer.
      adultes: {
        texte: "🎭 QUI EST-CE ?",
        consigne: "Un parent imite un animateur du centre… Les enfants doivent deviner QUI c'est !",
        secret: "ANIMATEUR MYSTÈRE N°1 — ⚠️ remplace ce texte par un prénom dans cartes.js (carte 11)",
        reponse: "C'était… (le prénom de l'animateur !)",
      },
      enfants: {
        texte: "🎭 QUI EST-CE ?",
        consigne: "Un enfant imite un animateur du centre… Les parents doivent deviner QUI c'est !",
        secret: "ANIMATEUR MYSTÈRE N°1 — ⚠️ remplace ce texte par un prénom dans cartes.js (carte 11)",
        reponse: "C'était… (le prénom de l'animateur !)",
      },
    },

    16: {
      type: "mime", points: 2, timer: 60,
      enfants: {
        texte: "Mimez un animateur qui essaye de faire ranger la salle.",
        consigne: "Un enfant mime, son équipe devine !",
        reponse: "L'animateur qui fait ranger la salle",
      },
      adultes: {
        texte: "Mimez quelqu'un qui monte un meuble suédois sans regarder la notice.",
        consigne: "Un parent mime, son équipe devine !",
        reponse: "Monter un meuble sans la notice",
      },
    },

    22: {
      type: "mime", points: 2, timer: 60,
      enfants: {
        texte: "Mimez quelqu'un qui essaye de faire un créneau pendant que tout le monde regarde.",
        consigne: "Un enfant mime, son équipe devine !",
        reponse: "Le créneau sous pression",
      },
      adultes: {
        texte: "Mimez un animateur qui entend « J'ai envie de faire pipi » au pire moment possible.",
        consigne: "Un parent mime, son équipe devine !",
        reponse: "« J'ai envie de faire pipi ! »",
      },
    },

    28: {
      type: "mime", points: 3, timer: 60,
      adultes: {
        texte: "🎭 QUI EST-CE ?",
        consigne: "Un parent imite quelqu'un du centre… Les enfants doivent deviner QUI c'est !",
        secret: "LE DIRECTEUR / LA DIRECTRICE — ⚠️ remplace par un prénom dans cartes.js (carte 28)",
        reponse: "C'était… (le prénom !)",
      },
      enfants: {
        texte: "🎭 QUI EST-CE ?",
        consigne: "Un enfant imite quelqu'un du centre… Les parents doivent deviner QUI c'est !",
        secret: "LE DIRECTEUR / LA DIRECTRICE — ⚠️ remplace par un prénom dans cartes.js (carte 28)",
        reponse: "C'était… (le prénom !)",
      },
    },

    31: {
      type: "mime", points: 2, timer: 60,
      enfants: {
        texte: "Mimez un chat qui a décidé de réveiller son humain à 4 heures du matin.",
        consigne: "Un enfant mime, son équipe devine !",
        reponse: "Le chat de 4h du matin",
      },
      adultes: {
        texte: "Mimez un inspecteur des impôts qui découvre une erreur dans votre déclaration.",
        consigne: "Un parent mime, son équipe devine !",
        reponse: "L'inspecteur des impôts",
      },
    },

    38: {
      type: "mime", points: 2, timer: 60,
      enfants: {
        texte: "Mimez un animateur qui découvre que tous les jeux ont été ressortis… juste après le rangement.",
        consigne: "Un enfant mime, son équipe devine !",
        reponse: "Les jeux ressortis après le rangement",
      },
      adultes: {
        texte: "Mimez le directeur quand il entend « C'est pas moi ! » pour la dixième fois de la journée.",
        consigne: "Un parent mime, son équipe devine !",
        reponse: "« C'est pas moi ! »",
      },
    },

    /* ------------------------------------------------------------ DÉFIS 💪 */

    13: {
      type: "defi", points: 2, timer: 30,
      commun: {
        texte: "DUEL DE GRIMACES ! 😜",
        consigne: "Un enfant contre un parent, face à face. Le premier qui rit a perdu. Grimaces autorisées, chatouilles interdites !",
        reponse: "Victoire au plus impassible !",
      },
    },

    36: {
      type: "defi", points: 3, timer: 60,
      commun: {
        texte: "L'ÎLE DÉSERTE ! 🏝️",
        consigne: "Chaque équipe doit faire tenir le plus de monde possible sur une feuille de journal pendant 10 secondes. L'équipe qui en met le plus gagne !",
        reponse: "L'équipe la plus serrée gagne !",
      },
    },

    /* ------------------------------------------------------------ BONUS 🎁 */

    8: {
      type: "bonus", effet: "double",
      commun: {
        texte: "DOUBLE POINTS ! ✨",
        consigne: "Votre prochaine épreuve réussie vaudra le DOUBLE de points !",
      },
    },

    15: {
      type: "bonus", effet: "vol", valeur: 3,
      commun: {
        texte: "VOL DE POINTS ! 🦝",
        consigne: "Vous volez 3 points à l'équipe adverse. Et hop, dans la poche !",
      },
    },

    21: {
      type: "bonus", effet: "choix",
      commun: {
        texte: "CHOIX DE L'ADVERSAIRE ! 🎯",
        consigne: "C'est VOUS qui choisirez la prochaine carte de l'équipe adverse. Choisissez bien… ou mal ! 😈",
      },
    },

    33: {
      type: "bonus", effet: "seconde-chance",
      commun: {
        texte: "SECONDE CHANCE ! 🔁",
        consigne: "Vous pourrez rejouer une épreuve ratée plus tard dans la partie. Gardez cette carte en tête !",
      },
    },

    40: {
      type: "bonus", effet: "gain", valeur: 3,
      commun: {
        texte: "JACKPOT ! 💰",
        consigne: "Vous gagnez immédiatement 3 points. C'est cadeau !",
      },
    },

    /* ------------------------------------------------------------ MALUS 💣 */

    12: {
      type: "malus", effet: "silence",
      commun: {
        texte: "INTERDICTION DE PARLER ! 🤐",
        consigne: "Lors de votre prochaine épreuve, toute l'équipe devra rester MUETTE. Gestes autorisés !",
      },
    },

    18: {
      type: "malus", effet: "sabotage",
      commun: {
        texte: "SABOTAGE ! 🔧",
        consigne: "L'équipe adverse peut vous imposer une contrainte pour votre prochaine épreuve : sur un pied, les yeux fermés, en chantant…",
      },
    },

    25: {
      type: "malus", effet: "perte", valeur: 2,
      commun: {
        texte: "COUP DUR ! 🌩️",
        consigne: "Aïe… Vous perdez 2 points. Ça pique !",
      },
    },

    27: {
      type: "malus", effet: "defi-oblige",
      commun: {
        texte: "DÉFI OBLIGATOIRE ! 🦆",
        consigne: "Toute l'équipe doit faire le tour de la salle en marchant comme des canards avant de pouvoir continuer. Coin coin.",
      },
    },

    /* ------------------------------------------------------------ CARTE PIÈGE 💀 */

    34: {
      type: "piege", points: 3, perte: 2, timer: 30,
      commun: {
        texte: "Quelle est la capitale de l'Australie ?",
        consigne: "⚠️ 3 points si vous trouvez… mais −2 points si vous vous trompez ! (l'équipe qui a tiré la carte répond seule)",
        reponse: "Canberra ! (et non, ce n'est pas Sydney 😈)",
        propositions: ["Canberra", "Sydney", "Melbourne", "Perth"],
      },
    },

  },
};
