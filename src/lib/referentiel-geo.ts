// Référentiel géographique : régions et départements (métropole, Corse 2A/2B, outre-mer).
// Source : API officielle geo.api.gouv.fr. Doit rester identique aux tables Region / Departement (migration « position_zones »).
// latitude/longitude d'un département = commune la plus proche du barycentre de ses communes (placement des bulles de la carte).

export interface Region {
  code: string
  nom: string
}

export interface Departement {
  code: string
  nom: string
  region: string
  latitude: number
  longitude: number
}

export const REGIONS: readonly Region[] = [
  { code: "11", nom: "Île-de-France" },
  { code: "24", nom: "Centre-Val de Loire" },
  { code: "27", nom: "Bourgogne-Franche-Comté" },
  { code: "28", nom: "Normandie" },
  { code: "32", nom: "Hauts-de-France" },
  { code: "44", nom: "Grand Est" },
  { code: "52", nom: "Pays de la Loire" },
  { code: "53", nom: "Bretagne" },
  { code: "75", nom: "Nouvelle-Aquitaine" },
  { code: "76", nom: "Occitanie" },
  { code: "84", nom: "Auvergne-Rhône-Alpes" },
  { code: "93", nom: "Provence-Alpes-Côte d'Azur" },
  { code: "94", nom: "Corse" },
  { code: "01", nom: "Guadeloupe" },
  { code: "02", nom: "Martinique" },
  { code: "03", nom: "Guyane" },
  { code: "04", nom: "La Réunion" },
  { code: "06", nom: "Mayotte" },
] as const

