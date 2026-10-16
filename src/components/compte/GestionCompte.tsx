'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'

interface Props {
  alertesEmail: boolean
  peutRecevoirAlertes: boolean
  emailsActifs: boolean
  estAdmin: boolean
}

const champ = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const carte = 'bg-white border border-slate-200 rounded-xl p-5'

function premierMessage(data: { error?: string; details?: Record<string, string[]> }): string {
  const detail = data.details ? Object.values(data.details).flat()[0] : undefined
  return detail ?? data.error ?? 'Une erreur est survenue.'
}

export function GestionCompte({ alertesEmail, peutRecevoirAlertes, emailsActifs, estAdmin }: Props) {
  // ── Mot de passe ──
  const [mdp, setMdp] = useState({ ancien: '', nouveau: '' })
  const [mdpEtat, setMdpEtat] = useState<{ type: 'ok' | 'erreur'; texte: string } | null>(null)
  const [mdpLoading, setMdpLoading] = useState(false)

  async function changerMotDePasse(e: React.FormEvent) {
    e.preventDefault()
    setMdpLoading(true)
    setMdpEtat(null)
    const res = await fetch('/api/compte/mot-de-passe', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mdp),
    })
    setMdpLoading(false)
    if (res.ok) {
      setMdpEtat({ type: 'ok', texte: 'Mot de passe modifié. Reconnexion nécessaire…' })
      setTimeout(() => signOut({ callbackUrl: '/login' }), 1200)
    } else {
      setMdpEtat({ type: 'erreur', texte: premierMessage(await res.json().catch(() => ({}))) })
    }
  }

  // ── Alertes e-mail ──
  const [alertes, setAlertes] = useState(alertesEmail)
  async function basculerAlertes() {
    const valeur = !alertes
    setAlertes(valeur)
    const res = await fetch('/api/compte', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertesEmail: valeur }),
    })
    if (!res.ok) setAlertes(!valeur)
  }

  // ── Suppression ──
  const [suppression, setSuppression] = useState({ ouvert: false, password: '', confirmation: '' })
  const [suppressionErreur, setSuppressionErreur] = useState('')
  const [suppressionLoading, setSuppressionLoading] = useState(false)

  async function supprimerCompte(e: React.FormEvent) {
    e.preventDefault()
    setSuppressionLoading(true)
    setSuppressionErreur('')
    const res = await fetch('/api/compte', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: suppression.password, confirmation: suppression.confirmation }),
    })
    if (res.ok) {
      await signOut({ callbackUrl: '/' })
    } else {
      setSuppressionLoading(false)
      setSuppressionErreur(premierMessage(await res.json().catch(() => ({}))))
    }
  }

  return (
    <>
      <section className={carte}>
        <h2 className="font-semibold text-slate-800 mb-3">Mot de passe</h2>
        <form onSubmit={changerMotDePasse} className="space-y-3">
          <input type="password" required autoComplete="current-password" placeholder="Mot de passe actuel" className={champ}
            value={mdp.ancien} onChange={(e) => setMdp((p) => ({ ...p, ancien: e.target.value }))} />
          <input type="password" required autoComplete="new-password" placeholder="Nouveau mot de passe (8 car. min, majuscule, minuscule, chiffre)" className={champ}
            value={mdp.nouveau} onChange={(e) => setMdp((p) => ({ ...p, nouveau: e.target.value }))} />
          {mdpEtat && <p className={`text-sm ${mdpEtat.type === 'ok' ? 'text-green-600' : 'text-red-600'}`} role="alert">{mdpEtat.texte}</p>}
          <button disabled={mdpLoading} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {mdpLoading ? 'Enregistrement…' : 'Changer le mot de passe'}
          </button>
          <p className="text-xs text-slate-400">Pour votre sécurité, toutes les sessions ouvertes seront fermées.</p>
        </form>
      </section>

      {peutRecevoirAlertes && (
        <section className={carte}>
          <h2 className="font-semibold text-slate-800 mb-3">Notifications</h2>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={alertes} onChange={basculerAlertes} className="mt-0.5" />
            <span>
              Recevoir des e-mails d'alerte (nouvelles disponibilités correspondant à mes alertes, fret à proximité).
              {!emailsActifs && <span className="block text-xs text-slate-400 mt-1">L'envoi d'e-mails n'est pas encore activé sur ce site.</span>}
            </span>
          </label>
        </section>
      )}

      {!estAdmin && (
        <section className={carte}>
          <h2 className="font-semibold text-slate-800 mb-1">Mes données</h2>
          <p className="text-sm text-slate-500 mb-3">Téléchargez l'ensemble des données que nous détenons sur vous (profil, véhicules, annonces, avis, messages envoyés…).</p>
          <a href="/api/compte" className="inline-block border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
            ⬇️ Télécharger mes données (JSON)
          </a>
        </section>
      )}

      {!estAdmin && (
        <section className="bg-white border border-red-200 rounded-xl p-5">
          <h2 className="font-semibold text-red-700 mb-1">Supprimer mon compte</h2>
          <p className="text-sm text-slate-500 mb-3">
            Votre profil, vos véhicules, annonces et avis sont effacés définitivement. Vos messages restent visibles de vos interlocuteurs
            sous le nom « Compte supprimé ». Votre abonnement éventuel est résilié.
          </p>
          {!suppression.ouvert ? (
            <button onClick={() => setSuppression((s) => ({ ...s, ouvert: true }))} className="text-sm text-red-600 hover:underline">
              Je veux supprimer mon compte…
            </button>
          ) : (
            <form onSubmit={supprimerCompte} className="space-y-3">
              <input type="password" required autoComplete="current-password" placeholder="Votre mot de passe" className={champ}
                value={suppression.password} onChange={(e) => setSuppression((s) => ({ ...s, password: e.target.value }))} />
              <input type="text" required placeholder="Tapez SUPPRIMER pour confirmer" className={champ}
                value={suppression.confirmation} onChange={(e) => setSuppression((s) => ({ ...s, confirmation: e.target.value }))} />
              {suppressionErreur && <p className="text-sm text-red-600" role="alert">{suppressionErreur}</p>}
              <div className="flex gap-3">
                <button disabled={suppressionLoading || suppression.confirmation !== 'SUPPRIMER'} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {suppressionLoading ? 'Suppression…' : 'Supprimer définitivement'}
                </button>
                <button type="button" onClick={() => setSuppression({ ouvert: false, password: '', confirmation: '' })} className="text-sm text-slate-500 hover:underline">
                  Annuler
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </>
  )
}
