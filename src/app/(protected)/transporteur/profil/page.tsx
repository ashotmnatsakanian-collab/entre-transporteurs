import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProfilTransporteurForm } from '@/components/flotte/ProfilTransporteurForm'
import { FormulaireZone } from '@/components/position/FormulaireZone'

export default async function ProfilTransporteurPage() {
  const session = await getServerSession(authOptions)
  const profil = await db.transporteurProfil.findUnique({
    where: { userId: session!.user.id },
  })

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Mon profil transporteur</h1>
      <ProfilTransporteurForm profil={profil} />
      {profil && (
        <FormulaireZone
          rayonInterventionKm={profil.rayonInterventionKm}
          departements={profil.zonesCirculation}
          destinationVille={profil.destinationVille}
          destinationInsee={profil.destinationInsee}
        />
      )}
    </div>
  )
}
