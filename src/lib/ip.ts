type EnTetes = Headers | Record<string, string | string[] | undefined>

function lire(h: EnTetes, nom: string): string | undefined {
  if (typeof (h as Headers).get === 'function') return (h as Headers).get(nom) ?? undefined
  const v = (h as Record<string, string | string[] | undefined>)[nom]
  return Array.isArray(v) ? v[0] : v
}

/**
 * IP du client derrière un ou plusieurs reverse proxies.
 * X-Forwarded-For peut être forgé par le client : seule l'entrée ajoutée par NOTRE
 * proxy (la dernière, ou la N-ième depuis la droite avec TRUST_PROXY_HOPS) est fiable.
 */
export function ipClient(headers: EnTetes): string {
  const hops = Math.max(1, Number(process.env.TRUST_PROXY_HOPS ?? 1))
  const xff = lire(headers, 'x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length > 0) return parts[Math.max(0, parts.length - hops)].slice(0, 64)
  }
  return lire(headers, 'x-real-ip')?.slice(0, 64) ?? 'inconnue'
}
