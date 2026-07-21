import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/ui/Navbar'
import { Sidebar } from '@/components/ui/Sidebar'
import { BanniereEssai } from '@/components/abonnement/BanniereEssai'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const abo = await db.abonnement.findUnique({ where: { userId: session.user.id } })
  if (!abo) redirect('/login')

  const maintenant = new Date()

  // Expiration silencieuse du trial côté serveur
  if (abo.statut === 'TRIALING' && abo.dateFinEssai && abo.dateFinEssai <= maintenant) {
    await db.abonnement.update({ where: { id: abo.id }, data: { statut: 'PAST_DUE' } })
    redirect('/abonnement/reactivation')
  }

  if (abo.statut === 'PAST_DUE' || abo.statut === 'CANCELED') {
    redirect('/abonnement/reactivation')
  }

  const joursRestants =
    abo.statut === 'TRIALING' && abo.dateFinEssai
      ? Math.ceil((abo.dateFinEssai.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24))
      : null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={session.user.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar user={session.user} />
        {joursRestants !== null && <BanniereEssai joursRestants={joursRestants} />}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
