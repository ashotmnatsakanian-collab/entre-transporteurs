import { db } from './db'
import { log, messageErreur } from './logger'

export type TypeEvenement =
  | 'connexion_ok'
  | 'connexion_echec'
  | 'connexion_verrouillee'
  | 'inscription'
  | 'mdp_reinit_demande'
  | 'mdp_reinit_ok'
  | 'mdp_change'
  | 'email_verifie'
  | 'compte_supprime'
  | 'export_donnees'
  | 'cgu_acceptees'
  | 'signalement'
  | 'admin_action'
  | 'acces_refuse'

/** Piste d'audit en base. Ne doit jamais faire échouer la requête appelante. */
export async function journaliser(
  type: TypeEvenement,
  infos: { userId?: string | null; ip?: string; details?: string } = {}
): Promise<void> {
  try {
    await db.journalSecurite.create({
      data: { type, userId: infos.userId ?? null, ip: infos.ip ?? null, details: infos.details?.slice(0, 500) ?? null },
    })
  } catch (err) {
    log.error('journalisation impossible', { type, erreur: messageErreur(err) })
  }
}
