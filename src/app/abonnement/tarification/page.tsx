import Link from 'next/link'
import { SouscriptionButton } from '@/components/abonnement/SouscriptionButton'

export default function TarificationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-600 flex flex-col items-center justify-center p-6">
      <Link href="/" className="text-white text-2xl font-bold mb-2">🚛 Entre Transporteurs</Link>
      <p className="text-brand-100 text-sm mb-10 text-center max-w-md">
        Les transporteurs se signalent gratuitement, les commissionnaires les trouvent en quelques secondes.
      </p>

      <div className="grid sm:grid-cols-2 gap-6 max-w-3xl w-full">
        {/* Transporteur — gratuit */}
        <div className="bg-white rounded-2xl shadow-2xl w-full p-8 text-center flex flex-col">
          <div className="text-3xl mb-2">🚛</div>
          <div className="inline-block bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full mb-4 mx-auto">
            Transporteur
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Gratuit</h2>
          <p className="text-slate-400 text-sm">Pour toujours, sans carte bancaire</p>

          <ul className="mt-6 space-y-3 text-left text-slate-700 text-sm flex-1">
            {[
              '📣 Publiez vos trajets retour et disponibilités',
              '📍 Profil visible sur la carte et en recherche',
              '🔔 Bascule disponible / indisponible en un clic',
              '🚚 Gestion complète de la flotte',
              '💬 Messagerie illimitée',
              '🙅 Ne roulez plus jamais à vide',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">{f}</li>
            ))}
          </ul>

          <div className="mt-8">
            <Link href="/register" className="block w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-900 transition-colors">
              Créer mon compte transporteur
            </Link>
          </div>
        </div>

        {/* Commissionnaire — payant */}
        <div className="bg-white rounded-2xl shadow-2xl w-full p-8 text-center flex flex-col">
          <div className="text-3xl mb-2">📋</div>
          <div className="inline-block bg-amber-100 text-amber-700 text-sm font-medium px-3 py-1 rounded-full mb-4 mx-auto">
            Commissionnaire
          </div>
          <h2 className="text-3xl font-bold text-slate-800">69 €<span className="text-lg text-slate-500 font-normal">/mois TTC</span></h2>
          <p className="text-green-600 font-semibold mt-2">1 mois d'essai gratuit</p>
          <p className="text-slate-400 text-sm">Aucun prélèvement pendant 30 jours</p>

          <ul className="mt-6 space-y-3 text-left text-slate-700 text-sm flex-1">
            {[
              '📣 Annonces de disponibilité en temps réel',
              '🗺️ Carte interactive en temps réel',
              '🔍 Moteur de recherche géolocalisé',
              '💬 Messagerie illimitée',
              '⚡ Trouvez un transporteur dans l\'immédiat',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">{f}</li>
            ))}
          </ul>

          <div className="mt-8 space-y-3">
            <SouscriptionButton />
            <Link href="/register" className="block text-sm text-slate-500 hover:text-slate-800">
              Pas encore de compte ? Créer un compte →
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-6 text-brand-200 text-xs">
        Résiliation possible à tout moment · Paiement sécurisé par Stripe
      </p>
    </div>
  )
}
