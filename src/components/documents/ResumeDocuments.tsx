import type { StatutDocument, TypeDocument } from '@prisma/client'
import { OBLIGATOIRES_PAR_ROLE, TYPES_PAR_ROLE, definition, statutEffectif, type RoleAvecDocuments } from '@/lib/documents-regles'

interface Props {
  /** Rôle du propriétaire des documents */
  role: RoleAvecDocuments
  documents: Array<{ id: string; type: TypeDocument; statut: StatutDocument; dateExpiration: Date }>
  conforme: boolean
  /** Le transporteur partage ses documents et une conversation existe : téléchargement possible */
  peutTelecharger: boolean
}

// Vue commissionnaire : seuls les documents validés et en cours de validité sont présentés comme tels.
export function ResumeDocuments({ role, documents, conforme, peutTelecharger }: Props) {
  const maintenant = new Date()
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5" aria-labelledby="titre-documents">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h2 id="titre-documents" className="font-semibold">Documents légaux</h2>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conforme ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {conforme ? 'Dossier complet et validé' : 'Dossier incomplet ou en cours de vérification'}
        </span>
      </div>
      <p className="text-xs text-slate-600 mb-3">
        Contrôle de forme par l'équipe (document présent, lisible, en cours de validité). Il ne remplace pas votre propre vérification, notamment celle
        de l'attestation de vigilance auprès de l'URSSAF.
      </p>
      <ul className="divide-y divide-slate-100 text-sm">
        {TYPES_PAR_ROLE[role].map((type) => {
          const d = documents.find((x) => x.type === type)
          const statut = statutEffectif(d, maintenant)
          const ok = statut === 'VALIDE' && d
          return (
            <li key={type} className="py-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-800">{definition(type, role).court}{!OBLIGATOIRES_PAR_ROLE[role].includes(type) && <span className="text-xs text-slate-600"> (recommandé)</span>}</span>
              <span className="flex items-center gap-3">
                {ok ? (
                  <span className="text-green-800">Valide jusqu'au {d.dateExpiration.toLocaleDateString('fr-FR')}</span>
                ) : (
                  <span className="text-slate-600">{statut === 'EXPIRE' ? 'Expiré' : statut === 'MANQUANT' ? 'Non fourni' : 'En cours de vérification'}</span>
                )}
                {ok && peutTelecharger && (
                  <a href={`/api/documents/${d.id}/fichier`} className="text-brand-700 underline">Télécharger</a>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {!peutTelecharger && (
        <p className="text-xs text-slate-600 mt-3">
          Les fichiers sont téléchargeables une fois une conversation ouverte, si leur propriétaire a autorisé le partage de ses documents.
        </p>
      )}
    </section>
  )
}
