// Règles des documents légaux des transporteurs. Fichier SANS dépendance serveur : utilisé aussi par l'interface.
import type { StatutDocument, TypeDocument } from '@prisma/client'

export const TAILLE_MAX_OCTETS = 5 * 1024 * 1024
export const FORMATS_ACCEPTES = '.pdf,.jpg,.jpeg,.png'
const MS_PAR_JOUR = 86_400_000

/** 'emission' : la validité se déduit de la date de délivrance ; 'fin' : le document porte sa propre date de fin. */
export type RegleValidite = { genre: 'emission'; mois: number } | { genre: 'fin' }

export interface DefinitionDocument {
  libelle: string
  court: string
  description: string
  /** Où l'obtenir (texte, sans lien profond susceptible de changer) */
  ouLObtenir: string
  regle: RegleValidite
  /** Mention affichée sous le champ de date */
  aideDate: string
}

// Les durées « emission » sont des conventions de la plateforme (l'attestation de vigilance, elle, est valable 6 mois).
export const DOCUMENTS: Record<TypeDocument, DefinitionDocument> = {
  KBIS: {
    libelle: 'Extrait Kbis (ou D1 / avis de situation Sirene)',
    court: 'Kbis',
    description: "Extrait d'immatriculation de moins de 3 mois : Kbis pour une société, extrait D1 ou avis de situation pour un entrepreneur individuel.",
    ouLObtenir: 'infogreffe.fr (Kbis), ou le Répertoire des métiers / avis de situation Sirene pour un entrepreneur individuel',
    regle: { genre: 'emission', mois: 3 },
    aideDate: "Date de délivrance de l'extrait",
  },
  LICENCE_TRANSPORT: {
    libelle: 'Licence de transport',
    court: 'Licence de transport',
    description: "Licence de transport intérieur ou licence communautaire, ou attestation d'inscription au registre des transporteurs selon votre activité.",
    ouLObtenir: 'DREAL (ou DRIEAT en Île-de-France) de votre région',
    regle: { genre: 'fin' },
    aideDate: 'Date de fin de validité indiquée sur le document',
  },
  VIGILANCE_URSSAF: {
    libelle: 'Attestation de vigilance URSSAF',
    court: 'Vigilance URSSAF',
    description: "Attestation de fourniture des déclarations sociales et de paiement des cotisations, valable 6 mois. Elle comporte un code permettant à vos clients d'en vérifier l'authenticité.",
    ouLObtenir: 'urssaf.fr, dans votre espace en ligne (Mes documents > attestation de vigilance)',
    regle: { genre: 'emission', mois: 6 },
    aideDate: "Date de délivrance de l'attestation",
  },
  REGULARITE_FISCALE: {
    libelle: 'Attestation de régularité fiscale',
    court: 'Régularité fiscale',
    description: "Attestation de la DGFiP prouvant que vos déclarations fiscales sont déposées et vos impôts réglés.",
    ouLObtenir: 'impots.gouv.fr, dans votre espace professionnel (Documents > Attestations)',
    regle: { genre: 'emission', mois: 6 },
    aideDate: "Date de délivrance de l'attestation",
  },
  ASSURANCE: {
    libelle: "Attestation d'assurance",
    court: 'Assurance',
    description: "Attestation en cours de validité de votre assurance responsabilité civile professionnelle et de votre assurance des marchandises transportées.",
    ouLObtenir: "Votre assureur ou courtier",
    regle: { genre: 'fin' },
    aideDate: "Date d'échéance indiquée sur l'attestation",
  },
}

/** Ordre d'affichage ; tous sont obligatoires pour être visible des commissionnaires. */
export const TYPES_DOCUMENTS: TypeDocument[] = ['KBIS', 'LICENCE_TRANSPORT', 'VIGILANCE_URSSAF', 'REGULARITE_FISCALE', 'ASSURANCE']
export const TYPES_OBLIGATOIRES: TypeDocument[] = TYPES_DOCUMENTS

export const LIBELLE_STATUT: Record<StatutDocument | 'EXPIRE' | 'MANQUANT', string> = {
  MANQUANT: 'À fournir',
  EN_ATTENTE: 'En cours de vérification',
  VALIDE: 'Validé',
  REFUSE: 'Refusé',
  EXPIRE: 'Expiré',
}

function ajouterMois(d: Date, mois: number): Date {
  const r = new Date(d)
  r.setMonth(r.getMonth() + mois)
  return r
}

