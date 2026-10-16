# Juridique et RGPD — ce qui est fait, ce qu'il vous reste à faire

> Les textes du site (CGU, confidentialité, mentions légales) sont un **socle complet et cohérent avec le fonctionnement réel de l'application**,
> mais ils ne remplacent pas un avis juridique. Faites-les relire par un avocat ou un juriste avant l'ouverture au public
> (une heure de consultation suffit en général pour un service B2B de cette taille).

## 1. Ce qui est déjà en place dans l'application

| Sujet | Mise en œuvre |
|---|---|
| **Mentions légales** | `/mentions-legales` : éditeur, hébergeur, statut d'hébergeur (LCEN), procédure de signalement, propriété intellectuelle |
| **CGU** | `/cgu` : objet, comptes, rôle de la plateforme, badge SIRET et avis, contenus, usage des coordonnées, tarifs/essai/résiliation, responsabilité, droit applicable |
| **Confidentialité** | `/confidentialite` : données, bases légales, destinataires, transferts, cookies, durées, droits, sécurité |
| **Consentement** | case à cocher à l'inscription ; **date et version** des CGU enregistrées (`cguAccepteesLe`, `cguVersion`) |
| **Nouvelle version des CGU** | changez `VERSION_CGU` dans `src/lib/legal.ts` : à sa prochaine visite, chaque utilisateur doit accepter (page `/accepter-cgu`) |
| **Droits RGPD** | `Mon compte` : export complet des données (JSON), suppression (anonymisation), désactivation des alertes |
| **Durées de conservation** | purge automatique : journal de sécurité > 12 mois, jetons d'e-mail expirés (`src/lib/purge.ts`, quotidienne) |
| **E-mails** | e-mails d'alerte : expéditeur identifié, lien de désactivation, en-tête `List-Unsubscribe` |
| **Cookies** | uniquement 3 cookies strictement nécessaires (session, anti-falsification, page de retour) → pas de bandeau requis ; aucun traceur |
| **Badge « SIRET vérifié »** | uniquement après vérification officielle ; **non attribuable à la main** (l'admin peut seulement le retirer) |
| **Facturation** | préavis de 30 jours respecté : accès gratuit jusqu'à `FACTURATION_A_PARTIR_DU`, bandeau d'annonce, puis 30 jours d'essai sans carte |
| **Modération** | bouton « Signaler », suspension de comptes, journal d'audit |

## 2. Ce que vous devez fournir (variables d'environnement Render)

Tant que ces champs sont vides, les pages affichent « [à compléter : …] ».

| Variable | Contenu | Exemple |
|---|---|---|
| `EDITEUR_NOM` | Nom ou raison sociale | `Ashot Mnatsakanian (EI)` / `Entre Transporteurs SAS` |
| `EDITEUR_FORME` | Forme juridique (facultatif) | `Entrepreneur individuel` / `SAS au capital de 1 000 €` |
| `EDITEUR_ADRESSE` | Adresse postale (siège ou domiciliation) | `12 rue Exemple, 75001 Paris` |
| `EDITEUR_SIRET` | SIRET | `123 456 789 00012` |
| `EDITEUR_RCS` | Immatriculation (facultatif) | `RCS Paris 123 456 789` |
| `EDITEUR_TVA` | N° de TVA ou mention de franchise (facultatif) | `FR12123456789` / `TVA non applicable, art. 293 B du CGI` |
| `EDITEUR_TELEPHONE` | Téléphone (facultatif) | `01 23 45 67 89` |
| `EDITEUR_DIRECTEUR` | Directeur de la publication (une personne physique) | `Ashot Mnatsakanian` |
| `EMAIL_CONTACT` | Adresse de contact (surveillée !) | `contact@votre-domaine.fr` |

Selon votre situation :
- **Pas encore d'entreprise** : créez-la d'abord (micro-entreprise : gratuit, en ligne sur [formalites.entreprises.gouv.fr](https://formalites.entreprises.gouv.fr)). Un service qui encaisse des abonnements, ou qui fait de la publicité, est une activité professionnelle : les mentions complètes (nom, adresse, SIRET) sont obligatoires. Une adresse de domiciliation évite de publier votre domicile.
- **Micro-entrepreneur en franchise de TVA** : indiquez `TVA non applicable, art. 293 B du CGI` dans `EDITEUR_TVA`, et gardez à l'esprit que le « 69 € TTC » affiché signifie alors « 69 €, sans TVA » (le prix reste le même).
- **Société assujettie à la TVA** : indiquez le n° de TVA intracommunautaire ; 69 € TTC = 57,50 € HT.

## 3. Démarches hors code (checklist)

- [ ] Créer l'entreprise (ou confirmer le statut) et obtenir le SIRET
- [ ] Renseigner les variables ci-dessus, vérifier les 3 pages légales
- [ ] **Faire relire les CGU** par un juriste (clauses de responsabilité, juridiction, tarifs)
- [ ] Mentionner la bonne adresse e-mail de contact et **la lire régulièrement** (demandes RGPD : réponse sous 1 mois ; signalements : retrait rapide)
- [ ] Accepter les accords de traitement des données (DPA) de vos sous-traitants, dans leurs paramètres juridiques : Render, Supabase, Resend, Stripe (en ligne, quelques clics)
- [ ] Hébergeur : la LCEN demande normalement son nom, adresse **et téléphone**. Render ne publie pas de numéro : à valider avec votre juriste, ou choisir un hébergeur européen (Scaleway, OVHcloud) en remplissant `HEBERGEUR`
- [ ] Stripe (au moment de faire payer) : renseigner l'URL des CGU, l'adresse de l'entreprise, activer le portail client et configurer des factures conformes (nom, adresse, SIRET, TVA)
- [ ] Vérifier la disponibilité du nom « Entre Transporteurs » (INPI, base marques) et du nom de domaine ; envisager un dépôt de marque
- [ ] Souscrire une assurance responsabilité civile professionnelle (recommandé)
- [ ] Pas de déclaration CNIL à faire (supprimée depuis 2018) : **tenez en revanche le registre ci-dessous à jour**
- [ ] Prévenir les commissionnaires **au moins 30 jours avant** de fixer `FACTURATION_A_PARTIR_DU` (annonce e-mail + bandeau automatique)

## 4. Registre des activités de traitement (RGPD, article 30)

À conserver et mettre à jour (un fichier ou ce document suffit).

| # | Traitement | Finalité | Données | Personnes | Base légale | Destinataires | Durée |
|---|---|---|---|---|---|---|---|
| 1 | Gestion des comptes | Créer et sécuriser l'accès | nom, e-mail, téléphone, mot de passe haché, rôle, version des CGU | utilisateurs | contrat | Render, Supabase | durée du compte |
| 2 | Profils et annonces | Mise en relation | raison sociale, SIRET, description, ville, véhicules, disponibilités, besoins, alertes | utilisateurs | contrat | autres utilisateurs (selon rôle), Supabase | durée du compte |
| 3 | Messagerie et avis | Échanges et confiance | messages, notes | utilisateurs | contrat | interlocuteur | durée du compte (anonymisés après suppression) |
| 4 | E-mails de service et alertes | Confirmation, sécurité, alertes | e-mail, nom, critères d'alerte | utilisateurs | contrat (alertes désactivables) | Resend | durée du compte |
| 5 | Sécurité et audit | Prévention des abus, preuve | IP, dates et résultats de connexion, actions admin, signalements | utilisateurs, visiteurs | intérêt légitime | administrateurs | 12 mois |
| 6 | Facturation (si activée) | Abonnements | identifiant client, statut, dates | commissionnaires | contrat, obligation légale | Stripe | 10 ans |
| 7 | Vérification d'entreprise | Badge « SIRET vérifié » | numéro SIRET | utilisateurs | contrat | API publique de l'État | durée du compte |

Sous-traitants : Render (hébergement, Francfort), Supabase (base de données, UE), Resend (e-mails), Stripe (paiement). Mesures de sécurité : voir `SECURITE.md`.

## 5. Procédures

**Demande d'accès / effacement / portabilité** — l'utilisateur peut tout faire seul depuis « Mon compte ». Pour une demande par e-mail : vérifier l'identité (répondre depuis l'adresse du compte), répondre **sous 1 mois**, tracer la demande et la réponse.

**Violation de données** (fuite, accès non autorisé) — dans les **72 h** après en avoir eu connaissance : notifier la CNIL sur notifications.cnil.fr si le risque pour les personnes est non négligeable ; informer les personnes concernées si le risque est élevé ; tout consigner (nature, données, mesures). Actions techniques : voir « Procédures » dans `SECURITE.md` (suspendre, changer `NEXTAUTH_SECRET`, consulter `/admin/journal`).

**Contenu illicite signalé** — examiner rapidement ; retirer ce qui est manifestement illicite ; conserver une trace de la décision. Les signalements arrivent dans `/admin/signalements` ou à l'adresse de contact.

**Réquisition d'une autorité** — ne communiquer des données que sur demande écrite et régulière (police, justice) ; en cas de doute, demander conseil à votre juriste.

**Modification des CGU ou de la confidentialité** — modifier le texte, puis changer `VERSION_CGU` et `MISE_A_JOUR_LEGALE` dans `src/lib/legal.ts` ; chaque utilisateur sera invité à accepter la nouvelle version. Toute hausse de prix : préavis de 30 jours.

## 6. Limites à connaître

- Aucune donnée n'est chiffrée de bout en bout : l'éditeur a techniquement accès à la base. La politique de confidentialité le dit.
- La purge automatique s'exécute dans l'application (une instance) : si vous passez à plusieurs instances, planifiez-la une seule fois (tâche planifiée).
- Les comptes inactifs ne sont pas supprimés automatiquement : à décider (la CNIL suggère de définir une durée, par exemple 3 ans d'inactivité) puis à annoncer dans la politique de confidentialité.
