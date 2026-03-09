# Audit UX & Design — Nos Joueurs en Tournoi

> Date : 2026-03-08
> Branche : `master` (commit `169854f`)
> Statut : Design approuve — en attente d'implementation

---

## Table des matieres

1. [Audit UX global](#1-audit-ux-global)
2. [Audit UX creation d'evenement](#2-audit-ux-creation-devenement)
3. [Propositions d'amelioration du flow EventForm](#3-propositions-damelioration-du-flow-eventform)
4. [Decision](#4-decision)

---

## 1. Audit UX global

Analyse complete de l'interface realisee par agents `code-explorer`, `ux-design-guardian` et exploration manuelle du code.

### 1.1 Quick wins (fort impact, faible effort)

| # | Composant | Probleme | Amelioration proposee |
|---|-----------|----------|----------------------|
| G-01 | TournamentTabs | **Empty state vague** — "Aucun joueur a afficher" sans guidance sur la suite | Ajouter un CTA contextuel : "Cliquez sur Actualiser pour charger les resultats" avec icone fleche |
| G-02 | ViewToggle | **Badge pairings color-only** — Le point rouge signalant une nouvelle ronde est invisible aux daltoniens | Ajouter un texte "Nouvelle ronde" en complement du dot, ou utiliser un badge avec texte |
| G-03 | EventForm | **Validation tardive** — Erreurs visibles uniquement apres submit | Validation inline temps reel (details en section 2) |
| G-04 | useTournamentSync | **Pas de progression multi-tournoi** — Le refresh sequentiel ne communique pas l'avancement | Afficher "Actualisation tournoi 1/3..." dans le bouton ou en toast |
| G-05 | PlayerTable | **Colonne joueur non sticky** — Sur mobile, le scroll horizontal perd le nom du joueur | Appliquer `sticky left-0 z-10 bg-inherit` sur la premiere colonne (`<th>` et `<td>`) |

### 1.2 Effort moyen (UX significativement meilleure)

| # | Composant | Probleme | Amelioration proposee |
|---|-----------|----------|----------------------|
| G-06 | page.tsx | **3 ecrans de chargement** — `!isLoaded -> !identity -> !mounted` cree du flicker pour les utilisateurs recurrents | Consolider en un seul etat progressif (state machine a 3 etats, un seul LoadingScreen) |
| G-07 | page.tsx | **Onboarding premier usage flou** — L'utilisateur ne sait pas qu'il faut cliquer "Actualiser" apres la creation | Ajouter un guide visuel (tooltip pulse ou texte explicatif) au premier lancement |
| G-08 | PlayerTable | **Pas de pagination** — 500 joueurs = 500 rows dans le DOM | Virtualisation (`react-window` ou `@tanstack/virtual`) ou pagination par 50 |
| G-09 | PlayerTable | **Navigation clavier tables** — Pas de navigation fleches dans le tableau | Arrow keys pour naviguer entre cellules (optionnel, power-user) |
| G-10 | Dialogs | **Focus trapping modals** — Verifier que les dialogs Radix piege bien le focus | Auditer les dialogs (EventsManager, ShareEventModal, DuplicateEventDialog) avec axe-core |

### 1.3 Plus long terme

| # | Composant | Probleme | Amelioration proposee |
|---|-----------|----------|----------------------|
| G-11 | EventsManager | **Pas d'undo** — Supprimer un evenement est irreversible | Soft-delete avec toast "Annuler" (5s countdown) avant suppression definitive |
| G-12 | sync.ts | **Sync non atomique** — Refresh pendant un cloud download = risque perte | Transactions atomiques sur le merge localStorage/Redis |
| G-13 | — | **Pas de Service Worker** — Pas d'offline-first pour les pages FFE | Pre-cache les reponses FFE deja visitees via Service Worker |

### 1.4 Ce qui fonctionne bien (a preserver)

- **Architecture offline-first** : localStorage + Redis merge, fail-open
- **Memoization PlayerTable** : `React.memo` avec slice de validation par joueur
- **Glass morphism coherent** : deux themes (Miami/Neutral) avec tokens OKLCH
- **Toasts Sonner** : feedback temps reel pour toutes les actions majeures
- **Raccourci `Ctrl+R`** : refresh rapide pour power users
- **Accessibilite ARIA** : tables, dialogs, tabs correctement marques
- **`prefers-reduced-motion`** : toutes les animations desactivables
- **Gestion d'erreur gracieuse** : cloud sync fail → message + app continue

---

## 2. Audit UX creation d'evenement

Analyse approfondie du parcours utilisateur depuis l'ouverture du formulaire jusqu'a l'affichage des premiers resultats. C'est le **point de friction le plus critique** de l'application.

### 2.1 Parcours utilisateur actuel

```
Onboarding club (1x)
  -> Saisie nom club -> slug genere -> localStorage namespace cree

Creation evenement
  -> Entree : EmptyState CTA | EventsManager "Nouvel evenement" | auto (1er lancement)
  -> EventForm inline (pas un modal)
     -> Champ 1 : Nom de l'evenement (requis)
     -> Champ 2 : Nom du club (optionnel, "sera detecte auto")
     -> Champ 3+ : Tournois dynamiques (nom + URL FFE) x N
  -> Submit -> validation -> saveEvent -> toast succes

Post-creation (3+ interactions avant les donnees)
  -> TournamentTabs apparait (vide)
  -> Clic "Actualiser"
  -> Si clubName vide : scrape FFE -> ClubSelector dropdown -> "Valider le choix du club"
  -> Fetch resultats sequentiel par tournoi
  -> PlayerTable apparait enfin
```

**Constat** : entre la creation et les premieres donnees, l'utilisateur doit effectuer **3 a 4 interactions supplementaires** sans guidance claire.

### 2.2 Frictions identifiees

#### Severite CRITIQUE

| # | Localisation | Friction | Detail |
|---|-------------|----------|--------|
| F-01 | EventForm | **Aucune guidance pour trouver l'URL FFE** | L'utilisateur doit naviguer sur `echecs.asso.fr`, trouver son tournoi, copier l'URL. Zero explication dans l'app. Le placeholder `https://echecs.asso.fr/Resultats.aspx?...` ne dit pas *ou* trouver cette URL. MODE_EMPLOI dit "copiez-la depuis echecs.asso.fr" sans plus de detail. |
| F-02 | EventForm | **Double demande du nom de club** | L'onboarding demande le nom du club (pour le namespace localStorage). EventForm re-demande un "Nom du club" (pour le matching FFE). L'utilisateur ne comprend pas pourquoi on lui redemande. Les deux valeurs servent des buts differents mais sont presentees identiquement. |
| F-03 | EventForm | **Validation plus faible que les utilitaires existants** | Le form utilise `url.includes('echecs.asso.fr')` alors que `isValidFFeUrl()` dans `validation.ts` utilise `new URL()` avec verification stricte du hostname. Un URL comme `https://attacker.com/?r=echecs.asso.fr` passe la validation client (bloquee cote serveur). Le schema Zod `eventSchema` exige `min(3)` pour le nom, mais le form accepte 1 caractere. |

#### Severite HAUTE

| # | Localisation | Friction | Detail |
|---|-------------|----------|--------|
| F-04 | EventForm | **Pas de validation temps reel** | Les erreurs n'apparaissent qu'au submit. L'utilisateur peut remplir tout le formulaire avec des donnees invalides et ne decouvrir les problemes qu'a la fin. |
| F-05 | EventForm | **Erreur unique, pas de lien visuel avec le champ** | Un seul message d'erreur affiche en bas du form (Alert destructive). Pas de highlight rouge sur le champ fautif. Avec plusieurs rows de tournoi, l'utilisateur doit deviner quel champ pose probleme. La validation short-circuite : une seule erreur a la fois. |
| F-06 | useTournamentSync | **Message d'erreur trompeur post-creation** | Si l'utilisateur pre-remplit le nom du club et qu'il ne matche pas exactement le nom FFE, l'erreur affichee est : "Le tournoi n'a peut-etre pas encore commence". Le vrai probleme est un mismatch de nom, pas un tournoi non demarre. L'utilisateur attend inutilement. |
| F-07 | EventForm | **Layout mobile crampe** | Les rows tournoi utilisent `flex gap-2` horizontal sans breakpoint `flex-col` pour petit ecran. Sur 320-375px, les inputs nom (flex-1) et URL (flex-[2]) sont trop etroits. L'URL FFE (tres longue) est illisible et difficile a editer. |

#### Severite MOYENNE

| # | Localisation | Friction | Detail |
|---|-------------|----------|--------|
| F-08 | EventForm | **Rows incompletes silencieusement ignorees** | `buildEvent()` filtre les rows ou nom OU url sont vides. Un utilisateur qui commence a remplir une row sans la finir ne recoit aucun avertissement — la row disparait a la creation. |
| F-09 | EventForm | **Le concept d'"evenement" n'est pas explique** | Un nouvel utilisateur ne sait pas si un evenement = un jour, une saison, un championnat. Le placeholder aide (`Championnat departemental 13`) mais une phrase d'explication manque. |
| F-10 | EventForm | **Label tournoi en jargon FFE** | Le placeholder "Nom (ex: U12, U14)" suppose que l'utilisateur connait les categories d'age FFE. Un club avec un "Open A" ou "Seniors" pourrait etre perdu. |
| F-11 | post-creation | **3 interactions avant les donnees** | Apres creation : clic Actualiser -> attente scrape -> selection club -> validation -> fetch resultats. Aucun indicateur de progression entre les etapes. |
| F-12 | EventForm | **Pas de prevention de doublons URL** | L'utilisateur peut ajouter la meme URL FFE dans deux rows de tournoi. Les deux onglets afficheront des donnees identiques sans avertissement. |

#### Severite BASSE

| # | Localisation | Friction | Detail |
|---|-------------|----------|--------|
| F-13 | EventForm | **Pas d'autoFocus** | Le champ nom d'evenement n'a pas `autoFocus`, contrairement au champ de ClubOnboarding. Incoherence. |
| F-14 | EventForm | **Nom evenement sans longueur minimum** | `validateEventForm()` accepte 1 caractere alors que `isValidEventName()` exige >= 3 et `eventSchema` exige `min(3)`. Inconsistance entre validation client et serveur. |
| F-15 | page.tsx | **Transition abrupte form -> tabs** | Le EventForm disparait et TournamentTabs apparait instantanement sans animation de transition. Visuellement jarring. |

### 2.3 Bugs identifies pendant l'audit

| # | Fichier | Bug | Impact |
|---|---------|-----|--------|
| B-01 | EventForm.tsx | `url.includes('echecs.asso.fr')` au lieu de `isValidFFeUrl()` | Validation SSRF-bypassable cote client (bloquee cote serveur) |
| B-02 | EventForm.tsx | Nom evenement accepte 1-2 caracteres, rejete par Zod au sync | Inconsistance validation client/serveur |
| B-03 | page.tsx | `storage.saveEvent()` non try/catche dans `handleEventCreated` | Si localStorage plein, l'evenement est en state React mais pas persiste. Perte silencieuse au refresh. |

---

## 3. Propositions d'amelioration du flow EventForm

### 3.1 Proposition A — Guided wizard (multi-etapes)

**Principe** : Decouper le formulaire en 3 ecrans sequentiels avec navigation avant/arriere.

```
Etape 1/3 : Nom de l'evenement
  [input nom]
  [Suivant ->]

Etape 2/3 : Tournois
  [+ Ajouter un tournoi]
  [row: nom | URL FFE | aide contextuelle]
  [<- Precedent] [Suivant ->]

Etape 3/3 : Recapitulatif
  Nom : Championnat departemental 13
  Club : (sera detecte automatiquement)
  Tournois : U12, U14, Open
  [<- Modifier] [Creer l'evenement]
```

**Avantages** :
- Charge cognitive reduite : un seul concept par ecran
- Espace pour de l'aide contextuelle genereuse (texte, liens, exemples)
- L'etape 2 peut occuper tout l'ecran, resolvant le probleme mobile
- Le recapitulatif permet a l'utilisateur de verifier avant de valider
- Pattern UX familier (wizard/stepper)

**Inconvenients** :
- Plus de clics (3 ecrans au lieu de 1)
- Over-engineering : le formulaire n'a que 3-4 champs, un wizard est disproportionne
- Complexite de code supplementaire (state machine, navigation, persistence inter-etapes)
- Friction pour les utilisateurs recurrents qui connaissent deja le flow
- Difficulte a "revenir corriger" un champ sans perdre le contexte

**Verdict** : Adapte pour un onboarding complexe (10+ champs), surdimensionne ici.

### 3.2 Proposition B — Form ameliore in-place (recommandee)

**Principe** : Conserver le formulaire unique mais enrichir chaque champ avec de la guidance contextuelle, de la validation inline temps reel, et des messages d'aide.

```
Evenement
  [Nom de l'evenement *]          <- autoFocus, validation inline >= 3 chars
  "Un evenement regroupe un ou plusieurs tournois FFE suivis simultanement."

  [Nom du club]                   <- helper text ameliore
  "Laissez vide : le club sera detecte automatiquement depuis la page FFE."

Tournois
  "Pour chaque tournoi, copiez l'URL depuis echecs.asso.fr > Resultats > votre tournoi."
  [Categorie (ex: U12, Open)]  [URL FFE]  [x]    <- flex-col sur mobile
  [Categorie (ex: U12, Open)]  [URL FFE]  [x]    <- validation inline par champ
  [+ Ajouter un tournoi]

  [?] Comment trouver l'URL FFE ?     <- lien/tooltip avec mini-guide

  {erreurs inline par champ, bordure rouge + message sous le champ fautif}

  [Annuler]  [Creer l'evenement]
```

**Ameliorations concretes** :

1. **Aide contextuelle permanente** :
   - Texte explicatif sous le titre "Evenement" : definit ce qu'est un evenement
   - Texte sous "Nom du club" : explique pourquoi laisser vide
   - Texte au-dessus de la section tournois : explique ou trouver l'URL
   - Lien/tooltip "Comment trouver l'URL FFE ?" avec mini-guide (3-4 etapes)

2. **Validation inline temps reel** :
   - Nom evenement : bordure rouge + "3 caracteres minimum" si < 3 chars (debounced)
   - URL FFE : bordure rouge + message si URL invalide (utiliser `isValidFFeUrl()`)
   - Nom tournoi : bordure rouge si < 2 chars
   - Detection doublons URL : avertissement si URL deja utilisee dans une autre row

3. **Corrections de bugs** :
   - Remplacer `includes('echecs.asso.fr')` par `isValidFFeUrl()` de `validation.ts`
   - Aligner longueur minimum nom (3 chars) avec `eventSchema`
   - Try/catch sur `storage.saveEvent()` avec toast d'erreur si localStorage plein

4. **UX mobile** :
   - Rows tournoi en `flex-col` sous `sm:` breakpoint (nom au-dessus, URL en dessous)
   - AutoFocus sur le premier champ

5. **Feedback ameliore** :
   - Erreurs par champ (pas un seul message global)
   - Warning si rows incompletes au submit ("1 tournoi incomplet sera ignore")
   - Transition animee form -> tabs (fade-out/fade-in)

**Avantages** :
- Changement minimal de structure (pas de refonte architecturale)
- Utilisateurs recurrents ne sont pas ralentis (aide visible mais non bloquante)
- Resout les 15 frictions identifiees sans complexite supplementaire
- Coherent avec le pattern existant (form inline dans la page)
- Facile a tester (memes composants, validation enrichie)

**Inconvenients** :
- Le form peut devenir visuellement charge avec tous les textes d'aide
- Ne resout pas fondamentalement le probleme des 3 interactions post-creation (F-11)
- Le mini-guide "Comment trouver l'URL FFE" reste textuel (pas de screenshots)

**Verdict** : Meilleur rapport impact/effort. Resout les frictions critiques sans casser l'existant.

### 3.3 Proposition C — Hybride (sections collapsibles + aide progressive)

**Principe** : Form unique avec sections collapsibles. L'aide contextuelle apparait progressivement au focus de chaque champ (progressive disclosure).

```
[v] Evenement                        <- section ouverte par defaut
    [Nom de l'evenement *]
    [Nom du club]

[>] Tournois (0 ajoutes)             <- section fermee, s'ouvre au clic ou apres etape 1
    (aide contextuelle apparait au focus du champ URL)
    [row: nom | URL FFE]
    [+ Ajouter]

[>] Comment trouver l'URL FFE ?      <- accordion d'aide, ferme par defaut
    1. Allez sur echecs.asso.fr
    2. Recherchez votre tournoi
    3. Cliquez sur "Resultats"
    4. Copiez l'URL de la barre d'adresse
```

**Avantages** :
- Interface epuree par defaut (sections fermees)
- Aide disponible mais non intrusive (progressive disclosure)
- L'ouverture progressive guide naturellement l'utilisateur
- Bon compromis entre le wizard (guidage) et le form simple (efficacite)

**Inconvenients** :
- Complexite d'implementation plus elevee que B (accordions, etats d'ouverture, animations)
- L'utilisateur peut ne pas voir la section Tournois si elle est fermee
- Le pattern accordion dans un formulaire est moins courant et peut surprendre
- Risque de "cacher" des champs obligatoires derriere un clic
- Plus de state a gerer (quelles sections sont ouvertes/fermees)
- Les sections fermees sur mobile economisent peu d'espace (le form est deja court)

**Verdict** : Elegant en theorie, mais la complexite supplementaire n'est pas justifiee pour un formulaire de 3-4 champs. Le progressive disclosure est plus adapte aux formulaires longs (10+ champs).

---

## 4. Decision

### Choix : Proposition B — Form ameliore in-place

**Raison** : Le formulaire n'a que 3-4 champs. Un wizard (A) ou des accordions (C) ajoutent de la complexite disproportionnee. L'essentiel est d'ajouter de la **guidance** (surtout sur l'URL FFE) et de la **validation inline** sans changer la structure existante.

### Perimetre d'implementation

**Phase 1 — Frictions critiques (F-01, F-02, F-03)** :
- Aide contextuelle : textes explicatifs, tooltip "Comment trouver l'URL FFE"
- Remplacer `includes()` par `isValidFFeUrl()` dans la validation
- Aligner les seuils de validation client avec les schemas Zod

**Phase 2 — Frictions hautes (F-04, F-05, F-06, F-07)** :
- Validation inline temps reel par champ (debounced)
- Erreurs par champ au lieu d'un message global unique
- Corriger le message d'erreur trompeur post-creation
- Layout mobile `flex-col` pour les rows tournoi

**Phase 3 — Frictions moyennes et basses (F-08 a F-15) + Quick wins globaux (G-01 a G-05)** :
- Warning rows incompletes
- Prevention doublons URL
- AutoFocus, transition animee
- Quick wins globaux (empty state, badge pairings, progression multi-tournoi, sticky column)

**Phase 4 — Corrections de bugs (B-01, B-02, B-03)** :
- A integrer dans les phases 1-2 (memes fichiers concernes)

### Fichiers impactes

| Fichier | Modifications |
|---------|--------------|
| `src/components/EventForm.tsx` | Validation inline, aide contextuelle, layout mobile, autoFocus |
| `src/components/EventForm.test.tsx` | Tests pour nouvelle validation, aide contextuelle |
| `src/hooks/useTournamentSync.ts` | Corriger message d'erreur F-06 |
| `src/components/TournamentTabs.tsx` | Empty state ameliore G-01, progression G-04 |
| `src/components/ViewToggle.tsx` | Badge accessible G-02 |
| `src/components/PlayerTable.tsx` | Sticky column G-05 |
| `app/page.tsx` | Try/catch saveEvent B-03, transition form->tabs F-15 |
