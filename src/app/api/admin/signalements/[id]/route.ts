import { db } from '@/lib/db'
import { adminSignalementSchema } from '@/lib/validations/divers'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { exigerUtilisateur, gerer, json, lireJson } from '@/lib/api'

export const PATCH = gerer<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params
  const admin = await exigerUtilisateur('ADMIN')
  const { statut } = await lireJson(req, adminSignalementSchema)
  await db.signalement.update({ where: { id }, data: { statut, traiteLe: new Date() } })
  await journaliser('admin_action', { userId: admin.id, ip: ipClient(req.headers), details: `signalement ${id} -> ${statut}` })
  return json({ success: true })
})
