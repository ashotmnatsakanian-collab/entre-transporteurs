'use client'

import { useId } from 'react'
import { VilleAutocomplete } from '@/components/ui/VilleAutocomplete'
import { SelecteurDepartements } from './SelecteurDepartements'
import { REGIONS } from '@/lib/referentiel-geo'
import { MAX_DEPARTEMENTS_RECHERCHE, type ModeZone, type Zone } from '@/lib/zone'

const MODES: Array<{ mode: ModeZone; libelle: string }> = [
  { mode: 'ville', libelle: 'Autour d’une ville' },
  { mode: 'departements', libelle: 'Départements' },
  { mode: 'region', libelle: 'Région' },
]

interface Props {
  zone: Zone
  onChange: (zone: Zone) => void
  villeInitiale?: string
}

// Où chercher ? Trois façons : autour d'une ville (rayon), un ou plusieurs départements, une région.
export function SelecteurZone({ zone, onChange, villeInitiale }: Props) {
  const idRegion = useId()
  const idRayon = useId()

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="block text-sm font-medium text-slate-700 mb-1">Où chercher ?</legend>
        <div className="grid grid-cols-3 gap-1 bg-slate-100 rounded-lg p-1" role="radiogroup">
          {MODES.map(({ mode, libelle }) => (
            <label key={mode}
              className={`flex items-center justify-center text-center min-h-[44px] px-1 rounded-md text-xs sm:text-sm font-medium cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-brand-600 ${zone.mode === mode ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-700 hover:text-slate-900'}`}>
              <input type="radio" name="mode-zone" value={mode} checked={zone.mode === mode} onChange={() => onChange({ ...zone, mode })} className="sr-only" />
              {libelle}
            </label>
          ))}
        </div>
      </fieldset>

      {zone.mode === 'ville' && (
        <>
          <VilleAutocomplete
            label="Ville ou code postal"
            valeurInitiale={villeInitiale}
            onSelect={(v) => onChange({ ...zone, lat: v.lat, lng: v.lng, insee: v.insee, villeNom: v.nom })}
            onClear={() => onChange({ ...zone, lat: undefined, lng: undefined, insee: undefined, villeNom: undefined })}
          />
          <div>
            <label htmlFor={idRayon} className="block text-sm font-medium text-slate-700 mb-1">Rayon</label>
            <div className="flex items-center gap-3">
              <input id={idRayon} type="range" min={10} max={500} step={10} value={zone.rayonKm}
                onChange={(e) => onChange({ ...zone, rayonKm: Number(e.target.value) })} className="flex-1 min-h-[44px]" />
              <span className="text-sm font-medium text-slate-800 w-16 text-right">{zone.rayonKm} km</span>
            </div>
          </div>
        </>
      )}

      {zone.mode === 'departements' && (
        <SelecteurDepartements valeur={zone.departements} max={MAX_DEPARTEMENTS_RECHERCHE} onChange={(departements) => onChange({ ...zone, departements })} />
      )}

      {zone.mode === 'region' && (
        <div>
          <label htmlFor={idRegion} className="block text-sm font-medium text-slate-700 mb-1">Région</label>
          <select id={idRegion} value={zone.region ?? ''} onChange={(e) => onChange({ ...zone, region: e.target.value || undefined })}
            className="w-full min-h-[44px] border border-slate-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">Choisir une région</option>
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.nom}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}
