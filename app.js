/* ============================================================================
   PARENTS VS ENFANTS — LOGIQUE DU JEU
   (le contenu des cartes se modifie dans cartes.js, pas ici)
   ============================================================================ */

"use strict";

/* ---------------------------------------------------------------- Catégories */

const CATEGORIES = {
  question:  { nom: "QUESTION",            icone: "❓", couleur: "#4da6ff" },
  triche:    { nom: "QUESTION DIABOLIQUE", icone: "😈", couleur: "#c04dff" },
  blindtest: { nom: "BLIND TEST",          icone: "🎵", couleur: "#a05cff" },
  doubleblindtest: { nom: "DOUBLE BLIND TEST", icone: "🎶", couleur: "#7b5cff" },
  mime:      { nom: "MIME",                icone: "🎭", couleur: "#ff9f1c" },
  defi:      { nom: "DÉFI",                icone: "💪", couleur: "#ffd24a" },
  bonus:     { nom: "BONUS",               icone: "🎁", couleur: "#3ddc84" },
  malus:     { nom: "MALUS",               icone: "💣", couleur: "#ff4444" },
  piege:     { nom: "CARTE PIÈGE",         icone: "💀", couleur: "#ff2222" },
  video:     { nom: "ÉPREUVE VIDÉO",       icone: "🕺", couleur: "#ff5cd6" },
};

const NB_CARTES = 40;
const CLE_STOCKAGE = "pve-etat-v1";

/* ---------------------------------------------------------------- État */

let etat = {
  scores: { enfants: 0, adultes: 0 },
  tour: CONFIG.premierTour || "enfants",
  utilisees: {},                       // { numero: "enfants"|"adultes" }
  badges: { enfants: [], adultes: [] } // ex: [{id:"double", txt:"✨ x2"}]
};

let carteEnCours = null;   // { numero, carte, equipe, contenu, commun }
let ecranActuel = "titre";
let saisie = "";
let saisieTimeout = null;
let timerRestant = 0, timerTotal = 0, timerInterval = null;
let lecteursAudio = [];
let vitesseLecture = 1;
let indiceTimeout = null;

function sauvegarder() {
  try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat)); } catch (e) {}
  envoyerEtat();
}
function charger() {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (brut) etat = Object.assign(etat, JSON.parse(brut));
  } catch (e) {}
}

/* ---------------------------------------------------------------- Sons (WebAudio, aucun fichier requis) */

let ctxAudio = null;
function ctx() {
  if (!ctxAudio) ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
  if (ctxAudio.state === "suspended") ctxAudio.resume();
  return ctxAudio;
}
function bip(freq, debut, duree, type = "square", vol = 0.18) {
  const c = ctx();
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + debut);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + debut + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + debut + duree);
  o.connect(g); g.connect(c.destination);
  o.start(c.currentTime + debut); o.stop(c.currentTime + debut + duree + 0.05);
}
function bruit(debut, duree, vol, freqFiltre, typeFiltre) {
  const c = ctx();
  const n = Math.floor(c.sampleRate * duree);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = typeFiltre || "bandpass";
  f.frequency.value = freqFiltre || 1800;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime + debut);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + debut + duree);
  s.connect(f); f.connect(g); g.connect(c.destination);
  s.start(c.currentTime + debut);
}

const sons = {
  flip()     { bip(300, 0, .12, "triangle"); bip(520, .09, .15, "triangle"); },
  tambour()  {
    // Roulement qui accélère pendant ~2,3 s
    let t = 0, pas = .1;
    while (t < 2.3) { bruit(t, .05, .3, 700 + Math.random() * 300); t += pas; pas = Math.max(.026, pas * .93); }
  },
  paf()      {
    // Gros coup + cymbale + petite fanfare
    bip(150, 0, .35, "sine", .5); bip(60, .02, .4, "sine", .5);
    bruit(.02, .9, .25, 7000, "highpass");
    [523, 659, 784, 1047].forEach((f, i) => bip(f, .25 + i * .09, .3, "triangle", .22));
  },
  publicChante() {
    // Applaudissements (rafales de bruit) + petit air joyeux
    for (let i = 0; i < 14; i++) bruit(i * .05 + Math.random() * .02, .04, .18, 3000 + Math.random() * 3000);
    [659, 784, 988, 1319].forEach((f, i) => bip(f, .1 + i * .09, .25, "triangle", .2));
  },
  rideau() {
    // Frou-frou du velours qui s'ouvre + carillon d'apparition
    bruit(0, 1.4, .16, 420, "lowpass");
    bruit(.15, 1.1, .1, 900, "bandpass");
    [784, 988, 1175, 1568].forEach((f, i) => bip(f, .9 + i * .1, .35, "triangle", .16));
  },
  secret() {
    // Notes descendantes façon « mystère » + souffle feutré
    [880, 740, 622, 523, 415].forEach((f, i) => bip(f, i * .13, .5, "triangle", .17));
    bruit(.1, 1.1, .09, 1200, "lowpass");
  },
  jingle()   { [440, 554, 659, 880].forEach((f, i) => bip(f, i * .09, .25, "square", .12)); },
  bon()      { [523, 659, 784, 1047].forEach((f, i) => bip(f, i * .1, .3, "triangle", .22)); },
  mauvais()  { bip(220, 0, .3, "sawtooth", .2); bip(155, .25, .5, "sawtooth", .2); },
  bonus()    { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => bip(f, i * .07, .22, "triangle", .18)); },
  malus()    { [400, 350, 300, 250, 180].forEach((f, i) => bip(f, i * .11, .18, "sawtooth", .16)); },
  tic()      { bip(900, 0, .06, "square", .1); },
  buzzer()   { bip(140, 0, .8, "sawtooth", .3); bip(147, 0, .8, "sawtooth", .3); },
  reveal()   { bip(660, 0, .12, "triangle"); bip(990, .1, .2, "triangle"); },
  points()   { bip(784, 0, .1, "triangle", .15); bip(1047, .08, .15, "triangle", .15); },
  victoire() { [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => bip(f, i * .14, .35, "triangle", .22)); },
};

/* ---------------------------------------------------------------- Utilitaires DOM */

const $ = (id) => document.getElementById(id);

function montrerEcran(nom) {
  document.querySelectorAll(".ecran").forEach(e => e.classList.remove("actif"));
  $("ecran-" + nom).classList.add("actif");
  ecranActuel = nom;
  majAmbiance();
  envoyerEtat();
}

/* ---------------------------------------------------------------- Mur */

function construireMur() {
  const mur = $("mur");
  mur.innerHTML = "";
  for (let n = 1; n <= NB_CARTES; n++) {
    const carte = document.createElement("div");
    carte.className = "carte";
    carte.dataset.numero = n;
    const num = String(n).padStart(2, "0");
    carte.innerHTML =
      `<div class="carte-inner">
         <div class="carte-face carte-dos">${num}</div>
         <div class="carte-face carte-avant"></div>
       </div>`;
    carte.addEventListener("click", () => choisirCarte(n));
    mur.appendChild(carte);
  }
  rafraichirMur();
}

function cartesRestantes() {
  return NB_CARTES - Object.keys(etat.utilisees).length;
}

// 🔒 Suspense final : au-delà du seuil, le public ne voit plus les scores
function scoresCaches() {
  const seuil = CONFIG.scoresSecretsDernieresCartes == null ? 10 : CONFIG.scoresSecretsDernieresCartes;
  return seuil > 0 && cartesRestantes() <= seuil;
}

function rafraichirMur() {
  const restantes = cartesRestantes();
  const el = $("cartes-restantes");
  if (restantes <= 0) {
    el.textContent = "Toutes les cartes ont été jouées !";
  } else if (scoresCaches()) {
    el.textContent = "🔒 SCORES SECRETS — plus que " + restantes + " carte" + (restantes > 1 ? "s" : "") + " !";
  } else {
    el.textContent = restantes + " carte" + (restantes > 1 ? "s" : "") + " restante" + (restantes > 1 ? "s" : "");
  }
  el.classList.toggle("secret", restantes > 0 && scoresCaches());
  document.querySelectorAll(".carte").forEach(el => {
    const n = +el.dataset.numero;
    const usage = etat.utilisees[n];
    el.classList.toggle("utilisee", !!usage);
    el.classList.toggle("retournee", !!usage);
    if (usage) {
      const def = CONFIG.cartes[n];
      const cat = CATEGORIES[def ? def.type : "question"];
      el.querySelector(".carte-avant").innerHTML =
        `<span>${cat.icone}</span>
         <span class="mini-equipe" style="color:${CONFIG.equipes[usage].couleur}">${CONFIG.equipes[usage].icone}</span>`;
    }
  });
}

let dernierEtatSecret = null;

function rafraichirBandeau() {
  const secret = scoresCaches();
  // Annonce spectaculaire au moment où les scores se ferment
  if (dernierEtatSecret === false && secret) {
    sons.secret();
    toastGeant("🔒", "SCORES SECRETS JUSQU'À LA FIN !", 3200);
  }
  dernierEtatSecret = secret;

  $("score-enfants").textContent = secret ? "???" : etat.scores.enfants;
  $("score-adultes").textContent = secret ? "???" : etat.scores.adultes;
  document.querySelectorAll(".panneau-equipe .score").forEach(s => s.classList.toggle("secret", secret));
  $("panneau-enfants").classList.toggle("a-toi", etat.tour === "enfants");
  $("panneau-adultes").classList.toggle("a-toi", etat.tour === "adultes");
  const eq = CONFIG.equipes[etat.tour];
  const t = $("tour-equipe");
  t.textContent = eq.nom;
  t.style.color = eq.couleur;
  t.style.textShadow = `0 0 25px ${eq.couleur}`;
  for (const equipe of ["enfants", "adultes"]) {
    const zone = $("badges-" + equipe);
    zone.innerHTML = "";
    etat.badges[equipe].forEach((b, i) => {
      const el = document.createElement("span");
      el.className = "badge";
      el.textContent = b.txt;
      el.title = "Cliquer pour retirer";
      el.addEventListener("click", () => { etat.badges[equipe].splice(i, 1); sauvegarder(); rafraichirBandeau(); });
      zone.appendChild(el);
    });
  }
}

/* ---------------------------------------------------------------- Choix d'une carte */

function choisirCarte(numero) {
  if (ecranActuel !== "mur" || etat.utilisees[numero] || carteEnCours) return;
  const def = CONFIG.cartes[numero];
  if (!def) { annoncer("⚠️ La carte " + numero + " n'a pas de contenu dans cartes.js"); return; }

  const equipe = etat.tour;
  const commun = !!def.commun;
  const contenu = def.commun || def[equipe] || def.enfants || def.adultes;

  carteEnCours = { numero, carte: def, equipe, contenu, commun };
  etat.utilisees[numero] = equipe;
  sauvegarder();

  // Animation de retournement sur le mur + onde de choc
  const el = document.querySelector(`.carte[data-numero="${numero}"]`);
  sons.flip();
  el.classList.add("selection");
  rafraichirMur();
  ondeDeChoc(el);
  setTimeout(() => {
    el.classList.remove("selection");
    ouvrirEpreuve();
  }, 1150);
}

function ondeDeChoc(el) {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;

  const ring = document.createElement("div");
  ring.className = "onde-ring";
  ring.style.left = cx + "px";
  ring.style.top = cy + "px";
  document.body.appendChild(ring);
  setTimeout(() => ring.remove(), 950);

  document.querySelectorAll(".carte").forEach(c => {
    if (c === el) return;
    const rc = c.getBoundingClientRect();
    const d = Math.hypot(rc.left + rc.width / 2 - cx, rc.top + rc.height / 2 - cy);
    const delai = d * 0.45; // l'onde se propage selon la distance
    c.style.animationDelay = delai + "ms";
    c.classList.add("onde");
    setTimeout(() => { c.classList.remove("onde"); c.style.animationDelay = ""; }, 700 + delai);
  });
}

