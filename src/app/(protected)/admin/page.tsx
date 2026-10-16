import Link from 'next/link'
import { db } from '@/lib/db'

export const metadata = { title: 'Administration — Entre Transporteurs' }

function Carte({ label, valeur, href, alerte }: { label: string; valeur: number; href?: string; alerte?: boolean }) {
  const contenu = (
    <div className={`bg-white border rounded-xl p-4 ${alerte && valeur > 0 ? 'border-red-300' : 'border-slate-200'}`}>
      <div className={`text-2xl font-bold ${alerte && valeur > 0 ? 'text-red-600' : ''}`}>{valeur}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
  return href ? <Link href={href} className="block hover:opacity-90">{contenu}</Link> : contenu
}

export default async function AdminPage() {
  const il7j = new Date(Date.now() - 7 * 86_400_000)
  const il24h = new Date(Date.now() - 86_400_000)
  const actif = { supprimeLe: null }

  const [transporteurs, commissionnaires, nouveaux, verifies, suspendus, annonces, besoins, signalements, echecs] = await Promise.all([
    db.user.count({ where: { role: 'TRANSPORTEUR', ...actif } }),
    db.user.count({ where: { role: 'COMMISSIONNAIRE', ...actif } }),
    db.user.count({ where: { createdAt: { gte: il7j }, role: { not: 'ADMIN' } } }),
    db.user.count({ where: { verifie: true, role: { not: 'ADMIN' }, ...actif } }),
    db.user.count({ where: { suspendu: true, ...actif } }),
    db.annonce.count({ where: { active: true, OR: [{ dateDisponibiliteFin: { gte: new Date() } }, { dateDisponibiliteFin: null, dateDisponibilite: { gte: new Date(Date.now() - 86_400_000) } }] } }),
    db.besoin.count({ where: { active: true, dateEnlevement: { gte: new Date(Date.now() - 86_400_000) } } }),
    db.signalement.count({ where: { statut: 'OUVERT' } }),
    db.journalSecurite.count({ where: { type: 'connexion_echec', createdAt: { gte: il24h } } }),
  ])

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Administration</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Carte label="Transporteurs" valeur={transporteurs} href="/admin/utilisateurs" />
        <Carte label="Commissionnaires" valeur={commissionnaires} href="/admin/utilisateurs" />
        <Carte label="Inscrits sur 7 jours" valeur={nouveaux} />
        <Carte label="SIRET vérifiés" valeur={verifies} />
        <Carte label="Annonces actives" valeur={annonces} />
        <Carte label="Besoins actifs" valeur={besoins} />
        <Carte label="Signalements ouverts" valeur={signalements} href="/admin/signalements" alerte />
        <Carte label="Échecs de connexion (24 h)" valeur={echecs} href="/admin/journal" alerte />
      </div>
      {suspendus > 0 && <p className="text-sm text-slate-500">{suspendus} compte(s) suspendu(s).</p>}
    </div>
  )
}
