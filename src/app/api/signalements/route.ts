import { db } from '@/lib/db'
import { signalementSchema } from '@/lib/validations/divers'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, exigerEmailVerifie, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

// POST /api/signalements — signaler un utilisateur (fausse identité, arnaque, abus…)
export const POST = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE')
  exigerEmailVerifie(u)
  limiter(req, 'signalement', 10, 24 * 60 * 60_000, u.id)
  const data = await lireJson(req, signalementSchema)

  if (data.cibleId === u.id) throw new ApiError(400, 'Vous ne pouvez pas vous signaler vous-même')
  const cible = await db.user.findUnique({ where: { id: data.cibleId }, select: { id: true, role: true } })
  if (!cible || cible.role === 'ADMIN') throw new ApiError(404, 'Utilisateur introuvable')

  const dejaOuvert = await db.signalement.findFirst({ where: { signalantId: u.id, cibleId: cible.id, statut: 'OUVERT' }, select: { id: true } })
  if (dejaOuvert) throw new ApiError(409, 'Vous avez déjà signalé cet utilisateur : notre équipe examine votre signalement.')

  await db.signalement.create({ data: { signalantId: u.id, cibleId: cible.id, motif: data.motif, details: data.details } })
  await journaliser('signalement', { userId: u.id, ip: ipClient(req.headers), details: `${data.motif} -> ${cible.id}` })
  return json({ success: true }, { status: 201 })
})
