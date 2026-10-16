'use client'

import { useState } from 'react'
import { RechercheAnnoncesClient } from '@/components/annonces/RechercheAnnoncesClient'
import RechercheClient from './RechercheClient'

const ONGLETS = [
  { id: 'annonces', label: '📣 Disponibilités', aide: 'Transporteurs qui annoncent un trajet retour ou une disponibilité' },
  { id: 'profils', label: '🔍 Recherche avancée', aide: 'Par type de véhicule, charge utile, spécificités…' },
] as const

export function RechercheTabs({ ongletInitial = 'annonces' }: { ongletInitial?: 'annonces' | 'profils' }) {
  const [onglet, setOnglet] = useState<'annonces' | 'profils'>(ongletInitial)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex border-b bg-white px-4 sm:px-6 gap-6 overflow-x-auto" role="tablist">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={onglet === o.id}
            title={o.aide}
            onClick={() => setOnglet(o.id)}
            className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              onglet === o.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {onglet === 'annonces' ? <RechercheAnnoncesClient /> : <RechercheClient />}
    </div>
  )
}
