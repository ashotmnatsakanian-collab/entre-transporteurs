'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { io } from 'socket.io-client'

export function BadgeNonLus({ userId }: { userId: string }) {
  const [count, setCount] = useState(0)
  const { data: session } = useSession()

  useEffect(() => {
    // Chargement initial
    fetch('/api/messages')
      .then((r) => r.json())
      .then((convs: Array<{ nonLus: number }>) => {
        setCount(convs.reduce((acc, c) => acc + c.nonLus, 0))
      })
      .catch(() => {})

    // Mise à jour en temps réel via Socket.io
    const socket = io({ path: '/api/socket', auth: { userId: session?.user.id } })
    socket.on('new-message', (msg: { expediteur: { id: string } }) => {
      if (msg.expediteur.id !== userId) {
        setCount((n) => n + 1)
      }
    })

    return () => { socket.disconnect() }
  }, [userId, session])

  if (count === 0) return null

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
      {count > 9 ? '9+' : count}
    </span>
  )
}
