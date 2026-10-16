# 🚛 Entre Transporteurs

Bourse de fret « inversée » : les **transporteurs** publient gratuitement leurs disponibilités (trajets retour, véhicule libre), les **commissionnaires de transport** les trouvent en direct — ou publient un *besoin de transport* auquel les transporteurs proches répondent.

**Documentation** : [DEPLOIEMENT.md](DEPLOIEMENT.md) (mise en ligne pas à pas) · [SECURITE.md](SECURITE.md) (protections, vérification, limites) · [JURIDIQUE.md](JURIDIQUE.md) (mentions légales, CGU, RGPD, démarches)

```bash
npm install
cp .env.example .env              # puis renseigner NEXTAUTH_SECRET (openssl rand -base64 32)
npx prisma migrate deploy         # crée les tables
npm run db:seed                   # données de démonstration (LOCAL uniquement)
npm run dev                       # http://localhost:3000
npm test                          # tests unitaires
npm run verif:securite            # ~149 contrôles rejoués contre l'application (serveur lancé)
```

---

## Stack technique

| Couche | Technologie |
|---|---|
| Front-end | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS |
| Back-end | Routes API Next.js, validation Zod, serveur Node custom (`server.ts`) |
| Base de données | PostgreSQL + Prisma 5 (migrations versionnées) |
| Authentification | NextAuth v4 (identifiants + session JWT), bcrypt |
| Carte | Leaflet + OpenStreetMap |
| Temps réel | Socket.io, authentifié par le cookie de session |
| E-mails | Resend (API HTTP) — simulés dans la console en développement |
| Paiement | Stripe (désactivé tant que `STRIPE_SECRET_KEY` est absent : offre de lancement gratuite) |
| Données publiques | api-adresse.data.gouv.fr (villes), recherche-entreprises.api.gouv.fr (vérification SIRET) |
| Hébergement | Render (`render.yaml`) + Supabase, ou Docker |

---

## Fonctionnalités

