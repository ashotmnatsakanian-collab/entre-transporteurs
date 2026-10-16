import type { Role } from '@prisma/client'

export function accueilPour(role: Role): string {
  if (role === 'TRANSPORTEUR') return '/transporteur'
  if (role === 'ADMIN') return '/admin'
  return '/commissionnaire'
}
