-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TRANSPORTEUR', 'COMMISSIONNAIRE', 'ADMIN');

-- CreateEnum
CREATE TYPE "TypeToken" AS ENUM ('VERIFICATION_EMAIL', 'REINITIALISATION_MDP');

-- CreateEnum
CREATE TYPE "MotifSignalement" AS ENUM ('SPAM', 'FAUSSE_IDENTITE', 'COMPORTEMENT_ABUSIF', 'ARNAQUE', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutSignalement" AS ENUM ('OUVERT', 'TRAITE', 'REJETE');

-- CreateEnum
CREATE TYPE "StatutAbonnement" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "TypeVehicule" AS ENUM ('PORTEUR', 'SEMI', 'VL', 'UTILITAIRE', 'PLATEAU', 'BENNE', 'CITERNE', 'FOURGON');

-- CreateEnum
CREATE TYPE "Specificite" AS ENUM ('HAYON', 'FRIGORIFIQUE', 'BACHE', 'PLATEAU', 'ADR', 'GRUE', 'AMPLIROLL', 'CAISSE_MOBILE', 'SAVOYARDE', 'MEGA', 'DOUBLE_PLANCHER', 'VEHICULE_ACCOMPAGNE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "role" "Role" NOT NULL,
    "verifie" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailVerifieLe" TIMESTAMP(3),
    "cguAccepteesLe" TIMESTAMP(3),
    "suspendu" BOOLEAN NOT NULL DEFAULT false,
    "alertesEmail" BOOLEAN NOT NULL DEFAULT true,
    "supprimeLe" TIMESTAMP(3),
    "motDePasseChangeLe" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransporteurProfil" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siret" TEXT NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "description" TEXT,
    "siretVerifieLe" TIMESTAMP(3),
    "activiteOfficielle" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "zonesCirculation" TEXT[],
    "disponible" BOOLEAN NOT NULL DEFAULT false,
    "derniereMAJ" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransporteurProfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionnaireProfil" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siret" TEXT NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "siretVerifieLe" TIMESTAMP(3),
    "activiteOfficielle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionnaireProfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicule" (
    "id" TEXT NOT NULL,
    "transporteurId" TEXT NOT NULL,
    "type" "TypeVehicule" NOT NULL,
    "specificites" "Specificite"[],
    "longueur" DOUBLE PRECISION,
    "largeur" DOUBLE PRECISION,
    "hauteur" DOUBLE PRECISION,
    "chargeUtile" DOUBLE PRECISION NOT NULL,
    "immatriculation" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annonce" (
    "id" TEXT NOT NULL,
    "transporteurId" TEXT NOT NULL,
    "vehiculeId" TEXT,
    "villeDepart" TEXT NOT NULL,
    "latDepart" DOUBLE PRECISION NOT NULL,
    "lngDepart" DOUBLE PRECISION NOT NULL,
    "villeArrivee" TEXT,
    "dateDisponibilite" TIMESTAMP(3) NOT NULL,
    "dateDisponibiliteFin" TIMESTAMP(3),
    "commentaire" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Annonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avis" (
    "id" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "transporteurId" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Avis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "cle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "expediteurId" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abonnement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "statut" "StatutAbonnement" NOT NULL DEFAULT 'TRIALING',
    "dateFinEssai" TIMESTAMP(3),
    "dateFinPeriode" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Besoin" (
    "id" TEXT NOT NULL,
    "commissionnaireId" TEXT NOT NULL,
    "villeDepart" TEXT NOT NULL,
    "latDepart" DOUBLE PRECISION NOT NULL,
    "lngDepart" DOUBLE PRECISION NOT NULL,
    "villeArrivee" TEXT NOT NULL,
    "dateEnlevement" TIMESTAMP(3) NOT NULL,
    "typeVehicule" "TypeVehicule",
    "poidsKg" DOUBLE PRECISION,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Besoin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerte" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "villeDepart" TEXT NOT NULL,
    "latDepart" DOUBLE PRECISION NOT NULL,
    "lngDepart" DOUBLE PRECISION NOT NULL,
    "rayonKm" INTEGER NOT NULL DEFAULT 100,
    "villeArrivee" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "derniereNotifLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TypeToken" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "utiliseLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signalement" (
    "id" TEXT NOT NULL,
    "signalantId" TEXT NOT NULL,
    "cibleId" TEXT NOT NULL,
    "motif" "MotifSignalement" NOT NULL,
    "details" TEXT,
    "statut" "StatutSignalement" NOT NULL DEFAULT 'OUVERT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteLe" TIMESTAMP(3),

    CONSTRAINT "Signalement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalSecurite" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalSecurite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TransporteurProfil_userId_key" ON "TransporteurProfil"("userId");

-- CreateIndex
CREATE INDEX "TransporteurProfil_latitude_longitude_idx" ON "TransporteurProfil"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "TransporteurProfil_disponible_idx" ON "TransporteurProfil"("disponible");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionnaireProfil_userId_key" ON "CommissionnaireProfil"("userId");

-- CreateIndex
CREATE INDEX "Vehicule_transporteurId_idx" ON "Vehicule"("transporteurId");

-- CreateIndex
CREATE INDEX "Vehicule_type_idx" ON "Vehicule"("type");

-- CreateIndex
CREATE INDEX "Vehicule_chargeUtile_idx" ON "Vehicule"("chargeUtile");

-- CreateIndex
CREATE INDEX "Annonce_latDepart_lngDepart_idx" ON "Annonce"("latDepart", "lngDepart");

-- CreateIndex
CREATE INDEX "Annonce_dateDisponibilite_idx" ON "Annonce"("dateDisponibilite");

-- CreateIndex
CREATE INDEX "Annonce_active_dateDisponibilite_idx" ON "Annonce"("active", "dateDisponibilite");

-- CreateIndex
CREATE INDEX "Avis_transporteurId_idx" ON "Avis"("transporteurId");

-- CreateIndex
CREATE UNIQUE INDEX "Avis_auteurId_transporteurId_key" ON "Avis"("auteurId", "transporteurId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_cle_key" ON "Conversation"("cle");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_expediteurId_lu_idx" ON "Message"("conversationId", "expediteurId", "lu");

-- CreateIndex
CREATE INDEX "Message_expediteurId_idx" ON "Message"("expediteurId");

-- CreateIndex
CREATE UNIQUE INDEX "Abonnement_userId_key" ON "Abonnement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Abonnement_stripeCustomerId_key" ON "Abonnement"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Abonnement_stripeSubscriptionId_key" ON "Abonnement"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Besoin_latDepart_lngDepart_idx" ON "Besoin"("latDepart", "lngDepart");

-- CreateIndex
CREATE INDEX "Besoin_active_dateEnlevement_idx" ON "Besoin"("active", "dateEnlevement");

-- CreateIndex
CREATE INDEX "Alerte_userId_idx" ON "Alerte"("userId");

-- CreateIndex
CREATE INDEX "Alerte_actif_idx" ON "Alerte"("actif");

-- CreateIndex
CREATE UNIQUE INDEX "TokenEmail_tokenHash_key" ON "TokenEmail"("tokenHash");

-- CreateIndex
CREATE INDEX "TokenEmail_userId_type_idx" ON "TokenEmail"("userId", "type");

-- CreateIndex
CREATE INDEX "Signalement_statut_createdAt_idx" ON "Signalement"("statut", "createdAt");

-- CreateIndex
CREATE INDEX "Signalement_cibleId_idx" ON "Signalement"("cibleId");

-- CreateIndex
CREATE INDEX "JournalSecurite_type_createdAt_idx" ON "JournalSecurite"("type", "createdAt");

-- CreateIndex
CREATE INDEX "JournalSecurite_userId_createdAt_idx" ON "JournalSecurite"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "TransporteurProfil" ADD CONSTRAINT "TransporteurProfil_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionnaireProfil" ADD CONSTRAINT "CommissionnaireProfil_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicule" ADD CONSTRAINT "Vehicule_transporteurId_fkey" FOREIGN KEY ("transporteurId") REFERENCES "TransporteurProfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_transporteurId_fkey" FOREIGN KEY ("transporteurId") REFERENCES "TransporteurProfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_transporteurId_fkey" FOREIGN KEY ("transporteurId") REFERENCES "TransporteurProfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_expediteurId_fkey" FOREIGN KEY ("expediteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Besoin" ADD CONSTRAINT "Besoin_commissionnaireId_fkey" FOREIGN KEY ("commissionnaireId") REFERENCES "CommissionnaireProfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenEmail" ADD CONSTRAINT "TokenEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_signalantId_fkey" FOREIGN KEY ("signalantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_cibleId_fkey" FOREIGN KEY ("cibleId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

