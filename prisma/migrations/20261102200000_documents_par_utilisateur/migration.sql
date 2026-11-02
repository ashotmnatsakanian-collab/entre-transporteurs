-- Les documents légaux concernent désormais les transporteurs ET les commissionnaires : ils sont rattachés à l'utilisateur.

ALTER TYPE "TypeDocument" ADD VALUE 'REGISTRE_COMMISSIONNAIRE';

-- Conformité et partage : du profil transporteur vers l'utilisateur
ALTER TABLE "User" ADD COLUMN "documentsConformesJusqua" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "partageDocuments" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" u
   SET "documentsConformesJusqua" = tp."documentsConformesJusqua", "partageDocuments" = tp."partageDocuments"
  FROM "TransporteurProfil" tp
 WHERE tp."userId" = u.id;
CREATE INDEX "User_documentsConformesJusqua_idx" ON "User"("documentsConformesJusqua");

DROP INDEX "TransporteurProfil_documentsConformesJusqua_idx";
ALTER TABLE "TransporteurProfil" DROP COLUMN "documentsConformesJusqua";
ALTER TABLE "TransporteurProfil" DROP COLUMN "partageDocuments";

-- Documents : de transporteurId vers userId
ALTER TABLE "DocumentTransporteur" ADD COLUMN "userId" TEXT;
UPDATE "DocumentTransporteur" d SET "userId" = tp."userId" FROM "TransporteurProfil" tp WHERE tp.id = d."transporteurId";
ALTER TABLE "DocumentTransporteur" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "DocumentTransporteur" DROP CONSTRAINT "DocumentTransporteur_transporteurId_fkey";
DROP INDEX "DocumentTransporteur_transporteurId_type_key";
ALTER TABLE "DocumentTransporteur" DROP COLUMN "transporteurId";

ALTER TABLE "DocumentTransporteur" RENAME TO "Document";
ALTER TABLE "Document" RENAME CONSTRAINT "DocumentTransporteur_pkey" TO "Document_pkey";
ALTER INDEX "DocumentTransporteur_statut_idx" RENAME TO "Document_statut_idx";
ALTER INDEX "DocumentTransporteur_dateExpiration_idx" RENAME TO "Document_dateExpiration_idx";

CREATE UNIQUE INDEX "Document_userId_type_key" ON "Document"("userId", "type");
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentContenu" DROP CONSTRAINT "DocumentContenu_documentId_fkey";
ALTER TABLE "DocumentContenu" ADD CONSTRAINT "DocumentContenu_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
