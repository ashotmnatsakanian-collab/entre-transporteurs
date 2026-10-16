import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { aAccesPayant } from '@/lib/acces'
import { paireCle } from '@/lib/conversations'
import { exigerRoleOuRediriger } from '@/lib/garde'
import { CarteVehicule } from '@/components/flotte/CarteVehicule'
import { ContactButton } from '@/components/ui/ContactButton'
import { BoutonSignaler } from '@/components/ui/BoutonSignaler'
import { SectionAvis } from '@/components/avis/SectionAvis'
import { BadgeNote } from '@/components/avis/Etoiles'

export const metadata = { title: 'Profil transporteur — Entre Transporteurs' }

export default async function ProfilPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const u = await exigerRoleOuRediriger('COMMISSIONNAIRE', 'TRANSPORTEUR')

  const profil = await db.transporteurProfil.findFirst({
    where: { id, user: { suspendu: false, supprimeLe: null } },
    include: {
      // Pas d'e-mail : la prise de contact passe par la messagerie
      user: { select: { id: true, nom: true, telephone: true, createdAt: true, verifie: true } },
      vehicules: { where: { actif: true }, orderBy: { type: 'asc' } },
    },
  })
  if (!profil) notFound()

  const estProprietaire = profil.user.id === u.id
  // Un transporteur ne consulte pas les profils de ses concurrents
  if (u.role === 'TRANSPORTEUR' && !estProprietaire) redirect('/transporteur')
  if (u.role === 'COMMISSIONNAIRE' && !(await aAccesPayant(u.id))) redirect('/abonnement/reactivation')

  const agregatAvis = await db.avis.aggregate({ where: { transporteurId: profil.id }, _avg: { note: true }, _count: true })

  // On ne peut noter qu'après un échange dans les deux sens (même règle que l'API)
  let peutNoter = false
  if (u.role === 'COMMISSIONNAIRE') {
    const conv = await db.conversation.findUnique({
      where: { cle: paireCle(u.id, profil.user.id) },
      select: { messages: { where: { expediteurId: { in: [u.id, profil.user.id] } }, select: { expediteurId: true }, distinct: ['expediteurId'] } },
    })
    peutNoter = (conv?.messages.length ?? 0) >= 2
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{profil.raisonSociale}</h1>
            {profil.user.verifie && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700" title="Établissement existant et en activité au répertoire officiel">✅ SIRET vérifié</span>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${profil.disponible ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {profil.disponible ? 'Disponible maintenant' : 'Pas disponible maintenant'}
            </span>
          </div>
          <div className="mt-1"><BadgeNote moyenne={agregatAvis._avg.note} total={agregatAvis._count} /></div>
          <p className="text-slate-500 text-sm mt-1">
            SIRET {profil.siret || 'non renseigné'}
            {profil.activiteOfficielle && ` · activité ${profil.activiteOfficielle}`}
          </p>
          {profil.description && <p className="text-slate-700 text-sm mt-3 whitespace-pre-line">{profil.description}</p>}
        </div>
        {u.role === 'COMMISSIONNAIRE' && (
          <div className="flex flex-col gap-2 items-start sm:items-end">
            <ContactButton destinataireId={profil.user.id} destinataireNom={profil.user.nom} />
            <BoutonSignaler cibleId={profil.user.id} />
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold mb-3">Contact</h2>
        <div className="text-sm space-y-1 text-slate-700">
          <p>👤 {profil.user.nom}</p>
          {profil.user.telephone ? <p>📞 {profil.user.telephone}</p> : <p className="text-slate-400">Téléphone non renseigné</p>}
          <p className="text-slate-400 text-xs mt-2">Membre depuis {profil.user.createdAt.toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-lg mb-3">Flotte ({profil.vehicules.length} véhicule(s))</h2>
        {profil.vehicules.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucun véhicule publié.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profil.vehicules.map((v) => <CarteVehicule key={v.id} vehicule={v} />)}
          </div>
        )}
      </div>

      {u.role === 'COMMISSIONNAIRE' && <SectionAvis transporteurId={profil.id} peutNoter={peutNoter} />}

      <div className="text-sm text-slate-400">
        <Link href={u.role === 'COMMISSIONNAIRE' ? '/commissionnaire/recherche' : '/transporteur'} className="hover:underline">← Retour</Link>
      </div>
    </div>
  )
}
