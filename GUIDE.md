# 📖 Guide du site — My Vinyl Collector

> Ce guide est écrit pour **toi, Lukas**, pour que tu puisses comprendre, modifier
> et publier ton site **sans dépendre de personne**. Garde-le, relis-le, il répond
> à 80 % des questions que tu te poseras.

---

## 🗺️ 1. Carte du projet — c'est quoi chaque fichier ?

```
MVC/
├── index.html          ← LA page (tout le contenu visible : menus, pages, fenêtres)
├── sw.js               ← "Service Worker" : gère le cache + le mode hors-ligne
├── vercel.json         ← Réglages serveur (sécurité, redirections)
├── manifest.webmanifest← Infos pour installer le site comme une appli
├── package.json        ← Liste des outils serveur (ne pas toucher sans raison)
├── GUIDE.md            ← Ce fichier
│
├── assets/             ← Images (icône, favicon)
├── vendor/             ← Bibliothèque externe (le scanner de code-barres)
│
├── css/                ← TOUT ce qui concerne l'APPARENCE (couleurs, tailles, positions)
│   ├── base.css        ← Couleurs principales + réglages de base ⭐ IMPORTANT
│   ├── layout.css      ← Barre de menu, page d'accueil, footer
│   ├── components.css  ← Boutons, menu "Plus"
│   ├── collection.css  ← Page Collection (liste + grille)
│   ├── valeur.css      ← Page Valeur
│   ├── ecouter.css     ← Page Écouter
│   ├── stats.css       ← Page Statistiques
│   ├── modals.css      ← Toutes les fenêtres pop-up
│   ├── auth.css        ← Fenêtre de connexion
│   ├── toast.css       ← Petites notifications
│   ├── spotify.css     ← Badge Spotify
│   ├── sensations.css  ← Animations
│   └── responsive.css  ← Adaptation téléphone/tablette ⭐ IMPORTANT
│
├── js/                 ← TOUT ce qui concerne le COMPORTEMENT (les actions)
│   ├── main.js         ← Le "chef d'orchestre" : démarre tout
│   ├── config.js       ← Réglages (adresse de l'API)
│   ├── data.js         ← Les ALBUMS PAR DÉFAUT + la palette de couleurs ⭐
│   ├── storage.js      ← Sauvegarde de la collection (local + cloud)
│   ├── state.js        ← Mémoire de l'app (quel album est affiché, etc.)
│   ├── canvas.js       ← Dessin du vinyle qui tourne
│   ├── loop.js         ← Animation des vinyles
│   ├── navigation.js   ← Passage d'une page à l'autre
│   ├── search.js       ← Recherche + filtres dans ta collection
│   ├── collection.js   ← Page Collection
│   ├── valeur.js       ← Page Valeur
│   ├── ecouter.js      ← Page Écouter
│   ├── stats.js        ← Page Statistiques
│   ├── csv.js          ← Import / Export CSV
│   ├── modal-add.js    ← Fenêtre "Ajouter un vinyle"
│   ├── modal-edit.js   ← Fenêtre "Modifier un vinyle"
│   ├── modal-detail.js ← Fenêtre "Détails"
│   ├── modal-share.js  ← Fenêtre "Partager"
│   ├── modal-auth.js   ← Fenêtre "Se connecter"
│   ├── share.js / share-view.js ← Partage public de la collection
│   ├── spotify.js / spotify-ui.js ← Connexion Spotify
│   ├── actions-menu.js ← Le menu "..." (Plus)
│   ├── sensations.js   ← Vibrations
│   ├── barcode-scanner.js ← Scanner de code-barres
│   └── api/
│       ├── discogs.js      ← Parle à Discogs (prix, recherche)
│       └── musicbrainz.js  ← Parle à MusicBrainz (recherche albums)
│
├── lib/                ← Code SERVEUR (sécurité, base de données) — avancé
│   ├── auth.js         ← Mots de passe + sessions
│   ├── kv.js           ← Connexion à la base de données
│   ├── ratelimit.js    ← Anti-spam
│   └── spotify.js      ← Spotify côté serveur
│
└── api/                ← Les "routes serveur" (appelées par le site)
    ├── discogs.js      ← Proxy Discogs (cache ton token secret)
    ├── collection.js   ← Sauvegarde/charge ta collection cloud
    ├── share.js        ← Gère ton lien de partage
    ├── auth/           ← Inscription, connexion, déconnexion
    └── spotify/        ← Connexion Spotify
```

