import { db } from '@/lib/db'
import { ActionsSignalement } from '@/components/admin/ActionsSignalement'

export const metadata = { title: 'Signalements — Administration' }

const MOTIFS: Record<string, string> = {
  SPAM: 'Spam', FAUSSE_IDENTITE: 'Fausse identité', COMPORTEMENT_ABUSIF: 'Comportement abusif', ARNAQUE: 'Arnaque', AUTRE: 'Autre',
}

export default async function AdminSignalementsPage() {
  const signalements = await db.signalement.findMany({
    orderBy: [{ statut: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    include: {
      signalant: { select: { nom: true, email: true } },
      cible: { select: { id: true, nom: true, email: true, suspendu: true, _count: { select: { signalementsRecus: true } } } },
    },
  })

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Signalements</h1>
      {signalements.length === 0 && <p className="text-slate-400 text-sm">Aucun signalement.</p>}
      {signalements.map((s) => (
        <div key={s.id} className={`bg-white border rounded-xl p-4 ${s.statut === 'OUVERT' ? 'border-amber-300' : 'border-slate-200 opacity-70'}`}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{MOTIFS[s.motif]}</span>
            <strong>{s.cible.nom}</strong>
            <span className="text-slate-400 text-xs">{s.cible.email} · {s.cible._count.signalementsRecus} signalement(s) au total</span>
            {s.cible.suspendu && <span className="text-xs text-red-600">suspendu</span>}
          </div>
          {s.details && <p className="text-sm text-slate-600 mt-2">« {s.details} »</p>}
          <p className="text-xs text-slate-400 mt-2">Par {s.signalant.nom} ({s.signalant.email}) · {s.createdAt.toLocaleString('fr-FR')} · {s.statut}</p>
          {s.statut === 'OUVERT' && <ActionsSignalement id={s.id} cibleId={s.cible.id} cibleSuspendue={s.cible.suspendu} />}
        </div>
      ))}
    </div>
  )
}
