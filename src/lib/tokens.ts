import { createHash, randomBytes } from 'crypto'
import type { TypeToken } from '@prisma/client'
import { db } from './db'

export function hacher(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Crée un jeton à usage unique. Seul le hachage est stocké : une fuite de la base
 * ne permet pas de réinitialiser un mot de passe. Les anciens jetons du même type
 * sont invalidés.
 */
export async function creerToken(userId: string, type: TypeToken, dureeMs: number): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await db.tokenEmail.deleteMany({ where: { userId, type, utiliseLe: null } })
  await db.tokenEmail.create({
    data: { userId, type, tokenHash: hacher(token), expireLe: new Date(Date.now() + dureeMs) },
  })
  return token
}

/** Consomme le jeton de façon atomique (un jeton ne peut servir qu'une fois, même en concurrence). */
export async function consommerToken(token: string, type: TypeToken): Promise<string | null> {
  if (!token || token.length < 20 || token.length > 200) return null
  const tokenHash = hacher(token)
  const { count } = await db.tokenEmail.updateMany({
    where: { tokenHash, type, utiliseLe: null, expireLe: { gt: new Date() } },
    data: { utiliseLe: new Date() },
  })
  if (count !== 1) return null
  const t = await db.tokenEmail.findUnique({ where: { tokenHash }, select: { userId: true } })
  return t?.userId ?? null
}
