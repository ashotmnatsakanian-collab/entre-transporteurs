'use client'

import { useState } from 'react'
import Link from 'next/link'
import { jusquA } from '@/lib/fraicheur'

export function RenouvelerDisponibilite({ token }: { token: string }) {
  const [etat, setEtat] = useState<'attente' | 'envoi' | 'ok' | 'erreur'>('attente')
  const [message, setMessage] = useState('')

  async function renouveler() {
    setEtat('envoi')
    const res = await fetch('/api/disponibilite/renouveler', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setMessage(`Votre disponibilité est renouvelée ${jusquA(data.disponibleJusqua)}.`)
      setEtat('ok')
    } else {
      setMessage(data.error ?? 'Impossible de renouveler.')
      setEtat('erreur')
    }
  }

  if (etat === 'ok') {
    return (
      <div role="status">
        <p className="text-green-800 text-sm mb-4">{message}</p>
        <Link href="/transporteur" className="inline-flex items-center min-h-[44px] text-brand-700 underline">Ouvrir mon espace</Link>
      </div>
    )
  }
  return (
    <div>
      <p className="text-sm text-slate-700 mb-5">Renouvelez votre disponibilité pour continuer à apparaître dans les recherches des commissionnaires.</p>
      <button onClick={renouveler} disabled={etat === 'envoi'}
        className="w-full min-h-[48px] bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
        {etat === 'envoi' ? 'Renouvellement…' : 'Oui, je suis toujours disponible'}
      </button>
      {etat === 'erreur' && <p className="text-red-800 text-sm mt-3" role="alert">{message} <Link href="/transporteur" className="underline">Ouvrir mon espace</Link></p>}
    </div>
  )
}
