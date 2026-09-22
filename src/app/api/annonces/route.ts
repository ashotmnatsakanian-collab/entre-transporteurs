import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { annonceSchema, rechercheAnnonceSchema } from '@/lib/validations/annonce'
import { rechercherAnnoncesParRayon, recupererAnnonceDiffusion } from '@/lib/geo'
import { abonnementActif } from '@/lib/stripe'
import { getIO } from '@/lib/socket-server'

// GET /api/annonces?mine=1        — mes propres annonces (transporteur)
// GET /api/annonces?lat=&lng=&... — recherche d'annonces (commissionnaire, abonnement requis)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(req.url)

  if (searchParams.get('mine') === '1') {
    if (session.user.role !== 'TRANSPORTEUR') {
      return NextResponse.json({ error: 'Accès réservé aux transporteurs' }, { status: 403 })
    }
    const profil = await db.transporteurProfil.findUnique({ where: { userId: session.user.id } })
    if (!profil) return NextResponse.json([])
    const mesAnnonces = await db.annonce.findMany({
      where: { transporteurId: profil.id },
      include: { vehicule: true },
      orderBy: { dateDisponibilite: 'desc' },
    })
    return NextResponse.json(mesAnnonces)
  }

  // Recherche par un commissionnaire — les transporteurs sont toujours gratuits
  if (session.user.role === 'COMMISSIONNAIRE') {
    const abo = await db.abonnement.findUnique({ where: { userId: session.user.id } })
    if (!abo || !abonnementActif(abo.statut, abo.dateFinEssai)) {
      return NextResponse.json({ error: 'Abonnement requis' }, { status: 402 })
    }
  }

  try {
    const params = rechercheAnnonceSchema.parse({
      lat: Number(searchParams.get('lat')),
      lng: Number(searchParams.get('lng')),
      rayonKm: searchParams.get('rayonKm') ? Number(searchParams.get('rayonKm')) : undefined,
      date: searchParams.get('date') || undefined,
      villeArrivee: searchParams.get('villeArrivee') || undefined,
    })

    const annonces = await rechercherAnnoncesParRayon(params)
    return NextResponse.json(annonces)
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json({ error: 'Paramètres invalides', details: err }, { status: 400 })
    }
    console.error('[annonces GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/annonces — publier une disponibilité (transporteur, toujours gratuit)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRANSPORTEUR') {
    return NextResponse.json({ error: 'Accès réservé aux transporteurs' }, { status: 403 })
  }

  const profil = await db.transporteurProfil.findUnique({ where: { userId: session.user.id } })
  if (!profil) return NextResponse.json({ error: 'Profil transporteur introuvable' }, { status: 404 })

  try {
    const body = await req.json()
    const data = annonceSchema.parse(body)

    if (data.vehiculeId) {
      const vehicule = await db.vehicule.findUnique({ where: { id: data.vehiculeId } })
      if (!vehicule || vehicule.transporteurId !== profil.id) {
        return NextResponse.json({ error: 'Véhicule invalide' }, { status: 400 })
      }
    }

    const annonce = await db.annonce.create({
      data: { ...data, transporteurId: profil.id },
      include: { vehicule: true },
    })

    // Diffuser en direct aux commissionnaires qui ont le tableau d'annonces ouvert
    const io = getIO()
    if (io) {
      const diffusion = await recupererAnnonceDiffusion(annonce.id)
      if (diffusion) io.to('annonces').emit('annonce-created', diffusion)
    }

    return NextResponse.json(annonce, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json({ error: 'Données invalides', details: err }, { status: 400 })
    }
    console.error('[annonces POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
