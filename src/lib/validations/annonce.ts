import { z } from 'zod'

import { inseeSchema } from './position'

// Les communes sont désignées par leur code INSEE : le serveur retrouve lui-même le nom, le centre, le département et la région.
export const annonceSchema = z
  .object({
    vehiculeId: z.string().min(1).max(40).optional().nullable(),
    inseeDepart: inseeSchema,
    inseeArrivee: z.preprocess((v) => (v === '' ? null : v), inseeSchema.nullable().optional()).transform((v) => v ?? null),
    dateDisponibilite: z.coerce.date(),
    dateDisponibiliteFin: z.coerce.date().optional().nullable(),
    commentaire: z.string().trim().max(500).optional().nullable().transform((v) => v || null),
  })
  .refine((d) => !d.dateDisponibiliteFin || d.dateDisponibiliteFin >= d.dateDisponibilite, {
    message: 'La date de fin doit être après la date de début',
    path: ['dateDisponibiliteFin'],
  })
  .refine((d) => d.dateDisponibilite.getTime() > Date.now() - 36 * 3600 * 1000, {
    message: 'La date de disponibilité est déjà passée',
    path: ['dateDisponibilite'],
  })
  .refine(
    (d) => (d.dateDisponibiliteFin ?? d.dateDisponibilite).getTime() < Date.now() + 366 * 24 * 3600 * 1000,
    { message: 'Publiez une disponibilité dans les 12 prochains mois', path: ['dateDisponibilite'] }
  )

export type AnnonceInput = z.infer<typeof annonceSchema>

export const annoncePatchSchema = z.object({ active: z.boolean() })
