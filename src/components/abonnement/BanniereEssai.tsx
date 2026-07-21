import Link from 'next/link'

export function BanniereEssai({ joursRestants }: { joursRestants: number }) {
  const couleur = joursRestants <= 3 ? 'bg-red-500' : joursRestants <= 7 ? 'bg-amber-500' : 'bg-brand-600'

  return (
    <div className={`${couleur} text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-4`}>
      <span>
        ⏳ Il vous reste <strong>{joursRestants} jour{joursRestants > 1 ? 's' : ''}</strong> d'essai gratuit.
      </span>
      <Link href="/abonnement/tarification" className="underline font-medium hover:opacity-90">
        S'abonner maintenant →
      </Link>
    </div>
  )
}
