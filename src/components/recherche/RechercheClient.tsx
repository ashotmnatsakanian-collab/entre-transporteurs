'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { TypeVehicule, Specificite } from '@prisma/client'
import { TYPE_VEHICULE_LABELS, SPECIFICITE_LABELS } from '@/types'
import { ResultatTransporteur } from './ResultatTransporteur'

const CarteInteractive = dynamic(() => import('@/components/carte/CarteInteractive'), { ssr: false })

interface ResultatRecherche {
  id: string
  userId: string
  raisonSociale: string
  description: string | null
  latitude: number
  longitude: number
  disponible: boolean
  zonesCirculation: string[]
  distance_km: number
  user: { id: string; nom: string; telephone: string | null; email: string }
  vehicules: Array<{ id: string; type: TypeVehicule; chargeUtile: number; specificites: Specificite[] }>
}

export default function RechercheClient() {
  const [filtres, setFiltres] = useState({
    lat: 48.8566,
    lng: 2.3522,
    rayonKm: 100,
    typeVehicule: '' as TypeVehicule | '',
    chargeUtileMin: '',
    longueurMin: '',
    specificites: [] as Specificite[],
    disponibleSeulement: false,
  })
  const [resultats, setResultats] = useState<ResultatRecherche[]>([])
  const [loading, setLoading] = useState(false)
  const [rechercheFaite, setRechercheFaite] = useState(false)
  const [vue, setVue] = useState<'liste' | 'carte'>('liste')

  function toggleSpec(s: Specificite) {
    setFiltres((prev) => ({
      ...prev,
      specificites: prev.specificites.includes(s)
        ? prev.specificites.filter((x) => x !== s)
        : [...prev.specificites, s],
    }))
  }

  async function rechercher(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/recherche', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: Number(filtres.lat),
        lng: Number(filtres.lng),
        rayonKm: Number(filtres.rayonKm),
        typeVehicule: filtres.typeVehicule || undefined,
        chargeUtileMin: filtres.chargeUtileMin ? Number(filtres.chargeUtileMin) : undefined,
        longueurMin: filtres.longueurMin ? Number(filtres.longueurMin) : undefined,
        specificites: filtres.specificites,
        disponibleSeulement: filtres.disponibleSeulement,
      }),
    })

    const data = await res.json()
    setResultats(Array.isArray(data) ? data : [])
    setRechercheFaite(true)
    setLoading(false)
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      {/* Panneau filtres */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r bg-white overflow-y-auto p-4 shrink-0">
        <form onSubmit={rechercher} className="space-y-4">
          <h2 className="font-semibold text-slate-800">Filtres</h2>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Latitude</label>
              <input type="number" step="0.0001" value={filtres.lat}
                onChange={(e) => setFiltres((p) => ({ ...p, lat: Number(e.target.value) }))}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Longitude</label>
              <input type="number" step="0.0001" value={filtres.lng}
                onChange={(e) => setFiltres((p) => ({ ...p, lng: Number(e.target.value) }))}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Rayon (km)</label>
            <div className="flex items-center gap-2">
              <input type="range" min={10} max={500} step={10} value={filtres.rayonKm}
                onChange={(e) => setFiltres((p) => ({ ...p, rayonKm: Number(e.target.value) }))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-slate-700 w-14 text-right">{filtres.rayonKm} km</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Type de véhicule</label>
            <select value={filtres.typeVehicule}
              onChange={(e) => setFiltres((p) => ({ ...p, typeVehicule: e.target.value as TypeVehicule | '' }))}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Tous les types</option>
              {Object.values(TypeVehicule).map((t) => (
                <option key={t} value={t}>{TYPE_VEHICULE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Charge utile min (kg)</label>
              <input type="number" min={0} value={filtres.chargeUtileMin}
                onChange={(e) => setFiltres((p) => ({ ...p, chargeUtileMin: e.target.value }))}
                placeholder="Ex: 12000"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Longueur min (cm)</label>
              <input type="number" min={0} value={filtres.longueurMin}
                onChange={(e) => setFiltres((p) => ({ ...p, longueurMin: e.target.value }))}
                placeholder="Ex: 1360"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-2">Spécificités requises</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(Specificite).map((s) => (
                <button key={s} type="button" onClick={() => toggleSpec(s)}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-all ${
                    filtres.specificites.includes(s)
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {SPECIFICITE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={filtres.disponibleSeulement}
              onChange={(e) => setFiltres((p) => ({ ...p, disponibleSeulement: e.target.checked }))}
              className="rounded"
            />
            Disponibles uniquement
          </label>

          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Recherche…' : '🔍 Rechercher'}
          </button>
        </form>
      </div>

      {/* Résultats */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Onglets liste / carte */}
        <div className="flex border-b bg-white px-4 gap-4">
          {(['liste', 'carte'] as const).map((v) => (
            <button key={v} onClick={() => setVue(v)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                vue === v ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {v === 'liste' ? `📋 Liste (${resultats.length})` : '🗺️ Carte'}
            </button>
          ))}
        </div>

        {vue === 'liste' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!rechercheFaite && (
              <p className="text-slate-400 text-sm text-center pt-16">Renseignez vos critères et lancez une recherche.</p>
            )}
            {rechercheFaite && resultats.length === 0 && (
              <p className="text-slate-400 text-sm text-center pt-16">Aucun résultat pour ces critères. Élargissez le rayon ou modifiez les filtres.</p>
            )}
            {resultats.map((t) => (
              <ResultatTransporteur key={t.id} transporteur={t} />
            ))}
          </div>
        ) : (
          <div className="flex-1">
            <CarteInteractive transporteurs={resultats} height="100%" />
          </div>
        )}
      </div>
    </div>
  )
}
