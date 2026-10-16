import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <div className="text-6xl mb-4">🚧</div>
      <h1 className="text-2xl font-bold text-slate-800">Page introuvable</h1>
      <p className="text-slate-500 mt-2 mb-6">Cette page n'existe pas ou n'est plus accessible.</p>
      <Link href="/" className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700">Retour à l'accueil</Link>
    </div>
  )
}