**La règle d'or à retenir :**
- Tu veux changer **comment ça s'affiche** (couleur, taille, position) → dossier `css/`
- Tu veux changer **un texte ou un bouton visible** → fichier `index.html`
- Tu veux changer **une action** (ce qui se passe au clic) → dossier `js/`

---

## 🔧 2. Les recettes (modifs courantes, pas-à-pas)

### 🎨 Recette A — Changer la couleur dorée du site

La couleur dorée est définie à **2 endroits** (il faut changer les deux) :

1. Ouvre **`css/base.css`** → tout en haut, cherche la ligne :
   ```css
   --gold:       #c9a84c;
   ```
   Remplace `#c9a84c` par ta couleur (ex : `#e63946` pour du rouge).
   👉 Pour trouver un code couleur : tape "color picker" dans Google.

2. Ouvre **`index.html`** → cherche `--gold:#c9a84c` (dans le `<style>` en haut)
   et remplace aussi `#c9a84c`.

> Pourquoi 2 fois ? La 1re couleur dans `index.html` s'affiche instantanément
> au chargement (avant que `base.css` ne charge), pour éviter un "flash".

---

### ✏️ Recette B — Changer un texte visible

Tout le texte visible est dans **`index.html`**.

1. Ouvre `index.html`
2. Fais **Ctrl+F** (rechercher) et tape le texte que tu veux changer
   (ex : `Chaque sillon`)
3. Remplace-le par ton nouveau texte
4. **Ne touche pas** à ce qu'il y a entre `<...>` (ce sont des balises)

Exemple — pour changer le slogan d'accueil :
```html
<h1>Chaque sillon<br>raconte une <em>histoire</em></h1>
```
Tu peux changer "Chaque sillon raconte une histoire", mais garde les `<br>`,
`<em>`, `</em>`, `</h1>`.

---

### 💿 Recette C — Changer les albums affichés par défaut

Quand quelqu'un arrive sans compte, il voit 4 albums d'exemple.

1. Ouvre **`js/data.js`**
2. Cherche `DEFAULT_ALBUMS`
3. Chaque album est un bloc entre `{ }`. Tu peux modifier titre, artiste, année…
   ```js
   {
     title:'Dark Side of the Moon', artist:'Pink Floyd', year:1973,
     label:'Harvest', condition:'Excellent (VG+)',
     ...
   }
   ```
4. Pour en supprimer un : efface tout le bloc `{ ... },` (avec la virgule)
5. ⚠️ Garde toujours la structure (les virgules, les `{ }`)

---

### 🧭 Recette D — Ajouter / retirer un onglet du menu

1. Ouvre `index.html`, cherche `nav-links`
2. Tu verras la liste des onglets :
   ```html
   <li><a href="#" class="nav-link" data-page="collection">Collection</a></li>
   ```
3. Pour **retirer** un onglet : efface sa ligne `<li>...</li>`
4. Pour **ajouter** un onglet, il faut aussi créer la page correspondante
   → c'est plus avancé, demande de l'aide à une IA pour ça.

---

### 🖼️ Recette E — Changer le titre / la description du site

Dans `index.html`, tout en haut, cherche :
```html
<title>My Vinyl Collector</title>
```
Change le texte entre `<title>` et `</title>`.

---

## 🧪 3. Tester une modif AVANT de publier

Tu as 2 options :

### Option simple (suffisante pour le CSS/texte)
1. Ouvre le dossier `MVC` dans l'explorateur Windows
2. Double-clique sur `index.html` → ça ouvre le site dans ton navigateur
3. ⚠️ Limite : la connexion, Spotify et les prix Discogs **ne marcheront pas**
   en local (ils ont besoin du serveur Vercel). Mais le visuel, oui.

### Option complète (si tu veux tout tester)
Demande à une IA de te montrer comment lancer `vercel dev` — mais pour de simples
changements de texte/couleur, l'option simple suffit largement.

---

## 🚀 4. Publier tes modifications (3 commandes)

Une fois tes modifs faites, ouvre **PowerShell** dans le dossier MVC et tape :

```powershell
git add .
git commit -m "Décris ici ce que tu as changé"
git push
```

➡️ Vercel détecte le `push` et **met ton site à jour automatiquement** en ~1 minute.