function annoncer(msg) {
  const el = $("saisie-numero");
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(saisieTimeout);
  saisieTimeout = setTimeout(() => { el.style.display = "none"; }, 2500);
}

/* ---------------------------------------------------------------- Écran épreuve */

function ouvrirEpreuve() {
  const { numero, carte, equipe, contenu, commun } = carteEnCours;
  const cat = CATEGORIES[carte.type];
  const eq = CONFIG.equipes[equipe];

  sons.jingle();
  montrerEcran("epreuve");
  document.documentElement.style.setProperty("--cat-couleur", cat.couleur);
  $("epreuve-categorie").style.setProperty("--cat-couleur", cat.couleur);
  $("cat-icone").textContent = cat.icone;
  $("cat-nom").textContent = cat.nom;
  $("epreuve-numero").textContent = "CARTE " + String(numero).padStart(2, "0");

  const eqEl = $("epreuve-equipe");
  if (commun && !["piege", "bonus", "malus"].includes(carte.type)) {
    eqEl.textContent = "🧒 LES DEUX ÉQUIPES 🧑";
    eqEl.style.color = "#ffd24a";
    eqEl.style.border = ".3vh solid #ffd24a";
  } else {
    eqEl.textContent = eq.icone + " " + eq.nom;
    eqEl.style.color = eq.couleur;
    eqEl.style.border = ".3vh solid " + eq.couleur;
  }

  const estBlindTest = carte.type === "blindtest" || carte.type === "doubleblindtest";
  $("epreuve-icone").textContent = estBlindTest ? "" : cat.icone;
  $("vinyle").classList.toggle("visible", estBlindTest);
  $("vinyle2").classList.toggle("visible", carte.type === "doubleblindtest");
  $("vinyle").classList.add("pause");
  $("vinyle2").classList.add("pause");
  $("epreuve-texte").textContent = contenu.texte || "";
  $("epreuve-consigne").textContent = contenu.consigne || "";

  // Duo / Carré / Cash (si la question a des propositions)
  carteEnCours.aDcc = Array.isArray(contenu.propositions) &&
    contenu.propositions.filter(Boolean).length >= 2 &&
    ["question", "triche", "piege"].includes(carte.type);
  carteEnCours.dccMode = null;

  // Petite mascotte selon l'épreuve
  const POSES_EPREUVE = {
    question: "livre", triche: "question", piege: "question", mime: "paint",
    blindtest: "saut", doubleblindtest: "megaphone", defi: "pouce", video: "saut",
    bonus: "coeur", malus: "question",
  };
  const masc = $("epreuve-mascotte");
  masc.src = "images/lilou-" + (POSES_EPREUVE[carte.type] || "salut") + ".png";
  masc.classList.add("visible");

  const pts = $("epreuve-points");
  if (carte.type === "bonus" || carte.type === "malus") {
    pts.style.display = "none";
  } else {
    pts.style.display = "";
    let txt = "⭐ " + (carte.points || 1) + " point" + ((carte.points || 1) > 1 ? "s" : "");
    if (carte.perte) txt += "  •  ⚠️ −" + carte.perte + " si échec";
    pts.textContent = txt;
  }

  const rep = $("epreuve-reponse");
  rep.classList.remove("visible");
  rep.textContent = contenu.reponse || "";

  // Indice de triche (caché au départ)
  const ind = $("indice");
  ind.classList.remove("visible", "flash");
  ind.textContent = contenu.indice || "";
  // Position discrète : coin bas-droit, léger aléatoire
  ind.style.right = (2 + Math.random() * 6) + "vw";
  ind.style.bottom = (4 + Math.random() * 10) + "vh";
  ind.style.left = "auto"; ind.style.top = "auto";

  // Secret présentateur
  $("secret-peek").textContent = contenu.secret ? ("🤫 SECRET : " + contenu.secret) : "";

  // Timer
  arreterTimer();
  timerTotal = carte.timer || 0;
  timerRestant = timerTotal;
  $("timer").classList.toggle("visible", timerTotal > 0);
  majTimer();

  // Musique et vidéo (l'arrêt du média précédent doit venir avant l'affichage du nouveau)
  stopperMusique();
  for (const champMusique of ["musique", "musique2"]) {
    if (!contenu[champMusique]) continue;
    resoudreMedia(contenu[champMusique]).then((url) => {
      if (!carteEnCours || carteEnCours.numero !== numero) return;
      if (!url) { annoncerEpreuve("⚠️ Musique introuvable : " + contenu[champMusique]); return; }
      const a = new Audio(url);
      a.addEventListener("error", () => annoncerEpreuve("⚠️ Musique illisible : " + contenu[champMusique]));
      lecteursAudio.push(a);
    });
  }
  montrerVideo(contenu, carte.type, numero);

  preparerDcc();

  // Boutons de validation adaptés
  const validationCommune = commun && !["bonus", "malus", "piege"].includes(carte.type);
  $("boutons-validation").style.display = validationCommune ? "none" : "";
  $("boutons-commun").style.display = validationCommune ? "" : "none";
  carteEnCours.validationCommune = validationCommune;

  // Bonus / malus : effet immédiat après un petit délai de lecture
  if (carte.type === "bonus" || carte.type === "malus") {
    (carte.type === "bonus" ? sons.bonus : sons.malus)();
    setTimeout(() => appliquerEffet(carte, equipe), 1600);
    // Rappel discret pour le présentateur
    pts.style.display = "";
    pts.textContent = "ESPACE pour continuer";
    pts.style.opacity = ".55";
  } else {
    $("epreuve-points").style.opacity = "1";
  }

  envoyerEtat();
}

function annoncerEpreuve(msg) {
  $("epreuve-consigne").textContent = msg;
}

/* ---------------------------------------------------------------- Effets bonus / malus */

function ajouterBadge(equipe, id, txt) {
  if (!etat.badges[equipe].some(b => b.id === id)) etat.badges[equipe].push({ id, txt });
}

function appliquerEffet(carte, equipe) {
  const adverse = equipe === "enfants" ? "adultes" : "enfants";
  const v = carte.valeur || 0;
  switch (carte.effet) {
    case "double":
      ajouterBadge(equipe, "double", "✨ x2");
      break;
    case "vol":
      etat.scores[adverse] = Math.max(0, etat.scores[adverse] - v);
      etat.scores[equipe] += v;
      pointsFlottants("+" + v, equipe);
      pointsFlottants("−" + v, adverse);
      sons.points();
      break;
    case "gain":
      etat.scores[equipe] += v;
      pointsFlottants("+" + v, equipe);
      sons.points();
      break;
    case "perte":
      etat.scores[equipe] = Math.max(0, etat.scores[equipe] - v);
      pointsFlottants("−" + v, equipe);
      break;
    case "silence":
      ajouterBadge(equipe, "silence", "🤐 sans parler");
      break;
    case "seconde-chance":
      ajouterBadge(equipe, "chance", "🔁 seconde chance");
      break;
    case "sabotage":
      ajouterBadge(equipe, "sabotage", "🔧 sabotage subi");
      break;
    case "choix":
      ajouterBadge(equipe, "choix", "🎯 choisit la carte adverse");
      break;
  }
  sauvegarder();
  rafraichirBandeau();
}

/* ---------------------------------------------------------------- Validation */

function pointsCalcules(carte, equipe) {
  let pts = carte.points || 1;
  // Barème Duo / Carré / Cash si un mode a été choisi
  if (carteEnCours && carteEnCours.aDcc && carteEnCours.dccMode) {
    pts = baremeDcc(carte)[carteEnCours.dccMode];
  }
  const iDouble = etat.badges[equipe].findIndex(b => b.id === "double");
  if (iDouble >= 0) {
    pts *= 2;
    etat.badges[equipe].splice(iDouble, 1);
    return { pts, double: true };
  }
  return { pts, double: false };
}

function consommerBadgesEpreuve(equipe) {
  // Les badges "une épreuve" (silence, sabotage) se consomment après l'épreuve jouée
  etat.badges[equipe] = etat.badges[equipe].filter(b => !["silence", "sabotage"].includes(b.id));
}

function valider(reussi) {
  if (!carteEnCours || carteEnCours.validationCommune) return;
  const { carte, equipe } = carteEnCours;
  if (carte.type === "bonus" || carte.type === "malus") { retourMur(true); return; }

  consommerBadgesEpreuve(equipe);
  if (reussi) {
    const { pts, double } = pointsCalcules(carte, equipe);
    etat.scores[equipe] += pts;
    afficherResultat("bon", "🎉", "BONNE RÉPONSE !", (double ? "DOUBLE POINTS ! " : "") + "+" + pts, equipe, "+" + pts);
    sons.bon();
  } else {
    let txtPts = "";
    if (carte.perte) {
      etat.scores[equipe] = Math.max(0, etat.scores[equipe] - carte.perte);
      txtPts = "−" + carte.perte;
      pointsFlottants("−" + carte.perte, equipe);
    }
    afficherResultat("mauvais", "😅", "RATÉ !", txtPts, equipe, null);
    sons.mauvais();
  }
  sauvegarder();
}

function validerCommun(gagnant) {
  if (!carteEnCours || !carteEnCours.validationCommune) return;
  const { carte } = carteEnCours;
  if (gagnant) {
    const { pts, double } = pointsCalcules(carte, gagnant);
    etat.scores[gagnant] += pts;
    const eq = CONFIG.equipes[gagnant];
    afficherResultat("bon", eq.icone, "LES " + eq.nom + " GAGNENT !", (double ? "DOUBLE POINTS ! " : "") + "+" + pts, gagnant, "+" + pts);
    sons.bon();
  } else {
    afficherResultat("mauvais", "🙈", "PERSONNE N'A TROUVÉ !", "", null, null);
    sons.mauvais();
  }
  sauvegarder();
}

function afficherResultat(classe, icone, texte, points, equipe, flottant) {
  arreterTimer();
  stopperMusique();
  const ov = $("overlay-resultat");
  ov.className = "";
  ov.classList.add("visible", classe);
  $("resultat-icone").textContent = icone;
  $("resultat-texte").textContent = texte;
  $("resultat-points").textContent = points || "";
  $("resultat-mascotte").classList.toggle("visible", classe === "bon");
  if (flottant && equipe) pointsFlottants(flottant, equipe);
  setTimeout(() => {
    ov.classList.remove("visible");
    retourMur(true);
  }, 2400);
}

