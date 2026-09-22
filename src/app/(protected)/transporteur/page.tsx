import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { DisponibiliteToggle } from '@/components/carte/DisponibiliteToggle'
import { TYPE_VEHICULE_LABELS } from '@/types'
import { BadgeNote } from '@/components/avis/Etoiles'

export default async function DashboardTransporteurPage() {
  const session = await getServerSession(authOptions)
  const profil = await db.transporteurProfil.findUnique({
    where: { userId: session!.user.id },
    include: {
      vehicules: { where: { actif: true }, orderBy: { type: 'asc' } },
    },
  })

  const abo = await db.abonnement.findUnique({ where: { userId: session!.user.id } })

  const [nbAnnoncesActives, agregatAvis] = profil
    ? await Promise.all([
        db.annonce.count({
          where: {
            transporteurId: profil.id,
            active: true,
            OR: [
              { dateDisponibiliteFin: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
              { AND: [{ dateDisponibiliteFin: null }, { dateDisponibilite: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }] },
            ],
          },
        }),
        db.avis.aggregate({ where: { transporteurId: profil.id }, _avg: { note: true }, _count: true }),
      ])
    : [0, null]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mon tableau de bord</h1>
          <p className="text-slate-500">{profil?.raisonSociale}</p>
        </div>
        <DisponibiliteToggle disponible={profil?.disponible ?? false} />
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Véhicules actifs" value={profil?.vehicules.length ?? 0} icon="🚚" />
        <StatCard label="Annonces actives" value={nbAnnoncesActives} icon="📣" href="/transporteur/annonces" />
        <StatCard
          label="Note"
          value={agregatAvis?._count ? <BadgeNote moyenne={agregatAvis._avg.note} total={agregatAvis._count} /> : 'Aucun avis'}
          icon="⭐"
        />
        <StatCard label="Abonnement" value={!abo ? 'Gratuit' : abo.statut === 'TRIALING' ? 'Essai' : 'Actif'} icon="💳" />
        <StatCard label="Disponibilité" value={profil?.disponible ? 'Oui' : 'Non'} icon={profil?.disponible ? '🟢' : '🔴'} />
      </div>

      {/* Flotte */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Ma flotte</h2>
          <Link href="/transporteur/flotte/nouveau" className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors">
            + Ajouter un véhicule
          </Link>
        </div>
        {profil?.vehicules.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Aucun véhicule. <Link href="/transporteur/flotte/nouveau" className="text-brand-600 underline">Ajouter le premier</Link></p>
        ) : (
          <div className="divide-y">
            {profil?.vehicules.map((v) => (
              <div key={v.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium">{TYPE_VEHICULE_LABELS[v.type]}</span>
                  <span className="text-slate-400 text-sm ml-2">{v.immatriculation}</span>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {v.chargeUtile.toLocaleString('fr')} kg
                    {v.longueur && ` · ${v.longueur / 100}m L`}
                    {v.specificites.length > 0 && ` · ${v.specificites.join(', ')}`}
                  </div>
                </div>
                <Link href={`/transporteur/flotte/${v.id}`} className="text-sm text-brand-600 hover:underline">
                  Modifier
                </Link>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 text-right">
          <Link href="/transporteur/flotte" className="text-sm text-slate-500 hover:text-slate-800 underline">
            Gérer toute la flotte →
          </Link>
        </div>
      </div>

      {/* Liens rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickLink href="/transporteur/annonces" emoji="📣" label="Mes disponibilités" desc="Publiez vos trajets retour" />
        <QuickLink href="/transporteur/profil" emoji="👤" label="Mon profil" desc="SIRET, zones, localisation" />
        <QuickLink href="/messages" emoji="💬" label="Messagerie" desc="Vos conversations en cours" />
        <QuickLink href="/carte" emoji="🗺️" label="La carte" desc="Voir tous les transporteurs" />
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, href }: { label: string; value: React.ReactNode; icon: string; href?: string }) {
  const contenu = (
    <>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </>
  )
  if (href) {
    return (
      <Link href={href} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-brand-400 hover:shadow-sm transition-all block">
        {contenu}
      </Link>
    )
  }
  return <div className="bg-white border border-slate-200 rounded-xl p-4">{contenu}</div>
}

function QuickLink({ href, emoji, label, desc }: { href: string; emoji: string; label: string; desc: string }) {
  return (
    <Link href={href} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-brand-400 hover:shadow-sm transition-all block">
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="font-medium">{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
    </Link>
  )
}
