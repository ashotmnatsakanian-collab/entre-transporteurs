import { db } from '@/lib/db'
import { exigerRoleOuRediriger } from '@/lib/garde'
import { GestionBesoins } from '@/components/besoins/GestionBesoins'

export const metadata = { title: 'Mes besoins de transport — Entre Transporteurs' }

export default async function BesoinsCommissionnairePage() {
  const u = await exigerRoleOuRediriger('COMMISSIONNAIRE')
  const profil = await db.commissionnaireProfil.findUnique({ where: { userId: u.id }, select: { id: true } })
  const besoins = profil
    ? await db.besoin.findMany({ where: { commissionnaireId: profil.id }, orderBy: { dateEnlevement: 'desc' }, take: 100 })
    : []

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Mes besoins de transport</h1>
      <p className="text-slate-500 text-sm mb-6">
        Publiez un fret à faire transporter : les transporteurs proches du lieu d'enlèvement sont prévenus et peuvent vous répondre.
      </p>
      <GestionBesoins besoinsInitiaux={JSON.parse(JSON.stringify(besoins))} />
    </div>
  )
}
