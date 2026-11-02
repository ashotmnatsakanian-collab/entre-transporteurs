'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { TypeVehicule } from '@prisma/client'
import { TYPE_VEHICULE_LABELS, type AnnonceRecherche } from '@/types'
import { BadgeNote } from '@/components/avis/Etoiles'
import { VilleAutocomplete } from '@/components/ui/VilleAutocomplete'
import { SelecteurZone } from '@/components/recherche/SelecteurZone'
import { PanneauAlertes } from './PanneauAlertes'
import { ZONE_PAR_DEFAUT, annonceDansZone, distanceKm, zoneComplete, zonePourQuery, type Zone } from '@/lib/zone'
import { ilYA } from '@/lib/fraicheur'
import { libelleDepartement } from '@/lib/referentiel-geo'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr', { day: 'numeric', month: 'short' })
}

function CarteAnnonce({ a, nouvelle }: { a: AnnonceRecherche; nouvelle?: boolean }) {
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
    <div className={`bg-white border rounded-xl p-4 hover:shadow-sm transition-all ${nouvelle ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200 hover:border-brand-300'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {nouvelle && (
              <span className="text-[11px] font-semibold text-white bg-brand-600 px-2 py-0.5 rounded-full animate-pulse">
                🆕 Nouvelle
              </span>
            )}
            <Link href={`/profils/${a.transporteurId}`} className="font-semibold text-slate-800 hover:text-brand-700 hover:underline">
              {a.raisonSociale}
            </Link>
            {a.verifie && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700" title="Établissement existant et en activité au répertoire officiel">✅ SIRET vérifié</span>
            )}
            {/* Une annonce publiée = une disponibilité datée ; le badge ne signale que le « disponible maintenant » */}
            {a.disponible && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">🟢 Disponible maintenant</span>
            )}
            <BadgeNote moyenne={a.note_moyenne} total={a.nb_avis} />
          </div>
          <div className="text-sm text-slate-700 mt-1 font-medium">
            {a.villeDepart}{a.departementDepart ? ` (${libelleDepartement(a.departementDepart)})` : ''} → {a.villeArrivee || 'Toutes directions'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Dispo du {formatDate(a.dateDisponibilite)}
            {a.dateDisponibiliteFin && ` au ${formatDate(a.dateDisponibiliteFin)}`}
            {a.vehiculeType && ` · ${TYPE_VEHICULE_LABELS[a.vehiculeType]}`}
            {a.vehiculeChargeUtile && ` · ${a.vehiculeChargeUtile.toLocaleString('fr')} kg`}
            {a.distance_km !== null && ` · à ${a.distance_km} km`}
            {` · publiée ${ilYA(a.createdAt)}`}
          </div>
          {a.commentaire && <p className="text-xs text-slate-500 mt-1 italic">"{a.commentaire}"</p>}
        </div>
        <button onClick={() => contacter(a.userId)} disabled={loading}
          className="min-h-[44px] text-sm font-medium bg-brand-600 text-white px-4 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors shrink-0 w-full sm:w-auto cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {loading ? '…' : `Contacter ${a.nom.split(' ')[0]}`}
        </button>
      </div>
    </div>
  )
}

export function RechercheAnnoncesClient() {
  const [zone, setZone] = useState<Zone>({ ...ZONE_PAR_DEFAUT, rayonKm: 150, lat: 48.8566, lng: 2.3522, villeNom: 'Paris' })
  const [filtres, setFiltres] = useState({ date: '', villeArrivee: '', typeVehicule: '' as TypeVehicule | '', disponibleMaintenant: false })
  const [filtresOuverts, setFiltresOuverts] = useState(false)
  const reference = useRef({ zone, filtres })
  useEffect(() => { reference.current = { zone, filtres } }, [zone, filtres])

  const [resultats, setResultats] = useState<AnnonceRecherche[]>([])
  const [nouvellesIds, setNouvellesIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [rechercheFaite, setRechercheFaite] = useState(false)
  const [erreur, setErreur] = useState('')

  const rechercher = useCallback(async () => {
    const { zone: z, filtres: f } = reference.current
    if (!zoneComplete(z)) return
    setLoading(true)
    setErreur('')

    const params = new URLSearchParams({
      ...zonePourQuery(z),
      ...(f.date && { date: f.date }),
      ...(f.villeArrivee && { villeArrivee: f.villeArrivee }),
      ...(f.typeVehicule && { typeVehicule: f.typeVehicule }),
      ...(f.disponibleMaintenant && { disponibleMaintenant: '1' }),
    })

    const res = await fetch(`/api/annonces?${params}`)
    if (res.ok) {
      setResultats(await res.json())
    } else {
      const data = await res.json().catch(() => ({}))
      setErreur(data.error ?? 'Erreur lors de la recherche')
    }
    setRechercheFaite(true)
    setLoading(false)
    setFiltresOuverts(false)
  }, [])

  // Chargement automatique au montage — c'est un tableau d'affichage, pas une recherche à froid
  useEffect(() => {
    rechercher()
  }, [rechercher])

  // Tableau vivant : une nouvelle annonce publiée pendant qu'on regarde apparaît
  // aussitôt si elle correspond aux critères actuels, sans recharger la page.
  useEffect(() => {
    const socket = io({ path: '/api/socket' })
    socket.emit('join-annonces')

    socket.on('annonce-created', (a: Omit<AnnonceRecherche, 'distance_km'>) => {
      const { zone: z, filtres: f } = reference.current
      if (!annonceDansZone(a, z)) return
      if (f.villeArrivee && a.villeArrivee && !a.villeArrivee.toLowerCase().includes(f.villeArrivee.toLowerCase())) return
      if (f.typeVehicule && a.vehiculeType !== f.typeVehicule) return
      if (f.disponibleMaintenant && !a.disponible) return
      if (f.date) {
        const date = new Date(f.date)
        const debut = new Date(a.dateDisponibilite)
        const fin = a.dateDisponibiliteFin ? new Date(a.dateDisponibiliteFin) : debut
        if (date < debut || date > fin) return
      }

      const distance = z.mode === 'ville' && z.lat !== undefined && z.lng !== undefined ? distanceKm(z.lat, z.lng, a.latDepart, a.lngDepart) : null
      setResultats((prev) => [{ ...a, distance_km: distance }, ...prev.filter((r) => r.id !== a.id)])
      setNouvellesIds((prev) => new Set(prev).add(a.id))
      setTimeout(() => {
        setNouvellesIds((prev) => {
          const next = new Set(prev)
          next.delete(a.id)
          return next
        })
      }, 8000)
    })

    return () => { socket.disconnect() }
  }, [])

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r bg-white md:overflow-y-auto p-4 shrink-0">
        <button
          type="button"
          onClick={() => setFiltresOuverts((o) => !o)}
          className="md:hidden w-full flex items-center justify-between text-sm font-medium text-slate-700"
        >
          <span>Modifier la recherche</span>
          <span className="text-slate-600">{filtresOuverts ? '▲' : '▼'}</span>
        </button>
        <form onSubmit={(e) => { e.preventDefault(); rechercher() }} className={`space-y-4 mt-4 md:mt-0 ${filtresOuverts ? 'block' : 'hidden'} md:block`}>
          <h2 className="font-semibold text-slate-900">Où et quand ?</h2>

          <SelecteurZone zone={zone} onChange={setZone} villeInitiale="Paris" />

          <div>
            <label htmlFor="filtre-date" className="block text-sm font-medium text-slate-700 mb-1">Disponible à la date du (facultatif)</label>
            <input id="filtre-date" type="date" value={filtres.date}
              onChange={(e) => setFiltres((p) => ({ ...p, date: e.target.value }))}
              className="w-full min-h-[44px] border border-slate-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label htmlFor="filtre-vehicule" className="block text-sm font-medium text-slate-700 mb-1">Type de véhicule</label>
            <select id="filtre-vehicule" value={filtres.typeVehicule}
              onChange={(e) => setFiltres((p) => ({ ...p, typeVehicule: e.target.value as TypeVehicule | '' }))}
              className="w-full min-h-[44px] border border-slate-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Tous les types</option>
              {Object.values(TypeVehicule).map((t) => <option key={t} value={t}>{TYPE_VEHICULE_LABELS[t]}</option>)}
            </select>
          </div>

          <VilleAutocomplete
            label="Destination souhaitée (facultatif)"
            placeholder="Ex : Marseille"
            onSelect={(v) => setFiltres((p) => ({ ...p, villeArrivee: v.nom }))}
            onClear={() => setFiltres((p) => ({ ...p, villeArrivee: '' }))}
          />

          <label className="flex items-center gap-3 min-h-[44px] text-sm text-slate-800 cursor-pointer">
            <input type="checkbox" checked={filtres.disponibleMaintenant}
              onChange={(e) => setFiltres((p) => ({ ...p, disponibleMaintenant: e.target.checked }))} className="h-5 w-5" />
            Disponible maintenant uniquement
          </label>

          <button type="submit" disabled={loading || !zoneComplete(zone)}
            className="w-full min-h-[44px] bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {loading ? 'Recherche…' : 'Rechercher'}
          </button>
        </form>
        <PanneauAlertes zone={zone} villeArrivee={filtres.villeArrivee || null} actif={zoneComplete(zone)} visible={filtresOuverts} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {erreur && <p className="text-red-600 text-sm text-center pt-4">{erreur}</p>}
        {loading && resultats.length === 0 && !erreur && (
          <p className="text-slate-700 text-sm text-center pt-16">Chargement des disponibilités…</p>
        )}
        {!loading && rechercheFaite && resultats.length === 0 && !erreur && (
          <p className="text-slate-700 text-sm text-center pt-16">Aucune disponibilité pour ces critères. Élargissez la zone ou la date, ou créez une alerte pour être prévenu.</p>
        )}
        {resultats.map((a) => (
          <CarteAnnonce key={a.id} a={a} nouvelle={nouvellesIds.has(a.id)} />
        ))}
      </div>
    </div>
  )
}
