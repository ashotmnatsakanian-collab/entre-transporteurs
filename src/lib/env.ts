import { z } from 'zod'

const SECRETS_FAIBLES = ['changez-moi-en-production', 'secret', 'password', 'changeme']

export const estProduction = process.env.NODE_ENV === 'production'

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL manquant'),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET doit faire au moins 32 caractères (openssl rand -base64 32)')
    .refine((s) => !SECRETS_FAIBLES.some((f) => s.toLowerCase().includes(f)), 'NEXTAUTH_SECRET est une valeur par défaut'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL doit être une URL complète'),
})

/**
 * Vérifie la configuration au démarrage. En production, une configuration
 * dangereuse (secret faible, URL non HTTPS) interrompt le démarrage plutôt que
 * de tourner de façon vulnérable.
 */
export function verifierEnvironnement(): void {
  const resultat = schema.safeParse(process.env)
  const problemes: string[] = resultat.success ? [] : resultat.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)

  const url = process.env.NEXTAUTH_URL ?? ''
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url)
  if (estProduction && !url.startsWith('https://') && !local) {
    problemes.push('NEXTAUTH_URL doit utiliser https:// en production')
  }
  if (estProduction && process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && !process.env.AUTORISER_MODE_DEMO) {
    console.warn('⚠️  Mode démonstration actif : connexion en un clic avec des comptes publics. Ne pas utiliser sur un site réel.')
  }

  if (problemes.length === 0) return
  const message = `Configuration invalide :\n - ${problemes.join('\n - ')}`
  if (estProduction) {
    console.error(message)
    process.exit(1)
  }
  console.warn(`⚠️  ${message}`)
}