> 💡 Astuce : après publication, va sur `my-vinyl-collector.vercel.app` et fais
> **Ctrl + Shift + R** pour voir tes changements (sinon le navigateur garde l'ancienne version).

---

## ⚠️ 5. Le truc important : le "cache" (Service Worker)

Ton site garde une copie en mémoire pour aller vite et marcher hors-ligne.
Du coup, **après une modif, tu peux ne pas voir le changement tout de suite.**

**Si tu changes un fichier CSS ou JS**, il faut prévenir le site qu'il y a du neuf :
1. Ouvre **`sw.js`**
2. Tout en haut, cherche la ligne :
   ```js
   const CACHE_NAME = 'vinyl-collector-v33';
   ```
3. Augmente le numéro : `v33` → `v34`
4. Publie (les 3 commandes git)

> C'est tout ! Ce petit numéro force le site à recharger les nouveaux fichiers.
> Si tu oublies, les visiteurs garderont l'ancienne version un moment.

---

## 🆘 6. Dépannage courant

| Problème | Solution |
|---|---|
| "Je ne vois pas mon changement" | Ctrl+Shift+R (vide le cache) + vérifie que tu as bumpé `sw.js` |
| "Le site affiche une erreur après modif" | Tu as probablement supprimé une virgule ou une `}`. Annule ta modif et recommence doucement. |
| "Erreur 401/404 partout" | Tu es sur la mauvaise URL. Utilise `my-vinyl-collector.vercel.app` |
| "git push refusé" | Fais d'abord `git pull`, puis re-`git push` |
| "J'ai tout cassé" | `git checkout .` annule TOUTES tes modifs non publiées (retour à la dernière version qui marchait) |

---

## 🔐 7. Ce qu'il ne faut PAS toucher (sauf si tu sais)

- **`lib/`** et **`api/`** → code serveur sensible (sécurité, base de données)
- **`package.json`** → liste des outils
- **`vendor/`** → bibliothèque externe
- Les **variables d'environnement sur Vercel** (tokens secrets) → si tu les supprimes, le site casse

Si tu dois toucher à ça, fais-toi accompagner par une IA et **explique-lui ce guide**.

---

## 🎓 8. Mini-cours express (pour comprendre ce que tu lis)

### HTML = le squelette (le contenu)
```html
<h1>Un grand titre</h1>        <!-- titre -->
<p>Un paragraphe de texte</p>  <!-- texte -->
<button>Un bouton</button>     <!-- bouton -->
```
Tout est entre des **balises** : `<balise>contenu</balise>`.

### CSS = l'habillage (l'apparence)
```css
.mon-bouton {
  color: gold;        /* couleur du texte */
  font-size: 16px;    /* taille */
  padding: 10px;      /* espace intérieur */
}
```
`.mon-bouton` = "le truc qui a la classe mon-bouton".

### JavaScript = les actions (ce qui se passe)
```js
bouton.onclick = () => {
  alert('Tu as cliqué !');
};
```

👉 Pour apprendre les bases (gratuit, en français) : cherche **"OpenClassrooms HTML CSS"**
ou **"MDN apprendre le web"**.

---

## 🤖 9. Comment bien parler à une IA pour modifier ton site

Tu n'es **pas obligé** de tout coder toi-même. Mais pour garder le contrôle,
parle précisément. Exemples de bonnes demandes :

❌ Mauvais : "change le design"
✅ Bon : "Dans `css/base.css`, change la couleur `--gold` en bleu `#3b82f6`,
et fais pareil dans le `<style>` de `index.html`. N'oublie pas de bumper `sw.js`."

❌ Mauvais : "ajoute un truc"
✅ Bon : "Ajoute un bouton 'Trier par valeur' dans la page Collection,
à côté des filtres existants dans `index.html`, et la logique dans `js/search.js`."

**Conseils :**
- Donne toujours le **nom du fichier** concerné (tu le trouves dans la carte §1)
- Demande à l'IA d'**expliquer** ce qu'elle change
- Demande-lui de **ne pas casser le reste**
- Après chaque modif, **teste** avant de publier

---

## ✅ Récap : tu es autonome pour...

- ✅ Changer tous les **textes**
- ✅ Changer les **couleurs**
- ✅ Modifier les **albums par défaut**
- ✅ **Tester** tes modifs (double-clic sur index.html)
- ✅ **Publier** (3 commandes git)
- ✅ **Diriger** une IA précisément pour le reste
- ✅ **Réparer** les erreurs courantes

Tu n'es enfermé avec personne. Le code est standard, propre et commenté :
**n'importe quelle IA ou développeur peut le reprendre.** C'est ta meilleure assurance.

---

*Bon courage Lukas. 🎶*
