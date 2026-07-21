import { z } from 'zod'

export const profilTransporteurSchema = z.object({
  siret: z.string().length(14, 'Le SIRET doit comporter 14 chiffres').regex(/^\d+$/, 'Chiffres uniquement'),
  raisonSociale: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  zonesCirculation: z.array(z.string()).max(20).default([]),
})

export const profilCommissionnaireSchema = z.object({
  siret: z.string().length(14, 'Le SIRET doit comporter 14 chiffres').regex(/^\d+$/, 'Chiffres uniquement'),
  raisonSociale: z.string().min(2).max(100),
})

export const inscriptionSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  nom: z.string().min(2).max(80),
  telephone: z.string().max(20).optional(),
  role: z.enum(['TRANSPORTEUR', 'COMMISSIONNAIRE']),
})

export type InscriptionInput = z.infer<typeof inscriptionSchema>
export type ProfilTransporteurInput = z.infer<typeof profilTransporteurSchema>
