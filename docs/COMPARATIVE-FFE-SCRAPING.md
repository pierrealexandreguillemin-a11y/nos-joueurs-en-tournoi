# Analyse comparative : Scraping FFE — Sharly Chess vs Nos Joueurs en Tournoi

> Enquete realisee le 21/02/2026 sur le depot [Sharly-Chess/sharly-chess](https://github.com/Sharly-Chess/sharly-chess) (Python, AGPL-3.0).

## 1. Vue d'ensemble architecturale

| Critere | Nos Joueurs en Tournoi | Sharly Chess |
|---|---|---|
| **Stack** | Next.js 16 / TypeScript / React 19 | Python 3 / FastAPI / SQLite |
| **Type** | Web app (SaaS, Vercel) | Desktop app avec UI web locale |
| **Acces FFE** | Lecture seule (pages publiques) | Lecture + Ecriture (admin FFE) |
| **Auth FFE** | Aucune | Login admin ASP.NET (n. homologation + mot de passe) |
| **Format donnees** | HTML scraping (cheerio) | SQL Server direct + fichiers `.papi` binaires |

## 2. Sources de donnees FFE

### Notre projet — une seule source

Scraping HTML des pages publiques `echecs.asso.fr/Resultats.aspx` via un proxy Next.js (`/api/scrape`).

3 pages scrapees par tournoi :

| Page | URL pattern | Donnees |
|---|---|---|
| Liste joueurs | `Resultats.aspx?URL=Tournois/Id/{id}/{id}&Action=Ls` | Nom, club, ELO, categorie |
| Grille americaine | `Resultats.aspx?URL=Tournois/Id/{id}/{id}&Action=Ga` | Resultats par ronde, points, Buchholz |
| Statistiques | `Resultats.aspx?URL=Tournois/Id/{id}/{id}&Action=Stats` | Repartition par clubs |

> **Note** : nous utilisons deja le pattern URL `Tournois/Id/{id}/{id}` (cf. `src/lib/parser.ts:getListUrl`, `getResultsUrl`, `getStatsUrl`). Le endpoint `.papi` direct (`/Tournois/Id/{id}/{id}.papi`) utilise par Sharly Chess est un fichier Access sur la meme base URL — et nous disposons d'un **convertisseur Excel/Papi** (`convertisseur_csv_papi`) qui maitrise deja ce format (voir section 10).

### Sharly Chess — 3 sources distinctes

| Source | Technologie | Usage |
|---|---|---|
| **SQL Server FFE** (en ligne) | Connexion TDS directe (`pytds`) | Recherche de joueurs en temps reel (licence FFE, FIDE ID, nom) |
| **Base locale** (hors-ligne) | Telechargement `PapiData.zip` -> conversion MDB -> SQLite | Base joueurs complete hors-ligne (staleness: 2 jours) |
| **Admin FFE** (web scraping) | `requests.Session` + parsing ASP.NET | Upload/download fichiers `.papi`, gestion droits, visibilite tournoi |

## 3. Mecanisme de scraping detaille

### Notre approche

```
Client (React)
  |
  | POST /api/scrape {url}
  v
Next.js API Route (/api/scrape/route.ts)
  |
  | fetch(echecs.asso.fr) — validation SSRF hostname
  v
FFE (HTML public)
  |
  | text/html
  v
API Route -> JSON {html} -> Client
  |
  | cheerio.load(html)
  v
parsePlayerClubs() + parseResults() -> Player[]
```

- Proxy serveur Next.js pour contourner CORS
- Protection SSRF : hostname strictement limite a `echecs.asso.fr` / `www.echecs.asso.fr`
- Parsing avec **cheerio** (selecteurs CSS) — classes FFE stables (`papi_joueur_box`, `papi_liste_c`, `papi_liste_t`)
- Fetch parallele de 2 pages (`scrapeFFEPair`) via `Promise.all`
- Aucune session, aucun cookie, aucun etat serveur

### Approche Sharly Chess

```
Sharly Chess
  |
  | pytds.connect(SQL Server FFE)
  v
SELECT joueur JOIN club -> Player data (recherche joueurs)

Sharly Chess
  |
  | requests.Session -> POST admin.echecs.asso.fr
  | (ASP.NET auth: __VIEWSTATE + credentials)
  v
Session cookie -> POST MonTournoi.aspx (upload .papi)
```

- Connexion SQL Server directe (pas de scraping HTML pour les donnees joueurs)
- Auth ASP.NET complete : `__VIEWSTATE`, `__VIEWSTATEGENERATOR`, `__EVENTVALIDATION` + credentials
- Format `.papi` binaire proprietaire pour l'import/export de tournois
- Scraping HTML **uniquement** pour les listes d'arbitres (pages publiques)

## 4. Parsing et extraction de donnees

| Aspect | Notre projet | Sharly Chess |
|---|---|---|
| **Parser HTML** | `cheerio` (jQuery-like, Node.js) | `AdvancedHTMLParser` (Python) |
| **Donnees joueurs** | Scraping HTML tables FFE | SQL Server direct (pas de HTML) |
| **Donnees resultats** | Scraping `div.papi_joueur_box` + sous-tables | Fichier `.papi` binaire (format proprietaire) |
| **Detection clubs** | Scraping page Stats -> section "Repartition par clubs" | Non applicable (l'arbitre saisit les joueurs) |
| **ELO** | Regex `(\d+)` sur texte cellule | Champ SQL `joueur.Elo`, `joueur.Rapide`, `joueur.Fide` |
| **Points** | Parse `1/2` -> 0.5 | Calcul interne depuis `.papi` |

## 5. Gestion d'erreurs

**Notre projet** — classification par code HTTP :
- 404 -> "Tournoi introuvable"
- 500 -> "Probleme serveur FFE"
- Autres -> message generique avec code status

**Sharly Chess** — strategie multicouche :
- Erreurs reseau : `ConnectionError`, `Timeout`, `HTTPError`, `RequestException` (chacune retourne `None`)
- Erreurs FFE : parsing du `LabelError` dans le HTML de reponse admin
- Erreurs SQL : wrapping en `SharlyChessException`
- Verification reseau avant connexion (`NetworkMonitor.connected()`)
- Timeout SQL : 10 secondes

## 6. Upload / bidirectionnalite

| | Notre projet | Sharly Chess |
|---|---|---|
| **Lecture** | Oui (scraping public) | Oui (SQL + download .papi) |
| **Ecriture** | Non | Oui (upload .papi via admin) |
| **Auto-upload** | N/A | Oui — `threading.Timer`, delai configurable (min 3 min) |
| **Visibilite tournoi** | N/A | Oui — active/desactive publication FFE |
| **Facturation** | N/A | Oui — recupere facture droits FFE |

## 7. Performance et caching

**Notre projet** :
- Pas de cache cote serveur (chaque "Actualiser" refait 2 fetches)
- Donnees stockees en localStorage cote client
- Fetch parallele (`Promise.all`) pour list + results

**Sharly Chess** :
- Cache fichiers `.papi` telecharges (2 jours)
- Base joueurs locale SQLite (rafraichie tous les 2 jours)
- Upload en arriere-plan avec `threading.Timer`
- Notifications WebSocket en temps reel du statut d'upload

## 8. Securite

**Notre projet** :
- Validation SSRF stricte du hostname dans `/api/scrape`
- Pas de credentials FFE stockes
- Pas d'acces admin

**Sharly Chess** :
- Credentials stockes en clair dans fichier `.credentials` local
- Auth par formulaire ASP.NET (simulation de clics navigateur)
- Mot de passe FFE : format fixe `[A-Z]{10}`
- Connexion SQL Server avec credentials separes

## 9. URLs et endpoints FFE

| Usage | URL |
|---|---|
| Site public FFE | `http://echecs.asso.fr` |
| Admin FFE | `http://admin.echecs.asso.fr` |
| Auth POST | `http://admin.echecs.asso.fr/Default.aspx` |
| Upload/Fees/Visibilite | `http://admin.echecs.asso.fr/MonTournoi.aspx` |
| Liste arbitres | `http://echecs.asso.fr/ListeArbitres.aspx?Action=DNALIGUE&Ligue={code}` |
| Base joueurs FFE (zip) | `https://www.echecs.asso.fr/Papi/PapiData.zip` |
| Fichier .papi tournoi | `https://www.echecs.asso.fr/Tournois/Id/{id}/{id}.papi` |
| Resultats HTML (notre usage) | `https://www.echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/{id}/{id}&Action={Ls,Ga,Stats}` |

## 10. Synergie avec le convertisseur Excel/Papi

Nous disposons d'un projet `convertisseur_csv_papi` qui maitrise le format `.papi` :

| Composant | Detail |
|---|---|
| **Stack** | Python 3.12, pyodbc, openpyxl |
| **Lecture .papi** | Via ODBC Access — tables `JOUEUR`, `RES`, `INFO` |
| **Ecriture .papi** | Copie template `Modele_Papi.papi` + INSERT via ODBC |
| **Enrichissement FFE** | Lecture `Data.mdb` (base joueurs FFE locale) |
| **Tests** | 169 tests, couverture >= 90% |

### Structure des tables .papi (Access)

```
TABLE JOUEUR: Ref, Nom, Prenom, Sexe, Elo, NeLe, Rapide, Blitz,
              Federation, FideCode, FideTitre, NrFFE, Club, Ligue, Cat, AffType, ...
TABLE RES:    (resultats par ronde — colonnes Rd01..Rd24)
TABLE INFO:   Variable (VARCHAR), Value (VARCHAR) — metadata tournoi (key-value)
```

### Possibilite : source `.papi` directe au lieu du scraping HTML

Le fichier `.papi` d'un tournoi est telechargeable publiquement :

```
https://www.echecs.asso.fr/Tournois/Id/{id}/{id}.papi
```

Ce fichier Access contient les memes donnees que les pages HTML mais en format structure (tables relationnelles). Avantages potentiels :

| | Scraping HTML (actuel) | Source .papi directe |
|---|---|---|
| **Fiabilite** | Fragile (depends CSS classes FFE) | Stable (schema Access fixe depuis Papi 3.3.8) |
| **Donnees** | 3 pages a parser (Ls + Ga + Stats) | 1 fichier, tout inclus (joueurs + resultats + clubs) |
| **Performance** | 3 fetches HTTP + parsing cheerio | 1 fetch HTTP + lecture Access |
| **Parsing** | Regex/selecteurs CSS sur HTML non-semantique | Requetes SQL sur tables structurees |
| **Rondes** | Parse `div.papi_joueur_box` sous-tables | Colonnes `Rd01..Rd24` directes |
| **NrFFE** | Non disponible en HTML public | Disponible dans table JOUEUR |
| **Categorie** | Non disponible en HTML public | Disponible (`Cat`) |

### Contrainte : runtime

Le lecteur .papi actuel utilise `pyodbc` + ODBC Access (Windows only). Pour l'integrer a notre app Vercel (Linux serverless), plusieurs pistes :

1. **API Python dediee** — un micro-service Python (Azure Function, fly.io, etc.) qui telecharge le `.papi`, le lit via pyodbc ou Jackcess, et retourne du JSON. Notre app Next.js l'appelle au lieu de scraper le HTML.

2. **Jackcess WASM/Node** — la bibliotheque Java Jackcess (utilisee par papi-converter de Sharly Chess) lit les fichiers Access sans ODBC. Un portage Node.js ou WASM permettrait la lecture cote Vercel.

3. **mdb-reader (npm)** — des bibliotheques npm comme `mdb-reader` lisent les fichiers `.mdb`/`.accdb` en pur JavaScript (zero ODBC). C'est la piste la plus directe pour une integration dans notre API Route Next.js.

4. **Workflow hybride** — telecharger le `.papi` cote API Route, le convertir en JSON via un binaire papi-converter (subprocess), puis parser le JSON. Necessite un binaire pre-compile dans le deploy Vercel.

### Donnees supplementaires disponibles via `.papi`

Par rapport au scraping HTML actuel, le `.papi` donnerait acces a :

- **NrFFE** (numero licence FFE) — permettrait un lien direct vers la fiche joueur FFE
- **FideCode** — lien vers la fiche FIDE
- **Categorie exacte** (U8, U10, ..., Vet) — affichage plus riche
- **Naissance** — calcul d'age
- **Resultats codes** (colonnes Rd01..Rd24) — pas de parsing HTML fragile
- **Departages** (Buchholz, Sonneborn-Berger, etc.) — valeurs exactes calculees par Papi

## 11. Axes d'amelioration identifies

### Court terme (sans changement d'architecture)

1. **Cache serveur** — Cacher les reponses HTML FFE cote API (Vercel KV) avec un TTL de quelques minutes pour eviter les fetches redondants.

2. **Gestion d'erreurs enrichie** — Distinguer les timeouts FFE des erreurs reseau (comme le fait Sharly Chess avec ConnectionError vs Timeout vs HTTP).

3. **Detection de connectivite** — `navigator.onLine` cote client avant toute requete.

### Moyen terme (evolution vers source .papi)

4. **Source `.papi` directe** — Remplacer le scraping HTML par le telechargement du fichier `.papi` et sa lecture via `mdb-reader` (npm, pur JS). Elimine la fragilite du parsing HTML et donne acces a des donnees supplementaires (NrFFE, categorie, FIDE ID). Voir section 10 pour l'analyse detaillee.

### Non pertinents pour notre projet

- **SQL Server direct** — reserve aux logiciels d'arbitrage homologues FFE
- **Upload `.papi`** — notre cas d'usage est consultation uniquement
- **Auth admin FFE** — pas necessaire pour la lecture de pages publiques

## 12. Conclusion

Les deux projets resolvent des **problemes fondamentalement differents** :

- **Sharly Chess** est un **logiciel d'arbitrage complet** qui gere le cycle de vie du tournoi (saisie, appariements, resultats, upload FFE). Il accede aux donnees FFE via des canaux privilegies (SQL Server, admin).

- **Nos Joueurs en Tournoi** est un **tableau de bord de suivi club** qui scrape les resultats publics pour offrir une vue filtree par club.

Notre approche actuelle (scraping HTML via cheerio) fonctionne mais reste fragile. La piste la plus prometteuse est l'**evolution vers la source `.papi` directe** : nous maitrisons deja le format (via le projet `convertisseur_csv_papi`), l'URL de telechargement est publique et sur le meme pattern que nos URLs actuelles, et des bibliotheques npm (`mdb-reader`) permettent la lecture Access en pur JavaScript sur Vercel. Cette evolution donnerait un parsing plus fiable et des donnees plus riches (NrFFE, categories, FIDE) sans changer l'architecture de l'app.
