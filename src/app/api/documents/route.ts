import { randomUUID } from 'crypto'
import { z } from 'zod'
import { TypeDocument } from '@prisma/client'
import { db } from '@/lib/db'
import { chiffrer, empreinte, exigerDocuments, recalculerConformite } from '@/lib/documents'
import {
  TAILLE_MAX_OCTETS, calculerExpiration, detecterMime, nettoyerNomFichier, pdfSuspect, statutEffectif,
} from '@/lib/documents-regles'
import { journaliser } from '@/lib/journal'
import { ipClient } from '@/lib/ip'
import { ApiError, exigerEmailVerifie, exigerUtilisateur, gerer, json, limiter, lireFormulaire, lireJson } from '@/lib/api'

// GET /api/documents — mes documents (métadonnées uniquement, jamais le contenu)
export const GET = gerer(async () => {
  const u = await exigerUtilisateur('TRANSPORTEUR')
  const profil = await db.transporteurProfil.findUnique({
    where: { userId: u.id },
    select: {
      documentsConformesJusqua: true,
      partageDocuments: true,
      documents: {
        select: { id: true, type: true, statut: true, nomFichier: true, mime: true, taille: true, dateEmission: true, dateExpiration: true, motifRefus: true, verifieLe: true, createdAt: true },
      },
    },
  })
  if (!profil) throw new ApiError(404, 'Profil transporteur introuvable')
  const maintenant = new Date()
  return json({
    exiges: exigerDocuments(),
    conforme: !!profil.documentsConformesJusqua && profil.documentsConformesJusqua > maintenant,
    conformeJusqua: profil.documentsConformesJusqua,
    partage: profil.partageDocuments,
    documents: profil.documents.map((d) => ({ ...d, statutAffiche: statutEffectif(d, maintenant) })),
  })
})

const champsDate = z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.date().optional())
const formulaireSchema = z.object({ type: z.nativeEnum(TypeDocument), dateEmission: champsDate, dateFin: champsDate })

// POST /api/documents (multipart) — déposer ou remplacer un document ; il repasse en attente de validation
export const POST = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR')
  exigerEmailVerifie(u)
  limiter(req, 'document-depot', 30, 60 * 60_000, u.id)

  // Marge pour les champs du formulaire autour du fichier
  const form = await lireFormulaire(req, TAILLE_MAX_OCTETS + 64 * 1024)
  const champs = formulaireSchema.safeParse({
    type: form.get('type'),
    dateEmission: form.get('dateEmission'),
    dateFin: form.get('dateFin'),
  })
  if (!champs.success) throw new ApiError(400, 'Données invalides', { details: champs.error.flatten().fieldErrors })

  const fichier = form.get('fichier')
  if (!(fichier instanceof File) || fichier.size === 0) throw new ApiError(400, 'Fichier requis')
  if (fichier.size > TAILLE_MAX_OCTETS) throw new ApiError(413, 'Fichier trop volumineux (5 Mo maximum)')

  const octets = Buffer.from(await fichier.arrayBuffer())
  const mime = detecterMime(octets)
  if (!mime) throw new ApiError(400, 'Format non accepté : envoyez un PDF, un JPEG ou un PNG.')
  if (mime === 'application/pdf' && pdfSuspect(octets)) throw new ApiError(400, 'Ce PDF contient des éléments actifs (script, pièce jointe) : exportez-le de nouveau sans eux.')

  const exp = calculerExpiration(champs.data.type, { dateEmission: champs.data.dateEmission, dateFin: champs.data.dateFin })
  if (!exp.ok) throw new ApiError(400, exp.erreur)

  const profil = await db.transporteurProfil.findUnique({ where: { userId: u.id }, select: { id: true } })
  if (!profil) throw new ApiError(404, 'Profil transporteur introuvable')

  // Un seul document courant par type : le précédent est supprimé (avec son contenu, en cascade)
  const id = randomUUID()
  const [, document] = await db.$transaction([
    db.documentTransporteur.deleteMany({ where: { transporteurId: profil.id, type: champs.data.type } }),
    db.documentTransporteur.create({
      data: {
        id,
        transporteurId: profil.id,
        type: champs.data.type,
        nomFichier: nettoyerNomFichier(fichier.name),
        mime,
        taille: octets.length,
        sha256: empreinte(octets),
        dateEmission: exp.dateEmission,
        dateExpiration: exp.dateExpiration,
        contenu: { create: { donnees: chiffrer(octets, id) } },
      },
      select: { id: true, type: true, statut: true, nomFichier: true, taille: true, dateEmission: true, dateExpiration: true },
    }),
  ])
  await recalculerConformite(profil.id)
  await journaliser('document_depose', { userId: u.id, ip: ipClient(req.headers), details: champs.data.type })
  return json(document, { status: 201 })
})

// PATCH /api/documents — autoriser (ou non) les commissionnaires avec qui j'échange à télécharger mes documents validés
export const PATCH = gerer(async (req) => {
  const u = await exigerUtilisateur('TRANSPORTEUR')
  limiter(req, 'document-partage', 30, 60 * 60_000, u.id)
  const { partage } = await lireJson(req, z.object({ partage: z.boolean() }))
  await db.transporteurProfil.update({ where: { userId: u.id }, data: { partageDocuments: partage } })
  return json({ partage })
})