function pointsFlottants(txt, equipe) {
  const cible = $("panneau-" + equipe);
  const el = document.createElement("div");
  el.className = "points-flottants";
  el.textContent = txt;
  el.style.color = txt.startsWith("−") || txt.startsWith("-") ? "#ff5566" : "#7CFF9B";
  const r = cible.getBoundingClientRect();
  el.style.left = (r.left + r.width / 2 - 20) + "px";
  el.style.top = (r.top + r.height / 2) + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

function retourMur(changerTour) {
  arreterTimer();
  stopperMusique();
  $("indice").classList.remove("visible");
  $("secret-peek").classList.remove("visible");
  $("timer").classList.remove("visible");
  $("vinyle").classList.remove("visible");
  $("epreuve-mascotte").classList.remove("visible");
  $("dcc-choix").classList.remove("visible");
  $("dcc-mode-badge").classList.remove("visible");
  $("dcc-propositions").classList.remove("visible");
  $("dcc-propositions").innerHTML = "";
  carteEnCours = null;
  if (changerTour) etat.tour = etat.tour === "enfants" ? "adultes" : "enfants";
  sauvegarder();
  rafraichirMur();
  rafraichirBandeau();
  montrerEcran("mur");
  // Toutes les cartes jouées : place au grand final !
  if (Object.keys(etat.utilisees).length >= NB_CARTES) {
    setTimeout(() => { if (ecranActuel === "mur") ecranVictoire(); }, 1600);
  }
}

function carteHasard() {
  if (ecranActuel !== "mur" || carteEnCours) return;
  const libres = [];
  for (let n = 1; n <= NB_CARTES; n++) if (!etat.utilisees[n] && CONFIG.cartes[n]) libres.push(n);
  if (!libres.length) return;
  choisirCarte(libres[Math.floor(Math.random() * libres.length)]);
}

/* ---------------------------------------------------------------- Timer */

function majTimer() {
  $("timer-valeur").textContent = timerRestant;
  const cercle = document.querySelector("#timer .prog-cercle");
  const circ = 2 * Math.PI * 44;
  cercle.style.strokeDasharray = circ;
  cercle.style.strokeDashoffset = timerTotal > 0 ? circ * (1 - timerRestant / timerTotal) : 0;
  $("timer").classList.toggle("urgent", timerRestant <= 5 && timerRestant > 0);
}

function basculerTimer() {
  if (!timerTotal) return;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; return; }
  $("timer").classList.add("visible");
  timerInterval = setInterval(() => {
    timerRestant--;
    if (timerRestant <= 5 && timerRestant > 0) sons.tic();
    if (timerRestant <= 0) {
      timerRestant = 0;
      clearInterval(timerInterval); timerInterval = null;
      sons.buzzer();
    }
    majTimer();
    envoyerEtat();
  }, 1000);
}

function resetTimer() {
  clearInterval(timerInterval); timerInterval = null;
  timerRestant = timerTotal;
  majTimer();
}

function arreterTimer() {
  clearInterval(timerInterval); timerInterval = null;
}

/* ---------------------------------------------------------------- Indice / réponse / secret / musique */

function basculerIndice() {
  if (!carteEnCours || !carteEnCours.contenu.indice) return;
  const ind = $("indice");
  clearTimeout(indiceTimeout);
  if (carteEnCours.contenu.indiceMode === "flash") {
    ind.classList.add("flash", "visible");
    indiceTimeout = setTimeout(() => ind.classList.remove("visible"), 2000);
  } else {
    ind.classList.remove("flash");
    ind.classList.toggle("visible");
  }
}

function basculerReponse() {
  if (!carteEnCours || !carteEnCours.contenu.reponse) return;
  const rep = $("epreuve-reponse");
  const visible = rep.classList.toggle("visible");
  if (visible) {
    sons.reveal();
    // Marque la bonne proposition (duo/carré) et ouvre tous les rideaux
    document.querySelectorAll(".dcc-prop[data-bonne]").forEach(el => el.classList.add("bonne"));
    ouvrirRideau($("video-zone"));
    document.querySelectorAll(".video-cellule.cache").forEach(c => ouvrirRideau(c));
    if (carteEnCours && carteEnCours.rideaux) carteEnCours.rideaux = carteEnCours.rideaux.map(() => false);
    envoyerEtat();
  }
}

/* Vidéos (Just Dance…) : champ youtube (lien ou identifiant) ou video (fichier local) */

let lecteursYT = [], youtubeEnLecture = false, lecteurVideo = null;

function idYoutube(s) {
  if (!s) return null;
  const m = String(s).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return m[1];
  if (/^[\w-]{6,15}$/.test(String(s).trim())) return String(s).trim();
  return null;
}

function creerIframeYT(id) {
  const f = document.createElement("iframe");
  f.src = "https://www.youtube.com/embed/" + id + "?enablejsapi=1&rel=0&modestbranding=1";
  f.allow = "autoplay; encrypted-media; fullscreen";
  f.allowFullscreen = true;
  return f;
}

/* ------- Rideau de théâtre : velours rouge animé, dessiné sur canvas ------- */

function creerRideau() {
  const rideau = document.createElement("div");
  rideau.className = "video-rideau";
  rideau.innerHTML =
    `<canvas></canvas>
     <div class="rideau-texte">🎵 ❓ 🎵<div class="note">Écoutez bien… l'image est cachée !</div></div>`;
  rideau._moteur = new RideauTheatre(rideau);
  return rideau;
}

class RideauTheatre {
  constructor(el) {
    this.el = el;
    this.canvas = el.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.mode = "ferme";           // ferme -> ouverture -> ouvert
    this.t0 = performance.now();
    this.debutOuv = 0;
    this.finCb = null;
    this.seed = Math.random() * 100;
    this.boucle = this.boucle.bind(this);
    requestAnimationFrame(this.boucle);
  }

  ouvrir(cb) {
    if (this.mode !== "ferme") return;
    this.mode = "ouverture";
    this.debutOuv = performance.now();
    this.finCb = cb;
    this.el.classList.add("ouvre");
  }

  boucle(maintenant) {
    if (!this.canvas.isConnected) return; // rideau retiré du DOM : on s'arrête
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) { requestAnimationFrame(this.boucle); return; }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W; this.canvas.height = H;
    }

    const t = (maintenant - this.t0) / 1000;
    let p = 0;
    if (this.mode === "ouverture") {
      const x = (maintenant - this.debutOuv) / 2100;
      if (x >= 1.1) {
        this.mode = "ouvert";
        this.ctx.clearRect(0, 0, W, H);
        if (this.finCb) this.finCb();
        return;
      }
      p = courbeOuverture(Math.min(1, x));
    }
    dessinerRideau(this.ctx, W, H, t, p, this.seed);
    requestAnimationFrame(this.boucle);
  }
}

// Petit élan vers le centre, puis grande ouverture souple
function courbeOuverture(x) {
  const elan = Math.sin(Math.min(x, .16) / .16 * Math.PI) * .05;
  const c = x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  return c - elan * (1 - c);
}

function dessinerRideau(ctx, W, H, t, p, seed) {
  ctx.clearRect(0, 0, W, H);
  const valH = H * 0.14;
  const plis = 7;                                   // grands plis par pan
  const largBase = W / 2 + W * 0.004;               // léger recouvrement au centre
  const larg = Math.max(2, largBase * (1 - 0.945 * Math.max(0, p)) * (1 - Math.min(0, p) * 1.2));
  const pas = Math.max(2, Math.round(W / 380));
  const contraste = 1 + Math.max(0, p) * 0.9;       // le tissu froncé marque plus les plis
  const cisaille = 0.11 * Math.sin(Math.min(1, Math.max(0, p) * 1.12) * Math.PI); // le bas traîne

  const cisH = cisaille * H;
  for (const dir of [-1, 1]) {                      // -1 = pan gauche, 1 = pan droit
    ctx.save();
    ctx.transform(1, 0, dir * -cisaille, 1, dir === 1 ? cisH : 0, 0);
    const phase = seed + (dir > 0 ? 2.7 : 0);
    // On déborde de cisH côté extérieur pour que le pan reste accroché au bord
    for (let i = -cisH; i < larg; i += pas) {
      const u = i / largBase;                       // coordonnée "tissu" : les plis se compressent naturellement
      const houle = Math.sin(t * 0.45 + u * 2.6 + phase) * 0.55;      // respiration lente du velours
      let f = 0.5
        + 0.30 * Math.sin(u * plis * 6.283 + phase + houle + p * 5)
        + 0.13 * Math.sin(u * plis * 13.2 + phase * 1.7 + t * 0.8)
        + 0.05 * Math.sin(u * 51 + t * 1.4 + phase);
      f = 0.5 + (f - 0.5) * contraste;
      f = Math.max(0, Math.min(1, f));
      const teinte = 351 + 4 * Math.sin(u * plis * 6.283 + phase + 1.2);
      const lum = 13 + 33 * f;
      ctx.fillStyle = "hsl(" + teinte + " 72% " + lum + "%)";
      const x = dir < 0 ? i : W - i - pas;
      ctx.fillRect(x, 0, pas + 0.6, H);
    }
    ctx.restore();
  }

  // Ombres et lumière de scène (uniquement sur le tissu)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, larg + cisaille * H, H);
  ctx.rect(W - larg - cisaille * H, 0, larg + cisaille * H, H);
  ctx.clip();
  let g = ctx.createLinearGradient(0, 0, 0, H * 0.16);
  g.addColorStop(0, "rgba(0,0,0,.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.16);
  g = ctx.createLinearGradient(0, H * 0.72, 0, H);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.42)");
  ctx.fillStyle = g; ctx.fillRect(0, H * 0.72, W, H * 0.28);
  const projecteur = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.55);
  projecteur.addColorStop(0, "rgba(255,214,150,.14)");
  projecteur.addColorStop(1, "rgba(255,214,150,0)");
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = projecteur; ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Lambrequin : festons drapés + galon et pampilles dorés (remonte à l'ouverture)
  const p2 = Math.max(0, Math.min(1, (p - 0.3) / 0.6));
  const vy = -p2 * p2 * valH * 1.8;
  if (vy > -valH * 1.6) {
    const nbFestons = Math.max(3, Math.round(W / (H * 0.9)) * 3);
    const fw = W / nbFestons;
    for (let k = 0; k < nbFestons; k++) {
      const x0 = k * fw;
      const bas = valH * (0.62 + 0.05 * Math.sin(t * 0.6 + k * 1.7 + seed));
      const gv = ctx.createLinearGradient(0, vy, 0, vy + valH * 1.3);
      gv.addColorStop(0, "hsl(352 74% 34%)");
      gv.addColorStop(.55, "hsl(351 72% 24%)");
      gv.addColorStop(1, "hsl(350 75% 15%)");
      ctx.fillStyle = gv;
      ctx.beginPath();
      ctx.moveTo(x0 - 1, vy);
      ctx.lineTo(x0 - 1, vy + bas);
      ctx.quadraticCurveTo(x0 + fw / 2, vy + valH * 1.35, x0 + fw + 1, vy + bas);
      ctx.lineTo(x0 + fw + 1, vy);
      ctx.closePath();
      ctx.fill();
      // galon doré le long du feston
      ctx.strokeStyle = "rgba(255,205,80,.95)";
      ctx.lineWidth = Math.max(1.5, H * 0.008);
      ctx.beginPath();
      ctx.moveTo(x0, vy + bas);
      ctx.quadraticCurveTo(x0 + fw / 2, vy + valH * 1.33, x0 + fw, vy + bas);
      ctx.stroke();
      // pampille à chaque jonction
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.arc(x0 + fw, vy + bas + H * 0.004, Math.max(2, H * 0.011), 0, 6.283);
      ctx.fill();
    }
    // tringle dorée tout en haut
    const rod = ctx.createLinearGradient(0, vy, 0, vy + H * 0.018);
    rod.addColorStop(0, "#ffe9a8"); rod.addColorStop(.5, "#d9a520"); rod.addColorStop(1, "#8a6a00");
    ctx.fillStyle = rod;
    ctx.fillRect(0, vy, W, H * 0.018);
  }
}

// Ouverture théâtrale : le tissu se fronce vers les côtés en dévoilant le clip,
// puis le rideau disparaît (retrait de .cache)
function ouvrirRideau(porteur) {
  if (!porteur || !porteur.classList.contains("cache")) return;
  const rideau = porteur.querySelector(".video-rideau");
  if (!rideau || rideau.classList.contains("ouvre")) return;
  sons.rideau();
  if (rideau._moteur) {
    rideau._moteur.ouvrir(() => porteur.classList.remove("cache"));
  } else {
    rideau.classList.add("ouvre");
    setTimeout(() => porteur.classList.remove("cache"), 1800);
  }
}

