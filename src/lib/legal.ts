// Informations légales de l'éditeur, lues depuis l'environnement (runtime) pour ne jamais
// inventer de coordonnées. Tant qu'elles ne sont pas renseignées, les pages affichent
// "[à compléter]" — et le démarrage en production le signale dans les logs.
const aCompleter = (v: string | undefined, indication: string) => (v && v.trim() ? v.trim() : `[à compléter : ${indication}]`)

export const EDITEUR = {
  nom: aCompleter(process.env.EDITEUR_NOM, 'nom ou raison sociale'),
  forme: process.env.EDITEUR_FORME?.trim() || '',
  adresse: aCompleter(process.env.EDITEUR_ADRESSE, 'adresse postale'),
  siret: aCompleter(process.env.EDITEUR_SIRET, 'SIRET'),
  email: aCompleter(process.env.EMAIL_CONTACT, 'adresse e-mail de contact'),
  directeur: aCompleter(process.env.EDITEUR_DIRECTEUR, 'directeur de la publication'),
  hebergeur: process.env.HEBERGEUR?.trim() || 'Render Services, Inc. — 525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis (render.com)',
  baseDeDonnees: process.env.HEBERGEUR_BDD?.trim() || 'Supabase, Inc. (Union européenne — région Paris/Francfort)',
}

export const MISE_A_JOUR_LEGALE = '16 octobre 2026'

export function informationsLegalesIncompletes(): boolean {
  return [EDITEUR.nom, EDITEUR.adresse, EDITEUR.siret, EDITEUR.email, EDITEUR.directeur].some((v) => v.startsWith('[à compléter'))
}
