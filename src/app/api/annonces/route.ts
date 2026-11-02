import { z } from 'zod'
import { TypeVehicule } from '@prisma/client'
import { codeDepartementSchema, codeRegionSchema, aUneZone } from '@/lib/validations/position'
import { db } from '@/lib/db'
import { annonceSchema } from '@/lib/validations/annonce'
import { rechercherAnnonces, recupererAnnonceDiffusion } from '@/lib/geo'
import { getIO } from '@/lib/socket-server'
import { declencherAlertesAnnonce } from '@/lib/alertes'
import { ApiError, communeOuErreur, exigerAccesCommissionnaire, exigerEmailVerifie, exigerConformite, exigerUtilisateur, gerer, json, limiter, lireJson, lireQuery } from '@/lib/api'

const MAX_ANNONCES_ACTIVES = 30

const listeDepartements = z
  .string()
  .transform((v) => v.split(',').map((x) => x.trim()).filter(Boolean))
  .pipe(z.array(codeDepartementSchema).min(1).max(12))

const rechercheQuery = z.object({
  mine: z.literal('1').optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  rayonKm: z.coerce.number().min(1).max(1000).default(150),
  departements: listeDepartements.optional(),
  region: codeRegionSchema.optional(),
  date: z.coerce.date().optional(),
  villeArrivee: z.string().trim().max(100).optional(),
  typeVehicule: z.nativeEnum(TypeVehicule).optional(),
  disponibleMaintenant: z.literal('1').optional(),
})

// GET /api/annonces?mine=1        — mes annonces (transporteur)
// GET /api/annonces?lat=&lng=&… | ?departements=57,67 | ?region=44 — recherche (commissionnaire avec accès uniquement)
export const GET = gerer(async (req) => {
  const q = lireQuery(req, rechercheQuery)

  if (q.mine) {
    const u = await exigerUtilisateur('TRANSPORTEUR')
    const profil = await db.transporteurProfil.findUnique({ where: { userId: u.id }, select: { id: true } })
    if (!profil) return json([])
    const annonces = await db.annonce.findMany({
      where: { transporteurId: profil.id },
      include: { vehicule: true },
      orderBy: { dateDisponibilite: 'desc' },
      take: 200,
    })
    return json(annonces)
  }

  const u = await exigerAccesCommissionnaire()
  limiter(req, 'annonces-recherche', 120, 60_000, u.id)
  if (!aUneZone(q)) throw new ApiError(400, 'Indiquez une ville, des départements ou une région.')

  return json(
    await rechercherAnnonces(
      { lat: q.lat, lng: q.lng, rayonKm: q.rayonKm, departements: q.departements, region: q.region },
      { date: q.date, villeArrivee: q.villeArrivee, typeVehicule: q.typeVehicule, disponibleMaintenant: !!q.disponibleMaintenant }
    )
  )
})

// POST /api/annonces — publier une disponibilité (transporteur, gratuit)
export const POST = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR')
  exigerEmailVerifie(u)
  await exigerConformite(u.id)
  limiter(req, 'annonces-creation', 20, 60 * 60_000, u.id)

  const profil = await db.transporteurProfil.findUnique({ where: { userId: u.id }, select: { id: true } })
  if (!profil) throw new ApiError(404, 'Profil transporteur introuvable')

  const data = await lireJson(req, annonceSchema)

  if (data.vehiculeId) {
    const vehicule = await db.vehicule.findFirst({ where: { id: data.vehiculeId, transporteurId: profil.id }, select: { id: true } })
    if (!vehicule) throw new ApiError(400, 'Véhicule invalide')
  }

  const actives = await db.annonce.count({
    where: { transporteurId: profil.id, active: true, OR: [{ dateDisponibiliteFin: { gte: new Date() } }, { dateDisponibiliteFin: null, dateDisponibilite: { gte: new Date(Date.now() - 86_400_000) } }] },
  })
  if (actives >= MAX_ANNONCES_ACTIVES) {
    throw new ApiError(429, `Vous avez déjà ${MAX_ANNONCES_ACTIVES} annonces actives. Supprimez-en ou marquez-en comme pourvues.`)
  }

  // Communes retrouvées auprès de l'API officielle : jamais de coordonnées, de nom ni de département fournis par le client
  const depart = await communeOuErreur(data.inseeDepart)
  const arrivee = data.inseeArrivee ? await communeOuErreur(data.inseeArrivee) : null

  const annonce = await db.annonce.create({
    data: {
      transporteurId: profil.id,
      vehiculeId: data.vehiculeId,
      dateDisponibilite: data.dateDisponibilite,
      dateDisponibiliteFin: data.dateDisponibiliteFin,
      commentaire: data.commentaire,
      villeDepart: depart.nom,
      latDepart: depart.latitude,
      lngDepart: depart.longitude,
      inseeDepart: depart.insee,
      departementDepart: depart.departement,
      regionDepart: depart.region,
      villeArrivee: arrivee?.nom ?? null,
      inseeArrivee: arrivee?.insee ?? null,
      departementArrivee: arrivee?.departement ?? null,
    },
    include: { vehicule: true },
  })

  // Temps réel (commissionnaires connectés) puis alertes e-mail — sans jamais faire échouer la publication
  try {
    const io = getIO()
    const diffusion = io ? await recupererAnnonceDiffusion(annonce.id) : null
    if (io && diffusion) io.to('annonces').emit('annonce-created', diffusion)
    void declencherAlertesAnnonce(annonce.id)
  } catch {
    /* diffusion best-effort */
  }

  return json(annonce, { status: 201 })
})
