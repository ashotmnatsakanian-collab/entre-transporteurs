'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import type { TypeVehicule } from '@prisma/client'
import { TYPE_VEHICULE_LABELS } from '@/types'

interface Transporteur {
  id: string
  userId: string
  raisonSociale: string
  description: string | null
  latitude: number
  longitude: number
  disponible: boolean
  zonesCirculation: string[]
  user: { id: string; nom: string; telephone: string | null; email: string }
  vehicules: Array<{ id: string; type: TypeVehicule; chargeUtile: number }>
  distance_km?: number
}

interface Props {
  transporteurs: Transporteur[]
  currentUserId?: string
  height?: string
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.setView(center, map.getZoom()) }, [center, map])
  return null
}

export default function CarteInteractive({ transporteurs: initial, currentUserId, height = '100%' }: Props) {
  const { data: session } = useSession()
  const [transporteurs, setTransporteurs] = useState<Transporteur[]>(initial)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io({ path: '/api/socket', auth: { userId: session?.user.id } })
    socketRef.current = socket
    socket.emit('join-carte')

    socket.on('disponibilite-change', ({ userId, disponible }: { userId: string; disponible: boolean }) => {
      setTransporteurs((prev) => prev.map((t) => t.userId === userId ? { ...t, disponible } : t))
    })

    return () => { socket.disconnect() }
  }, [session])

  return (
    <div style={{ height }} className="w-full">
      <MapContainer
        center={[46.6034, 1.8883]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {transporteurs.map((t) => (
          <CircleMarker
            key={t.id}
            center={[t.latitude, t.longitude]}
            radius={8}
            pathOptions={{
              fillColor: t.disponible ? '#22c55e' : '#f87171',
              fillOpacity: 0.9,
              color: 'white',
              weight: 2,
            }}
          >
            <Popup maxWidth={280}>
              <div className="p-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${t.disponible ? 'bg-green-500' : 'bg-red-400'}`} />
                  <strong className="text-slate-800">{t.raisonSociale}</strong>
                </div>
                {t.description && <p className="text-xs text-slate-500 mb-2">{t.description}</p>}
                <div className="text-xs text-slate-600 space-y-0.5">
                  <p>👤 {t.user.nom}</p>
                  {t.user.telephone && <p>📞 {t.user.telephone}</p>}
                  {t.distance_km !== undefined && <p>📍 {t.distance_km} km</p>}
                  <p>🚚 {t.vehicules.length} véhicule(s)</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.vehicules.slice(0, 3).map((v) => (
                      <span key={v.id} className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                        {TYPE_VEHICULE_LABELS[v.type]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href={`/profils/${t.id}`} className="text-brand-600 text-xs underline">
                    Voir le profil
                  </Link>
                  {currentUserId && currentUserId !== t.userId && (
                    <Link href={`/profils/${t.id}`} className="text-brand-600 text-xs underline">
                      · Contacter
                    </Link>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
