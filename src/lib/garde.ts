import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'
import { utilisateurCourant, type Utilisateur } from './api'
import { accueilPour } from './routes'

/**
 * Garde des pages serveur : renvoie l'utilisateur s'il a l'un des rôles requis,
 * sinon le redirige vers SON espace (pas de boucle entre espaces).
 */
export async function exigerRoleOuRediriger(...roles: Role[]): Promise<Utilisateur> {
  const u = await utilisateurCourant()
  if (!u) redirect('/deconnexion')
  if (!roles.includes(u.role)) redirect(accueilPour(u.role))
  return u
}
