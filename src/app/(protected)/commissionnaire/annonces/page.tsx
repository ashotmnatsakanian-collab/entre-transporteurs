import { RechercheAnnoncesClient } from '@/components/annonces/RechercheAnnoncesClient'

export default function AnnoncesCommissionnairePage() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b bg-white">
        <h1 className="text-xl font-bold text-slate-800">Annonces de disponibilité</h1>
        <p className="text-sm text-slate-500">Trouvez un transporteur qui revient à vide, prêt à partir dans l'immédiat</p>
      </div>
      <RechercheAnnoncesClient />
    </div>
  )
}
