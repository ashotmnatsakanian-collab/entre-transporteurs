import { z } from 'zod'
import { db } from '@/lib/db'
import { besoinSchema } from '@/lib/validations/divers'
import { rechercherBesoinsParRayon, recupererBesoinDiffusion } from '@/lib/geo'
import { getIO } from '@/lib/socket-server'
import { declencherAlertesBesoin } from '@/lib/alertes'
import { ApiError, exigerAccesCommissionnaire, exigerEmailVerifie, exigerUtilisateur, gerer, json, limiter, lireJson, lireQuery } from '@/lib/api'

const MAX_BESOINS_ACTIFS = 20

const query = z.object({
  mine: z.literal('1').optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  rayonKm: z.coerce.number().min(1).max(1000).default(150),
})

// GET /api/besoins?mine=1        — mes besoins (commissionnaire)
// GET /api/besoins?lat=&lng=...  — besoins à proximité (transporteur, gratuit)
export const GET = gerer(async (req) => {
  const q = lireQuery(req, query)

  if (q.mine) {
    const u = await exigerUtilisateur('COMMISSIONNAIRE')
    const profil = await db.commissionnaireProfil.findUnique({ where: { userId: u.id }, select: { id: true } })
    if (!profil) return json([])
    return json(await db.besoin.findMany({ where: { commissionnaireId: profil.id }, orderBy: { dateEnlevement: 'desc' }, take: 100 }))
  }

  const u = await exigerUtilisateur('TRANSPORTEUR')
  limiter(req, 'besoins-recherche', 120, 60_000, u.id)
  if (q.lat === undefined || q.lng === undefined) throw new ApiError(400, 'lat et lng requis')
  return json(await rechercherBesoinsParRayon(q.lat, q.lng, q.rayonKm))
})

// POST /api/besoins — publier un fret à faire transporter
export const POST = gerer(async (req) => {
  const u = await exigerAccesCommissionnaire()
  exigerEmailVerifie(u)
  limiter(req, 'besoins-creation', 10, 24 * 60 * 60_000, u.id)
  const data = await lireJson(req, besoinSchema)

  const profil = await db.commissionnaireProfil.findUnique({ where: { userId: u.id }, select: { id: true } })
  if (!profil) throw new ApiError(404, 'Profil introuvable')

  const actifs = await db.besoin.count({ where: { commissionnaireId: profil.id, active: true, dateEnlevement: { gte: new Date(Date.now() - 86_400_000) } } })
  if (actifs >= MAX_BESOINS_ACTIFS) throw new ApiError(429, `Vous avez déjà ${MAX_BESOINS_ACTIFS} besoins actifs.`)

  const besoin = await db.besoin.create({ data: { ...data, commissionnaireId: profil.id } })

  try {
    const io = getIO()
    const diffusion = io ? await recupererBesoinDiffusion(besoin.id) : null
    if (io && diffusion) io.to('besoins').emit('besoin-created', diffusion)
    void declencherAlertesBesoin(besoin.id)
  } catch {
    /* diffusion best-effort */
  }

  return json(besoin, { status: 201 })
})
