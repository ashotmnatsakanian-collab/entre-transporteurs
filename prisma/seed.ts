import { PrismaClient, Role, TypeVehicule, Specificite, StatutAbonnement } from '@prisma/client'
import { hash } from 'bcryptjs'
import { addDays } from 'date-fns'

const db = new PrismaClient()

const MOT_DE_PASSE = 'Password123!'

const TRANSPORTEURS = [
  { nom: 'Jean Dupont', email: 'jean.dupont@dupont-transport.fr', tel: '0601020304', siret: '12345678900001', rs: 'SARL Dupont Transport', lat: 48.8566, lng: 2.3522, zones: ['75', '77', '78', '91', '92', '93', '94', '95'], dispo: true, desc: 'Spécialiste du transport régional parisien depuis 15 ans.' },
  { nom: 'Marie Brossard', email: 'marie@brossard-logistique.fr', tel: '0602030405', siret: '23456789000012', rs: 'Brossard Logistique', lat: 45.7640, lng: 4.8357, zones: ['69', '01', '38', '42', '71'], dispo: false, desc: 'Transport frigorifique et température dirigée, région Auvergne-Rhône-Alpes.' },
  { nom: 'Pierre Martin', email: 'pierre@transport-med.fr', tel: '0603040506', siret: '34567890100023', rs: 'Transport Méditerranée SAS', lat: 43.2965, lng: 5.3698, zones: ['13', '83', '84', '04', '05'], dispo: true, desc: 'Réseau PACA et Corse. ADR certifié.' },
  { nom: 'Sophie Gironde', email: 'sophie@gironde-express.fr', tel: '0604050607', siret: '45678901200034', rs: 'Gironde Express SARL', lat: 44.8378, lng: -0.5792, zones: ['33', '40', '47', '64', '17'], dispo: true, desc: 'Transport de vins et spiritueux, Nouvelle-Aquitaine.' },
  { nom: 'Paul Occitan', email: 'paul@occitane-fret.fr', tel: '0605060708', siret: '56789012300045', rs: 'Occitane Fret', lat: 43.6047, lng: 1.4442, zones: ['31', '32', '81', '82', '46', '12'], dispo: false, desc: 'Transports agricoles et industriels en Occitanie.' },
  { nom: 'Anne Loire', email: 'anne@loire-transport.fr', tel: '0606070809', siret: '67890123400056', rs: 'Loire Atlantic Transport', lat: 47.2184, lng: -1.5536, zones: ['44', '85', '49', '53', '72'], dispo: true, desc: 'Expert en transport de matériaux de construction.' },
  { nom: 'Marc Flandres', email: 'marc@nord-fret.fr', tel: '0607080910', siret: '78901234500067', rs: 'Nord Fret SARL', lat: 50.6292, lng: 3.0573, zones: ['59', '62', '02', '80'], dispo: true, desc: 'Transport express et messagerie, Hauts-de-France.' },
  { nom: 'Hélène Rhin', email: 'helene@rhin-transport.fr', tel: '0608091011', siret: '89012345600078', rs: 'Rhin Transport SAS', lat: 48.5734, lng: 7.7521, zones: ['67', '68', '57', '54', '88'], dispo: false, desc: 'Transport international franco-allemand, Alsace-Lorraine.' },
  { nom: 'Thierry Breton', email: 'thierry@bretagne-cargo.fr', tel: '0609101112', siret: '90123456700089', rs: 'Bretagne Cargo', lat: 48.1173, lng: -1.6778, zones: ['35', '22', '29', '56'], dispo: true, desc: 'Spécialiste transport maritime-terrestre, Bretagne.' },
  { nom: 'Céline Hérault', email: 'celine@herault-express.fr', tel: '0610111213', siret: '01234567800090', rs: 'Hérault Express', lat: 43.6108, lng: 3.8767, zones: ['34', '30', '11', '66', '48'], dispo: false, desc: 'Transport frigorifique et produits frais, Languedoc.' },
]

