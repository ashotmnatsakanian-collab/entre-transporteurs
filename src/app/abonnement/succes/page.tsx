import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function SuccesPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user.role

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Abonnement activé !</h1>
        <p className="text-slate-500 mb-8">
          Votre abonnement Entre Transporteurs est maintenant actif. Profitez de toutes les fonctionnalités.
        </p>
        <Link
          href={role === 'TRANSPORTEUR' ? '/transporteur' : '/commissionnaire'}
          className="bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
        >
          Accéder à mon espace →
        </Link>
      </div>
    </div>
  )
}
