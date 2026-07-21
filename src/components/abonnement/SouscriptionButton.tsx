'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export function SouscriptionButton() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  async function sAbonner() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(false)
  }

  if (!session) {
    return (
      <Link href="/register" className="block w-full bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 transition-colors text-center">
        Commencer l'essai gratuit
      </Link>
    )
  }

  return (
    <button
      onClick={sAbonner}
      disabled={loading}
      className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Redirection vers Stripe…' : 'S\'abonner maintenant'}
    </button>
  )
}
