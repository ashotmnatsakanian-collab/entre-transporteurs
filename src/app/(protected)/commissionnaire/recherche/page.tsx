import { RechercheTabs } from '@/components/recherche/RechercheTabs'

export const metadata = { title: 'Trouver un transporteur — Entre Transporteurs' }

export default async function RecherchePage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 border-b bg-white">
        <h1 className="text-xl font-bold text-slate-800">Trouver un transporteur</h1>
        <p className="text-sm text-slate-500">Disponibilités publiées en direct, ou recherche détaillée par véhicule</p>
      </div>
      <RechercheTabs ongletInitial={vue === 'profils' ? 'profils' : 'annonces'} />
    </div>
  )
}
