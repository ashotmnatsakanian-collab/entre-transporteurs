import { z } from 'zod'
import { TypeVehicule, Specificite } from '@prisma/client'

export const vehiculeSchema = z.object({
  type: z.nativeEnum(TypeVehicule),
  specificites: z.array(z.nativeEnum(Specificite)).default([]),
  longueur: z.number().positive().optional().nullable(),
  largeur: z.number().positive().optional().nullable(),
  hauteur: z.number().positive().optional().nullable(),
  chargeUtile: z.number().positive({ message: 'La charge utile doit être positive' }),
  immatriculation: z.string().max(20).optional().nullable(),
  actif: z.boolean().default(true),
})

export type VehiculeInput = z.infer<typeof vehiculeSchema>
