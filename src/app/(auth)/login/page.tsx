'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Activé uniquement sur une instance de démonstration (NEXT_PUBLIC_DEMO_MODE=true au build).
// Ne jamais l'activer en production réelle : ces comptes sont publics.
const MODE_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const MOT_DE_PASSE_DEMO = 'Password123!'
const COMPTES_DEMO = [
  { label: '🚛 Essayer en tant que transporteur', email: 'jean.dupont@dupont-transport.fr' },
  { label: '📋 Essayer en tant que commissionnaire', email: 'francois@tlf-paris.fr' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function connecter(emailSaisi: string, motDePasse: string) {
    setError('')
    setLoading(true)

    const res = await signIn('credentials', {
      email: emailSaisi,
      password: motDePasse,
      redirect: false,
    })

    if (res?.error) {
      setLoading(false)
      setError('Email ou mot de passe incorrect.')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    connecter(email, password)
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Connexion</h1>

      {MODE_DEMO && (
        <div className="mb-6 space-y-2">
          <p className="text-sm text-slate-500">Découvrez la plateforme avec des données de démonstration :</p>
          {COMPTES_DEMO.map((c) => (
            <button
              key={c.email}
              type="button"
              disabled={loading}
              onClick={() => connecter(c.email, MOT_DE_PASSE_DEMO)}
              className="w-full border-2 border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-50 font-semibold py-2.5 rounded-lg transition-colors"
            >
              {c.label}
            </button>
          ))}
          <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
            <div className="flex-1 border-t" /> ou avec votre compte <div className="flex-1 border-t" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="vous@example.fr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-brand-600 font-medium hover:underline">
          Créer un compte
        </Link>
      </p>
    </>
  )
}
