-- Documents légaux des transporteurs (Kbis, licence, vigilance URSSAF, régularité fiscale, assurance…).

CREATE TYPE "TypeDocument" AS ENUM ('KBIS', 'LICENCE_TRANSPORT', 'VIGILANCE_URSSAF', 'REGULARITE_FISCALE', 'ASSURANCE');
CREATE TYPE "StatutDocument" AS ENUM ('EN_ATTENTE', 'VALIDE', 'REFUSE');

ALTER TABLE "TransporteurProfil" ADD COLUMN "documentsConformesJusqua" TIMESTAMP(3);
ALTER TABLE "TransporteurProfil" ADD COLUMN "partageDocuments" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "TransporteurProfil_documentsConformesJusqua_idx" ON "TransporteurProfil"("documentsConformesJusqua");

CREATE TABLE "DocumentTransporteur" (
    "id" TEXT NOT NULL,
    "transporteurId" TEXT NOT NULL,
    "type" "TypeDocument" NOT NULL,
    "statut" "StatutDocument" NOT NULL DEFAULT 'EN_ATTENTE',
    "nomFichier" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "dateEmission" TIMESTAMP(3),
    "dateExpiration" TIMESTAMP(3) NOT NULL,
    "motifRefus" TEXT,
    "verifieParId" TEXT,
    "verifieLe" TIMESTAMP(3),
    "rappelEnvoyeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTransporteur_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentContenu" (
    "documentId" TEXT NOT NULL,
    "donnees" BYTEA NOT NULL,

    CONSTRAINT "DocumentContenu_pkey" PRIMARY KEY ("documentId")
);

CREATE UNIQUE INDEX "DocumentTransporteur_transporteurId_type_key" ON "DocumentTransporteur"("transporteurId", "type");
CREATE INDEX "DocumentTransporteur_statut_idx" ON "DocumentTransporteur"("statut");
CREATE INDEX "DocumentTransporteur_dateExpiration_idx" ON "DocumentTransporteur"("dateExpiration");

ALTER TABLE "DocumentTransporteur" ADD CONSTRAINT "DocumentTransporteur_transporteurId_fkey" FOREIGN KEY ("transporteurId") REFERENCES "TransporteurProfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentContenu" ADD CONSTRAINT "DocumentContenu_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentTransporteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
