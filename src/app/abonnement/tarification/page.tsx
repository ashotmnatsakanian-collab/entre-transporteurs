import Link from 'next/link'
import { SouscriptionButton } from '@/components/abonnement/SouscriptionButton'

export default function TarificationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-600 flex flex-col items-center justify-center p-6">
      <Link href="/" className="text-white text-2xl font-bold mb-10">🚛 Entre Transporteurs</Link>

      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="inline-block bg-amber-100 text-amber-700 text-sm font-medium px-3 py-1 rounded-full mb-4">
          Offre unique
        </div>
        <h1 className="text-3xl font-bold text-slate-800">99 €<span className="text-lg text-slate-500 font-normal">/mois TTC</span></h1>
        <p className="text-green-600 font-semibold mt-2">1 mois d'essai gratuit</p>
        <p className="text-slate-400 text-sm">Aucun prélèvement pendant 30 jours</p>

        <ul className="mt-6 space-y-3 text-left text-slate-700 text-sm">
          {[
            '🗺️ Carte interactive en temps réel',
            '🔍 Moteur de recherche géolocalisé',
            '💬 Messagerie illimitée',
            '🚚 Gestion complète de la flotte',
            '📍 Profil visible sur la carte',
            '🔔 Disponibilité temps réel',
            '📊 Accès à tous les transporteurs',
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">{f}</li>
          ))}
        </ul>

        <div className="mt-8 space-y-3">
          <SouscriptionButton />
          <Link href="/register" className="block text-sm text-slate-500 hover:text-slate-800">
            Pas encore de compte ? Créer un compte gratuit →
          </Link>
        </div>
      </div>

      <p className="mt-6 text-brand-200 text-xs">
        Résiliation possible à tout moment · Paiement sécurisé par Stripe
      </p>
    </div>
  )
}
