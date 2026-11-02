import { exigerRoleOuRediriger } from '@/lib/garde'
import { CarteZonesClient } from '@/components/carte/CarteZonesClient'

export const metadata = { title: 'La carte — Entre Transporteurs' }

export default async function CartePage() {
  // Réservée aux commissionnaires avec accès (contrôlé aussi par l'API) : jamais de position individuelle, seulement des compteurs par département
  await exigerRoleOuRediriger('COMMISSIONNAIRE')

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-4 border-b bg-white shrink-0">
        <h1 className="text-xl font-bold text-slate-900">Carte des transporteurs disponibles</h1>
        <p className="text-sm text-slate-700">Regroupés par département et mis à jour en direct. Choisissez une zone pour voir qui est disponible.</p>
      </div>
      <div className="flex-1 min-h-0">
        <CarteZonesClient />
      </div>
    </div>
  )
}
