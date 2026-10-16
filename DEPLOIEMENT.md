# Mise en ligne — pas à pas

Objectif : un site accessible en HTTPS sur votre nom de domaine, avec base de données, e-mails et administration.
Durée : 1 à 2 heures. Coût de départ : ~0 € (Supabase gratuit + Render gratuit) ; **comptez ~7 €/mois** (Render *Starter*)
dès l'ouverture publique, car l'offre gratuite s'endort après 15 minutes et coupe les WebSockets.

## 1. Comptes à créer (par vous — je ne peux pas le faire à votre place)

| Service | Rôle | Gratuit ? |
|---|---|---|
| [GitHub](https://github.com) | Le code (déjà fait) | oui |
| [Supabase](https://supabase.com) | Base PostgreSQL | oui (500 Mo) |
| [Render](https://render.com) | Hébergement de l'application | oui / Starter 7 $/mois |
| [Resend](https://resend.com) | Envoi d'e-mails | oui (3 000/mois) |
| Un registrar (OVH, Gandi…) | Nom de domaine | ~10 €/an |

## 2. Supabase (base de données)

1. Nouveau projet, région **Europe** (Paris/Francfort). Notez le mot de passe de la base.
2. *Project Settings → Database → Connection string* :
   - **Transaction pooler (port 6543)** → `DATABASE_URL`, en ajoutant `?pgbouncer=true&connection_limit=1`
   - **Direct connection (port 5432)** → `DIRECT_URL`
3. Aucune extension à activer (la recherche géographique utilise des formules, pas PostGIS).

## 3. Render (application)

1. *New → Blueprint* → dépôt GitHub `entre-transporteurs` (il lit `render.yaml`).
2. Renseignez les variables marquées « sync: false » :
   `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL` (l'URL HTTPS finale, ex. `https://entre-transporteurs.onrender.com`),
   les informations légales `EDITEUR_*` / `EMAIL_CONTACT`, et `RESEND_API_KEY` / `EMAIL_FROM`.
   `NEXTAUTH_SECRET` est généré automatiquement.
3. Le build applique automatiquement les migrations (`prisma migrate deploy`).
4. Vérifiez `https://VOTRE-URL/api/sante` → `{"statut":"ok"}`.
5. Domaine personnalisé : *Settings → Custom Domains*, puis **mettez à jour `NEXTAUTH_URL`** avec ce domaine et redéployez.

> Le serveur **refuse de démarrer** en production si `NEXTAUTH_SECRET` est faible ou si `NEXTAUTH_URL` n'est pas en HTTPS :
> le message d'erreur est dans les logs Render.

## 4. E-mails (Resend)

1. Créez une clé API → `RESEND_API_KEY`.
2. Ajoutez votre domaine et publiez les enregistrements DNS (SPF/DKIM) fournis : sans cela, les e-mails finissent en spam.
3. `EMAIL_FROM="Entre Transporteurs <no-reply@votre-domaine.fr>"`.
4. Dès que `RESEND_API_KEY` est défini, **la confirmation d'adresse devient obligatoire** pour publier/contacter.

## 5. Premier administrateur

Dans le *Shell* Render du service :

```bash
npm run admin:creer vous@votre-domaine.fr      # affiche un mot de passe généré, à changer dans « Mon compte »
```

Ne lancez **jamais** `npm run db:seed` en production (il refuse de toute façon) : ce sont de faux comptes à mot de passe public.
Si vous l'avez fait par erreur : `npm run demo:nettoyer -- --oui`.

## 6. Check-list avant d'ouvrir au public

- [ ] Informations légales renseignées (sinon les pages affichent « [à compléter] »), CGU et confidentialité **relues par un juriste**
- [ ] `NEXT_PUBLIC_DEMO_MODE` **absent** (pas de connexion en un clic)
- [ ] Aucune donnée de démonstration en base
- [ ] Domaine en HTTPS, `NEXTAUTH_URL` identique, e-mail de test reçu (inscription → lien de confirmation)
- [ ] Mot de passe oublié testé de bout en bout
- [ ] Compte admin créé et mot de passe changé
- [ ] Plan Render **Starter** (pas d'endormissement)
- [ ] Sauvegardes : activer les sauvegardes Supabase (offre Pro) ou planifier un `pg_dump` hebdomadaire
- [ ] Supervision : un moniteur gratuit (UptimeRobot) sur `/api/sante`
- [ ] `npm run verif:securite` passé **sur un environnement de test** (jamais sur la production)

## 7. Faire payer plus tard

Rien à changer dans le code : créer le produit Stripe (69 €/mois), puis ajouter `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
`STRIPE_WEBHOOK_SECRET` (webhook → `https://VOTRE-URL/api/stripe/webhook`). Les commissionnaires seront alors soumis à
l'abonnement ; les transporteurs restent gratuits. **Prévenez vos utilisateurs 30 jours avant** (engagement pris dans les CGU).

## 8. Mises à jour

`git push` sur `main` → Render rebuild, applique les migrations et redéploie.
Pour modifier la base : éditer `prisma/schema.prisma`, puis `npx prisma migrate dev --name description` en local, et commiter le dossier `prisma/migrations/`.
