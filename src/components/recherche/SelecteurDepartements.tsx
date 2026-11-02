'use client'

import { useId, useMemo, useState } from 'react'
import { DEPARTEMENTS, departement } from '@/lib/referentiel-geo'

const SANS_ACCENT = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

interface Props {
  valeur: string[]
  onChange: (codes: string[]) => void
  max: number
  label?: string
}

// Choix d'un ou plusieurs départements : saisie du nom ou du numéro, puces retirables.
export function SelecteurDepartements({ valeur, onChange, max, label = 'Départements' }: Props) {
  const [saisie, setSaisie] = useState('')
  const id = useId()
  const suggestions = useMemo(() => {
    const q = SANS_ACCENT(saisie.trim())
    if (!q) return []
    return DEPARTEMENTS.filter((d) => !valeur.includes(d.code) && (d.code.toLowerCase().startsWith(q) || SANS_ACCENT(d.nom).includes(q))).slice(0, 6)
  }, [saisie, valeur])

  function ajouter(code: string) {
    if (valeur.length >= max) return
    onChange([...valeur, code])
    setSaisie('')
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {valeur.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-2" aria-label="Départements choisis">
          {valeur.map((code) => (
            <li key={code}>
              <button type="button" onClick={() => onChange(valeur.filter((c) => c !== code))}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-sm cursor-pointer hover:bg-brand-100"
                aria-label={`Retirer ${departement(code)?.nom ?? code}`}>
                {departement(code)?.nom ?? code} ({code}) <span aria-hidden>✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input id={id} type="text" value={saisie} autoComplete="off" onChange={(e) => setSaisie(e.target.value)}
        disabled={valeur.length >= max}
        placeholder={valeur.length >= max ? `${max} départements maximum` : 'Nom ou numéro (ex. Moselle, 57)'}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (suggestions[0]) ajouter(suggestions[0].code) } }}
        className="w-full min-h-[44px] border border-slate-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50" />
      {suggestions.length > 0 && (
        <ul className="mt-1 border border-slate-200 rounded-lg bg-white shadow-sm divide-y divide-slate-100" role="listbox" aria-label="Départements proposés">
          {suggestions.map((d) => (
            <li key={d.code} role="option" aria-selected={false}>
              <button type="button" onClick={() => ajouter(d.code)} className="w-full text-left min-h-[44px] px-3 text-sm hover:bg-slate-50 cursor-pointer">
                {d.nom} <span className="text-slate-600">({d.code})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
