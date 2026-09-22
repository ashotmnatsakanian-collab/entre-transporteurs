'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Message {
  id: string
  conversationId: string
  contenu: string
  lu: boolean
  createdAt: string
  expediteur: { id: string; nom: string; role: string }
}

interface Participant {
  id: string
  nom: string
  role: string
}

interface Props {
  conversation: {
    id: string
    messages: Message[]
    participants: Array<{ userId: string; user: Participant }>
  }
  currentUser: { id: string; nom: string }
  interlocuteur: Participant | null
}

export function FilDiscussion({ conversation, currentUser, interlocuteur }: Props) {
  const [messages, setMessages] = useState<Message[]>(conversation.messages)
  const [contenu, setContenu] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const basRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    basRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const socket = io({ path: '/api/socket', auth: { userId: currentUser.id } })
    socketRef.current = socket
    socket.emit('join-conversation', conversation.id)

    socket.on('new-message', (msg: Message) => {
      setMessages((prev) => [...prev, msg])
      // Marquer comme lu si on est dans la conversation
      if (msg.expediteur.id !== currentUser.id) {
        fetch(`/api/messages/${conversation.id}/lu`, { method: 'PATCH' }).catch(() => {})
      }
    })

    // L'interlocuteur vient de lire nos messages — mettre à jour l'indicateur "· Lu" sans recharger
    socket.on('messages-read', () => {
      setMessages((prev) => prev.map((m) => (m.expediteur.id === currentUser.id ? { ...m, lu: true } : m)))
    })

    return () => {
      socket.emit('leave-conversation', conversation.id)
      socket.disconnect()
    }
  }, [conversation.id, currentUser.id])

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    if (!contenu.trim() || envoi) return
    setEnvoi(true)

    const socket = socketRef.current
    if (socket) {
      socket.emit('send-message', { conversationId: conversation.id, contenu: contenu.trim() })
    }
    setContenu('')
    setEnvoi(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* En-tête */}
      <div className="px-6 py-4 border-b bg-white flex items-center gap-4 shrink-0">
        <Link href="/messages" className="text-slate-400 hover:text-slate-600 text-sm">← Retour</Link>
        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
          {interlocuteur?.nom[0]?.toUpperCase()}
        </div>
        <div>
          <div className="font-medium text-slate-800">{interlocuteur?.nom}</div>
          <div className="text-xs text-slate-400">{interlocuteur?.role === 'TRANSPORTEUR' ? 'Transporteur' : 'Commissionnaire'}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-slate-400 text-sm text-center pt-8">Envoyez le premier message pour démarrer la conversation.</p>
        )}
        {messages.map((msg) => {
          const moi = msg.expediteur.id === currentUser.id
          return (
            <div key={msg.id} className={`flex ${moi ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] sm:max-w-[60%]`}>
                {!moi && <div className="text-xs text-slate-400 mb-1">{msg.expediteur.nom}</div>}
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                  moi
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                }`}>
                  {msg.contenu}
                </div>
                <div className={`text-xs text-slate-400 mt-1 ${moi ? 'text-right' : ''}`}>
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: fr })}
                  {moi && msg.lu && <span className="ml-1">· Lu</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={basRef} />
      </div>

      {/* Zone de saisie */}
      <div className="border-t bg-white px-4 py-3 shrink-0">
        <form onSubmit={envoyer} className="flex gap-2">
          <input
            type="text"
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Écrire un message…"
            className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={!contenu.trim() || envoi}
            className="bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            Envoyer
          </button>
        </form>
      </div>
    </div>
  )
}
