/* ============================================================
   HANSWEAR - script.js
   Un seul fichier, charge avec "defer" sur toutes les pages.
   Chaque fonctionnalite est isolee dans un try/catch : si l'une
   plante, le contenu et le reste du site continuent de marcher.
   ============================================================ */
'use strict';

// On signale au CSS que le JS fonctionne (les effets ne s'appliquent que dans ce cas)
document.documentElement.classList.add('js');

const CLE_PANIER = 'hanswear_panier';   // nom de la sauvegarde dans le navigateur
let minuteurToast;

// Lance une fonctionnalite en la protegeant contre les erreurs
function lancer(nom, fonction) {
  try {
    fonction();
  } catch (erreur) {
    console.error('[HansWear] Erreur dans "' + nom + '" :', erreur);
  }
}

/* ---------- 1. MENU BURGER (version mobile) ---------- */
function initMenu() {
  const bouton = document.querySelector('.burger');
  const nav = document.querySelector('.header nav');
  if (!bouton || !nav) return;            // page sans burger : on ne fait rien

  function fermer() {
    nav.classList.remove('ouvert');
    bouton.setAttribute('aria-expanded', 'false');
    bouton.textContent = '\u2630';        // icone burger
  }

  bouton.addEventListener('click', () => {
    const ouvert = nav.classList.toggle('ouvert');
    bouton.setAttribute('aria-expanded', String(ouvert));
    bouton.textContent = ouvert ? '\u2715' : '\u2630';   // croix / burger
  });

  // On referme le menu quand on clique sur un lien
  nav.querySelectorAll('a').forEach(lien => lien.addEventListener('click', fermer));
}

/* ---------- 2. PANIER (localStorage) + points XP ---------- */
function lirePanier() {
  try {
    return JSON.parse(localStorage.getItem(CLE_PANIER)) || [];
  } catch (erreur) {
    return [];                            // sauvegarde illisible : panier vide
  }
}

function sauverPanier(panier) {
  try {
    localStorage.setItem(CLE_PANIER, JSON.stringify(panier));
  } catch (erreur) {
    console.warn('[HansWear] Sauvegarde du panier impossible');
  }
}

function formaterPrix(nombre) {
  return nombre.toFixed(2).replace('.', ',') + ' \u20AC';
}

function afficherToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => toast.classList.remove('visible'), 2500);
}

// Met a jour "Panier (n)" dans l'en-tete
function mettreAJourCompteur() {
  const total = lirePanier().reduce((somme, article) => somme + article.qte, 0);
  document.querySelectorAll('.panier').forEach(lien => {
    lien.textContent = 'Panier (' + total + ')';
  });
}

function ajouterAuPanier(nom, prix) {
  const panier = lirePanier();
  const existant = panier.find(article => article.nom === nom);
  if (existant) {
    existant.qte += 1;
  } else {
    panier.push({ nom: nom, prix: prix, qte: 1 });
  }
  sauverPanier(panier);
  mettreAJourCompteur();

  const xp = Math.floor(prix);            // 1 XP par euro (cf. bandeau d'accueil)
  afficherToast(nom + ' ajout\u00E9 au panier (+' + xp + ' XP)');

  const panneau = document.getElementById('panneau-panier');
  if (panneau) remplirPanneau(panneau);   // si le panier est ouvert, on le rafraichit
}

function ajouterTexte(parent, classe, texte) {
  const element = document.createElement('div');
  element.className = classe;
  element.textContent = texte;            // textContent : pas d'injection de HTML
  parent.appendChild(element);
}

function remplirPanneau(panneau) {
  panneau.textContent = '';
  const panier = lirePanier();
  ajouterTexte(panneau, 'pan-titre', 'Mon panier');

  if (panier.length === 0) {
    ajouterTexte(panneau, 'pan-ligne', 'Votre panier est vide.');
  } else {
    let total = 0;
    let xp = 0;
    panier.forEach(article => {
      total += article.prix * article.qte;
      xp += Math.floor(article.prix) * article.qte;
      ajouterTexte(panneau, 'pan-ligne',
        article.qte + ' x ' + article.nom + ' \u2014 ' + formaterPrix(article.prix * article.qte));
    });
    ajouterTexte(panneau, 'pan-total', 'Total : ' + formaterPrix(total));
    ajouterTexte(panneau, 'pan-ligne', 'Points XP \u00E0 gagner : ' + xp);
  }

  const boutons = document.createElement('div');
  boutons.className = 'pan-boutons';

  const vider = document.createElement('button');
  vider.type = 'button';
  vider.className = 'pan-btn';
  vider.textContent = 'Vider';
  vider.addEventListener('click', () => {
    sauverPanier([]);
    mettreAJourCompteur();
    remplirPanneau(panneau);
  });

  const fermer = document.createElement('button');
  fermer.type = 'button';
  fermer.className = 'pan-btn';
  fermer.textContent = 'Fermer';
  fermer.addEventListener('click', () => panneau.remove());

  boutons.appendChild(vider);
  boutons.appendChild(fermer);
  panneau.appendChild(boutons);
}

