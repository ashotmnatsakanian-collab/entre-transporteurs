import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

// Toutes ces routes nécessitent une session valide
export const config = {
  matcher: [
    '/carte/:path*',
    '/transporteur/:path*',
    '/commissionnaire/:path*',
    '/profils/:path*',
    '/messages/:path*',
    '/abonnement/succes',
    '/abonnement/reactivation',
    '/api/transporteurs/:path*',
    '/api/vehicules/:path*',
    '/api/recherche/:path*',
    '/api/messages/:path*',
    '/api/annonces/:path*',
    '/api/avis/:path*',
    '/api/stripe/checkout',
    '/api/stripe/portal',
  ],
}
