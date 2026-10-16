import type { Metadata } from 'next'
import Link from 'next/link'
import { EDITEUR, MISE_A_JOUR_LEGALE } from '@/lib/legal'
import { Liste, Section, Titre } from '@/components/ui/TexteLegal'

export const metadata: Metadata = { title: 'Politique de confidentialité — Entre Transporteurs' }

export default function ConfidentialitePage() {
  return (
    <>
      <Titre maj={MISE_A_JOUR_LEGALE}>Politique de confidentialité</Titre>

      <Section titre="Responsable du traitement">
        <p>
          {EDITEUR.nom} — {EDITEUR.adresse} — contact pour toute question relative aux données personnelles : {EDITEUR.email}.
          Le service s'adresse à des professionnels ; les données des personnes physiques qui les représentent (dirigeants, salariés, entrepreneurs
          individuels) sont des données personnelles protégées par le RGPD.
        </p>
      </Section>

      <Section titre="Données collectées, finalités et bases légales">
        <Liste elements={[
          <><strong>Compte</strong> : nom, adresse e-mail, téléphone (facultatif), mot de passe (conservé sous forme chiffrée irréversible, jamais en clair), rôle, date et version des conditions acceptées. Finalité : créer, sécuriser et gérer votre compte. Base légale : exécution du contrat.</>,
          <><strong>Profil professionnel</strong> : raison sociale, SIRET, description, ville de base (et ses coordonnées géographiques), zones, véhicules (type, dimensions, charge, immatriculation), disponibilités, besoins de transport, alertes. Finalité : mise en relation. Base légale : exécution du contrat. Le SIRET est vérifié auprès du répertoire officiel « Recherche d'entreprises » de l'État.</>,
          <><strong>Messages et avis</strong> : contenu de vos échanges et notes. Finalité : fonctionnement de la messagerie et de la confiance entre utilisateurs. Base légale : exécution du contrat.</>,
          <><strong>E-mails de service et alertes</strong> : confirmation d'adresse, réinitialisation du mot de passe (base légale : contrat), alertes sur les annonces correspondant à vos critères (base légale : exécution du contrat ; désactivables à tout moment dans « Mon compte »).</>,
          <><strong>Données techniques de sécurité</strong> : adresse IP, date et résultat des connexions, signalements, actions d'administration. Finalité : sécurité du service, prévention de la fraude et des abus. Base légale : intérêt légitime.</>,
          <><strong>Facturation</strong> (lorsque les paiements sont activés) : identifiant client, statut et dates d'abonnement ; les données de carte sont saisies chez Stripe, nous ne les recevons ni ne les conservons. Base légale : contrat et obligation légale (comptabilité).</>,
        ]} />
        <p>
          Les données sont fournies directement par vous, sauf les informations publiques du répertoire des entreprises (existence et activité de l'établissement).
          Nous ne vendons aucune donnée, ne faisons aucun profilage publicitaire et ne prenons aucune décision automatisée produisant des effets juridiques à votre égard.
        </p>
      </Section>

      <Section titre="Qui voit quoi ?">
        <Liste elements={[
          'Les Commissionnaires disposant d\'un accès actif voient les profils, disponibilités et la carte des Transporteurs, ainsi que leur numéro de téléphone s\'il est renseigné.',
          'Les Transporteurs voient les Besoins de transport publiés (raison sociale du Commissionnaire, trajet, date) mais pas les autres Transporteurs.',
          'Votre adresse e-mail n\'est jamais affichée aux autres utilisateurs. Les messages ne sont visibles que des deux participants à la conversation.',
          'Les visiteurs non connectés voient seulement un aperçu anonyme de quelques disponibilités (trajet, date, type de véhicule), sans nom ni coordonnées.',
          'Les administrateurs de la plateforme consultent les comptes et les signalements pour modérer le service ; l\'espace d\'administration ne donne pas accès au contenu de vos messages.',
        ]} />
        <p>
          Un utilisateur qui reçoit des données d'un autre utilisateur (par exemple un numéro de téléphone) les utilise sous sa propre responsabilité et
          uniquement pour les besoins du transport (voir les <Link href="/cgu" className="text-brand-600 underline">conditions d'utilisation</Link>).
        </p>
      </Section>

      <Section titre="Destinataires et sous-traitants">
        <Liste elements={[
          'Hébergement de l\'application et de la base de données : voir les mentions légales.',
          'Envoi des e-mails (confirmation, réinitialisation, alertes) : Resend.',
          'Paiement (lorsqu\'il est activé) : Stripe, qui agit pour les données de paiement en qualité de responsable de traitement indépendant.',
          'Vérification du SIRET : seul le numéro SIRET est transmis, depuis nos serveurs, à l\'API publique de l\'État.',
          'Recherche de communes : lorsque vous saisissez une ville, votre navigateur interroge directement api-adresse.data.gouv.fr (service public).',
          'Cartographie : votre navigateur télécharge directement les tuiles OpenStreetMap ; votre adresse IP leur est donc visible.',
        ]} />
        <p>
          Certains prestataires (hébergeur, e-mail, paiement) sont établis hors de l'Union européenne, notamment aux États-Unis. Les transferts sont encadrés par
          les garanties prévues au chapitre V du RGPD : clauses contractuelles types de la Commission européenne ou décision d'adéquation (cadre de protection des données UE–États-Unis).
        </p>
      </Section>

      <Section titre="Cookies et traceurs">
        <p>
          Le site n'utilise que des cookies strictement nécessaires à son fonctionnement, exemptés de consentement :
        </p>
        <Liste elements={[
          <><strong>cookie de session</strong> (nom commençant par <code>next-auth</code> et se terminant par <code>session-token</code>) : vous maintient connecté, 7 jours au plus, inaccessible au JavaScript ;</>,
          <><strong>cookie de protection contre la falsification de formulaires</strong> (<code>csrf-token</code>) : durée de la session de navigation ;</>,
          <><strong>cookie de page de retour</strong> (<code>callback-url</code>) : mémorise la page à afficher après la connexion, durée de la session de navigation.</>,
        ]} />
        <p>
          Aucun cookie de mesure d'audience, de publicité ou de réseau social n'est déposé, et aucune donnée n'est stockée dans votre navigateur au-delà de ces cookies : aucun bandeau de consentement n'est donc requis.
        </p>
      </Section>

      <Section titre="Durées de conservation">
        <Liste elements={[
          'Compte, profil et contenus : tant que le compte existe ; effacés ou anonymisés à sa suppression.',
          'Journaux de sécurité (connexions, tentatives, actions d\'administration) : 12 mois, puis supprimés automatiquement.',
          'Liens de confirmation d\'e-mail et de réinitialisation : 24 heures et 1 heure au plus ; les jetons expirés sont purgés automatiquement.',
          'Données de facturation : 10 ans (obligation comptable), chez le prestataire de paiement.',
          'Messages : après la suppression d\'un compte, les messages échangés restent visibles de l\'interlocuteur sous le nom « Compte supprimé », sans lien avec votre identité, car il en a besoin comme preuve de ses échanges commerciaux.',
          'Sauvegardes : les copies techniques de l\'hébergeur peuvent contenir des données supprimées jusqu\'à leur rotation.',
        ]} />
      </Section>

      <Section titre="Vos droits">
        <p>
          Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité, ainsi que du droit de définir
          des directives sur le sort de vos données après votre décès. Depuis la page{' '}
          <Link href="/compte" className="text-brand-600 underline">Mon compte</Link>, vous pouvez à tout moment <strong>télécharger toutes vos données</strong>,{' '}
          <strong>désactiver les alertes e-mail</strong> et <strong>supprimer votre compte</strong> ; votre profil se modifie depuis votre espace.
          Pour toute autre demande : {EDITEUR.email}. Nous répondons dans un délai d'un mois. Une justification d'identité peut être demandée en cas de doute.
        </p>
        <p>
          Vous pouvez enfin introduire une réclamation auprès de la CNIL (cnil.fr, 3 place de Fontenoy, 75007 Paris).
        </p>
      </Section>

      <Section titre="Sécurité">
        <p>
          Connexion chiffrée (HTTPS), mots de passe chiffrés de façon irréversible, limitation des tentatives de connexion, sessions révoquées lors d'un
          changement de mot de passe, journal d'audit, accès aux données restreint par rôle. Les messages ne sont pas chiffrés de bout en bout.
          En cas de violation de données susceptible d'engendrer un risque pour vos droits, nous en informerons la CNIL dans les 72 heures et vous-même dans les meilleurs délais lorsque le risque est élevé.
        </p>
      </Section>

      <Section titre="Public concerné et modifications">
        <p>
          Le service est réservé aux professionnels majeurs. Cette politique peut évoluer ; toute modification substantielle vous est signalée et peut
          nécessiter une nouvelle acceptation à votre prochaine connexion.
        </p>
      </Section>
    </>
  )
}