function montrerVideo(contenu, typeCarte, numero) {
  const zone = $("video-zone");
  zone.innerHTML = "";
  zone.classList.remove("cache", "double", "grande");
  lecteursYT = []; lecteurVideo = null; youtubeEnLecture = false;
  const ecran = $("ecran-epreuve");
  const estBlindTest = typeCarte === "blindtest" || typeCarte === "doubleblindtest";
  if (typeCarte === "video") zone.classList.add("grande");
  let visible = false;

  const idsYT = [contenu.youtube, contenu.youtube2]
    .map(idYoutube)
    .filter(Boolean);

  if ((contenu.youtube || contenu.youtube2) && !idsYT.length) {
    annoncerEpreuve("⚠️ Lien YouTube invalide");
  }

  if (idsYT.length === 1) {
    const f = creerIframeYT(idsYT[0]);
    zone.appendChild(f);
    lecteursYT.push(f);
    if (estBlindTest) {
      const rideau = creerRideau();
      rideau.addEventListener("click", () => leverRideau(1));
      zone.appendChild(rideau);
      zone.classList.add("cache");
      if (carteEnCours) carteEnCours.rideaux = [true];
    }
    visible = true;
  } else if (idsYT.length >= 2) {
    // Double blind test : deux lecteurs côte à côte, chacun sous son rideau
    zone.classList.add("double");
    if (carteEnCours) carteEnCours.rideaux = [true, true];
    idsYT.slice(0, 2).forEach((id, i) => {
      const cellule = document.createElement("div");
      cellule.className = "video-cellule";
      const f = creerIframeYT(id);
      cellule.appendChild(f);
      if (estBlindTest) {
        const rideau = creerRideau();
        rideau.querySelector(".note").textContent = "Musique n°" + (i + 1) + " — cliquer pour révéler";
        rideau.addEventListener("click", () => leverRideau(i + 1));
        cellule.appendChild(rideau);
        cellule.classList.add("cache");
      }
      zone.appendChild(cellule);
      lecteursYT.push(f);
    });
    visible = true;
  } else if (contenu.video) {
    resoudreMedia(contenu.video).then((url) => {
      if (!carteEnCours || carteEnCours.numero !== numero) return;
      if (!url) { annoncerEpreuve("⚠️ Vidéo introuvable : " + contenu.video); return; }
      const v = document.createElement("video");
      v.src = url;
      v.controls = true;
      v.addEventListener("error", () => annoncerEpreuve("⚠️ Vidéo illisible : " + contenu.video));
      zone.appendChild(v);
      lecteurVideo = v;
      zone.classList.add("visible");
      ecran.classList.add("epreuve-video");
    });
  }

  zone.classList.toggle("visible", visible);
  ecran.classList.toggle("epreuve-video", visible);
}

function commandeYoutube(fonction, args) {
  lecteursYT.forEach((f) => {
    if (!f.contentWindow) return;
    f.contentWindow.postMessage(JSON.stringify({ event: "command", func: fonction, args: args || "" }), "*");
  });
}

// Lève le rideau n°i (1 ou 2) — utile en double blind test quand une seule
// musique est trouvée. Clic sur le rideau, ou bouton de la télécommande.
function leverRideau(i) {
  const zone = $("video-zone");
  if (zone.classList.contains("double")) {
    ouvrirRideau(zone.querySelectorAll(".video-cellule")[i - 1]);
  } else {
    ouvrirRideau(zone);
  }
  if (carteEnCours && carteEnCours.rideaux) carteEnCours.rideaux[i - 1] = false;
  envoyerEtat();
}

function basculerMusique() {
  if (lecteursYT.length) {
    if (!youtubeEnLecture) {
      // Volume identique sur tous les lecteurs (aucun ne prend le dessus)
      commandeYoutube("unMute");
      commandeYoutube("setVolume", [100]);
      commandeYoutube("playVideo");
    } else {
      commandeYoutube("pauseVideo");
    }
    youtubeEnLecture = !youtubeEnLecture;
    $("vinyle").classList.toggle("pause", !youtubeEnLecture);
    $("vinyle2").classList.toggle("pause", !youtubeEnLecture);
    return;
  }
  if (lecteurVideo) {
    if (lecteurVideo.paused) lecteurVideo.play(); else lecteurVideo.pause();
    return;
  }
  if (!lecteursAudio.length) return;
  const enPause = lecteursAudio[0].paused;
  lecteursAudio.forEach(a => { a.volume = 1; if (enPause) a.play(); else a.pause(); });
  $("vinyle").classList.toggle("pause", !enPause);
  $("vinyle2").classList.toggle("pause", !enPause);
}

/* Vitesse de lecture : ralenti / normal / accéléré (télécommande) */
function appliquerVitesse(taux) {
  taux = +taux;
  if (![0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].includes(taux)) return;
  vitesseLecture = taux;
  lecteursAudio.forEach(a => {
    try { a.preservesPitch = false; a.mozPreservesPitch = false; } catch (e) {}
    a.playbackRate = taux;
  });
  if (lecteurVideo) lecteurVideo.playbackRate = taux;
  commandeYoutube("setPlaybackRate", [taux]);
  // Les vinyles tournent à la vitesse choisie
  const duree = (2.2 / taux) + "s";
  $("vinyle").style.animationDuration = duree;
  $("vinyle2").style.animationDuration = duree;
  const badge = $("vitesse-badge");
  if (taux === 1) {
    badge.classList.remove("visible");
  } else {
    badge.textContent = (taux < 1 ? "🐌 RALENTI x" : "⚡ ACCÉLÉRÉ x") + taux;
    badge.classList.add("visible");
  }
  envoyerEtat();
}

function stopperMusique() {
  lecteursAudio.forEach(a => { try { a.pause(); } catch (e) {} });
  lecteursAudio = [];
  if (lecteurVideo) { try { lecteurVideo.pause(); } catch (e) {} lecteurVideo = null; }
  if (lecteursYT.length) { commandeYoutube("pauseVideo"); lecteursYT = []; youtubeEnLecture = false; }
  vitesseLecture = 1;
  $("vitesse-badge").classList.remove("visible");
  $("video-zone").innerHTML = "";
  $("video-zone").classList.remove("visible", "cache", "double");
  $("ecran-epreuve").classList.remove("epreuve-video");
  $("vinyle").classList.add("pause");
  $("vinyle2").classList.add("pause");
  $("vinyle").style.animationDuration = "";
  $("vinyle2").style.animationDuration = "";
  urlsARevoquer.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) {} });
  urlsARevoquer = [];
}

/* ---------------------------------------------------------------- Bonus « le public chante » 🎤 */

// Grande bannière passagère au centre de l'écran
function toastGeant(icone, texte, duree) {
  const toast = $("public-chante");
  $("public-chante-icone").textContent = icone;
  $("public-chante-texte").textContent = texte;
  toast.classList.remove("visible");
  void toast.offsetWidth; // relance l'animation
  toast.classList.add("visible");
  clearTimeout(toastGeant.timer);
  toastGeant.timer = setTimeout(() => toast.classList.remove("visible"), duree || 2000);
}

function bonusPublic(equipe) {
  if (!CONFIG.equipes[equipe]) return;
  etat.scores[equipe] += 1;
  sons.publicChante();
  pointsFlottants("+1", equipe);
  toastGeant("🎤", "LE PUBLIC CHANTE ! +1 " + CONFIG.equipes[equipe].icone);
  sauvegarder();
  rafraichirBandeau();
}

/* ---------------------------------------------------------------- Victoire */

/* Grand final : podium qui sort du sol et compteurs à défilement */

let victoireJeton = 0;   // annule proprement une animation en cours

function ecranVictoire() {
  const jeton = ++victoireJeton;
  const e = etat.scores.enfants, a = etat.scores.adultes;
  montrerEcran("victoire");

  // Remise à zéro de la scène
  $("victoire-entete").textContent = "🏆 ET LE GAGNANT EST… 🏆";
  const titre = $("victoire-titre");
  titre.textContent = "";
  titre.classList.remove("montre");
  $("victoire-mascotte").classList.remove("visible");
  for (const eq of ["enfants", "adultes"]) {
    const place = $("place-" + eq);
    place.classList.remove("gagnant", "monte");
    place.querySelector(".place-bloc").style.setProperty("--h", "0vh");
    place.querySelector(".place-rang").textContent = "";
    const sc = place.querySelector(".place-score");
    sc.classList.remove("verrouille");
    sc.textContent = "0";
  }

  sons.tambour();
  // Les compteurs s'emballent, puis se verrouillent l'un après l'autre
  roulerScore("enfants", e, 2500, jeton);
  roulerScore("adultes", a, 3600, jeton);
  setTimeout(() => { if (jeton === victoireJeton) monterPodium(e, a); }, 4100);
}

function roulerScore(equipe, valeurFinale, duree, jeton) {
  const el = $("place-" + equipe).querySelector(".place-score");
  el.classList.add("roule");
  const t0 = performance.now();
  const finRapide = duree - 900;   // dernière ligne droite : la roue ralentit
  let valeur = 0, depart = 0, distance = 0;

  function frame(maintenant) {
    if (jeton !== victoireJeton || ecranActuel !== "victoire") { el.classList.remove("roule"); return; }
    const t = maintenant - t0;
    if (t < finRapide) {
      // défilement très rapide de 0 à 100, en boucle
      valeur = (valeur + 9) % 101;
      el.textContent = valeur;
      requestAnimationFrame(frame);
    } else if (t < duree) {
      // décélération calculée pour tomber pile sur le vrai score
      if (!distance) {
        depart = valeur;
        const cible = ((valeurFinale % 101) + 101) % 101;
        distance = 202 + ((cible - depart + 101) % 101); // deux tours puis la bonne case
      }
      const u = (t - finRapide) / 900;
      const frein = 1 - Math.pow(1 - u, 3);
      el.textContent = Math.round(depart + frein * distance) % 101;
      requestAnimationFrame(frame);
    } else {
      el.textContent = valeurFinale;          // le vrai score, enfin dévoilé
      el.classList.remove("roule");
      el.classList.add("verrouille");
      sons.points();
    }
  }
  requestAnimationFrame(frame);
}

function monterPodium(e, a) {
  const gagnant = e > a ? "enfants" : (a > e ? "adultes" : null);
  const hauteurs = gagnant ? { gagne: 34, perd: 20 } : { gagne: 27, perd: 27 };

  for (const eq of ["enfants", "adultes"]) {
    const place = $("place-" + eq);
    const estGagnant = gagnant === eq;
    place.querySelector(".place-bloc").style.setProperty(
      "--h", (gagnant ? (estGagnant ? hauteurs.gagne : hauteurs.perd) : hauteurs.gagne) + "vh");
    place.querySelector(".place-rang").textContent = gagnant ? (estGagnant ? "1" : "2") : "1";
    place.classList.add("monte");
    if (estGagnant || !gagnant) place.classList.add("gagnant");
  }

  sons.rideau(); // frou-frou de la montée du podium
  setTimeout(() => {
    const titre = $("victoire-titre");
    let texte, couleur;
    if (gagnant) {
      texte = "VICTOIRE DES " + CONFIG.equipes[gagnant].nom + " !";
      couleur = CONFIG.equipes[gagnant].couleur;
    } else {
      texte = "ÉGALITÉ PARFAITE !";
      couleur = "#ffd24a";
    }
    $("victoire-entete").textContent = `🏆 ENFANTS ${e} — ${a} PARENTS 🏆`;
    titre.textContent = texte;
    titre.style.color = couleur;
    titre.style.textShadow = `0 0 40px ${couleur}`;
    titre.classList.add("montre");
    $("victoire-mascotte").classList.add("visible");
    sons.victoire();
    lancerConfettis();
  }, 900);
}

