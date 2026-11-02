'use client'

import { useCallback, useEffect, useState } from 'react'
import { departementsDeLaZone, libelleZone, type Zone } from '@/lib/zone'

interface Alerte {
  id: string
  villeDepart: string | null
  rayonKm: number
  villeArrivee: string | null
  departements: string[]
}

function libelleAlerte(a: Alerte): string {
  const lieu = a.departements.length > 0 ? `Départements ${a.departements.join(', ')}` : `${a.villeDepart} · ${a.rayonKm} km`
  return `${lieu}${a.villeArrivee ? ` → ${a.villeArrivee}` : ''}`
}

// « Préviens-moi quand un transporteur devient disponible dans le 57 ou le 67 » : alerte par ville + rayon, départements ou région.
export function PanneauAlertes({ zone, villeArrivee, actif, visible }: { zone: Zone; villeArrivee: string | null; actif: boolean; visible: boolean }) {
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [message, setMessage] = useState<{ type: 'ok' | 'erreur'; texte: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const charger = useCallback(async () => {
    const res = await fetch('/api/alertes')
    if (res.ok) setAlertes(await res.json())
  }, [])

  useEffect(() => { charger() }, [charger])

  async function creer() {
    setLoading(true)
    setMessage(null)
    const departements = departementsDeLaZone(zone)
    const corps = departements
      ? { departements, villeArrivee }
      : { inseeDepart: zone.insee, rayonKm: zone.rayonKm, villeArrivee }
    const res = await fetch('/api/alertes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
    setLoading(false)
    if (res.ok) {
      setMessage({ type: 'ok', texte: 'Alerte créée : vous serez prévenu par e-mail.' })
      charger()
    } else {
      const data = await res.json().catch(() => ({}))
      setMessage({ type: 'erreur', texte: data.details?.departements?.[0] ?? data.error ?? "Impossible de créer l'alerte." })
    }
  }

  async function supprimer(id: string) {
    setAlertes((a) => a.filter((x) => x.id !== id))
    await fetch(`/api/alertes/${id}`, { method: 'DELETE' })
  }

  return (
    <div className={`mt-5 pt-4 border-t border-slate-100 ${visible ? 'block' : 'hidden'} md:block`}>
      <button
        type="button"
        onClick={creer}
        disabled={loading || !actif}
        className="w-full min-h-[44px] border border-brand-300 text-brand-800 hover:bg-brand-50 disabled:opacity-50 text-sm font-medium rounded-lg transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        Me prévenir par e-mail
      </button>
      <p className="text-xs text-slate-700 mt-1">
        Pour cette recherche : {libelleZone(zone) || 'zone à choisir'}{villeArrivee ? ` → ${villeArrivee}` : ''}. Vous serez prévenu quand une disponibilité est publiée ou qu’un transporteur se déclare disponible dans la zone.
      </p>
      {message && <p className={`text-xs mt-2 ${message.type === 'ok' ? 'text-green-800' : 'text-red-800'}`} role="status">{message.texte}</p>}

      {alertes.length > 0 && (
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-slate-700 mb-1">Mes alertes ({alertes.length})</h3>
          <ul className="space-y-1">
            {alertes.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-xs text-slate-800 bg-slate-50 rounded px-2 min-h-[44px]">
                <span>{libelleAlerte(a)}</span>
                <button onClick={() => supprimer(a.id)} className="min-h-[44px] min-w-[44px] text-slate-600 hover:text-red-700 cursor-pointer" aria-label={`Supprimer l'alerte ${libelleAlerte(a)}`}>✕</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
