'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TransporteurProfil } from '@prisma/client'
import { VilleAutocomplete } from '@/components/ui/VilleAutocomplete'

const LAT_DEFAUT = 46.6034
const LNG_DEFAUT = 1.8883

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
    zonesCirculation: profil?.zonesCirculation ?? ([] as string[]),
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ siretVerifie: boolean; avertissement: string | null } | null>(null)
  const [error, setError] = useState('')
  // undefined = en cours de résolution ; null = position jamais renseignée
  const [villeBase, setVilleBase] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    const positionRenseignee = profil && !(profil.latitude === LAT_DEFAUT && profil.longitude === LNG_DEFAUT)
    if (!profil || !positionRenseignee) {
      setVilleBase(null)
      return
    }
    // Géocodage inverse : retrouve le nom de la commune pour l'afficher à la place des coordonnées
    fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${profil.longitude}&lat=${profil.latitude}`)
      .then((r) => r.json())
      .then((d) => setVilleBase(d.features?.[0]?.properties?.city ?? null))
      .catch(() => setVilleBase(null))
  }, [profil])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(null)
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

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const detail = data.details ? (Object.values(data.details).flat()[0] as string | undefined) : undefined
      setError(detail ?? data.error ?? 'Erreur lors de la sauvegarde')
    } else {
      setSuccess({ siretVerifie: data.verificationSiret === 'ACTIF', avertissement: data.avertissement ?? null })
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
        <label className="block text-sm font-medium text-slate-700 mb-1">Ville de base *</label>
        {villeBase !== undefined && (
          <VilleAutocomplete
            placeholder="Tapez votre ville (ex: Lyon)"
            valeurInitiale={villeBase ?? ''}
            onSelect={(v) => setForm((p) => ({ ...p, latitude: v.lat, longitude: v.lng }))}
          />
        )}
        <p className="text-xs text-slate-400 mt-1">
          {villeBase
            ? 'Cette position détermine où vous apparaissez sur la carte et dans les recherches.'
            : 'Position non renseignée : vous apparaissez actuellement au centre de la France. Choisissez votre ville.'}
        </p>
      </div>

      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      {success && (
        <div className="text-sm space-y-1" role="status">
          <p className="text-green-600">Profil mis à jour avec succès !</p>
          {success.siretVerifie && <p className="text-blue-700">✅ SIRET vérifié auprès du répertoire officiel : le badge s'affiche sur votre profil.</p>}
          {success.avertissement && <p className="text-amber-700">{success.avertissement}</p>}
        </div>
      )}

      <button
        type="submit" disabled={loading}
        className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Enregistrement…' : 'Enregistrer le profil'}
      </button>
    </form>
  )
}
