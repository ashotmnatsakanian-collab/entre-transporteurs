import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { utilisateurCourant } from '@/lib/api'
import { emailActif } from '@/lib/email'
import { GestionCompte } from '@/components/compte/GestionCompte'

export const metadata = { title: 'Mon compte — Entre Transporteurs' }

export default async function ComptePage() {
  const u = await utilisateurCourant()
  if (!u) redirect('/deconnexion')

  const user = await db.user.findUniqueOrThrow({
    where: { id: u.id },
    select: { email: true, nom: true, role: true, createdAt: true, alertesEmail: true, verifie: true },
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
    </div>
  )
}
