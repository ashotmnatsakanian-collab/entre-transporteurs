import { z } from 'zod'

export const avisSchema = z.object({
  transporteurId: z.string().min(1),
  note: z.number().int().min(1).max(5),
  commentaire: z.string().max(500).optional().nullable(),
})

export type AvisInput = z.infer<typeof avisSchema>
