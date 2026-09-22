'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TYPE_VEHICULE_LABELS, type AnnonceRecherche } from '@/types'
import { BadgeNote } from '@/components/avis/Etoiles'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr', { day: 'numeric', month: 'short' })
}

function CarteAnnonce({ a }: { a: AnnonceRecherche }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function contacter(destinataireId: string) {
    setLoading(true)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinataireId }),
    })
    const data = await res.json()
    if (res.ok) router.push(`/messages/${data.id}`)
    else setLoading(false)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profils/${a.transporteurId}`} className="font-semibold text-slate-800 hover:text-brand-700 hover:underline">
              {a.raisonSociale}
            </Link>
            {a.verifie && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">✅ Vérifié</span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.disponible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
              {a.disponible ? 'Disponible' : 'Indisponible'}
            </span>
            <span className="text-xs text-slate-400">📍 {a.distance_km} km</span>
            <BadgeNote moyenne={a.note_moyenne} total={a.nb_avis} />
          </div>
          <div className="text-sm text-slate-700 mt-1 font-medium">
            {a.villeDepart} → {a.villeArrivee || 'Toutes directions'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Dispo du {formatDate(a.dateDisponibilite)}
            {a.dateDisponibiliteFin && ` au ${formatDate(a.dateDisponibiliteFin)}`}
            {a.vehiculeType && ` · ${TYPE_VEHICULE_LABELS[a.vehiculeType]}`}
            {a.vehiculeChargeUtile && ` · ${a.vehiculeChargeUtile.toLocaleString('fr')} kg`}
          </div>
          {a.commentaire && <p className="text-xs text-slate-500 mt-1 italic">"{a.commentaire}"</p>}
        </div>
        <button onClick={() => contacter(a.userId)} disabled={loading}
          className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors shrink-0"
        >
          {loading ? '…' : `💬 Contacter ${a.nom.split(' ')[0]}`}
        </button>
      </div>
    </div>
  )
}

export function RechercheAnnoncesClient() {
  const [filtres, setFiltres] = useState({
    lat: 48.8566,
    lng: 2.3522,
    rayonKm: 150,
    date: '',
    villeArrivee: '',
  })
  const [resultats, setResultats] = useState<AnnonceRecherche[]>([])
  const [loading, setLoading] = useState(false)
  const [rechercheFaite, setRechercheFaite] = useState(false)
  const [erreur, setErreur] = useState('')

  const rechercher = useCallback(async () => {
    setLoading(true)
    setErreur('')

    const params = new URLSearchParams({
      lat: String(filtres.lat),
      lng: String(filtres.lng),
      rayonKm: String(filtres.rayonKm),
      ...(filtres.date && { date: filtres.date }),
      ...(filtres.villeArrivee && { villeArrivee: filtres.villeArrivee }),
    })

    const res = await fetch(`/api/annonces?${params}`)
    if (res.ok) {
      setResultats(await res.json())
    } else {
      const data = await res.json()
      setErreur(data.error ?? 'Erreur lors de la recherche')
    }
    setRechercheFaite(true)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtres.lat, filtres.lng, filtres.rayonKm, filtres.date, filtres.villeArrivee])

  // Chargement automatique au montage — c'est un tableau d'affichage, pas une recherche à froid
  useEffect(() => {
    rechercher()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r bg-white overflow-y-auto p-4 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); rechercher() }} className="space-y-4">
          <h2 className="font-semibold text-slate-800">Où et quand ?</h2>

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
            <label className="block text-xs text-slate-500 mb-1">Disponible à la date du (optionnel)</label>
            <input type="date" value={filtres.date}
              onChange={(e) => setFiltres((p) => ({ ...p, date: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Destination souhaitée (optionnel)</label>
            <input value={filtres.villeArrivee}
              onChange={(e) => setFiltres((p) => ({ ...p, villeArrivee: e.target.value }))}
              placeholder="Ex: Marseille"
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Recherche…' : '🔍 Rechercher'}
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {erreur && <p className="text-red-600 text-sm text-center pt-4">{erreur}</p>}
        {loading && resultats.length === 0 && !erreur && (
          <p className="text-slate-400 text-sm text-center pt-16">Chargement des annonces…</p>
        )}
        {!loading && rechercheFaite && resultats.length === 0 && !erreur && (
          <p className="text-slate-400 text-sm text-center pt-16">Aucune annonce pour ces critères. Élargissez le rayon ou la date.</p>
        )}
        {resultats.map((a) => (
          <CarteAnnonce key={a.id} a={a} />
        ))}
      </div>
    </div>
  )
}
