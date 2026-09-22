'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Etoiles, BadgeNote } from './Etoiles'

interface Avis {
  id: string
  note: number
  commentaire: string | null
  createdAt: string
  auteur: { nom: string }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function SectionAvis({ transporteurId, peutNoter }: { transporteurId: string; peutNoter: boolean }) {
  const router = useRouter()
  const [avis, setAvis] = useState<Avis[]>([])
  const [moyenne, setMoyenne] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [chargement, setChargement] = useState(true)

  const [formOuvert, setFormOuvert] = useState(false)
  const [note, setNote] = useState(5)
  const [commentaire, setCommentaire] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  async function charger() {
    const res = await fetch(`/api/avis?transporteurId=${transporteurId}`)
    if (res.ok) {
      const data = await res.json()
      setAvis(data.avis)
      setMoyenne(data.moyenne)
      setTotal(data.total)
    }
    setChargement(false)
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transporteurId])

  async function envoyerAvis(e: React.FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur('')
    const res = await fetch('/api/avis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transporteurId, note, commentaire: commentaire || null }),
    })
    if (res.ok) {
      setFormOuvert(false)
      setCommentaire('')
      await charger()
      router.refresh()
    } else {
      const data = await res.json()
      setErreur(data.error ?? "Erreur lors de l'envoi de l'avis")
    }
    setEnvoi(false)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold">Avis</h2>
        {!chargement && <BadgeNote moyenne={moyenne} total={total} />}
      </div>

      {peutNoter && !formOuvert && (
        <button
          onClick={() => setFormOuvert(true)}
          className="mt-3 text-sm text-brand-600 hover:underline"
        >
          ⭐ Laisser un avis
        </button>
      )}

      {formOuvert && (
        <form onSubmit={envoyerAvis} className="mt-3 border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setNote(n)} className="text-2xl leading-none">
                <span className={n <= note ? 'text-amber-400' : 'text-slate-200'}>★</span>
              </button>
            ))}
          </div>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={2}
            placeholder="Votre expérience avec ce transporteur (optionnel)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={envoi}
              className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {envoi ? 'Envoi…' : 'Publier mon avis'}
            </button>
            <button type="button" onClick={() => setFormOuvert(false)} className="text-sm text-slate-500 hover:text-slate-800">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {!chargement && avis.length === 0 && (
          <p className="text-slate-400 text-sm">Aucun avis pour le moment.</p>
        )}
        {avis.map((a) => (
          <div key={a.id} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
            <div className="flex items-center gap-2">
              <Etoiles note={a.note} />
              <span className="text-sm font-medium text-slate-700">{a.auteur.nom}</span>
              <span className="text-xs text-slate-400">{formatDate(a.createdAt)}</span>
            </div>
            {a.commentaire && <p className="text-sm text-slate-600 mt-1">{a.commentaire}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
