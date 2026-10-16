import { z } from 'zod'

const ville = z.string().trim().min(2, 'Ville requise').max(100)

export const annonceSchema = z
  .object({
    vehiculeId: z.string().min(1).max(40).optional().nullable(),
    villeDepart: ville,
    latDepart: z.number().min(-90).max(90),
    lngDepart: z.number().min(-180).max(180),
    villeArrivee: z.string().trim().max(100).optional().nullable().transform((v) => v || null),
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

export const rechercheAnnonceSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  rayonKm: z.number().min(1).max(1000).default(150),
  date: z.coerce.date().optional(),
  villeArrivee: z.string().trim().max(100).optional(),
})

export type RechercheAnnonceInput = z.infer<typeof rechercheAnnonceSchema>
