'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ActionsSignalement({ id, cibleId, cibleSuspendue }: { id: string; cibleId: string; cibleSuspendue: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function envoyer(url: string, corps: object) {
    setLoading(true)
    await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
    setLoading(false)
    router.refresh()
  }

  async function suspendreEtTraiter() {
    if (!window.confirm('Suspendre le compte signalé et clore ce signalement ?')) return
    await envoyer(`/api/admin/utilisateurs/${cibleId}`, { suspendu: true })
    await envoyer(`/api/admin/signalements/${id}`, { statut: 'TRAITE' })
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3 text-xs">
      {!cibleSuspendue && (
        <button disabled={loading} onClick={suspendreEtTraiter} className="px-3 py-1.5 rounded bg-red-600 text-white">Suspendre le compte et clore</button>
      )}
      <button disabled={loading} onClick={() => envoyer(`/api/admin/signalements/${id}`, { statut: 'TRAITE' })} className="px-3 py-1.5 rounded border border-slate-300">Marquer traité</button>
      <button disabled={loading} onClick={() => envoyer(`/api/admin/signalements/${id}`, { statut: 'REJETE' })} className="px-3 py-1.5 rounded border border-slate-300 text-slate-500">Rejeter</button>
    </div>
  )
}
