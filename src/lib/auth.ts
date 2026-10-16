import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare, hashSync } from 'bcryptjs'
import { z } from 'zod'
import { db } from './db'
import { ipClient } from './ip'
import { compteActuel, consommer, reinitialiser } from './rate-limit'
import { journaliser } from './journal'

// Comparaison factice quand l'e-mail n'existe pas : le temps de réponse ne révèle
// pas si un compte existe (énumération par chronométrage).
let hashFactice: string | undefined
const hashPourTemporisation = () => (hashFactice ??= hashSync('temporisation-anti-enumeration', 12))

const MAX_ECHECS_PAR_COMPTE = 5
const FENETRE_VERROUILLAGE_MS = 15 * 60 * 1000

const identifiants = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
})

export const authOptions: NextAuthOptions = {
  // 7 jours : compromis sécurité / confort (le compte est de toute façon relu en base à chaque requête)
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials, req) {
        const saisie = identifiants.safeParse(credentials)
        if (!saisie.success) return null
        const { email, password } = saisie.data
        const ip = ipClient((req?.headers ?? {}) as Record<string, string | string[] | undefined>)

        // 1) Débit par IP (balayage de comptes) 2) verrouillage temporaire par compte (force brute)
        if (!consommer(`login-ip:${ip}`, 30, 10 * 60 * 1000).autorise) {
          await journaliser('connexion_verrouillee', { ip, details: 'ip' })
          throw new Error('TROP_DE_TENTATIVES')
        }
        const cleCompte = `login-echecs:${email}`
        if (compteActuel(cleCompte) >= MAX_ECHECS_PAR_COMPTE) {
          await journaliser('connexion_verrouillee', { ip, details: 'compte' })
          throw new Error('TROP_DE_TENTATIVES')
        }

        const user = await db.user.findUnique({ where: { email } })
        const valide = await compare(password, user?.password ?? hashPourTemporisation())

        if (!user || !valide || user.suspendu || user.supprimeLe) {
          consommer(cleCompte, MAX_ECHECS_PAR_COMPTE + 1, FENETRE_VERROUILLAGE_MS)
          await journaliser('connexion_echec', { userId: user?.id, ip })
          return null
        }

        reinitialiser(cleCompte)
        await journaliser('connexion_ok', { userId: user.id, ip })
        return { id: user.id, email: user.email, nom: user.nom, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.nom = user.nom
        token.role = user.role
        token.connecteLe = Date.now()
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.nom = token.nom as string
      session.user.role = token.role as import('@prisma/client').Role
      session.user.connecteLe = (token.connecteLe as number | undefined) ?? 0
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}
