import type { Metadata } from 'next'
import Link from 'next/link'
import { EDITEUR, MISE_A_JOUR_LEGALE } from '@/lib/legal'
import { Liste, Section, Titre } from '@/components/ui/TexteLegal'

export const metadata: Metadata = { title: "Conditions générales d'utilisation — Entre Transporteurs" }

export default function CguPage() {
  return (
    <>
      <Titre maj={MISE_A_JOUR_LEGALE}>Conditions générales d'utilisation</Titre>

      <Section titre="1. Objet et définitions">
        <p>
          Les présentes conditions (« CGU ») régissent l'utilisation de la plateforme <strong>Entre Transporteurs</strong> (la « Plateforme »),
          éditée par {EDITEUR.nom} (l'« Éditeur »). Elles s'appliquent à toute personne qui crée un compte ou utilise la Plateforme
          (l'« Utilisateur »).
        </p>
        <Liste elements={[
          <><strong>Transporteur</strong> : professionnel du transport routier de marchandises qui propose ses véhicules.</>,
          <><strong>Commissionnaire</strong> : commissionnaire de transport, affréteur ou entreprise qui cherche un transporteur.</>,
          <><strong>Disponibilité</strong> : annonce par laquelle un Transporteur signale un véhicule libre (lieu, dates, véhicule).</>,
          <><strong>Besoin de transport</strong> : annonce par laquelle un Commissionnaire signale un fret à transporter.</>,
          <><strong>Contenu</strong> : toute information publiée sur la Plateforme (profil, flotte, disponibilités, besoins, messages, avis).</>,
        ]} />
      </Section>

      <Section titre="2. Acceptation et évolution des CGU">
        <p>
          L'inscription suppose l'acceptation pleine et entière des CGU et de la <Link href="/confidentialite" className="text-brand-600 underline">politique de confidentialité</Link> (case à cocher).
          La date et la version acceptées sont conservées.
        </p>
        <p>
          L'Éditeur peut modifier les CGU. En cas de modification substantielle, chaque Utilisateur est invité à accepter la nouvelle version à sa
          prochaine connexion ; s'il refuse, il peut supprimer son compte à tout moment. Toute hausse de tarif est notifiée au moins
          30 jours à l'avance (article 10).
        </p>
      </Section>

      <Section titre="3. Accès au service et compte">
        <Liste elements={[
          'Le service est réservé aux professionnels, majeurs et agissant pour les besoins de leur activité : aucun consommateur n\'est visé.',
          'L\'inscription est gratuite et suppose de fournir des informations exactes et à jour, une adresse e-mail valide (à confirmer) et, dans votre profil, le numéro SIRET de votre entreprise.',
          'Chaque compte est personnel et rattaché à une entreprise. Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité réalisée depuis votre compte ; signalez immédiatement toute utilisation non autorisée.',
          'Un Transporteur déclare disposer des autorisations nécessaires à son activité (inscription au registre des transporteurs, licence ou capacité, assurances). Un Commissionnaire déclare être régulièrement inscrit lorsque son activité l\'exige.',
        ]} />
      </Section>

      <Section titre="4. Description du service">
        <Liste elements={[
          'Transporteurs : création d\'un profil et d\'une flotte, publication de Disponibilités, consultation des Besoins de transport proches, alertes e-mail, messagerie.',
          'Commissionnaires : recherche de Transporteurs (liste et carte), publication de Besoins de transport, alertes e-mail, messagerie, avis.',
          'La messagerie ne permet d\'échanger qu\'entre un Transporteur et un Commissionnaire.',
          'Les fonctionnalités peuvent évoluer. L\'Éditeur s\'efforce d\'assurer la disponibilité du service sans pouvoir la garantir de façon continue.',
        ]} />
      </Section>

      <Section titre="5. Rôle de l'Éditeur">
        <p>
          L'Éditeur fournit un outil de mise en relation. Il n'est ni transporteur, ni commissionnaire, ni mandataire des Utilisateurs, et
          n'intervient pas dans la négociation, la conclusion, l'exécution ni le paiement des contrats de transport, qui relèvent de la seule
          responsabilité des parties (prix, délais, assurance, documents de transport, réglementation applicable).
          L'Éditeur ne garantit ni la disponibilité effective d'un véhicule, ni la solvabilité ou la fiabilité d'un Utilisateur, ni la qualité du transport.
        </p>
      </Section>

      <Section titre="6. Badge « SIRET vérifié » et avis">
        <p>
          Le badge « SIRET vérifié » indique uniquement que le numéro SIRET renseigné correspond, au moment de la vérification, à un établissement
          existant et en activité dans le répertoire officiel de l'État. Il ne constitue ni une certification, ni une garantie relative aux
          autorisations de transport, aux assurances ou au sérieux de l'entreprise : il appartient à chacun de procéder à ses propres vérifications.
          Le badge ne peut pas être accordé manuellement ; l'Éditeur peut le retirer.
        </p>
        <p>
          Seul un Commissionnaire ayant échangé avec un Transporteur (messages dans les deux sens) peut le noter. Les avis doivent refléter une expérience
          réelle, rester courtois et exempts de propos diffamatoires ou injurieux. L'Éditeur ne modifie pas le contenu d'un avis mais peut le supprimer
          s'il enfreint les présentes CGU ou la loi.
        </p>
      </Section>

      <Section titre="7. Contenus publiés">
        <Liste elements={[
          'Vous restez propriétaire de vos Contenus et garantissez disposer des droits nécessaires pour les publier et qu\'ils sont exacts.',
          'Vous accordez à l\'Éditeur une licence non exclusive, gratuite et mondiale, limitée à la durée de votre compte, pour héberger, afficher et transmettre ces Contenus aux autres Utilisateurs dans le cadre du service.',
          'Une Disponibilité ou un Besoin de transport doit correspondre à une offre ou une demande réelle ; il doit être retiré ou mis à jour lorsqu\'il n\'est plus d\'actualité.',
          'L\'Éditeur peut retirer tout Contenu contraire aux CGU ou à la loi, notamment après signalement.',
        ]} />
      </Section>

      <Section titre="8. Utilisation des coordonnées et des messages">
        <p>
          Le téléphone d'un Transporteur et les messages échangés ne peuvent être utilisés que pour répondre à une offre ou une demande de transport.
          Il est interdit de les revendre, de les céder, de les utiliser pour de la prospection sans rapport avec le transport ou de les extraire
          massivement. Chaque Utilisateur qui reçoit des données personnelles d'un autre Utilisateur en devient responsable de traitement pour l'usage qu'il en fait
          et doit respecter le RGPD.
        </p>
      </Section>

      <Section titre="9. Engagements des utilisateurs">
        <p>Il est interdit de :</p>
        <Liste elements={[
          'publier des informations fausses, trompeuses ou usurper l\'identité ou la raison sociale d\'un tiers ;',
          'utiliser le service à des fins de spam, de démarchage abusif, d\'arnaque ou de collecte massive de données (scraping, robots) ;',
          'contourner les mécanismes de sécurité, les limitations d\'accès ou la facturation, ou créer plusieurs comptes pour échapper à une suspension ;',
          'transmettre des contenus illicites, injurieux, discriminatoires ou portant atteinte aux droits de tiers ;',
          'tenter d\'accéder à des comptes, des données ou des parties du système auxquels vous n\'avez pas droit, ou perturber le fonctionnement de la Plateforme.',
        ]} />
      </Section>

      <Section titre="10. Tarifs, essai et paiement">
        <Liste elements={[
          'Transporteurs : l\'inscription, la publication de Disponibilités, la consultation des Besoins de transport et la messagerie sont gratuites.',
          'Commissionnaires : l\'accès est gratuit pendant la période de lancement. Il pourra ensuite être soumis à un abonnement de 69 € TTC par mois. L\'Éditeur informe les Commissionnaires, par bandeau dans l\'application et par e-mail, au moins 30 jours avant l\'entrée en vigueur de la facturation ; l\'accès reste gratuit jusqu\'à cette date.',
          'À l\'entrée en vigueur de la facturation, chaque Commissionnaire bénéficie de 30 jours d\'essai gratuit, sans saisie de carte bancaire. Aucun prélèvement n\'a lieu sans souscription expresse de sa part.',
          'Le paiement est traité par Stripe ; l\'abonnement est mensuel et reconduit tacitement. Il est résiliable à tout moment depuis l\'espace de gestion, avec effet à la fin de la période en cours ; la période entamée n\'est pas remboursée.',
          'Toute modification de prix est notifiée au moins 30 jours à l\'avance et ne s\'applique qu\'aux périodes de facturation suivantes. En cas d\'impayé, l\'accès commissionnaire peut être suspendu jusqu\'à régularisation.',
        ]} />
      </Section>

      <Section titre="11. Modération, suspension et résiliation">
        <p>
          L'Éditeur peut suspendre ou supprimer un compte ou un contenu contraire aux CGU ou à la loi, sans préavis en cas de manquement grave
          (fraude, usurpation, menaces, atteinte à la sécurité). Vous pouvez supprimer votre compte à tout moment depuis la page « Mon compte » :
          vos données sont alors effacées ou anonymisées dans les conditions décrites dans la politique de confidentialité, et votre abonnement éventuel est résilié.
        </p>
      </Section>

      <Section titre="12. Propriété intellectuelle">
        <p>
          La Plateforme (code, base de données, marques, textes, éléments graphiques) est protégée et reste la propriété de l'Éditeur. Il vous est concédé un
          droit d'usage personnel, non exclusif et non cessible, limité à la durée de votre compte.
        </p>
      </Section>

      <Section titre="13. Responsabilité">
        <p>
          Le service est fourni « en l'état ». L'Éditeur ne saurait être tenu responsable des dommages indirects (perte d'exploitation, de clientèle, de fret, de marge)
          liés à l'utilisation du service, du contenu publié par les Utilisateurs, de l'inexécution d'un contrat conclu entre Utilisateurs, ni des interruptions
          dues à un cas de force majeure ou à un tiers (hébergeur, réseau). Sous réserve de la faute lourde ou dolosive et des dommages corporels, la responsabilité de
          l'Éditeur est limitée aux sommes effectivement versées par l'Utilisateur concerné au cours des 12 derniers mois.
        </p>
      </Section>

      <Section titre="14. Données personnelles">
        <p>
          Le traitement de vos données, vos droits et l'utilisation des cookies sont décrits dans la{' '}
          <Link href="/confidentialite" className="text-brand-600 underline">politique de confidentialité</Link>.
          Vous recevez des e-mails de service (confirmation, sécurité) et, tant que vous ne les désactivez pas dans « Mon compte », des alertes sur les annonces qui vous concernent.
        </p>
      </Section>

      <Section titre="15. Droit applicable et litiges">
        <p>
          Les présentes CGU sont soumises au droit français. Les Utilisateurs étant des professionnels, à défaut de résolution amiable, tout litige relève des tribunaux
          compétents du ressort du siège de l'Éditeur. Pour toute question ou réclamation : {EDITEUR.email}.
        </p>
      </Section>
    </>
  )
}
