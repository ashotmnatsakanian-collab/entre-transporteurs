'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { io } from 'socket.io-client'

export function DisponibiliteToggle({ disponible: initial }: { disponible: boolean }) {
  const { data: session } = useSession()
  const [disponible, setDisponible] = useState(initial)
  const [loading, setLoading] = useState(false)

  async function basculer() {
    setLoading(true)
    const nouvelEtat = !disponible

    const res = await fetch('/api/transporteurs/disponibilite', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disponible: nouvelEtat }),
    })

    if (res.ok) {
      setDisponible(nouvelEtat)
      // Émettre aussi via socket pour mise à jour temps réel
      const socket = io({ path: '/api/socket', auth: { userId: session?.user.id } })
      socket.emit('update-disponibilite', nouvelEtat)
      socket.disconnect()
    }
    setLoading(false)
  }

  return (
    <button
      onClick={basculer}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
        disponible
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-red-100 text-red-600 hover:bg-red-200'
      } disabled:opacity-50`}
    >
      <span className={`w-2.5 h-2.5 rounded-full ${disponible ? 'bg-green-500' : 'bg-red-500'}`} />
      {loading ? 'Mise à jour…' : disponible ? 'Disponible' : 'Indisponible'}
    </button>
  )
}
