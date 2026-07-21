import { FormulaireVehicule } from '@/components/flotte/FormulaireVehicule'

export default function NouveauVehiculePage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ajouter un véhicule</h1>
      <FormulaireVehicule />
    </div>
  )
}