function pluieConfettis(nombre, intervalle, encoreActif) {
  const couleurs = ["#00d9ff", "#ff2e88", "#ffd24a", "#3ddc84", "#c04dff", "#ffffff"];
  for (let i = 0; i < nombre; i++) {
    setTimeout(() => {
      if (encoreActif && !encoreActif()) return;
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = couleurs[Math.floor(Math.random() * couleurs.length)];
      c.style.animationDuration = (2.5 + Math.random() * 3) + "s";
      c.style.borderRadius = Math.random() > .5 ? "50%" : "0";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 6000);
    }, i * intervalle);
  }
}

function lancerConfettis() {
  pluieConfettis(120, 60, () => ecranActuel === "victoire");
}

/* ---------------------------------------------------------------- Nouvelle partie */

function nouvellePartie() {
  if (!confirm("Recommencer une nouvelle partie ? Les scores et cartes retournées seront remis à zéro.")) return;
  resetSansConfirmation();
}

/* ---------------------------------------------------------------- Clavier */

document.addEventListener("keydown", (e) => {
  if (e.repeat && e.key.toLowerCase() !== "v") return;
  ctx(); // débloque l'audio au premier appui
  majAmbiance();

  const k = e.key.toLowerCase();

  // Aide
  if (k === "?" || e.key === "F1") { e.preventDefault(); $("aide").classList.toggle("visible"); return; }
  if ($("aide").classList.contains("visible") && e.key === "Escape") { $("aide").classList.remove("visible"); return; }

  // Écran titre
  if (ecranActuel === "titre") {
    if (e.key === " " || e.key === "Enter") demarrerVeillee();
    return;
  }

  // Bruit-o-mètre : B l'ouvre et le ferme ; E/P lancent la mesure d'une équipe
  if (k === "b") { toggleBruitometre(); return; }
  if (bruitometre.actif) {
    if (k === "e") mesurerBruit("enfants");
    else if (k === "p") mesurerBruit("adultes");
    else if (e.key === "Escape") fermerBruitometre();
    return;
  }

  // Défi surprise : S le déclenche et le termine, où qu'on soit
  if (k === "s") { toggleDefiSurprise(); return; }
  if (defiSurprise.actif) return; // le reste du clavier est gelé pendant le défi

  // Écran victoire
  if (ecranActuel === "victoire") {
    if (e.key === "Escape") retourMur(false);
    return;
  }

  // Secret présentateur (maintenir V)
  if (k === "v" && carteEnCours && carteEnCours.contenu.secret) {
    $("secret-peek").classList.add("visible");
    return;
  }

  switch (true) {
    // ----- Mur : saisie du numéro de carte
    case ecranActuel === "mur" && /^Digit\d$/.test(e.code):
    case ecranActuel === "mur" && /^Numpad\d$/.test(e.code): {
      saisie = (saisie + e.code.slice(-1)).slice(-2);
      const el = $("saisie-numero");
      el.textContent = "Carte " + saisie;
      el.style.display = "block";
      clearTimeout(saisieTimeout);
      saisieTimeout = setTimeout(() => { saisie = ""; el.style.display = "none"; }, 4000);
      return;
    }
    case ecranActuel === "mur" && e.key === "Enter" && saisie !== "": {
      const n = parseInt(saisie, 10);
      saisie = "";
      $("saisie-numero").style.display = "none";
      if (n >= 1 && n <= NB_CARTES) choisirCarte(n);
      return;
    }
    case ecranActuel === "mur" && e.key === "Backspace":
      saisie = ""; $("saisie-numero").style.display = "none"; return;

    // ----- Épreuve : choix Duo (1) / Carré (2) / Cash (3)
    case ecranActuel === "epreuve" && !!carteEnCours && !!carteEnCours.aDcc
         && !carteEnCours.dccMode && /^(Digit|Numpad)[123]$/.test(e.code):
      choisirModeDcc({ 1: "duo", 2: "carre", 3: "cash" }[e.code.slice(-1)]);
      return;

    // ----- Épreuve : ESPACE termine un bonus / malus
    case ecranActuel === "epreuve" && e.key === " " && !!carteEnCours
         && ["bonus", "malus"].includes(carteEnCours.carte.type):
      e.preventDefault(); retourMur(true); return;

    // ----- Épreuve
    case k === "r": basculerReponse(); return;
    case k === "i": basculerIndice(); return;
    case k === "m": basculerMusique(); return;
    case k === "t" && e.shiftKey: resetTimer(); return;
    case k === "t": basculerTimer(); return;
    case k === "o": valider(true); return;
    case k === "n":
      if (carteEnCours && carteEnCours.validationCommune) validerCommun(null);
      else valider(false);
      return;
    case k === "e" && !!carteEnCours && carteEnCours.validationCommune: validerCommun("enfants"); return;
    case k === "p" && !!carteEnCours && carteEnCours.validationCommune: validerCommun("adultes"); return;

    // ----- Divers
    case k === "h" && ecranActuel === "mur": carteHasard(); return;
    case k === "c":
      etat.tour = etat.tour === "enfants" ? "adultes" : "enfants";
      sauvegarder(); rafraichirBandeau(); return;
    case k === "f": ecranVictoire(); return;
    case e.key === "Escape":
      if (ecranActuel === "epreuve") {
        // Retour sans valider : la carte redevient disponible
        if (carteEnCours) { delete etat.utilisees[carteEnCours.numero]; }
        retourMur(false);
      }
      return;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "v") $("secret-peek").classList.remove("visible");
});

/* ---------------------------------------------------------------- Barre de régie */

let regieTimeout = null;
document.addEventListener("mousemove", (e) => {
  const regie = $("regie");
  if (e.clientY > window.innerHeight - 70) {
    regie.classList.add("visible");
    clearTimeout(regieTimeout);
  } else if (regie.classList.contains("visible")) {
    clearTimeout(regieTimeout);
    regieTimeout = setTimeout(() => regie.classList.remove("visible"), 1500);
  }
});

$("btn-retour").addEventListener("click", () => {
  if (ecranActuel === "epreuve" && carteEnCours) { delete etat.utilisees[carteEnCours.numero]; retourMur(false); }
  else if (ecranActuel === "victoire" || ecranActuel === "titre") retourMur(false);
});
$("btn-timer").addEventListener("click", basculerTimer);
$("btn-indice").addEventListener("click", basculerIndice);
$("btn-reponse").addEventListener("click", basculerReponse);
$("btn-musique").addEventListener("click", basculerMusique);
$("btn-reussi").addEventListener("click", () => valider(true));
$("btn-rate").addEventListener("click", () => valider(false));
$("btn-gagne-enfants").addEventListener("click", () => validerCommun("enfants"));
$("btn-gagne-adultes").addEventListener("click", () => validerCommun("adultes"));
$("btn-personne").addEventListener("click", () => validerCommun(null));
$("btn-tour").addEventListener("click", () => { etat.tour = etat.tour === "enfants" ? "adultes" : "enfants"; sauvegarder(); rafraichirBandeau(); });
$("btn-victoire").addEventListener("click", ecranVictoire);
$("btn-aide").addEventListener("click", () => $("aide").classList.toggle("visible"));
$("btn-reset").addEventListener("click", nouvellePartie);

function ajusterScore(equipe, delta) {
  etat.scores[equipe] = Math.max(0, etat.scores[equipe] + delta);
  pointsFlottants((delta > 0 ? "+" : "−") + Math.abs(delta), equipe);
  if (delta > 0) sons.points();
  sauvegarder();
  rafraichirBandeau();
}
$("btn-enfants-plus").addEventListener("click", () => ajusterScore("enfants", 1));
$("btn-enfants-moins").addEventListener("click", () => ajusterScore("enfants", -1));
$("btn-adultes-plus").addEventListener("click", () => ajusterScore("adultes", 1));
$("btn-adultes-moins").addEventListener("click", () => ajusterScore("adultes", -1));

/* ---------------------------------------------------------------- Télécommande (téléphone via PeerJS) */

const BROKERS = ["wss://broker.emqx.io:8084/mqtt", "wss://broker.hivemq.com:8884/mqtt"];
let codeSalle = null;
let clientMqtt = null;
let brokerActuel = 0;
let telephoneVuA = 0;

function topicBase() { return "pve-veillee/" + codeSalle; }

function initTelecommande() {
  if (typeof mqtt === "undefined") return; // hors ligne : le jeu marche sans télécommande
  codeSalle = localStorage.getItem("pve-code");
  if (!codeSalle) {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    codeSalle = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    localStorage.setItem("pve-code", codeSalle);
  }
  afficherCode("⏳ connexion…");
  connecterBroker();
  // L'indicateur 📱✔ s'efface si le téléphone ne donne plus signe de vie
  setInterval(() => {
    if (telephoneVuA && Date.now() - telephoneVuA > 90000) {
      telephoneVuA = 0;
      if (clientMqtt && clientMqtt.connected) afficherCode(codeSalle);
    }
  }, 10000);
}

function connecterBroker() {
  if (clientMqtt) { try { clientMqtt.end(true); } catch (e) {} }
  const url = BROKERS[brokerActuel % BROKERS.length];
  clientMqtt = mqtt.connect(url, {
    clientId: "pve-ecran-" + codeSalle + "-" + Math.random().toString(36).slice(2, 8),
    clean: true,
    connectTimeout: 8000,
    reconnectPeriod: 4000,
  });
  let echecs = 0;
  clientMqtt.on("connect", () => {
    echecs = 0;
    clientMqtt.subscribe(topicBase() + "/cmd");
    afficherCode(codeSalle);
    envoyerEtat();
    envoyerCartes();
  });
  clientMqtt.on("message", (t, payload) => {
    try { executerCommande(JSON.parse(payload.toString())); } catch (e) {}
  });
  clientMqtt.on("error", () => {});
  clientMqtt.on("close", () => {
    afficherCode("⏳ reconnexion…");
    echecs++;
    if (echecs >= 3) { // ce relais ne répond pas : on essaye le suivant
      echecs = 0;
      brokerActuel++;
      connecterBroker();
    }
  });
}

function afficherCode(txt) {
  $("titre-code").innerHTML = "📱 Télécommande — code : <b>" + txt + "</b>";
  $("regie-code").textContent = "📱 " + txt;
}

function publier(sousTopic, obj, retenu) {
  if (!clientMqtt || !clientMqtt.connected) return;
  try { clientMqtt.publish(topicBase() + "/" + sousTopic, JSON.stringify(obj), { retain: !!retenu, qos: 0 }); } catch (e) {}
}

function envoyerEtat() {
  const msg = {
    type: "etat",
    scores: etat.scores,           // toujours les vrais scores : le présentateur doit savoir
    scoresCaches: scoresCaches(),  // ...mais le public voit « ??? » à l'écran
    tour: etat.tour,
    badges: etat.badges,
    utilisees: etat.utilisees,
    ecran: ecranActuel,
    timerRestant, timerTotal,
    timerActif: !!timerInterval,
    defiSurprise: { actif: defiSurprise.actif, phase: defiSurprise.phase },
    bruitometre: {
      actif: bruitometre.actif,
      phase: bruitometre.phase,
      equipe: bruitometre.equipe,
      micOK: bruitometre.micOK,
      scores: {
        enfants: bruitometre.scores.enfants == null ? null : Math.round(bruitometre.scores.enfants * 100),
        adultes: bruitometre.scores.adultes == null ? null : Math.round(bruitometre.scores.adultes * 100),
      },
    },
    carte: carteEnCours ? {
      numero: carteEnCours.numero,
      type: carteEnCours.carte.type,
      points: carteEnCours.carte.points || 0,
      perte: carteEnCours.carte.perte || 0,
      commun: carteEnCours.commun,
      validationCommune: !!carteEnCours.validationCommune,
      texte: carteEnCours.contenu.texte || "",
      consigne: carteEnCours.contenu.consigne || "",
      reponse: carteEnCours.contenu.reponse || "",
      indice: carteEnCours.contenu.indice || "",
      secret: carteEnCours.contenu.secret || "",
      musique: !!carteEnCours.contenu.musique,
      media: !!(carteEnCours.contenu.musique || carteEnCours.contenu.musique2 ||
                carteEnCours.contenu.youtube || carteEnCours.contenu.youtube2 ||
                carteEnCours.contenu.video),
      vitesse: vitesseLecture,
      aDcc: !!carteEnCours.aDcc,
      dccMode: carteEnCours.dccMode || null,
      dccPoints: carteEnCours.aDcc ? baremeDcc(carteEnCours.carte) : null,
      propositions: carteEnCours.aDcc ? carteEnCours.contenu.propositions : null,
      double: carteEnCours.carte.type === "doubleblindtest",
      rideaux: carteEnCours.rideaux || null,
    } : null,
  };
  publier("etat", msg, true);
}

