import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { CarteVehicule } from '@/components/flotte/CarteVehicule'

export default async function FlottePage() {
  const session = await getServerSession(authOptions)
  const profil = await db.transporteurProfil.findUnique({
    where: { userId: session!.user.id },
    include: { vehicules: { orderBy: { createdAt: 'desc' } } },
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ma flotte</h1>
          <p className="text-slate-500 text-sm">{profil?.vehicules.length ?? 0} véhicule(s)</p>
        </div>
        <Link
          href="/transporteur/flotte/nouveau"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + Nouveau véhicule
        </Link>
      </div>

      {profil?.vehicules.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-4">🚚</div>
          <p className="font-medium">Aucun véhicule enregistré</p>
          <Link href="/transporteur/flotte/nouveau" className="mt-3 inline-block text-brand-600 underline text-sm">
            Ajouter mon premier véhicule
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profil?.vehicules.map((v) => (
            <CarteVehicule key={v.id} vehicule={v} editUrl={`/transporteur/flotte/${v.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
