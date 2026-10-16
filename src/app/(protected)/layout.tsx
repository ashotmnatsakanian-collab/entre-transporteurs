import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { utilisateurCourant } from '@/lib/api'
import { Navbar } from '@/components/ui/Navbar'
import { Sidebar } from '@/components/ui/Sidebar'
import { BanniereEssai } from '@/components/abonnement/BanniereEssai'
import { BanniereEmail } from '@/components/ui/BanniereEmail'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Compte relu en base : suspendu, supprimé ou session révoquée => déconnexion immédiate
  const user = await utilisateurCourant()
  if (!user) redirect('/deconnexion')

  // Gating d'abonnement : commissionnaires uniquement, et seulement si Stripe est configuré
  let joursRestants: number | null = null
  if (process.env.STRIPE_SECRET_KEY && user.role === 'COMMISSIONNAIRE') {
    const abo = await db.abonnement.findUnique({ where: { userId: user.id } })
    if (!abo) redirect('/deconnexion')

    const maintenant = new Date()
    if (abo.statut === 'TRIALING' && abo.dateFinEssai && abo.dateFinEssai <= maintenant) {
      await db.abonnement.update({ where: { id: abo.id }, data: { statut: 'PAST_DUE' } })
      redirect('/abonnement/reactivation')
    }
    if (abo.statut === 'PAST_DUE' || abo.statut === 'CANCELED') redirect('/abonnement/reactivation')

    if (abo.statut === 'TRIALING' && abo.dateFinEssai) {
      joursRestants = Math.ceil((abo.dateFinEssai.getTime() - maintenant.getTime()) / 86_400_000)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={user.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar user={{ id: user.id, nom: user.nom, email: user.email, role: user.role }} />
        {!user.emailVerifie && <BanniereEmail />}
        {joursRestants !== null && <BanniereEssai joursRestants={joursRestants} />}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
