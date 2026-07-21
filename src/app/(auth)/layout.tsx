import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600 p-4">
      <div className="mb-8 text-center">
        <Link href="/" className="text-white text-3xl font-bold tracking-tight">
          🚛 Entre Transporteurs
        </Link>
        <p className="text-brand-100 mt-1 text-sm">Bourse de fret géolocalisée</p>
      </div>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        {children}
      </div>
    </div>
  )
}
