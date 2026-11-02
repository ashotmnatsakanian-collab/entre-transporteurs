'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { VilleAutocomplete } from '@/components/ui/VilleAutocomplete'
import { IconeCible, IconeFermer, IconeHorloge, IconeLieu } from './Icones'
import { DUREES_DISPONIBILITE_H } from '@/lib/disponibilite'
import { ilYA, jusquA } from '@/lib/fraicheur'
import { libelleLieu } from '@/lib/referentiel-geo'

export interface EtatPositionClient {
  positionVille: string | null
  positionInsee: string | null
  positionDepartement: string | null
  disponible: boolean
  disponibleJusqua: string | null
  dureeHeures: number
  derniereMAJ: string
}

export const EVENEMENT_OUVRIR_POSITION = 'ouvrir-position'
const CLE_RECENTES = 'et-villes-recentes'

interface VilleRecente {
  insee: string
  nom: string
  departement?: string
}

function lireRecentes(): VilleRecente[] {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_RECENTES) ?? '[]')
    return Array.isArray(brut) ? brut.filter((v) => typeof v?.insee === 'string' && typeof v?.nom === 'string').slice(0, 5) : []
  } catch {
    return []
  }
}

function retenir(ville: VilleRecente) {
  try {
    const autres = lireRecentes().filter((v) => v.insee !== ville.insee)
    localStorage.setItem(CLE_RECENTES, JSON.stringify([ville, ...autres].slice(0, 5)))
  } catch {
    /* stockage indisponible : simple confort, sans conséquence */
  }
}

