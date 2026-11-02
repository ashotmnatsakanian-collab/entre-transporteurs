import Link from 'next/link'
import { RenouvelerDisponibilite } from '@/components/position/RenouvelerDisponibilite'

export const metadata = { title: 'Renouveler ma disponibilité — Entre Transporteurs' }

// Page ouverte depuis l'e-mail de rappel. Un bouton de confirmation évite qu'un simple chargement du lien
// (aperçu de messagerie, antivirus) renouvelle la disponibilité à l'insu du transporteur.
export default async function RenouvelerPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Toujours disponible ?</h1>
        {token ? (
          <RenouvelerDisponibilite token={token} />
        ) : (
          <p className="text-sm text-slate-700">Ce lien est incomplet. <Link href="/transporteur" className="text-brand-700 underline">Ouvrir mon espace</Link></p>
        )}
      </div>
    </div>
  )
}
