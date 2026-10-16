'use client'

import { useState } from 'react'

const MOTIFS = [
  { valeur: 'FAUSSE_IDENTITE', label: 'Fausse identité / usurpation' },
  { valeur: 'ARNAQUE', label: 'Arnaque ou tentative de fraude' },
  { valeur: 'COMPORTEMENT_ABUSIF', label: 'Comportement abusif ou injurieux' },
  { valeur: 'SPAM', label: 'Spam / démarchage abusif' },
  { valeur: 'AUTRE', label: 'Autre' },
]

export function BoutonSignaler({ cibleId }: { cibleId: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [motif, setMotif] = useState('FAUSSE_IDENTITE')
  const [details, setDetails] = useState('')
  const [etat, setEtat] = useState<{ type: 'ok' | 'erreur'; texte: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setEtat(null)
    const res = await fetch('/api/signalements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cibleId, motif, details: details || undefined }),
    })
    setLoading(false)
    if (res.ok) {
      setEtat({ type: 'ok', texte: 'Merci, votre signalement a été transmis à notre équipe.' })
      setOuvert(false)
    } else {
      const data = await res.json().catch(() => ({}))
      setEtat({ type: 'erreur', texte: data.error ?? 'Impossible d\'envoyer le signalement.' })
    }
  }

  return (
    <div className="text-sm">
      {!ouvert ? (
        <button onClick={() => { setOuvert(true); setEtat(null) }} className="text-slate-400 hover:text-red-600 hover:underline">
          🚩 Signaler
        </button>
      ) : (
        <form onSubmit={envoyer} className="mt-2 border border-slate-200 rounded-lg p-3 space-y-2 bg-white w-72 max-w-full">
          <select value={motif} onChange={(e) => setMotif(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm">
            {MOTIFS.map((m) => <option key={m.valeur} value={m.valeur}>{m.label}</option>)}
          </select>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2} maxLength={1000} placeholder="Précisions (facultatif)"
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
          <div className="flex gap-3">
            <button disabled={loading} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50">{loading ? 'Envoi…' : 'Signaler'}</button>
            <button type="button" onClick={() => setOuvert(false)} className="text-xs text-slate-500">Annuler</button>
          </div>
        </form>
      )}
      {etat && <p className={`mt-1 text-xs ${etat.type === 'ok' ? 'text-green-600' : 'text-red-600'}`} role="status">{etat.texte}</p>}
    </div>
  )
}
