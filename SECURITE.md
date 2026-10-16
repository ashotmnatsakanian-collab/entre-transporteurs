# Sécurité — Entre Transporteurs

Ce document décrit les protections en place, comment les **vérifier vous-même**, et leurs **limites**.
Il ne remplace pas un audit externe avant une montée en charge.

## Vérifier en 2 commandes

```bash
npm test                    # 27 tests unitaires (SIRET, limitation de débit, IP, validations…)
npm run dev                 # dans un terminal…
npm run verif:securite      # …puis dans un autre : ~136 attaques rejouées contre l'application
```

`verif:securite` joue le rôle d'un attaquant (visiteur anonyme, mauvais rôle, accès aux ressources d'autrui,
CSRF, injections, force brute, usurpation de socket, session révoquée…) et **échoue** si une protection manque.
Il crée puis supprime ses propres comptes : ne le lancez jamais contre la base de production.

## Ce qui est en place

| Domaine | Protection |
|---|---|
| **Authentification** | Mots de passe hachés (bcrypt, coût 12), politique 8–72 car. (majuscule/minuscule/chiffre), verrouillage du compte après 5 échecs (15 min), limite par IP, temporisation constante (pas d'énumération de comptes par chronométrage) |
| **Sessions** | JWT signé/chiffré, 7 jours ; le compte est relu en base **à chaque requête** : suspension ou suppression = coupure immédiate ; changement/réinitialisation du mot de passe = **toutes** les sessions révoquées |
| **Autorisation** | Contrôle de rôle sur chaque route (pas seulement l'interface) ; 404 plutôt que 403 sur les ressources d'autrui ; messagerie limitée aux paires transporteur ↔ commissionnaire ; accès commissionnaire (essai/abonnement) revérifié côté serveur |
| **Données exposées** | Jamais d'e-mail aux autres utilisateurs ; téléphone réservé aux commissionnaires autorisés ; auteurs d'avis abrégés (« Prénom N. ») ; carte et profils fermés aux transporteurs (un commissionnaire ne peut pas contourner l'abonnement en s'inscrivant transporteur) |
| **Entrées** | Validation Zod de tous les corps et paramètres, bornes de taille (413), Content-Type JSON obligatoire (415), requêtes SQL paramétrées (Prisma, `Prisma.sql`), jokers neutralisés dans les alertes |
| **CSRF** | Cookies `SameSite=Lax` + refus des requêtes d'écriture dont `Origin`/`Sec-Fetch-Site` indique un autre site |
| **XSS** | React échappe par défaut ; CSP à **nonce** + `strict-dynamic` (pas de `unsafe-inline` pour les scripts), `object-src 'none'` ; e-mails : valeurs HTML-échappées |
| **En-têtes** | CSP, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, HSTS (production), `X-Powered-By` supprimé |
| **Temps réel** | WebSocket authentifié par le **cookie de session signé** (l'identité déclarée par le client est ignorée) ; rooms de conversation réservées aux participants ; flux « annonces/carte » réservés aux commissionnaires autorisés, « besoins » aux transporteurs ; plafonds de messages et de taille |
| **Abus** | Limitation de débit par route (inscription, connexion, recherche, publication, messages, avis…), plafonds métier (annonces actives, véhicules, alertes), jeton de réinitialisation à usage unique (haché en base, 1 h) |
| **Comptes** | Réinitialisation et vérification d'e-mail par jetons ; consentement CGU horodaté ; export RGPD ; suppression avec anonymisation ; signalement d'utilisateurs ; suspension par l'admin |
| **Confiance** | Badge « SIRET vérifié » = établissement **existant et actif** au répertoire officiel de l'État (API `recherche-entreprises`), jamais une certification de licence de transport |
| **Audit** | Journal de sécurité en base (connexions, échecs, verrouillages, réinitialisations, actions admin, signalements) consultable dans `/admin/journal` |
| **Infra** | Validation de l'environnement au démarrage (le serveur **refuse** de démarrer en production avec un secret faible ou une URL non HTTPS), délais HTTP serrés, arrêt propre, erreurs sans stack ni détail interne |
| **Dépendances** | `npm audit --omit=dev` : 0 vulnérabilité (Next 15.5, React 19, next-auth 4.24.15) |

## Limites connues (à connaître, pas à cacher)

- **Pas de 2FA** ni de CAPTCHA à l'inscription : le limiteur par IP freine l'abus mais ne l'empêche pas.
- **Limiteur en mémoire** : valable pour **une seule instance** (Render gratuit/Starter). Avec plusieurs instances, il faut un magasin partagé (Redis/Upstash).
- **Énumération à l'inscription** : « un compte existe déjà » (409) révèle qu'un e-mail est inscrit (limité à 10 inscriptions/h/IP). Compromis d'ergonomie assumé.
- **Jetons de réinitialisation** envoyés par e-mail : la sécurité du compte dépend alors de celle de la boîte mail.
- **Les messages ne sont pas chiffrés de bout en bout** : l'exploitant peut les lire (c'est annoncé dans la politique de confidentialité).
- **Pas de scan antivirus / pièces jointes** : le service n'accepte aucun fichier (surface d'attaque volontairement nulle).
- **Aucune modération automatique du contenu** : modération manuelle via les signalements.
- **Un audit externe** (test d'intrusion) reste recommandé avant d'avoir des milliers d'utilisateurs ou de traiter des paiements.

## Procédures

**Suspicion de compromission d'un compte** : `/admin/utilisateurs` → Suspendre (coupe les sessions immédiatement), puis consulter `/admin/journal`.

**Fuite possible du secret de session** : changer `NEXTAUTH_SECRET` sur Render et redéployer → toutes les sessions sont invalidées.

**Fuite de la base** : les mots de passe sont hachés (bcrypt), les jetons de réinitialisation sont hachés (SHA-256). Forcer la réinitialisation en changeant `NEXTAUTH_SECRET`, prévenir les utilisateurs et la CNIL sous 72 h si des données personnelles sont concernées.

**Signaler une vulnérabilité** : écrire à l'adresse de contact des mentions légales.
