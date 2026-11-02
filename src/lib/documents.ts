// Stockage et contrôle d'accès des documents légaux — serveur uniquement.
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'
import { db } from './db'
import { estProduction } from './env'
import { calculerConformite } from './documents-regles'

// ── Obligation de fournir les documents ────────────────────────────────────────

/**
 * En production, les documents sont exigés (un transporteur sans documents validés reste invisible).
 * EXIGER_DOCUMENTS=false les rend facultatifs (démonstration, tests) ; =true les exige hors production.
 */
export function exigerDocuments(): boolean {
  const v = process.env.EXIGER_DOCUMENTS?.trim().toLowerCase()
  if (v === 'true') return true
  if (v === 'false') return false
  return estProduction
}

/** Fragment SQL : ne garde que les transporteurs conformes (alias de la table passé en paramètre). */
export function clauseConforme(alias = 'tp'): Prisma.Sql {
  if (!exigerDocuments()) return Prisma.empty
  return Prisma.sql`AND ${Prisma.raw(`${alias}."documentsConformesJusqua"`)} > NOW()`
}

/** Filtre Prisma équivalent. */
export function filtreConforme(): { documentsConformesJusqua?: { gt: Date } } {
  return exigerDocuments() ? { documentsConformesJusqua: { gt: new Date() } } : {}
}

/** Recalcule et enregistre la conformité d'un transporteur après toute modification de ses documents. */
export async function recalculerConformite(transporteurId: string): Promise<Date | null> {
  const docs = await db.documentTransporteur.findMany({
    where: { transporteurId },
    select: { type: true, statut: true, dateExpiration: true },
  })
  const limite = calculerConformite(docs)
  await db.transporteurProfil.update({ where: { id: transporteurId }, data: { documentsConformesJusqua: limite } })
  return limite
}

// ── Chiffrement au repos (AES-256-GCM) ─────────────────────────────────────────

const VERSION_CHIFFREMENT = 1

function cleChiffrement(): Buffer {
  // En production la clé est dédiée : changer NEXTAUTH_SECRET (procédure d'incident) ne doit pas rendre les documents illisibles.
  const secret = process.env.DOCUMENTS_CLE || (estProduction ? '' : process.env.NEXTAUTH_SECRET)
  if (!secret) throw new Error('DOCUMENTS_CLE manquant')
  return Buffer.from(hkdfSync('sha256', secret, 'entre-transporteurs', 'documents-v1', 32))
}

/** Le texte chiffré est lié à l'identifiant du document : impossible de le recopier sur un autre. */
export function chiffrer(clair: Buffer, documentId: string): Buffer {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', cleChiffrement(), iv)
  c.setAAD(Buffer.from(documentId))
  const chiffre = Buffer.concat([c.update(clair), c.final()])
  return Buffer.concat([Buffer.from([VERSION_CHIFFREMENT]), iv, c.getAuthTag(), chiffre])
}

export function dechiffrer(donnees: Buffer, documentId: string): Buffer {
  if (donnees[0] !== VERSION_CHIFFREMENT) throw new Error('version de chiffrement inconnue')
  const iv = donnees.subarray(1, 13)
  const tag = donnees.subarray(13, 29)
  const d = createDecipheriv('aes-256-gcm', cleChiffrement(), iv)
  d.setAAD(Buffer.from(documentId))
  d.setAuthTag(tag)
  return Buffer.concat([d.update(donnees.subarray(29)), d.final()])
}

export const empreinte = (octets: Buffer) => createHash('sha256').update(octets).digest('hex')

// ── Garde des actions réservées aux transporteurs conformes ────────────────────

export async function transporteurEstConforme(userId: string): Promise<boolean> {
  if (!exigerDocuments()) return true
  const p = await db.transporteurProfil.findUnique({ where: { userId }, select: { documentsConformesJusqua: true } })
  return !!p?.documentsConformesJusqua && p.documentsConformesJusqua.getTime() > Date.now()
}