const VEHICULES: Record<string, Array<{
  type: TypeVehicule; specs: Specificite[]; l?: number; la?: number; h?: number; cu: number; immat?: string
}>> = {
  'jean.dupont@dupont-transport.fr': [
    { type: 'PORTEUR', specs: ['HAYON', 'BACHE'], l: 1320, la: 245, h: 270, cu: 12000, immat: 'AB-123-CD' },
    { type: 'VL', specs: ['HAYON'], l: 420, la: 195, h: 200, cu: 1500, immat: 'EF-456-GH' },
    { type: 'SEMI', specs: ['FRIGORIFIQUE', 'ADR'], l: 1360, la: 248, h: 270, cu: 24000, immat: 'IJ-789-KL' },
  ],
  'marie@brossard-logistique.fr': [
    { type: 'PORTEUR', specs: ['FRIGORIFIQUE'], l: 850, la: 240, h: 260, cu: 7500, immat: 'MN-012-OP' },
    { type: 'SEMI', specs: ['FRIGORIFIQUE', 'DOUBLE_PLANCHER'], l: 1360, la: 248, h: 300, cu: 20000, immat: 'QR-345-ST' },
    { type: 'FOURGON', specs: ['FRIGORIFIQUE'], l: 420, la: 195, h: 210, cu: 1200, immat: 'UV-678-WX' },
  ],
  'pierre@transport-med.fr': [
    { type: 'SEMI', specs: ['ADR', 'BACHE'], l: 1360, la: 248, h: 270, cu: 25000, immat: 'YZ-901-AB' },
    { type: 'CITERNE', specs: ['ADR'], cu: 30000, immat: 'CD-234-EF' },
    { type: 'PORTEUR', specs: ['PLATEAU', 'GRUE'], l: 720, la: 240, h: 0, cu: 10000, immat: 'GH-567-IJ' },
  ],
  'sophie@gironde-express.fr': [
    { type: 'VL', specs: ['FRIGORIFIQUE'], l: 420, la: 195, h: 210, cu: 1000, immat: 'KL-890-MN' },
    { type: 'PORTEUR', specs: ['FRIGORIFIQUE', 'HAYON'], l: 850, la: 240, h: 260, cu: 8000, immat: 'OP-123-QR' },
    { type: 'SEMI', specs: ['FRIGORIFIQUE'], l: 1360, la: 248, h: 270, cu: 22000, immat: 'ST-456-UV' },
  ],
  'paul@occitane-fret.fr': [
    { type: 'BENNE', specs: [], cu: 20000, immat: 'WX-789-YZ' },
    { type: 'PLATEAU', specs: ['GRUE', 'AMPLIROLL'], l: 1360, la: 248, h: 0, cu: 28000, immat: 'AB-012-CD' },
    { type: 'PORTEUR', specs: ['BACHE', 'HAYON'], l: 1320, la: 245, h: 270, cu: 14000, immat: 'EF-345-GH' },
  ],
  'anne@loire-transport.fr': [
    { type: 'BENNE', specs: [], cu: 18000, immat: 'IJ-678-KL' },
    { type: 'PORTEUR', specs: ['HAYON', 'PLATEAU'], l: 720, la: 240, h: 0, cu: 9000, immat: 'MN-901-OP' },
    { type: 'FOURGON', specs: ['HAYON'], l: 360, la: 185, h: 195, cu: 900, immat: 'QR-234-ST' },
  ],
  'marc@nord-fret.fr': [
    { type: 'SEMI', specs: ['SAVOYARDE', 'MEGA'], l: 1360, la: 248, h: 300, cu: 24000, immat: 'UV-567-WX' },
    { type: 'PORTEUR', specs: ['BACHE'], l: 1320, la: 245, h: 270, cu: 13000, immat: 'YZ-890-AB' },
    { type: 'VL', specs: [], l: 360, la: 185, h: 195, cu: 800, immat: 'CD-123-EF' },
  ],
  'helene@rhin-transport.fr': [
    { type: 'SEMI', specs: ['BACHE', 'CAISSE_MOBILE'], l: 1360, la: 248, h: 270, cu: 24000, immat: 'GH-456-IJ' },
    { type: 'SEMI', specs: ['VEHICULE_ACCOMPAGNE'], l: 1360, la: 248, h: 270, cu: 22000, immat: 'KL-789-MN' },
  ],
  'thierry@bretagne-cargo.fr': [
    { type: 'PORTEUR', specs: ['HAYON', 'BACHE'], l: 1320, la: 245, h: 270, cu: 12000, immat: 'OP-012-QR' },
    { type: 'SEMI', specs: ['BACHE'], l: 1360, la: 248, h: 270, cu: 24000, immat: 'ST-345-UV' },
    { type: 'FOURGON', specs: [], l: 360, la: 185, h: 195, cu: 700, immat: 'WX-678-YZ' },
  ],
  'celine@herault-express.fr': [
    { type: 'PORTEUR', specs: ['FRIGORIFIQUE', 'HAYON'], l: 850, la: 240, h: 260, cu: 7000, immat: 'AB-901-CD' },
    { type: 'SEMI', specs: ['FRIGORIFIQUE'], l: 1360, la: 248, h: 270, cu: 21000, immat: 'EF-234-GH' },
    { type: 'VL', specs: ['FRIGORIFIQUE'], l: 360, la: 185, h: 195, cu: 900, immat: 'IJ-567-KL' },
  ],
}

const COMMISSIONNAIRES = [
  { nom: 'François Leroy', email: 'francois@tlf-paris.fr', tel: '0611121314', siret: '11111111100011', rs: 'TLF Paris SAS' },
  { nom: 'Isabelle Dupuis', email: 'isabelle@groupe-fret.fr', tel: '0612131415', siret: '22222222200022', rs: 'Groupe Fret Lyon' },
  { nom: 'Robert Blanc', email: 'robert@trans-euro.fr', tel: '0613141516', siret: '33333333300033', rs: 'Trans-Euro Marseille' },
  { nom: 'Nathalie Petit', email: 'nathalie@logipro.fr', tel: '0614151617', siret: '44444444400044', rs: 'Logipro Bordeaux' },
  { nom: 'Laurent Grand', email: 'laurent@nexlog.fr', tel: '0615161718', siret: '55555555500055', rs: 'Nexlog Lille' },
]

