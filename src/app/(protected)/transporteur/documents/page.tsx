import { db } from '@/lib/db'
import { exigerRoleOuRediriger } from '@/lib/garde'
import { exigerDocuments } from '@/lib/documents'
import { calculerConformite } from '@/lib/documents-regles'
import { GestionDocuments } from '@/components/documents/GestionDocuments'

export const metadata = { title: 'Mes documents — Entre Transporteurs' }

export default async function DocumentsPage() {
  const u = await exigerRoleOuRediriger('TRANSPORTEUR')
  const profil = await db.transporteurProfil.findUnique({
    where: { userId: u.id },
    select: {
      partageDocuments: true,
      documentsConformesJusqua: true,
      documents: { select: { id: true, type: true, statut: true, nomFichier: true, dateExpiration: true, motifRefus: true } },
    },
  })

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Mes documents</h1>
      <p className="text-sm text-slate-700 mt-1 mb-5">
        Les commissionnaires ont l'obligation de vérifier la régularité de leurs sous-traitants. En déposant vos documents, vous gagnez leur confiance et
        apparaissez dans les recherches.
      </p>
      <GestionDocuments
        documents={profil?.documents ?? []}
        partage={profil?.partageDocuments ?? false}
        exiges={exigerDocuments()}
        conforme={calculerConformite(profil?.documents ?? []) !== null}
      />
    </div>
  )
}
