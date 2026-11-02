import { z } from 'zod'
import { db } from '@/lib/db'
import { recalculerConformite } from '@/lib/documents'
import { definition, roleAvecDocuments } from '@/lib/documents-regles'
import { emailDocumentDecision, envoyerEmail, urlApplication } from '@/lib/email'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

const schema = z.discriminatedUnion('statut', [
  z.object({ statut: z.literal('VALIDE') }),
  z.object({ statut: z.literal('REFUSE'), motif: z.string().trim().min(3, 'Indiquez un motif').max(300) }),
])

// PATCH /api/admin/documents/[id] — valider ou refuser un document (administrateur)
export const PATCH = gerer<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params
  const admin = await exigerUtilisateur('ADMIN')
  limiter(req, 'admin-documents', 300, 60 * 60_000, admin.id)
  const decision = await lireJson(req, schema)

  const doc = await db.document.findUnique({
    where: { id },
    select: { id: true, type: true, dateExpiration: true, userId: true, user: { select: { email: true, nom: true, role: true, supprimeLe: true } } },
  })
  if (!doc || doc.user.supprimeLe) throw new ApiError(404, 'Document introuvable')
  if (decision.statut === 'VALIDE' && doc.dateExpiration <= new Date()) throw new ApiError(409, 'Ce document est expiré : refusez-le.')

  await db.document.update({
    where: { id },
    data: {
      statut: decision.statut,
      motifRefus: decision.statut === 'REFUSE' ? decision.motif : null,
      verifieParId: admin.id,
      verifieLe: new Date(),
    },
  })
  await recalculerConformite(doc.userId)
  await journaliser('admin_action', { userId: admin.id, ip: ipClient(req.headers), details: `document ${doc.type} ${decision.statut} -> ${id}` })

  const role = roleAvecDocuments(doc.user.role) ?? 'TRANSPORTEUR'
  await envoyerEmail({
    ...emailDocumentDecision(
      doc.user.nom,
      definition(doc.type, role).libelle,
      decision.statut === 'VALIDE',
      decision.statut === 'REFUSE' ? decision.motif : null,
      urlApplication(`/${role === 'COMMISSIONNAIRE' ? 'commissionnaire' : 'transporteur'}/documents`)
    ),
    to: doc.user.email,
  })
  return json({ success: true })
})
