'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { TypeVehicule, Specificite } from '@prisma/client'
import { TYPE_VEHICULE_LABELS, SPECIFICITE_LABELS } from '@/types'

interface Props {
  transporteur: {
    id: string
    userId: string
    raisonSociale: string
    description: string | null
    disponible: boolean
    distance_km: number
    user: { id: string; nom: string; telephone: string | null }
    vehicules: Array<{ id: string; type: TypeVehicule; chargeUtile: number; specificites: Specificite[] }>
  }
}

export function ResultatTransporteur({ transporteur: t }: Props) {
  const router = useRouter()
  const [contactLoading, setContactLoading] = useState(false)

  async function contacter() {
    setContactLoading(true)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinataireId: t.userId }),
    })
    const data = await res.json()
    if (res.ok) router.push(`/messages/${data.id}`)
    else setContactLoading(false)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profils/${t.id}`} className="font-semibold text-slate-800 hover:text-brand-700 hover:underline">
              {t.raisonSociale}
            </Link>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.disponible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
              {t.disponible ? 'Disponible' : 'Indisponible'}
            </span>
            <span className="text-xs text-slate-400">📍 {t.distance_km} km</span>
          </div>
          {t.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{t.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={contacter} disabled={contactLoading}
            className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {contactLoading ? '…' : '💬 Contacter'}
          </button>
        </div>
      </div>

      {/* Véhicules correspondants */}
      {t.vehicules.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {t.vehicules.map((v) => (
            <div key={v.id} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
              <span className="font-medium">{TYPE_VEHICULE_LABELS[v.type]}</span>
              <span className="text-slate-400 ml-1">· {v.chargeUtile.toLocaleString('fr')} kg</span>
              {v.specificites.slice(0, 2).map((s) => (
                <span key={s} className="ml-1 text-brand-600">· {SPECIFICITE_LABELS[s]}</span>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 text-xs text-slate-400">
        <Link href={`/profils/${t.id}`} className="hover:text-brand-600">Voir le profil complet →</Link>
      </div>
    </div>
  )
}
