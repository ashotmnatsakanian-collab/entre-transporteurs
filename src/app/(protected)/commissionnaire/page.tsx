import { db } from '@/lib/db'
import { exigerRoleOuRediriger } from '@/lib/garde'
import Link from 'next/link'
import { facturationActive } from '@/lib/facturation'

export default async function DashboardCommissionnairePage() {
  const u = await exigerRoleOuRediriger('COMMISSIONNAIRE')

  const abo = await db.abonnement.findUnique({ where: { userId: u.id } })
  const profil = await db.commissionnaireProfil.findUnique({ where: { userId: u.id } })

  const nbConversations = await db.conversation.count({
    where: { participants: { some: { userId: u.id } } },
  })

  const nbNonLus = await db.message.count({
    where: {
      conversation: { participants: { some: { userId: u.id } } },
      expediteurId: { not: u.id },
      lu: false,
    },
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="text-slate-500">{profil?.raisonSociale}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Conversations" value={nbConversations} icon="💬" />
        <StatCard label="Messages non lus" value={nbNonLus} icon="📬" />
        <StatCard
          label="Abonnement"
          value={libelleAbonnement(abo?.statut)}
          icon="💳"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard
          href="/commissionnaire/recherche"
          emoji="📣"
          label="Trouver un transporteur"
          desc="Disponibilités en direct ou recherche détaillée par véhicule"
          primary
        />
        <ActionCard
          href="/commissionnaire/besoins"
          emoji="📦"
          label="Publier un besoin"
          desc="Un fret à transporter ? Les transporteurs proches répondent"
        />
        <ActionCard href="/carte" emoji="🗺️" label="Carte interactive" desc="Visualisez tous les transporteurs disponibles" />
        <ActionCard href="/messages" emoji="💬" label="Messagerie" desc={nbNonLus > 0 ? `${nbNonLus} message(s) non lu(s)` : 'Vos conversations'} />
      </div>
    </div>
  )
}

function libelleAbonnement(statut?: string): string {
  if (facturationActive()) return statut === 'TRIALING' ? 'Essai gratuit' : 'Actif'
  return 'Gratuit (lancement)'
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function ActionCard({ href, emoji, label, desc, primary = false }: {
  href: string; emoji: string; label: string; desc: string; primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl p-5 transition-all ${
        primary
          ? 'bg-brand-600 text-white hover:bg-brand-700'
          : 'bg-white border border-slate-200 hover:border-brand-400 hover:shadow-sm'
      }`}
    >
      <div className="text-2xl mb-2">{emoji}</div>
      <div className={`font-semibold ${primary ? 'text-white' : 'text-slate-800'}`}>{label}</div>
      <div className={`text-xs mt-1 ${primary ? 'text-brand-100' : 'text-slate-500'}`}>{desc}</div>
    </Link>
  )
}
