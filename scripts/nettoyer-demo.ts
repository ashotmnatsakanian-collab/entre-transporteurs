/**
 * Supprime TOUS les comptes et données de démonstration créés par `npm run db:seed`
 * (les faux transporteurs/commissionnaires et ce qui leur est lié). À lancer avant l'ouverture au public.
 *
 *   npx tsx scripts/nettoyer-demo.ts --oui
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const EMAILS_DEMO = [
  'jean.dupont@dupont-transport.fr', 'marie@brossard-logistique.fr', 'pierre@transport-med.fr', 'sophie@gironde-express.fr',
  'paul@occitane-fret.fr', 'anne@loire-transport.fr', 'marc@nord-fret.fr', 'helene@rhin-transport.fr',
  'thierry@bretagne-cargo.fr', 'celine@herault-express.fr',
  'francois@tlf-paris.fr', 'isabelle@groupe-fret.fr', 'robert@trans-euro.fr', 'nathalie@logipro.fr', 'laurent@nexlog.fr',
]

async function main() {
  if (!process.argv.includes('--oui')) {
    console.log(`Ceci supprime définitivement ${EMAILS_DEMO.length} comptes de démonstration et leurs données.\nRelancez avec --oui pour confirmer.`)
    return
  }
  const users = await db.user.findMany({ where: { email: { in: EMAILS_DEMO } }, select: { id: true } })
  const ids = users.map((u) => u.id)

  // Les messages n'ont pas de cascade : on supprime d'abord les conversations des comptes de démo
  const convs = await db.conversationParticipant.findMany({ where: { userId: { in: ids } }, select: { conversationId: true } })
  await db.conversation.deleteMany({ where: { id: { in: convs.map((c) => c.conversationId) } } })
  const { count } = await db.user.deleteMany({ where: { id: { in: ids } } })

  console.log(`✅ ${count} compte(s) de démonstration supprimé(s), ainsi que leurs véhicules, annonces, besoins, avis et conversations.`)
}

main().finally(() => db.$disconnect())
