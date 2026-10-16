import { compare, hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { changementMotDePasseSchema } from '@/lib/validations/divers'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

// PUT /api/compte/mot-de-passe — changer son mot de passe (révoque toutes les sessions, dont celle-ci)
export const PUT = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE', 'ADMIN')
  limiter(req, 'mdp-change', 5, 15 * 60_000, u.id)
  const { ancien, nouveau } = await lireJson(req, changementMotDePasseSchema)

  const user = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { password: true } })
  if (!(await compare(ancien, user.password))) throw new ApiError(403, 'Mot de passe actuel incorrect')
  if (ancien === nouveau) throw new ApiError(400, "Le nouveau mot de passe doit être différent de l'ancien")

  await db.user.update({ where: { id: u.id }, data: { password: await hash(nouveau, 12), motDePasseChangeLe: new Date() } })
  await journaliser('mdp_change', { userId: u.id, ip: ipClient(req.headers) })
  return json({ success: true })
})
