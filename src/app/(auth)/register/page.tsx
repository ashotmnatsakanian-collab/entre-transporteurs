'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Role } from '@prisma/client'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleInitiale = searchParams.get('role') === 'COMMISSIONNAIRE' ? 'COMMISSIONNAIRE' : 'TRANSPORTEUR'
  const [role, setRole] = useState<Role>(roleInitiale)
  const [form, setForm] = useState({ email: '', password: '', nom: '', telephone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erreur lors de l\'inscription')
      setLoading(false)
      return
    }

    await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Créer un compte</h1>
      <p className="text-slate-500 text-sm mb-6">
        {role === 'TRANSPORTEUR'
          ? 'Gratuit pour toujours — aucune carte requise'
          : "1 mois d'essai gratuit, puis 69 €/mois — aucune carte requise aujourd'hui"}
      </p>

      {/* Choix du rôle */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {(['TRANSPORTEUR', 'COMMISSIONNAIRE'] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`border-2 rounded-xl p-4 text-left transition-all ${
              role === r
                ? 'border-brand-600 bg-brand-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-2xl mb-1">{r === 'TRANSPORTEUR' ? '🚛' : '📋'}</div>
            <div className="font-semibold text-sm">{r === 'TRANSPORTEUR' ? 'Transporteur' : 'Commissionnaire'}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {r === 'TRANSPORTEUR' ? 'Je propose des véhicules' : 'Je cherche des transporteurs'}
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
          <input
            type="text"
            value={form.nom}
            onChange={(e) => update('nom', e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone (optionnel)</label>
          <input
            type="tel"
            value={form.telephone}
            onChange={(e) => update('telephone', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="8 caractères min, 1 majuscule, 1 chiffre"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Création…' : role === 'TRANSPORTEUR' ? 'Créer mon compte gratuit' : 'Démarrer mon essai gratuit'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-brand-600 font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  )
}
