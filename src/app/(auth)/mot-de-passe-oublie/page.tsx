'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErreur('')
    const res = await fetch('/api/auth/mot-de-passe-oublie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (res.ok) setEnvoye(true)
    else if (res.status === 429) setErreur('Trop de demandes. Réessayez dans une heure.')
    else setErreur('Adresse e-mail invalide.')
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Mot de passe oublié</h1>
      {envoye ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 bg-green-50 border border-green-200 rounded-lg px-3 py-3">
            Si un compte existe pour <strong>{email}</strong>, un e-mail contenant un lien de réinitialisation (valable 1 heure) vient d'être envoyé.
          </p>
          <Link href="/login" className="text-sm text-brand-600 hover:underline">← Retour à la connexion</Link>
        </div>
      ) : (
        <form onSubmit={soumettre} className="space-y-4">
          <p className="text-sm text-slate-500">Saisissez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@example.fr"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {erreur && <p className="text-red-600 text-sm" role="alert">{erreur}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>
          <Link href="/login" className="block text-center text-sm text-slate-500 hover:underline">← Retour à la connexion</Link>
        </form>
      )}
    </>
  )
}
