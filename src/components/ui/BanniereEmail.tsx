'use client'

import { useState } from 'react'

export function BanniereEmail() {
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'envoye' | 'erreur'>('repos')

  async function renvoyer() {
    setEtat('envoi')
    const res = await fetch('/api/auth/renvoyer-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setEtat(res.ok ? 'envoye' : 'erreur')
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      <span>✉️ Confirmez votre adresse e-mail pour publier, contacter et être contacté.</span>
      {etat === 'envoye' ? (
        <span className="font-medium">E-mail envoyé — vérifiez votre boîte de réception.</span>
      ) : (
        <button onClick={renvoyer} disabled={etat === 'envoi'} className="underline font-medium hover:opacity-80 disabled:opacity-50">
          {etat === 'envoi' ? 'Envoi…' : etat === 'erreur' ? 'Réessayer' : "Renvoyer l'e-mail"}
        </button>
      )}
    </div>
  )
}
