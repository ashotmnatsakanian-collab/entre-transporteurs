import type { Metadata } from 'next'
import { EDITEUR, MISE_A_JOUR_LEGALE } from '@/lib/legal'
import { Liste, Section, Titre } from '@/components/ui/TexteLegal'

export const metadata: Metadata = { title: "Conditions générales d'utilisation — Entre Transporteurs" }

export default function CguPage() {
  return (
    <>
      <Titre maj={MISE_A_JOUR_LEGALE}>Conditions générales d'utilisation</Titre>

      <Section titre="1. Objet">
        <p>
          Les présentes conditions régissent l'utilisation de la plateforme Entre Transporteurs, éditée par {EDITEUR.nom} (« l'Éditeur »),
          qui permet aux transporteurs de signaler leurs disponibilités et aux commissionnaires et entreprises de les trouver, ainsi que
          de publier des besoins de transport.
        </p>
      </Section>

      <Section titre="2. Accès au service">
        <Liste elements={[
          'Le service est réservé aux professionnels (relation entre entreprises) : aucun consommateur n\'est visé.',
          'L\'inscription est gratuite et suppose de fournir des informations exactes, un e-mail valide et d\'accepter les présentes conditions.',
          'Chaque compte est personnel. Vous êtes responsable de la confidentialité de votre mot de passe et de l\'activité de votre compte.',
          'Un utilisateur transporteur déclare disposer des autorisations réglementaires nécessaires à son activité (inscription au registre des transporteurs, licence, assurances).',
        ]} />
      </Section>

      <Section titre="3. Rôle de l'Éditeur">
        <p>
          L'Éditeur fournit un outil de mise en relation. Il n'est ni transporteur, ni commissionnaire, ni mandataire des utilisateurs, et
          n'intervient pas dans la négociation, la conclusion ni l'exécution des contrats de transport, qui relèvent de la seule
          responsabilité des parties. L'Éditeur ne garantit ni la disponibilité effective d'un véhicule, ni la solvabilité ou la fiabilité
          d'un utilisateur, ni la qualité du transport.
        </p>
      </Section>

      <Section titre="4. Badge « SIRET vérifié » et avis">
        <p>
          Le badge « SIRET vérifié » indique que le numéro SIRET renseigné correspond à un établissement existant et en activité dans le
          répertoire officiel de l'État. Il ne constitue ni une certification, ni une garantie relative aux autorisations de transport, aux
          assurances ou au sérieux de l'entreprise : il appartient à chacun de procéder à ses propres vérifications.
        </p>
        <p>
          Seul un commissionnaire ayant échangé avec un transporteur peut le noter. Les avis doivent refléter une expérience réelle,
          rester courtois et exempts de propos diffamatoires ou injurieux. L'Éditeur peut supprimer tout avis contraire à ces règles.
        </p>
      </Section>

      <Section titre="5. Engagements des utilisateurs">
        <p>Il est interdit de :</p>
        <Liste elements={[
          'publier des informations fausses, trompeuses ou usurper l\'identité ou la raison sociale d\'un tiers ;',
          'utiliser le service à des fins de spam, de démarchage abusif, d\'arnaque ou de collecte massive de données (scraping) ;',
          'contourner les mécanismes de sécurité, les limitations d\'accès ou la facturation ;',
          'transmettre des contenus illicites, injurieux, discriminatoires ou portant atteinte aux droits de tiers ;',
          'tenter d\'accéder à des comptes, des données ou des parties du système auxquels vous n\'avez pas droit.',
        ]} />
      </Section>

      <Section titre="6. Tarifs">
        <Liste elements={[
          'Transporteurs : l\'inscription, la publication de disponibilités et la messagerie sont gratuites.',
          'Commissionnaires : l\'accès est gratuit pendant la période de lancement. Un abonnement de 69 € TTC par mois (essai gratuit de 30 jours) pourra ensuite être appliqué ; les utilisateurs concernés seront prévenus au moins 30 jours avant toute facturation, et aucun prélèvement n\'aura lieu sans leur accord.',
          'Lorsque les paiements sont activés, ils sont traités par Stripe. L\'abonnement est résiliable à tout moment depuis l\'espace de gestion, avec effet à la fin de la période en cours.',
        ]} />
      </Section>

      <Section titre="7. Modération, suspension et résiliation">
        <p>
          L'Éditeur peut suspendre ou supprimer, sans préavis en cas de manquement grave, un compte ou un contenu contraire aux présentes
          conditions ou à la loi. Vous pouvez supprimer votre compte à tout moment depuis la page « Mon compte ».
        </p>
      </Section>

      <Section titre="8. Disponibilité et responsabilité">
        <p>
          Le service est fourni « en l'état », sans garantie d'accès continu. L'Éditeur ne saurait être tenu responsable des dommages
          indirects (perte d'exploitation, de clientèle, de fret) liés à l'utilisation du service, ni du contenu publié par les utilisateurs,
          sauf faute lourde ou dolosive de sa part. Sa responsabilité est, à défaut, limitée aux sommes effectivement versées par
          l'utilisateur au cours des 12 derniers mois.
        </p>
      </Section>

      <Section titre="9. Données personnelles">
        <p>Voir la <a href="/confidentialite" className="text-brand-600 underline">politique de confidentialité</a>.</p>
      </Section>

      <Section titre="10. Modification des conditions">
        <p>L'Éditeur peut faire évoluer les présentes conditions ; les utilisateurs sont informés de toute modification substantielle.</p>
      </Section>

      <Section titre="11. Droit applicable">
        <p>
          Les présentes conditions sont soumises au droit français. À défaut de résolution amiable, tout litige relève des tribunaux
          compétents du ressort du siège de l'Éditeur. Contact : {EDITEUR.email}.
        </p>
      </Section>
    </>
  )
}
