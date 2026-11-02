-- AlterEnum
ALTER TYPE "TypeToken" ADD VALUE 'RENOUVELER_DISPONIBILITE';

-- AlterTable
ALTER TABLE "Alerte" ADD COLUMN     "departements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "villeDepart" DROP NOT NULL,
ALTER COLUMN "latDepart" DROP NOT NULL,
ALTER COLUMN "lngDepart" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Annonce" ADD COLUMN     "departementArrivee" TEXT,
ADD COLUMN     "departementDepart" TEXT,
ADD COLUMN     "inseeArrivee" TEXT,
ADD COLUMN     "inseeDepart" TEXT,
ADD COLUMN     "regionDepart" TEXT;

-- AlterTable
ALTER TABLE "TransporteurProfil" ADD COLUMN     "destinationDepartement" TEXT,
ADD COLUMN     "destinationInsee" TEXT,
ADD COLUMN     "destinationVille" TEXT,
ADD COLUMN     "disponibleJusqua" TIMESTAMP(3),
ADD COLUMN     "dureeDisponibiliteH" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "positionDepartement" TEXT,
ADD COLUMN     "positionInsee" TEXT,
ADD COLUMN     "positionRegion" TEXT,
ADD COLUMN     "positionVille" TEXT,
ADD COLUMN     "rappelDispoEnvoyeLe" TIMESTAMP(3),
ADD COLUMN     "rayonInterventionKm" INTEGER;

