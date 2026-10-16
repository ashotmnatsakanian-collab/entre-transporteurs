import { z } from 'zod'
import { emailSchema, motDePasseSchema } from './profil'

export const messageCreationSchema = z.object({
  destinataireId: z.string().min(1).max(40),
  premierMessage: z.string().trim().max(2000).optional(),
})

export const contenuMessageSchema = z.string().trim().min(1).max(2000)

export const disponibiliteSchema = z.object({ disponible: z.boolean() })

export const signalementSchema = z.object({
  cibleId: z.string().min(1).max(40),
  motif: z.enum(['SPAM', 'FAUSSE_IDENTITE', 'COMPORTEMENT_ABUSIF', 'ARNAQUE', 'AUTRE']),
  details: z.string().trim().max(1000).optional(),
})

export const demandeReinitSchema = z.object({ email: emailSchema })

export const reinitSchema = z.object({
  token: z.string().min(20).max(200),
  password: motDePasseSchema,
})

export const verificationSchema = z.object({ token: z.string().min(20).max(200) })

export const changementMotDePasseSchema = z.object({
  ancien: z.string().min(1).max(200),
  nouveau: motDePasseSchema,
})

export const suppressionCompteSchema = z.object({
  password: z.string().min(1).max(200),
  confirmation: z.literal('SUPPRIMER'),
})

export const alerteSchema = z.object({
  villeDepart: z.string().trim().min(2).max(100),
  latDepart: z.number().min(-90).max(90),
  lngDepart: z.number().min(-180).max(180),
  rayonKm: z.number().int().min(10).max(500).default(100),
  villeArrivee: z.string().trim().max(100).optional().nullable().transform((v) => v || null),
})

export const besoinSchema = z.object({
  villeDepart: z.string().trim().min(2).max(100),
  latDepart: z.number().min(-90).max(90),
  lngDepart: z.number().min(-180).max(180),
  villeArrivee: z.string().trim().min(2).max(100),
  dateEnlevement: z.coerce.date().refine((d) => d.getTime() > Date.now() - 36 * 3600 * 1000, 'Date déjà passée'),
  typeVehicule: z.enum(['PORTEUR', 'SEMI', 'VL', 'UTILITAIRE', 'PLATEAU', 'BENNE', 'CITERNE', 'FOURGON']).optional().nullable(),
  poidsKg: z.number().positive().max(60000).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable().transform((v) => v || null),
})

export const rechercheBesoinSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  rayonKm: z.number().min(1).max(1000).default(150),
})

export const adminUtilisateurSchema = z.object({
  verifie: z.boolean().optional(),
  suspendu: z.boolean().optional(),
})

export const adminSignalementSchema = z.object({ statut: z.enum(['TRAITE', 'REJETE']) })
