import { Server as SocketServer, type Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { getToken } from 'next-auth/jwt'
import { db } from './db'
import { aAccesPayant } from './acces'
import { emailActif } from './email'
import { ipClient } from './ip'
import { log, messageErreur } from './logger'
import { consommer } from './rate-limit'
import { contenuMessageSchema, disponibiliteSchema } from './validations/divers'

declare global {
  // eslint-disable-next-line no-var
  var _io: SocketServer | undefined
}

interface Identite {
  userId: string
  role: 'TRANSPORTEUR' | 'COMMISSIONNAIRE' | 'ADMIN'
}

function lireCookies(entete: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const morceau of (entete ?? '').split(';')) {
    const i = morceau.indexOf('=')
    if (i < 0) continue
    const cle = morceau.slice(0, i).trim()
    try {
      cookies[cle] = decodeURIComponent(morceau.slice(i + 1).trim())
    } catch {
      /* cookie malformé : ignoré */
    }
  }
  return cookies
}

/**
 * L'identité d'un socket vient UNIQUEMENT du cookie de session signé (NextAuth) et est
 * revérifiée en base : ce que le client déclare (auth.userId) est ignoré. Sans cela, il
 * suffisait de connaître l'identifiant d'un utilisateur pour écrire à sa place.
 */
async function identifier(socket: Socket): Promise<Identite | null> {
  const token = await getToken({
    req: { headers: socket.request.headers, cookies: lireCookies(socket.request.headers.cookie) } as never,
    secret: process.env.NEXTAUTH_SECRET,
  })
  if (!token?.id) return null
  const u = await db.user.findUnique({ where: { id: token.id as string }, select: { id: true, role: true, suspendu: true, supprimeLe: true, motDePasseChangeLe: true } })
  if (!u || u.suspendu || u.supprimeLe) return null
  if (u.motDePasseChangeLe && ((token.connecteLe as number | undefined) ?? 0) < u.motDePasseChangeLe.getTime()) return null
  return { userId: u.id, role: u.role }
}

