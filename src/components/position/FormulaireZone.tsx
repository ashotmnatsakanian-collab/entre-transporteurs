'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SelecteurDepartements } from '@/components/recherche/SelecteurDepartements'
import { VilleAutocomplete } from '@/components/ui/VilleAutocomplete'

const RAYONS = [50, 100, 150, 200, 300, 500, 800]

interface Props {
  rayonInterventionKm: number | null
  departements: string[]
  destinationVille: string | null
  destinationInsee: string | null
}

// Zone d'intervention : jusqu'où le transporteur accepte d'aller, et vers où il voudrait rentrer.
export function FormulaireZone(props: Props) {
  const router = useRouter()
  const [rayon, setRayon] = useState<number | null>(props.rayonInterventionKm)
  const [departements, setDepartements] = useState(props.departements)
  const [destinationInsee, setDestinationInsee] = useState<string | null>(props.destinationInsee)
  const [chargement, setChargement] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'erreur'; texte: string } | null>(null)

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    setChargement(true)
    setMessage(null)
    const res = await fetch('/api/transporteurs/zone', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rayonInterventionKm: rayon, departements, destinationInsee }),
    })
    const data = await res.json().catch(() => ({}))
    setChargement(false)
    if (res.ok) {
      setMessage({ type: 'ok', texte: 'Zone d’intervention enregistrée.' })
      router.refresh()
    } else setMessage({ type: 'erreur', texte: data.error ?? 'Enregistrement impossible.' })
  }

  return (
    <form onSubmit={enregistrer} className="space-y-5 bg-white border border-slate-200 rounded-xl p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Ma zone d’intervention</h2>
        <p className="text-sm text-slate-700 mt-1">Les commissionnaires qui cherchent dans ces zones vous trouvent, même si vous n’y êtes pas encore.</p>
      </div>

      <div>
        <label htmlFor="rayon-intervention" className="block text-sm font-medium text-slate-700 mb-1">Je me déplace jusqu’à</label>
        <select id="rayon-intervention" value={rayon ?? ''} onChange={(e) => setRayon(e.target.value ? Number(e.target.value) : null)}
          className="w-full min-h-[44px] border border-slate-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Pas de rayon particulier</option>
          {RAYONS.map((r) => <option key={r} value={r}>{r} km autour de ma position</option>)}
        </select>
      </div>

      <SelecteurDepartements label="Départements où j’accepte d’aller" valeur={departements} onChange={setDepartements} max={30} />

      <div>
        <VilleAutocomplete
          label="Destination souhaitée (facultatif, ex. retour vers Lyon)"
          valeurInitiale={props.destinationVille ?? ''}
          onSelect={(v) => setDestinationInsee(v.insee)}
          onClear={() => setDestinationInsee(null)}
        />
      </div>

      <div aria-live="polite">
        {message && <p className={`text-sm ${message.type === 'ok' ? 'text-green-800' : 'text-red-800'}`} role={message.type === 'ok' ? 'status' : 'alert'}>{message.texte}</p>}
      </div>

      <button type="submit" disabled={chargement}
        className="w-full min-h-[44px] bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
        {chargement ? 'Enregistrement…' : 'Enregistrer ma zone'}
      </button>
    </form>
  )
}
