'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { StatutAbonnement } from '@prisma/client'

export function EcranGating({ statut }: { statut: StatutAbonnement }) {
  const [loading, setLoading] = useState(false)

  async function sAbonner() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md text-center">
        <div className="text-5xl mb-4">{statut === 'PAST_DUE' ? '⚠️' : '🔒'}</div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">
          {statut === 'PAST_DUE' ? 'Paiement en échec' : 'Abonnement terminé'}
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          {statut === 'PAST_DUE'
            ? 'Votre dernière facture n\'a pas pu être prélevée. Mettez à jour votre moyen de paiement pour continuer.'
            : 'Votre essai ou abonnement a expiré. Souscrivez pour accéder à toutes les fonctionnalités.'}
        </p>
        <div className="text-2xl font-bold text-slate-800 mb-1">69 €<span className="text-base text-slate-400 font-normal">/mois TTC</span></div>
        <p className="text-slate-400 text-xs mb-6">Accès illimité à toutes les fonctionnalités</p>

        <button
          onClick={sAbonner}
          disabled={loading}
          className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors mb-3"
        >
          {loading ? 'Redirection…' : 'Activer mon abonnement'}
        </button>
        <Link href="/login" className="text-sm text-slate-400 hover:text-slate-600">
          Se connecter avec un autre compte
        </Link>
      </div>
    </div>
  )
}
