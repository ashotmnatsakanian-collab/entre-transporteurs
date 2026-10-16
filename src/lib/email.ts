import { log, messageErreur } from './logger'
import { estProduction } from './env'

// Fournisseur : Resend (https://resend.com, 3000 e-mails/mois gratuits) via son API HTTP.
// Sans RESEND_API_KEY : les e-mails sont simulés (affichés dans la console) en dehors
// de la production, et la vérification d'adresse n'est pas exigée.
export const emailActif = !!process.env.RESEND_API_KEY

const EXPEDITEUR = process.env.EMAIL_FROM ?? 'Entre Transporteurs <onboarding@resend.dev>'

export function echapperHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export function urlApplication(chemin: string): string {
  const base = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  return `${base}${chemin}`
}

interface Email {
  to: string
  sujet: string
  html: string
  texte: string
}

export async function envoyerEmail(email: Email): Promise<boolean> {
  if (!emailActif) {
    if (!estProduction) {
      console.log(`\n📧 [e-mail simulé] À: ${email.to}\n   Sujet: ${email.sujet}\n   ${email.texte.replace(/\n/g, '\n   ')}\n`)
      return true
    }
    log.error('e-mail non envoyé : RESEND_API_KEY absent en production', { sujet: email.sujet })
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EXPEDITEUR, to: [email.to], subject: email.sujet, html: email.html, text: email.texte }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      log.error('échec envoi e-mail', { statut: res.status, sujet: email.sujet })
      return false
    }
    return true
  } catch (err) {
    log.error('échec envoi e-mail', { erreur: messageErreur(err), sujet: email.sujet })
    return false
  }
}

function gabarit(titre: string, corpsHtml: string, boutonLabel?: string, boutonUrl?: string): string {
  const bouton = boutonUrl
    ? `<p style="margin:24px 0"><a href="${echapperHtml(boutonUrl)}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${echapperHtml(boutonLabel ?? 'Ouvrir')}</a></p>`
    : ''
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;color:#1e293b">
<h2 style="color:#1e3a8a">🚛 Entre Transporteurs</h2><h3>${echapperHtml(titre)}</h3>${corpsHtml}${bouton}
<p style="font-size:12px;color:#94a3b8">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p></div>`
}

export function emailVerification(nom: string, url: string): Email & { to?: string } {
  return {
    to: '',
    sujet: 'Confirmez votre adresse e-mail',
    html: gabarit('Confirmez votre adresse e-mail', `<p>Bonjour ${echapperHtml(nom)}, confirmez votre adresse pour publier vos annonces et contacter les autres professionnels. Ce lien est valable 24 heures.</p>`, 'Confirmer mon adresse', url),
    texte: `Bonjour ${nom},\n\nConfirmez votre adresse e-mail (lien valable 24 h) :\n${url}\n`,
  }
}

export function emailReinitialisation(nom: string, url: string): Email {
  return {
    to: '',
    sujet: 'Réinitialisation de votre mot de passe',
    html: gabarit('Réinitialiser votre mot de passe', `<p>Bonjour ${echapperHtml(nom)}, une réinitialisation de mot de passe a été demandée. Ce lien est valable 1 heure et ne sert qu'une fois.</p>`, 'Choisir un nouveau mot de passe', url),
    texte: `Bonjour ${nom},\n\nPour choisir un nouveau mot de passe (lien valable 1 h, usage unique) :\n${url}\n`,
  }
}

export function emailAlerteAnnonce(nom: string, resume: string, url: string): Email {
  return {
    to: '',
    sujet: 'Nouvelle disponibilité correspondant à votre alerte',
    html: gabarit('Un transporteur est disponible', `<p>Bonjour ${echapperHtml(nom)},</p><p>${echapperHtml(resume)}</p>`, 'Voir la disponibilité', url),
    texte: `Bonjour ${nom},\n\n${resume}\n\n${url}\n`,
  }
}

export function emailAlerteBesoin(nom: string, resume: string, url: string): Email {
  return {
    to: '',
    sujet: 'Un fret à transporter près de chez vous',
    html: gabarit('Un commissionnaire cherche un transporteur', `<p>Bonjour ${echapperHtml(nom)},</p><p>${echapperHtml(resume)}</p>`, 'Voir le besoin', url),
    texte: `Bonjour ${nom},\n\n${resume}\n\n${url}\n`,
  }
}
