'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EVENEMENT_OUVRIR_POSITION, type EtatPositionClient } from './BarrePosition'
import { IconeLieu } from './Icones'
import { ilYA, jusquA } from '@/lib/fraicheur'
import { libelleLieu } from '@/lib/referentiel-geo'

// Tableau de bord : où je suis, jusqu'à quand je suis disponible, et les deux actions utiles.
export function CarteDisponibilite({ etat }: { etat: EtatPositionClient }) {
  const router = useRouter()
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  async function arreter() {
    setChargement(true)
    setErreur('')
    const res = await fetch('/api/transporteurs/disponibilite', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disponible: false }) })
    setChargement(false)
    if (res.ok) router.refresh()
    else setErreur('Impossible de mettre à jour votre statut.')
  }

  const lieu = etat.positionVille ? libelleLieu(etat.positionVille, etat.positionDepartement) : null

  return (
    <div className={`rounded-xl border p-4 ${etat.disponible ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${etat.disponible ? 'bg-green-600' : 'bg-slate-500'}`} aria-hidden />
        <p className="font-semibold text-slate-900">{etat.disponible ? `Disponible ${jusquA(etat.disponibleJusqua!)}` : 'Pas disponible maintenant'}</p>
      </div>
      <p className="text-sm text-slate-800 mt-1 flex items-center gap-1.5">
        <IconeLieu className="w-4 h-4 shrink-0" />
        {lieu ?? 'Position non renseignée : les commissionnaires ne peuvent pas vous trouver.'}
        {lieu && <span className="text-slate-700">· mis à jour {ilYA(etat.derniereMAJ)}</span>}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => window.dispatchEvent(new Event(EVENEMENT_OUVRIR_POSITION))}
          className="min-h-[44px] px-4 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          {lieu ? 'Mettre à jour ma position' : 'Indiquer ma position'}
        </button>
        {etat.disponible && (
          <button type="button" onClick={arreter} disabled={chargement}
            className="min-h-[44px] px-4 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
            Je ne suis plus disponible
          </button>
        )}
      </div>
      {erreur && <p className="text-sm text-red-800 mt-2" role="alert">{erreur}</p>}
    </div>
  )
}
