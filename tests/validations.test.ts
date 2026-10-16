import { describe, expect, it } from 'vitest'
import { inscriptionSchema, motDePasseSchema, profilTransporteurSchema, siretSchema } from '@/lib/validations/profil'
import { annonceSchema } from '@/lib/validations/annonce'
import { besoinSchema, suppressionCompteSchema } from '@/lib/validations/divers'
import { paireCle } from '@/lib/conversations'
import { echapperHtml } from '@/lib/email'

const jour = 86_400_000
const inscriptionValide = { email: 'Test@Exemple.FR ', password: 'MotDePasse1', nom: 'Jean Test', role: 'TRANSPORTEUR', cgu: true }

describe('mot de passe', () => {
  it('exige longueur, majuscule, minuscule et chiffre', () => {
    expect(motDePasseSchema.safeParse('Abcdefg1').success).toBe(true)
    expect(motDePasseSchema.safeParse('abcdefg1').success).toBe(false)
    expect(motDePasseSchema.safeParse('ABCDEFG1').success).toBe(false)
    expect(motDePasseSchema.safeParse('Abcdefgh').success).toBe(false)
    expect(motDePasseSchema.safeParse('Ab1').success).toBe(false)
  })
  it('borne à 72 caractères (limite de bcrypt)', () => {
    expect(motDePasseSchema.safeParse('Aa1' + 'x'.repeat(69)).success).toBe(true)
    expect(motDePasseSchema.safeParse('Aa1' + 'x'.repeat(70)).success).toBe(false)
  })
})

describe('inscription', () => {
  it("normalise l'e-mail", () => {
    const r = inscriptionSchema.parse(inscriptionValide)
    expect(r.email).toBe('test@exemple.fr')
  })
  it('exige le consentement aux CGU', () => {
    expect(inscriptionSchema.safeParse({ ...inscriptionValide, cgu: false }).success).toBe(false)
    expect(inscriptionSchema.safeParse({ ...inscriptionValide, cgu: undefined }).success).toBe(false)
  })
  it('refuse le rôle ADMIN et tout rôle inconnu', () => {
    expect(inscriptionSchema.safeParse({ ...inscriptionValide, role: 'ADMIN' }).success).toBe(false)
    expect(inscriptionSchema.safeParse({ ...inscriptionValide, role: 'root' }).success).toBe(false)
  })
  it('valide le téléphone', () => {
    expect(inscriptionSchema.safeParse({ ...inscriptionValide, telephone: '06 01 02 03 04' }).success).toBe(true)
    expect(inscriptionSchema.safeParse({ ...inscriptionValide, telephone: '<script>' }).success).toBe(false)
  })
})

describe('SIRET dans les profils', () => {
  it('supprime les espaces puis contrôle la clé', () => {
    expect(siretSchema.parse('356 000 000 00048')).toBe('35600000000048')
    expect(siretSchema.safeParse('12345678900001').success).toBe(false)
  })
  it('profil transporteur : coordonnées bornées', () => {
    const base = { siret: '35600000000048', raisonSociale: 'Test SARL', latitude: 48, longitude: 2 }
    expect(profilTransporteurSchema.safeParse(base).success).toBe(true)
    expect(profilTransporteurSchema.safeParse({ ...base, latitude: 91 }).success).toBe(false)
  })
})

describe('annonce', () => {
  const base = { villeDepart: 'Lyon', latDepart: 45.7, lngDepart: 4.8, dateDisponibilite: new Date(Date.now() + jour).toISOString() }
  it('accepte une annonce valide et normalise les champs vides', () => {
    const r = annonceSchema.parse({ ...base, villeArrivee: '', commentaire: '  ' })
    expect(r.villeArrivee).toBeNull()
    expect(r.commentaire).toBeNull()
  })
  it('refuse une date passée, une fin avant le début, et un horizon trop lointain', () => {
    expect(annonceSchema.safeParse({ ...base, dateDisponibilite: '2020-01-01' }).success).toBe(false)
    expect(annonceSchema.safeParse({ ...base, dateDisponibiliteFin: new Date(Date.now() - jour).toISOString() }).success).toBe(false)
    expect(annonceSchema.safeParse({ ...base, dateDisponibilite: new Date(Date.now() + 400 * jour).toISOString() }).success).toBe(false)
  })
  it('borne la longueur des textes', () => {
    expect(annonceSchema.safeParse({ ...base, commentaire: 'x'.repeat(501) }).success).toBe(false)
    expect(annonceSchema.safeParse({ ...base, villeDepart: 'x'.repeat(101) }).success).toBe(false)
  })
})

describe('besoin et suppression de compte', () => {
  it('refuse un poids absurde', () => {
    const base = { villeDepart: 'Lyon', latDepart: 45, lngDepart: 4, villeArrivee: 'Paris', dateEnlevement: new Date(Date.now() + jour).toISOString() }
    expect(besoinSchema.safeParse({ ...base, poidsKg: 12000 }).success).toBe(true)
    expect(besoinSchema.safeParse({ ...base, poidsKg: 999999 }).success).toBe(false)
    expect(besoinSchema.safeParse({ ...base, poidsKg: -5 }).success).toBe(false)
  })
  it('exige la confirmation littérale SUPPRIMER', () => {
    expect(suppressionCompteSchema.safeParse({ password: 'x', confirmation: 'SUPPRIMER' }).success).toBe(true)
    expect(suppressionCompteSchema.safeParse({ password: 'x', confirmation: 'supprimer' }).success).toBe(false)
  })
})

describe('utilitaires', () => {
  it('paireCle est identique quel que soit l’ordre', () => {
    expect(paireCle('b', 'a')).toBe(paireCle('a', 'b'))
    expect(paireCle('a', 'b')).not.toBe(paireCle('a', 'c'))
  })
  it('echapperHtml neutralise le HTML injecté dans les e-mails', () => {
    expect(echapperHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    expect(echapperHtml("l'équipe & co")).toBe('l&#39;équipe &amp; co')
  })
})
