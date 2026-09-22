import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { CarteVehicule } from '@/components/flotte/CarteVehicule'
import { ContactButton } from '@/components/ui/ContactButton'
import { SectionAvis } from '@/components/avis/SectionAvis'
import { BadgeNote } from '@/components/avis/Etoiles'

export default async function ProfilPublicPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const profil = await db.transporteurProfil.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, nom: true, email: true, telephone: true, createdAt: true, verifie: true } },
      vehicules: { where: { actif: true }, orderBy: { type: 'asc' } },
    },
  })

  if (!profil) notFound()

  const agregatAvis = await db.avis.aggregate({
    where: { transporteurId: profil.id },
    _avg: { note: true },
    _count: true,
  })

  const peutNoter =
    !!session &&
    session.user.role === 'COMMISSIONNAIRE' &&
    !!(await db.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: session.user.id } } },
          { participants: { some: { userId: profil.user.id } } },
        ],
      },
    }))

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{profil.raisonSociale}</h1>
            {profil.user.verifie && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">✅ Vérifié</span>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${profil.disponible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {profil.disponible ? 'Disponible' : 'Indisponible'}
            </span>
          </div>
          <div className="mt-1">
            <BadgeNote moyenne={agregatAvis._avg.note} total={agregatAvis._count} />
          </div>
          <p className="text-slate-500 text-sm mt-1">SIRET {profil.siret}</p>
          {profil.description && <p className="text-slate-700 text-sm mt-3">{profil.description}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {profil.zonesCirculation.map((z) => (
              <span key={z} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">Dept. {z}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {session && session.user.id !== profil.user.id && (
            <ContactButton destinataireId={profil.user.id} destinataireNom={profil.user.nom} />
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold mb-3">Contact</h2>
        <div className="text-sm space-y-1 text-slate-700">
          <p>👤 {profil.user.nom}</p>
          {profil.user.telephone && <p>📞 {profil.user.telephone}</p>}
          <p>📧 {profil.user.email}</p>
          <p className="text-slate-400 text-xs mt-2">Membre depuis {new Date(profil.user.createdAt).toLocaleDateString('fr')}</p>
        </div>
      </div>

      {/* Flotte */}
      <div>
        <h2 className="font-semibold text-lg mb-3">Flotte ({profil.vehicules.length} véhicule(s))</h2>
        {profil.vehicules.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucun véhicule publié.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profil.vehicules.map((v) => (
              <CarteVehicule key={v.id} vehicule={v} />
            ))}
          </div>
        )}
      </div>

      {/* Avis */}
      <SectionAvis transporteurId={profil.id} peutNoter={peutNoter} />

      <div className="text-sm text-slate-400">
        <Link href="/commissionnaire/recherche" className="hover:underline">← Retour à la recherche</Link>
      </div>
    </div>
  )
}
