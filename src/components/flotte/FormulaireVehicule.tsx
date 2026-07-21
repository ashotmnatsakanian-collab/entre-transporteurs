'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Vehicule } from '@prisma/client'
import { TypeVehicule, Specificite } from '@prisma/client'
import { TYPE_VEHICULE_LABELS, SPECIFICITE_LABELS } from '@/types'

interface Props {
  vehicule?: Vehicule | null
}

export function FormulaireVehicule({ vehicule }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    type: vehicule?.type ?? 'PORTEUR' as TypeVehicule,
    specificites: vehicule?.specificites ?? [] as Specificite[],
    chargeUtile: vehicule?.chargeUtile ?? 0,
    longueur: vehicule?.longueur ?? null as number | null,
    largeur: vehicule?.largeur ?? null as number | null,
    hauteur: vehicule?.hauteur ?? null as number | null,
    immatriculation: vehicule?.immatriculation ?? '',
    actif: vehicule?.actif ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suppression, setSuppression] = useState(false)

  function toggleSpec(s: Specificite) {
    setForm((prev) => ({
      ...prev,
      specificites: prev.specificites.includes(s)
        ? prev.specificites.filter((x) => x !== s)
        : [...prev.specificites, s],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const url = vehicule ? `/api/vehicules/${vehicule.id}` : '/api/vehicules'
    const method = vehicule ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        chargeUtile: Number(form.chargeUtile),
        longueur: form.longueur ? Number(form.longueur) : null,
        largeur: form.largeur ? Number(form.largeur) : null,
        hauteur: form.hauteur ? Number(form.hauteur) : null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erreur lors de la sauvegarde')
    } else {
      router.push('/transporteur/flotte')
      router.refresh()
    }
    setLoading(false)
  }

  async function supprimer() {
    if (!vehicule || !suppression) return
    setLoading(true)
    await fetch(`/api/vehicules/${vehicule.id}`, { method: 'DELETE' })
    router.push('/transporteur/flotte')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-slate-200 rounded-xl p-6">
      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Type de véhicule *</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.values(TypeVehicule).map((t) => (
            <button
              key={t} type="button"
              onClick={() => setForm((p) => ({ ...p, type: t }))}
              className={`border rounded-lg px-2 py-2 text-xs font-medium transition-all ${
                form.type === t ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {TYPE_VEHICULE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Charge utile */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Charge utile (kg) *</label>
        <input
          type="number" min={0} step={100}
          value={form.chargeUtile || ''}
          onChange={(e) => setForm((p) => ({ ...p, chargeUtile: Number(e.target.value) }))}
          required
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Dimensions */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Dimensions (cm)</label>
        <div className="grid grid-cols-3 gap-3">
          {(['longueur', 'largeur', 'hauteur'] as const).map((dim) => (
            <div key={dim}>
              <label className="text-xs text-slate-500 block mb-1 capitalize">{dim === 'longueur' ? 'Longueur' : dim === 'largeur' ? 'Largeur' : 'Hauteur'}</label>
              <input
                type="number" min={0}
                value={form[dim] ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, [dim]: e.target.value ? Number(e.target.value) : null }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Spécificités */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Spécificités</label>
        <div className="flex flex-wrap gap-2">
          {Object.values(Specificite).map((s) => (
            <button
              key={s} type="button"
              onClick={() => toggleSpec(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                form.specificites.includes(s)
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400'
              }`}
            >
              {SPECIFICITE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Immatriculation */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Immatriculation</label>
        <input
          type="text" maxLength={20}
          value={form.immatriculation}
          onChange={(e) => setForm((p) => ({ ...p, immatriculation: e.target.value }))}
          placeholder="AB-123-CD"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Actif */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox" id="actif"
          checked={form.actif}
          onChange={(e) => setForm((p) => ({ ...p, actif: e.target.checked }))}
          className="rounded"
        />
        <label htmlFor="actif" className="text-sm text-slate-700">Véhicule actif (visible sur la carte)</label>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex items-center justify-between gap-3 pt-2">
        {vehicule && (
          <div className="flex items-center gap-2">
            {!suppression ? (
              <button type="button" onClick={() => setSuppression(true)} className="text-red-500 text-sm hover:underline">
                Supprimer
              </button>
            ) : (
              <>
                <span className="text-sm text-slate-500">Confirmer ?</span>
                <button type="button" onClick={supprimer} className="text-red-600 font-medium text-sm hover:underline">Oui</button>
                <button type="button" onClick={() => setSuppression(false)} className="text-slate-500 text-sm hover:underline">Non</button>
              </>
            )}
          </div>
        )}
        <div className="flex gap-3 ml-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Sauvegarde…' : vehicule ? 'Enregistrer' : 'Ajouter le véhicule'}
          </button>
        </div>
      </div>
    </form>
  )
}
