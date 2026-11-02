'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { TypeVehicule, Specificite } from '@prisma/client'
import { TYPE_VEHICULE_LABELS, SPECIFICITE_LABELS } from '@/types'
import { BadgeNote } from '@/components/avis/Etoiles'
import { IconeLieu } from '@/components/position/Icones'
import { ilYA, jusquA } from '@/lib/fraicheur'
import { libelleLieu } from '@/lib/referentiel-geo'

interface Props {
  transporteur: {
    id: string
    userId: string
    raisonSociale: string
    description: string | null
    positionVille: string | null
    positionDepartement: string | null
    zonesCirculation: string[]
    rayonInterventionKm: number | null
    destinationVille: string | null
    disponibleJusqua: string | null
    derniereMAJ: string
    distance_km: number | null
    via_intervention: boolean
    verifie: boolean
    note_moyenne: number | null
    nb_avis: number
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profils/${t.id}`} className="font-semibold text-slate-900 hover:text-brand-700 hover:underline">
              {t.raisonSociale}
            </Link>
            {t.verifie && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" title="Établissement existant et en activité au répertoire officiel">SIRET vérifié</span>
            )}
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-900">
              Disponible {t.disponibleJusqua ? jusquA(t.disponibleJusqua) : 'maintenant'}
            </span>
            <BadgeNote moyenne={t.note_moyenne} total={t.nb_avis} />
          </div>

          <p className="mt-1 text-sm text-slate-800 flex items-center gap-1.5 flex-wrap">
            <IconeLieu className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="font-medium">{t.positionVille ? libelleLieu(t.positionVille, t.positionDepartement) : 'Position non précisée'}</span>
            {t.distance_km !== null && <span className="text-slate-600">· à {t.distance_km} km</span>}
            <span className="text-slate-600">· mis à jour {ilYA(t.derniereMAJ)}</span>
          </p>

          {t.via_intervention && (
            <p className="mt-1 text-xs text-slate-700">
              Accepte de se déplacer
              {t.rayonInterventionKm ? ` jusqu'à ${t.rayonInterventionKm} km` : ''}
              {t.zonesCirculation.length > 0 ? `${t.rayonInterventionKm ? ' et dans les départements' : ' dans les départements'} ${t.zonesCirculation.join(', ')}` : ''}.
            </p>
          )}
          {t.destinationVille && <p className="mt-1 text-xs text-slate-700">Destination souhaitée : {t.destinationVille}</p>}
          {t.description && <p className="text-xs text-slate-600 mt-1 line-clamp-1">{t.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button onClick={contacter} disabled={contactLoading}
            className="min-h-[44px] text-sm font-medium bg-brand-600 text-white px-4 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors w-full sm:w-auto cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {contactLoading ? '…' : 'Contacter'}
          </button>
        </div>
      </div>

      {/* Véhicules correspondants */}
      {t.vehicules.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {t.vehicules.map((v) => (
            <div key={v.id} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800">
              <span className="font-medium">{TYPE_VEHICULE_LABELS[v.type]}</span>
              <span className="text-slate-600 ml-1">· {v.chargeUtile.toLocaleString('fr')} kg</span>
              {v.specificites.slice(0, 2).map((s) => (
                <span key={s} className="ml-1 text-brand-700">· {SPECIFICITE_LABELS[s]}</span>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 text-xs">
        <Link href={`/profils/${t.id}`} className="text-slate-700 hover:text-brand-700 underline">Voir le profil complet</Link>
      </div>
    </div>
  )
}
