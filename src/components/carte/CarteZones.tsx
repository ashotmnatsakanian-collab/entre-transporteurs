'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { io } from 'socket.io-client'
import { ResultatTransporteur } from '@/components/recherche/ResultatTransporteur'
import { libelleDepartement } from '@/lib/referentiel-geo'

interface Zone {
  code: string
  nom: string
  latitude: number
  longitude: number
  nb: number
}

// Carte par département : un compteur par zone, jamais une position individuelle.
// Cliquer une zone (ou son bouton dans la liste) affiche les transporteurs disponibles du département.
export default function CarteZones() {
  const [zones, setZones] = useState<Zone[]>([])
  const [total, setTotal] = useState(0)
  const [selection, setSelection] = useState<string | null>(null)
  const [transporteurs, setTransporteurs] = useState<Array<Record<string, unknown> & { id: string }>>([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const selectionRef = useRef<string | null>(null)
  selectionRef.current = selection

  const chargerZones = useCallback(async () => {
    const res = await fetch('/api/carte')
    if (!res.ok) return setErreur((await res.json().catch(() => ({}))).error ?? 'Carte indisponible')
    const data = await res.json()
    setZones(data.zones)
    setTotal(data.total)
  }, [])

  const chargerTransporteurs = useCallback(async (code: string) => {
    setChargement(true)
    setErreur('')
    const res = await fetch('/api/recherche', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ departements: [code] }) })
    const data = await res.json().catch(() => null)
    if (res.ok && Array.isArray(data)) setTransporteurs(data)
    else setErreur(data?.error ?? 'Liste indisponible')
    setChargement(false)
  }, [])

  useEffect(() => { chargerZones() }, [chargerZones])

  // Temps réel : un transporteur qui se déclare disponible, change de lieu ou expire met les compteurs à jour
  useEffect(() => {
    const socket = io({ path: '/api/socket' })
    socket.emit('join-carte')
    let attente: ReturnType<typeof setTimeout> | undefined
    socket.on('carte-change', () => {
      clearTimeout(attente)
      attente = setTimeout(() => {
        chargerZones()
        if (selectionRef.current) chargerTransporteurs(selectionRef.current)
      }, 600)
    })
    return () => { clearTimeout(attente); socket.disconnect() }
  }, [chargerZones, chargerTransporteurs])

  function choisir(code: string) {
    setSelection(code)
    chargerTransporteurs(code)
  }

  const icone = (z: Zone) => {
    const taille = Math.min(64, 34 + Math.sqrt(z.nb) * 8)
    const actif = z.code === selection
    return L.divIcon({
      className: '',
      iconSize: [taille, taille],
      iconAnchor: [taille / 2, taille / 2],
      html: `<div style="width:${taille}px;height:${taille}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font:700 ${taille > 44 ? 16 : 14}px system-ui;color:#fff;background:${actif ? '#1e3a8a' : '#2563eb'};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)" aria-hidden="true">${z.nb}</div>`,
    })
  }

  return (
    <div className="h-full flex flex-col lg:flex-row min-h-0">
      <div className="h-72 lg:h-auto lg:flex-1 relative shrink-0">
        <MapContainer center={[46.6034, 1.8883]} zoom={6} style={{ height: '100%', width: '100%' }} className="z-0">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {zones.map((z) => (
            <Marker key={z.code} position={[z.latitude, z.longitude]} icon={icone(z)} title={`${libelleDepartement(z.code)} : ${z.nb} disponible(s)`}
              eventHandlers={{ click: () => choisir(z.code) }} keyboard={false} />
          ))}
        </MapContainer>
      </div>

      <div className="lg:w-[28rem] border-t lg:border-t-0 lg:border-l bg-slate-50 overflow-y-auto min-h-0 flex-1 lg:flex-none">
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-800" aria-live="polite">
            <strong>{total}</strong> transporteur{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''} maintenant, dans <strong>{zones.length}</strong> département{zones.length > 1 ? 's' : ''}.
          </p>

          {zones.length === 0 && !erreur && <p className="text-sm text-slate-700">Aucun transporteur disponible pour le moment.</p>}

          <ul className="grid grid-cols-2 gap-2" aria-label="Départements avec des transporteurs disponibles">
            {zones.map((z) => (
              <li key={z.code}>
                <button type="button" onClick={() => choisir(z.code)} aria-pressed={z.code === selection}
                  className={`w-full min-h-[44px] px-3 rounded-lg border text-left text-sm cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 ${z.code === selection ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'}`}>
                  <span className="font-medium">{z.nom}</span> <span className={z.code === selection ? 'text-brand-100' : 'text-slate-600'}>({z.code})</span>
                  <span className="block text-xs">{z.nb} disponible{z.nb > 1 ? 's' : ''}</span>
                </button>
              </li>
            ))}
          </ul>

          {erreur && <p className="text-sm text-red-800" role="alert">{erreur}</p>}

          {selection && (
            <section aria-labelledby="titre-zone">
              <h2 id="titre-zone" className="font-semibold text-slate-900 mb-2">{libelleDepartement(selection)}</h2>
              {chargement && <p className="text-sm text-slate-700">Chargement…</p>}
              <div className="space-y-3">
                {transporteurs.map((t) => (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <ResultatTransporteur key={t.id} transporteur={t as any} />
                ))}
              </div>
              {!chargement && transporteurs.length === 0 && !erreur && <p className="text-sm text-slate-700">Plus aucun transporteur disponible ici pour le moment.</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
