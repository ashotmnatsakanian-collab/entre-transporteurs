import { z } from 'zod'

export const annonceSchema = z
  .object({
    vehiculeId: z.string().optional().nullable(),
    villeDepart: z.string().min(2, 'Ville de départ requise').max(100),
    latDepart: z.number().min(-90).max(90),
    lngDepart: z.number().min(-180).max(180),
    villeArrivee: z.string().max(100).optional().nullable(),
    dateDisponibilite: z.coerce.date(),
    dateDisponibiliteFin: z.coerce.date().optional().nullable(),
    commentaire: z.string().max(500).optional().nullable(),
  })
  .refine(
    (d) => !d.dateDisponibiliteFin || d.dateDisponibiliteFin >= d.dateDisponibilite,
    { message: 'La date de fin doit être après la date de début', path: ['dateDisponibiliteFin'] }
  )

export type AnnonceInput = z.infer<typeof annonceSchema>

export const rechercheAnnonceSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  rayonKm: z.number().min(1).max(1000).default(150),
  date: z.coerce.date().optional(),
  villeArrivee: z.string().max(100).optional(),
})

export type RechercheAnnonceInput = z.infer<typeof rechercheAnnonceSchema>
