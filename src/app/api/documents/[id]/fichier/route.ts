import { db } from '@/lib/db'
import { aAccesPayant } from '@/lib/acces'
import { paireCle } from '@/lib/conversations'
import { dechiffrer, utilisateurEstConforme } from '@/lib/documents'
import { EXTENSION_PAR_MIME, type MimeAccepte } from '@/lib/documents-regles'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, exigerUtilisateur, gerer, limiter } from '@/lib/api'

// GET /api/documents/[id]/fichier — téléchargement
// Autorisés : le propriétaire, un administrateur, ou l'AUTRE partie d'une conversation (transporteur ↔ commissionnaire)
// lorsque le propriétaire a autorisé le partage et que le document est validé. Sinon 404 (on ne révèle pas son existence).
export const GET = gerer<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE', 'ADMIN')
  limiter(req, 'document-lecture', 60, 60 * 60_000, u.id)

  const doc = await db.document.findUnique({
    where: { id },
    select: {
      id: true, type: true, mime: true, statut: true, dateExpiration: true, userId: true,
      user: { select: { role: true, partageDocuments: true, suspendu: true, supprimeLe: true } },
      contenu: { select: { donnees: true } },
    },
  })
  if (!doc || !doc.contenu) throw new ApiError(404, 'Document introuvable')

  const proprietaire = doc.userId === u.id
  let autorise = proprietaire || u.role === 'ADMIN'
  if (!autorise && u.role !== doc.user.role) {
    autorise =
      doc.statut === 'VALIDE' &&
      doc.dateExpiration > new Date() &&
      doc.user.partageDocuments &&
      !doc.user.suspendu &&
      !doc.user.supprimeLe &&
      (u.role !== 'COMMISSIONNAIRE' || (await aAccesPayant(u.id))) &&
      (await utilisateurEstConforme(u.id)) &&
      !!(await db.conversation.findUnique({ where: { cle: paireCle(u.id, doc.userId) }, select: { id: true } }))
  }
  if (!autorise) throw new ApiError(404, 'Document introuvable')

  let octets: Buffer
  try {
    octets = dechiffrer(Buffer.from(doc.contenu.donnees), doc.id)
  } catch {
    throw new ApiError(500, 'Document illisible')
  }
  if (!proprietaire) await journaliser('document_telecharge', { userId: u.id, ip: ipClient(req.headers), details: `${doc.id} (${doc.type})` })

  const ext = EXTENSION_PAR_MIME[doc.mime as MimeAccepte] ?? 'bin'
  return new Response(new Uint8Array(octets), {
    headers: {
      'Content-Type': doc.mime,
      'Content-Length': String(octets.length),
      // Nom généré par nos soins (jamais celui envoyé par l'utilisateur) : pas d'injection d'en-tête
      'Content-Disposition': `attachment; filename="document-${doc.type.toLowerCase()}.${ext}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  })
})
