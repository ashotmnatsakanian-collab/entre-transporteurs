'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TypeVehicule } from '@prisma/client'
import { TYPE_VEHICULE_LABELS, type AnnonceAvecVehicule } from '@/types'

interface VehiculeOption {
  id: string
  type: TypeVehicule
  chargeUtile: number
}

interface Props {
  annoncesInitiales: AnnonceAvecVehicule[]
  vehicules: VehiculeOption[]
  positionDefaut: { lat: number; lng: number }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr', { day: 'numeric', month: 'short', year: 'numeric' })
}

function estExpiree(a: AnnonceAvecVehicule) {
  const fin = a.dateDisponibiliteFin ?? a.dateDisponibilite
  return new Date(fin).getTime() < Date.now() - 24 * 60 * 60 * 1000
}

export function GestionAnnonces({ annoncesInitiales, vehicules, positionDefaut }: Props) {
  const router = useRouter()
  const [annonces, setAnnonces] = useState(annoncesInitiales)
  const [formOuvert, setFormOuvert] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [suppressionId, setSuppressionId] = useState<string | null>(null)

  const [form, setForm] = useState({
    vehiculeId: '',
    villeDepart: '',
    latDepart: positionDefaut.lat,
    lngDepart: positionDefaut.lng,
    villeArrivee: '',
    dateDisponibilite: new Date().toISOString().slice(0, 10),
    dateDisponibiliteFin: '',
    commentaire: '',
  })

  async function publier(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    setLoading(true)

    const res = await fetch('/api/annonces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehiculeId: form.vehiculeId || null,
        villeDepart: form.villeDepart,
        latDepart: Number(form.latDepart),
        lngDepart: Number(form.lngDepart),
        villeArrivee: form.villeArrivee || null,
        dateDisponibilite: form.dateDisponibilite,
        dateDisponibiliteFin: form.dateDisponibiliteFin || null,
        commentaire: form.commentaire || null,
      }),
    })

    if (res.ok) {
      const nouvelle = await res.json()
      setAnnonces((prev) => [nouvelle, ...prev])
      setFormOuvert(false)
      setForm((p) => ({ ...p, villeDepart: '', villeArrivee: '', commentaire: '' }))
      router.refresh()
    } else {
      const data = await res.json()
      setErreur(data.error ?? 'Erreur lors de la publication')
    }
    setLoading(false)
  }

  async function toggleActive(id: string, active: boolean) {
    setAnnonces((prev) => prev.map((a) => (a.id === id ? { ...a, active } : a)))
    await fetch(`/api/annonces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
  }

  async function supprimer(id: string) {
    setSuppressionId(null)
    setAnnonces((prev) => prev.filter((a) => a.id !== id))
    await fetch(`/api/annonces/${id}`, { method: 'DELETE' })
  }

  return (
    <div className="space-y-4">
      {!formOuvert ? (
        <button
          onClick={() => setFormOuvert(true)}
          className="w-full sm:w-auto bg-brand-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          📣 Publier une disponibilité
        </button>
      ) : (
        <form onSubmit={publier} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Nouvelle disponibilité</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Ville de départ</label>
              <input required value={form.villeDepart}
                onChange={(e) => setForm((p) => ({ ...p, villeDepart: e.target.value }))}
                placeholder="Ex: Lyon"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Véhicule concerné</label>
              <select value={form.vehiculeId}
                onChange={(e) => setForm((p) => ({ ...p, vehiculeId: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Non précisé</option>
                {vehicules.map((v) => (
                  <option key={v.id} value={v.id}>
                    {TYPE_VEHICULE_LABELS[v.type]} · {v.chargeUtile.toLocaleString('fr')} kg
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Latitude départ</label>
              <input type="number" step="0.0001" required value={form.latDepart}
                onChange={(e) => setForm((p) => ({ ...p, latDepart: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Longitude départ</label>
              <input type="number" step="0.0001" required value={form.lngDepart}
                onChange={(e) => setForm((p) => ({ ...p, lngDepart: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Destination souhaitée (optionnel)</label>
            <input value={form.villeArrivee}
              onChange={(e) => setForm((p) => ({ ...p, villeArrivee: e.target.value }))}
              placeholder="Vide = toutes directions"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Disponible à partir du</label>
              <input type="date" required min={new Date().toISOString().slice(0, 10)} value={form.dateDisponibilite}
                onChange={(e) => setForm((p) => ({ ...p, dateDisponibilite: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Jusqu'au (optionnel)</label>
              <input type="date" min={form.dateDisponibilite} value={form.dateDisponibiliteFin}
                onChange={(e) => setForm((p) => ({ ...p, dateDisponibiliteFin: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Commentaire (optionnel)</label>
            <textarea value={form.commentaire}
              onChange={(e) => setForm((p) => ({ ...p, commentaire: e.target.value }))}
              rows={2}
              placeholder="Ex: libre dès 14h, hayon disponible…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Publication…' : 'Publier'}
            </button>
            <button type="button" onClick={() => setFormOuvert(false)}
              className="text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {annonces.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-10">
            Aucune disponibilité publiée. Publiez votre prochain trajet retour pour être trouvé par un commissionnaire.
          </p>
        )}
        {annonces.map((a) => {
          const expiree = a.active && estExpiree(a)
          return (
            <div key={a.id} className={`bg-white border rounded-xl p-4 ${a.active && !expiree ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-800">
                    📍 {a.villeDepart} → {a.villeArrivee || 'Toutes directions'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Du {formatDate(a.dateDisponibilite)}
                    {a.dateDisponibiliteFin && ` au ${formatDate(a.dateDisponibiliteFin)}`}
                    {a.vehicule && ` · ${TYPE_VEHICULE_LABELS[a.vehicule.type]} · ${a.vehicule.chargeUtile.toLocaleString('fr')} kg`}
                  </div>
                  {a.commentaire && <p className="text-xs text-slate-500 mt-1">{a.commentaire}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {expiree ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700">Expirée</span>
                  ) : (
                    <button
                      onClick={() => toggleActive(a.id, !a.active)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        a.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {a.active ? 'Active' : 'Pourvue'}
                    </button>
                  )}
                  {suppressionId === a.id ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500">Confirmer ?</span>
                      <button onClick={() => supprimer(a.id)} className="text-red-600 font-medium hover:underline">Oui</button>
                      <button onClick={() => setSuppressionId(null)} className="text-slate-500 hover:underline">Non</button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setSuppressionId(a.id)}
                      className="text-xs px-2.5 py-1 rounded-full text-red-500 hover:bg-red-50"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
