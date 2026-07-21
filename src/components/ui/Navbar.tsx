'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { BadgeNonLus } from '@/components/messagerie/BadgeNonLus'

interface NavbarProps {
  user: { id: string; nom: string; email: string; role: string }
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0">
      <span className="font-bold text-brand-700 hidden sm:block">🚛 Entre Transporteurs</span>
      <div className="flex-1" />
      <Link href="/messages" className="relative p-2 hover:bg-slate-100 rounded-lg">
        <span className="text-xl">💬</span>
        <BadgeNonLus userId={user.id} />
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600 hidden sm:block">{user.nom}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-slate-500 hover:text-slate-800 px-2 py-1 hover:bg-slate-100 rounded"
        >
          Déconnexion
        </button>
      </div>
    </header>
  )
}
