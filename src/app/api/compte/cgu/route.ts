import { z } from 'zod'
import { db } from '@/lib/db'
import { VERSION_CGU } from '@/lib/legal'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, exigerUtilisateur, gerer, json, limiter, lireJson } from '@/lib/api'

const schema = z.object({ version: z.string().max(40) })

// POST /api/compte/cgu — accepter la version en vigueur des CGU et de la politique de confidentialité
export const POST = gerer(async (req) => {
  const u = await exigerUtilisateur()
  limiter(req, 'cgu', 10, 60 * 60_000, u.id)
  const { version } = await lireJson(req, schema)
  // Refuse une acceptation « à l'aveugle » d'une version périmée affichée dans un onglet resté ouvert
  if (version !== VERSION_CGU) throw new ApiError(409, 'Les conditions ont été mises à jour : rechargez la page pour les relire.')

  await db.user.update({ where: { id: u.id }, data: { cguAccepteesLe: new Date(), cguVersion: VERSION_CGU } })
  await journaliser('cgu_acceptees', { userId: u.id, ip: ipClient(req.headers), details: VERSION_CGU })
  return json({ success: true })
})
