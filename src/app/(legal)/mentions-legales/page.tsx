import type { Metadata } from 'next'
import Link from 'next/link'
import { EDITEUR, MISE_A_JOUR_LEGALE } from '@/lib/legal'
import { Section, Titre } from '@/components/ui/TexteLegal'

export const metadata: Metadata = { title: 'Mentions légales — Entre Transporteurs' }

export default function MentionsLegalesPage() {
  return (
    <>
      <Titre maj={MISE_A_JOUR_LEGALE}>Mentions légales</Titre>

      <Section titre="Éditeur du site">
        <p>
          Le site <strong>Entre Transporteurs</strong> est édité par :
        </p>
        <p>
          <strong>{EDITEUR.nom}</strong>{EDITEUR.forme && ` — ${EDITEUR.forme}`}<br />
          Adresse : {EDITEUR.adresse}<br />
          SIRET : {EDITEUR.siret}<br />
          {EDITEUR.rcs && <>Immatriculation : {EDITEUR.rcs}<br /></>}
          {EDITEUR.tva && <>TVA : {EDITEUR.tva}<br /></>}
          E-mail : {EDITEUR.email}
          {EDITEUR.telephone && <><br />Téléphone : {EDITEUR.telephone}</>}
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
        <p>
          Pour les contenus publiés par les utilisateurs (profils, disponibilités, besoins de transport, messages, avis), l'éditeur agit en
          qualité d'hébergeur au sens de l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN) :
          il ne contrôle pas ces contenus a priori, mais les retire promptement dès qu'il a connaissance de leur caractère manifestement illicite.
        </p>
      </Section>

      <Section titre="Signaler un contenu illicite">
        <p>
          Tout contenu ou comportement manifestement illicite peut être signalé via le bouton « Signaler » présent sur les profils et les
          conversations, ou par e-mail à {EDITEUR.email}. Pour être traité rapidement, le signalement indique : l'identité du déclarant,
          la description et l'adresse (URL) du contenu litigieux, ainsi que les motifs pour lesquels il doit être retiré (article 6-I-5 de la LCEN).
          Toute dénonciation abusive est susceptible d'engager la responsabilité de son auteur.
        </p>
      </Section>

      <Section titre="Propriété intellectuelle">
        <p>
          La structure, le code, les textes, les logos et les éléments graphiques du site sont protégés par le droit de la propriété
          intellectuelle. Toute reproduction ou extraction non autorisée est interdite. Les contenus publiés par les utilisateurs
          restent leur propriété (voir les <Link href="/cgu" className="text-brand-600 underline">conditions d'utilisation</Link>).
        </p>
        <p>
          Les données de cartographie proviennent d'OpenStreetMap (© contributeurs OpenStreetMap, licence ODbL). La recherche de communes et la
          vérification des entreprises utilisent les API publiques de l'État (api-adresse.data.gouv.fr, recherche-entreprises.api.gouv.fr).
        </p>
      </Section>

      <Section titre="Données personnelles et cookies">
        <p>
          Le traitement de vos données, vos droits et l'utilisation des cookies sont décrits dans la{' '}
          <Link href="/confidentialite" className="text-brand-600 underline">politique de confidentialité</Link>.
        </p>
      </Section>

      <Section titre="Droit applicable">
        <p>Le présent site est soumis au droit français. Contact : {EDITEUR.email}.</p>
      </Section>
    </>
  )
}
