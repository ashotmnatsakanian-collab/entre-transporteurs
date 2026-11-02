import { db } from '@/lib/db'
import { recalculerConformite } from '@/lib/documents'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, exigerUtilisateur, gerer, json, limiter } from '@/lib/api'

// DELETE /api/documents/[id] — supprimer l'un de mes documents
export const DELETE = gerer<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE')
  limiter(req, 'document-suppression', 30, 60 * 60_000, u.id)

  const doc = await db.document.findFirst({ where: { id, userId: u.id }, select: { id: true, type: true } })
  if (!doc) throw new ApiError(404, 'Document introuvable')

  await db.document.delete({ where: { id: doc.id } })
  await recalculerConformite(u.id)
  await journaliser('document_supprime', { userId: u.id, ip: ipClient(req.headers), details: doc.type })
  return json({ success: true })
})
