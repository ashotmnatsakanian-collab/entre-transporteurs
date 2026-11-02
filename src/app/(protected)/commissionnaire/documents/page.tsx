import { db } from '@/lib/db'
import { exigerRoleOuRediriger } from '@/lib/garde'
import { exigerDocuments } from '@/lib/documents'
import { calculerConformite } from '@/lib/documents-regles'
import { GestionDocuments } from '@/components/documents/GestionDocuments'

export const metadata = { title: 'Mes documents — Entre Transporteurs' }

export default async function DocumentsCommissionnairePage() {
  const u = await exigerRoleOuRediriger('COMMISSIONNAIRE')
  const moi = await db.user.findUniqueOrThrow({
    where: { id: u.id },
    select: { partageDocuments: true, documents: { select: { id: true, type: true, statut: true, nomFichier: true, dateExpiration: true, motifRefus: true } } },
  })

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Mes documents</h1>
      <p className="text-sm text-slate-700 mt-1 mb-5">
        Les transporteurs veulent savoir avec qui ils travaillent. En déposant vos documents, vous prouvez que votre entreprise est en règle et
        accédez à la recherche, à la carte et à la publication de besoins.
      </p>
      <GestionDocuments
        role="COMMISSIONNAIRE"
        documents={moi.documents}
        partage={moi.partageDocuments}
        exiges={exigerDocuments()}
        conforme={calculerConformite(moi.documents, 'COMMISSIONNAIRE') !== null}
      />
    </div>
  )
}
