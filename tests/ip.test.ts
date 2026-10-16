import { afterEach, describe, expect, it } from 'vitest'
import { ipClient } from '@/lib/ip'

describe('ipClient', () => {
  afterEach(() => { delete process.env.TRUST_PROXY_HOPS })

  it("prend l'entrée ajoutée par notre proxy (la dernière), pas celle forgée par le client", () => {
    const h = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }) // le client prétend être 6.6.6.6
    expect(ipClient(h)).toBe('203.0.113.9')
  })

  it('gère plusieurs proxies via TRUST_PROXY_HOPS', () => {
    process.env.TRUST_PROXY_HOPS = '2'
    const h = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9, 10.0.0.1' })
    expect(ipClient(h)).toBe('203.0.113.9')
  })

  it('accepte un objet d’en-têtes Node et retombe sur x-real-ip', () => {
    expect(ipClient({ 'x-forwarded-for': '198.51.100.7' })).toBe('198.51.100.7')
    expect(ipClient({ 'x-real-ip': '192.0.2.1' })).toBe('192.0.2.1')
    expect(ipClient({})).toBe('inconnue')
  })

  it('borne la longueur (pas de clé de limiteur démesurée)', () => {
    expect(ipClient(new Headers({ 'x-forwarded-for': 'x'.repeat(500) })).length).toBeLessThanOrEqual(64)
  })
})
