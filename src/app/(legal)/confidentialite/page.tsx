import type { Metadata } from 'next'
import { EDITEUR, MISE_A_JOUR_LEGALE } from '@/lib/legal'
import { Liste, Section, Titre } from '@/components/ui/TexteLegal'

export const metadata: Metadata = { title: 'Politique de confidentialité — Entre Transporteurs' }

export default function ConfidentialitePage() {
  return (
    <>
      <Titre maj={MISE_A_JOUR_LEGALE}>Politique de confidentialité</Titre>

      <Section titre="Responsable du traitement">
        <p>{EDITEUR.nom} — {EDITEUR.adresse} — contact : {EDITEUR.email}</p>
      </Section>

      <Section titre="Données collectées et finalités">
        <Liste elements={[
          <><strong>Compte</strong> : nom, e-mail, téléphone (facultatif), mot de passe (stocké chiffré, jamais en clair), rôle. Finalité : créer et sécuriser votre compte (exécution du contrat).</>,
          <><strong>Profil professionnel</strong> : raison sociale, SIRET, description, ville de base, véhicules, disponibilités, besoins de transport. Finalité : mise en relation (exécution du contrat). Le SIRET est vérifié auprès de l'API publique « Recherche d'entreprises ».</>,
          <><strong>Messages et avis</strong> : contenu de vos échanges et notes. Finalité : fonctionnement de la messagerie et de la confiance entre utilisateurs.</>,
          <><strong>Données techniques de sécurité</strong> : adresse IP, date et résultat des connexions, signalements. Finalité : sécurité du service, prévention de la fraude et des abus (intérêt légitime).</>,
          <><strong>Facturation</strong> (si les paiements sont activés) : gérée par Stripe ; nous ne conservons jamais votre numéro de carte.</>,
        ]} />
        <p>Nous ne vendons aucune donnée et n'utilisons aucun traceur publicitaire.</p>
      </Section>

      <Section titre="Qui voit quoi ?">
        <p>
          Votre numéro de téléphone n'est visible que des commissionnaires disposant d'un accès actif. Votre adresse e-mail n'est jamais
          affichée aux autres utilisateurs. Les messages ne sont visibles que des deux participants à la conversation.
        </p>
      </Section>

      <Section titre="Destinataires et sous-traitants">
        <Liste elements={[
          'Hébergement de l\'application et de la base de données : voir les mentions légales.',
          'Envoi des e-mails (confirmation, réinitialisation, alertes) : Resend.',
          'Paiement (si activé) : Stripe.',
          'Recherche de communes : lorsque vous saisissez une ville, votre navigateur interroge directement api-adresse.data.gouv.fr (service public).',
          'Cartographie : tuiles OpenStreetMap (votre navigateur les télécharge directement ; votre adresse IP leur est donc visible).',
        ]} />
        <p>Certains sous-traitants sont établis hors de l'Union européenne ; les transferts sont encadrés par des clauses contractuelles types ou le cadre de protection des données UE–États-Unis.</p>
      </Section>

      <Section titre="Durées de conservation">
        <Liste elements={[
          'Compte et contenus : tant que le compte est actif ; effacés ou anonymisés à sa suppression.',
          'Journaux de sécurité : 12 mois.',
          'Données de facturation : 10 ans (obligation comptable).',
          'Messages : après suppression d\'un compte, les messages restent visibles de l\'interlocuteur sous le nom « Compte supprimé » (la preuve des échanges commerciaux est nécessaire à l\'autre partie), sans lien avec votre identité.',
        ]} />
      </Section>

      <Section titre="Vos droits">
        <p>
          Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Depuis la page{' '}
          <a href="/compte" className="text-brand-600 underline">Mon compte</a>, vous pouvez à tout moment <strong>télécharger toutes vos données</strong> et{' '}
          <strong>supprimer votre compte</strong>. Pour toute autre demande : {EDITEUR.email}. Vous pouvez enfin introduire une réclamation auprès de la CNIL (cnil.fr).
        </p>
      </Section>

      <Section titre="Cookies">
        <p>
          Le site n'utilise qu'un cookie strictement nécessaire (la session de connexion, protégée et inaccessible au JavaScript). Aucun cookie de
          mesure d'audience ni de publicité n'étant déposé, aucun bandeau de consentement n'est requis.
        </p>
      </Section>

      <Section titre="Sécurité">
        <p>
          Connexion chiffrée (HTTPS), mots de passe chiffrés de façon irréversible, limitation des tentatives de connexion, sessions révoquées lors d'un
          changement de mot de passe, journal d'audit, accès aux données restreint par rôle. En cas de violation de données susceptible d'engendrer un risque
          pour vos droits, nous vous en informerons ainsi que la CNIL dans les délais légaux.
        </p>
      </Section>
    </>
  )
}
