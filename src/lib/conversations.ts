import { Prisma } from '@prisma/client'
import { db } from './db'

/** Clé canonique d'une paire d'utilisateurs : même valeur quel que soit l'ordre. */
export function paireCle(a: string, b: string): string {
  return [a, b].sort().join(':')
}

/**
 * Retrouve ou crée l'unique conversation entre deux utilisateurs. La contrainte
 * d'unicité sur `cle` rend l'opération sûre même si deux requêtes arrivent en même temps.
 */
export async function trouverOuCreerConversation(
  userA: string,
  userB: string,
  premierMessage?: { expediteurId: string; contenu: string }
): Promise<{ id: string; creee: boolean }> {
  const cle = paireCle(userA, userB)
  const existante = await db.conversation.findUnique({ where: { cle }, select: { id: true } })
  if (existante) return { id: existante.id, creee: false }

  try {
    const conv = await db.conversation.create({
      data: {
        cle,
        participants: { create: [{ userId: userA }, { userId: userB }] },
        ...(premierMessage && { messages: { create: { expediteurId: premierMessage.expediteurId, contenu: premierMessage.contenu } } }),
      },
      select: { id: true },
    })
    return { id: conv.id, creee: true }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const conv = await db.conversation.findUniqueOrThrow({ where: { cle }, select: { id: true } })
      return { id: conv.id, creee: false }
    }
    throw err
  }
}
