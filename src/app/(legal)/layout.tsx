import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-slate-800">🚛 Entre Transporteurs</Link>
          <nav className="flex gap-4 text-sm text-slate-500">
            <Link href="/cgu" className="hover:text-slate-800">CGU</Link>
            <Link href="/confidentialite" className="hover:text-slate-800">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-slate-800">Mentions légales</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10 text-slate-700 text-sm leading-relaxed">{children}</main>
    </div>
  )
}
