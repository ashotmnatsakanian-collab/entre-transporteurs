'use client'

import Link from 'next/link'

// Ne jamais afficher le détail de l'erreur à l'utilisateur (fuite d'information) : seulement un identifiant
export default function ErreurPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold text-slate-800">Une erreur est survenue</h1>
      <p className="text-slate-500 mt-2 mb-6">Nous avons été prévenus. Vous pouvez réessayer.</p>
      <div className="flex gap-3">
        <button onClick={reset} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700">Réessayer</button>
        <Link href="/" className="border border-slate-300 text-slate-700 px-5 py-2.5 rounded-lg font-medium hover:bg-white">Accueil</Link>
      </div>
      {error.digest && <p className="text-xs text-slate-400 mt-6">Référence : {error.digest}</p>}
    </div>
  )
}
