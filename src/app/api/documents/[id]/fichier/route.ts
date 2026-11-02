import { db } from '@/lib/db'
import { aAccesPayant } from '@/lib/acces'
import { paireCle } from '@/lib/conversations'
import { dechiffrer } from '@/lib/documents'
import { EXTENSION_PAR_MIME, type MimeAccepte } from '@/lib/documents-regles'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, exigerUtilisateur, gerer, limiter } from '@/lib/api'

// GET /api/documents/[id]/fichier — téléchargement
// Autorisés : le propriétaire, un administrateur, ou un commissionnaire avec accès qui échange avec ce transporteur
// lorsque celui-ci a autorisé le partage et que le document est validé. Sinon 404 (on ne révèle pas son existence).
export const GET = gerer<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE', 'ADMIN')
  limiter(req, 'document-lecture', 60, 60 * 60_000, u.id)

  const doc = await db.documentTransporteur.findUnique({
    where: { id },
    select: {
      id: true, type: true, mime: true, statut: true, dateExpiration: true,
      transporteur: { select: { userId: true, partageDocuments: true, user: { select: { suspendu: true, supprimeLe: true } } } },
      contenu: { select: { donnees: true } },
    },
  })
  if (!doc || !doc.contenu) throw new ApiError(404, 'Document introuvable')

  const proprietaire = doc.transporteur.userId === u.id
  let autorise = proprietaire || u.role === 'ADMIN'
  if (!autorise && u.role === 'COMMISSIONNAIRE') {
    autorise =
      doc.statut === 'VALIDE' &&
      doc.dateExpiration > new Date() &&
      doc.transporteur.partageDocuments &&
      !doc.transporteur.user.suspendu &&
      !doc.transporteur.user.supprimeLe &&
      (await aAccesPayant(u.id)) &&
      !!(await db.conversation.findUnique({ where: { cle: paireCle(u.id, doc.transporteur.userId) }, select: { id: true } }))
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
