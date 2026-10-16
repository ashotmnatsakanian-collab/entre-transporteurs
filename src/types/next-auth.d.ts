import type { Role } from '@prisma/client'
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      nom: string
      role: Role
      // horodatage (ms) de l'ouverture de session — sert à révoquer les sessions anciennes
      connecteLe: number
    }
  }

  interface User {
    id: string
    email: string
    nom: string
    role: Role
    connecteLe?: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    nom: string
    role: Role
  }
}
