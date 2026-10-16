import Link from 'next/link'

// Annonce l'entrée en vigueur du paiement (engagement des CGU : prévenir au moins 30 jours avant)
export function BanniereFacturation({ date }: { date: Date }) {
  return (
    <div className="bg-slate-800 text-white text-sm px-4 py-2 text-center">
      ℹ️ L'accès commissionnaire deviendra payant le <strong>{date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>{' '}
      (69 € TTC/mois, avec 30 jours d'essai gratuit sans carte).{' '}
      <Link href="/abonnement/tarification" className="underline">Voir les conditions</Link>
    </div>
  )
}