// Catalogue complet des cartes (pour l'onglet Cartes de la télécommande)
function envoyerCartes() {
  const jeux = lireJeux();
  publier("cartes", {
    type: "cartes",
    equipes: CONFIG.equipes,
    premierTour: CONFIG.premierTour,
    cartes: CONFIG.cartes,
    defisSurprise: CONFIG.defisSurprise || [],
    scoresSecretsDernieresCartes: CONFIG.scoresSecretsDernieresCartes,
    jeux: Object.keys(jeux).map(nom => ({ nom, date: jeux[nom].date })).sort((a, b) => b.date - a.date),
    jeuActif,
  }, true);
}

function executerCommande(d) {
  if (!d || !d.cmd) return;
  ctxSiPossible();
  telephoneVuA = Date.now();
  afficherCode(codeSalle + " 📱✔");
  switch (d.cmd) {
    case "hello": envoyerEtat(); envoyerCartes(); return;
    case "ping": return;
    case "majCarte": majCarte(d); return;
    case "majDefis": majDefis(d.liste); return;
    case "resetCartes": resetCartes(); return;
    case "sauverJeu": sauverJeu(d.nom); return;
    case "chargerJeu": chargerJeu(d.nom); return;
    case "supprimerJeu": supprimerJeu(d.nom); return;
    case "defiSurprise": toggleDefiSurprise(); return;
    case "dcc": choisirModeDcc(d.mode); return;
    case "fichierPC": demanderFichierPC(d); return;
    case "vitesse": appliquerVitesse(d.taux); return;
    case "bonusPublic": bonusPublic(d.equipe); return;
    case "rideau": leverRideau(+d.i || 1); return;
    case "carteHasard": carteHasard(); return;
    case "bruitometre": toggleBruitometre(); return;
    case "mesurerBruit": mesurerBruit(d.equipe); return;
  }
  switch (d.cmd) {
    case "demarrer":  demarrerVeillee(); break;
    case "carte":     if (ecranActuel === "mur") choisirCarte(+d.n); break;
    case "valider":   valider(!!d.ok); break;
    case "validerCommun": validerCommun(d.gagnant || null); break;
    case "continuer": // fin d'un bonus / malus
      if (carteEnCours && ["bonus", "malus"].includes(carteEnCours.carte.type)) retourMur(true);
      break;
    case "retour":    // annule l'épreuve, la carte redevient disponible
      if (ecranActuel === "epreuve" && carteEnCours) { delete etat.utilisees[carteEnCours.numero]; retourMur(false); }
      else if (ecranActuel === "victoire") retourMur(false);
      break;
    case "timer":      basculerTimer(); envoyerEtat(); break;
    case "resetTimer": resetTimer(); envoyerEtat(); break;
    case "indice":     basculerIndice(); break;
    case "reponse":    basculerReponse(); break;
    case "musique":    basculerMusique(); break;
    case "tour":       etat.tour = etat.tour === "enfants" ? "adultes" : "enfants"; sauvegarder(); rafraichirBandeau(); break;
    case "score":      ajusterScore(d.equipe, d.delta); break;
    case "victoire":   ecranVictoire(); break;
    case "reset":      resetSansConfirmation(); break;
  }
}

function ctxSiPossible() {
  // L'audio ne peut être débloqué que par un geste local : on essaye, sans bloquer
  try { ctx(); } catch (e) {}
}

/* ------- Modification des cartes depuis la télécommande (onglet Cartes) */

const CLE_CARTES = "pve-cartes-v2";     // { base, deck } : le deck actif + la version de cartes.js qui lui a servi de base
const CLE_JEUX = "pve-jeux-v1";         // jeux nommés : { nom: { date, cartes } }
const CLE_JEU_ACTIF = "pve-jeu-actif";
const CHAMPS_EDITABLES = ["texte", "consigne", "reponse", "indice", "secret", "musique", "musique2", "youtube", "youtube2", "video", "propositions"];
const CHAMPS_CARTE = ["type", "points", "perte", "timer", "effet", "valeur"];
let CARTES_ORIGINALES = null;  // instantané du cartes.js d'origine
let DEFIS_ORIGINAUX = null;    // idem pour la liste des défis surprise
let jeuActif = null;

const clone = (o) => JSON.parse(JSON.stringify(o));

function chargerModifsCartes() {
  CARTES_ORIGINALES = clone(CONFIG.cartes);
  DEFIS_ORIGINAUX = clone(CONFIG.defisSurprise || []);
  jeuActif = localStorage.getItem(CLE_JEU_ACTIF) || null;
  // Les anciens formats stockaient le deck sans sa base : impossible de savoir
  // ce qui était une modification. On repart du cartes.js à jour (les jeux
  // nommés, eux, sont conservés).
  try { localStorage.removeItem("pve-cartes-v1"); } catch (e) {}
  let stocke = null;
  try { stocke = JSON.parse(localStorage.getItem(CLE_CARTES) || "null"); } catch (e) {}
  if (!stocke || !stocke.deck || !stocke.base) return;
  // Fusion : les modifications de l'utilisateur (deck ≠ base) sont conservées,
  // tout le reste vient du cartes.js à jour — les nouveautés arrivent donc
  // automatiquement sans écraser les personnalisations.
  CONFIG.cartes = fusionnerDecks(stocke.base, stocke.deck, CARTES_ORIGINALES);
  // Défis surprise : la liste personnalisée gagne, sinon celle du cartes.js
  if (stocke.defis && JSON.stringify(stocke.defis) !== JSON.stringify(stocke.defisBase)) {
    CONFIG.defisSurprise = clone(stocke.defis);
  }
  sauverDeck();
}

function fusionnerDecks(base, deck, nouvelleBase) {
  const resultat = clone(nouvelleBase);
  const differe = (a, b) => JSON.stringify(a === undefined ? null : a) !== JSON.stringify(b === undefined ? null : b);
  for (const n in deck) {
    if (!resultat[n]) { resultat[n] = clone(deck[n]); continue; }
    const ancienne = base[n] || {};
    for (const champ of CHAMPS_CARTE) {
      if (differe(deck[n][champ], ancienne[champ])) {
        if (deck[n][champ] === undefined) delete resultat[n][champ];
        else resultat[n][champ] = clone(deck[n][champ]);
      }
    }
    for (const cible of ["enfants", "adultes", "commun"]) {
      const vDeck = deck[n][cible] || {}, vBase = ancienne[cible] || {};
      for (const champ of CHAMPS_EDITABLES) {
        if (differe(vDeck[champ], vBase[champ])) {
          if (!resultat[n][cible]) resultat[n][cible] = {};
          if (vDeck[champ] === undefined) delete resultat[n][cible][champ];
          else resultat[n][cible][champ] = clone(vDeck[champ]);
        }
      }
    }
  }
  return resultat;
}

function sauverDeck() {
  try {
    localStorage.setItem(CLE_CARTES, JSON.stringify({
      base: CARTES_ORIGINALES, deck: CONFIG.cartes,
      defisBase: DEFIS_ORIGINAUX, defis: CONFIG.defisSurprise || [],
    }));
  } catch (e) {}
}

// Remplace toute la liste des défis surprise (depuis la télécommande)
function majDefis(liste) {
  if (!Array.isArray(liste)) return;
  CONFIG.defisSurprise = liste
    .map(t => String(t).trim())
    .filter(Boolean)
    .slice(0, 60);
  sauverDeck();
  envoyerCartes();
}

function appliquerModifCarte(n, meta, variantes) {
  const carte = CONFIG.cartes[n];
  if (!carte) return;
  for (const champ of CHAMPS_CARTE) {
    if (!meta || !(champ in meta)) continue;
    const v = meta[champ];
    if (v === "" || v == null || (typeof v === "number" && isNaN(v))) {
      if (champ !== "type") delete carte[champ];
    } else {
      carte[champ] = v;
    }
  }
  for (const cible of ["enfants", "adultes", "commun"]) {
    if (!variantes || !variantes[cible]) continue;
    if (!carte[cible]) carte[cible] = {};
    for (const champ of CHAMPS_EDITABLES) {
      if (champ in variantes[cible]) {
        const v = variantes[cible][champ];
        const vide = v == null || v === "" || (Array.isArray(v) && !v.filter(Boolean).length);
        if (vide) delete carte[cible][champ];
        else carte[cible][champ] = v;
      }
    }
  }
}

function majCarte(d) {
  if (!d.n || !CONFIG.cartes[d.n]) return;
  appliquerModifCarte(d.n, d.carte, d.variantes);
  sauverDeck();
  envoyerCartes();
  rafraichirMur();
  // Si la carte modifiée est en cours d'affichage, on rafraîchit
  if (carteEnCours && carteEnCours.numero === +d.n) {
    const def = CONFIG.cartes[d.n];
    carteEnCours.carte = def;
    carteEnCours.commun = !!def.commun;
    carteEnCours.contenu = def.commun || def[carteEnCours.equipe] || def.enfants || def.adultes;
    ouvrirEpreuve();
  }
}

function resetCartes() {
  try { localStorage.removeItem(CLE_CARTES); localStorage.removeItem(CLE_JEU_ACTIF); } catch (e) {}
  jeuActif = null;
  if (CARTES_ORIGINALES) CONFIG.cartes = clone(CARTES_ORIGINALES);
  if (DEFIS_ORIGINAUX) CONFIG.defisSurprise = clone(DEFIS_ORIGINAUX);
  envoyerCartes();
  rafraichirMur();
}

/* ------- Jeux enregistrés (plusieurs configurations nommées) */

function lireJeux() {
  try { return JSON.parse(localStorage.getItem(CLE_JEUX) || "{}"); } catch (e) { return {}; }
}
function ecrireJeux(jeux) {
  try { localStorage.setItem(CLE_JEUX, JSON.stringify(jeux)); } catch (e) {}
}

function sauverJeu(nom) {
  nom = String(nom || "").trim().slice(0, 40);
  if (!nom) return;
  const jeux = lireJeux();
  jeux[nom] = { date: Date.now(), cartes: clone(CONFIG.cartes), defis: clone(CONFIG.defisSurprise || []) };
  ecrireJeux(jeux);
  jeuActif = nom;
  try { localStorage.setItem(CLE_JEU_ACTIF, nom); } catch (e) {}
  envoyerCartes();
}

function chargerJeu(nom) {
  const jeu = lireJeux()[nom];
  if (!jeu) return;
  CONFIG.cartes = clone(jeu.cartes);
  if (jeu.defis) CONFIG.defisSurprise = clone(jeu.defis);
  sauverDeck();
  jeuActif = nom;
  try { localStorage.setItem(CLE_JEU_ACTIF, nom); } catch (e) {}
  envoyerCartes();
  rafraichirMur();
}

