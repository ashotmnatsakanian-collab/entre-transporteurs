import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { FormulaireVehicule } from '@/components/flotte/FormulaireVehicule'

export default async function EditVehiculePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const vehicule = await db.vehicule.findFirst({
    where: { id: params.id, transporteur: { userId: session!.user.id } },
  })

  if (!vehicule) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Modifier le véhicule</h1>
      <FormulaireVehicule vehicule={vehicule} />
    </div>
  )
}