async function main() {
  console.log('🌱 Début du seed...')
  const mdp = await hash(MOT_DE_PASSE, 12)
  const trial = addDays(new Date(), 30)

  // ── Transporteurs ────────────────────────────────────────────────────────────
  for (const t of TRANSPORTEURS) {
    const user = await db.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        password: mdp,
        nom: t.nom,
        telephone: t.tel,
        role: Role.TRANSPORTEUR,
        verifie: true,
        abonnement: {
          create: {
            statut: StatutAbonnement.TRIALING,
            dateFinEssai: trial,
          },
        },
        transporteurProfil: {
          create: {
            siret: t.siret,
            raisonSociale: t.rs,
            description: t.desc,
            latitude: t.lat,
            longitude: t.lng,
            zonesCirculation: t.zones,
            disponible: t.dispo,
          },
        },
      },
      include: { transporteurProfil: true },
    })

    const profil = user.transporteurProfil!
    const vehiculesData = VEHICULES[t.email] ?? []
    for (const v of vehiculesData) {
      await db.vehicule.upsert({
        where: { id: `seed-${v.immat}` },
        update: {},
        create: {
          id: `seed-${v.immat}`,
          transporteurId: profil.id,
          type: v.type,
          specificites: v.specs,
          longueur: v.l,
          largeur: v.la,
          hauteur: v.h,
          chargeUtile: v.cu,
          immatriculation: v.immat,
        },
      })
    }
    console.log(`  ✓ Transporteur : ${t.rs}`)
  }

  // ── Commissionnaires ─────────────────────────────────────────────────────────
  for (const c of COMMISSIONNAIRES) {
    await db.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        password: mdp,
        nom: c.nom,
        telephone: c.tel,
        role: Role.COMMISSIONNAIRE,
        verifie: true,
        abonnement: {
          create: {
            statut: StatutAbonnement.TRIALING,
            dateFinEssai: trial,
          },
        },
        commissionnaireProfil: {
          create: {
            siret: c.siret,
            raisonSociale: c.rs,
          },
        },
      },
    })
    console.log(`  ✓ Commissionnaire : ${c.rs}`)
  }

  // ── Conversations de démonstration ───────────────────────────────────────────
  const franco = await db.user.findUnique({ where: { email: 'francois@tlf-paris.fr' } })
  const jean = await db.user.findUnique({ where: { email: 'jean.dupont@dupont-transport.fr' } })
  const isabelle = await db.user.findUnique({ where: { email: 'isabelle@groupe-fret.fr' } })
  const marie = await db.user.findUnique({ where: { email: 'marie@brossard-logistique.fr' } })

  if (franco && jean) {
    const conv1 = await db.conversation.create({
      data: {
        participants: {
          create: [{ userId: franco.id }, { userId: jean.id }],
        },
      },
    })
    await db.message.createMany({
      data: [
        { conversationId: conv1.id, expediteurId: franco.id, contenu: 'Bonjour, avez-vous un 38T disponible la semaine prochaine pour un Paris-Marseille ?', lu: true },
        { conversationId: conv1.id, expediteurId: jean.id, contenu: 'Bonjour François ! Oui, j\'ai un semi disponible mardi. Quelle marchandise ?', lu: true },
        { conversationId: conv1.id, expediteurId: franco.id, contenu: 'Électroménager, 18 palettes, 22 tonnes. Quelle disponibilité le mardi 18 ?', lu: false },
      ],
    })
    console.log('  ✓ Conversation 1 : TLF Paris ↔ Dupont Transport')
  }

  if (isabelle && marie) {
    const conv2 = await db.conversation.create({
      data: {
        participants: {
          create: [{ userId: isabelle.id }, { userId: marie.id }],
        },
      },
    })
    await db.message.createMany({
      data: [
        { conversationId: conv2.id, expediteurId: isabelle.id, contenu: 'Bonjour Marie, nous cherchons un frigo pour Lyon-Paris, départ jeudi matin.', lu: true },
        { conversationId: conv2.id, expediteurId: marie.id, contenu: 'Bonjour Isabelle ! Je peux assurer ce transport. Quel volume et température ?', lu: false },
      ],
    })
    console.log('  ✓ Conversation 2 : Groupe Fret Lyon ↔ Brossard Logistique')
  }

  console.log('\n✅ Seed terminé. Tous les comptes ont le mot de passe : Password123!')
  console.log('📧 Exemples de comptes :')
  console.log('   Transporteur  : jean.dupont@dupont-transport.fr')
  console.log('   Commissionnaire: francois@tlf-paris.fr')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
