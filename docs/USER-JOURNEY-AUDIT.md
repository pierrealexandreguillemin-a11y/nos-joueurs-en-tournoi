# Audit User Journey — Nos Joueurs en Tournoi

> Date : 12 avril 2026
> Methode : Navigation Playwright sur localhost:3000, donnees reelles FFE
> Viewports testes : Desktop 1366x768, Mobile 375x812
> Themes testes : Miami dark, Neutral dark, Neutral light

---

## Resume executif

L'application offre un parcours utilisateur globalement fluide de l'onboarding jusqu'au suivi de tournoi. Les points forts sont l'onboarding en une seule etape, la detection automatique des clubs, et le tableau de resultats riche. Les principales frictions se concentrent sur la transition post-creation d'evenement et le manque de feedback pendant les chargements.

**Score global : 7.5/10**

| Critere | Note | Commentaire |
|---------|------|-------------|
| Clarte | 8/10 | Labels et placeholders bien rediges |
| Friction | 7/10 | Quelques etapes redondantes |
| Feedback | 6/10 | Manque d'indicateurs de chargement |
| Gestion d'erreur | 7/10 | Toasts Sonner presents, validation inline |
| Mobile | 7/10 | Fonctionnel mais header trop imposant |
| Accessibilite | 9/10 | ARIA excellent, focus trap, labels |

---

## Journey 1 — Onboarding (premier acces)

**Parcours** : Premier acces -> Saisie nom du club -> Commencer

### Ce qui fonctionne bien