### Transporteur (toujours gratuit)
- Inscription avec SIRET (badge **« SIRET vérifié »** si l'établissement est actif au répertoire officiel)
- Publication d'**annonces de disponibilité** (départ, arrivée éventuelle, dates, véhicule) et bascule disponible / indisponible
- Gestion de la flotte : type, dimensions, charge utile, spécificités
- Page **« Fret à prendre »** : besoins de transport publiés par des commissionnaires à proximité
- **Alertes e-mail** sur les besoins correspondant à son secteur

### Commissionnaire
- **Recherche unifiée** : disponibilités en direct ou recherche détaillée par rayon, véhicule, charge, spécificités
- **Carte interactive** des transporteurs disponibles, mise à jour en temps réel
- Publication de **besoins de transport** ; alertes e-mail quand un transporteur publie un trajet correspondant
- Fiche transporteur, avis (après échange réel), signalement

### Pour tous
- Messagerie temps réel entre transporteur et commissionnaire (badge de non-lus)
- Réinitialisation du mot de passe, confirmation d'adresse e-mail
- Page **Mon compte** : mot de passe, export de ses données (RGPD), suppression du compte
- Pages légales (mentions, CGU, confidentialité) alimentées par les variables `EDITEUR_*`
- **Espace administrateur** : utilisateurs (suspension), signalements, journal de sécurité
- Page d'accueil publique avec aperçu des disponibilités (sans coordonnées)

### Abonnement (commissionnaires, désactivé au lancement)
- Sans clé Stripe : accès libre à tous (offre de lancement)
- Avec Stripe : essai 30 jours, puis 69 € TTC/mois, portail de gestion, webhooks signés — voir [DEPLOIEMENT.md](DEPLOIEMENT.md#7-faire-payer-plus-tard)

---

## Développement local

### Prérequis
- Node.js 20+
- PostgreSQL 15+ (PostGIS **non** requis)

### Installation

```bash
git clone <repo> && cd entre-transporteurs
npm install
cp .env.example .env
```

Renseigner au minimum dans `.env` :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/entre_transporteurs"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/entre_transporteurs"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<openssl rand -base64 32>"
```

```bash
createdb entre_transporteurs
npx prisma migrate deploy      # applique prisma/migrations
npm run db:seed                # comptes et annonces de démonstration
npm run dev
```

Sans `RESEND_API_KEY`, les e-mails (confirmation, mot de passe oublié, alertes) s'affichent dans la console du serveur.

### Comptes de démonstration (après `db:seed`, **local uniquement**)

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Transporteur | jean.dupont@dupont-transport.fr | Password123! |
| Transporteur | marie@brossard-logistique.fr | Password123! |
| Commissionnaire | francois@tlf-paris.fr | Password123! |
| Commissionnaire | isabelle@groupe-fret.fr | Password123! |

> Ces comptes ont un mot de passe public : ne jamais les créer en production (`npm run demo:nettoyer` les supprime).

### Docker

```bash
cp .env.example .env           # définir NEXTAUTH_SECRET
docker-compose up --build      # applique les migrations puis démarre sur :3000
```

---

## Architecture

```
entre-transporteurs/
├── prisma/                 # schéma, migrations versionnées, seed
├── scripts/                # admin, nettoyage démo, vérification sécurité, lien de démo
├── tests/                  # tests unitaires (vitest)
├── src/
│   ├── app/
│   │   ├── (auth)/         # connexion, inscription, mot de passe, e-mail
│   │   ├── (legal)/        # mentions légales, CGU, confidentialité
│   │   ├── (protected)/    # espaces transporteur / commissionnaire / admin / messages / compte
│   │   └── api/            # routes API (toutes via le wrapper `gerer`)
│   ├── components/         # composants React par domaine
│   ├── lib/                # api (garde-fous), auth, env, rate-limit, journal, e-mail, socket, géo…
│   └── middleware.ts       # authentification des pages + CSP à nonce + en-têtes de sécurité
├── server.ts               # serveur Next + Socket.io (validation d'environnement, arrêt propre)
├── render.yaml             # déploiement Render
└── SECURITE.md · DEPLOIEMENT.md
```

Chaque route API suit le même schéma (`src/lib/api.ts`) : protection CSRF, authentification relue en base, rôle/accès, limitation de débit, validation Zod, réponse sans détail interne.

La recherche par rayon utilise la formule **haversine** en SQL paramétré (`Prisma.sql`), sans extension PostGIS.

---

## Scripts

```bash
npm run dev               # développement (tsx watch)
npm run build             # build de production
npm start                 # production (refuse de démarrer si la configuration est dangereuse)
npm test                  # tests unitaires
npm run typecheck         # vérification TypeScript
npm run verif:securite    # attaques rejouées contre un serveur lancé (jamais contre la production)
npm run admin:creer       # crée un administrateur (mot de passe généré)
npm run demo:nettoyer     # supprime les comptes et données de démonstration
npm run db:migrate        # (dev) crée une migration après modification de schema.prisma
npm run db:seed           # (dev) données de démonstration
npm run db:studio         # interface Prisma
```

## Partager une démo (lien public temporaire)

```bash
npm run db:seed                  # données de démonstration (dates d'annonces rafraîchies)
./scripts/demo-publique.sh       # construit, ouvre un lien public et lance l'app
```

Le script affiche un lien `https://xxxx.lhr.life` à envoyer (tunnel SSH localhost.run, sans compte). Il reste valide tant que le script tourne et que l'ordinateur est allumé ; **chaque lancement produit un nouveau lien**. La page de connexion propose alors des boutons « Essayer en tant que transporteur / commissionnaire » (variable `NEXT_PUBLIC_DEMO_MODE`, à ne **jamais** activer sur une vraie instance). Pour un hébergement permanent, voir [DEPLOIEMENT.md](DEPLOIEMENT.md).
