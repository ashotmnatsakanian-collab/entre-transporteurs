import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma, type Role } from '@prisma/client'
import { z } from 'zod'
import { authOptions } from './auth'
import { db } from './db'
import { emailActif } from './email'
import { aAccesPayant } from './acces'
import { utilisateurEstConforme } from './documents'
import { ErreurCommune, resoudreCommune, type Commune } from './communes'
import { VERSION_CGU } from './legal'
import { consommer } from './rate-limit'
import { ipClient } from './ip'
import { log, messageErreur } from './logger'

// ── Erreurs ────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public opts: { code?: string; details?: unknown; headers?: Record<string, string> } = {}
  ) {
    super(message)
  }
}

export function json(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { 'Cache-Control': 'no-store', ...init.headers },
  })
}

function reponseErreur(err: unknown, req: NextRequest) {
  if (err instanceof ApiError) {
    return json(
      { error: err.message, ...(err.opts.code && { code: err.opts.code }), ...(err.opts.details !== undefined && { details: err.opts.details }) },
      { status: err.status, headers: err.opts.headers }
    )
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return json({ error: 'Cette ressource existe déjà' }, { status: 409 })
    if (err.code === 'P2025') return json({ error: 'Ressource introuvable' }, { status: 404 })
  }
  // Détail loggué côté serveur uniquement : jamais renvoyé au client (pas de fuite de schéma/stack)
  log.error('erreur API non gérée', { route: `${req.method} ${req.nextUrl.pathname}`, erreur: messageErreur(err) })
  return json({ error: 'Erreur serveur' }, { status: 500 })
}

// ── Anti-CSRF : une requête d'écriture venue d'un autre site est refusée ───────

function verifierOrigine(req: NextRequest) {
  if (req.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403, 'Origine non autorisée')
  const origine = req.headers.get('origin')
  if (!origine) return // appel hors navigateur (curl, serveur) : pas de cookie de victime en jeu
  let hote: string
  try {
    hote = new URL(origine).host
  } catch {
    throw new ApiError(403, 'Origine non autorisée')
  }
  const attendus = [req.headers.get('x-forwarded-host'), req.headers.get('host')]
    .filter((h): h is string => !!h)
    .map((h) => h.split(',')[0].trim())
  if (!attendus.includes(hote)) throw new ApiError(403, 'Origine non autorisée')
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>

/** Enveloppe un handler : anti-CSRF, conversion des erreurs en réponses JSON propres. */
export function gerer<C = unknown>(handler: Handler<C>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) verifierOrigine(req)
      return await handler(req, ctx)
    } catch (err) {
      return reponseErreur(err, req)
    }
  }
}

// ── Lecture et validation du corps ─────────────────────────────────────────────

export async function lireJson<T>(req: NextRequest, schema: z.ZodType<T, unknown>, maxOctets = 64 * 1024): Promise<T> {
  const type = (req.headers.get('content-type') ?? '').toLowerCase()
  if (!type.startsWith('application/json')) throw new ApiError(415, 'Content-Type application/json requis')
  if (Number(req.headers.get('content-length') ?? 0) > maxOctets) throw new ApiError(413, 'Requête trop volumineuse')
  const texte = await req.text()
  if (texte.length > maxOctets) throw new ApiError(413, 'Requête trop volumineuse')
  let brut: unknown
  try {
    brut = JSON.parse(texte)
  } catch {
    throw new ApiError(400, 'JSON invalide')
  }
  const resultat = schema.safeParse(brut)
  if (!resultat.success) {
    throw new ApiError(400, 'Données invalides', { details: resultat.error.flatten().fieldErrors })
  }
  return resultat.data
}

/** Formulaire multipart (envoi de fichier) : taille annoncée obligatoire et plafonnée avant toute lecture. */
export async function lireFormulaire(req: NextRequest, maxOctets: number): Promise<FormData> {
  const type = (req.headers.get('content-type') ?? '').toLowerCase()
  if (!type.startsWith('multipart/form-data')) throw new ApiError(415, 'Content-Type multipart/form-data requis')
  const taille = Number(req.headers.get('content-length'))
  if (!Number.isFinite(taille) || taille <= 0) throw new ApiError(411, 'Taille de la requête requise')
  if (taille > maxOctets) throw new ApiError(413, 'Fichier trop volumineux')
  try {
    return await req.formData()
  } catch {
    throw new ApiError(400, 'Formulaire invalide')
  }
}

