'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { TYPE_VEHICULE_LABELS, type BesoinRecherche } from '@/types'
import { VilleAutocomplete } from '@/components/ui/VilleAutocomplete'

const LAT_DEFAUT = 46.6034
const LNG_DEFAUT = 1.8883

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180
  const d = 6371 * Math.acos(Math.min(1, Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lng2 - lng1) * rad) + Math.sin(lat1 * rad) * Math.sin(lat2 * rad)))
  return Math.round(d * 10) / 10
}

function CarteBesoin({ b, nouveau }: { b: BesoinRecherche; nouveau: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  async function repondre() {
    setLoading(true)
    setErreur('')
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinataireId: b.userId }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) router.push(`/messages/${data.id}`)
    else {
      setErreur(data.error ?? 'Impossible de contacter ce commissionnaire.')
      setLoading(false)
    }
  }

  return (
    <div className={`bg-white border rounded-xl p-4 transition-all ${nouveau ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {nouveau && <span className="text-[11px] font-semibold text-white bg-brand-600 px-2 py-0.5 rounded-full animate-pulse">🆕 Nouveau</span>}
            <span className="font-semibold text-slate-800">{b.raisonSociale}</span>
            {b.verifie && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">✅ SIRET vérifié</span>}
            <span className="text-xs text-slate-400">📍 {b.distance_km} km de votre recherche</span>
          </div>
          <div className="text-sm text-slate-700 mt-1 font-medium">📦 {b.villeDepart} → {b.villeArrivee}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Enlèvement le {formatDate(b.dateEnlevement)}
            {b.typeVehicule && ` · ${TYPE_VEHICULE_LABELS[b.typeVehicule]}`}
            {b.poidsKg && ` · ${b.poidsKg.toLocaleString('fr-FR')} kg`}
          </div>
          {b.description && <p className="text-xs text-slate-500 mt-1 italic">« {b.description} »</p>}
          {erreur && <p className="text-xs text-red-600 mt-1" role="alert">{erreur}</p>}
        </div>
        <button onClick={repondre} disabled={loading}
          className="text-sm bg-brand-600 text-white px-3 py-2 sm:py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 shrink-0 w-full sm:w-auto">
          {loading ? '…' : '💬 Répondre'}
        </button>
      </div>
    </div>
  )
}

export function BoardBesoins({ latitude, longitude }: { latitude: number; longitude: number }) {
  const positionRenseignee = !(latitude === LAT_DEFAUT && longitude === LNG_DEFAUT)
  // undefined = résolution du nom de la ville de base en cours
  const [villeBase, setVilleBase] = useState<string | null | undefined>(positionRenseignee ? undefined : null)
  const [filtres, setFiltres] = useState({ lat: latitude, lng: longitude, rayonKm: 150 })
  const filtresRef = useRef(filtres)
  useEffect(() => { filtresRef.current = filtres }, [filtres])

  const [resultats, setResultats] = useState<BesoinRecherche[]>([])
  const [nouveaux, setNouveaux] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [fait, setFait] = useState(false)
  const [erreur, setErreur] = useState('')
  const [filtresOuverts, setFiltresOuverts] = useState(false)

  useEffect(() => {
    if (!positionRenseignee) return
    fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${longitude}&lat=${latitude}`)
      .then((r) => r.json())
      .then((d) => setVilleBase(d.features?.[0]?.properties?.city ?? null))
      .catch(() => setVilleBase(null))
  }, [latitude, longitude, positionRenseignee])

  const rechercher = useCallback(async () => {
    setLoading(true)
    setErreur('')
    const params = new URLSearchParams({ lat: String(filtres.lat), lng: String(filtres.lng), rayonKm: String(filtres.rayonKm) })
    const res = await fetch(`/api/besoins?${params}`)
    if (res.ok) setResultats(await res.json())
    else setErreur((await res.json().catch(() => ({}))).error ?? 'Erreur lors de la recherche')
    setFait(true)
    setLoading(false)
    setFiltresOuverts(false)
  }, [filtres.lat, filtres.lng, filtres.rayonKm])

  useEffect(() => { rechercher() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  // Flux en direct : un nouveau besoin proche apparaît sans recharger
  useEffect(() => {
    const socket = io({ path: '/api/socket' })
    socket.emit('join-besoins')
    socket.on('besoin-created', (b: Omit<BesoinRecherche, 'distance_km'> & { latDepart: number; lngDepart: number }) => {
      const f = filtresRef.current
      const distance = distanceKm(f.lat, f.lng, b.latDepart, b.lngDepart)
      if (distance > f.rayonKm) return
      setResultats((prev) => [{ ...b, distance_km: distance }, ...prev.filter((x) => x.id !== b.id)])
      setNouveaux((prev) => new Set(prev).add(b.id))
      setTimeout(() => setNouveaux((prev) => { const n = new Set(prev); n.delete(b.id); return n }), 8000)
    })
    return () => { socket.disconnect() }
  }, [])

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r bg-white md:overflow-y-auto p-4 shrink-0">
        <button type="button" onClick={() => setFiltresOuverts((o) => !o)} className="md:hidden w-full flex items-center justify-between text-sm font-medium text-slate-700">
          <span>🔎 Modifier la zone</span><span className="text-slate-400">{filtresOuverts ? '▲' : '▼'}</span>
        </button>
        <form onSubmit={(e) => { e.preventDefault(); rechercher() }} className={`space-y-4 mt-4 md:mt-0 ${filtresOuverts ? 'block' : 'hidden'} md:block`}>
          <h2 className="font-semibold text-slate-800">Où cherchez-vous du fret ?</h2>
          {villeBase !== undefined && (
            <VilleAutocomplete label="Autour de la ville de" placeholder="Tapez une ville" valeurInitiale={villeBase ?? ''}
              onSelect={(v) => setFiltres((p) => ({ ...p, lat: v.lat, lng: v.lng }))} />
          )}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Rayon (km)</label>
            <div className="flex items-center gap-2">
              <input type="range" min={10} max={500} step={10} value={filtres.rayonKm} className="flex-1"
                onChange={(e) => setFiltres((p) => ({ ...p, rayonKm: Number(e.target.value) }))} />
              <span className="text-sm font-medium text-slate-700 w-14 text-right">{filtres.rayonKm} km</span>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50">
            {loading ? 'Recherche…' : '🔍 Rechercher'}
          </button>
          {!positionRenseignee && (
            <p className="text-xs text-slate-400">Astuce : renseignez votre ville de base dans <Link href="/transporteur/profil" className="underline">Mon profil</Link> pour que ce fret s'affiche automatiquement autour de vous.</p>
          )}
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {erreur && <p className="text-red-600 text-sm text-center pt-4">{erreur}</p>}
        {loading && resultats.length === 0 && !erreur && <p className="text-slate-400 text-sm text-center pt-16">Chargement…</p>}
        {!loading && fait && resultats.length === 0 && !erreur && (
          <p className="text-slate-400 text-sm text-center pt-16">Aucun fret dans cette zone pour le moment. Élargissez le rayon — vous serez aussi prévenu par e-mail quand un besoin apparaît près de chez vous.</p>
        )}
        {resultats.map((b) => <CarteBesoin key={b.id} b={b} nouveau={nouveaux.has(b.id)} />)}
      </div>
    </div>
  )
}
