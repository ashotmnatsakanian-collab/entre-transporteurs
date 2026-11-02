// « Mis à jour il y a X min » — utilisable côté navigateur comme côté serveur.

export function ilYA(date: Date | string, maintenant: Date = new Date()): string {
  const ecart = Math.max(0, maintenant.getTime() - new Date(date).getTime())
  const minutes = Math.floor(ecart / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.floor(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  const jours = Math.floor(heures / 24)
  return `il y a ${jours} j`
}

/** « jusqu'à 18:30 » (aujourd'hui) ou « jusqu'au 05/11 à 06:00 ». */
export function jusquA(date: Date | string, maintenant: Date = new Date()): string {
  const d = new Date(date)
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const memeJour = d.toDateString() === maintenant.toDateString()
  return memeJour ? `jusqu'à ${heure}` : `jusqu'au ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${heure}`
}
