import { db } from '@/lib/db'
import { disponibiliteSchema } from '@/lib/validations/divers'
import { getIO } from '@/lib/socket-server'
import { exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

// PATCH /api/transporteurs/disponibilite — "disponible maintenant"
export const PATCH = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR')
  limiter(req, 'disponibilite', 60, 60 * 60_000, u.id)
  const { disponible } = await lireJson(req, disponibiliteSchema)

  const profil = await db.transporteurProfil.update({ where: { userId: u.id }, data: { disponible, derniereMAJ: new Date() } })
  getIO()?.to('carte').emit('disponibilite-change', { userId: u.id, disponible })

  return json({ disponible: profil.disponible })
})
