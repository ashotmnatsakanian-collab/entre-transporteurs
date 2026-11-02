'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StatutDocument, TypeDocument } from '@prisma/client'
import { FORMATS_ACCEPTES, LIBELLE_STATUT, OBLIGATOIRES_PAR_ROLE, TAILLE_MAX_OCTETS, TYPES_PAR_ROLE, definition, statutEffectif, type RoleAvecDocuments } from '@/lib/documents-regles'

interface Doc {
  id: string
  type: TypeDocument
  statut: StatutDocument
  nomFichier: string
  dateExpiration: Date
  motifRefus: string | null
}

interface Props {
  role: RoleAvecDocuments
  documents: Doc[]
  partage: boolean
  exiges: boolean
  conforme: boolean
}

const STYLE_STATUT: Record<string, string> = {
  MANQUANT: 'bg-slate-100 text-slate-700',
  EN_ATTENTE: 'bg-amber-100 text-amber-900',
  VALIDE: 'bg-green-100 text-green-900',
  REFUSE: 'bg-red-100 text-red-900',
  EXPIRE: 'bg-red-100 text-red-900',
}

const aujourdhui = () => new Date().toISOString().slice(0, 10)

function CarteDocument({ type, doc, role }: { type: TypeDocument; doc?: Doc; role: RoleAvecDocuments }) {
  const router = useRouter()
  const def = definition(type, role)
  const obligatoire = OBLIGATOIRES_PAR_ROLE[role].includes(type)
  const statut = statutEffectif(doc, new Date())
  const [fichier, setFichier] = useState<File | null>(null)
  const [date, setDate] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [formOuvert, setFormOuvert] = useState(!doc || statut === 'REFUSE' || statut === 'EXPIRE')

  const champDate = def.regle.genre === 'fin' ? 'dateFin' : 'dateEmission'

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    if (!fichier) return setErreur('Choisissez un fichier.')
    if (fichier.size > TAILLE_MAX_OCTETS) return setErreur('Fichier trop volumineux (5 Mo maximum).')
    if (!date) return setErreur(def.aideDate + ' : à renseigner.')
    setChargement(true)
    const corps = new FormData()
    corps.set('type', type)
    corps.set(champDate, date)
    corps.set('fichier', fichier)
    const res = await fetch('/api/documents', { method: 'POST', body: corps })
    const data = await res.json().catch(() => ({}))
    setChargement(false)
    if (!res.ok) return setErreur(data.error ?? "Impossible d'envoyer le document.")
    setFichier(null)
    setDate('')
    setFormOuvert(false)
    router.refresh()
  }

  async function supprimer() {
    if (!doc || !window.confirm('Supprimer ce document ?')) return
    setChargement(true)
    await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
    setChargement(false)
    router.refresh()
  }

  return (
    <li className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-semibold text-slate-900">{def.libelle}{!obligatoire && <span className="ml-2 text-xs font-normal text-slate-600">(recommandé)</span>}</h2>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STYLE_STATUT[statut]}`}>{LIBELLE_STATUT[statut]}</span>
      </div>
      <p className="text-sm text-slate-700 mt-1">{def.description}</p>
      <p className="text-xs text-slate-600 mt-1">Où l'obtenir : {def.ouLObtenir}.</p>

      {doc && (
        <div className="mt-3 text-sm text-slate-700 space-y-1">
          <p>
            Fichier : <span className="font-medium">{doc.nomFichier}</span>
            {' · '}valable jusqu'au {new Date(doc.dateExpiration).toLocaleDateString('fr-FR')}
          </p>
          {doc.statut === 'REFUSE' && doc.motifRefus && <p className="text-red-800">Motif du refus : {doc.motifRefus}</p>}
        </div>
      )}

      {doc && !formOuvert && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setFormOuvert(true)}
            className="min-h-[44px] px-4 rounded-lg border border-slate-300 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 cursor-pointer">
            Remplacer
          </button>
          <button type="button" onClick={supprimer} disabled={chargement}
            className="min-h-[44px] px-4 rounded-lg border border-red-300 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 cursor-pointer">
            Supprimer
          </button>
          {doc.statut === 'VALIDE' && <p className="basis-full text-xs text-slate-600">Un document remplacé doit être validé de nouveau : vous resterez invisible pendant ce délai.</p>}
        </div>
      )}

      {formOuvert && (
        <form onSubmit={envoyer} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`fichier-${type}`} className="block text-sm font-medium text-slate-800 mb-1">Fichier (PDF, JPEG ou PNG, 5 Mo max)</label>
            <input id={`fichier-${type}`} type="file" accept={FORMATS_ACCEPTES} required
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
              className="block w-full min-h-[44px] text-sm text-slate-800 file:mr-3 file:min-h-[44px] file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-800 file:font-medium" />
          </div>
          <div>
            <label htmlFor={`date-${type}`} className="block text-sm font-medium text-slate-800 mb-1">{def.aideDate}</label>
            <input id={`date-${type}`} type="date" required value={date} onChange={(e) => setDate(e.target.value)}
              {...(champDate === 'dateEmission' ? { max: aujourdhui() } : { min: aujourdhui() })}
              className="w-full min-h-[44px] border border-slate-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          {erreur && <p className="sm:col-span-2 text-sm text-red-800" role="alert">{erreur}</p>}
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <button type="submit" disabled={chargement}
              className="min-h-[44px] px-5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 cursor-pointer">
              {chargement ? 'Envoi…' : 'Envoyer pour vérification'}
            </button>
            {doc && (
              <button type="button" onClick={() => { setFormOuvert(false); setErreur('') }}
                className="min-h-[44px] px-4 rounded-lg border border-slate-300 text-sm text-slate-800 hover:bg-slate-50 cursor-pointer">
                Annuler
              </button>
            )}
          </div>
        </form>
      )}
    </li>
  )
}

