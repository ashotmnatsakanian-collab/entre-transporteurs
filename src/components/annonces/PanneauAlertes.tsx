'use client'

import { useCallback, useEffect, useState } from 'react'

interface Alerte {
  id: string
  villeDepart: string
  rayonKm: number
  villeArrivee: string | null
}

interface Criteres {
  villeDepart: string
  latDepart: number
  lngDepart: number
  rayonKm: number
  villeArrivee: string | null
}

export function PanneauAlertes({ criteres, actif, visible }: { criteres: Criteres; actif: boolean; visible: boolean }) {
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
    const res = await fetch('/api/alertes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criteres),
    })
    setLoading(false)
    if (res.ok) {
      setMessage({ type: 'ok', texte: 'Alerte créée : vous serez prévenu par e-mail.' })
      charger()
    } else {
      const data = await res.json().catch(() => ({}))
      setMessage({ type: 'erreur', texte: data.error ?? "Impossible de créer l'alerte." })
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
        className="w-full border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-50 text-sm font-medium py-2 rounded-lg transition-colors"
      >
        🔔 Me prévenir par e-mail
      </button>
      <p className="text-[11px] text-slate-400 mt-1">Pour cette recherche : {criteres.villeDepart}, {criteres.rayonKm} km{criteres.villeArrivee ? ` → ${criteres.villeArrivee}` : ''}.</p>
      {message && <p className={`text-xs mt-2 ${message.type === 'ok' ? 'text-green-600' : 'text-red-600'}`} role="status">{message.texte}</p>}

      {alertes.length > 0 && (
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-slate-500 mb-1">Mes alertes ({alertes.length})</h3>
          <ul className="space-y-1">
            {alertes.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1.5">
                <span>{a.villeDepart} · {a.rayonKm} km{a.villeArrivee ? ` → ${a.villeArrivee}` : ''}</span>
                <button onClick={() => supprimer(a.id)} className="text-slate-400 hover:text-red-600" aria-label="Supprimer l'alerte">✕</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
