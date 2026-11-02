import { db } from '@/lib/db'
import { exigerRoleOuRediriger } from '@/lib/garde'
import { DOCUMENTS } from '@/lib/documents-regles'
import { ActionsDocument } from '@/components/admin/ActionsDocument'

export const metadata = { title: 'Documents à vérifier — Administration' }

const octetsLisibles = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(n / 1024)} Ko`)

export default async function AdminDocumentsPage() {
  await exigerRoleOuRediriger('ADMIN')
  const dans30j = new Date(Date.now() + 30 * 86_400_000)

  const [enAttente, expirantBientot] = await Promise.all([
    db.documentTransporteur.findMany({
      where: { statut: 'EN_ATTENTE', transporteur: { user: { suspendu: false, supprimeLe: null } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true, type: true, nomFichier: true, mime: true, taille: true, dateEmission: true, dateExpiration: true, createdAt: true,
        transporteur: { select: { raisonSociale: true, siret: true, siretVerifieLe: true, user: { select: { nom: true, email: true } } } },
      },
    }),
    db.documentTransporteur.count({ where: { statut: 'VALIDE', dateExpiration: { gt: new Date(), lte: dans30j } } }),
  ])

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Documents à vérifier</h1>
        <p className="text-sm text-slate-700 mt-1">
          {enAttente.length} en attente · {expirantBientot} validé(s) expirant sous 30 jours (les transporteurs sont prévenus par e-mail).
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800">
        <p className="font-semibold mb-1">À contrôler avant de valider</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>Le document correspond bien au type annoncé, il est lisible et complet.</li>
          <li>La raison sociale et le SIRET du document sont ceux du profil.</li>
          <li>La date de délivrance ou de fin de validité saisie est exacte.</li>
          <li>Vigilance URSSAF : vérifiez l'authenticité avec le code figurant sur l'attestation, sur urssaf.fr.</li>
        </ul>
      </div>

      {enAttente.length === 0 && <p className="text-slate-700 text-sm">Aucun document en attente.</p>}
      {enAttente.map((d) => (
        <article key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900">{DOCUMENTS[d.type].libelle}</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900">En attente</span>
          </div>
          <p className="text-sm text-slate-800 mt-1">
            <strong>{d.transporteur.raisonSociale}</strong> · SIRET {d.transporteur.siret || 'non renseigné'}
            {d.transporteur.siretVerifieLe ? ' (vérifié)' : ''} · {d.transporteur.user.nom} ({d.transporteur.user.email})
          </p>
          <p className="text-sm text-slate-700 mt-1">
            {d.dateEmission ? `Délivré le ${d.dateEmission.toLocaleDateString('fr-FR')} · ` : ''}
            Valable jusqu'au {d.dateExpiration.toLocaleDateString('fr-FR')} · {d.mime.split('/')[1].toUpperCase()}, {octetsLisibles(d.taille)} · déposé le {d.createdAt.toLocaleString('fr-FR')}
          </p>
          <a href={`/api/documents/${d.id}/fichier`} className="inline-flex items-center min-h-[44px] mt-2 text-brand-700 underline font-medium">
            Télécharger pour examen
          </a>
          <ActionsDocument id={d.id} />
        </article>
      ))}
    </div>
  )
}
