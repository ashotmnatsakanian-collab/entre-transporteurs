import type { Metadata } from 'next'
import { EDITEUR, MISE_A_JOUR_LEGALE } from '@/lib/legal'
import { Section, Titre } from '@/components/ui/TexteLegal'

export const metadata: Metadata = { title: 'Mentions légales — Entre Transporteurs' }

export default function MentionsLegalesPage() {
  return (
    <>
      <Titre maj={MISE_A_JOUR_LEGALE}>Mentions légales</Titre>

      <Section titre="Éditeur du site">
        <p>
          <strong>{EDITEUR.nom}</strong>{EDITEUR.forme && ` — ${EDITEUR.forme}`}<br />
          Adresse : {EDITEUR.adresse}<br />
          SIRET : {EDITEUR.siret}<br />
          Contact : {EDITEUR.email}
        </p>
        <p>Directeur de la publication : {EDITEUR.directeur}</p>
      </Section>

      <Section titre="Hébergement">
        <p>Application : {EDITEUR.hebergeur}</p>
        <p>Base de données : {EDITEUR.baseDeDonnees}</p>
      </Section>

      <Section titre="Nature du service">
        <p>
          Entre Transporteurs est une plateforme de mise en relation entre professionnels du transport routier de marchandises
          (transporteurs) et professionnels de l'organisation de transport (commissionnaires, entreprises). L'éditeur n'est ni transporteur,
          ni commissionnaire de transport, et n'est pas partie aux contrats conclus entre les utilisateurs.
        </p>
      </Section>

      <Section titre="Propriété intellectuelle">
        <p>
          La structure, le code, les textes et les éléments graphiques du site sont protégés par le droit de la propriété intellectuelle.
          Toute reproduction non autorisée est interdite. Les données de cartographie proviennent d'OpenStreetMap
          (© contributeurs OpenStreetMap, licence ODbL) ; la recherche de communes et la vérification des entreprises utilisent des API
          publiques de l'État (api-adresse.data.gouv.fr, recherche-entreprises.api.gouv.fr).
        </p>
      </Section>

      <Section titre="Signaler un contenu illicite">
        <p>
          Conformément à la loi pour la confiance dans l'économie numérique (LCEN), tout contenu manifestement illicite peut être signalé
          via le bouton « Signaler » présent sur les profils et les conversations, ou par e-mail à {EDITEUR.email}.
        </p>
      </Section>

      <Section titre="Données personnelles">
        <p>Le traitement de vos données est décrit dans la <a href="/confidentialite" className="text-brand-600 underline">politique de confidentialité</a>.</p>
      </Section>
    </>
  )
}
