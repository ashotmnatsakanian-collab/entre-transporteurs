'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export function SouscriptionButton() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  async function sAbonner() {
    setLoading(true)
    setErreur('')
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setErreur(data.error ?? 'Impossible de démarrer la souscription pour le moment.')
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <Link href="/register?role=COMMISSIONNAIRE" className="block w-full bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 transition-colors text-center">
        Commencer l'essai gratuit
      </Link>
    )
  }

  if (session.user.role !== 'COMMISSIONNAIRE') {
    return (
      <p className="text-sm text-slate-400">
        L'abonnement concerne uniquement les commissionnaires — votre compte transporteur est gratuit.
      </p>
    )
  }

  return (
    <div>
      <button
        onClick={sAbonner}
        disabled={loading}
        className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Redirection vers Stripe…' : 'S\'abonner maintenant'}
      </button>
      {erreur && <p className="text-red-600 text-sm mt-2">{erreur}</p>}
    </div>
  )
}
