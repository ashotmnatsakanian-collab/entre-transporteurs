import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DOCUMENTS, OBLIGATOIRES_PAR_ROLE, TYPES_PAR_ROLE, calculerConformite, definition, calculerExpiration, detecterMime, nettoyerNomFichier, pdfSuspect, statutEffectif,
} from '../src/lib/documents-regles'
import { chiffrer, dechiffrer, empreinte, exigerDocuments } from '../src/lib/documents'

const JOUR = 86_400_000
const dans = (j: number) => new Date(Date.now() + j * JOUR)

afterEach(() => vi.unstubAllEnvs())

describe('détection du type réel du fichier', () => {
  it('reconnaît PDF, JPEG et PNG par leurs premiers octets', () => {
    expect(detecterMime(Buffer.from('%PDF-1.7\n'))).toBe('application/pdf')
    expect(detecterMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(detecterMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png')
  })

  it("refuse un exécutable ou un script renommé en .pdf", () => {
    expect(detecterMime(Buffer.from('MZ\x90\x00'))).toBeNull() // exécutable Windows
    expect(detecterMime(Buffer.from('#!/bin/sh\nrm -rf /'))).toBeNull()
    expect(detecterMime(Buffer.from('<html><script>alert(1)</script>'))).toBeNull()
    expect(detecterMime(Buffer.from('<svg onload=alert(1)>'))).toBeNull()
    expect(detecterMime(Buffer.alloc(0))).toBeNull()
  })

  it('signale un PDF qui embarque du JavaScript, un lancement ou une pièce jointe', () => {
    expect(pdfSuspect(Buffer.from('%PDF-1.4 1 0 obj << /Type /Catalog /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>'))).toBe(true)
    expect(pdfSuspect(Buffer.from('%PDF-1.4 << /Launch >>'))).toBe(true)
    expect(pdfSuspect(Buffer.from('%PDF-1.4 << /EmbeddedFile >>'))).toBe(true)
    expect(pdfSuspect(Buffer.from('%PDF-1.4 1 0 obj << /Type /Page >> endobj'))).toBe(false)
  })

  it("nettoie le nom de fichier (chemin, caractères de contrôle, longueur)", () => {
    expect(nettoyerNomFichier('../../etc/passwd')).toBe('passwd')
    expect(nettoyerNomFichier('C:\\Users\\moi\\kbis.pdf')).toBe('kbis.pdf')
    expect(nettoyerNomFichier('a\r\nContent-Type: text/html.pdf')).not.toMatch(/[\r\n:]/)
    expect(nettoyerNomFichier('<script>alert(1)</script>.pdf')).not.toMatch(/[<>]/)
    expect(nettoyerNomFichier('x'.repeat(500)).length).toBeLessThanOrEqual(80)
    expect(nettoyerNomFichier('///')).toBe('document')
  })
})

describe("date d'expiration des documents", () => {
  it('Kbis : 3 mois après la délivrance ; refuse un extrait trop ancien', () => {
    const ok = calculerExpiration('KBIS', { dateEmission: dans(-10) })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(Math.round((ok.dateExpiration.getTime() - Date.now()) / JOUR)).toBeGreaterThan(70)
    expect(calculerExpiration('KBIS', { dateEmission: dans(-120) }).ok).toBe(false)
  })

  it('vigilance URSSAF : valable 6 mois', () => {
    expect(calculerExpiration('VIGILANCE_URSSAF', { dateEmission: dans(-150) }).ok).toBe(true)
    expect(calculerExpiration('VIGILANCE_URSSAF', { dateEmission: dans(-200) }).ok).toBe(false)
  })

  it('licence et assurance : portent leur propre date de fin, qui doit être future et raisonnable', () => {
    expect(calculerExpiration('LICENCE_TRANSPORT', { dateFin: dans(400) }).ok).toBe(true)
    expect(calculerExpiration('ASSURANCE', { dateFin: dans(-1) }).ok).toBe(false)
    expect(calculerExpiration('ASSURANCE', { dateFin: dans(365 * 30) }).ok).toBe(false)
    expect(calculerExpiration('ASSURANCE', {}).ok).toBe(false)
  })

  it('refuse une date de délivrance dans le futur ou absente', () => {
    expect(calculerExpiration('REGULARITE_FISCALE', { dateEmission: dans(10) }).ok).toBe(false)
    expect(calculerExpiration('REGULARITE_FISCALE', {}).ok).toBe(false)
  })

  it('chaque type a une règle', () => {
    for (const t of OBLIGATOIRES_PAR_ROLE.TRANSPORTEUR) expect(DOCUMENTS[t].regle).toBeDefined()
  })
})

describe('conformité du dossier', () => {
  const complet = (statut: 'VALIDE' | 'EN_ATTENTE' | 'REFUSE' = 'VALIDE', jours = 60) =>
    OBLIGATOIRES_PAR_ROLE.TRANSPORTEUR.map((type) => ({ type, statut, dateExpiration: dans(jours) }))

  it('est conforme quand les cinq documents sont validés et en cours de validité', () => {
    expect(calculerConformite(complet())).not.toBeNull()
  })

  it("retourne la date d'expiration la plus proche", () => {
    const docs = complet()
    docs[2] = { ...docs[2], dateExpiration: dans(5) }
    const limite = calculerConformite(docs)!
    expect(Math.round((limite.getTime() - Date.now()) / JOUR)).toBe(5)
  })

  it('tombe si un document manque, est en attente, refusé ou expiré', () => {
    expect(calculerConformite(complet().slice(1))).toBeNull()
    expect(calculerConformite([...complet().slice(1), { type: 'KBIS', statut: 'EN_ATTENTE', dateExpiration: dans(60) }])).toBeNull()
    expect(calculerConformite([...complet().slice(1), { type: 'KBIS', statut: 'REFUSE', dateExpiration: dans(60) }])).toBeNull()
    expect(calculerConformite([...complet().slice(1), { type: 'KBIS', statut: 'VALIDE', dateExpiration: dans(-1) }])).toBeNull()
  })

  it('affiche « expiré » pour un document validé dont la date est passée', () => {
    expect(statutEffectif({ statut: 'VALIDE', dateExpiration: dans(-1) })).toBe('EXPIRE')
    expect(statutEffectif({ statut: 'VALIDE', dateExpiration: dans(1) })).toBe('VALIDE')
    expect(statutEffectif(undefined)).toBe('MANQUANT')
  })
})

describe('documents des commissionnaires', () => {
  const dossier = (types: readonly string[], statut: 'VALIDE' | 'EN_ATTENTE' = 'VALIDE') =>
    types.map((type) => ({ type: type as never, statut, dateExpiration: dans(60) }))

  it("chaque rôle a ses documents, la licence de transport n'étant demandée qu'aux transporteurs", () => {
    expect(TYPES_PAR_ROLE.TRANSPORTEUR).toContain('LICENCE_TRANSPORT')
    expect(TYPES_PAR_ROLE.COMMISSIONNAIRE).not.toContain('LICENCE_TRANSPORT')
    expect(TYPES_PAR_ROLE.TRANSPORTEUR).not.toContain('REGISTRE_COMMISSIONNAIRE')
    expect(TYPES_PAR_ROLE.COMMISSIONNAIRE).toContain('REGISTRE_COMMISSIONNAIRE')
  })

  it("le registre des commissionnaires est demandé mais ne bloque pas la conformité", () => {
    expect(OBLIGATOIRES_PAR_ROLE.COMMISSIONNAIRE).not.toContain('REGISTRE_COMMISSIONNAIRE')
    expect(calculerConformite(dossier(OBLIGATOIRES_PAR_ROLE.COMMISSIONNAIRE), 'COMMISSIONNAIRE')).not.toBeNull()
  })

  it("sans licence de transport, un dossier est conforme pour un commissionnaire mais pas pour un transporteur", () => {
    const sansLicence = dossier(['KBIS', 'VIGILANCE_URSSAF', 'REGULARITE_FISCALE', 'ASSURANCE'])
    expect(calculerConformite(sansLicence, 'COMMISSIONNAIRE')).not.toBeNull()
    expect(calculerConformite(sansLicence, 'TRANSPORTEUR')).toBeNull()
  })

  it('un commissionnaire incomplet ou en attente est non conforme', () => {
    expect(calculerConformite(dossier(['KBIS', 'ASSURANCE']), 'COMMISSIONNAIRE')).toBeNull()
    expect(calculerConformite(dossier(OBLIGATOIRES_PAR_ROLE.COMMISSIONNAIRE, 'EN_ATTENTE'), 'COMMISSIONNAIRE')).toBeNull()
  })

  it("le texte de l'assurance est adapté au commissionnaire", () => {
    expect(definition('ASSURANCE', 'COMMISSIONNAIRE').libelle).toContain('responsabilité civile professionnelle')
    expect(definition('ASSURANCE', 'TRANSPORTEUR').libelle).toBe(DOCUMENTS.ASSURANCE.libelle)
    expect(definition('KBIS', 'COMMISSIONNAIRE').libelle).toBe(DOCUMENTS.KBIS.libelle)
  })

  it("le registre des commissionnaires porte sa propre date de fin", () => {
    expect(calculerExpiration('REGISTRE_COMMISSIONNAIRE', { dateFin: dans(300) }).ok).toBe(true)
    expect(calculerExpiration('REGISTRE_COMMISSIONNAIRE', { dateFin: dans(-3) }).ok).toBe(false)
  })
})

describe('chiffrement des documents', () => {
  it('restitue le contenu à l\'identique', () => {
    vi.stubEnv('DOCUMENTS_CLE', 'une-cle-de-test-de-plus-de-trente-deux-caracteres')
    const clair = Buffer.from('%PDF-1.7 contenu confidentiel')
    const chiffre = chiffrer(clair, 'doc-1')
    expect(chiffre.includes(clair)).toBe(false)
    expect(dechiffrer(chiffre, 'doc-1').equals(clair)).toBe(true)
  })

  it('refuse un contenu modifié ou recopié sur un autre document', () => {
    vi.stubEnv('DOCUMENTS_CLE', 'une-cle-de-test-de-plus-de-trente-deux-caracteres')
    const chiffre = chiffrer(Buffer.from('secret'), 'doc-1')
    expect(() => dechiffrer(chiffre, 'doc-2')).toThrow()
    const altere = Buffer.from(chiffre)
    altere[altere.length - 1] ^= 1
    expect(() => dechiffrer(altere, 'doc-1')).toThrow()
  })

  it("utilise un vecteur différent à chaque chiffrement et une autre clé ne déchiffre pas", () => {
    vi.stubEnv('DOCUMENTS_CLE', 'cle-numero-un-de-plus-de-trente-deux-caracteres')
    const a = chiffrer(Buffer.from('x'), 'd')
    const b = chiffrer(Buffer.from('x'), 'd')
    expect(a.equals(b)).toBe(false)
    vi.stubEnv('DOCUMENTS_CLE', 'cle-numero-deux-de-plus-de-trente-deux-caracteres')
    expect(() => dechiffrer(a, 'd')).toThrow()
  })

  it('calcule une empreinte SHA-256', () => {
    expect(empreinte(Buffer.from('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe("obligation de fournir les documents", () => {
  it('suit EXIGER_DOCUMENTS', () => {
    vi.stubEnv('EXIGER_DOCUMENTS', 'true')
    expect(exigerDocuments()).toBe(true)
    vi.stubEnv('EXIGER_DOCUMENTS', 'false')
    expect(exigerDocuments()).toBe(false)
  })
})
