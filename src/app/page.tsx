import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    if (session.user.role === 'TRANSPORTEUR') redirect('/transporteur')
    else redirect('/commissionnaire')
  }

  const [nbTransporteurs, nbAnnoncesActives, nbCommissionnaires] = await Promise.all([
    db.transporteurProfil.count(),
    db.annonce.count({
      where: {
        active: true,
        OR: [
          { dateDisponibiliteFin: { gte: new Date() } },
          { AND: [{ dateDisponibiliteFin: null }, { dateDisponibilite: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }] },
        ],
      },
    }),
    db.commissionnaireProfil.count(),
  ])

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-slate-800">🚛 Entre Transporteurs</span>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-slate-600 hover:text-slate-900">Se connecter</Link>
            <Link href="/register" className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors">
              Créer un compte
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
          Ne roulez plus jamais à vide.
        </h1>
        <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
          La bourse de fret qui connecte transporteurs et commissionnaires en temps réel.
          Les transporteurs publient leurs disponibilités gratuitement, les commissionnaires
          trouvent un véhicule libre en quelques secondes.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register?role=TRANSPORTEUR"
            className="w-full sm:w-auto bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-900 transition-colors"
          >
            🚛 Je suis transporteur — gratuit
          </Link>
          <Link href="/register?role=COMMISSIONNAIRE"
            className="w-full sm:w-auto bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors"
          >
            📋 Je cherche un transporteur
          </Link>
        </div>

        {(nbTransporteurs > 0 || nbAnnoncesActives > 0) && (
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">{nbTransporteurs}</div>
              <div className="text-xs text-slate-500">transporteur{nbTransporteurs > 1 ? 's' : ''} inscrit{nbTransporteurs > 1 ? 's' : ''}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{nbAnnoncesActives}</div>
              <div className="text-xs text-slate-500">annonce{nbAnnoncesActives > 1 ? 's' : ''} active{nbAnnoncesActives > 1 ? 's' : ''} en ce moment</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{nbCommissionnaires}</div>
              <div className="text-xs text-slate-500">commissionnaire{nbCommissionnaires > 1 ? 's' : ''} sur la plateforme</div>
            </div>
          </div>
        )}
      </section>

      {/* Comment ça marche */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-10">Comment ça marche</h2>
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <div className="text-3xl mb-3">🚛</div>
              <h3 className="font-semibold text-slate-800 mb-3">Vous êtes transporteur</h3>
              <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
                <li>Créez votre compte et votre flotte, gratuitement</li>
                <li>Publiez vos trajets retour et disponibilités</li>
                <li>Les commissionnaires vous contactent directement</li>
              </ol>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="font-semibold text-slate-800 mb-3">Vous êtes commissionnaire</h3>
              <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
                <li>Recherchez par zone, véhicule, date ou destination</li>
                <li>Consultez les avis et le profil vérifié du transporteur</li>
                <li>Contactez-le en un clic, essai gratuit 30 jours</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: '📣', label: 'Annonces en temps réel', desc: 'Trajets retour publiés instantanément' },
            { icon: '🗺️', label: 'Carte interactive', desc: 'Visualisez les disponibilités près de vous' },
            { icon: '⭐', label: 'Avis vérifiés', desc: 'La confiance entre professionnels' },
          ].map((f) => (
            <div key={f.label}>
              <div className="text-3xl mb-2">{f.icon}</div>
              <div className="font-semibold text-slate-800">{f.label}</div>
              <div className="text-sm text-slate-500 mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-gradient-to-br from-brand-900 to-brand-600 py-16 text-center">
        <h2 className="text-2xl font-bold text-white">Prêt à commencer ?</h2>
        <p className="text-brand-100 mt-2">Gratuit pour les transporteurs · 69€/mois pour les commissionnaires, essai 30 jours</p>
        <Link href="/abonnement/tarification"
          className="inline-block mt-6 bg-white text-brand-700 px-6 py-3 rounded-xl font-semibold hover:bg-brand-50 transition-colors"
        >
          Voir les tarifs
        </Link>
      </section>

      <footer className="text-center py-6 text-xs text-slate-400">
        🚛 Entre Transporteurs — Bourse de fret géolocalisée
      </footer>
    </div>
  )
}
