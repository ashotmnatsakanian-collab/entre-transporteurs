import { z } from 'zod'
import { TypeVehicule, Specificite } from '@prisma/client'

export const rechercheSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  rayonKm: z.number().min(1).max(1000).default(100),
  typeVehicule: z.nativeEnum(TypeVehicule).optional(),
  chargeUtileMin: z.number().positive().optional(),
  longueurMin: z.number().positive().optional(),
  largeurMin: z.number().positive().optional(),
  specificites: z.array(z.nativeEnum(Specificite)).default([]),
  disponibleSeulement: z.boolean().default(false),
})

export type RechercheInput = z.infer<typeof rechercheSchema>
