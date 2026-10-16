import { db } from '@/lib/db'
import { adminUtilisateurSchema } from '@/lib/validations/divers'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, exigerUtilisateur, gerer, json, lireJson } from '@/lib/api'

// PATCH /api/admin/utilisateurs/[id] — valider le badge ou suspendre un compte
export const PATCH = gerer<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params
  const admin = await exigerUtilisateur('ADMIN')
  const data = await lireJson(req, adminUtilisateurSchema)

  const cible = await db.user.findUnique({ where: { id }, select: { id: true, role: true, supprimeLe: true } })
  if (!cible || cible.supprimeLe) throw new ApiError(404, 'Utilisateur introuvable')
  if (cible.role === 'ADMIN') throw new ApiError(403, "Un compte administrateur ne peut pas être modifié ici")

  await db.user.update({
    where: { id },
    // Suspension : on révoque aussi les sessions ouvertes
    data: { ...data, ...(data.suspendu === true && { motDePasseChangeLe: new Date() }) },
  })
  await journaliser('admin_action', { userId: admin.id, ip: ipClient(req.headers), details: `${JSON.stringify(data)} -> ${id}` })
  return json({ success: true })
})
