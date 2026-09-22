import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { GestionAnnonces } from '@/components/annonces/GestionAnnonces'

export default async function AnnoncesTransporteurPage() {
  const session = await getServerSession(authOptions)

  const profil = await db.transporteurProfil.findUnique({
    where: { userId: session!.user.id },
    include: { vehicules: { where: { actif: true }, orderBy: { type: 'asc' } } },
  })

  const annonces = profil
    ? await db.annonce.findMany({
        where: { transporteurId: profil.id },
        include: { vehicule: true },
        orderBy: { dateDisponibilite: 'desc' },
      })
    : []

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Mes disponibilités</h1>
      <p className="text-slate-500 text-sm mb-6">
        Publiez vos trajets retour et vos disponibilités pour être trouvé rapidement par un commissionnaire — gratuit et illimité.
      </p>
      <GestionAnnonces
        annoncesInitiales={JSON.parse(JSON.stringify(annonces))}
        vehicules={profil?.vehicules ?? []}
        positionDefaut={{ lat: profil?.latitude ?? 46.6034, lng: profil?.longitude ?? 1.8883 }}
      />
    </div>
  )
}