export const DEPARTEMENTS: readonly Departement[] = [
  { code: "01", nom: "Ain", region: "84", latitude: 46.1063, longitude: 5.33 },
  { code: "02", nom: "Aisne", region: "32", latitude: 49.5461, longitude: 3.5336 },
  { code: "03", nom: "Allier", region: "84", latitude: 46.3429, longitude: 3.1786 },
  { code: "04", nom: "Alpes-de-Haute-Provence", region: "93", latitude: 44.0632, longitude: 6.1413 },
  { code: "05", nom: "Hautes-Alpes", region: "93", latitude: 44.5945, longitude: 6.1473 },
  { code: "06", nom: "Alpes-Maritimes", region: "93", latitude: 43.8424, longitude: 7.0966 },
  { code: "07", nom: "Ardèche", region: "84", latitude: 44.7887, longitude: 4.4519 },
  { code: "08", nom: "Ardennes", region: "44", latitude: 49.6011, longitude: 4.6636 },
  { code: "09", nom: "Ariège", region: "76", latitude: 42.9583, longitude: 1.5264 },
  { code: "10", nom: "Aube", region: "44", latitude: 48.2889, longitude: 4.1823 },
  { code: "11", nom: "Aude", region: "76", latitude: 43.1209, longitude: 2.3306 },
  { code: "12", nom: "Aveyron", region: "76", latitude: 44.2871, longitude: 2.631 },
  { code: "13", nom: "Bouches-du-Rhône", region: "93", latitude: 43.5541, longitude: 5.2051 },
  { code: "14", nom: "Calvados", region: "28", latitude: 49.1556, longitude: -0.3262 },
  { code: "15", nom: "Cantal", region: "84", latitude: 45.0198, longitude: 2.667 },
  { code: "16", nom: "Charente", region: "75", latitude: 45.7167, longitude: 0.1321 },
  { code: "17", nom: "Charente-Maritime", region: "75", latitude: 45.7462, longitude: -0.6456 },
  { code: "18", nom: "Cher", region: "24", latitude: 47.0328, longitude: 2.4906 },
  { code: "19", nom: "Corrèze", region: "75", latitude: 45.3013, longitude: 1.8339 },
  { code: "21", nom: "Côte-d'Or", region: "27", latitude: 47.3729, longitude: 4.8055 },
  { code: "22", nom: "Côtes-d'Armor", region: "53", latitude: 48.5036, longitude: -2.8472 },
  { code: "23", nom: "Creuse", region: "75", latitude: 46.0917, longitude: 2.0241 },
  { code: "24", nom: "Dordogne", region: "75", latitude: 45.0945, longitude: 0.732 },
  { code: "25", nom: "Doubs", region: "27", latitude: 47.2204, longitude: 6.3596 },
  { code: "26", nom: "Drôme", region: "84", latitude: 44.6782, longitude: 5.1448 },
  { code: "27", nom: "Eure", region: "28", latitude: 49.1286, longitude: 0.9949 },
  { code: "28", nom: "Eure-et-Loir", region: "24", latitude: 48.4424, longitude: 1.4073 },
  { code: "29", nom: "Finistère", region: "53", latitude: 48.3028, longitude: -4.1422 },
  { code: "2A", nom: "Corse-du-Sud", region: "94", latitude: 41.8838, longitude: 8.9819 },
  { code: "2B", nom: "Haute-Corse", region: "94", latitude: 42.4254, longitude: 9.2732 },
  { code: "30", nom: "Gard", region: "76", latitude: 44.0128, longitude: 4.1924 },
  { code: "31", nom: "Haute-Garonne", region: "76", latitude: 43.3245, longitude: 1.1208 },
  { code: "32", nom: "Gers", region: "76", latitude: 43.6819, longitude: 0.4814 },
  { code: "33", nom: "Gironde", region: "75", latitude: 44.8209, longitude: -0.3452 },
  { code: "34", nom: "Hérault", region: "76", latitude: 43.5907, longitude: 3.4096 },
  { code: "35", nom: "Ille-et-Vilaine", region: "53", latitude: 48.1797, longitude: -1.6477 },
  { code: "36", nom: "Indre", region: "24", latitude: 46.8109, longitude: 1.6203 },
  { code: "37", nom: "Indre-et-Loire", region: "24", latitude: 47.2723, longitude: 0.6429 },
  { code: "38", nom: "Isère", region: "84", latitude: 45.3295, longitude: 5.4939 },
  { code: "39", nom: "Jura", region: "27", latitude: 46.7672, longitude: 5.6821 },
  { code: "40", nom: "Landes", region: "75", latitude: 43.7927, longitude: -0.7195 },
  { code: "41", nom: "Loir-et-Cher", region: "24", latitude: 47.6532, longitude: 1.3084 },
  { code: "42", nom: "Loire", region: "84", latitude: 45.732, longitude: 4.2313 },
  { code: "43", nom: "Haute-Loire", region: "84", latitude: 45.1355, longitude: 3.7553 },
  { code: "44", nom: "Loire-Atlantique", region: "52", latitude: 47.317, longitude: -1.7198 },
  { code: "45", nom: "Loiret", region: "24", latitude: 47.9535, longitude: 2.3604 },
  { code: "46", nom: "Lot", region: "76", latitude: 44.6299, longitude: 1.6543 },
  { code: "47", nom: "Lot-et-Garonne", region: "75", latitude: 44.4072, longitude: 0.4832 },
  { code: "48", nom: "Lozère", region: "76", latitude: 44.5349, longitude: 3.4909 },
  { code: "49", nom: "Maine-et-Loire", region: "52", latitude: 47.3819, longitude: -0.4986 },
  { code: "50", nom: "Manche", region: "28", latitude: 49.1171, longitude: -1.3478 },
  { code: "51", nom: "Marne", region: "44", latitude: 48.9619, longitude: 4.1744 },
  { code: "52", nom: "Haute-Marne", region: "44", latitude: 48.0902, longitude: 5.2366 },
  { code: "53", nom: "Mayenne", region: "52", latitude: 48.1293, longitude: -0.6556 },
  { code: "54", nom: "Meurthe-et-Moselle", region: "44", latitude: 48.7909, longitude: 6.1672 },
  { code: "55", nom: "Meuse", region: "44", latitude: 49.0235, longitude: 5.3986 },
  { code: "56", nom: "Morbihan", region: "53", latitude: 47.8169, longitude: -2.8108 },
  { code: "57", nom: "Moselle", region: "44", latitude: 49.0494, longitude: 6.64 },
  { code: "58", nom: "Nièvre", region: "27", latitude: 47.1515, longitude: 3.4603 },
  { code: "59", nom: "Nord", region: "32", latitude: 50.4128, longitude: 3.2482 },
  { code: "60", nom: "Oise", region: "32", latitude: 49.4181, longitude: 2.4218 },
  { code: "61", nom: "Orne", region: "28", latitude: 48.6117, longitude: 0.1089 },
  { code: "62", nom: "Pas-de-Calais", region: "32", latitude: 50.4507, longitude: 2.3299 },
  { code: "63", nom: "Puy-de-Dôme", region: "84", latitude: 45.742, longitude: 3.1885 },
  { code: "64", nom: "Pyrénées-Atlantiques", region: "75", latitude: 43.2972, longitude: -0.6497 },
  { code: "65", nom: "Hautes-Pyrénées", region: "76", latitude: 43.1261, longitude: 0.213 },
  { code: "66", nom: "Pyrénées-Orientales", region: "76", latitude: 42.5904, longitude: 2.5528 },
  { code: "67", nom: "Bas-Rhin", region: "44", latitude: 48.6841, longitude: 7.5636 },
  { code: "68", nom: "Haut-Rhin", region: "44", latitude: 47.7843, longitude: 7.2812 },
  { code: "69", nom: "Rhône", region: "84", latitude: 45.8673, longitude: 4.6685 },
  { code: "70", nom: "Haute-Saône", region: "27", latitude: 47.6375, longitude: 6.1091 },
  { code: "71", nom: "Saône-et-Loire", region: "27", latitude: 46.6224, longitude: 4.6256 },
  { code: "72", nom: "Sarthe", region: "52", latitude: 48.0348, longitude: 0.2111 },
  { code: "73", nom: "Savoie", region: "84", latitude: 45.5495, longitude: 6.1799 },
  { code: "74", nom: "Haute-Savoie", region: "84", latitude: 46.0896, longitude: 6.2923 },
  { code: "75", nom: "Paris", region: "11", latitude: 48.8589, longitude: 2.347 },
  { code: "76", nom: "Seine-Maritime", region: "28", latitude: 49.6702, longitude: 0.9976 },
  { code: "77", nom: "Seine-et-Marne", region: "11", latitude: 48.6595, longitude: 2.8978 },
  { code: "78", nom: "Yvelines", region: "11", latitude: 48.8434, longitude: 1.8361 },
  { code: "79", nom: "Deux-Sèvres", region: "75", latitude: 46.5245, longitude: -0.3216 },
  { code: "80", nom: "Somme", region: "32", latitude: 49.9591, longitude: 2.3047 },
  { code: "81", nom: "Tarn", region: "76", latitude: 43.7875, longitude: 2.1107 },
  { code: "82", nom: "Tarn-et-Garonne", region: "76", latitude: 44.0417, longitude: 1.221 },
  { code: "83", nom: "Var", region: "93", latitude: 43.4275, longitude: 6.2303 },
  { code: "84", nom: "Vaucluse", region: "93", latitude: 44.0171, longitude: 5.1646 },
  { code: "85", nom: "Vendée", region: "52", latitude: 46.6648, longitude: -1.2414 },
  { code: "86", nom: "Vienne", region: "75", latitude: 46.6255, longitude: 0.4381 },
  { code: "87", nom: "Haute-Vienne", region: "75", latitude: 45.8845, longitude: 1.2103 },
  { code: "88", nom: "Vosges", region: "44", latitude: 48.2234, longitude: 6.3114 },
  { code: "89", nom: "Yonne", region: "27", latitude: 47.8483, longitude: 3.5916 },
  { code: "90", nom: "Territoire de Belfort", region: "27", latitude: 47.6268, longitude: 6.9303 },
  { code: "91", nom: "Essonne", region: "11", latitude: 48.5472, longitude: 2.276 },
  { code: "92", nom: "Hauts-de-Seine", region: "11", latitude: 48.8375, longitude: 2.2429 },
  { code: "93", nom: "Seine-Saint-Denis", region: "11", latitude: 48.9036, longitude: 2.4846 },
  { code: "94", nom: "Val-de-Marne", region: "11", latitude: 48.7845, longitude: 2.4523 },
  { code: "95", nom: "Val-d'Oise", region: "11", latitude: 49.0847, longitude: 2.1569 },
  { code: "971", nom: "Guadeloupe", region: "01", latitude: 16.1231, longitude: -61.615 },
  { code: "972", nom: "Martinique", region: "02", latitude: 14.6835, longitude: -61.0407 },
  { code: "973", nom: "Guyane", region: "03", latitude: 4.4853, longitude: -53.1108 },
  { code: "974", nom: "La Réunion", region: "04", latitude: -21.1403, longitude: 55.4555 },
  { code: "976", nom: "Mayotte", region: "06", latitude: -12.8393, longitude: 45.1384 },
] as const