export function initSocketServer(httpServer: HttpServer): SocketServer {
  if (global._io) return global._io

  const origine = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const io = new SocketServer(httpServer, {
    path: '/api/socket',
    cors: { origin: origine, methods: ['GET', 'POST'], credentials: true },
    maxHttpBufferSize: 16 * 1024, // un message de chat n'a aucune raison de dépasser 16 Ko
    allowRequest: (req, callback) => {
      // Pas de WebSocket cross-site : l'origine doit être celle de l'application (ou absente : hors navigateur)
      const o = req.headers.origin
      if (!o) return callback(null, true)
      try {
        const hote = new URL(o).host
        const attendus = [new URL(origine).host, req.headers.host, (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0].trim()]
        callback(null, attendus.includes(hote))
      } catch {
        callback(null, false)
      }
    },
  })

  io.use(async (socket, next) => {
    // Plafond de connexions par IP (sinon un script peut saturer le serveur)
    const ip = ipClient(socket.request.headers)
    if (!consommer(`socket-connexion:${ip}`, 120, 60_000).autorise) return next(new Error('TROP_DE_REQUETES'))
    try {
      const identite = await identifier(socket)
      if (!identite) return next(new Error('NON_AUTHENTIFIE'))
      socket.data.identite = identite
      next()
    } catch (err) {
      log.error('authentification socket échouée', { erreur: messageErreur(err) })
      next(new Error('NON_AUTHENTIFIE'))
    }
  })

  io.on('connection', (socket) => {
    const { userId, role } = socket.data.identite as Identite

    // Room personnelle : notifications ciblées (badge non-lus) quelle que soit la page ouverte
    socket.join(`user:${userId}`)

    const autorise = (cle: string, max: number, fenetreMs: number) => consommer(`socket:${cle}:${userId}`, max, fenetreMs).autorise

    // ── Messagerie ─────────────────────────────────────────────────────────────
    socket.on('join-conversation', async (conversationId: unknown) => {
      if (typeof conversationId !== 'string' || conversationId.length > 40) return
      if (!autorise('join', 60, 60_000)) return
      // Seuls les participants écoutent une conversation (sinon : espionnage par simple identifiant)
      const p = await db.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
        select: { id: true },
      })
      if (p) socket.join(`conv:${conversationId}`)
    })

    socket.on('leave-conversation', (conversationId: unknown) => {
      if (typeof conversationId === 'string') socket.leave(`conv:${conversationId}`)
    })

    socket.on('send-message', async (data: unknown) => {
      try {
        if (role === 'ADMIN') return
        if (!autorise('message', 30, 60_000)) {
          socket.emit('error', { message: 'Vous envoyez trop de messages. Patientez un instant.' })
          return
        }
        const d = data as { conversationId?: unknown; contenu?: unknown }
        const contenu = contenuMessageSchema.safeParse(d?.contenu)
        if (typeof d?.conversationId !== 'string' || !contenu.success) return

        const participant = await db.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId: d.conversationId, userId } },
          select: { id: true },
        })
        if (!participant) return

        // Compte à jour (suspension, e-mail non vérifié, accès commissionnaire expiré) : relu à chaque envoi
        const u = await db.user.findUnique({ where: { id: userId }, select: { suspendu: true, supprimeLe: true, emailVerifieLe: true } })
        if (!u || u.suspendu || u.supprimeLe || (emailActif && !u.emailVerifieLe)) return
        if (role === 'COMMISSIONNAIRE' && !(await aAccesPayant(userId))) {
          socket.emit('error', { message: 'Abonnement requis pour envoyer des messages.' })
          return
        }

        const message = await db.message.create({
          data: { conversationId: d.conversationId, expediteurId: userId, contenu: contenu.data },
          include: { expediteur: { select: { id: true, nom: true, role: true } } },
        })
        await db.conversation.update({ where: { id: d.conversationId }, data: { updatedAt: new Date() } })

        io.to(`conv:${d.conversationId}`).emit('new-message', message)

        const autres = await db.conversationParticipant.findMany({
          where: { conversationId: d.conversationId, userId: { not: userId } },
          select: { userId: true },
        })
        for (const p of autres) io.to(`user:${p.userId}`).emit('unread-message', { conversationId: d.conversationId })
      } catch (err) {
        log.error('send-message échoué', { erreur: messageErreur(err) })
        socket.emit('error', { message: "Erreur lors de l'envoi du message" })
      }
    })

    // ── Disponibilité temps réel ────────────────────────────────────────────────
    socket.on('update-disponibilite', async (valeur: unknown) => {
      if (role !== 'TRANSPORTEUR' || !autorise('dispo', 30, 60_000)) return
      const d = disponibiliteSchema.safeParse({ disponible: valeur })
      if (!d.success) return
      try {
        await db.transporteurProfil.update({ where: { userId }, data: { disponible: d.data.disponible, derniereMAJ: new Date() } })
        io.to('carte').emit('disponibilite-change', { userId, disponible: d.data.disponible })
      } catch {
        socket.emit('error', { message: 'Erreur mise à jour disponibilité' })
      }
    })

    // ── Flux en direct (réservés aux profils concernés) ─────────────────────────
    // La carte et le tableau d'annonces montrent des transporteurs : commissionnaires avec accès.
    socket.on('join-carte', async () => {
      if (role === 'COMMISSIONNAIRE' && (await aAccesPayant(userId))) socket.join('carte')
    })

    socket.on('join-annonces', async () => {
      if (role === 'COMMISSIONNAIRE' && (await aAccesPayant(userId))) socket.join('annonces')
    })

    // Les besoins de transport sont destinés aux transporteurs
    socket.on('join-besoins', () => {
      if (role === 'TRANSPORTEUR') socket.join('besoins')
    })
  })

  global._io = io
  return io
}

export function getIO(): SocketServer | null {
  return global._io ?? null
}
