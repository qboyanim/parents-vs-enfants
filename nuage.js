/* ═══════════════════════════════════════════════════════════════════════════
   Couche « nuage » de la veillée — Firebase Authentication + Firestore.

   Ce que ça sauvegarde dans le cloud :
     - tes jeux enregistrés (cartes + défis surprise), un document par jeu ;
     - les gros fichiers (musiques, vidéos, images) découpés en morceaux,
       parce que Cloud Storage exige un plan payant depuis février 2026.

   Ce qui protège tout ça : les mêmes règles que le site des cartes. Sans un
   compte dont l'adresse figure dans la liste des membres, rien n'est lisible.
   ═══════════════════════════════════════════════════════════════════════════ */

import { initializeApp }
  from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  setPersistence, browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const CFG = window.FIREBASE_CONFIG || {};
const CONFIGURE = Object.values(CFG).length > 0 &&
  Object.values(CFG).every(v => v && !String(v).startsWith("À_REMPLIR"));

// Un morceau de fichier par document : 700 000 caractères, largement sous la
// limite de 1 Mo par document imposée par Firestore.
const TAILLE_MORCEAU = 700000;

const NUAGE = {
  disponible: CONFIGURE,
  utilisateur: null,
  pret: false,
  surChangement: null,     // callback branché par app.js
};
window.NUAGE_VEILLEE = NUAGE;

let auth = null, bdd = null;

if (CONFIGURE) {
  try {
    const app = initializeApp(CFG, "veillee");
    auth = getAuth(app);
    bdd = getFirestore(app);
    setPersistence(auth, browserLocalPersistence).catch(() => {});
    onAuthStateChanged(auth, (u) => {
      NUAGE.utilisateur = u ? u.email : null;
      NUAGE.pret = true;
      if (NUAGE.surChangement) NUAGE.surChangement();
    });
  } catch (e) {
    console.error("Nuage indisponible :", e);
    NUAGE.disponible = false;
    NUAGE.pret = true;
  }
} else {
  NUAGE.pret = true;
}

/* ─────────────────────────── Connexion ─────────────────────────── */

NUAGE.connexion = async (email, motDePasse) => {
  if (!auth) throw new Error("Firebase non configuré");
  await signInWithEmailAndPassword(auth, String(email).trim(), motDePasse);
  return NUAGE.utilisateur;
};

NUAGE.deconnexion = async () => {
  if (auth) await signOut(auth);
};

/* ─────────────────────────── Jeux enregistrés ─────────────────────────── */

function exigerConnexion() {
  if (!bdd || !NUAGE.utilisateur) throw new Error("Pas connecté au cloud");
}

NUAGE.listerJeux = async () => {
  exigerConnexion();
  const instantane = await getDocs(collection(bdd, "veillee"));
  const jeux = [];
  instantane.forEach(d => {
    const v = d.data();
    if (v && v.type === "jeu") jeux.push({ nom: v.nom || d.id, date: v.date || 0, medias: v.medias || [] });
  });
  return jeux.sort((a, b) => b.date - a.date);
};

NUAGE.envoyerJeu = async (nom, cartes, defis, medias) => {
  exigerConnexion();
  await setDoc(doc(bdd, "veillee", identifiant(nom)), {
    type: "jeu",
    nom: String(nom).slice(0, 60),
    date: Date.now(),
    par: NUAGE.utilisateur,
    medias: medias || [],
    contenu: JSON.stringify({ cartes, defis }),
  });
};

NUAGE.chargerJeu = async (nom) => {
  exigerConnexion();
  const d = await getDoc(doc(bdd, "veillee", identifiant(nom)));
  if (!d.exists()) throw new Error("Jeu introuvable dans le cloud");
  const v = d.data();
  const contenu = JSON.parse(v.contenu || "{}");
  return { nom: v.nom, cartes: contenu.cartes || {}, defis: contenu.defis || [], medias: v.medias || [] };
};

NUAGE.supprimerJeu = async (nom) => {
  exigerConnexion();
  await deleteDoc(doc(bdd, "veillee", identifiant(nom)));
};

// Un nom lisible devient un identifiant de document sûr
function identifiant(nom) {
  return "jeu-" + String(nom).toLowerCase()
    .normalize("NFD")                       // les accents se détachent…
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);  // …et disparaissent ici
}

/* ─────────────────────────── Gros fichiers ─────────────────────────── */

NUAGE.envoyerMedia = async (cle, fichier, surProgres) => {
  exigerConnexion();
  const base64 = await fichierEnBase64(fichier);
  const morceaux = [];
  for (let i = 0; i < base64.length; i += TAILLE_MORCEAU) {
    morceaux.push(base64.slice(i, i + TAILLE_MORCEAU));
  }
  for (let i = 0; i < morceaux.length; i++) {
    await setDoc(doc(bdd, "veillee-morceaux", cle + "__" + i), { data: morceaux[i] });
    if (surProgres) surProgres(Math.round((i + 1) / morceaux.length * 100));
  }
  await setDoc(doc(bdd, "veillee", "media-" + cle), {
    type: "media",
    cle,
    nom: fichier.name || cle,
    mime: fichier.type || "application/octet-stream",
    taille: fichier.size || 0,
    morceaux: morceaux.length,
    date: Date.now(),
  });
  return morceaux.length;
};

NUAGE.recupererMedia = async (cle, surProgres) => {
  exigerConnexion();
  const meta = await getDoc(doc(bdd, "veillee", "media-" + cle));
  if (!meta.exists()) return null;
  const v = meta.data();
  let base64 = "";
  for (let i = 0; i < v.morceaux; i++) {
    const m = await getDoc(doc(bdd, "veillee-morceaux", cle + "__" + i));
    if (!m.exists()) throw new Error("Morceau manquant (" + i + ")");
    base64 += m.data().data;
    if (surProgres) surProgres(Math.round((i + 1) / v.morceaux * 100));
  }
  return { blob: base64EnBlob(base64, v.mime), nom: v.nom, mime: v.mime };
};

NUAGE.listerMedias = async () => {
  exigerConnexion();
  const instantane = await getDocs(collection(bdd, "veillee"));
  const medias = [];
  instantane.forEach(d => {
    const v = d.data();
    if (v && v.type === "media") medias.push({ cle: v.cle, nom: v.nom, taille: v.taille, morceaux: v.morceaux });
  });
  return medias;
};

NUAGE.supprimerMedia = async (cle) => {
  exigerConnexion();
  const meta = await getDoc(doc(bdd, "veillee", "media-" + cle));
  if (meta.exists()) {
    for (let i = 0; i < meta.data().morceaux; i++) {
      await deleteDoc(doc(bdd, "veillee-morceaux", cle + "__" + i));
    }
    await deleteDoc(doc(bdd, "veillee", "media-" + cle));
  }
};

/* ─────────────────────────── Conversions ─────────────────────────── */

function fichierEnBase64(fichier) {
  return new Promise((resoudre, rejeter) => {
    const l = new FileReader();
    l.onload = () => {
      const s = String(l.result);
      resoudre(s.slice(s.indexOf(",") + 1)); // on enlève « data:...;base64, »
    };
    l.onerror = () => rejeter(new Error("Lecture du fichier impossible"));
    l.readAsDataURL(fichier);
  });
}

function base64EnBlob(base64, mime) {
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new Blob([octets], { type: mime || "application/octet-stream" });
}
