import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Entre Transporteurs — Bourse de fret',
    short_name: 'Entre Transporteurs',
    description: 'Les transporteurs signalent leurs disponibilités, les commissionnaires les trouvent en direct.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1e3a8a',
    lang: 'fr',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
