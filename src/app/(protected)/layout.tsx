import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { utilisateurCourant } from '@/lib/api'
import { Navbar } from '@/components/ui/Navbar'
import { Sidebar } from '@/components/ui/Sidebar'
import { BanniereEssai } from '@/components/abonnement/BanniereEssai'
import { BanniereEmail } from '@/components/ui/BanniereEmail'
import { BanniereFacturation } from '@/components/abonnement/BanniereFacturation'
import { facturationActive, facturationAnnoncee, finEssaiEffective, joursRestants } from '@/lib/facturation'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Compte relu en base : suspendu, supprimé ou session révoquée => déconnexion immédiate
  const user = await utilisateurCourant()
  if (!user) redirect('/deconnexion')
  // CGU mises à jour depuis la dernière acceptation : à relire et accepter avant de continuer
  if (!user.cguAcceptees) redirect('/accepter-cgu')

  // Gating d'abonnement : commissionnaires uniquement, une fois la facturation ouverte
  let joursRestantsEssai: number | null = null
  let facturationLe: Date | null = null
  if (user.role === 'COMMISSIONNAIRE') {
    facturationLe = facturationAnnoncee()
    if (facturationActive()) {
      const abo = await db.abonnement.findUnique({ where: { userId: user.id } })
      if (!abo) redirect('/deconnexion')

      const maintenant = new Date()
      const finEssai = finEssaiEffective(abo.dateFinEssai)
      if (abo.statut === 'TRIALING' && finEssai && finEssai <= maintenant) {
        await db.abonnement.update({ where: { id: abo.id }, data: { statut: 'PAST_DUE' } })
        redirect('/abonnement/reactivation')
      }
      if (abo.statut === 'PAST_DUE' || abo.statut === 'CANCELED') redirect('/abonnement/reactivation')

      if (abo.statut === 'TRIALING' && finEssai) joursRestantsEssai = joursRestants(finEssai, maintenant)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={user.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar user={{ id: user.id, nom: user.nom, email: user.email, role: user.role }} />
        {!user.emailVerifie && <BanniereEmail />}
        {facturationLe && <BanniereFacturation date={facturationLe} />}
        {joursRestantsEssai !== null && <BanniereEssai joursRestants={joursRestantsEssai} />}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