// Barre fixe au bas de l'écran du transporteur : où il est, jusqu'à quand il est disponible, et la mise à jour en 2 clics.
export function BarrePosition({ etat }: { etat: EtatPositionClient }) {
  const router = useRouter()
  const dialogue = useRef<HTMLDialogElement>(null)
  const declencheur = useRef<HTMLButtonElement>(null)
  const [ouvert, setOuvert] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [message, setMessage] = useState<{ type: 'info' | 'erreur'; texte: string; lien?: { href: string; texte: string } } | null>(null)
  const [veutDispo, setVeutDispo] = useState(true)
  const [duree, setDuree] = useState<number>(etat.dureeHeures)
  const [recentes, setRecentes] = useState<VilleRecente[]>([])

  function ouvrir() {
    setRecentes(lireRecentes())
    setMessage(null)
    setDuree(etat.dureeHeures)
    setVeutDispo(true)
    setOuvert(true)
    dialogue.current?.showModal()
  }
  function fermer() {
    dialogue.current?.close()
  }

  // Ouverture depuis un autre écran (tableau de bord)
  useEffect(() => {
    const ecouteur = () => ouvrir()
    window.addEventListener(EVENEMENT_OUVRIR_POSITION, ecouteur)
    return () => window.removeEventListener(EVENEMENT_OUVRIR_POSITION, ecouteur)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat.dureeHeures])

  async function appel(url: string, methode: 'POST' | 'PATCH', corps: object) {
    setChargement(true)
    setMessage(null)
    const res = await fetch(url, { method: methode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
    const data = await res.json().catch(() => ({}))
    setChargement(false)
    if (res.ok) return true
    if (data.code === 'DOCUMENTS_REQUIS') setMessage({ type: 'erreur', texte: 'Vos documents légaux doivent être validés pour vous déclarer disponible.', lien: { href: '/transporteur/documents', texte: 'Ouvrir « Mes documents »' } })
    else if (data.code === 'EMAIL_NON_VERIFIE') setMessage({ type: 'erreur', texte: 'Confirmez d’abord votre adresse e-mail (lien reçu à l’inscription).' })
    else setMessage({ type: 'erreur', texte: data.error ?? 'Mise à jour impossible.' })
    return false
  }

  async function appliquer(ville: VilleRecente) {
    const ok = await appel('/api/transporteurs/position', 'POST', { insee: ville.insee, disponible: veutDispo, ...(veutDispo && { dureeHeures: duree }) })
    if (ok) {
      retenir(ville)
      fermer()
      router.refresh()
    }
  }

  async function utiliserMaPosition() {
    setMessage(null)
    if (!('geolocation' in navigator)) return setMessage({ type: 'erreur', texte: 'La géolocalisation n’est pas disponible sur cet appareil. Saisissez votre ville.' })
    setChargement(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Les coordonnées exactes ne servent qu'à trouver la commune (API publique) : seul son code est envoyé à nos serveurs
          const res = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${pos.coords.longitude}&lat=${pos.coords.latitude}`)
          const data = await res.json()
          const p = data.features?.[0]?.properties
          if (!p?.citycode) throw new Error('commune introuvable')
          await appliquer({ insee: p.citycode, nom: p.city ?? p.name, departement: p.context?.split(',')[0]?.trim() })
        } catch {
          setChargement(false)
          setMessage({ type: 'erreur', texte: 'Impossible de trouver votre commune. Saisissez votre ville.' })
        }
      },
      (err) => {
        setChargement(false)
        setMessage({
          type: 'erreur',
          texte: err.code === err.PERMISSION_DENIED ? 'Autorisation de localisation refusée. Saisissez votre ville ci-dessous.' : 'Position introuvable. Saisissez votre ville ci-dessous.',
        })
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    )
  }

  async function arreterDisponibilite() {
    if (await appel('/api/transporteurs/disponibilite', 'PATCH', { disponible: false })) {
      fermer()
      router.refresh()
    }
  }

  async function prolonger() {
    if (!etat.positionInsee) return ouvrir()
    if (await appel('/api/transporteurs/disponibilite', 'PATCH', { disponible: true })) router.refresh()
    else ouvrir()
  }

  const restantMs = etat.disponibleJusqua ? new Date(etat.disponibleJusqua).getTime() - Date.now() : 0
  const bientotExpiree = etat.disponible && restantMs < 2 * 3_600_000
  const lieu = etat.positionVille ? libelleLieu(etat.positionVille, etat.positionDepartement) : null

  return (
    <>
      <div className="shrink-0 bg-white border-t border-slate-200 flex items-stretch">
        <button ref={declencheur} type="button" onClick={ouvrir}
          className="flex-1 min-w-0 min-h-[56px] flex items-center gap-3 px-4 text-left cursor-pointer hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600">
          <IconeLieu className={`shrink-0 ${etat.disponible ? 'text-green-700' : 'text-slate-600'}`} />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900 truncate">{lieu ?? 'Où êtes-vous maintenant ?'}</span>
            <span className="block text-xs text-slate-700 leading-snug">
              {!lieu
                ? 'Indiquez votre position pour être trouvé'
                : etat.disponible
                  ? `Disponible ${jusquA(etat.disponibleJusqua!)} · mis à jour ${ilYA(etat.derniereMAJ)}`
                  : `Pas disponible · position mise à jour ${ilYA(etat.derniereMAJ)}`}
            </span>
          </span>
          <span className="ml-auto text-sm font-semibold text-brand-700 shrink-0">{lieu ? 'Modifier' : 'Indiquer'}</span>
        </button>
        {lieu && (bientotExpiree || !etat.disponible) && (
          <button type="button" onClick={prolonger} disabled={chargement}
            className="shrink-0 min-h-[56px] px-4 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white">
            {etat.disponible ? 'Prolonger' : 'Disponible ici'}
          </button>
        )}
      </div>

      <dialog ref={dialogue} onClose={() => { setOuvert(false); declencheur.current?.focus() }}
        onClick={(e) => { if (e.target === dialogue.current) fermer() }}
        aria-labelledby="titre-position"
        className="m-0 mt-auto sm:m-auto w-full max-w-none sm:max-w-md rounded-t-2xl sm:rounded-2xl p-0 backdrop:bg-black/40">
        {ouvert && (
          <div className="p-5 pb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 id="titre-position" className="text-lg font-bold text-slate-900">Où êtes-vous maintenant ?</h2>
              <button type="button" onClick={fermer} aria-label="Fermer" className="min-h-[44px] min-w-[44px] -mt-2 -mr-2 flex items-center justify-center text-slate-700 cursor-pointer rounded-lg hover:bg-slate-100">
                <IconeFermer />
              </button>
            </div>

            <button type="button" onClick={utiliserMaPosition} disabled={chargement}
              className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
              <IconeCible /> {chargement ? 'Un instant…' : 'Utiliser ma position'}
            </button>
            <p className="text-xs text-slate-700 mt-1.5">Votre position exacte n’est jamais enregistrée : seule la commune l’est, avec son département.</p>

            <div className="mt-4">
              <VilleAutocomplete
                label="Ou saisissez une ville ou un code postal"
                onSelect={(v) => appliquer({ insee: v.insee, nom: v.nom, departement: v.departement })}
              />
            </div>

            {recentes.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700 mb-1.5">Vos dernières villes</p>
                <ul className="flex flex-wrap gap-2">
                  {recentes.map((v) => (
                    <li key={v.insee}>
                      <button type="button" onClick={() => appliquer(v)} disabled={chargement}
                        className="min-h-[44px] px-4 rounded-full border border-slate-300 text-sm text-slate-900 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                        {v.nom}{v.departement ? ` (${v.departement})` : ''}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-200">
              <label className="flex items-center gap-3 min-h-[44px] text-sm font-medium text-slate-900 cursor-pointer">
                <input type="checkbox" checked={veutDispo} onChange={(e) => setVeutDispo(e.target.checked)} className="h-5 w-5" />
                Me déclarer disponible à cet endroit
              </label>
              {veutDispo && (
                <fieldset className="mt-2">
                  <legend className="text-sm text-slate-700 mb-1.5 flex items-center gap-1.5"><IconeHorloge className="w-4 h-4" /> Pendant</legend>
                  <div className="grid grid-cols-4 gap-2" role="radiogroup">
                    {DUREES_DISPONIBILITE_H.map((h) => (
                      <label key={h} className={`flex items-center justify-center min-h-[44px] rounded-lg border text-sm font-medium cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-brand-600 ${duree === h ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 text-slate-900 hover:bg-slate-50'}`}>
                        <input type="radio" name="duree" value={h} checked={duree === h} onChange={() => setDuree(h)} className="sr-only" />
                        {h} h
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-700 mt-1.5">Ensuite, vous n’apparaissez plus : un rappel vous est envoyé pour renouveler en un clic.</p>
                </fieldset>
              )}
            </div>

            <div aria-live="polite">
              {message && (
                <p className={`mt-4 text-sm ${message.type === 'erreur' ? 'text-red-800' : 'text-slate-800'}`} role={message.type === 'erreur' ? 'alert' : 'status'}>
                  {message.texte}{' '}
                  {message.lien && <Link href={message.lien.href} className="underline font-medium">{message.lien.texte}</Link>}
                </p>
              )}
            </div>

            {etat.disponible && (
              <button type="button" onClick={arreterDisponibilite} disabled={chargement}
                className="mt-4 w-full min-h-[44px] rounded-lg border border-slate-300 text-slate-900 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                Je ne suis plus disponible
              </button>
            )}
          </div>
        )}
      </dialog>
    </>
  )
}
