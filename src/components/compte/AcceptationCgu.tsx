'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AcceptationCgu({ version }: { version: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  async function accepter() {
    setLoading(true)
    setErreur('')
    const res = await fetch('/api/compte/cgu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setErreur(data.error ?? 'Impossible d\'enregistrer votre acceptation.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={accepter} disabled={loading}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
        {loading ? 'Enregistrement…' : "J'ai lu et j'accepte"}
      </button>
      {erreur && <p className="text-red-600 text-sm mt-2" role="alert">{erreur}</p>}
    </div>
  )
}