-- CreateTable
CREATE TABLE "Region" (
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Departement" (
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Departement_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "Departement_regionCode_idx" ON "Departement"("regionCode");

-- CreateIndex
CREATE INDEX "Annonce_departementDepart_active_idx" ON "Annonce"("departementDepart", "active");

-- CreateIndex
CREATE INDEX "Annonce_regionDepart_idx" ON "Annonce"("regionDepart");

-- CreateIndex
CREATE INDEX "TransporteurProfil_positionDepartement_disponible_derniereM_idx" ON "TransporteurProfil"("positionDepartement", "disponible", "derniereMAJ");

-- CreateIndex
CREATE INDEX "TransporteurProfil_positionRegion_idx" ON "TransporteurProfil"("positionRegion");

-- CreateIndex
CREATE INDEX "TransporteurProfil_disponibleJusqua_idx" ON "TransporteurProfil"("disponibleJusqua");

-- AddForeignKey
ALTER TABLE "Departement" ADD CONSTRAINT "Departement_regionCode_fkey" FOREIGN KEY ("regionCode") REFERENCES "Region"("code") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Référentiel géographique (source : API geo.api.gouv.fr ; centre d'un département = commune la plus proche du barycentre de ses communes)
INSERT INTO "Region" ("code", "nom") VALUES
  ('11', 'Île-de-France'),
  ('24', 'Centre-Val de Loire'),
  ('27', 'Bourgogne-Franche-Comté'),
  ('28', 'Normandie'),
  ('32', 'Hauts-de-France'),
  ('44', 'Grand Est'),
  ('52', 'Pays de la Loire'),
  ('53', 'Bretagne'),
  ('75', 'Nouvelle-Aquitaine'),
  ('76', 'Occitanie'),
  ('84', 'Auvergne-Rhône-Alpes'),
  ('93', 'Provence-Alpes-Côte d''Azur'),
  ('94', 'Corse'),
  ('01', 'Guadeloupe'),
  ('02', 'Martinique'),
  ('03', 'Guyane'),
  ('04', 'La Réunion'),
  ('06', 'Mayotte');

INSERT INTO "Departement" ("code", "nom", "regionCode", "latitude", "longitude") VALUES
  ('01', 'Ain', '84', 46.1063, 5.33),
  ('02', 'Aisne', '32', 49.5461, 3.5336),
  ('03', 'Allier', '84', 46.3429, 3.1786),
  ('04', 'Alpes-de-Haute-Provence', '93', 44.0632, 6.1413),
  ('05', 'Hautes-Alpes', '93', 44.5945, 6.1473),
  ('06', 'Alpes-Maritimes', '93', 43.8424, 7.0966),
  ('07', 'Ardèche', '84', 44.7887, 4.4519),
  ('08', 'Ardennes', '44', 49.6011, 4.6636),
  ('09', 'Ariège', '76', 42.9583, 1.5264),
  ('10', 'Aube', '44', 48.2889, 4.1823),
  ('11', 'Aude', '76', 43.1209, 2.3306),
  ('12', 'Aveyron', '76', 44.2871, 2.631),
  ('13', 'Bouches-du-Rhône', '93', 43.5541, 5.2051),
  ('14', 'Calvados', '28', 49.1556, -0.3262),
  ('15', 'Cantal', '84', 45.0198, 2.667),
  ('16', 'Charente', '75', 45.7167, 0.1321),
  ('17', 'Charente-Maritime', '75', 45.7462, -0.6456),
  ('18', 'Cher', '24', 47.0328, 2.4906),
  ('19', 'Corrèze', '75', 45.3013, 1.8339),
  ('21', 'Côte-d''Or', '27', 47.3729, 4.8055),
  ('22', 'Côtes-d''Armor', '53', 48.5036, -2.8472),
  ('23', 'Creuse', '75', 46.0917, 2.0241),
  ('24', 'Dordogne', '75', 45.0945, 0.732),
  ('25', 'Doubs', '27', 47.2204, 6.3596),
  ('26', 'Drôme', '84', 44.6782, 5.1448),
  ('27', 'Eure', '28', 49.1286, 0.9949),
  ('28', 'Eure-et-Loir', '24', 48.4424, 1.4073),
  ('29', 'Finistère', '53', 48.3028, -4.1422),
  ('2A', 'Corse-du-Sud', '94', 41.8838, 8.9819),
  ('2B', 'Haute-Corse', '94', 42.4254, 9.2732),
  ('30', 'Gard', '76', 44.0128, 4.1924),
  ('31', 'Haute-Garonne', '76', 43.3245, 1.1208),
  ('32', 'Gers', '76', 43.6819, 0.4814),
  ('33', 'Gironde', '75', 44.8209, -0.3452),
  ('34', 'Hérault', '76', 43.5907, 3.4096),
  ('35', 'Ille-et-Vilaine', '53', 48.1797, -1.6477),
  ('36', 'Indre', '24', 46.8109, 1.6203),
  ('37', 'Indre-et-Loire', '24', 47.2723, 0.6429),
  ('38', 'Isère', '84', 45.3295, 5.4939),
  ('39', 'Jura', '27', 46.7672, 5.6821),
  ('40', 'Landes', '75', 43.7927, -0.7195),
  ('41', 'Loir-et-Cher', '24', 47.6532, 1.3084),
  ('42', 'Loire', '84', 45.732, 4.2313),
  ('43', 'Haute-Loire', '84', 45.1355, 3.7553),
  ('44', 'Loire-Atlantique', '52', 47.317, -1.7198),
  ('45', 'Loiret', '24', 47.9535, 2.3604),
  ('46', 'Lot', '76', 44.6299, 1.6543),
  ('47', 'Lot-et-Garonne', '75', 44.4072, 0.4832),
  ('48', 'Lozère', '76', 44.5349, 3.4909),
  ('49', 'Maine-et-Loire', '52', 47.3819, -0.4986),
  ('50', 'Manche', '28', 49.1171, -1.3478),
  ('51', 'Marne', '44', 48.9619, 4.1744),
  ('52', 'Haute-Marne', '44', 48.0902, 5.2366),
  ('53', 'Mayenne', '52', 48.1293, -0.6556),
  ('54', 'Meurthe-et-Moselle', '44', 48.7909, 6.1672),
  ('55', 'Meuse', '44', 49.0235, 5.3986),
  ('56', 'Morbihan', '53', 47.8169, -2.8108),
  ('57', 'Moselle', '44', 49.0494, 6.64),
  ('58', 'Nièvre', '27', 47.1515, 3.4603),
  ('59', 'Nord', '32', 50.4128, 3.2482),
  ('60', 'Oise', '32', 49.4181, 2.4218),
  ('61', 'Orne', '28', 48.6117, 0.1089),
  ('62', 'Pas-de-Calais', '32', 50.4507, 2.3299),
  ('63', 'Puy-de-Dôme', '84', 45.742, 3.1885),
  ('64', 'Pyrénées-Atlantiques', '75', 43.2972, -0.6497),
  ('65', 'Hautes-Pyrénées', '76', 43.1261, 0.213),
  ('66', 'Pyrénées-Orientales', '76', 42.5904, 2.5528),
  ('67', 'Bas-Rhin', '44', 48.6841, 7.5636),
  ('68', 'Haut-Rhin', '44', 47.7843, 7.2812),
  ('69', 'Rhône', '84', 45.8673, 4.6685),
  ('70', 'Haute-Saône', '27', 47.6375, 6.1091),
  ('71', 'Saône-et-Loire', '27', 46.6224, 4.6256),
  ('72', 'Sarthe', '52', 48.0348, 0.2111),
  ('73', 'Savoie', '84', 45.5495, 6.1799),
  ('74', 'Haute-Savoie', '84', 46.0896, 6.2923),
  ('75', 'Paris', '11', 48.8589, 2.347),
  ('76', 'Seine-Maritime', '28', 49.6702, 0.9976),
  ('77', 'Seine-et-Marne', '11', 48.6595, 2.8978),
  ('78', 'Yvelines', '11', 48.8434, 1.8361),
  ('79', 'Deux-Sèvres', '75', 46.5245, -0.3216),
  ('80', 'Somme', '32', 49.9591, 2.3047),
  ('81', 'Tarn', '76', 43.7875, 2.1107),
  ('82', 'Tarn-et-Garonne', '76', 44.0417, 1.221),
  ('83', 'Var', '93', 43.4275, 6.2303),
  ('84', 'Vaucluse', '93', 44.0171, 5.1646),
  ('85', 'Vendée', '52', 46.6648, -1.2414),
  ('86', 'Vienne', '75', 46.6255, 0.4381),
  ('87', 'Haute-Vienne', '75', 45.8845, 1.2103),
  ('88', 'Vosges', '44', 48.2234, 6.3114),
  ('89', 'Yonne', '27', 47.8483, 3.5916),
  ('90', 'Territoire de Belfort', '27', 47.6268, 6.9303),
  ('91', 'Essonne', '11', 48.5472, 2.276),
  ('92', 'Hauts-de-Seine', '11', 48.8375, 2.2429),
  ('93', 'Seine-Saint-Denis', '11', 48.9036, 2.4846),
  ('94', 'Val-de-Marne', '11', 48.7845, 2.4523),
  ('95', 'Val-d''Oise', '11', 49.0847, 2.1569),
  ('971', 'Guadeloupe', '01', 16.1231, -61.615),
  ('972', 'Martinique', '02', 14.6835, -61.0407),
  ('973', 'Guyane', '03', 4.4853, -53.1108),
  ('974', 'La Réunion', '04', -21.1403, 55.4555),
  ('976', 'Mayotte', '06', -12.8393, 45.1384);