export function GestionDocuments({ role, documents, partage: partageInitial, exiges, conforme }: Props) {
  const router = useRouter()
  const [partage, setPartage] = useState(partageInitial)
  const obligatoires = OBLIGATOIRES_PAR_ROLE[role]
  const valides = obligatoires.filter((t) => statutEffectif(documents.find((d) => d.type === t), new Date()) === 'VALIDE').length

  async function changerPartage(valeur: boolean) {
    setPartage(valeur)
    const res = await fetch('/api/documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partage: valeur }) })
    if (!res.ok) setPartage(!valeur)
    else router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className={`rounded-xl p-4 text-sm ${conforme ? 'bg-green-50 border border-green-200 text-green-900' : 'bg-amber-50 border border-amber-200 text-amber-900'}`} role="status">
        <p className="font-semibold">{valides} document(s) obligatoire(s) validé(s) sur {obligatoires.length}</p>
        <p className="mt-1">
          {conforme
            ? role === 'TRANSPORTEUR' ? 'Votre dossier est complet : vous êtes visible des commissionnaires.' : 'Votre dossier est complet : vous avez accès à la recherche, à la carte et à la publication de besoins.'
            : exiges
              ? role === 'TRANSPORTEUR'
                ? 'Tant que les documents obligatoires ne sont pas validés, vous restez invisible des commissionnaires et ne pouvez ni publier de disponibilité ni ouvrir de conversation.'
                : 'Tant que les documents obligatoires ne sont pas validés, vous n\'avez accès ni à la recherche, ni à la carte, et ne pouvez ni publier de besoin ni ouvrir de conversation.'
              : role === 'TRANSPORTEUR'
                ? 'Les documents ne sont pas encore obligatoires, mais les commissionnaires les demanderont : préparez-les dès maintenant.'
                : 'Les documents ne sont pas encore obligatoires, mais ils le deviendront : préparez-les dès maintenant.'}
        </p>
      </div>

      <ul className="space-y-4">
        {TYPES_PAR_ROLE[role].map((type) => (
          <CarteDocument key={`${type}-${documents.find((d) => d.type === type)?.id ?? 'nouveau'}`} role={role} type={type} doc={documents.find((d) => d.type === type)} />
        ))}
      </ul>

      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <label className="flex items-start gap-3 text-sm text-slate-800 cursor-pointer">
          <input type="checkbox" checked={partage} onChange={(e) => changerPartage(e.target.checked)} className="mt-1 h-5 w-5" />
          <span>
            <span className="font-medium">Autoriser le téléchargement par {role === 'TRANSPORTEUR' ? 'les commissionnaires' : 'les transporteurs'} avec qui j'échange</span>
            <span className="block text-slate-600 mt-0.5">
              {role === 'TRANSPORTEUR' ? 'Ils' : 'Ils'} pourront télécharger vos documents <strong>validés</strong> (utile pour leurs propres obligations de vigilance). Les autres ne voient que le statut. Vous pouvez retirer cet accord à tout moment ;
              chaque téléchargement est enregistré.
            </span>
          </span>
        </label>
      </div>

      <p className="text-xs text-slate-600">
        Vos documents sont chiffrés, visibles uniquement de l'équipe de vérification et, si vous l'autorisez, de l'autre partie de vos conversations.
        Voir la politique de confidentialité.
      </p>
    </div>
  )
}
