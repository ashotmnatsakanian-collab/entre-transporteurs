'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ActionsUtilisateur({ id, verifie, suspendu }: { id: string; verifie: boolean; suspendu: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function appliquer(donnees: { verifie?: boolean; suspendu?: boolean }, confirmation?: string) {
    if (confirmation && !window.confirm(confirmation)) return
    setLoading(true)
    await fetch(`/api/admin/utilisateurs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donnees),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <button disabled={loading} onClick={() => appliquer({ verifie: !verifie })}
        className={`px-2 py-1 rounded border ${verifie ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-300 text-slate-600'}`}>
        {verifie ? '✅ Vérifié (retirer)' : 'Marquer vérifié'}
      </button>
      <button disabled={loading}
        onClick={() => appliquer({ suspendu: !suspendu }, suspendu ? undefined : 'Suspendre ce compte ? Il sera déconnecté immédiatement.')}
        className={`px-2 py-1 rounded border ${suspendu ? 'bg-red-600 text-white border-red-600' : 'border-red-300 text-red-600'}`}>
        {suspendu ? 'Réactiver' : 'Suspendre'}
      </button>
    </div>
  )
}
