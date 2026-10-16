import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const estProduction = process.env.NODE_ENV === 'production'

// Chemins qui exigent une session (défense en profondeur : chaque route re-vérifie de son côté)
const PAGES_PROTEGEES = ['/carte', '/transporteur', '/commissionnaire', '/profils', '/messages', '/compte', '/admin', '/abonnement/succes', '/abonnement/reactivation']
const API_PROTEGEES = [
  '/api/transporteurs', '/api/commissionnaires', '/api/vehicules', '/api/recherche', '/api/messages',
  '/api/annonces', '/api/avis', '/api/besoins', '/api/alertes', '/api/compte', '/api/signalements',
  '/api/admin', '/api/stripe/checkout', '/api/stripe/portal', '/api/auth/renvoyer-verification',
]

const commencePar = (chemin: string, prefixes: string[]) => prefixes.some((p) => chemin === p || chemin.startsWith(`${p}/`))

function politiqueCsp(nonce: string, hote: string): string {
  const directives = [
    "default-src 'self'",
    // 'strict-dynamic' : seuls les scripts portant le nonce (ceux de Next) s'exécutent — une balise
    // <script> injectée par un attaquant est refusée.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${estProduction ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
    "font-src 'self' data:",
    // API des communes (autocomplétion) + Socket.io (WebSocket sur le même hôte)
    `connect-src 'self' https://api-adresse.data.gouv.fr wss://${hote} ws://${hote}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ]
  if (estProduction) directives.push('upgrade-insecure-requests')
  return directives.join('; ')
}

function ajouterEntetesSecurite(res: NextResponse, csp: string) {
  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  if (estProduction) res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
}

export async function middleware(req: NextRequest) {
  const chemin = req.nextUrl.pathname
  const estApi = chemin.startsWith('/api/')
  const nonce = btoa(crypto.randomUUID())
  const csp = politiqueCsp(nonce, req.headers.get('x-forwarded-host')?.split(',')[0].trim() || req.headers.get('host') || 'localhost')

  if (commencePar(chemin, estApi ? API_PROTEGEES : PAGES_PROTEGEES)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      if (estApi) {
        const res = NextResponse.json({ error: 'Non authentifié' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
        ajouterEntetesSecurite(res, csp)
        return res
      }
      const url = new URL('/login', req.url)
      url.searchParams.set('redirection', chemin)
      const res = NextResponse.redirect(url)
      ajouterEntetesSecurite(res, csp)
      return res
    }
  }

  // Le nonce et la CSP sont transmis à Next (qui équipe ses propres scripts du nonce)
  const entetesRequete = new Headers(req.headers)
  entetesRequete.set('x-nonce', nonce)
  entetesRequete.set('Content-Security-Policy', csp)
  const res = NextResponse.next({ request: { headers: entetesRequete } })
  ajouterEntetesSecurite(res, csp)
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|robots.txt|sitemap.xml).*)',
  ],
}
