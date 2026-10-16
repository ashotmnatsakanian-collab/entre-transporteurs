import type { MetadataRoute } from 'next'
import { urlApplication } from '@/lib/email'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/compte', '/messages', '/transporteur', '/commissionnaire', '/carte', '/profils', '/deconnexion', '/reinitialiser', '/verifier-email'] }],
    sitemap: urlApplication('/sitemap.xml'),
  }
}