- **Un seul champ** : pas de friction inutile, le nom du club suffit
- **Slug en temps reel** : "Echiquier du Lac" -> `echiquier-du-lac` affiché sous le champ
- **Bouton desactive** tant que le champ est vide (prevention d'erreur)
- **Placeholders contextuels** : "Hay Chess, Marseille-Echecs..."
- **Centre a l'ecran** avec glass-card, visuellement accueillant

### Frictions identifiees

| # | Severite | Friction | Recommandation |
|---|----------|---------|----------------|
| O-1 | Basse | Aucune explication de ce que fait l'app pour un nouveau venu | Ajouter une tagline sous le titre : "Suivez vos joueurs pendant les tournois FFE" |
| O-2 | Basse | Le label "Identifiant" pour le slug peut confondre un non-technique | Renommer en "Votre espace :" ou masquer si non necessaire |

---

## Journey 2 — Creation d'evenement et suivi de tournoi

**Parcours** : Formulaire -> Creer -> Actualiser -> Choisir club -> Tableau de resultats

### Ce qui fonctionne bien

- **Formulaire clair** : noms, placeholders, aide contextuelle ("Si vide, le nom du club sera detecte automatiquement")
- **URL FFE expliquee** : "copiez l'URL depuis echecs.asso.fr > votre tournoi > page Resultats"
- **Multi-tournois** : bouton "+ Ajouter un tournoi" visible
- **Detection automatique** : 16 clubs detectes apres actualisation, tries par nombre de joueurs
- **Tableau riche** : Nom, Elo, R1-R7, Pts, Tr, Buch, Perf, Class. avec row striping
- **Stats resumees** : "16 joueurs | Score total: 53 points | Moyenne: 3.31 pts/joueur"
- **Raccourci clavier** : Ctrl+R pour actualiser (mentionne dans le titre du bouton)

### Frictions identifiees

| # | Severite | Friction | Recommandation |
|---|----------|---------|----------------|
| E-1 | **Haute** | Apres creation, **deux boutons "Actualiser"** visibles simultanement (un pour resultats, un pour clubs). L'utilisateur ne sait pas lequel cliquer | Fusionner en un seul bouton qui charge resultats + clubs en une action |
| E-2 | **Haute** | Pas d'indicateur de chargement visible pendant le scraping FFE (3+ secondes). L'utilisateur ne sait pas si ca fonctionne | Ajouter un spinner/skeleton sur le contenu pendant le fetch |
| E-3 | Moyenne | Apres actualisation, la selection du club apparait sans transition — changement brusque d'etat | Ajouter une animation d'entree (fade-in) pour le selecteur |
| E-4 | Moyenne | Le bouton "Appariements" est disabled sans explication | Ajouter un tooltip : "Disponible quand la ronde est en cours" |
| E-5 | Basse | Le champ "Nom du club (optionnel)" dans le formulaire de creation est ambigu — est-ce le club de l'utilisateur ou un nom d'affichage ? | Clarifier : "Nom d'affichage du club (auto-detecte si vide)" |
| E-6 | Basse | Apres "Valider le choix du club", pas de toast de confirmation | Ajouter un toast "Club La Rochelle Echecs selectionne" |

---

## Journey 3 — Gestion multi-evenements

**Parcours** : Gerer les evenements -> Voir la liste -> Basculer / Supprimer / Export / Cloud

### Ce qui fonctionne bien

- **Modal centre** (corrige dans cette session) avec fond quasi-opaque
- **Ne se ferme pas au clic exterieur** (corrige dans cette session)
- **Header responsive** : titre + boutons s'empilent sur mobile
- **Actions par carte** : partage, export JSON, cloud upload, supprimer
- **Confirmation de suppression** : AlertDialog avec message explicite
- **Import/Export JSON** : boutons accessibles dans le header du modal

### Frictions identifiees

| # | Severite | Friction | Recommandation |
|---|----------|---------|----------------|
| M-1 | Moyenne | Quand la liste est vide ("Aucun evenement cree"), le modal reste ouvert avec peu de contenu utile | Fermer le modal et afficher directement le formulaire de creation |
| M-2 | Basse | Pas d'indication visuelle de l'evenement actif dans le header de page — le nom de l'evenement n'apparait nulle part | Afficher le nom de l'evenement actif dans la zone stats ou le header |

---

## Journey 4 — Partage et synchronisation

**Parcours** : Bouton Partager -> QR code + URL copiable + Share natif

### Ce qui fonctionne bien

- **QR code genere** automatiquement avec l'URL de l'app
- **URL copiable** en un clic avec bouton copier
- **Bouton "Partager"** utilise l'API Web Share native (fallback gracieux)
- **Dialog bien structure** : titre, description, deux cartes (QR + URL)

### Frictions identifiees

| # | Severite | Friction | Recommandation |
|---|----------|---------|----------------|
| S-1 | Moyenne | Le partage ne transmet que l'URL de base de l'app, pas l'evenement en cours. Un nouveau destinataire arrive sur l'onboarding | Preciser dans la description que l'URL partagee est celle de l'app, pas de l'evenement |
| S-2 | Basse | Les boutons cloud (upload/download) sont dans le modal "Gerer les evenements" mais non dans le flux principal — difficile a decouvrir | Envisager un indicateur de statut cloud dans le header |

---

## Journey 5 — Personnalisation

**Parcours** : Changement theme / mode / animations

### Ce qui fonctionne bien

- **Switch theme** : Miami <-> Neutral en un clic, transition fluide (0.5s)
- **Switch mode** : Light <-> Dark en un clic
- **Toggle animations** : visible uniquement en Miami (pertinent)
- **Persistance** : choix sauvegarde en localStorage, restaure au reload
- **Pas de FOUC** : script inline dans `<head>` applique le theme avant React

### Frictions identifiees

| # | Severite | Friction | Recommandation |
|---|----------|---------|----------------|
| P-1 | Basse | Les boutons icones (soleil/lune, palette) n'ont pas de label visible — uniquement des `aria-label` et des tooltips au hover | Acceptable pour des utilisateurs reguliers, mais un premier utilisateur ne sait pas ce que font ces icones |

---

## Problemes transversaux

### Mobile (375x812)

| # | Severite | Probleme | Recommandation |
|---|----------|---------|----------------|
| T-1 | Moyenne | Le header mobile prend ~170px de hauteur (titre sur 4 lignes + nav wrappee). Sur un ecran 812px, c'est 21% de l'espace | Reduire la taille du titre sur mobile ou le masquer pour ne garder que le logo |
| T-2 | Basse | Le tableau necessite un scroll horizontal (design intentionnel) mais pas d'indicateur visuel de scroll | Ajouter une ombre/gradient a droite pour signaler le contenu masque |

### Accessibilite (excellent)

Points forts verifies :
- Skip link "Aller au contenu principal" present et fonctionnel
- Tous les boutons icones ont un `aria-label` descriptif
- Checkboxes du tableau : "Valider ronde 1 pour MARSAUD WILLIAM" (specifique)
- `role="status"` sur les indicateurs de chargement
- `aria-pressed` sur le ViewToggle
- `aria-expanded` sur le menu ClubHeader
- Focus trap dans les dialogs (Radix)
- `prefers-reduced-motion` respecte

---

## Matrice de priorisation

### Impact eleve / Effort faible (Quick wins)

| # | Description |
|---|-------------|
| E-2 | Spinner pendant le chargement FFE |
| E-4 | Tooltip sur le bouton "Appariements" desactive |
| E-6 | Toast confirmation choix du club |
| O-1 | Tagline explicative sur l'onboarding |

### Impact eleve / Effort moyen

| # | Description |
|---|-------------|
| E-1 | Fusionner les deux boutons "Actualiser" |
| T-1 | Header mobile compact |

### Impact moyen / Effort faible

| # | Description |
|---|-------------|
| E-3 | Animation d'entree pour le selecteur de club |
| M-2 | Nom de l'evenement visible dans l'interface principale |
| T-2 | Indicateur de scroll horizontal sur le tableau |

### Impact faible / A evaluer

| # | Description |
|---|-------------|
| O-2 | Renommer le label "Identifiant" du slug |
| E-5 | Clarifier le champ "Nom du club" |
| S-1 | Preciser la portee du lien partage |
| S-2 | Indicateur cloud dans le header |
| M-1 | Fermer le modal si liste vide |
| P-1 | Labels visibles pour les boutons de personnalisation |

---

## Conclusion

L'application est fonctionnelle et bien structuree. Les frictions les plus impactantes sont concentrees dans la **transition post-creation d'evenement** (double "Actualiser", pas de feedback de chargement). Les corrections apportees aujourd'hui au modal EventsManager resolvent les problemes critiques de positionnement et d'interaction.

Les 4 quick wins recommandes (spinner, tooltip, toast, tagline) sont des modifications mineures qui amelioreraient significativement l'experience percue sans refactoring majeur.
