'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ContactButton({ destinataireId, destinataireNom }: { destinataireId: string; destinataireNom: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function contacter() {
    setLoading(true)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinataireId }),
    })
    const data = await res.json()
    if (res.ok) router.push(`/messages/${data.id}`)
    setLoading(false)
  }

  return (
    <button
      onClick={contacter}
      disabled={loading}
      className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Ouverture…' : `💬 Contacter ${destinataireNom}`}
    </button>
  )
}
