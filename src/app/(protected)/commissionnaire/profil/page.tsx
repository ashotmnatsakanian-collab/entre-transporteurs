import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProfilCommissionnaireForm } from '@/components/commissionnaire/ProfilCommissionnaireForm'

export default async function ProfilCommissionnairePage() {
  const session = await getServerSession(authOptions)
  const profil = await db.commissionnaireProfil.findUnique({
    where: { userId: session!.user.id },
    select: { siret: true, raisonSociale: true },
  })

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mon profil</h1>
      <ProfilCommissionnaireForm profil={profil} />
    </div>
  )
}
