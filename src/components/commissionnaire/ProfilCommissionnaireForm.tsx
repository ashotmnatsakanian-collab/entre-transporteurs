'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  profil: { siret: string; raisonSociale: string } | null
}

export function ProfilCommissionnaireForm({ profil }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    raisonSociale: profil?.raisonSociale ?? '',
    siret: profil?.siret ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    const res = await fetch('/api/commissionnaires', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, siret: form.siret.replace(/\s/g, '') }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erreur lors de la sauvegarde')
    } else {
      setSuccess(true)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-slate-200 rounded-xl p-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Raison sociale *</label>
        <input
          type="text" required
          value={form.raisonSociale}
          onChange={(e) => setForm((p) => ({ ...p, raisonSociale: e.target.value }))}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">SIRET (14 chiffres) *</label>
        <input
          type="text" required maxLength={14}
          value={form.siret}
          onChange={(e) => setForm((p) => ({ ...p, siret: e.target.value.replace(/\D/g, '') }))}
          placeholder="12345678900001"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p className="text-xs text-slate-400 mt-1">Les transporteurs voient votre raison sociale lorsque vous les contactez.</p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">Profil mis à jour avec succès !</p>}

      <button
        type="submit" disabled={loading}
        className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Enregistrement…' : 'Enregistrer le profil'}
      </button>
    </form>
  )
}
