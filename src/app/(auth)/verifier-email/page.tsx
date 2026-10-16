'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// Confirmation par clic volontaire (et non au chargement) : les scanners de liens des
// messageries ouvrent les URL automatiquement et consommeraient le jeton à notre insu.
function VerificationForm() {
  const token = useSearchParams().get('token') ?? ''
  const [etat, setEtat] = useState<'attente' | 'envoi' | 'ok' | 'erreur'>('attente')

  async function confirmer() {
    setEtat('envoi')
    const res = await fetch('/api/auth/verifier-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    setEtat(res.ok ? 'ok' : 'erreur')
  }

  if (etat === 'ok') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Adresse confirmée ✅</h1>
        <p className="text-sm text-slate-500">Vous pouvez désormais publier, contacter et être contacté.</p>
        <Link href="/" className="block w-full text-center bg-brand-600 text-white font-semibold py-2.5 rounded-lg hover:bg-brand-700">Accéder à mon espace</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Confirmer mon adresse e-mail</h1>
      {etat === 'erreur' && (
        <p className="text-red-600 text-sm" role="alert">Ce lien est invalide ou a expiré. Connectez-vous pour en recevoir un nouveau.</p>
      )}
      <button
        onClick={confirmer}
        disabled={!token || etat === 'envoi'}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {etat === 'envoi' ? 'Confirmation…' : 'Confirmer mon adresse'}
      </button>
    </div>
  )
}

export default function VerifierEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerificationForm />
    </Suspense>
  )
}
