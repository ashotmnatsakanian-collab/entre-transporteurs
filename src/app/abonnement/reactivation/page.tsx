import { EcranGating } from '@/components/abonnement/EcranGating'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function ReactivationPage() {
  const session = await getServerSession(authOptions)
  const abo = session ? await db.abonnement.findUnique({ where: { userId: session.user.id } }) : null

  return <EcranGating statut={abo?.statut ?? 'CANCELED'} />
}
