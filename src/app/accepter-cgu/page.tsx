import Link from 'next/link'
import { redirect } from 'next/navigation'
import { utilisateurCourant } from '@/lib/api'
import { accueilPour } from '@/lib/routes'
import { MISE_A_JOUR_LEGALE, VERSION_CGU } from '@/lib/legal'
import { AcceptationCgu } from '@/components/compte/AcceptationCgu'

export const metadata = { title: 'Conditions mises à jour — Entre Transporteurs' }

// Affichée quand les CGU ont changé depuis la dernière acceptation du compte
export default async function AccepterCguPage() {
  const u = await utilisateurCourant()
  if (!u) redirect('/login')
  if (u.cguAcceptees) redirect(accueilPour(u.role))

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-4xl mb-3">📄</div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Nos conditions ont été mises à jour</h1>
        <p className="text-sm text-slate-500 mb-4">
          Les conditions d'utilisation et la politique de confidentialité ont évolué (version du {MISE_A_JOUR_LEGALE}).
          Merci de les relire et de les accepter pour continuer à utiliser Entre Transporteurs.
        </p>
        <ul className="text-sm mb-6 space-y-1">
          <li><Link href="/cgu" target="_blank" className="text-brand-600 underline">Conditions d'utilisation</Link></li>
          <li><Link href="/confidentialite" target="_blank" className="text-brand-600 underline">Politique de confidentialité</Link></li>
        </ul>
        <AcceptationCgu version={VERSION_CGU} />
        <p className="text-xs text-slate-400 mt-4">
          Vous ne souhaitez pas accepter ? Vous pouvez{' '}
          <Link href="/deconnexion" className="underline">vous déconnecter</Link> ; la suppression de votre compte reste possible depuis la page « Mon compte ».
        </p>
      </div>
    </div>
  )
}