function basculerPanneau() {
  const ancien = document.getElementById('panneau-panier');
  if (ancien) {                           // deja ouvert : on le ferme
    ancien.remove();
    return;
  }
  const panneau = document.createElement('aside');
  panneau.id = 'panneau-panier';
  panneau.className = 'panneau-panier';
  document.body.appendChild(panneau);
  remplirPanneau(panneau);
}

function initPanier() {
  mettreAJourCompteur();

  // Boutons "Ajouter au panier" des pages produits
  document.querySelectorAll('.carte .btn').forEach(bouton => {
    bouton.addEventListener('click', () => {
      const carte = bouton.closest('.carte');
      const nom = carte.querySelector('h3').textContent.trim();
      // Le 1er noeud du bloc prix est le prix actuel (le <span> contient l'ancien prix)
      const prix = parseFloat(carte.querySelector('.prix').childNodes[0].textContent.replace(',', '.'));
      if (isNaN(prix)) return;
      ajouterAuPanier(nom, prix);
    });
  });

  // Clic sur "Panier (n)" : ouvre / ferme le recapitulatif
  document.querySelectorAll('.panier').forEach(lien => {
    lien.addEventListener('click', evenement => {
      evenement.preventDefault();
      basculerPanneau();
    });
  });
}

/* ---------- 3. VALIDATION DU FORMULAIRE NEWSLETTER ---------- */
function initNewsletter() {
  const formulaire = document.querySelector('.form-news');
  const message = document.getElementById('msg-news');
  if (!formulaire || !message) return;

  const champ = formulaire.querySelector('input[type="email"]');
  formulaire.noValidate = true;           // on remplace les bulles du navigateur par nos messages

  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();           // pas de rechargement de la page
    const email = champ.value.trim();
    const valide = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    message.className = 'msg ' + (valide ? 'msg-ok' : 'msg-erreur');
    message.textContent = valide
      ? 'Merci ! Votre code de r\u00E9duction -10 % : BIENVENUE10'
      : 'Adresse e-mail invalide (exemple : nom@domaine.fr).';
    if (valide) formulaire.reset();
  });
}

/* ---------- 4. COMPTE A REBOURS DE LA PROMO ---------- */
function initCompteARebours() {
  const zone = document.getElementById('compte-rebours');
  if (!zone) return;

  const fin = new Date(2026, 10, 30, 23, 59, 59);   // mois 10 = novembre (on compte depuis 0)

  function majAffichage() {
    const reste = fin - new Date();                  // difference en millisecondes
    if (reste <= 0) {
      zone.textContent = 'Offre termin\u00E9e';
      clearInterval(minuteur);
      return;
    }
    const jours = Math.floor(reste / 86400000);
    const heures = Math.floor(reste / 3600000) % 24;
    const minutes = Math.floor(reste / 60000) % 60;
    const secondes = Math.floor(reste / 1000) % 60;
    zone.textContent = 'Il reste ' + jours + ' j ' + heures + ' h ' + minutes + ' min ' + secondes + ' s';
  }

  const minuteur = setInterval(majAffichage, 1000);
  majAffichage();
}

/* ---------- 5. ANIMATION D'APPARITION AU DEFILEMENT ---------- */
function initApparition() {
  if (!('IntersectionObserver' in window)) return;   // vieux navigateur : tout reste visible

  const observateur = new IntersectionObserver(entrees => {
    entrees.forEach(entree => {
      if (entree.isIntersecting) {
        entree.target.classList.add('visible');
        observateur.unobserve(entree.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.section, .avantage, .promo').forEach(element => {
    element.classList.add('reveal');
    observateur.observe(element);
  });
}

/* ---------- 6. RECHERCHE D'ARTICLES (pages produits) ---------- */
// Met en minuscules et retire les accents : "Écharpe" et "echarpe" deviennent identiques
function normaliser(texte) {
  return texte.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function initRecherche() {
  const champ = document.getElementById('recherche');
  const message = document.getElementById('aucun-resultat');
  if (!champ) return;                     // page sans barre de recherche

  const cartes = document.querySelectorAll('.carte');

  // "input" se declenche a chaque lettre tapee : le filtre est instantane
  champ.addEventListener('input', () => {
    const terme = normaliser(champ.value);
    let visibles = 0;

    cartes.forEach(carte => {
      const nom = normaliser(carte.querySelector('h3').textContent);
      const correspond = nom.includes(terme);
      carte.hidden = !correspond;         // cache ou montre la carte
      if (correspond) visibles++;
    });

    if (message) message.hidden = visibles > 0;   // "Aucun article" si 0 resultat
  });
}

/* ---------- Demarrage ---------- */
lancer('menu burger', initMenu);
lancer('panier', initPanier);
lancer('newsletter', initNewsletter);
lancer('compte a rebours', initCompteARebours);
lancer('apparition au scroll', initApparition);
lancer('recherche', initRecherche);
