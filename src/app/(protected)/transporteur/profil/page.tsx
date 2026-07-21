import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProfilTransporteurForm } from '@/components/flotte/ProfilTransporteurForm'

export default async function ProfilTransporteurPage() {
  const session = await getServerSession(authOptions)
  const profil = await db.transporteurProfil.findUnique({
    where: { userId: session!.user.id },
  })

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mon profil transporteur</h1>
      <ProfilTransporteurForm profil={profil} />
    </div>
  )
}
