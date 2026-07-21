import Link from 'next/link'
import type { Vehicule } from '@prisma/client'
import { TYPE_VEHICULE_LABELS, SPECIFICITE_LABELS } from '@/types'

interface Props {
  vehicule: Vehicule
  editUrl?: string
}

export function CarteVehicule({ vehicule: v, editUrl }: Props) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 ${!v.actif ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-semibold text-slate-800">{TYPE_VEHICULE_LABELS[v.type]}</span>
          {v.immatriculation && (
            <span className="ml-2 text-xs text-slate-400">{v.immatriculation}</span>
          )}
        </div>
        {!v.actif && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Inactif</span>}
      </div>

      <div className="text-sm space-y-1 text-slate-600 mb-3">
        <div className="flex items-center gap-1">
          <span>⚖️</span>
          <span>{v.chargeUtile.toLocaleString('fr-FR')} kg</span>
        </div>
        {(v.longueur || v.largeur || v.hauteur) && (
          <div className="flex items-center gap-1">
            <span>📐</span>
            <span>
              {[v.longueur && `${v.longueur / 100}m L`, v.largeur && `${v.largeur / 100}m l`, v.hauteur && `${v.hauteur / 100}m H`]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        )}
      </div>

      {v.specificites.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {v.specificites.map((s) => (
            <span key={s} className="bg-brand-50 text-brand-700 text-xs px-2 py-0.5 rounded-full">
              {SPECIFICITE_LABELS[s]}
            </span>
          ))}
        </div>
      )}

      {editUrl && (
        <Link href={editUrl} className="text-sm text-brand-600 hover:underline">
          Modifier →
        </Link>
      )}
    </div>
  )
}