/** Paramètres d'URL validés (chaînes vides ignorées ; les schémas utilisent z.coerce). */
export function lireQuery<T>(req: NextRequest, schema: z.ZodType<T, unknown>): T {
  const brut: Record<string, string> = {}
  req.nextUrl.searchParams.forEach((valeur, cle) => {
    if (valeur !== '') brut[cle] = valeur
  })
  const resultat = schema.safeParse(brut)
  if (!resultat.success) throw new ApiError(400, 'Paramètres invalides', { details: resultat.error.flatten().fieldErrors })
  return resultat.data
}

// ── Limitation de débit ────────────────────────────────────────────────────────

export function limiter(req: NextRequest, nom: string, max: number, fenetreMs: number, qui?: string) {
  const r = consommer(`${nom}:${qui ?? ipClient(req.headers)}`, max, fenetreMs)
  if (!r.autorise) {
    throw new ApiError(429, 'Trop de requêtes. Réessayez dans quelques instants.', {
      headers: { 'Retry-After': String(r.retryApresSec) },
    })
  }
}

// ── Authentification / autorisation ────────────────────────────────────────────

export interface Utilisateur {
  id: string
  email: string
  nom: string
  role: Role
  verifie: boolean
  emailVerifie: boolean
  /** Le compte a accepté la version en vigueur des CGU */
  cguAcceptees: boolean
}

/**
 * Utilisateur de la session, relu en base à chaque requête : un compte suspendu ou
 * supprimé perd son accès immédiatement, sans attendre l'expiration du jeton JWT.
 */
export async function utilisateurCourant(): Promise<Utilisateur | null> {
  const session = await getServerSession(authOptions)
  const id = session?.user?.id
  if (!id) return null
  const u = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, nom: true, role: true, verifie: true, emailVerifieLe: true, cguVersion: true, suspendu: true, supprimeLe: true, motDePasseChangeLe: true },
  })
  if (!u || u.suspendu || u.supprimeLe) return null
  // Session ouverte avant le dernier changement de mot de passe : révoquée
  if (u.motDePasseChangeLe && (session.user.connecteLe ?? 0) < u.motDePasseChangeLe.getTime()) return null
  return { id: u.id, email: u.email, nom: u.nom, role: u.role, verifie: u.verifie, emailVerifie: !emailActif || !!u.emailVerifieLe, cguAcceptees: u.cguVersion === VERSION_CGU }
}

export async function exigerUtilisateur(...roles: Role[]): Promise<Utilisateur> {
  const u = await utilisateurCourant()
  if (!u) throw new ApiError(401, 'Non authentifié')
  if (roles.length > 0 && !roles.includes(u.role)) throw new ApiError(403, 'Accès refusé')
  return u
}

/** Commissionnaire dont l'essai ou l'abonnement est valide (recherche, contact). */
export async function exigerAccesCommissionnaire(): Promise<Utilisateur> {
  const u = await exigerUtilisateur('COMMISSIONNAIRE')
  if (!(await aAccesPayant(u.id))) throw new ApiError(402, 'Abonnement requis', { code: 'ABONNEMENT_REQUIS' })
  await exigerConformite(u.id)
  return u
}

/** Commune retrouvée auprès de l'API officielle à partir de son code INSEE (jamais de coordonnées fournies par le client). */
export async function communeOuErreur(insee: string): Promise<Commune> {
  try {
    return await resoudreCommune(insee)
  } catch (err) {
    if (err instanceof ErreurCommune) throw new ApiError(err.status, err.message)
    throw err
  }
}

/** Documents légaux validés (quand ils sont exigés) : condition pour publier, se déclarer disponible, chercher ou contacter. */
export async function exigerConformite(userId: string): Promise<void> {
  if (!(await utilisateurEstConforme(userId))) {
    throw new ApiError(403, 'Vos documents légaux doivent être validés avant cette action. Rendez-vous dans « Mes documents ».', { code: 'DOCUMENTS_REQUIS' })
  }
}

/** Actions publiques (annonce, message, avis) : l'adresse e-mail doit être confirmée. */
export function exigerEmailVerifie(u: Utilisateur) {
  if (!u.emailVerifie) {
    throw new ApiError(403, 'Confirmez votre adresse e-mail pour effectuer cette action.', { code: 'EMAIL_NON_VERIFIE' })
  }
}