function supprimerJeu(nom) {
  const jeux = lireJeux();
  delete jeux[nom];
  ecrireJeux(jeux);
  if (jeuActif === nom) {
    jeuActif = null;
    try { localStorage.removeItem(CLE_JEU_ACTIF); } catch (e) {}
  }
  envoyerCartes();
}

/* ---------------------------------------------------------------- Duo / Carré / Cash */

function baremeDcc(carte) {
  const p = carte.points || 2;
  return { duo: Math.max(1, Math.ceil(p / 2)), carre: p, cash: p * 2 };
}

function preparerDcc() {
  const c = carteEnCours;
  const choix = $("dcc-choix");
  $("dcc-mode-badge").classList.remove("visible");
  $("dcc-propositions").classList.remove("visible");
  $("dcc-propositions").innerHTML = "";
  if (!c || !c.aDcc) { choix.classList.remove("visible"); return; }
  const bareme = baremeDcc(c.carte);
  choix.querySelector(".duo small").textContent = "2 choix — " + bareme.duo + " pt" + (bareme.duo > 1 ? "s" : "");
  choix.querySelector(".carre small").textContent = "4 choix — " + bareme.carre + " pts";
  choix.querySelector(".cash small").textContent = "sans aide — " + bareme.cash + " pts";
  choix.classList.add("visible");
  $("epreuve-points").style.display = "none";
}

function choisirModeDcc(mode) {
  const c = carteEnCours;
  if (!c || !c.aDcc || c.dccMode || !["duo", "carre", "cash"].includes(mode)) return;
  c.dccMode = mode;
  sons.jingle();
  const bareme = baremeDcc(c.carte);
  $("dcc-choix").classList.remove("visible");
  const badge = $("dcc-mode-badge");
  badge.textContent = { duo: "🎯 DUO", carre: "🔲 CARRÉ", cash: "💰 CASH" }[mode] +
    " — " + bareme[mode] + " point" + (bareme[mode] > 1 ? "s" : "");
  badge.classList.add("visible");

  const props = c.contenu.propositions || [];
  const bonne = props[0];
  let affichees = [];
  if (mode === "duo") affichees = [bonne, props[1]].filter(x => x != null);
  if (mode === "carre") affichees = props.slice(0, 4);
  // mélange
  affichees = affichees.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const zone = $("dcc-propositions");
  const lettres = ["A", "B", "C", "D"];
  affichees.forEach((p, i) => {
    const el = document.createElement("div");
    el.className = "dcc-prop";
    el.style.animationDelay = (i * .12) + "s";
    if (p === bonne) el.dataset.bonne = "1";
    el.innerHTML = `<span class="lettre">${lettres[i]}</span><span></span>`;
    el.querySelector("span:last-child").textContent = p;
    zone.appendChild(el);
  });
  if (affichees.length) zone.classList.add("visible");
  envoyerEtat();
}

/* ---------------------------------------------------------------- Défi surprise 🎉 */

let defiSurprise = { actif: false, phase: null, texte: "" };
let dernierDefi = -1;
let defiTimeout = null;

function toggleDefiSurprise() {
  if (defiSurprise.actif) { finirDefiSurprise(); return; }
  const liste = CONFIG.defisSurprise || [];
  if (!liste.length) return;
  let i;
  do { i = Math.floor(Math.random() * liste.length); } while (liste.length > 1 && i === dernierDefi);
  dernierDefi = i;
  defiSurprise = { actif: true, phase: "tambour", texte: liste[i] };
  arreterAmbiance();
  if (timerInterval) basculerTimer(); // met le chrono d'épreuve en pause
  const el = $("defi-surprise");
  $("defi-texte").textContent = liste[i];
  el.classList.add("visible", "tambour");
  el.classList.remove("reveal");
  sons.tambour();
  envoyerEtat();
  defiTimeout = setTimeout(() => {
    if (!defiSurprise.actif) return;
    defiSurprise.phase = "reveal";
    el.classList.remove("tambour");
    el.classList.add("reveal");
    sons.paf();
    pluieConfettis(36, 30, () => defiSurprise.actif);
    envoyerEtat();
  }, 2400);
}

function finirDefiSurprise() {
  clearTimeout(defiTimeout);
  defiSurprise = { actif: false, phase: null, texte: "" };
  $("defi-surprise").classList.remove("visible", "tambour", "reveal");
  sons.jingle();
  majAmbiance();
  envoyerEtat();
}

/* ---------------------------------------------------------------- Bruit-o-mètre 🔊 */
/* L'équipe qui crie le plus fort gagne le droit de commencer la partie.
   Micro de l'ordinateur (sans traitement automatique du gain, pour mesurer
   la vraie puissance), 10 secondes par équipe, puis suspense : la jauge se
   remplit à fond sous roulement de tambour avant de retomber sur le score. */

const bruitometre = {
  actif: false,
  phase: "attente",            // attente | prepare | mesure | suspense
  equipe: null,
  scores: { enfants: null, adultes: null },  // 0..1
  micOK: false, demande: false,
  flux: null, analyseur: null, tampon: null,
  niveau: 0, pic: 0,
  tPhase: 0,
};

// Lancement de la veillée depuis l'écran titre : sur une partie vierge,
// le bruit-o-mètre s'ouvre automatiquement pour décider qui commence !
function demarrerVeillee() {
  if (ecranActuel !== "titre") return;
  montrerEcran("mur");
  sons.jingle();
  const partieVierge = Object.keys(etat.utilisees).length === 0 &&
    !etat.scores.enfants && !etat.scores.adultes;
  if (partieVierge && !bruitometre.actif) {
    setTimeout(() => {
      if (ecranActuel === "mur" && !carteEnCours && !bruitometre.actif) toggleBruitometre();
    }, 800);
  }
}

function toggleBruitometre() {
  if (bruitometre.actif) { fermerBruitometre(); return; }
  bruitometre.actif = true;
  bruitometre.phase = "attente";
  bruitometre.equipe = null;
  bruitometre.scores = { enfants: null, adultes: null };
  bruitometre.niveau = 0; bruitometre.pic = 0;
  arreterAmbiance();
  $("bruitometre").classList.add("visible");
  $("bruit-compte").textContent = "";
  $("bruit-message").textContent = "";
  document.querySelectorAll(".jauge").forEach(j => j.classList.remove("gagnante", "crie"));
  for (const eq of ["enfants", "adultes"]) {
    const j = $("jauge-" + eq);
    j.querySelector(".jauge-remplissage").style.height = "0%";
    j.querySelector(".jauge-score").textContent = "—";
    j.querySelector(".jauge-pic").classList.remove("visible");
  }
  majStatutBruit("Choisis l'équipe qui crie depuis la télécommande (ou touches E / P)");
  demanderMicro();
  sons.jingle();
  requestAnimationFrame(boucleBruit);
  envoyerEtat();
}

function fermerBruitometre() {
  bruitometre.actif = false;
  $("bruitometre").classList.remove("visible");
  if (bruitometre.flux) {
    bruitometre.flux.getTracks().forEach(t => t.stop());
    bruitometre.flux = null;
  }
  bruitometre.micOK = false;
  bruitometre.demande = false;
  majAmbiance();
  envoyerEtat();
}

function majStatutBruit(txt) {
  $("bruit-statut").textContent = txt;
}

function demanderMicro() {
  if (bruitometre.micOK || bruitometre.demande) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    majStatutBruit("❌ Micro indisponible dans ce navigateur");
    return;
  }
  bruitometre.demande = true;
  majStatutBruit("🎤 Autorise le micro sur l'ordinateur…");
  navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  }).then((flux) => {
    const c = ctx();
    c.resume();
    bruitometre.flux = flux;
    const source = c.createMediaStreamSource(flux);
    bruitometre.analyseur = c.createAnalyser();
    bruitometre.analyseur.fftSize = 1024;
    source.connect(bruitometre.analyseur);
    bruitometre.tampon = new Uint8Array(bruitometre.analyseur.fftSize);
    bruitometre.micOK = true;
    majStatutBruit("🎤 Micro prêt ! Choisis l'équipe qui crie (télécommande, ou touches E / P)");
    envoyerEtat();
  }).catch(() => {
    bruitometre.demande = false;
    majStatutBruit("❌ Micro refusé — autorise-le dans le navigateur puis rouvre le bruit-o-mètre");
    envoyerEtat();
  });
}

function mesurerBruit(equipe) {
  if (!bruitometre.actif || bruitometre.phase !== "attente" || !CONFIG.equipes[equipe]) return;
  if (!bruitometre.micOK) { demanderMicro(); return; }
  bruitometre.equipe = equipe;
  bruitometre.phase = "prepare";
  bruitometre.tPhase = performance.now();
  bruitometre.niveau = 0; bruitometre.pic = 0;
  $("jauge-" + equipe).querySelector(".jauge-score").textContent = "…";
  majStatutBruit("");
  envoyerEtat();
}

function niveauMicro() {
  if (!bruitometre.micOK) return 0;
  bruitometre.analyseur.getByteTimeDomainData(bruitometre.tampon);
  let somme = 0;
  for (let i = 0; i < bruitometre.tampon.length; i++) {
    const v = (bruitometre.tampon[i] - 128) / 128;
    somme += v * v;
  }
  const rms = Math.sqrt(somme / bruitometre.tampon.length);
  return Math.min(1, Math.pow(rms * 2.6, 0.75));
}

function boucleBruit(maintenant) {
  const b = bruitometre;
  if (!b.actif) return;
  const compte = $("bruit-compte"), message = $("bruit-message");
  const jauge = b.equipe ? $("jauge-" + b.equipe) : null;
  const ecoule = maintenant - b.tPhase;

  if (b.phase === "prepare") {
    const n = 3 - Math.floor(ecoule / 800);
    if (compte.textContent !== String(n) && n >= 1) { compte.textContent = n; sons.tic(); }
    compte.classList.remove("urgent");
    message.textContent = CONFIG.equipes[b.equipe].nom + ", préparez-vous…";
    message.classList.remove("criez");
    if (ecoule >= 2400) {
      b.phase = "mesure";
      b.tPhase = maintenant;
      sons.buzzer();
      envoyerEtat();
    }
  } else if (b.phase === "mesure") {
    const restant = Math.max(0, 10000 - ecoule);
    const n = Math.ceil(restant / 1000);
    if (compte.textContent !== String(n)) {
      compte.textContent = n;
      if (n <= 3) sons.tic();
    }
    compte.classList.toggle("urgent", n <= 3);
    message.textContent = "CRIEZ !!! 📣";
    message.classList.add("criez");
    const cible = niveauMicro();
    b.niveau += (cible - b.niveau) * (cible > b.niveau ? 0.4 : 0.12);
    b.pic = Math.max(b.pic, b.niveau);
    jauge.querySelector(".jauge-remplissage").style.height = (b.niveau * 100) + "%";
    const pic = jauge.querySelector(".jauge-pic");
    pic.style.bottom = (b.pic * 100) + "%";
    pic.classList.add("visible");
    jauge.classList.toggle("crie", b.niveau > 0.55);
    if (ecoule >= 10000) {
      b.phase = "suspense";
      b.tPhase = maintenant;
      jauge.classList.remove("crie");
      compte.textContent = "";
      compte.classList.remove("urgent");
      message.textContent = "Roulement de tambour… 🥁";
      message.classList.remove("criez");
      sons.tambour();
      envoyerEtat();
    }
  } else if (b.phase === "suspense") {
    const remplissage = jauge.querySelector(".jauge-remplissage");
    const score = Math.max(0.03, b.pic);
    if (ecoule < 2300) {
      // La jauge se remplit entièrement toute seule… suspense !
      const u = ecoule / 2300;
      const montee = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      remplissage.style.height = (montee * 100) + "%";
    } else if (ecoule < 3400) {
      // …puis retombe en rebondissant sur le vrai score
      const u = (ecoule - 2300) / 1100;
      const rebond = Math.pow(1 - u, 2) * Math.abs(Math.cos(u * 9));
      remplissage.style.height = ((score + (1 - score) * rebond) * 100) + "%";
    } else {
      remplissage.style.height = (score * 100) + "%";
      b.scores[b.equipe] = score;
      jauge.querySelector(".jauge-score").textContent = Math.round(score * 100) + " !";
      jauge.querySelector(".jauge-pic").classList.remove("visible");
      sons.reveal(); sons.points();
      message.textContent = "";
      b.equipe = null;
      b.phase = "attente";
      verdictBruit();
      envoyerEtat();
    }
  }
  requestAnimationFrame(boucleBruit);
}

