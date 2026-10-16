import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { utilisateurCourant } from '@/lib/api'
import { emailActif } from '@/lib/email'
import Link from 'next/link'
import { GestionCompte } from '@/components/compte/GestionCompte'
import { EDITEUR } from '@/lib/legal'

export const metadata = { title: 'Mon compte — Entre Transporteurs' }

export default async function ComptePage() {
  const u = await utilisateurCourant()
  if (!u) redirect('/deconnexion')

  const user = await db.user.findUniqueOrThrow({
    where: { id: u.id },
    select: { email: true, nom: true, role: true, createdAt: true, alertesEmail: true, verifie: true, cguAccepteesLe: true },
  })

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mon compte</h1>
        <p className="text-sm text-slate-500 mt-1">
          {user.nom} · {user.email} · membre depuis le {user.createdAt.toLocaleDateString('fr-FR')}
          {!u.emailVerifie && <span className="ml-2 text-amber-700">· e-mail non confirmé</span>}
        </p>
      </div>
      <GestionCompte
        alertesEmail={user.alertesEmail}
        peutRecevoirAlertes={user.role !== 'ADMIN'}
        emailsActifs={emailActif}
        estAdmin={user.role === 'ADMIN'}
      />

      <section className="bg-white border border-slate-200 rounded-xl p-5 text-sm">
        <h2 className="font-semibold text-slate-800 mb-2">Documents juridiques</h2>
        <p className="text-slate-500 mb-3">
          {user.cguAccepteesLe
            ? `Conditions acceptées le ${user.cguAccepteesLe.toLocaleDateString('fr-FR')}.`
            : 'Conditions non encore acceptées.'}
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          <li><Link href="/cgu" className="text-brand-600 underline">Conditions d'utilisation</Link></li>
          <li><Link href="/confidentialite" className="text-brand-600 underline">Politique de confidentialité</Link></li>
          <li><Link href="/mentions-legales" className="text-brand-600 underline">Mentions légales</Link></li>
          {!EDITEUR.email.startsWith('[') && <li><a href={`mailto:${EDITEUR.email}`} className="text-brand-600 underline">Nous contacter</a></li>}
        </ul>
      </section>
    </div>
  )
}
