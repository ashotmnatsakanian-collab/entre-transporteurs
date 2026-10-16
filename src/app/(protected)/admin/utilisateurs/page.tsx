import { db } from '@/lib/db'
import { ActionsUtilisateur } from '@/components/admin/ActionsUtilisateur'

export const metadata = { title: 'Utilisateurs — Administration' }

export default async function AdminUtilisateursPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? '').trim().slice(0, 80)

  const users = await db.user.findMany({
    where: {
      role: { not: 'ADMIN' },
      supprimeLe: null,
      ...(q && { OR: [{ email: { contains: q, mode: 'insensitive' } }, { nom: { contains: q, mode: 'insensitive' } }] }),
    },
    include: {
      transporteurProfil: { select: { raisonSociale: true, siret: true, siretVerifieLe: true } },
      commissionnaireProfil: { select: { raisonSociale: true, siret: true, siretVerifieLe: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Utilisateurs</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Rechercher par nom ou e-mail…" className="flex-1 max-w-md border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <button className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm">Rechercher</button>
      </form>

      <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500 bg-slate-50">
            <tr>
              <th className="px-3 py-2">Utilisateur</th>
              <th className="px-3 py-2">Rôle</th>
              <th className="px-3 py-2">Entreprise</th>
              <th className="px-3 py-2">Inscrit le</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => {
              const profil = u.transporteurProfil ?? u.commissionnaireProfil
              return (
                <tr key={u.id} className={u.suspendu ? 'bg-red-50' : ''}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{u.nom}</div>
                    <div className="text-xs text-slate-400">{u.email}{!u.emailVerifieLe && ' · e-mail non confirmé'}</div>
                  </td>
                  <td className="px-3 py-2">{u.role === 'TRANSPORTEUR' ? 'Transporteur' : 'Commissionnaire'}</td>
                  <td className="px-3 py-2">
                    <div>{profil?.raisonSociale}</div>
                    <div className="text-xs text-slate-400 font-mono">{profil?.siret || 'SIRET non renseigné'}{profil?.siretVerifieLe && ' ✓ officiel'}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{u.createdAt.toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-2"><ActionsUtilisateur id={u.id} verifie={u.verifie} suspendu={u.suspendu} /></td>
                </tr>
              )
            })}
            {users.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Aucun utilisateur.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
