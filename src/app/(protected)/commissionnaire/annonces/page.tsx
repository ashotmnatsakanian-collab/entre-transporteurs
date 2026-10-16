import { redirect } from 'next/navigation'

// Ancienne adresse : les annonces sont désormais l'onglet principal de la recherche
export default function AnnoncesRedirection() {
  redirect('/commissionnaire/recherche')
}
