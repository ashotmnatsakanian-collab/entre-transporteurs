'use client'

import { useEffect, useRef, useState } from 'react'

export interface Ville {
  nom: string
  lat: number
  lng: number
  departement?: string
}

interface Suggestion extends Ville {
  cle: string
}

interface Props {
  label?: string
  placeholder?: string
  valeurInitiale?: string
  required?: boolean
  className?: string
  onSelect: (ville: Ville) => void
  onClear?: () => void
}

// API officielle des communes françaises (data.gouv.fr) — gratuite, sans clé, CORS ouvert.
const ENDPOINT = 'https://api-adresse.data.gouv.fr/search/'

export function VilleAutocomplete({ label, placeholder = 'Ex: Lyon', valeurInitiale = '', required, className, onSelect, onClear }: Props) {
  const [query, setQuery] = useState(valeurInitiale)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [ouvert, setOuvert] = useState(false)
  const [choisie, setChoisie] = useState(!!valeurInitiale)
  const [indexActif, setIndexActif] = useState(-1)
  const conteneurRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (choisie || query.trim().length < 2) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${ENDPOINT}?q=${encodeURIComponent(query.trim())}&type=municipality&limit=10`, { signal: controller.signal })
        if (!res.ok) return
        const data = await res.json() as {
          features: Array<{
            geometry: { coordinates: [number, number] }
            properties: { name: string; postcode?: string; context?: string; id: string }
          }>
        }
        setSuggestions(
          data.features
            // Paris/Lyon/Marseille remontent aussi leurs arrondissements — on garde la commune seule
            .filter((f) => !/arrondissement/i.test(f.properties.name))
            .slice(0, 6)
            .map((f) => ({
              cle: f.properties.id,
              nom: f.properties.name,
              lng: f.geometry.coordinates[0],
              lat: f.geometry.coordinates[1],
              departement: f.properties.context?.split(',')[0]?.trim(),
            }))
        )
        setIndexActif(-1)
        setOuvert(true)
      } catch {
        // requête annulée ou réseau indisponible — pas de suggestions
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, choisie])

  useEffect(() => {
    function fermerSiClicExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) setOuvert(false)
    }
    document.addEventListener('mousedown', fermerSiClicExterieur)
    return () => document.removeEventListener('mousedown', fermerSiClicExterieur)
  }, [])

  function choisir(s: Suggestion) {
    setQuery(s.nom)
    setChoisie(true)
    setOuvert(false)
    setSuggestions([])
    onSelect({ nom: s.nom, lat: s.lat, lng: s.lng, departement: s.departement })
  }

  function surSaisie(valeur: string) {
    setQuery(valeur)
    if (choisie) {
      setChoisie(false)
      onClear?.()
    }
  }

  function surTouche(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!ouvert || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndexActif((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndexActif((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choisir(suggestions[indexActif >= 0 ? indexActif : 0])
    } else if (e.key === 'Escape') {
      setOuvert(false)
    }
  }

  return (
    <div ref={conteneurRef} className={`relative ${className ?? ''}`}>
      {label && <label className="block text-xs text-slate-500 mb-1">{label}</label>}
      <input
        type="text"
        value={query}
        required={required}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => surSaisie(e.target.value)}
        onKeyDown={surTouche}
        onFocus={() => suggestions.length > 0 && setOuvert(true)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {choisie && <span className="absolute right-3 top-[34px] text-green-600 text-sm pointer-events-none">✓</span>}
      {ouvert && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-auto">
          {suggestions.map((s, i) => (
            <li key={s.cle}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choisir(s)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${i === indexActif ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
              >
                <span className="text-slate-800">{s.nom}</span>
                {s.departement && <span className="text-xs text-slate-400">{s.departement}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
