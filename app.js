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
  mime:      { nom: "MIME",                icone: "🎭", couleur: "#ff9f1c" },
  defi:      { nom: "DÉFI",                icone: "💪", couleur: "#ffd24a" },
  bonus:     { nom: "BONUS",               icone: "🎁", couleur: "#3ddc84" },
  malus:     { nom: "MALUS",               icone: "💣", couleur: "#ff4444" },
  piege:     { nom: "CARTE PIÈGE",         icone: "💀", couleur: "#ff2222" },
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
let audioMusique = null;
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
const sons = {
  flip()     { bip(300, 0, .12, "triangle"); bip(520, .09, .15, "triangle"); },
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

function rafraichirMur() {
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

function rafraichirBandeau() {
  $("score-enfants").textContent = etat.scores.enfants;
  $("score-adultes").textContent = etat.scores.adultes;
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

  $("epreuve-icone").textContent = carte.type === "blindtest" ? "" : cat.icone;
  $("vinyle").classList.toggle("visible", carte.type === "blindtest");
  $("vinyle").classList.add("pause");
  $("epreuve-texte").textContent = contenu.texte || "";
  $("epreuve-consigne").textContent = contenu.consigne || "";

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

  // Musique
  stopperMusique();
  if (contenu.musique) {
    audioMusique = new Audio(contenu.musique);
    audioMusique.addEventListener("error", () => annoncerEpreuve("⚠️ Fichier musique introuvable : " + contenu.musique));
  }

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
  carteEnCours = null;
  if (changerTour) etat.tour = etat.tour === "enfants" ? "adultes" : "enfants";
  sauvegarder();
  rafraichirMur();
  rafraichirBandeau();
  montrerEcran("mur");
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
  if (visible) sons.reveal();
}

function basculerMusique() {
  if (!audioMusique) return;
  if (audioMusique.paused) {
    audioMusique.play();
    $("vinyle").classList.remove("pause");
  } else {
    audioMusique.pause();
    $("vinyle").classList.add("pause");
  }
}

function stopperMusique() {
  if (audioMusique) { audioMusique.pause(); audioMusique = null; }
  $("vinyle").classList.add("pause");
}

/* ---------------------------------------------------------------- Victoire */

function ecranVictoire() {
  const e = etat.scores.enfants, a = etat.scores.adultes;
  let titre, couleur;
  if (e > a)      { titre = "VICTOIRE DES ENFANTS !"; couleur = CONFIG.equipes.enfants.couleur; }
  else if (a > e) { titre = "VICTOIRE DES PARENTS !"; couleur = CONFIG.equipes.adultes.couleur; }
  else            { titre = "ÉGALITÉ PARFAITE !";     couleur = "#ffd24a"; }
  $("victoire-titre").textContent = titre;
  $("victoire-titre").style.color = couleur;
  $("victoire-titre").style.textShadow = `0 0 40px ${couleur}`;
  $("victoire-score").textContent = `ENFANTS ${e} — ${a} PARENTS`;
  montrerEcran("victoire");
  sons.victoire();
  lancerConfettis();
}

function lancerConfettis() {
  const couleurs = ["#00d9ff", "#ff2e88", "#ffd24a", "#3ddc84", "#c04dff", "#ffffff"];
  for (let i = 0; i < 120; i++) {
    setTimeout(() => {
      if (ecranActuel !== "victoire") return;
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = couleurs[Math.floor(Math.random() * couleurs.length)];
      c.style.animationDuration = (2.5 + Math.random() * 3) + "s";
      c.style.borderRadius = Math.random() > .5 ? "50%" : "0";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 6000);
    }, i * 60);
  }
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

  const k = e.key.toLowerCase();

  // Aide
  if (k === "?" || e.key === "F1") { e.preventDefault(); $("aide").classList.toggle("visible"); return; }
  if ($("aide").classList.contains("visible") && e.key === "Escape") { $("aide").classList.remove("visible"); return; }

  // Écran titre
  if (ecranActuel === "titre") {
    if (e.key === " " || e.key === "Enter") { montrerEcran("mur"); sons.jingle(); }
    return;
  }

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

let codeSalle = null;
let connexionsTel = [];
let peerEcran = null;

function initTelecommande() {
  if (typeof Peer === "undefined") return; // hors ligne : le jeu marche sans télécommande
  codeSalle = localStorage.getItem("pve-code");
  if (!codeSalle) {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    codeSalle = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    localStorage.setItem("pve-code", codeSalle);
  }
  afficherCode("⏳ connexion…");
  try {
    peerEcran = new Peer("pve-veillee-" + codeSalle);
  } catch (e) { afficherCode("❌ indisponible"); return; }

  peerEcran.on("open", () => afficherCode(codeSalle));
  peerEcran.on("connection", (conn) => {
    conn.on("open", () => {
      connexionsTel.push(conn);
      afficherCode(codeSalle + " 📱✔");
      envoyerEtat();
    });
    conn.on("data", (d) => executerCommande(d));
    conn.on("close", () => {
      connexionsTel = connexionsTel.filter(c => c !== conn);
      if (!connexionsTel.length) afficherCode(codeSalle);
    });
  });
  peerEcran.on("error", (err) => {
    if (err.type === "unavailable-id") {
      // Un ancien onglet garde le code : on en génère un nouveau
      localStorage.removeItem("pve-code");
      setTimeout(initTelecommande, 500);
    } else if (["network", "server-error", "socket-error", "socket-closed"].includes(err.type)) {
      afficherCode("❌ hors ligne");
      setTimeout(() => { try { peerEcran.reconnect(); } catch (e) {} }, 5000);
    }
  });
}

function afficherCode(txt) {
  $("titre-code").innerHTML = "📱 Télécommande — code : <b>" + txt + "</b>";
  $("regie-code").textContent = "📱 " + txt;
}

function envoyerEtat() {
  if (!connexionsTel.length) return;
  const msg = {
    type: "etat",
    scores: etat.scores,
    tour: etat.tour,
    badges: etat.badges,
    utilisees: etat.utilisees,
    ecran: ecranActuel,
    timerRestant, timerTotal,
    timerActif: !!timerInterval,
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
    } : null,
  };
  connexionsTel.forEach(c => { try { c.send(msg); } catch (e) {} });
}

function executerCommande(d) {
  if (!d || !d.cmd) return;
  ctxSiPossible();
  switch (d.cmd) {
    case "demarrer":  if (ecranActuel === "titre") { montrerEcran("mur"); sons.jingle(); } break;
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
}

/* ---------------------------------------------------------------- Démarrage */

charger();
construireMur();
rafraichirBandeau();
initTelecommande();

// Si une partie était en cours, aller directement au mur
if (Object.keys(etat.utilisees).length > 0 || etat.scores.enfants || etat.scores.adultes) {
  montrerEcran("mur");
}

// Premier clic n'importe où : débloque l'audio
document.addEventListener("click", () => ctx(), { once: true });

// Sur l'écran titre, un clic démarre aussi le jeu
$("ecran-titre").addEventListener("click", () => {
  if (ecranActuel === "titre") { montrerEcran("mur"); sons.jingle(); }
});
