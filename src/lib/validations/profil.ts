import { z } from 'zod'
import { siretValide } from '../siret'

const texteCourt = (min: number, max: number) => z.string().trim().min(min).max(max)

export const siretSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/\s/g, ''))
  .refine((s) => /^\d{14}$/.test(s), 'Le SIRET doit comporter 14 chiffres')
  .refine((s) => !/^\d{14}$/.test(s) || siretValide(s), "Ce SIRET n'est pas valide (clé de contrôle incorrecte)")

export const profilTransporteurSchema = z.object({
  siret: siretSchema,
  raisonSociale: texteCourt(2, 100),
  description: z.string().trim().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  zonesCirculation: z.array(z.string().max(4)).max(20).default([]),
})

export const profilCommissionnaireSchema = z.object({
  siret: siretSchema,
  raisonSociale: texteCourt(2, 100),
})

// bcrypt ne lit que les 72 premiers octets : au-delà, deux mots de passe différents
// seraient équivalents — on borne donc la longueur.
export const motDePasseSchema = z
  .string()
  .min(8, 'Minimum 8 caractères')
  .max(72, 'Maximum 72 caractères')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[0-9]/, 'Au moins un chiffre')

export const emailSchema = z.string().trim().toLowerCase().email('Email invalide').max(254)

export const inscriptionSchema = z.object({
  email: emailSchema,
  password: motDePasseSchema,
  nom: texteCourt(2, 80),
  telephone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+().\s-]{6,20}$/, 'Numéro de téléphone invalide')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  role: z.enum(['TRANSPORTEUR', 'COMMISSIONNAIRE']),
  cgu: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les conditions d'utilisation" }) }),
})

export type InscriptionInput = z.infer<typeof inscriptionSchema>
export type ProfilTransporteurInput = z.infer<typeof profilTransporteurSchema>
