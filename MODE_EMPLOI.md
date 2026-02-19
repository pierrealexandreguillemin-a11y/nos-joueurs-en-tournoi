# Nos Joueurs en Tournoi - Mode d'emploi

## A quoi sert cette application ?

Cette application permet de suivre en temps reel les resultats de vos joueurs d'echecs lors de tournois officiels FFE (Federation Francaise des Echecs). Vous identifiez votre club, creez un evenement, et l'application affiche automatiquement les scores de vos joueurs ronde par ronde.

Toutes vos donnees sont stockees dans votre navigateur. Rien n'est envoye sur internet sans votre action.

---

## 1. Premier lancement : identifier votre club

Au premier demarrage, l'application vous demande le nom de votre club.

- Tapez le nom de votre club (ex : "Hay Chess", "Marseille-Echecs")
- Un identifiant est genere automatiquement (ex : `hay-chess`)
- Cliquez sur **Commencer**

Cet identifiant sert a organiser vos donnees localement. Vous pourrez le changer plus tard si besoin.

---

## 2. Creer un evenement

Un evenement regroupe un ou plusieurs tournois. Par exemple : "Championnat departemental 13 - Oct 2025" peut contenir les tournois U12, U14 et Open.

1. Cliquez sur **Creer un evenement**
2. Remplissez le **nom de l'evenement**
3. Pour chaque tournoi, indiquez :
   - Son **nom** (ex : U12, Open A)
   - Son **URL FFE** (copiez-la depuis le site echecs.asso.fr)
4. Cliquez sur **Ajouter un tournoi** pour en ajouter d'autres
5. Validez avec **Creer l'evenement**

Le champ "Nom du club" est optionnel : si vous le laissez vide, les clubs seront detectes automatiquement.

---

## 3. Charger les resultats

Une fois l'evenement cree, vous voyez un onglet par tournoi.

### Premiere utilisation : choisir votre club

1. Cliquez sur **Actualiser** (icone de rafraichissement)
2. L'application detecte tous les clubs presents dans le tournoi
3. Choisissez votre club dans la liste deroulante
4. Cliquez sur **Valider le choix du club**
5. Les resultats de tous vos tournois se chargent automatiquement

### Les fois suivantes : mettre a jour

- Cliquez sur **Actualiser** pour recharger les derniers resultats
- Raccourci clavier : **Ctrl+R** rafraichit le tournoi affiche

---

## 4. Lire le tableau des resultats

Le tableau affiche pour chaque joueur de votre club :

| Colonne | Signification |
|---------|---------------|
| Nom | Nom du joueur |
| Elo | Classement Elo du joueur |
| R1, R2... | Score a chaque ronde (0, 0.5 ou 1) |
| Pts | Total des points |
| Tr. | Departage (tranchage) |
| Buch. | Buchholz (departage) |
| Perf | Performance Elo du tournoi |
| Class. | Classement dans le tournoi |

La premiere ligne "Total Club" affiche la somme des scores de tous vos joueurs pour chaque ronde.

### Cocher les resultats (validation)

A cote de chaque score, une case a cocher permet de valider le resultat (par exemple, pour confirmer qu'une feuille de partie a ete remise). Ces coches sont sauvegardees localement.

---

## 5. Changer de club

Si vous avez selectionne le mauvais club, pas de panique :

1. Cliquez sur **Changer de club** (petit lien a cote du nom du club)
2. Si des joueurs sont deja charges, une confirmation vous est demandee
3. Confirmez : les donnees joueurs sont effacees et vous pouvez choisir un autre club

---

## 6. Partager un evenement

### Par QR code ou lien

1. Ouvrez le menu **Gerer les evenements** (bouton en haut a droite)
2. Cliquez sur l'icone de partage (fleche) a cote de l'evenement
3. Un QR code et un lien sont generes
4. Scannez le QR code avec un telephone, ou copiez le lien

Le destinataire ouvrira l'application avec l'evenement pre-charge. S'il n'a pas encore choisi de club, il pourra choisir le sien.

**Important :** les cases cochees (validations) ne sont pas incluses dans le partage par QR code.

### Par fichier JSON

Pour un partage complet (avec les validations) :

- **Exporter** : cliquez sur l'icone d'export dans la liste des evenements. Un fichier `.json` est telecharge.
- **Importer** : dans le gestionnaire d'evenements, cliquez sur l'icone d'import et selectionnez le fichier `.json`.

Si l'evenement existe deja, vous pouvez choisir de le remplacer ou de garder les deux.

---

## 7. Gerer plusieurs evenements

Cliquez sur **Gerer les evenements** pour :

- **Voir** tous vos evenements (l'evenement actif est mis en surbrillance)
- **Basculer** entre evenements en cliquant dessus
- **Supprimer** un evenement (icone poubelle rouge, avec confirmation)
- **Creer** un nouvel evenement
- **Exporter / Importer / Partager** (voir section 6)

---

## 8. Synchronisation cloud (optionnel)

Vous pouvez sauvegarder vos donnees dans le cloud pour les retrouver sur un autre appareil :

- **Envoyer vers le cloud** : icone nuage avec fleche vers le haut, dans la liste des evenements
- **Telecharger depuis le cloud** : icone nuage avec fleche vers le bas, dans la barre d'outils du gestionnaire

La synchronisation se fait manuellement, a votre initiative.

---

## 9. Autres fonctions

### Desactiver les animations

Le bouton eclair dans la barre du haut permet de desactiver les animations d'arriere-plan. Utile pour economiser la batterie sur telephone.

### Partager l'application

Le bouton de partage dans la barre du haut (a ne pas confondre avec le partage d'evenement) genere un QR code vers l'application elle-meme, pour la faire decouvrir a d'autres clubs.

### Installer sur telephone

L'application peut s'installer comme une appli classique sur votre telephone :

- **Android** : ouvrez le site dans Chrome, puis "Ajouter a l'ecran d'accueil"
- **iPhone** : ouvrez le site dans Safari, puis Partager > "Sur l'ecran d'accueil"

Une fois installee, l'application s'ouvre en plein ecran, comme une appli native.

### Changer de club (identite)

Si vous changez de club d'echecs, cliquez sur votre nom de club dans la barre du haut, puis **Changer de club**. Cela vous ramene a l'ecran d'identification. Vos evenements sont conserves.

---

## En resume

| Etape | Action |
|-------|--------|
| 1 | Identifiez votre club |
| 2 | Creez un evenement avec les URLs FFE |
| 3 | Cliquez Actualiser et choisissez votre club |
| 4 | Suivez vos joueurs ronde par ronde |
| 5 | Partagez par QR code, lien ou fichier |