export type ResultatExpiration = { ok: true; dateEmission: Date | null; dateExpiration: Date } | { ok: false; erreur: string }

/** Calcule la date d'expiration à partir de ce que le transporteur déclare, ou refuse un document déjà périmé. */
export function calculerExpiration(
  type: TypeDocument,
  declaree: { dateEmission?: Date | null; dateFin?: Date | null },
  maintenant: Date = new Date()
): ResultatExpiration {
  const regle = DOCUMENTS[type].regle
  if (regle.genre === 'emission') {
    const emission = declaree.dateEmission
    if (!emission || Number.isNaN(emission.getTime())) return { ok: false, erreur: 'Indiquez la date de délivrance du document.' }
    if (emission.getTime() > maintenant.getTime() + MS_PAR_JOUR) return { ok: false, erreur: 'La date de délivrance ne peut pas être dans le futur.' }
    if (emission.getTime() < maintenant.getTime() - 5 * 366 * MS_PAR_JOUR) return { ok: false, erreur: 'Cette date de délivrance est trop ancienne.' }
    const expiration = ajouterMois(emission, regle.mois)
    if (expiration.getTime() <= maintenant.getTime()) {
      return { ok: false, erreur: `Ce document date de plus de ${regle.mois} mois : fournissez-en un plus récent.` }
    }
    return { ok: true, dateEmission: emission, dateExpiration: expiration }
  }
  const fin = declaree.dateFin
  if (!fin || Number.isNaN(fin.getTime())) return { ok: false, erreur: 'Indiquez la date de fin de validité du document.' }
  if (fin.getTime() <= maintenant.getTime()) return { ok: false, erreur: 'Ce document est expiré : fournissez un document en cours de validité.' }
  if (fin.getTime() > maintenant.getTime() + 10 * 366 * MS_PAR_JOUR) return { ok: false, erreur: 'Cette date de fin de validité est trop lointaine.' }
  return { ok: true, dateEmission: null, dateExpiration: fin }
}

export interface DocumentResume {
  type: TypeDocument
  statut: StatutDocument
  dateExpiration: Date
}

/** Statut affiché : un document validé dont la date est passée est « expiré ». */
export function statutEffectif(d: Pick<DocumentResume, 'statut' | 'dateExpiration'> | undefined, maintenant: Date = new Date()): StatutDocument | 'EXPIRE' | 'MANQUANT' {
  if (!d) return 'MANQUANT'
  if (d.statut === 'VALIDE' && d.dateExpiration.getTime() <= maintenant.getTime()) return 'EXPIRE'
  return d.statut
}

/**
 * Conformité : tous les documents obligatoires sont présents, validés et en cours de validité.
 * Retourne la date à laquelle le premier d'entre eux expire (la conformité tombe alors), ou null.
 */
export function calculerConformite(documents: DocumentResume[], maintenant: Date = new Date()): Date | null {
  let limite: Date | null = null
  for (const type of TYPES_OBLIGATOIRES) {
    const d = documents.find((x) => x.type === type)
    if (!d || d.statut !== 'VALIDE' || d.dateExpiration.getTime() <= maintenant.getTime()) return null
    if (!limite || d.dateExpiration < limite) limite = d.dateExpiration
  }
  return limite
}

// ── Contrôle du fichier ────────────────────────────────────────────────────────

export type MimeAccepte = 'application/pdf' | 'image/jpeg' | 'image/png'
export const EXTENSION_PAR_MIME: Record<MimeAccepte, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' }

/** Type réel du fichier d'après ses premiers octets (l'extension et le type annoncé par le navigateur sont ignorés). */
export function detecterMime(octets: Uint8Array): MimeAccepte | null {
  const debut = (...o: number[]) => o.every((v, i) => octets[i] === v)
  if (debut(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf' // %PDF-
  if (debut(0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (debut(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  return null
}

/** Un PDF qui déclare du JavaScript, une action de lancement ou une pièce jointe n'a rien à faire dans un justificatif. */
export function pdfSuspect(octets: Uint8Array): boolean {
  const texte = Buffer.from(octets).toString('latin1')
  return /\/(JavaScript|Launch|EmbeddedFile)\b/.test(texte)
}

/** Nom d'affichage : sans chemin, sans caractères de contrôle ni de mise en forme, borné. */
export function nettoyerNomFichier(nom: string): string {
  const base = nom.split(/[\\/]/).pop() ?? ''
  const propre = base.normalize('NFC').replace(/[^\p{L}\p{N}._ ()-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 80)
  return propre || 'document'
}