function verdictBruit() {
  const s = bruitometre.scores;
  if (s.enfants == null || s.adultes == null) {
    majStatutBruit("Au tour de l'autre équipe ! (télécommande, ou touches E / P)");
    return;
  }
  const pE = Math.round(s.enfants * 100), pA = Math.round(s.adultes * 100);
  const gagnant = pE >= pA ? "enfants" : "adultes"; // égalité : avantage aux enfants
  $("jauge-" + gagnant).classList.add("gagnante");
  $("bruit-message").textContent = pE === pA
    ? "ÉGALITÉ ! Avantage aux ENFANTS 🧒"
    : "LES " + CONFIG.equipes[gagnant].nom + " COMMENCERONT !";
  etat.tour = gagnant;
  sauvegarder();
  rafraichirBandeau();
  sons.victoire();
  pluieConfettis(25, 40, () => bruitometre.actif);
  majStatutBruit("Ferme le bruit-o-mètre pour lancer la partie 🎬");
}

/* ---------------------------------------------------------------- Fichiers locaux (musiques / vidéos du PC) */
/* Les fichiers choisis sont stockés dans le navigateur (IndexedDB) : rien à
   téléverser sur internet, et ça survit au rechargement de la page. */

let dbMedias = null;
let urlsARevoquer = [];
let demandeFichier = null;

function ouvrirDB() {
  return new Promise((res) => {
    if (dbMedias) return res(dbMedias);
    try {
      const rq = indexedDB.open("pve-medias", 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("fichiers");
      rq.onsuccess = () => { dbMedias = rq.result; res(dbMedias); };
      rq.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}

function stockerMedia(cle, fichier) {
  return ouvrirDB().then(db => new Promise((res) => {
    if (!db) return res(false);
    const tx = db.transaction("fichiers", "readwrite");
    tx.objectStore("fichiers").put(fichier, cle);
    tx.oncomplete = () => res(true);
    tx.onerror = () => res(false);
  }));
}

function lireMedia(cle) {
  return ouvrirDB().then(db => new Promise((res) => {
    if (!db) return res(null);
    const rq = db.transaction("fichiers").objectStore("fichiers").get(cle);
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => res(null);
  }));
}

// "local:xxx" -> URL de lecture depuis IndexedDB ; sinon la valeur telle quelle
function resoudreMedia(valeur) {
  if (!valeur) return Promise.resolve(null);
  const s = String(valeur);
  if (!s.startsWith("local:")) return Promise.resolve(s);
  return lireMedia(s.slice(6)).then(f => {
    if (!f) return null;
    const url = URL.createObjectURL(f);
    urlsARevoquer.push(url);
    return url;
  });
}

function demanderFichierPC(d) {
  if (!d || !d.n || !d.cible || !d.champ) return;
  demandeFichier = d;
  const estAudio = String(d.champ).startsWith("musique");
  $("fichier-detail").textContent =
    "Carte " + d.n + " (" + d.cible + ") — " + (estAudio ? "fichier audio 🎵" : "fichier vidéo 🎬") +
    (d.champ === "musique2" ? " (musique n°2)" : "");
  $("fichier-input").accept = estAudio ? "audio/*" : "video/*";
  $("fichier-overlay").classList.add("visible");
}

function fermerFichierOverlay() {
  demandeFichier = null;
  $("fichier-overlay").classList.remove("visible");
  $("fichier-input").value = "";
}

$("fichier-choisir").addEventListener("click", () => $("fichier-input").click());
$("fichier-annuler").addEventListener("click", fermerFichierOverlay);
$("fichier-input").addEventListener("change", () => {
  const f = $("fichier-input").files[0];
  const d = demandeFichier;
  if (!f || !d) { fermerFichierOverlay(); return; }
  const cle = d.n + "-" + d.cible + "-" + d.champ;
  stockerMedia(cle, f).then((ok) => {
    if (ok) {
      majCarte({ n: d.n, variantes: { [d.cible]: { [d.champ]: "local:" + cle } } });
      annoncer("✔ « " + f.name + " » enregistré pour la carte " + d.n);
    } else {
      annoncer("⚠️ Impossible de stocker le fichier");
    }
    fermerFichierOverlay();
  });
});

function resetSansConfirmation() {
  etat = {
    scores: { enfants: 0, adultes: 0 },
    tour: CONFIG.premierTour || "enfants",
    utilisees: {},
    badges: { enfants: [], adultes: [] },
  };
  sauvegarder();
  carteEnCours = null;
  rafraichirMur();
  rafraichirBandeau();
  montrerEcran("mur");
  // Nouvelle partie = nouveau bruit-o-mètre pour décider qui commence
  if (!bruitometre.actif) {
    setTimeout(() => {
      if (ecranActuel === "mur" && !carteEnCours && !bruitometre.actif) toggleBruitometre();
    }, 800);
  }
}

/* ---------------------------------------------------------------- Musique d'ambiance arcade 🕹 */
/* Petite boucle chiptune douce, générée par l'application (aucun fichier).
   Elle apparaît en fondu sur l'écran titre et le mur, et s'éteint en fondu
   partout ailleurs. Volume volontairement bas. */

const ambiance = { actif: false, gain: null, interval: null, pas: 0 };
const AMB_VOLUME = 0.045;
// Progression Do – Sol – La mineur – Fa (douce et connue), notes en demi-tons MIDI
const AMB_ACCORDS = [
  [60, 64, 67, 72], // Do
  [59, 62, 67, 71], // Sol
  [57, 60, 64, 69], // La mineur
  [57, 60, 65, 69], // Fa
];
const AMB_BASSES = [36, 43, 45, 41];
const AMB_MOTIF = [0, 1, 2, 3, 2, 1, 2, 0]; // arpège par accord (8 pas)
const freqMidi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function noteAmbiance(freq, duree, vol, type) {
  const c = ctx();
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || "triangle";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.03);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duree);
  o.connect(g); g.connect(ambiance.gain);
  o.start(); o.stop(c.currentTime + duree + 0.05);
}

function pasAmbiance() {
  if (!ambiance.actif) return;
  const pas = ambiance.pas;
  const accord = AMB_ACCORDS[Math.floor(pas / 8) % 4];
  // Arpège doux
  noteAmbiance(freqMidi(accord[AMB_MOTIF[pas % 8]]), 0.5, 0.5, "triangle");
  // Basse ronde au début de chaque accord
  if (pas % 8 === 0) noteAmbiance(freqMidi(AMB_BASSES[Math.floor(pas / 8) % 4]), 1.8, 0.7, "sine");
  // Petit scintillement aléatoire dans l'aigu (rare, pour éviter la monotonie)
  if (Math.random() < 0.07) noteAmbiance(freqMidi(accord[Math.floor(Math.random() * 4)] + 12), 0.3, 0.22, "square");
  ambiance.pas = (pas + 1) % 32;
}

function demarrerAmbiance() {
  if (ambiance.actif || defiSurprise.actif) return;
  let c;
  try { c = ctx(); } catch (e) { return; }
  if (c.state === "suspended") return; // pas encore de clic / touche : on réessaiera
  ambiance.actif = true;
  ambiance.gain = c.createGain();
  ambiance.gain.gain.setValueAtTime(0.0001, c.currentTime);
  ambiance.gain.gain.linearRampToValueAtTime(AMB_VOLUME, c.currentTime + 2.5); // fondu d'entrée
  ambiance.gain.connect(c.destination);
  ambiance.pas = 0;
  ambiance.interval = setInterval(pasAmbiance, 270);
}

function arreterAmbiance() {
  if (!ambiance.actif) return;
  ambiance.actif = false;
  const g = ambiance.gain, itv = ambiance.interval;
  try {
    const c = ctx();
    g.gain.cancelScheduledValues(c.currentTime);
    g.gain.setValueAtTime(g.gain.value, c.currentTime);
    g.gain.linearRampToValueAtTime(0.0001, c.currentTime + 1.4); // fondu de sortie
  } catch (e) {}
  setTimeout(() => { clearInterval(itv); try { g.disconnect(); } catch (e) {} }, 1600);
}

function majAmbiance() {
  if (["titre", "mur"].includes(ecranActuel) && !defiSurprise.actif && !bruitometre.actif) demarrerAmbiance();
  else arreterAmbiance();
}

/* ---------------------------------------------------------------- Motion design (plateau vivant) */

// Particules qui flottent sur le titre et le mur
setInterval(() => {
  if (!["mur", "titre"].includes(ecranActuel) || defiSurprise.actif) return;
  if (document.querySelectorAll(".particule").length > 22) return;
  const formes = ["✦", "●", "★", "◆", "♪", "✚"];
  const couleurs = ["rgba(0,217,255,.5)", "rgba(255,46,136,.5)", "rgba(255,210,74,.55)", "rgba(255,255,255,.4)", "rgba(61,220,132,.45)"];
  const p = document.createElement("div");
  p.className = "particule";
  p.textContent = formes[Math.floor(Math.random() * formes.length)];
  p.style.left = Math.random() * 100 + "vw";
  p.style.color = couleurs[Math.floor(Math.random() * couleurs.length)];
  p.style.fontSize = (1.3 + Math.random() * 2.2) + "vh";
  p.style.animationDuration = (7 + Math.random() * 8) + "s";
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 16000);
}, 800);

// Balayage brillant sur une carte au hasard
setInterval(() => {
  if (ecranActuel !== "mur") return;
  const libres = [...document.querySelectorAll(".carte:not(.utilisee)")];
  if (!libres.length) return;
  const c = libres[Math.floor(Math.random() * libres.length)];
  c.classList.add("brille");
  setTimeout(() => c.classList.remove("brille"), 1200);
}, 2600);

// Lilou vient faire coucou de temps en temps
const POSES_COUCOU = ["salut", "saut", "pouce", "coeur", "paint", "livre", "question"];
setInterval(() => {
  if (ecranActuel !== "mur" || defiSurprise.actif) return;
  const el = $("mascotte-coucou");
  const img = el.querySelector("img");
  img.onerror = () => el.classList.remove("visible");
  img.src = "images/lilou-" + POSES_COUCOU[Math.floor(Math.random() * POSES_COUCOU.length)] + ".png";
  el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 4500);
}, 26000);

// Boutons Duo / Carré / Cash cliquables à l'écran
document.querySelectorAll(".dcc-btn").forEach(b => {
  b.addEventListener("click", () => choisirModeDcc(b.dataset.mode));
});

/* ---------------------------------------------------------------- Démarrage */

chargerModifsCartes();
charger();
construireMur();
rafraichirBandeau();
initTelecommande();

// Si une partie était en cours, aller directement au mur
if (Object.keys(etat.utilisees).length > 0 || etat.scores.enfants || etat.scores.adultes) {
  montrerEcran("mur");
}

// Premier clic n'importe où : débloque l'audio et lance l'ambiance
document.addEventListener("click", () => { ctx(); majAmbiance(); }, { once: true });

// Sur l'écran titre, un clic démarre aussi le jeu
$("ecran-titre").addEventListener("click", demarrerVeillee);
