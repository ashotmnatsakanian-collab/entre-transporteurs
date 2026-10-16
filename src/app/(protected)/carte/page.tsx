import { db } from '@/lib/db'
import { exigerRoleOuRediriger } from '@/lib/garde'
import { CarteClient } from '@/components/carte/CarteClient'

export const metadata = { title: 'La carte — Entre Transporteurs' }

export default async function CartePage() {
  // La carte expose des coordonnées de transporteurs : réservée aux commissionnaires
  const u = await exigerRoleOuRediriger('COMMISSIONNAIRE')

  const [transporteurs, agregatsAvis] = await Promise.all([
    db.transporteurProfil.findMany({
      where: { user: { suspendu: false, supprimeLe: null } },
      select: {
        id: true, userId: true, raisonSociale: true, description: true, latitude: true, longitude: true,
        disponible: true, zonesCirculation: true,
        // Jamais d'e-mail ; le téléphone n'est lu que parce que l'appelant est un commissionnaire autorisé
        user: { select: { id: true, nom: true, telephone: true, verifie: true } },
        vehicules: { where: { actif: true }, select: { id: true, type: true, chargeUtile: true } },
      },
      take: 1000,
    }),
    db.avis.groupBy({ by: ['transporteurId'], _avg: { note: true }, _count: true }),
  ])

  const noteParTransporteur = new Map(agregatsAvis.map((a) => [a.transporteurId, a]))
  const donnees = transporteurs.map((t) => ({
    ...t,
    verifie: t.user.verifie,
    note_moyenne: noteParTransporteur.get(t.id)?._avg.note ?? null,
    nb_avis: noteParTransporteur.get(t.id)?._count ?? 0,
  }))

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 border-b bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Carte des transporteurs</h1>
          <p className="text-sm text-slate-500">{transporteurs.length} transporteur(s) sur la carte</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Disponible maintenant</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400 inline-block" /> Pas disponible</span>
        </div>
      </div>
      <div className="flex-1">
        <CarteClient transporteurs={JSON.parse(JSON.stringify(donnees))} currentUserId={u.id} />
      </div>
    </div>
  )
}
