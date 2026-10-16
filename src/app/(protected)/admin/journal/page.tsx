import { db } from '@/lib/db'

export const metadata = { title: 'Journal de sécurité — Administration' }

const COULEURS: Record<string, string> = {
  connexion_echec: 'bg-red-100 text-red-700',
  connexion_verrouillee: 'bg-red-100 text-red-700',
  acces_refuse: 'bg-red-100 text-red-700',
  signalement: 'bg-amber-100 text-amber-700',
  admin_action: 'bg-purple-100 text-purple-700',
  compte_supprime: 'bg-slate-200 text-slate-700',
}

export default async function AdminJournalPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const type = ((await searchParams).type ?? '').replace(/[^a-z_]/g, '').slice(0, 40)
  const lignes = await db.journalSecurite.findMany({ where: type ? { type } : {}, orderBy: { createdAt: 'desc' }, take: 200 })

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Journal de sécurité</h1>
      <form className="flex gap-2">
        <input name="type" defaultValue={type} placeholder="Filtrer par type (ex: connexion_echec)" className="flex-1 max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <button className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm">Filtrer</button>
      </form>
      <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500 bg-slate-50">
            <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">IP</th><th className="px-3 py-2">Utilisateur</th><th className="px-3 py-2">Détails</th></tr>
          </thead>
          <tbody className="divide-y">
            {lignes.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{l.createdAt.toLocaleString('fr-FR')}</td>
                <td className="px-3 py-1.5"><span className={`px-2 py-0.5 rounded-full ${COULEURS[l.type] ?? 'bg-slate-100 text-slate-600'}`}>{l.type}</span></td>
                <td className="px-3 py-1.5 font-mono">{l.ip ?? '—'}</td>
                <td className="px-3 py-1.5 font-mono text-slate-400">{l.userId?.slice(0, 10) ?? '—'}</td>
                <td className="px-3 py-1.5 text-slate-500">{l.details ?? ''}</td>
              </tr>
            ))}
            {lignes.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Aucun événement.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
