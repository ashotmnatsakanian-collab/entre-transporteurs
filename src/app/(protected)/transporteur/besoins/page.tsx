import { db } from '@/lib/db'
import { exigerRoleOuRediriger } from '@/lib/garde'
import { BoardBesoins } from '@/components/besoins/BoardBesoins'

export const metadata = { title: 'Fret à prendre — Entre Transporteurs' }

export default async function BesoinsTransporteurPage() {
  const u = await exigerRoleOuRediriger('TRANSPORTEUR')
  const profil = await db.transporteurProfil.findUnique({ where: { userId: u.id }, select: { latitude: true, longitude: true } })

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 border-b bg-white">
        <h1 className="text-xl font-bold text-slate-800">Fret à prendre</h1>
        <p className="text-sm text-slate-500">Les commissionnaires qui cherchent un transporteur près de chez vous — gratuit</p>
      </div>
      <BoardBesoins latitude={profil?.latitude ?? 46.6034} longitude={profil?.longitude ?? 1.8883} />
    </div>
  )
}
