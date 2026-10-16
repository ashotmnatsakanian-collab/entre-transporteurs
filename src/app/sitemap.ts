import type { MetadataRoute } from 'next'
import { urlApplication } from '@/lib/email'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['/', '/abonnement/tarification', '/register', '/login', '/cgu', '/confidentialite', '/mentions-legales']
  return pages.map((p) => ({ url: urlApplication(p), changeFrequency: p === '/' ? 'daily' : 'monthly', priority: p === '/' ? 1 : 0.5 }))
}
