import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

// Rendu dynamique : la CSP à nonce (middleware) doit pouvoir équiper chaque page
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: { default: 'Entre Transporteurs — Bourse de fret', template: '%s' },
  description: 'Ne roulez plus jamais à vide : les transporteurs signalent leurs disponibilités gratuitement, les commissionnaires les trouvent en direct.',
  openGraph: {
    title: 'Entre Transporteurs — Bourse de fret',
    description: 'Trouvez un transporteur disponible en quelques secondes, ou publiez votre trajet retour gratuitement.',
    type: 'website',
    locale: 'fr_FR',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
