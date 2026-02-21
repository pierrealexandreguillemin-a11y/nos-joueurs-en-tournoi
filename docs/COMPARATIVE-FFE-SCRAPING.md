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

> **Note** : nous utilisons deja le pattern URL `Tournois/Id/{id}/{id}` (cf. `src/lib/parser.ts`). Le endpoint `.papi` direct (`/Tournois/Id/{id}/{id}.papi`) utilise par Sharly Chess est un fichier Access sur la meme base URL. Nous disposons d'un projet separe (`convertisseur_csv_papi`) qui maitrise ce format (voir section 10).

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

## 10. Connaissance du format .papi

Pour reference, nous disposons d'un projet separe (`convertisseur_csv_papi`, Python 3.12, pyodbc) qui maitrise le format `.papi` (Access). Structure des tables :

```
TABLE JOUEUR: Ref, Nom, Prenom, Sexe, Elo, NeLe, Rapide, Blitz,
              Federation, FideCode, FideTitre, NrFFE, Club, Ligue, Cat, AffType, ...
TABLE RES:    (resultats par ronde — colonnes Rd01..Rd24)
TABLE INFO:   Variable (VARCHAR), Value (VARCHAR) — metadata tournoi (key-value)
```

Le fichier `.papi` d'un tournoi est telechargeable publiquement sur le meme pattern URL que nos pages HTML :

```
https://www.echecs.asso.fr/Tournois/Id/{id}/{id}.papi
```

Ce format contient plus de donnees (NrFFE, FideCode, categorie, naissance) mais son exploitation dans notre contexte n'est pas justifiee (voir section 11).

## 11. Conclusion

### Deux projets, deux problemes differents

- **Sharly Chess** est un **logiciel d'arbitrage complet** qui gere le cycle de vie du tournoi (saisie, appariements, resultats, upload FFE). Il accede aux donnees FFE via des canaux privilegies (SQL Server, admin). Sa complexite (plugins, background uploaders, ASP.NET auth) est justifiee par son perimetre.

- **Nos Joueurs en Tournoi** est un **tableau de bord de suivi club** : cliquer "Actualiser", voir les resultats de ses joueurs pendant un tournoi. C'est tout.

### Notre approche est adaptee

Le scraping HTML public via cheerio est **la bonne solution pour notre cas d'usage** :

- **Simple** — 2 fetches, cheerio parse, on affiche. Zero auth, zero session, zero etat serveur.
- **Suffisant** — les donnees visibles en HTML (nom, ELO, resultats par ronde, points, Buchholz) sont exactement ce dont un accompagnateur de club a besoin le jour du tournoi.
- **Stable** — les classes CSS FFE (`papi_joueur_box`, `papi_liste_c`) n'ont pas change depuis des annees.

### Ce qui ne vaut pas le coup

| Piste | Pourquoi non |
|---|---|
| Source `.papi` directe | Over-engineering — remplacer cheerio par un lecteur Access (pyodbc, mdb-reader, Jackcess) pour le meme resultat visible. Les donnees supplementaires (NrFFE, FIDE, categorie) ne sont pas dans le perimetre de l'app. |
| Cache serveur | Contre-productif — l'utilisateur clique "Actualiser" pour avoir des donnees fraiches (rondes en cours). Un cache irait a l'encontre du but. |
| Gestion d'erreurs enrichie | Disproportionne — c'est une app de suivi de tournoi le week-end, pas un systeme critique. |
| SQL Server direct / Auth admin / Upload | Hors perimetre — notre app est en lecture seule sur les pages publiques. |

Ce document est une **reference documentaire** sur l'ecosysteme FFE et les approches techniques existantes, pas un plan d'action.
