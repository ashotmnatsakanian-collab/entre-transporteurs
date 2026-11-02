import type { Role, StatutDocument, TypeDocument } from '@prisma/client'
import { OBLIGATOIRES_PAR_ROLE, TYPES_PAR_ROLE, definition, roleAvecDocuments, statutEffectif } from '@/lib/documents-regles'

interface Props {
  nom: string
  role: Role
  documents: Array<{ id: string; type: TypeDocument; statut: StatutDocument; dateExpiration: Date }>
  peutTelecharger: boolean
}

// Dans une conversation : statut des documents de l'interlocuteur, avec téléchargement s'il l'a autorisé.
export function PanneauDocumentsInterlocuteur({ nom, role, documents, peutTelecharger }: Props) {
  const r = roleAvecDocuments(role)
  if (!r) return null
  const maintenant = new Date()
  const valides = OBLIGATOIRES_PAR_ROLE[r].filter((t) => statutEffectif(documents.find((d) => d.type === t), maintenant) === 'VALIDE').length

  return (
    <details className="bg-slate-50 border-b border-slate-200 text-sm shrink-0">
      <summary className="px-4 sm:px-6 py-3 min-h-[44px] cursor-pointer text-slate-800 font-medium flex items-center gap-2">
        Documents de {nom} — {valides}/{OBLIGATOIRES_PAR_ROLE[r].length} validés
      </summary>
      <div className="px-4 sm:px-6 pb-4">
        <ul className="divide-y divide-slate-200">
          {TYPES_PAR_ROLE[r].map((type) => {
            const d = documents.find((x) => x.type === type)
            const statut = statutEffectif(d, maintenant)
            const ok = statut === 'VALIDE' && d
            return (
              <li key={type} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-800">{definition(type, r).court}</span>
                <span className="flex items-center gap-3">
                  {ok ? <span className="text-green-800">Valide jusqu'au {d.dateExpiration.toLocaleDateString('fr-FR')}</span> : <span className="text-slate-600">{statut === 'EXPIRE' ? 'Expiré' : statut === 'MANQUANT' ? 'Non fourni' : 'En cours de vérification'}</span>}
                  {ok && peutTelecharger && <a href={`/api/documents/${d.id}/fichier`} className="text-brand-700 underline">Télécharger</a>}
                </span>
              </li>
            )
          })}
        </ul>
        {!peutTelecharger && <p className="text-xs text-slate-600 mt-2">Téléchargement possible si {nom} a autorisé le partage de ses documents.</p>}
        <p className="text-xs text-slate-600 mt-1">Contrôle de forme par l'équipe ; il ne remplace pas votre propre vérification (attestation de vigilance URSSAF : code de vérification sur urssaf.fr).</p>
      </div>
    </details>
  )
}
