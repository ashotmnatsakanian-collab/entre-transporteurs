'use client'

import dynamic from 'next/dynamic'

export const RechercheChargeur = dynamic(() => import('./RechercheClient'), { ssr: false })