const PAR_CODE = new Map(DEPARTEMENTS.map((d) => [d.code, d]))
const REGION_PAR_CODE = new Map(REGIONS.map((r) => [r.code, r]))

export const departement = (code: string | null | undefined): Departement | undefined => (code ? PAR_CODE.get(code) : undefined)
export const region = (code: string | null | undefined): Region | undefined => (code ? REGION_PAR_CODE.get(code) : undefined)
export const departementExiste = (code: string): boolean => PAR_CODE.has(code)
export const regionExiste = (code: string): boolean => REGION_PAR_CODE.has(code)

/** Départements d'une région. */
export const departementsDeLaRegion = (codeRegion: string): string[] => DEPARTEMENTS.filter((d) => d.region === codeRegion).map((d) => d.code)

/** « Moselle (57) » ; le code seul si le département est inconnu. */
export function libelleDepartement(code: string | null | undefined): string {
  const d = departement(code)
  return d ? `${d.nom} (${d.code})` : (code ?? '')
}

/** « Metz, Moselle (57) » ; la commune seule si le département est inconnu. */
export function libelleLieu(ville: string | null | undefined, codeDepartement: string | null | undefined): string {
  const dep = codeDepartement ? libelleDepartement(codeDepartement) : ''
  return [ville, dep].filter(Boolean).join(', ')
}

/**
 * Département déduit du code INSEE d'une commune : 2 premiers caractères en métropole (dont « 2A » et « 2B » pour la Corse),
 * 3 en outre-mer (« 971 »…). Sert de contrôle de cohérence avec la réponse de l'API officielle.
 */
export function departementDepuisInsee(insee: string): string | null {
  if (!/^(\d{5}|2[AB]\d{3})$/.test(insee)) return null
  return insee.startsWith('97') ? insee.slice(0, 3) : insee.slice(0, 2)
}
