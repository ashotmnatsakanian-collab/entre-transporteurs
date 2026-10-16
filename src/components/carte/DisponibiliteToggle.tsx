'use client'

import { useState } from 'react'

export function DisponibiliteToggle({ disponible: initial }: { disponible: boolean }) {
  const [disponible, setDisponible] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  async function basculer() {
    setLoading(true)
    setErreur('')
    const nouvelEtat = !disponible

    const res = await fetch('/api/transporteurs/disponibilite', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disponible: nouvelEtat }),
    })

    if (res.ok) setDisponible(nouvelEtat)
    else setErreur('Impossible de mettre à jour votre statut')
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-start sm:items-end gap-1">
      <button
        onClick={basculer}
        disabled={loading}
        title="Statut rapide, visible des commissionnaires — indépendant de vos annonces datées"
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
          disponible ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        } disabled:opacity-50`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${disponible ? 'bg-green-500' : 'bg-slate-400'}`} />
        {loading ? 'Mise à jour…' : disponible ? 'Disponible maintenant' : 'Pas disponible maintenant'}
      </button>
      {erreur && <p className="text-xs text-red-600">{erreur}</p>}
    </div>
  )
}
