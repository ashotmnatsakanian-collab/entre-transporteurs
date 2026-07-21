import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rechercheSchema } from '@/lib/validations/recherche'
import { rechercherParRayon } from '@/lib/geo'
import { abonnementActif } from '@/lib/stripe'

// POST /api/recherche — moteur de recherche géo filtrée
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérifier l'abonnement
  const abo = await db.abonnement.findUnique({ where: { userId: session.user.id } })
  if (!abo || !abonnementActif(abo.statut, abo.dateFinEssai)) {
    return NextResponse.json({ error: 'Abonnement requis' }, { status: 402 })
  }

  try {
    const body = await req.json()
    const filtres = rechercheSchema.parse(body)

    // 1. Transporteurs dans le rayon
    const transporteurs = await rechercherParRayon(
      filtres.lat,
      filtres.lng,
      filtres.rayonKm,
      filtres.disponibleSeulement
    )

    if (transporteurs.length === 0) return NextResponse.json([])

    const transporteurIds = transporteurs.map((t) => t.id)

    // 2. Véhicules correspondant aux critères
    const vehicules = await db.vehicule.findMany({
      where: {
        transporteurId: { in: transporteurIds },
        actif: true,
        ...(filtres.typeVehicule && { type: filtres.typeVehicule }),
        ...(filtres.chargeUtileMin && { chargeUtile: { gte: filtres.chargeUtileMin } }),
        ...(filtres.longueurMin && { longueur: { gte: filtres.longueurMin } }),
        ...(filtres.largeurMin && { largeur: { gte: filtres.largeurMin } }),
        ...(filtres.specificites.length > 0 && {
          specificites: { hasEvery: filtres.specificites },
        }),
      },
    })

    // 3. Ne garder que les transporteurs ayant au moins un véhicule correspondant
    const idsAvecVehicule = new Set(vehicules.map((v) => v.transporteurId))
    const resultats = transporteurs
      .filter((t) => idsAvecVehicule.has(t.id))
      .map((t) => ({
        ...t,
        vehicules: vehicules.filter((v) => v.transporteurId === t.id),
      }))

    return NextResponse.json(resultats)
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json({ error: 'Paramètres invalides', details: err }, { status: 400 })
    }
    console.error('[recherche]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
