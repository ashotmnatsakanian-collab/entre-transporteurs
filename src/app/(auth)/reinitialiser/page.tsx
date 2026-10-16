'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ReinitialisationForm() {
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [fait, setFait] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    if (password !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    const res = await fetch('/api/auth/reinitialiser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    setLoading(false)
    if (res.ok) {
      setFait(true)
      return
    }
    const data = await res.json().catch(() => ({}))
    const detail = data.details ? (Object.values(data.details).flat()[0] as string | undefined) : undefined
    setErreur(detail ?? data.error ?? 'Une erreur est survenue.')
  }

  if (!token) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-800">Lien invalide</h1>
        <p className="text-sm text-slate-500">Ce lien de réinitialisation est incomplet.</p>
        <Link href="/mot-de-passe-oublie" className="text-sm text-brand-600 hover:underline">Refaire une demande</Link>
      </div>
    )
  }

  if (fait) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Mot de passe modifié ✅</h1>
        <p className="text-sm text-slate-500">Toutes vos autres sessions ont été fermées par sécurité. Vous pouvez vous connecter.</p>
        <Link href="/login" className="block w-full text-center bg-brand-600 text-white font-semibold py-2.5 rounded-lg hover:bg-brand-700">Se connecter</Link>
      </div>
    )
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Nouveau mot de passe</h1>
      <input
        type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder="8 caractères min, majuscule, minuscule, chiffre"
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <input
        type="password" required autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)}
        placeholder="Confirmez le mot de passe"
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {erreur && <p className="text-red-600 text-sm" role="alert">{erreur}</p>}
      <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
        {loading ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}

export default function ReinitialiserPage() {
  return (
    <Suspense fallback={null}>
      <ReinitialisationForm />
    </Suspense>
  )
}
