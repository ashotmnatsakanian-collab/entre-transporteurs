'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@prisma/client'
import clsx from 'clsx'

const LIENS_TRANSPORTEUR = [
  { href: '/transporteur', label: 'Dashboard', icon: '📊' },
  { href: '/transporteur/annonces', label: 'Mes disponibilités', icon: '📣' },
  { href: '/transporteur/profil', label: 'Mon profil', icon: '👤' },
  { href: '/transporteur/flotte', label: 'Ma flotte', icon: '🚚' },
  { href: '/carte', label: 'La carte', icon: '🗺️' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/abonnement/tarification', label: 'Abonnement', icon: '💳' },
]

const LIENS_COMMISSIONNAIRE = [
  { href: '/commissionnaire', label: 'Dashboard', icon: '📊' },
  { href: '/commissionnaire/annonces', label: 'Annonces retour', icon: '📣' },
  { href: '/commissionnaire/recherche', label: 'Recherche', icon: '🔍' },
  { href: '/carte', label: 'La carte', icon: '🗺️' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/abonnement/tarification', label: 'Abonnement', icon: '💳' },
]

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const liens = role === 'TRANSPORTEUR' ? LIENS_TRANSPORTEUR : LIENS_COMMISSIONNAIRE

  return (
    <aside className="w-16 sm:w-56 bg-slate-900 flex flex-col shrink-0">
      <div className="h-14 flex items-center justify-center sm:justify-start px-0 sm:px-4 border-b border-slate-700">
        <span className="text-xl">🚛</span>
        <span className="hidden sm:block ml-2 font-bold text-white text-sm">Entre Transporteurs</span>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2">
        {liens.map((l) => {
          const actif = pathname === l.href || (l.href !== '/transporteur' && l.href !== '/commissionnaire' && pathname.startsWith(l.href))
          return (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                'flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm transition-colors',
                actif
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <span className="text-lg">{l.icon}</span>
              <span className="hidden sm:block">{l.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="px-2 pb-4">
        <div className={clsx(
          'px-2 py-1.5 rounded text-xs text-center hidden sm:block',
          role === 'TRANSPORTEUR' ? 'bg-blue-900 text-blue-300' : 'bg-amber-900 text-amber-300'
        )}>
          {role === 'TRANSPORTEUR' ? 'Transporteur' : 'Commissionnaire'}
        </div>
      </div>
    </aside>
  )
}
