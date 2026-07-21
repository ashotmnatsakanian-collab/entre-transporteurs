import dynamic from 'next/dynamic'

const RechercheClient = dynamic(() => import('@/components/recherche/RechercheClient'), { ssr: false })

export default function RecherchePage() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b bg-white">
        <h1 className="text-xl font-bold text-slate-800">Rechercher un transporteur</h1>
        <p className="text-sm text-slate-500">Filtrez par zone, type de véhicule et spécificités</p>
      </div>
      <RechercheClient />
    </div>
  )
}
