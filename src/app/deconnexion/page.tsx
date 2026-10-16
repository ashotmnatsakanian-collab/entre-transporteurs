'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'

// Destination des sessions devenues invalides (compte suspendu, supprimé, mot de passe changé)
export default function DeconnexionPage() {
  useEffect(() => {
    signOut({ callbackUrl: '/login?session=expiree' })
  }, [])
  return <p className="p-8 text-center text-slate-500">Déconnexion…</p>
}
