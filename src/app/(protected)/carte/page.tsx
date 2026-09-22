import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import dynamic from 'next/dynamic'

const CarteInteractive = dynamic(() => import('@/components/carte/CarteInteractive'), { ssr: false })

export default async function CartePage() {
  const session = await getServerSession(authOptions)

  // Les transporteurs sont gratuits — tous ceux inscrits apparaissent sur la carte
  const transporteurs = await db.transporteurProfil.findMany({
    include: {
      user: { select: { id: true, nom: true, telephone: true, email: true } },
      vehicules: { where: { actif: true } },
    },
  })

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Carte des transporteurs</h1>
          <p className="text-sm text-slate-500">{transporteurs.length} transporteur(s) actif(s)</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Disponible</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Indisponible</span>
        </div>
      </div>
      <div className="flex-1">
        <CarteInteractive
          transporteurs={JSON.parse(JSON.stringify(transporteurs))}
          currentUserId={session?.user.id}
        />
      </div>
    </div>
  )
}
