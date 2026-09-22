# 🚛 Entre Transporteurs

Bourse de fret géolocalisée mettant en relation **transporteurs** et **commissionnaires de transport**.

## Stack technique

| Couche | Technologie |
|---|---|
| Front-end | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Back-end | API Routes Next.js |
| Base de données | PostgreSQL + Prisma ORM + PostGIS |
| Auth | NextAuth v4 (credentials + JWT) |
| Carte | Leaflet + react-leaflet + OpenStreetMap |
| Temps réel | Socket.io (serveur custom Next.js) |
| Paiement | Stripe (Checkout + Billing Portal + Webhooks) |
| Infra | Docker + docker-compose |

---

## Installation locale (sans Docker)

### Prérequis
- Node.js 20+
- PostgreSQL 15+ avec PostGIS installé
- Stripe CLI (pour les webhooks)

### 1. Cloner et installer

```bash
git clone <repo>
cd entre-transporteurs
npm install
```

### 2. Variables d'environnement

```bash
cp .env.example .env
```

Remplir `.env` :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/entre_transporteurs"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Clés Stripe TEST — dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_PRICE_ID="price_..."         # Voir section Stripe ci-dessous
STRIPE_WEBHOOK_SECRET="whsec_..."   # Voir section Webhook ci-dessous
```

### 3. Base de données

```bash
# Créer la base et activer PostGIS
psql -U postgres -c "CREATE DATABASE entre_transporteurs;"
psql -U postgres -d entre_transporteurs -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Migrer + générer le client Prisma
npm run db:migrate

# Injecter les données de test
npm run db:seed
```

### 4. Configuration Stripe

1. Créer un produit dans Stripe Dashboard > Produits (uniquement pour les commissionnaires — les transporteurs sont toujours gratuits) :
   - Nom : "Abonnement Commissionnaire — Entre Transporteurs"
   - Prix : 69 € / mois récurrent
   - Copier l'ID du prix (`price_xxx`) → `STRIPE_PRICE_ID`

2. Activer le Portail client dans Stripe Dashboard > Paramètres > Portail client

### 5. Webhooks Stripe (développement local)

Installer la [Stripe CLI](https://stripe.com/docs/stripe-cli) puis :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copier le `whsec_...` affiché → `STRIPE_WEBHOOK_SECRET`

### 6. Lancer l'application

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## Installation avec Docker

```bash
cp .env.example .env
# Remplir les variables Stripe dans .env

docker-compose up --build
```

La base de données sera initialisée automatiquement. Pour le seed :

```bash
docker-compose exec app npm run db:seed
```

---

## Comptes de test (après seed)

| Rôle | Email | Mot de passe |
|---|---|---|
| Transporteur | jean.dupont@dupont-transport.fr | Password123! |
| Transporteur | marie@brossard-logistique.fr | Password123! |
| Commissionnaire | francois@tlf-paris.fr | Password123! |
| Commissionnaire | isabelle@groupe-fret.fr | Password123! |

---

## Fonctionnalités

### Transporteur
- ✅ Inscription avec profil SIRET / raison sociale
- ✅ Bascule de disponibilité temps réel (visible sur la carte instantanément)
- ✅ CRUD complet de la flotte : type, dimensions, charge utile, 12 spécificités
- ✅ Sélection des zones de circulation par département
- ✅ Profil public consultable

### Commissionnaire
- ✅ Moteur de recherche géo : rayon, type véhicule, charge utile, longueur, spécificités, disponibilité
- ✅ Résultats en liste + basculable sur carte interactive
- ✅ Profils publics des transporteurs

### Carte interactive
- ✅ Tous les transporteurs actifs géolocalisés
- ✅ Indicateur vert/rouge de disponibilité mis à jour en temps réel via WebSocket
- ✅ Popup avec infos et lien vers profil

### Messagerie
- ✅ Démarrer une conversation depuis un profil ou un résultat de recherche
- ✅ Messages en temps réel (Socket.io)
- ✅ Badge de non-lus en temps réel dans la barre de navigation
- ✅ Marquage automatique comme lu à l'ouverture de la conversation
- ✅ Sécurité : seuls les participants peuvent lire la conversation

### Abonnement Stripe (commissionnaires uniquement)
- ✅ Transporteurs 100% gratuits : aucun abonnement, aucun gating — ils publient leur disponibilité librement pour ne pas rouler à vide
- ✅ Commissionnaires : essai gratuit 30 jours (aucune carte requise), puis 69 €/mois TTC
- ✅ Bannière d'essai avec jours restants (rouge si < 3 jours)
- ✅ Gating automatique si essai expiré ou abonnement annulé
- ✅ Stripe Checkout pour souscrire (69 €/mois TTC)
- ✅ Stripe Billing Portal pour gérer / annuler
- ✅ Webhooks : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

---

## Architecture

```
entre-transporteurs/
├── prisma/              # Schéma Prisma + seed
├── src/
│   ├── app/
│   │   ├── (auth)/      # Pages login / register (publiques)
│   │   ├── (protected)/ # Pages auth requise + check abonnement
│   │   ├── abonnement/  # Tarification, succès, réactivation
│   │   └── api/         # Toutes les routes API
│   ├── components/      # Composants React par domaine
│   ├── lib/             # Prisma, NextAuth, Stripe, Socket.io, Géo
│   ├── hooks/           # Hooks React personnalisés
│   └── types/           # Types TypeScript globaux
├── server.ts            # Serveur custom Next.js + Socket.io
└── docker-compose.yml
```

### Recherche géospatiale

La recherche par rayon utilise la formule **haversine** via `$queryRaw` Prisma et peut être upgradée vers `ST_DWithin` PostGIS pour les grands volumes :

```sql
SELECT tp.*, ROUND(CAST(
  6371 * acos(
    LEAST(1.0, cos(radians($lat)) * cos(radians(tp.latitude))
    * cos(radians(tp.longitude) - radians($lng))
    + sin(radians($lat)) * sin(radians(tp.latitude)))
  ) AS NUMERIC), 1) AS distance_km
FROM "TransporteurProfil" tp
WHERE distance_km <= $rayonKm
```

---

## Scripts disponibles

```bash
npm run dev          # Démarrer en développement (tsx watch)
npm run build        # Build Next.js
npm run db:generate  # Régénérer le client Prisma
npm run db:migrate   # Créer et appliquer une migration
npm run db:seed      # Injecter les données de test
npm run db:reset     # Réinitialiser la base
npm run db:studio    # Ouvrir Prisma Studio
```
