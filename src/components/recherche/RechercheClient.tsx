'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { TypeVehicule, Specificite } from '@prisma/client'
import { TYPE_VEHICULE_LABELS, SPECIFICITE_LABELS } from '@/types'
import { ResultatTransporteur } from './ResultatTransporteur'
import { SelecteurZone } from './SelecteurZone'
import { ZONE_PAR_DEFAUT, zoneComplete, zonePourApi, type Zone } from '@/lib/zone'

const CarteInteractive = dynamic(() => import('@/components/carte/CarteInteractive'), { ssr: false })

interface ResultatRecherche {
  id: string
  userId: string
  raisonSociale: string
  description: string | null
  latitude: number
  longitude: number
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
  nom: string
  telephone: string | null
  vehicules: Array<{ id: string; type: TypeVehicule; chargeUtile: number; specificites: Specificite[] }>
}

export default function RechercheClient() {
  const [zone, setZone] = useState<Zone>({ ...ZONE_PAR_DEFAUT, lat: 48.8566, lng: 2.3522, villeNom: 'Paris' })
  const [filtres, setFiltres] = useState({
    typeVehicule: '' as TypeVehicule | '',
    chargeUtileMin: '',
    longueurMin: '',
    specificites: [] as Specificite[],
  })
  const [erreur, setErreur] = useState('')
  const [filtresOuverts, setFiltresOuverts] = useState(true)
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
    setErreur('')

    const res = await fetch('/api/recherche', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...zonePourApi(zone),
        typeVehicule: filtres.typeVehicule || undefined,
        chargeUtileMin: filtres.chargeUtileMin ? Number(filtres.chargeUtileMin) : undefined,
        longueurMin: filtres.longueurMin ? Number(filtres.longueurMin) : undefined,
        specificites: filtres.specificites,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) setErreur(data?.error ?? 'Erreur lors de la recherche')
    setResultats(Array.isArray(data) ? data : [])
    setRechercheFaite(true)
    setLoading(false)
    setFiltresOuverts(false)
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      {/* Panneau filtres */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r bg-white md:overflow-y-auto p-4 shrink-0">
        <button
          type="button"
          onClick={() => setFiltresOuverts((o) => !o)}
          className="md:hidden w-full flex items-center justify-between text-sm font-medium text-slate-700"
        >
          <span>🔎 Filtres de recherche</span>
          <span className="text-slate-400">{filtresOuverts ? '▲' : '▼'}</span>
        </button>
        <form onSubmit={rechercher} className={`space-y-4 mt-4 md:mt-0 ${filtresOuverts ? 'block' : 'hidden'} md:block`}>
          <h2 className="font-semibold text-slate-800">Filtres</h2>

          <SelecteurZone zone={zone} onChange={setZone} villeInitiale="Paris" />

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

          <p className="text-xs text-slate-700">Seuls les transporteurs disponibles maintenant sont affichés, les plus récemment mis à jour en premier.</p>

          <button type="submit" disabled={loading || !zoneComplete(zone)}
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
              <p className="text-slate-700 text-sm text-center pt-16">Choisissez une zone et lancez une recherche.</p>
            )}
            {erreur && <p className="text-red-800 text-sm text-center pt-4" role="alert">{erreur}</p>}
            {rechercheFaite && !erreur && resultats.length === 0 && (
              <p className="text-slate-700 text-sm text-center pt-16">Aucun transporteur disponible dans cette zone pour le moment. Élargissez la zone, ou créez une alerte pour être prévenu.</p>
            )}
            {resultats.map((t) => (
              <ResultatTransporteur key={t.id} transporteur={t} />
            ))}
          </div>
        ) : (
          <div className="flex-1">
            <CarteInteractive
              transporteurs={resultats.map((t) => ({
                ...t,
                disponible: true,
                user: { id: t.userId, nom: t.nom, telephone: t.telephone },
              }))}
              height="100%"
            />
          </div>
        )}
      </div>
    </div>
  )
}
