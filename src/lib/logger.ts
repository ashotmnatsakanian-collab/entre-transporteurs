// Journalisation JSON, une ligne par événement — exploitable par les logs Render/Datadog.
// Ne jamais y mettre de mot de passe, jeton, ni contenu de message.
type Niveau = 'info' | 'warn' | 'error'

function ecrire(niveau: Niveau, message: string, meta?: Record<string, unknown>) {
  const ligne = JSON.stringify({ t: new Date().toISOString(), niveau, message, ...meta })
  if (niveau === 'error') console.error(ligne)
  else if (niveau === 'warn') console.warn(ligne)
  else console.log(ligne)
}

export const log = {
  info: (message: string, meta?: Record<string, unknown>) => ecrire('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => ecrire('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => ecrire('error', message, meta),
}

export function messageErreur(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
