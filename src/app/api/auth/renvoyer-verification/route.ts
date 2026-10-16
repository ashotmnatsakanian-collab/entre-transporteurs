import { db } from '@/lib/db'
import { creerToken } from '@/lib/tokens'
import { emailVerification, envoyerEmail, urlApplication } from '@/lib/email'
import { exigerUtilisateur, gerer, json, limiter } from '@/lib/api'

// POST /api/auth/renvoyer-verification — renvoyer l'e-mail de confirmation
export const POST = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR', 'COMMISSIONNAIRE')
  limiter(req, 'verif-renvoi', 3, 60 * 60_000, u.id)

  if (!u.emailVerifie) {
    const user = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { nom: true, email: true } })
    const token = await creerToken(u.id, 'VERIFICATION_EMAIL', 24 * 60 * 60_000)
    await envoyerEmail({ ...emailVerification(user.nom, urlApplication(`/verifier-email?token=${token}`)), to: user.email })
  }
  return json({ success: true })
})
