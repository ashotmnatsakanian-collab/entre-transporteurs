'use client'

import dynamic from 'next/dynamic'

// Leaflet utilise des API navigateur : pas de rendu serveur
export const CarteZonesClient = dynamic(() => import('./CarteZones'), { ssr: false })
