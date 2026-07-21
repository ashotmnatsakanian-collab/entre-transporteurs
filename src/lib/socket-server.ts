import { Server as SocketServer } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { db } from './db'

declare global {
  // eslint-disable-next-line no-var
  var _io: SocketServer | undefined
}

export function initSocketServer(httpServer: HttpServer): SocketServer {
  if (global._io) return global._io

  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socket',
  })

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId as string | undefined

    // ── Messagerie ─────────────────────────────────────────────────────────────
    socket.on('join-conversation', (conversationId: string) => {
      socket.join(`conv:${conversationId}`)
    })

    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`)
    })

    socket.on('send-message', async (data: { conversationId: string; contenu: string }) => {
      if (!userId) return
      try {
        // Vérifier que l'utilisateur fait partie de la conversation
        const participant = await db.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId: data.conversationId, userId } },
        })
        if (!participant) return

        const message = await db.message.create({
          data: {
            conversationId: data.conversationId,
            expediteurId: userId,
            contenu: data.contenu.trim(),
          },
          include: { expediteur: { select: { id: true, nom: true, role: true } } },
        })

        await db.conversation.update({
          where: { id: data.conversationId },
          data: { updatedAt: new Date() },
        })

        io.to(`conv:${data.conversationId}`).emit('new-message', message)
      } catch (err) {
        socket.emit('error', { message: 'Erreur lors de l\'envoi du message' })
      }
    })

    // ── Disponibilité temps réel ────────────────────────────────────────────────
    socket.on('update-disponibilite', async (disponible: boolean) => {
      if (!userId) return
      try {
        await db.transporteurProfil.update({
          where: { userId },
          data: { disponible, derniereMAJ: new Date() },
        })
        // Diffuser à tous les clients sur la carte
        io.emit('disponibilite-change', { userId, disponible })
      } catch {
        socket.emit('error', { message: 'Erreur mise à jour disponibilité' })
      }
    })

    socket.on('join-carte', () => {
      socket.join('carte')
    })
  })

  global._io = io
  return io
}

export function getIO(): SocketServer | null {
  return global._io ?? null
}
