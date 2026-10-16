'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TypeVehicule } from '@prisma/client'
import { TYPE_VEHICULE_LABELS, type BesoinAvecInfos } from '@/types'
import { VilleAutocomplete } from '@/components/ui/VilleAutocomplete'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const champ = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

export function GestionBesoins({ besoinsInitiaux }: { besoinsInitiaux: BesoinAvecInfos[] }) {
  const router = useRouter()
  const [besoins, setBesoins] = useState(besoinsInitiaux)
  const [formOuvert, setFormOuvert] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [suppressionId, setSuppressionId] = useState<string | null>(null)

  const [form, setForm] = useState({
    villeDepart: '',
    latDepart: null as number | null,
    lngDepart: null as number | null,
    villeArrivee: '',
    dateEnlevement: new Date().toISOString().slice(0, 10),
    typeVehicule: '' as TypeVehicule | '',
    poidsKg: '',
    description: '',
  })

  async function publier(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    if (form.latDepart === null || form.lngDepart === null) return setErreur("Choisissez le lieu d'enlèvement dans la liste de suggestions.")
    if (!form.villeArrivee) return setErreur('Choisissez la ville de livraison dans la liste de suggestions.')

    setLoading(true)
    const res = await fetch('/api/besoins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        villeDepart: form.villeDepart,
        latDepart: form.latDepart,
        lngDepart: form.lngDepart,
        villeArrivee: form.villeArrivee,
        dateEnlevement: form.dateEnlevement,
        typeVehicule: form.typeVehicule || null,
        poidsKg: form.poidsKg ? Number(form.poidsKg) : null,
        description: form.description || null,
      }),
    })
    setLoading(false)
    if (res.ok) {
      const nouveau: BesoinAvecInfos = await res.json()
      setBesoins((prev) => [nouveau, ...prev.filter((x) => x.id !== nouveau.id)])
      setFormOuvert(false)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      const detail = data.details ? (Object.values(data.details).flat()[0] as string | undefined) : undefined
      setErreur(detail ?? data.error ?? 'Erreur lors de la publication')
    }
  }

  async function basculer(id: string, active: boolean) {
    setBesoins((prev) => prev.map((b) => (b.id === id ? { ...b, active } : b)))
    await fetch(`/api/besoins/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) })
  }

  async function supprimer(id: string) {
    setSuppressionId(null)
    setBesoins((prev) => prev.filter((b) => b.id !== id))
    await fetch(`/api/besoins/${id}`, { method: 'DELETE' })
  }

  return (
    <div className="space-y-4">
      {!formOuvert ? (
        <button onClick={() => setFormOuvert(true)} className="w-full sm:w-auto bg-brand-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-brand-700">
          📦 Publier un besoin de transport
        </button>
      ) : (
        <form onSubmit={publier} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Nouveau besoin</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <VilleAutocomplete label="Lieu d'enlèvement" placeholder="Tapez une ville" required
              onSelect={(v) => setForm((p) => ({ ...p, villeDepart: v.nom, latDepart: v.lat, lngDepart: v.lng }))}
              onClear={() => setForm((p) => ({ ...p, villeDepart: '', latDepart: null, lngDepart: null }))} />
            <VilleAutocomplete label="Lieu de livraison" placeholder="Tapez une ville" required
              onSelect={(v) => setForm((p) => ({ ...p, villeArrivee: v.nom }))}
              onClear={() => setForm((p) => ({ ...p, villeArrivee: '' }))} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Date d'enlèvement</label>
              <input type="date" required min={new Date().toISOString().slice(0, 10)} value={form.dateEnlevement} className={champ}
                onChange={(e) => setForm((p) => ({ ...p, dateEnlevement: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Véhicule souhaité (optionnel)</label>
              <select value={form.typeVehicule} className={champ} onChange={(e) => setForm((p) => ({ ...p, typeVehicule: e.target.value as TypeVehicule | '' }))}>
                <option value="">Tous types</option>
                {Object.values(TypeVehicule).map((t) => <option key={t} value={t}>{TYPE_VEHICULE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Poids (kg, optionnel)</label>
              <input type="number" min={1} max={60000} value={form.poidsKg} placeholder="Ex: 12000" className={champ}
                onChange={(e) => setForm((p) => ({ ...p, poidsKg: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Description (optionnel)</label>
            <textarea rows={2} maxLength={500} value={form.description} placeholder="Ex: 18 palettes d'électroménager, hayon nécessaire…" className={champ}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          {erreur && <p className="text-red-600 text-sm" role="alert">{erreur}</p>}
          <div className="flex gap-3">
            <button disabled={loading} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50">{loading ? 'Publication…' : 'Publier'}</button>
            <button type="button" onClick={() => setFormOuvert(false)} className="text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-100">Annuler</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {besoins.length === 0 && <p className="text-slate-400 text-sm text-center py-10">Aucun besoin publié.</p>}
        {besoins.map((b) => (
          <div key={b.id} className={`bg-white border rounded-xl p-4 ${b.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="font-medium text-slate-800">📦 {b.villeDepart} → {b.villeArrivee}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Enlèvement le {formatDate(b.dateEnlevement)}
                  {b.typeVehicule && ` · ${TYPE_VEHICULE_LABELS[b.typeVehicule]}`}
                  {b.poidsKg && ` · ${b.poidsKg.toLocaleString('fr-FR')} kg`}
                </div>
                {b.description && <p className="text-xs text-slate-500 mt-1">{b.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0 text-xs">
                <button onClick={() => basculer(b.id, !b.active)}
                  className={`px-2.5 py-1 rounded-full font-medium ${b.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {b.active ? 'Ouvert' : 'Pourvu'}
                </button>
                {suppressionId === b.id ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-500">Confirmer ?</span>
                    <button onClick={() => supprimer(b.id)} className="text-red-600 font-medium hover:underline">Oui</button>
                    <button onClick={() => setSuppressionId(null)} className="text-slate-500 hover:underline">Non</button>
                  </span>
                ) : (
                  <button onClick={() => setSuppressionId(b.id)} className="px-2.5 py-1 rounded-full text-red-500 hover:bg-red-50">Supprimer</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
