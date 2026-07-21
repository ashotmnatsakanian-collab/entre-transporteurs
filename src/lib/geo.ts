import { Prisma } from '@prisma/client'
import { db } from './db'

export interface RowTransporteurGeo {
  id: string
  userId: string
  siret: string
  raisonSociale: string
  description: string | null
  latitude: number
  longitude: number
  zonesCirculation: string[]
  disponible: boolean
  derniereMAJ: Date
  distance_km: number
  nom: string
  telephone: string | null
  email: string
}

export async function rechercherParRayon(
  lat: number,
  lng: number,
  rayonKm: number,
  disponibleSeulement = false
): Promise<RowTransporteurGeo[]> {
  const clauseDisponible = disponibleSeulement
    ? Prisma.sql`AND tp.disponible = true`
    : Prisma.sql``

  return db.$queryRaw<RowTransporteurGeo[]>(Prisma.sql`
    SELECT
      tp.id,
      tp."userId",
      tp.siret,
      tp."raisonSociale",
      tp.description,
      tp.latitude,
      tp.longitude,
      tp."zonesCirculation",
      tp.disponible,
      tp."derniereMAJ",
      u.nom,
      u.telephone,
      u.email,
      ROUND(
        CAST(
          6371 * acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(tp.latitude))
              * cos(radians(tp.longitude) - radians(${lng}))
              + sin(radians(${lat})) * sin(radians(tp.latitude))
            )
          )
        AS NUMERIC), 1
      ) AS distance_km
    FROM "TransporteurProfil" tp
    JOIN "User" u ON u.id = tp."userId"
    JOIN "Abonnement" a ON a."userId" = tp."userId"
    WHERE
      a.statut IN ('TRIALING', 'ACTIVE')
      AND (
        a.statut = 'ACTIVE'
        OR (a.statut = 'TRIALING' AND a."dateFinEssai" > NOW())
      )
      AND 6371 * acos(
        LEAST(1.0,
          cos(radians(${lat})) * cos(radians(tp.latitude))
          * cos(radians(tp.longitude) - radians(${lng}))
          + sin(radians(${lat})) * sin(radians(tp.latitude))
        )
      ) <= ${rayonKm}
      ${clauseDisponible}
    ORDER BY distance_km ASC
    LIMIT 200
  `)
}
