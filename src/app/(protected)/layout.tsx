import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { utilisateurCourant } from '@/lib/api'
import { Navbar } from '@/components/ui/Navbar'
import { Sidebar } from '@/components/ui/Sidebar'
import { BanniereEssai } from '@/components/abonnement/BanniereEssai'
import { BanniereEmail } from '@/components/ui/BanniereEmail'
import { BarrePosition } from '@/components/position/BarrePosition'
import { etatPosition } from '@/lib/position'
import { BanniereFacturation } from '@/components/abonnement/BanniereFacturation'
import { exigerDocuments, utilisateurEstConforme } from '@/lib/documents'
import { facturationActive, facturationAnnoncee, finEssaiEffective, joursRestants } from '@/lib/facturation'

// Pages qui exposent des transporteurs ou permettent de les contacter (l'API applique la même règle)
const CHEMINS_RESERVES_AUX_CONFORMES = ['/carte', '/commissionnaire/recherche', '/commissionnaire/besoins', '/commissionnaire/annonces', '/profils']

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Compte relu en base : suspendu, supprimé ou session révoquée => déconnexion immédiate
  const user = await utilisateurCourant()
  if (!user) redirect('/deconnexion')
  // CGU mises à jour depuis la dernière acceptation : à relire et accepter avant de continuer
  if (!user.cguAcceptees) redirect('/accepter-cgu')

  // Documents légaux : un commissionnaire non conforme n'accède ni à la recherche, ni à la carte, ni aux besoins
  if (user.role === 'COMMISSIONNAIRE' && exigerDocuments() && !(await utilisateurEstConforme(user.id))) {
    const chemin = (await headers()).get('x-chemin') ?? ''
    if (CHEMINS_RESERVES_AUX_CONFORMES.some((p) => chemin === p || chemin.startsWith(`${p}/`))) redirect('/commissionnaire/documents')
  }

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

  // Transporteur : position actuelle et disponibilité (barre fixe en bas de l'écran)
  const profilTransporteur = user.role === 'TRANSPORTEUR' ? await db.transporteurProfil.findUnique({ where: { userId: user.id } }) : null
  const etat = profilTransporteur ? etatPosition(profilTransporteur) : null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={user.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar user={{ id: user.id, nom: user.nom, email: user.email, role: user.role }} />
        {!user.emailVerifie && <BanniereEmail />}
        {facturationLe && <BanniereFacturation date={facturationLe} />}
        {joursRestantsEssai !== null && <BanniereEssai joursRestants={joursRestantsEssai} />}
        <main className="flex-1 overflow-auto">{children}</main>
        {etat && (
          <BarrePosition
            etat={{
              positionVille: etat.positionVille,
              positionInsee: etat.positionInsee,
              positionDepartement: etat.positionDepartement,
              disponible: etat.disponible,
              disponibleJusqua: etat.disponibleJusqua?.toISOString() ?? null,
              dureeHeures: etat.dureeHeures,
              derniereMAJ: etat.derniereMAJ.toISOString(),
            }}
          />
        )}
      </div>
    </div>
  )
}
