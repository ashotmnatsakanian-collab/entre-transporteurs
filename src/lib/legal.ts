// Informations légales de l'éditeur, lues depuis l'environnement (runtime) pour ne jamais
// inventer de coordonnées. Tant qu'elles ne sont pas renseignées, les pages affichent
// "[à compléter]" — et le démarrage en production le signale dans les logs.
const aCompleter = (v: string | undefined, indication: string) => (v && v.trim() ? v.trim() : `[à compléter : ${indication}]`)
const facultatif = (v: string | undefined) => v?.trim() || ''

export const EDITEUR = {
  nom: aCompleter(process.env.EDITEUR_NOM, 'nom ou raison sociale'),
  forme: facultatif(process.env.EDITEUR_FORME), // ex. « SAS au capital de 1 000 € » ou « Entrepreneur individuel »
  adresse: aCompleter(process.env.EDITEUR_ADRESSE, 'adresse postale'),
  siret: aCompleter(process.env.EDITEUR_SIRET, 'SIRET'),
  rcs: facultatif(process.env.EDITEUR_RCS), // ex. « RCS Paris 123 456 789 » (si immatriculé)
  tva: facultatif(process.env.EDITEUR_TVA), // n° de TVA intracommunautaire, ou « TVA non applicable, art. 293 B du CGI »
  telephone: facultatif(process.env.EDITEUR_TELEPHONE),
  email: aCompleter(process.env.EMAIL_CONTACT, 'adresse e-mail de contact'),
  directeur: aCompleter(process.env.EDITEUR_DIRECTEUR, 'directeur de la publication'),
  hebergeur:
    facultatif(process.env.HEBERGEUR) ||
    'Render Services, Inc. — 525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis (render.com) — serveurs situés à Francfort (Allemagne)',
  baseDeDonnees: facultatif(process.env.HEBERGEUR_BDD) || 'Supabase, Inc. — base de données hébergée dans l\'Union européenne',
}

/**
 * Version des conditions générales. À changer À CHAQUE modification substantielle des CGU ou de la
 * politique de confidentialité : tous les utilisateurs devront alors les accepter de nouveau à leur prochaine visite.
 */
export const VERSION_CGU = '2026-10-16'

export const MISE_A_JOUR_LEGALE = '16 octobre 2026'

export function informationsLegalesIncompletes(): boolean {
  return [EDITEUR.nom, EDITEUR.adresse, EDITEUR.siret, EDITEUR.email, EDITEUR.directeur].some((v) => v.startsWith('[à compléter'))
}
