/**
 * Crée (ou promeut) un compte administrateur — jamais via l'inscription publique.
 *
 *   npx tsx scripts/creer-admin.ts vous@exemple.fr            # mot de passe généré et affiché une fois
 *   ADMIN_PASSWORD='...' npx tsx scripts/creer-admin.ts vous@exemple.fr
 */
import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const db = new PrismaClient()

async function main() {
  const email = z.string().trim().toLowerCase().email().parse(process.argv[2])
  const fourni = process.env.ADMIN_PASSWORD
  const motDePasse = fourni ?? `${randomBytes(12).toString('base64url')}Aa1`
  if (motDePasse.length < 12) throw new Error('Le mot de passe administrateur doit faire au moins 12 caractères')

  const maintenant = new Date()
  const user = await db.user.upsert({
    where: { email },
    update: { role: 'ADMIN', password: await hash(motDePasse, 12), suspendu: false, supprimeLe: null, motDePasseChangeLe: maintenant },
    create: {
      email, nom: 'Administrateur', role: 'ADMIN', password: await hash(motDePasse, 12),
      emailVerifieLe: maintenant, cguAccepteesLe: maintenant, verifie: true,
    },
    select: { id: true },
  })

  console.log(`✅ Administrateur prêt : ${email} (${user.id})`)
  if (!fourni) console.log(`   Mot de passe (affiché une seule fois, changez-le depuis « Mon compte ») : ${motDePasse}`)
}

main().catch((e) => { console.error('❌', e.message); process.exit(1) }).finally(() => db.$disconnect())
