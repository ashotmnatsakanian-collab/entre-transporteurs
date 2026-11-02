'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ActionsDocument({ id }: { id: string }) {
  const router = useRouter()
  const [chargement, setChargement] = useState(false)
  const [refus, setRefus] = useState(false)
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState('')

  async function decider(corps: { statut: 'VALIDE' } | { statut: 'REFUSE'; motif: string }) {
    setChargement(true)
    setErreur('')
    const res = await fetch(`/api/admin/documents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
    const data = await res.json().catch(() => ({}))
    setChargement(false)
    if (!res.ok) return setErreur(data.details?.motif?.[0] ?? data.error ?? 'Action impossible')
    router.refresh()
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={chargement} onClick={() => decider({ statut: 'VALIDE' })}
          className="min-h-[44px] px-4 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">
          Valider
        </button>
        <button type="button" disabled={chargement} onClick={() => setRefus((v) => !v)}
          className="min-h-[44px] px-4 rounded-lg border border-red-300 text-red-800 text-sm font-semibold hover:bg-red-50 cursor-pointer">
          Refuser…
        </button>
      </div>
      {refus && (
        <div className="space-y-2">
          <label htmlFor={`motif-${id}`} className="block text-sm font-medium text-slate-800">Motif du refus (envoyé au transporteur)</label>
          <input id={`motif-${id}`} value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={300}
            placeholder="Ex : document illisible, date dépassée, mauvais type de document"
            className="w-full min-h-[44px] border border-slate-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button type="button" disabled={chargement || motif.trim().length < 3} onClick={() => decider({ statut: 'REFUSE', motif: motif.trim() })}
            className="min-h-[44px] px-4 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-800 disabled:opacity-50 cursor-pointer">
            Confirmer le refus
          </button>
        </div>
      )}
      {erreur && <p className="text-sm text-red-800" role="alert">{erreur}</p>}
    </div>
  )
}
