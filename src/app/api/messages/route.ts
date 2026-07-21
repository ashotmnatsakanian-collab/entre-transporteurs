import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { abonnementActif } from '@/lib/stripe'

// GET /api/messages — liste des conversations de l'utilisateur connecté
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const conversations = await db.conversation.findMany({
    where: {
      participants: { some: { userId: session.user.id } },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, nom: true, role: true } } },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { expediteur: { select: { nom: true } } },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Compter les messages non lus par conversation
  const avecNonLus = await Promise.all(
    conversations.map(async (conv) => {
      const nonLus = await db.message.count({
        where: {
          conversationId: conv.id,
          expediteurId: { not: session.user.id },
          lu: false,
        },
      })
      return { ...conv, nonLus }
    })
  )

  return NextResponse.json(avecNonLus)
}

// POST /api/messages — démarrer ou retrouver une conversation avec un autre user
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const abo = await db.abonnement.findUnique({ where: { userId: session.user.id } })
  if (!abo || !abonnementActif(abo.statut, abo.dateFinEssai)) {
    return NextResponse.json({ error: 'Abonnement requis' }, { status: 402 })
  }

  const { destinataireId, premierMessage } = await req.json() as {
    destinataireId: string
    premierMessage?: string
  }

  if (destinataireId === session.user.id) {
    return NextResponse.json({ error: 'Impossible de se contacter soi-même' }, { status: 400 })
  }

  // Vérifier si une conversation existe déjà entre ces deux utilisateurs
  const existante = await db.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: session.user.id } } },
        { participants: { some: { userId: destinataireId } } },
      ],
    },
    include: {
      participants: { include: { user: { select: { id: true, nom: true, role: true } } } },
    },
  })

  if (existante) return NextResponse.json(existante)

  // Créer la conversation avec un premier message optionnel
  const conversation = await db.conversation.create({
    data: {
      participants: {
        create: [{ userId: session.user.id }, { userId: destinataireId }],
      },
      ...(premierMessage && {
        messages: {
          create: {
            expediteurId: session.user.id,
            contenu: premierMessage.trim(),
          },
        },
      }),
    },
    include: {
      participants: { include: { user: { select: { id: true, nom: true, role: true } } } },
    },
  })

  return NextResponse.json(conversation, { status: 201 })
}
