'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TransporteurProfil } from '@prisma/client'

const DEPARTEMENTS_FRANCE = [
  '01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19',
  '21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39',
  '40','41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56','57','58',
  '59','60','61','62','63','64','65','66','67','68','69','70','71','72','73','74','75','76','77',
  '78','79','80','81','82','83','84','85','86','87','88','89','90','91','92','93','94','95',
  '2A','2B','971','972','973','974','976',
]

interface Props {
  profil: TransporteurProfil | null
}

export function ProfilTransporteurForm({ profil }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    siret: profil?.siret ?? '',
    raisonSociale: profil?.raisonSociale ?? '',
    description: profil?.description ?? '',
    latitude: profil?.latitude ?? 46.6034,
    longitude: profil?.longitude ?? 1.8883,
    zonesCirculation: profil?.zonesCirculation ?? [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function toggleZone(dep: string) {
    setForm((prev) => ({
      ...prev,
      zonesCirculation: prev.zonesCirculation.includes(dep)
        ? prev.zonesCirculation.filter((z) => z !== dep)
        : [...prev.zonesCirculation, dep],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/transporteurs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        siret: form.siret.replace(/\s/g, ''),
      }),
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
      <div className="grid sm:grid-cols-2 gap-4">
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
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Décrivez votre activité, vos spécialités…"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Point de base (latitude / longitude)</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number" step="0.0001"
            value={form.latitude}
            onChange={(e) => setForm((p) => ({ ...p, latitude: Number(e.target.value) }))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="number" step="0.0001"
            value={form.longitude}
            onChange={(e) => setForm((p) => ({ ...p, longitude: Number(e.target.value) }))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">Utilisez <a href="https://www.latlong.net/" target="_blank" rel="noopener noreferrer" className="underline">latlong.net</a> pour trouver vos coordonnées.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Zones de circulation — départements ({form.zonesCirculation.length} sélectionné(s))
        </label>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3">
          {DEPARTEMENTS_FRANCE.map((dep) => (
            <button
              key={dep} type="button"
              onClick={() => toggleZone(dep)}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-all ${
                form.zonesCirculation.includes(dep)
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {dep}
            </button>
          ))}
        </div>
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
