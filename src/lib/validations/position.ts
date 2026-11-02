import { z } from 'zod'
import { DUREES_DISPONIBILITE_H } from '../disponibilite'
import { departementExiste, regionExiste } from '../referentiel-geo'

export const inseeSchema = z.string().trim().regex(/^(\d{5}|2[AB]\d{3})$/, 'Code commune invalide')
export const codeDepartementSchema = z.string().trim().refine(departementExiste, 'Département inconnu')
export const codeRegionSchema = z.string().trim().refine(regionExiste, 'Région inconnue')

const dureeSchema = z
  .number()
  .refine((n): n is (typeof DUREES_DISPONIBILITE_H)[number] => (DUREES_DISPONIBILITE_H as readonly number[]).includes(n), 'Durée non autorisée (4, 12, 24 ou 48 heures)')

/** Mise à jour de la position (commune) et, par défaut, déclaration de disponibilité. */
export const positionSchema = z.object({
  insee: inseeSchema,
  disponible: z.boolean().default(true),
  dureeHeures: dureeSchema.optional(),
})

/** Bascule « disponible maintenant ». */
export const disponibiliteSchema = z.object({
  disponible: z.boolean(),
  dureeHeures: dureeSchema.optional(),
})

/** Zone d'intervention : rayon autour de la position et/ou départements acceptés, destination souhaitée facultative. */
export const zoneSchema = z.object({
  rayonInterventionKm: z.number().int().min(10).max(1500).nullable().default(null),
  departements: z.array(codeDepartementSchema).max(30).default([]),
  destinationInsee: inseeSchema.nullable().default(null),
})

/** Critères géographiques d'une recherche : un rayon autour d'un point, OU des départements, OU une région. */
export const zoneRechercheSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  rayonKm: z.number().min(1).max(1000).default(150),
  departements: z.array(codeDepartementSchema).min(1).max(12).optional(),
  region: codeRegionSchema.optional(),
})

export function aUneZone(z: { lat?: number; lng?: number; departements?: string[]; region?: string }): boolean {
  return (z.lat !== undefined && z.lng !== undefined) || !!z.departements?.length || !!z.region
}
