import { z } from 'zod'
import { TypeVehicule, Specificite } from '@prisma/client'
import { aUneZone, zoneRechercheSchema } from './position'

// Recherche des transporteurs disponibles MAINTENANT : par rayon autour d'une ville, par départements ou par région.
export const rechercheSchema = zoneRechercheSchema
  .extend({
    typeVehicule: z.nativeEnum(TypeVehicule).optional(),
    chargeUtileMin: z.number().positive().optional(),
    longueurMin: z.number().positive().optional(),
    largeurMin: z.number().positive().optional(),
    specificites: z.array(z.nativeEnum(Specificite)).default([]),
  })
  .refine(aUneZone, { message: 'Indiquez une ville, des départements ou une région.', path: ['departements'] })

export type RechercheInput = z.infer<typeof rechercheSchema>
