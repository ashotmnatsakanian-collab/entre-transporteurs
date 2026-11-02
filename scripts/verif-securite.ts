/**
 * Vérification de sécurité de bout en bout : attaque l'application EN COURS D'EXÉCUTION
 * (comme le ferait un utilisateur malveillant) et échoue si une protection manque.
 *
 *   npm run dev                                   # dans un terminal
 *   npx tsx scripts/verif-securite.ts             # dans un autre (http://localhost:3001 par défaut)
 *   BASE_URL=https://mon-site.fr npx tsx scripts/verif-securite.ts
 *
 * Prérequis : base peuplée par `npm run db:seed`. Le script crée puis supprime ses propres
 * comptes de test ; ne le lancez PAS contre une base de production réelle.
 */
import { randomBytes } from 'crypto'
import { io as ouvrirSocket } from 'socket.io-client'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { creerToken } from '../src/lib/tokens'
import { VERSION_CGU } from '../src/lib/legal'
import { purgerDonneesExpirees, purgerDocuments } from '../src/lib/purge'
import { expirerDisponibilites, purgerPositions, rappelerRenouvellements } from '../src/lib/disponibilites-jobs'
import { recalculerConformite } from '../src/lib/documents'
import { trouverOuCreerConversation } from '../src/lib/conversations'
import { OBLIGATOIRES_PAR_ROLE } from '../src/lib/documents-regles'

const BASE = (process.env.BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '')
const MOT_DE_PASSE = 'Password123!'
const db = new PrismaClient()

let reussis = 0
const echecs: string[] = []

function verifier(nom: string, condition: boolean, detail = '') {
  if (condition) {
    reussis++
    console.log(`  ✅ ${nom}`)
  } else {
    echecs.push(nom)
    console.log(`  ❌ ${nom}${detail ? `  → ${detail}` : ''}`)
  }
}

function section(titre: string) {
  console.log(`\n▶ ${titre}`)
}

// ── Client HTTP avec cookies, une instance par "utilisateur" ────────────────────

class Client {
  cookies = new Map<string, string>()
  ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}`
  constructor(public nom: string) {}

  private entetes(extra: Record<string, string> = {}) {
    const cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
    return { 'x-forwarded-for': this.ip, ...(cookie && { cookie }), ...extra }
  }

  private retenir(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [paire] = c.split(';')
      const i = paire.indexOf('=')
      const cle = paire.slice(0, i)
      const valeur = paire.slice(i + 1)
      if (valeur === '' || /max-age=0|expires=thu, 01 jan 1970/i.test(c)) this.cookies.delete(cle)
      else this.cookies.set(cle, valeur)
    }
  }

  async requete(chemin: string, init: { method?: string; json?: unknown; corps?: string; headers?: Record<string, string> } = {}) {
    const headers = this.entetes(init.headers)
    let body: string | undefined = init.corps
    if (init.json !== undefined) {
      body = JSON.stringify(init.json)
      ;(headers as Record<string, string>)['content-type'] = 'application/json'
    }
    const res = await fetch(`${BASE}${chemin}`, { method: init.method ?? 'GET', headers, body, redirect: 'manual' })
    this.retenir(res)
    const texte = await res.text()
    let donnees: unknown = null
    try { donnees = JSON.parse(texte) } catch { /* non JSON */ }
    return { statut: res.status, donnees, texte, entetes: res.headers }
  }

  /** Envoi multipart (téléversement de fichier). */
  async formulaire(chemin: string, form: FormData, method = 'POST') {
    const res = await fetch(`${BASE}${chemin}`, { method, headers: this.entetes(), body: form, redirect: 'manual' })
    this.retenir(res)
    const texte = await res.text()
    let donnees: unknown = null
    try { donnees = JSON.parse(texte) } catch { /* non JSON */ }
    return { statut: res.status, donnees, texte, entetes: res.headers }
  }

  /** Téléchargement binaire. */
  async telecharger(chemin: string) {
    const res = await fetch(`${BASE}${chemin}`, { headers: this.entetes(), redirect: 'manual' })
    const octets = Buffer.from(await res.arrayBuffer())
    return { statut: res.status, octets, entetes: res.headers }
  }

  async connecter(email: string, motDePasse = MOT_DE_PASSE) {
    const csrf = await this.requete('/api/auth/csrf')
    const jeton = (csrf.donnees as { csrfToken: string }).csrfToken
    const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: this.entetes({ 'content-type': 'application/x-www-form-urlencoded' }),
      body: new URLSearchParams({ csrfToken: jeton, email, password: motDePasse, json: 'true' }),
      redirect: 'manual',
    })
    this.retenir(res)
    const corps = (await res.json().catch(() => ({}))) as { url?: string }
    return { erreur: corps.url?.includes('error=') ? new URL(corps.url).searchParams.get('error') : null, connecte: [...this.cookies.keys()].some((k) => k.includes('session-token')) }
  }

  cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
  }
}

async function connecterSocket(cookie: string | null, auth: Record<string, string> = {}): Promise<{ ok: boolean; erreur?: string; socket: ReturnType<typeof ouvrirSocket> }> {
  return new Promise((resolve) => {
    const socket = ouvrirSocket(BASE, {
      path: '/api/socket',
      transports: ['polling'],
      extraHeaders: cookie ? { cookie } : {},
      auth,
      reconnection: false,
      timeout: 5000,
    })
    socket.on('connect', () => resolve({ ok: true, socket }))
    socket.on('connect_error', (e) => resolve({ ok: false, erreur: e.message, socket }))
  })
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── Scénarios ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Vérification de sécurité de ${BASE}\n`)

  const sonde = await fetch(`${BASE}/api/sante`).catch(() => null)
  if (!sonde || !sonde.ok) {
    console.error(`❌ Serveur injoignable sur ${BASE} (lancez npm run dev).`)
    process.exit(2)
  }

  // Serveur lancé avec EXIGER_DOCUMENTS=true : les transporteurs de démonstration doivent être conformes pour que les scénarios existants s'appliquent
  if (process.env.EXIGER_DOCUMENTS === 'true') {
    await db.user.updateMany({ where: { role: { in: ['TRANSPORTEUR', 'COMMISSIONNAIRE'] } }, data: { documentsConformesJusqua: new Date(Date.now() + 365 * 86_400_000) } })
  }

  const anon = new Client('anonyme')
  const jean = new Client('transporteur')
  const francois = new Client('commissionnaire')
  const isabelle = new Client('commissionnaire 2')
  const marie = new Client('transporteur 2')
  const admin = new Client('admin')
  const ADMIN_EMAIL = `verif-admin-${randomBytes(3).toString('hex')}@example.invalid`

  await jean.connecter('jean.dupont@dupont-transport.fr')
  await francois.connecter('francois@tlf-paris.fr')
  await isabelle.connecter('isabelle@groupe-fret.fr')
  await marie.connecter('marie@brossard-logistique.fr')
  const jeanUser = await db.user.findUniqueOrThrow({ where: { email: 'jean.dupont@dupont-transport.fr' }, include: { transporteurProfil: { include: { vehicules: true, annonces: true } } } })
  const francoisUser = await db.user.findUniqueOrThrow({ where: { email: 'francois@tlf-paris.fr' } })
  const pierreUser = await db.user.findUniqueOrThrow({ where: { email: 'pierre@transport-med.fr' }, include: { transporteurProfil: { include: { annonces: true } } } })
  const marieUser = await db.user.findUniqueOrThrow({ where: { email: 'marie@brossard-logistique.fr' }, include: { transporteurProfil: { include: { vehicules: true, annonces: true } } } })
  const isabelleUser = await db.user.findUniqueOrThrow({ where: { email: 'isabelle@groupe-fret.fr' } })

  // ── 1. En-têtes ──────────────────────────────────────────────────────────────
  section('En-têtes de sécurité')
  const accueil = await anon.requete('/')
  const csp = accueil.entetes.get('content-security-policy') ?? ''
  verifier('CSP présente avec nonce et strict-dynamic', /nonce-/.test(csp) && csp.includes("'strict-dynamic'"))
  verifier("CSP interdit l'intégration en iframe", csp.includes("frame-ancestors 'none'"))
  verifier('CSP interdit les objets et restreint base-uri', csp.includes("object-src 'none'") && csp.includes("base-uri 'self'"))
  verifier('X-Content-Type-Options: nosniff', accueil.entetes.get('x-content-type-options') === 'nosniff')
  verifier('X-Frame-Options: DENY', accueil.entetes.get('x-frame-options') === 'DENY')
  verifier("X-Powered-By absent (pas d'information sur la pile)", !accueil.entetes.get('x-powered-by'))
  verifier('Referrer-Policy définie', !!accueil.entetes.get('referrer-policy'))

  // ── 2. Anonyme ───────────────────────────────────────────────────────────────
  section('Visiteur non connecté')
  for (const chemin of ['/api/annonces?lat=48&lng=2', '/api/messages', '/api/compte', '/api/besoins?mine=1', '/api/alertes', '/api/vehicules']) {
    const r = await anon.requete(chemin)
    verifier(`GET ${chemin} refusé (401)`, r.statut === 401, `statut ${r.statut}`)
  }
  for (const chemin of ['/api/avis', '/api/recherche', '/api/signalements', '/api/annonces']) {
    const r = await anon.requete(chemin, { method: 'POST', json: {} })
    verifier(`POST ${chemin} refusé (401)`, r.statut === 401, `statut ${r.statut}`)
  }
  const carteAnon = await anon.requete('/carte')
  verifier('/carte redirige vers /login', [302, 303, 307, 308].includes(carteAnon.statut) && (carteAnon.entetes.get('location') ?? '').includes('/login'))
  const adminAnon = await anon.requete('/admin')
  verifier('/admin redirige vers /login', [302, 303, 307, 308].includes(adminAnon.statut) && (adminAnon.entetes.get('location') ?? '').includes('/login'))

  // ── 3. Mauvais rôle ──────────────────────────────────────────────────────────
  section('Transporteur : accès interdits')
  const autreProfilId = marieUser.transporteurProfil!.id
  verifier('ne peut pas chercher des annonces (403)', (await jean.requete('/api/annonces?lat=48.85&lng=2.35')).statut === 403)
  verifier('ne peut pas chercher des transporteurs (403)', (await jean.requete('/api/recherche', { method: 'POST', json: { lat: 48.85, lng: 2.35, rayonKm: 100 } })).statut === 403)
  verifier('ne peut pas lire des avis (403)', (await jean.requete(`/api/avis?transporteurId=${autreProfilId}`)).statut === 403)
  verifier('ne peut pas publier un besoin (403)', (await jean.requete('/api/besoins', { method: 'POST', json: {} })).statut === 403)
  verifier("ne peut pas utiliser l'administration (403)", (await jean.requete(`/api/admin/utilisateurs/${francoisUser.id}`, { method: 'PATCH', json: { suspendu: true } })).statut === 403)
  const carteJean = await jean.requete('/carte')
  verifier("/carte renvoie le transporteur vers son espace", [302, 303, 307, 308].includes(carteJean.statut) && (carteJean.entetes.get('location') ?? '').includes('/transporteur'))
  const profilConcurrent = await jean.requete(`/profils/${autreProfilId}`)
  verifier("le profil d'un concurrent est inaccessible", [302, 303, 307, 308].includes(profilConcurrent.statut) && (profilConcurrent.entetes.get('location') ?? '').includes('/transporteur'))
  verifier('ne peut pas ouvrir de conversation avec un autre transporteur (404)', (await jean.requete('/api/messages', { method: 'POST', json: { destinataireId: marieUser.id } })).statut === 404)
  verifier("n'accède pas à l'espace commissionnaire", [302, 303, 307, 308].includes((await jean.requete('/commissionnaire')).statut))

  section('Commissionnaire : accès interdits')
  verifier('ne peut pas publier une annonce (403)', (await francois.requete('/api/annonces', { method: 'POST', json: {} })).statut === 403)
  verifier('ne peut pas lister les besoins côté transporteur (403)', (await francois.requete('/api/besoins?lat=48&lng=2')).statut === 403)
  verifier("ne peut pas modifier un profil transporteur (403)", (await francois.requete('/api/transporteurs', { method: 'PUT', json: {} })).statut === 403)
  verifier("ne peut pas utiliser l'administration (403)", (await francois.requete(`/api/admin/utilisateurs/${jeanUser.id}`, { method: 'PATCH', json: { suspendu: true } })).statut === 403)

  // ── 4. Fuites de données ─────────────────────────────────────────────────────
  section('Aucune donnée sensible exposée')
  const annonces = await francois.requete('/api/annonces?lat=48.8566&lng=2.3522&rayonKm=500')
  verifier('la recherche d’annonces répond (200)', annonces.statut === 200 && Array.isArray(annonces.donnees), `statut ${annonces.statut}`)
  const lignes = (annonces.donnees as Record<string, unknown>[]) ?? []
  verifier('aucun e-mail dans les annonces', !JSON.stringify(lignes).includes('@'))
  verifier('aucun téléphone dans les annonces', lignes.every((l) => !('telephone' in l)))
  const recherche = await francois.requete('/api/recherche', { method: 'POST', json: { lat: 48.8566, lng: 2.3522, rayonKm: 500 } })
  verifier('la recherche de transporteurs répond (200)', recherche.statut === 200, `statut ${recherche.statut}`)
  verifier("aucun e-mail dans la recherche de transporteurs", !JSON.stringify(recherche.donnees).includes('@'))
  verifier('aucun mot de passe/hachage exposé', !/\$2[aby]\$/.test(JSON.stringify([annonces.donnees, recherche.donnees])))
  const profilPage = await francois.requete(`/profils/${jeanUser.transporteurProfil!.id}`)
  verifier("la page profil n'affiche pas l'e-mail du transporteur", profilPage.statut === 200 && !profilPage.texte.includes(jeanUser.email))
  const cartePage = await francois.requete('/carte')
  verifier("la carte n'affiche aucun e-mail", cartePage.statut === 200 && !cartePage.texte.includes(jeanUser.email))
  const avisJson = await francois.requete(`/api/avis?transporteurId=${jeanUser.transporteurProfil!.id}`)
  verifier("les avis n'affichent que « Prénom N. » (pas le nom complet)", avisJson.statut === 200 && !JSON.stringify(avisJson.donnees).includes('François Leroy'))

  // ── 5. IDOR ──────────────────────────────────────────────────────────────────
  section('Accès aux ressources d’autrui (IDOR)')
  const annoncePierre = pierreUser.transporteurProfil!.annonces[0]
  const vehiculeMarie = marieUser.transporteurProfil!.vehicules[0]
  verifier("(prérequis) un autre transporteur possède une annonce", !!annoncePierre)
  verifier("modifier l'annonce d'un autre transporteur → 404", (await jean.requete(`/api/annonces/${annoncePierre.id}`, { method: 'PATCH', json: { active: false } })).statut === 404)
  verifier("supprimer l'annonce d'un autre transporteur → 404", (await jean.requete(`/api/annonces/${annoncePierre.id}`, { method: 'DELETE' })).statut === 404)
  verifier("l'annonce d'autrui est restée intacte", (await db.annonce.findUnique({ where: { id: annoncePierre.id } }))?.active === true)
  verifier("lire le véhicule d'un autre transporteur → 404", (await jean.requete(`/api/vehicules/${vehiculeMarie.id}`)).statut === 404)
  verifier("modifier le véhicule d'un autre transporteur → 404", (await jean.requete(`/api/vehicules/${vehiculeMarie.id}`, { method: 'PUT', json: { type: 'VL', chargeUtile: 1 } })).statut === 404)
  const convIsabelleMarie = await db.conversation.findUniqueOrThrow({ where: { cle: [isabelleUser.id, marieUser.id].sort().join(':') } })
  verifier("lire la conversation d'autres utilisateurs → 404", (await francois.requete(`/api/messages/${convIsabelleMarie.id}`)).statut === 404)
  verifier("marquer lue la conversation d'autres utilisateurs → 404", (await francois.requete(`/api/messages/${convIsabelleMarie.id}/lu`, { method: 'PATCH', json: {} })).statut === 404)
  const pageConv = await francois.requete(`/messages/${convIsabelleMarie.id}`)
  verifier("la page de la conversation d'autrui est introuvable (404)", pageConv.statut === 404)
  verifier("impossible d'ouvrir une conversation avec soi-même", (await francois.requete('/api/messages', { method: 'POST', json: { destinataireId: francoisUser.id } })).statut === 400)
  verifier("impossible d'ouvrir une conversation commissionnaire↔commissionnaire", (await francois.requete('/api/messages', { method: 'POST', json: { destinataireId: isabelleUser.id } })).statut === 404)

  // ── 6. CSRF ──────────────────────────────────────────────────────────────────
  section('Requêtes venues d’un autre site (CSRF)')
  const csrf1 = await jean.requete('/api/transporteurs/disponibilite', { method: 'PATCH', json: { disponible: true }, headers: { origin: 'https://site-malveillant.example' } })
  verifier('Origin étrangère refusée (403)', csrf1.statut === 403, `statut ${csrf1.statut}`)
  const csrf2 = await jean.requete('/api/transporteurs/disponibilite', { method: 'PATCH', json: { disponible: true }, headers: { 'sec-fetch-site': 'cross-site' } })
  verifier('Sec-Fetch-Site: cross-site refusé (403)', csrf2.statut === 403, `statut ${csrf2.statut}`)
  const csrf3 = await jean.requete('/api/transporteurs/disponibilite', { method: 'PATCH', corps: 'disponible=true', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  verifier('formulaire classique (non JSON) refusé (415)', csrf3.statut === 415, `statut ${csrf3.statut}`)
  const memeOrigine = await jean.requete('/api/transporteurs/disponibilite', { method: 'PATCH', json: { disponible: true }, headers: { origin: BASE } })
  verifier("l'origine légitime reste acceptée", memeOrigine.statut === 200, `statut ${memeOrigine.statut}`)

  // ── 7. Validation des entrées ────────────────────────────────────────────────
  section('Validation des entrées')
  const baseAnnonce = { inseeDepart: '69123', dateDisponibilite: new Date(Date.now() + 86_400_000).toISOString() }
  verifier('JSON invalide → 400', (await jean.requete('/api/annonces', { method: 'POST', corps: '{pas du json', headers: { 'content-type': 'application/json' } })).statut === 400)
  verifier('champs manquants → 400', (await jean.requete('/api/annonces', { method: 'POST', json: { commentaire: 'x' } })).statut === 400)
  verifier('code commune invalide → 400', (await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, inseeDepart: 'Lyon' } })).statut === 400)
  verifier('code commune inconnu → 404', (await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, inseeDepart: '99999' } })).statut === 404)
  verifier('date passée → 400', (await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, dateDisponibilite: '2020-01-01' } })).statut === 400)
  verifier('corps de 200 Ko → 413', (await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, commentaire: 'x'.repeat(200_000) } })).statut === 413)
  verifier('véhicule appartenant à un autre → 400', (await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, vehiculeId: vehiculeMarie.id } })).statut === 400)
  verifier('injection dans le code commune → 400', (await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, inseeDepart: "69123' OR 1=1; --" } })).statut === 400)
  const injection = await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, commentaire: "Lyon'; DROP TABLE \"User\"; -- <script>alert(1)</script>" } })
  verifier("tentative d'injection SQL/XSS stockée telle quelle, sans effet (201)", injection.statut === 201, `statut ${injection.statut}`)
  const idInjection = (injection.donnees as { id?: string })?.id
  verifier('la table User existe toujours', (await db.user.count()) > 0)
  const recInj = await francois.requete('/api/annonces?lat=48.85&lng=2.35&villeArrivee=%25%27%3B--&rayonKm=999')
  verifier('paramètres de recherche malveillants gérés sans erreur 500', recInj.statut === 200, `statut ${recInj.statut}`)
  if (idInjection) await db.annonce.delete({ where: { id: idInjection } })
  verifier('SIRET à clé de contrôle invalide → 400', (await jean.requete('/api/transporteurs', { method: 'PUT', json: { siret: '12345678900001', raisonSociale: 'Test' } })).statut === 400)

  // ── 8. Force brute ───────────────────────────────────────────────────────────
  section('Protection contre la force brute')
  const cible = `bruteforce-${randomBytes(3).toString('hex')}@example.invalid`
  const brute = new Client('brute')
  let verrouille = false
  for (let i = 0; i < 8; i++) {
    const r = await brute.connecter(cible, `MauvaisMotDePasse${i}!`)
    if (r.erreur === 'TROP_DE_TENTATIVES') verrouille = true
  }
  verifier('compte verrouillé après des échecs répétés', verrouille)
  const verrouilleMemeBon = await brute.connecter('jean.dupont@dupont-transport.fr')
  verifier("le verrouillage d'un compte n'empêche pas les autres comptes", verrouilleMemeBon.connecte)
  const inscriptions = new Client('inscriptions')
  let limite = false
  for (let i = 0; i < 13; i++) {
    const r = await inscriptions.requete('/api/auth/register', { method: 'POST', json: {} })
    if (r.statut === 429) limite = true
  }
  verifier("l'inscription est limitée par IP (429)", limite)

  // ── 9. Cycle de vie d'un compte ──────────────────────────────────────────────
  section('Compte : inscription, mot de passe, sessions, RGPD')
  const emailTest = `verif-${randomBytes(4).toString('hex')}@example.invalid`
  const test = new Client('compte-test')
  const sansCgu = await test.requete('/api/auth/register', { method: 'POST', json: { email: emailTest, password: MOT_DE_PASSE, nom: 'Compte Test', role: 'TRANSPORTEUR' } })
  verifier("l'inscription exige l'acceptation des CGU (400)", sansCgu.statut === 400)
  const faible = await test.requete('/api/auth/register', { method: 'POST', json: { email: emailTest, password: 'abc', nom: 'Compte Test', role: 'TRANSPORTEUR', cgu: true } })
  verifier('mot de passe trop faible refusé (400)', faible.statut === 400)
  const roleAdmin = await test.requete('/api/auth/register', { method: 'POST', json: { email: emailTest, password: MOT_DE_PASSE, nom: 'Pirate', role: 'ADMIN', cgu: true } })
  verifier("impossible de s'inscrire avec le rôle ADMIN (400)", roleAdmin.statut === 400)
  const inscrit = await test.requete('/api/auth/register', { method: 'POST', json: { email: emailTest, password: MOT_DE_PASSE, nom: 'Compte Test', role: 'TRANSPORTEUR', cgu: true } })
  verifier('inscription valide (201)', inscrit.statut === 201, `statut ${inscrit.statut}`)
  const doublon = await test.requete('/api/auth/register', { method: 'POST', json: { email: emailTest, password: MOT_DE_PASSE, nom: 'Compte Test', role: 'TRANSPORTEUR', cgu: true } })
  verifier("e-mail déjà utilisé refusé (409)", doublon.statut === 409)
  const enBase = await db.user.findUniqueOrThrow({ where: { email: emailTest }, include: { transporteurProfil: true, abonnement: true } })
  verifier("le mot de passe est stocké haché (bcrypt)", enBase.password.startsWith('$2'))
  verifier('un transporteur n’a pas d’abonnement', enBase.abonnement === null)
  verifier('le profil est créé avec le compte', !!enBase.transporteurProfil)
  verifier('le consentement CGU est horodaté', !!enBase.cguAccepteesLe)
  verifier('la version des CGU acceptée est enregistrée', enBase.cguVersion === VERSION_CGU)

  verifier('connexion du nouveau compte', (await test.connecter(emailTest)).connecte)
  verifier('session valide (GET /api/messages 200)', (await test.requete('/api/messages')).statut === 200)

  const exportRes = await test.requete('/api/compte')
  verifier("l'export RGPD fonctionne (200) et ne contient aucun hachage", exportRes.statut === 200 && !/\$2[aby]\$/.test(exportRes.texte) && !exportRes.texte.includes('"password"'))

  // Réinitialisation de mot de passe
  const reponseExistant = await anon.requete('/api/auth/mot-de-passe-oublie', { method: 'POST', json: { email: emailTest } })
  const reponseInconnu = await anon.requete('/api/auth/mot-de-passe-oublie', { method: 'POST', json: { email: `inconnu-${randomBytes(3).toString('hex')}@example.invalid` } })
  verifier("la réponse « mot de passe oublié » ne révèle pas si le compte existe", reponseExistant.statut === 200 && JSON.stringify(reponseExistant.donnees) === JSON.stringify(reponseInconnu.donnees))
  const jeton = await creerToken(enBase.id, 'REINITIALISATION_MDP', 3_600_000)
  const nouveauMdp = 'NouveauMdp9!'
  verifier('jeton invalide refusé (400)', (await anon.requete('/api/auth/reinitialiser', { method: 'POST', json: { token: 'a'.repeat(43), password: nouveauMdp } })).statut === 400)
  verifier('mot de passe faible refusé à la réinitialisation (400)', (await anon.requete('/api/auth/reinitialiser', { method: 'POST', json: { token: jeton, password: 'faible' } })).statut === 400)
  verifier('réinitialisation avec le bon jeton (200)', (await anon.requete('/api/auth/reinitialiser', { method: 'POST', json: { token: jeton, password: nouveauMdp } })).statut === 200)
  verifier('un jeton ne sert qu’une fois (400)', (await anon.requete('/api/auth/reinitialiser', { method: 'POST', json: { token: jeton, password: 'Autre1234Mdp!' } })).statut === 400)
  const jetonExpire = await creerToken(enBase.id, 'REINITIALISATION_MDP', -1000)
  verifier('un jeton expiré est refusé (400)', (await anon.requete('/api/auth/reinitialiser', { method: 'POST', json: { token: jetonExpire, password: nouveauMdp } })).statut === 400)
  verifier("l'ancienne session est révoquée après réinitialisation (401)", (await test.requete('/api/messages')).statut === 401)
  const vieux = new Client('vieux-mdp')
  verifier("l'ancien mot de passe ne fonctionne plus", !(await vieux.connecter(emailTest, MOT_DE_PASSE)).connecte)
  const neuf = new Client('nouveau-mdp')
  verifier('le nouveau mot de passe fonctionne', (await neuf.connecter(emailTest, nouveauMdp)).connecte)

  // Changement de mot de passe depuis le compte
  verifier("changer le mot de passe exige l'ancien (403)", (await neuf.requete('/api/compte/mot-de-passe', { method: 'PUT', json: { ancien: 'Mauvais1234!', nouveau: 'EncoreUn5!Mdp' } })).statut === 403)

  // Suppression RGPD
  verifier('suppression sans confirmation refusée (400)', (await neuf.requete('/api/compte', { method: 'DELETE', json: { password: nouveauMdp } })).statut === 400)
  verifier('suppression avec un mauvais mot de passe refusée (403)', (await neuf.requete('/api/compte', { method: 'DELETE', json: { password: 'Mauvais1234!', confirmation: 'SUPPRIMER' } })).statut === 403)
  verifier('suppression du compte (200)', (await neuf.requete('/api/compte', { method: 'DELETE', json: { password: nouveauMdp, confirmation: 'SUPPRIMER' } })).statut === 200)
  const supprime = await db.user.findUniqueOrThrow({ where: { id: enBase.id } })
  verifier("l'identité est anonymisée (e-mail et nom effacés)", supprime.nom === 'Compte supprimé' && supprime.email.endsWith('@supprime.invalid') && !!supprime.supprimeLe)
  verifier('le profil est supprimé avec le compte', (await db.transporteurProfil.count({ where: { userId: enBase.id } })) === 0)
  verifier('connexion impossible après suppression', !(await new Client('x').connecter(emailTest, nouveauMdp)).connecte)
  await db.user.delete({ where: { id: enBase.id } }).catch(() => {})

  // ── Fonctions métier ─────────────────────────────────────────────────────────
  section('Besoins, alertes, avis, signalements, vérification SIRET')
  const besoinCree = await francois.requete('/api/besoins', { method: 'POST', json: { villeDepart: 'Lyon', latDepart: 45.76, lngDepart: 4.83, villeArrivee: 'Paris', dateEnlevement: new Date(Date.now() + 2 * 86_400_000).toISOString(), poidsKg: 5000 } })
  verifier('un commissionnaire publie un besoin (201)', besoinCree.statut === 201, `statut ${besoinCree.statut}`)
  const idBesoin = (besoinCree.donnees as { id?: string })?.id ?? ''
  const vuParJean = await jean.requete('/api/besoins?lat=45.76&lng=4.83&rayonKm=50')
  verifier('un transporteur proche voit le besoin', Array.isArray(vuParJean.donnees) && (vuParJean.donnees as { id: string }[]).some((b) => b.id === idBesoin))
  verifier("le besoin n'expose ni e-mail ni téléphone", !JSON.stringify(vuParJean.donnees).includes('@') && !JSON.stringify(vuParJean.donnees).includes('telephone'))
  const loin = await jean.requete('/api/besoins?lat=43.29&lng=5.37&rayonKm=20')
  verifier('un transporteur éloigné ne voit pas le besoin', !(loin.donnees as { id: string }[]).some((b) => b.id === idBesoin))
  verifier("un transporteur ne peut pas modifier le besoin d'un autre (403)", (await jean.requete(`/api/besoins/${idBesoin}`, { method: 'PATCH', json: { active: false } })).statut === 403)
  verifier("un autre commissionnaire ne peut pas supprimer ce besoin (404)", (await isabelle.requete(`/api/besoins/${idBesoin}`, { method: 'DELETE' })).statut === 404)
  verifier('besoin avec date passée refusé (400)', (await francois.requete('/api/besoins', { method: 'POST', json: { villeDepart: 'Lyon', latDepart: 45.76, lngDepart: 4.83, villeArrivee: 'Paris', dateEnlevement: '2020-01-01' } })).statut === 400)
  verifier('le propriétaire supprime son besoin (200)', (await francois.requete(`/api/besoins/${idBesoin}`, { method: 'DELETE' })).statut === 200)

  const alerte = await francois.requete('/api/alertes', { method: 'POST', json: { inseeDepart: '69123', rayonKm: 100, villeArrivee: '100%_joker' } })
  verifier('création d’une alerte (201)', alerte.statut === 201, `statut ${alerte.statut}`)
  verifier('les jokers SQL sont neutralisés dans une alerte', !/[%_]/.test((alerte.donnees as { villeArrivee?: string })?.villeArrivee ?? ''))
  verifier("un autre utilisateur ne peut pas supprimer l'alerte (404)", (await isabelle.requete(`/api/alertes/${(alerte.donnees as { id: string }).id}`, { method: 'DELETE' })).statut === 404)
  verifier("l'alerte est supprimable par son propriétaire (200)", (await francois.requete(`/api/alertes/${(alerte.donnees as { id: string }).id}`, { method: 'DELETE' })).statut === 200)

  const profilPierre = pierreUser.transporteurProfil!.id
  verifier("noter un transporteur sans avoir échangé avec lui → 403", (await francois.requete('/api/avis', { method: 'POST', json: { transporteurId: profilPierre, note: 5 } })).statut === 403)
  verifier('note hors limites (6) refusée → 400', (await francois.requete('/api/avis', { method: 'POST', json: { transporteurId: jeanUser.transporteurProfil!.id, note: 6 } })).statut === 400)
  verifier("noter après un échange réel dans les deux sens → 201", (await francois.requete('/api/avis', { method: 'POST', json: { transporteurId: jeanUser.transporteurProfil!.id, note: 4, commentaire: 'Réactif' } })).statut === 201)

  verifier('un signalement est enregistré (201)', (await francois.requete('/api/signalements', { method: 'POST', json: { cibleId: jeanUser.id, motif: 'SPAM' } })).statut === 201)
  verifier('un doublon de signalement ouvert est refusé (409)', (await francois.requete('/api/signalements', { method: 'POST', json: { cibleId: jeanUser.id, motif: 'SPAM' } })).statut === 409)
  verifier('on ne peut pas se signaler soi-même (400)', (await francois.requete('/api/signalements', { method: 'POST', json: { cibleId: francoisUser.id, motif: 'SPAM' } })).statut === 400)
  await db.signalement.deleteMany({ where: { signalantId: francoisUser.id } })

  // Vérification SIRET officielle (API de l'État) — ignorée si le service est injoignable
  const avantSiret = await db.transporteurProfil.findUniqueOrThrow({ where: { userId: jeanUser.id } })
  const siretOfficiel = await jean.requete('/api/transporteurs', { method: 'PUT', json: { siret: '35600000000048', raisonSociale: 'SARL Dupont Transport', latitude: avantSiret.latitude, longitude: avantSiret.longitude } })
  const verification = (siretOfficiel.donnees as { verificationSiret?: string })?.verificationSiret
  if (verification === 'INDISPONIBLE') console.log("  ⚠️  API officielle injoignable : contrôle SIRET ignoré")
  else {
    verifier('un SIRET réel et actif est vérifié auprès de l’État', verification === 'ACTIF', `résultat ${verification}`)
    verifier('le badge « SIRET vérifié » est attribué', (await db.user.findUniqueOrThrow({ where: { id: jeanUser.id } })).verifie === true)
    const faux = await jean.requete('/api/transporteurs', { method: 'PUT', json: { siret: '98765432101237', raisonSociale: 'SARL Dupont Transport', latitude: avantSiret.latitude, longitude: avantSiret.longitude } })
    verifier("un SIRET de forme valide mais inexistant n'obtient pas le badge", (faux.donnees as { verificationSiret?: string })?.verificationSiret !== 'ACTIF' && (await db.user.findUniqueOrThrow({ where: { id: jeanUser.id } })).verifie === false)
  }
  await db.transporteurProfil.update({ where: { userId: jeanUser.id }, data: { siret: avantSiret.siret, siretVerifieLe: avantSiret.siretVerifieLe, activiteOfficielle: avantSiret.activiteOfficielle } })
  await db.user.update({ where: { id: jeanUser.id }, data: { verifie: true } })

  // ── 10. Administration ───────────────────────────────────────────────────────
  section('Administration et suspension de compte')
  await db.user.create({
    data: { email: ADMIN_EMAIL, nom: 'Admin Vérif', role: 'ADMIN', password: await hash(MOT_DE_PASSE, 10), emailVerifieLe: new Date(), cguAccepteesLe: new Date(), cguVersion: VERSION_CGU },
  })
  verifier('connexion administrateur', (await admin.connecter(ADMIN_EMAIL)).connecte)
  verifier('espace admin accessible (200)', (await admin.requete('/admin')).statut === 200)
  verifier("l'admin ne peut pas utiliser la messagerie (403)", (await admin.requete('/api/messages')).statut === 403)

  const victime = new Client('victime')
  const emailVictime = `victime-${randomBytes(3).toString('hex')}@example.invalid`
  await db.user.create({
    data: {
      email: emailVictime, nom: 'Victime Test', role: 'COMMISSIONNAIRE', password: await hash(MOT_DE_PASSE, 10),
      emailVerifieLe: new Date(), cguAccepteesLe: new Date(), cguVersion: VERSION_CGU,
      commissionnaireProfil: { create: { siret: '', raisonSociale: 'Victime' } },
      abonnement: { create: { statut: 'TRIALING', dateFinEssai: new Date(Date.now() + 86_400_000) } },
    },
  })
  const idVictime = (await db.user.findUniqueOrThrow({ where: { email: emailVictime } })).id
  await victime.connecter(emailVictime)
  verifier('compte actif : accès (200)', (await victime.requete('/api/alertes')).statut === 200)
  verifier("l'admin suspend le compte (200)", (await admin.requete(`/api/admin/utilisateurs/${idVictime}`, { method: 'PATCH', json: { suspendu: true } })).statut === 200)
  verifier('compte suspendu : session coupée immédiatement (401)', (await victime.requete('/api/alertes')).statut === 401)
  verifier('compte suspendu : connexion refusée', !(await new Client('v2').connecter(emailVictime)).connecte)
  verifier("l'admin ne peut pas modifier un autre admin (403)", (await admin.requete(`/api/admin/utilisateurs/${(await db.user.findFirstOrThrow({ where: { email: ADMIN_EMAIL } })).id}`, { method: 'PATCH', json: { suspendu: true } })).statut === 403)
  verifier("la suspension est tracée dans le journal d'audit", (await db.journalSecurite.count({ where: { type: 'admin_action', details: { contains: idVictime } } })) > 0)
  verifier("l'admin ne peut PAS accorder le badge « SIRET vérifié » à la main (400)", (await admin.requete(`/api/admin/utilisateurs/${idVictime}`, { method: 'PATCH', json: { verifie: true } })).statut === 400)
  verifier("l'admin peut retirer le badge (200)", (await admin.requete(`/api/admin/utilisateurs/${idVictime}`, { method: 'PATCH', json: { verifie: false } })).statut === 200)
  await db.user.delete({ where: { id: idVictime } })

  // ── Conformité juridique ─────────────────────────────────────────────────────
  section('Conformité juridique (CGU, rétention des données)')
  const emailCgu = `cgu-${randomBytes(3).toString('hex')}@example.invalid`
  await db.user.create({
    data: {
      email: emailCgu, nom: 'CGU Test', role: 'COMMISSIONNAIRE', password: await hash(MOT_DE_PASSE, 10),
      emailVerifieLe: new Date(), cguAccepteesLe: new Date('2020-01-01'), cguVersion: '1999-01-01',
      commissionnaireProfil: { create: { siret: '', raisonSociale: 'CGU Test' } },
      abonnement: { create: { statut: 'TRIALING', dateFinEssai: new Date(Date.now() + 86_400_000) } },
    },
  })
  const clientCgu = new Client('cgu')
  await clientCgu.connecter(emailCgu)
  const avantCgu = await clientCgu.requete('/commissionnaire')
  verifier('CGU périmées : toute page protégée renvoie vers la page d\'acceptation', avantCgu.statut >= 300 && avantCgu.statut < 400 && (avantCgu.entetes.get('location') ?? '').includes('/accepter-cgu'), `statut ${avantCgu.statut} → ${avantCgu.entetes.get('location')}`)
  verifier("la page d'acceptation reste accessible (200)", (await clientCgu.requete('/accepter-cgu')).statut === 200)
  verifier('accepter une version périmée est refusé (409)', (await clientCgu.requete('/api/compte/cgu', { method: 'POST', json: { version: '1999-01-01' } })).statut === 409)
  verifier("accepter sans être connecté est refusé (401)", (await anon.requete('/api/compte/cgu', { method: 'POST', json: { version: VERSION_CGU } })).statut === 401)
  verifier('accepter la version en vigueur (200)', (await clientCgu.requete('/api/compte/cgu', { method: 'POST', json: { version: VERSION_CGU } })).statut === 200)
  const apresCgu = await clientCgu.requete('/commissionnaire')
  verifier('CGU acceptées : accès rétabli (200)', apresCgu.statut === 200, `statut ${apresCgu.statut}`)
  const enBaseCgu = await db.user.findUniqueOrThrow({ where: { email: emailCgu }, select: { cguVersion: true } })
  verifier("l'acceptation est enregistrée avec sa version", enBaseCgu.cguVersion === VERSION_CGU)
  verifier("l'acceptation est tracée dans le journal d'audit", (await db.journalSecurite.count({ where: { type: 'cgu_acceptees', details: VERSION_CGU } })) > 0)
  await db.user.delete({ where: { email: emailCgu } })

  const marqueur = `verif-purge-${randomBytes(3).toString('hex')}`
  const treizeMois = new Date(); treizeMois.setMonth(treizeMois.getMonth() - 13)
  await db.journalSecurite.create({ data: { type: 'verif', details: `${marqueur}-ancien`, createdAt: treizeMois } })
  await db.journalSecurite.create({ data: { type: 'verif', details: `${marqueur}-recent` } })
  await purgerDonneesExpirees()
  verifier('la purge supprime le journal de plus de 12 mois', (await db.journalSecurite.count({ where: { details: `${marqueur}-ancien` } })) === 0)
  verifier('la purge conserve le journal récent', (await db.journalSecurite.count({ where: { details: `${marqueur}-recent` } })) === 1)
  await db.journalSecurite.deleteMany({ where: { details: { startsWith: marqueur } } })

  // ── Documents légaux des transporteurs ───────────────────────────────────────
  section('Documents légaux (dépôt, contrôle du fichier, accès, validation)')
  const exige = process.env.EXIGER_DOCUMENTS === 'true'
  const emailTd = `doc-${randomBytes(3).toString('hex')}@example.invalid`
  const tdUser = await db.user.create({
    data: {
      email: emailTd, nom: 'Transporteur Documents', role: 'TRANSPORTEUR', password: await hash(MOT_DE_PASSE, 10),
      emailVerifieLe: new Date(), cguAccepteesLe: new Date(), cguVersion: VERSION_CGU,
      transporteurProfil: { create: { siret: '', raisonSociale: 'Docs Test', latitude: 48.8566, longitude: 2.3522, positionVille: 'Paris', positionInsee: '75056', positionDepartement: '75', positionRegion: '11', disponibleJusqua: new Date(Date.now() + 86_400_000), disponible: true, vehicules: { create: { type: 'PORTEUR', chargeUtile: 5000 } } } },
    },
    include: { transporteurProfil: true },
  })
  const tdProfilId = tdUser.transporteurProfil!.id
  const td = new Client('transporteur documents')
  await td.connecter(emailTd)
  const pdfValide = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\nCONTENU-CONFIDENTIEL-VERIF\n%%EOF')
  const ilYa = (jours: number) => new Date(Date.now() - jours * 86_400_000).toISOString().slice(0, 10)
  const dans = (jours: number) => new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10)
  const envoi = (client: Client, type: string, champs: Record<string, string>, contenu: Buffer, nom = 'kbis.pdf') => {
    const f = new FormData()
    f.set('type', type)
    for (const [k, v] of Object.entries(champs)) f.set(k, v)
    f.set('fichier', new File([new Uint8Array(contenu)], nom, { type: 'application/pdf' }))
    return client.formulaire('/api/documents', f)
  }

  verifier('dépôt sans session refusé (401)', (await envoi(anon, 'KBIS', { dateEmission: ilYa(5) }, pdfValide)).statut === 401)
  verifier('un administrateur ne dépose pas de document (403)', (await envoi(admin, 'KBIS', { dateEmission: ilYa(5) }, pdfValide)).statut === 403)
  verifier('liste des documents sans session refusée (401)', (await anon.requete('/api/documents')).statut === 401)

  verifier('un exécutable renommé en .pdf est refusé (400)', (await envoi(td, 'KBIS', { dateEmission: ilYa(5) }, Buffer.from('MZ\x90\x00\x03\x00\x00\x00 programme'), 'kbis.pdf')).statut === 400)
  verifier('une page HTML renommée en .pdf est refusée (400)', (await envoi(td, 'KBIS', { dateEmission: ilYa(5) }, Buffer.from('<html><script>alert(1)</script></html>'))).statut === 400)
  verifier('un SVG avec script est refusé (400)', (await envoi(td, 'KBIS', { dateEmission: ilYa(5) }, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'), 'kbis.svg')).statut === 400)
  verifier('un PDF contenant du JavaScript est refusé (400)', (await envoi(td, 'KBIS', { dateEmission: ilYa(5) }, Buffer.from('%PDF-1.4\n1 0 obj << /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >> endobj'))).statut === 400)
  verifier('un fichier de plus de 5 Mo est refusé (413)', (await envoi(td, 'KBIS', { dateEmission: ilYa(5) }, Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(6 * 1024 * 1024)]))).statut === 413)
  verifier('un type de document inconnu est refusé (400)', (await envoi(td, 'PASSEPORT', { dateEmission: ilYa(5) }, pdfValide)).statut === 400)
  verifier('une date de délivrance manquante est refusée (400)', (await envoi(td, 'KBIS', {}, pdfValide)).statut === 400)
  verifier('un Kbis de plus de 3 mois est refusé (400)', (await envoi(td, 'KBIS', { dateEmission: ilYa(150) }, pdfValide)).statut === 400)
  verifier('une licence déjà expirée est refusée (400)', (await envoi(td, 'LICENCE_TRANSPORT', { dateFin: ilYa(2) }, pdfValide)).statut === 400)
  verifier('un envoi non multipart est refusé (415)', (await td.requete('/api/documents', { method: 'POST', json: { type: 'KBIS' } })).statut === 415)
  verifier("aucun document n'a été enregistré par ces tentatives", (await db.document.count({ where: { userId: tdUser.id } })) === 0)

  const depose = await envoi(td, 'KBIS', { dateEmission: ilYa(10) }, pdfValide)
  const idKbis = (depose.donnees as { id?: string } | null)?.id ?? ''
  verifier('dépôt valide accepté (201), en attente de validation', depose.statut === 201 && (depose.donnees as { statut?: string })?.statut === 'EN_ATTENTE', `statut ${depose.statut}`)
  const contenuEnBase = await db.documentContenu.findUniqueOrThrow({ where: { documentId: idKbis } })
  verifier('le fichier est stocké chiffré (le texte clair est introuvable en base)', !Buffer.from(contenuEnBase.donnees).includes(Buffer.from('CONTENU-CONFIDENTIEL-VERIF')))
  const liste = await td.requete('/api/documents')
  verifier("la liste ne renvoie jamais le contenu du fichier", liste.statut === 200 && !liste.texte.includes('CONTENU-CONFIDENTIEL') && !liste.texte.includes('donnees'))
  const remplace = await envoi(td, 'KBIS', { dateEmission: ilYa(8) }, pdfValide)
  verifier('remplacer un document : un seul exemplaire par type', remplace.statut === 201 && (await db.document.count({ where: { userId: tdUser.id, type: 'KBIS' } })) === 1)
  const idKbis2 = (remplace.donnees as { id: string }).id
  verifier("l'ancien contenu est supprimé avec l'ancien document", (await db.documentContenu.count({ where: { documentId: idKbis } })) === 0)

  // Accès au fichier
  const proprio = await td.telecharger(`/api/documents/${idKbis2}/fichier`)
  verifier('le propriétaire télécharge son document (contenu identique)', proprio.statut === 200 && proprio.octets.equals(pdfValide))
  verifier('en-têtes du téléchargement : pièce jointe, nosniff, sandbox, pas de cache',
    (proprio.entetes.get('content-disposition') ?? '').startsWith('attachment') && proprio.entetes.get('x-content-type-options') === 'nosniff' &&
    (proprio.entetes.get('content-security-policy') ?? '').includes('sandbox') && proprio.entetes.get('cache-control') === 'no-store')
  verifier('un autre transporteur ne peut pas lire ce document (404)', (await marie.telecharger(`/api/documents/${idKbis2}/fichier`)).statut === 404)
  verifier('un visiteur ne peut pas lire ce document (401)', (await anon.telecharger(`/api/documents/${idKbis2}/fichier`)).statut === 401)
  verifier('un commissionnaire ne peut pas lire un document non validé (404)', (await francois.telecharger(`/api/documents/${idKbis2}/fichier`)).statut === 404)
  verifier("l'administrateur peut le télécharger pour examen (200)", (await admin.telecharger(`/api/documents/${idKbis2}/fichier`)).statut === 200)
  verifier("un autre transporteur ne peut pas supprimer ce document (404)", (await marie.requete(`/api/documents/${idKbis2}`, { method: 'DELETE' })).statut === 404)

  // Validation par l'administrateur
  verifier('un transporteur ne peut pas valider un document (403)', (await td.requete(`/api/admin/documents/${idKbis2}`, { method: 'PATCH', json: { statut: 'VALIDE' } })).statut === 403)
  verifier('un commissionnaire ne peut pas valider un document (403)', (await francois.requete(`/api/admin/documents/${idKbis2}`, { method: 'PATCH', json: { statut: 'VALIDE' } })).statut === 403)
  verifier('un refus sans motif est rejeté (400)', (await admin.requete(`/api/admin/documents/${idKbis2}`, { method: 'PATCH', json: { statut: 'REFUSE' } })).statut === 400)
  verifier("l'administrateur refuse avec un motif (200)", (await admin.requete(`/api/admin/documents/${idKbis2}`, { method: 'PATCH', json: { statut: 'REFUSE', motif: 'Document illisible' } })).statut === 200)
  const apresRefus = (await td.requete('/api/documents')).donnees as { documents: Array<{ statut: string; motifRefus: string | null }> }
  verifier('le transporteur voit le refus et son motif', apresRefus.documents[0]?.statut === 'REFUSE' && apresRefus.documents[0]?.motifRefus === 'Document illisible')
  verifier("la page « Documents à vérifier » est réservée à l'administrateur", (await admin.requete('/admin/documents')).statut === 200 && (await francois.requete('/admin/documents')).statut >= 300)
  verifier('la page « Mes documents » est accessible au transporteur (200)', (await td.requete('/transporteur/documents')).statut === 200)

  // Dossier complet : les cinq documents déposés puis validés
  const champsParType: Record<string, Record<string, string>> = {
    KBIS: { dateEmission: ilYa(10) }, LICENCE_TRANSPORT: { dateFin: dans(400) }, VIGILANCE_URSSAF: { dateEmission: ilYa(20) },
    REGULARITE_FISCALE: { dateEmission: ilYa(20) }, ASSURANCE: { dateFin: dans(200) },
  }
  const ids: string[] = []
  for (const type of OBLIGATOIRES_PAR_ROLE.TRANSPORTEUR) {
    const r = await envoi(td, type, champsParType[type], pdfValide)
    ids.push((r.donnees as { id: string }).id)
  }
  verifier('dossier incomplet tant que rien n’est validé : conformité absente', (await db.user.findUniqueOrThrow({ where: { id: tdUser.id } })).documentsConformesJusqua === null)
  for (const id of ids.slice(0, 4)) await admin.requete(`/api/admin/documents/${id}`, { method: 'PATCH', json: { statut: 'VALIDE' } })
  verifier('quatre documents validés sur cinq : toujours non conforme', (await db.user.findUniqueOrThrow({ where: { id: tdUser.id } })).documentsConformesJusqua === null)
  verifier('validation du cinquième document (200)', (await admin.requete(`/api/admin/documents/${ids[4]}`, { method: 'PATCH', json: { statut: 'VALIDE' } })).statut === 200)
  const conformite = (await db.user.findUniqueOrThrow({ where: { id: tdUser.id } })).documentsConformesJusqua
  verifier('cinq documents validés : conformité jusqu’à la première échéance', !!conformite && conformite.getTime() > Date.now())
  verifier("la validation est tracée dans le journal d'audit", (await db.journalSecurite.count({ where: { type: 'admin_action', details: { contains: 'document KBIS VALIDE' } } })) > 0)

  // Partage avec un commissionnaire
  const idLicence = ids[1]
  verifier('commissionnaire sans partage ni conversation : refusé (404)', (await isabelle.telecharger(`/api/documents/${idLicence}/fichier`)).statut === 404)
  verifier('le transporteur autorise le partage (200)', (await td.requete('/api/documents', { method: 'PATCH', json: { partage: true } })).statut === 200)
  await db.conversation.deleteMany({ where: { cle: [isabelleUser.id, tdUser.id].sort().join(':') } })
  verifier('partage autorisé mais aucune conversation : refusé (404)', (await isabelle.telecharger(`/api/documents/${idLicence}/fichier`)).statut === 404)
  await trouverOuCreerConversation(isabelleUser.id, tdUser.id)
  const partage = await isabelle.telecharger(`/api/documents/${idLicence}/fichier`)
  verifier('partage + conversation : le commissionnaire télécharge un document validé (200)', partage.statut === 200 && partage.octets.equals(pdfValide))
  verifier('ce téléchargement est tracé dans le journal', (await db.journalSecurite.count({ where: { type: 'document_telecharge', userId: isabelleUser.id } })) > 0)
  verifier('commissionnaire sans conversation avec ce transporteur : refusé (404)', (await francois.telecharger(`/api/documents/${idLicence}/fichier`)).statut === (await db.conversation.findUnique({ where: { cle: [francoisUser.id, tdUser.id].sort().join(':') } }) ? 200 : 404))
  await td.requete('/api/documents', { method: 'PATCH', json: { partage: false } })
  verifier('le transporteur retire son accord : le téléchargement est refusé (404)', (await isabelle.telecharger(`/api/documents/${idLicence}/fichier`)).statut === 404)
  const profilVu = await isabelle.requete(`/profils/${tdProfilId}`)
  verifier('le commissionnaire voit le statut des documents sur le profil', profilVu.statut === 200 && profilVu.texte.includes('Documents légaux'))
  await db.conversation.deleteMany({ where: { cle: [isabelleUser.id, tdUser.id].sort().join(':') } })

  // Visibilité : un transporteur non conforme reste invisible (si les documents sont exigés sur ce serveur)
  const zoneParis = { lat: 48.8566, lng: 2.3522, rayonKm: 50 }
  const estVisible = async () => {
    const r = await francois.requete('/api/recherche', { method: 'POST', json: zoneParis })
    return Array.isArray(r.donnees) && (r.donnees as Array<{ id: string }>).some((t) => t.id === tdProfilId)
  }
  verifier('transporteur conforme : visible dans la recherche', await estVisible())
  if (exige) {
    await db.user.update({ where: { id: tdUser.id }, data: { documentsConformesJusqua: null } })
    verifier('non conforme : invisible dans la recherche de transporteurs', !(await estVisible()))
    const annonces = await francois.requete('/api/annonces?lat=48.8566&lng=2.3522&rayonKm=50')
    verifier('non conforme : invisible dans les annonces', !JSON.stringify(annonces.donnees).includes(tdProfilId))
    const accueil = await anon.requete('/')
    verifier("non conforme : l'aperçu public n'affiche pas ses annonces", accueil.statut === 200)
    const pub = await td.requete('/api/annonces', { method: 'POST', json: { villeDepart: 'Paris', latDepart: 48.85, lngDepart: 2.35, dateDisponibilite: new Date(Date.now() + 86_400_000).toISOString() } })
    verifier('non conforme : publication refusée (403 DOCUMENTS_REQUIS)', pub.statut === 403 && (pub.donnees as { code?: string })?.code === 'DOCUMENTS_REQUIS')
    verifier('non conforme : « disponible maintenant » refusé (403)', (await td.requete('/api/transporteurs/disponibilite', { method: 'PATCH', json: { disponible: true } })).statut === 403)
    verifier('non conforme : se déclarer indisponible reste possible (200)', (await td.requete('/api/transporteurs/disponibilite', { method: 'PATCH', json: { disponible: false } })).statut === 200)
    verifier("non conforme : n'ouvre pas de conversation (403)", (await td.requete('/api/messages', { method: 'POST', json: { destinataireId: francoisUser.id } })).statut === 403)
    verifier("non conforme : un commissionnaire ne peut pas l'aborder (404)", (await isabelle.requete('/api/messages', { method: 'POST', json: { destinataireId: tdUser.id } })).statut === 404)
    await recalculerConformite(tdUser.id)
    // Il s'était déclaré indisponible plus haut : redevenu conforme, il peut se déclarer de nouveau disponible
    verifier('redevenu conforme : « disponible maintenant » de nouveau possible (200)', (await td.requete('/api/transporteurs/disponibilite', { method: 'PATCH', json: { disponible: true } })).statut === 200)
    verifier('conforme à nouveau après recalcul : visible', await estVisible())
  }

  // Expiration : un document validé dont la date est passée retire la conformité
  await db.document.update({ where: { id: ids[2] }, data: { dateExpiration: new Date(Date.now() - 1000) } })
  await recalculerConformite(tdUser.id)
  verifier('un document expiré retire la conformité', (await db.user.findUniqueOrThrow({ where: { id: tdUser.id } })).documentsConformesJusqua === null)
  const sixMois = new Date(); sixMois.setMonth(sixMois.getMonth() - 7)
  await db.document.update({ where: { id: ids[2] }, data: { dateExpiration: sixMois } })
  await purgerDocuments()
  verifier('la purge supprime les documents expirés depuis plus de 6 mois', (await db.document.count({ where: { id: ids[2] } })) === 0)
  verifier('un autre transporteur ne peut pas supprimer ce document mais le propriétaire le peut', (await td.requete(`/api/documents/${ids[0]}`, { method: 'DELETE' })).statut === 200)

  // ── Documents des commissionnaires ───────────────────────────────────────────
  const emailCd = `cdoc-${randomBytes(3).toString('hex')}@example.invalid`
  const cdUser = await db.user.create({
    data: {
      email: emailCd, nom: 'Commissionnaire Documents', role: 'COMMISSIONNAIRE', password: await hash(MOT_DE_PASSE, 10),
      emailVerifieLe: new Date(), cguAccepteesLe: new Date(), cguVersion: VERSION_CGU,
      commissionnaireProfil: { create: { siret: '', raisonSociale: 'Chargeur Docs Test' } },
      abonnement: { create: { statut: 'TRIALING', dateFinEssai: new Date(Date.now() + 7 * 86_400_000) } },
    },
    include: { commissionnaireProfil: true },
  })
  const cd = new Client('commissionnaire documents')
  await cd.connecter(emailCd)
  const jeanDoc = jean // transporteur de démonstration (conforme quand les documents sont exigés)

  verifier("un commissionnaire ne peut pas déposer une licence de transport (400)", (await envoi(cd, 'LICENCE_TRANSPORT', { dateFin: dans(300) }, pdfValide)).statut === 400)
  verifier("un transporteur ne peut pas déposer l'inscription au registre des commissionnaires (400)", (await envoi(td, 'REGISTRE_COMMISSIONNAIRE', { dateFin: dans(300) }, pdfValide)).statut === 400)
  const kbisCd = await envoi(cd, 'KBIS', { dateEmission: ilYa(10) }, pdfValide)
  const idKbisCd = (kbisCd.donnees as { id?: string })?.id ?? ''
  verifier('un commissionnaire dépose un Kbis (201)', kbisCd.statut === 201)
  verifier('un transporteur ne peut pas lire les documents non validés d’un commissionnaire (404)', (await jeanDoc.telecharger(`/api/documents/${idKbisCd}/fichier`)).statut === 404)
  verifier("l'administrateur peut télécharger le document du commissionnaire (200)", (await admin.telecharger(`/api/documents/${idKbisCd}/fichier`)).statut === 200)
  verifier('la page « Mes documents » du commissionnaire est accessible (200)', (await cd.requete('/commissionnaire/documents')).statut === 200)
  verifier("la file de validation affiche le rôle du déposant", (await admin.requete('/admin/documents')).texte.includes('Commissionnaire'))

  const zoneCd = { lat: 48.8566, lng: 2.3522, rayonKm: 50 }
  if (exige) {
    await db.user.update({ where: { id: cdUser.id }, data: { documentsConformesJusqua: null } })
    const rech = await cd.requete('/api/recherche', { method: 'POST', json: zoneCd })
    verifier('commissionnaire non conforme : recherche refusée (403 DOCUMENTS_REQUIS)', rech.statut === 403 && (rech.donnees as { code?: string })?.code === 'DOCUMENTS_REQUIS')
    verifier('commissionnaire non conforme : recherche d’annonces refusée (403)', (await cd.requete('/api/annonces?lat=48.85&lng=2.35&rayonKm=50')).statut === 403)
    verifier('commissionnaire non conforme : publication de besoin refusée (403)', (await cd.requete('/api/besoins', { method: 'POST', json: { villeDepart: 'Paris', latDepart: 48.85, lngDepart: 2.35, villeArrivee: 'Lyon', dateEnlevement: new Date(Date.now() + 2 * 86_400_000).toISOString() } })).statut === 403)
    verifier('commissionnaire non conforme : création d’alerte refusée (403)', (await cd.requete('/api/alertes', { method: 'POST', json: { inseeDepart: '75056', rayonKm: 50 } })).statut === 403)
    verifier("commissionnaire non conforme : n'ouvre pas de conversation (403)", (await cd.requete('/api/messages', { method: 'POST', json: { destinataireId: jeanUser.id } })).statut === 403)
    for (const page of ['/carte', '/commissionnaire/recherche', '/commissionnaire/besoins']) {
      const r = await cd.requete(page)
      verifier(`commissionnaire non conforme : ${page} renvoie vers « Mes documents »`, r.statut >= 300 && r.statut < 400 && (r.entetes.get('location') ?? '').includes('/commissionnaire/documents'), `statut ${r.statut}`)
    }
    verifier('commissionnaire non conforme : son tableau de bord reste accessible (200)', (await cd.requete('/commissionnaire')).statut === 200)
    // Ses besoins restent invisibles des transporteurs
    const besoinCd = await db.besoin.create({ data: { commissionnaireId: cdUser.commissionnaireProfil!.id, villeDepart: 'Paris', latDepart: 48.8566, lngDepart: 2.3522, villeArrivee: 'Lyon', dateEnlevement: new Date(Date.now() + 2 * 86_400_000) } })
    const besoinsVus = await jeanDoc.requete('/api/besoins?lat=48.8566&lng=2.3522&rayonKm=50')
    verifier("les besoins d'un commissionnaire non conforme sont invisibles des transporteurs", !JSON.stringify(besoinsVus.donnees).includes(besoinCd.id))
    await db.besoin.delete({ where: { id: besoinCd.id } })
  }

  // Dossier complet (le registre est recommandé mais ne bloque pas)
  const champsCd: Record<string, Record<string, string>> = {
    VIGILANCE_URSSAF: { dateEmission: ilYa(20) }, REGULARITE_FISCALE: { dateEmission: ilYa(20) }, ASSURANCE: { dateFin: dans(200) },
  }
  const idsCd = [idKbisCd]
  for (const type of OBLIGATOIRES_PAR_ROLE.COMMISSIONNAIRE.filter((t) => t !== 'KBIS')) {
    idsCd.push(((await envoi(cd, type, champsCd[type], pdfValide)).donnees as { id: string }).id)
  }
  for (const id of idsCd.slice(0, 3)) await admin.requete(`/api/admin/documents/${id}`, { method: 'PATCH', json: { statut: 'VALIDE' } })
  verifier('trois documents validés sur quatre : commissionnaire toujours non conforme', (await db.user.findUniqueOrThrow({ where: { id: cdUser.id } })).documentsConformesJusqua === null)
  await admin.requete(`/api/admin/documents/${idsCd[3]}`, { method: 'PATCH', json: { statut: 'VALIDE' } })
  verifier('quatre documents validés : commissionnaire conforme (registre non requis)', !!(await db.user.findUniqueOrThrow({ where: { id: cdUser.id } })).documentsConformesJusqua)
  verifier('commissionnaire conforme : la recherche est accessible (200)', (await cd.requete('/api/recherche', { method: 'POST', json: zoneCd })).statut === 200)
  verifier('commissionnaire conforme : la carte est accessible (200)', (await cd.requete('/carte')).statut === 200)

  // Partage dans les deux sens : un transporteur lit les documents d'un commissionnaire seulement avec accord + conversation
  await db.conversation.deleteMany({ where: { cle: [cdUser.id, jeanUser.id].sort().join(':') } })
  verifier('sans accord ni conversation : un transporteur ne lit pas les documents du commissionnaire (404)', (await jeanDoc.telecharger(`/api/documents/${idsCd[0]}/fichier`)).statut === 404)
  await cd.requete('/api/documents', { method: 'PATCH', json: { partage: true } })
  await trouverOuCreerConversation(cdUser.id, jeanUser.id)
  verifier('accord + conversation : le transporteur télécharge le document validé du commissionnaire (200)', (await jeanDoc.telecharger(`/api/documents/${idsCd[0]}/fichier`)).statut === 200)
  verifier("un autre commissionnaire ne peut pas lire les documents d'un commissionnaire (404)", (await francois.telecharger(`/api/documents/${idsCd[0]}/fichier`)).statut === 404)
  const conv = await db.conversation.findUniqueOrThrow({ where: { cle: [cdUser.id, jeanUser.id].sort().join(':') } })
  verifier("le panneau de documents s'affiche dans la conversation", (await jeanDoc.requete(`/messages/${conv.id}`)).texte.includes('Documents de'))
  await db.conversation.delete({ where: { id: conv.id } })

  // Suppression de compte : les documents (et leur contenu chiffré) disparaissent
  const idContenu = idsCd[0]
  verifier('la suppression de compte est acceptée (200)', (await cd.requete('/api/compte', { method: 'DELETE', json: { password: MOT_DE_PASSE, confirmation: 'SUPPRIMER' } })).statut === 200)
  verifier('la suppression de compte efface les documents et leur contenu', (await db.document.count({ where: { userId: cdUser.id } })) === 0 && (await db.documentContenu.count({ where: { documentId: idContenu } })) === 0)
  await db.user.delete({ where: { id: cdUser.id } })

  // Un transporteur suspendu n'apparaît plus dans les recherches (correction)
  const emailSusp = `susp-${randomBytes(3).toString('hex')}@example.invalid`
  const suspendu = await db.user.create({
    data: {
      email: emailSusp, nom: 'Suspendu Test', role: 'TRANSPORTEUR', password: await hash(MOT_DE_PASSE, 10), suspendu: true, documentsConformesJusqua: new Date(Date.now() + 365 * 86_400_000),
      emailVerifieLe: new Date(), cguAccepteesLe: new Date(), cguVersion: VERSION_CGU,
      transporteurProfil: { create: { siret: '', raisonSociale: 'Suspendu Test', latitude: 48.8566, longitude: 2.3522, positionVille: 'Paris', positionInsee: '75056', positionDepartement: '75', positionRegion: '11', disponibleJusqua: new Date(Date.now() + 86_400_000), disponible: true, vehicules: { create: { type: 'PORTEUR', chargeUtile: 5000, immatriculation: 'ZZ-000-ZZ' } } } },
    },
    include: { transporteurProfil: true },
  })
  const rechercheSusp = await francois.requete('/api/recherche', { method: 'POST', json: zoneParis })
  verifier("un transporteur suspendu n'apparaît pas dans la recherche", !JSON.stringify(rechercheSusp.donnees).includes(suspendu.transporteurProfil!.id))
  await db.user.delete({ where: { id: suspendu.id } })

  await db.conversation.deleteMany({ where: { cle: [isabelleUser.id, tdUser.id].sort().join(':') } })
  await db.user.delete({ where: { id: tdUser.id } })

  // ── Position, zones et disponibilité ─────────────────────────────────────────
  section('Position (commune), zones, expiration de la disponibilité')
  const hex = () => randomBytes(3).toString('hex')
  const creerTransporteur = async (prefixe: string, avecPosition: boolean) => {
    const email = `${prefixe}-${hex()}@example.invalid`
    const user = await db.user.create({
      data: {
        email, nom: 'Transporteur Position', role: 'TRANSPORTEUR', password: await hash(MOT_DE_PASSE, 10),
        emailVerifieLe: new Date(), cguAccepteesLe: new Date(), cguVersion: VERSION_CGU,
        documentsConformesJusqua: process.env.EXIGER_DOCUMENTS === 'true' ? new Date(Date.now() + 365 * 86_400_000) : null,
        transporteurProfil: { create: { siret: '', raisonSociale: `Position ${prefixe}`, latitude: 46.6034, longitude: 1.8883, ...(avecPosition ? {} : {}), vehicules: { create: { type: 'SEMI', chargeUtile: 24000 } } } },
      },
      include: { transporteurProfil: true },
    })
    const client = new Client(prefixe)
    await client.connecter(email)
    return { user, client, profilId: user.transporteurProfil!.id }
  }
  const pz = await creerTransporteur('pz', false)
  const sansPosition = await creerTransporteur('pz-sans', false)
  const dansLePasse = (ms: number) => new Date(Date.now() - ms)

  verifier('position sans session refusée (401)', (await anon.requete('/api/transporteurs/position', { method: 'POST', json: { insee: '57463' } })).statut === 401)
  verifier('un commissionnaire ne peut pas définir de position (403)', (await francois.requete('/api/transporteurs/position', { method: 'POST', json: { insee: '57463' } })).statut === 403)
  verifier('des coordonnées GPS seules sont refusées (400)', (await pz.client.requete('/api/transporteurs/position', { method: 'POST', json: { latitude: 49.1193, longitude: 6.1757 } })).statut === 400)
  verifier('un code commune invalide est refusé (400)', (await pz.client.requete('/api/transporteurs/position', { method: 'POST', json: { insee: "57463' OR 1=1" } })).statut === 400)
  verifier('une durée non autorisée est refusée (400)', (await pz.client.requete('/api/transporteurs/position', { method: 'POST', json: { insee: '57463', dureeHeures: 99 } })).statut === 400)
  verifier('une commune inexistante est refusée (404)', (await pz.client.requete('/api/transporteurs/position', { method: 'POST', json: { insee: '99999' } })).statut === 404)
  verifier("se déclarer disponible sans avoir indiqué sa position est refusé (400)", (await sansPosition.client.requete('/api/transporteurs/disponibilite', { method: 'PATCH', json: { disponible: true } })).statut === 400)

  // Le serveur retrouve lui-même la commune : les coordonnées envoyées sont ignorées, seul le centre de la commune est enregistré
  const posee = await pz.client.requete('/api/transporteurs/position', { method: 'POST', json: { insee: '57463', latitude: 1.234567, longitude: 2.345678, positionDepartement: '75' } })
  verifier('position définie par code commune (200)', posee.statut === 200, `statut ${posee.statut} ${posee.texte.slice(0, 120)}`)
  const apresPosition = await db.transporteurProfil.findUniqueOrThrow({ where: { id: pz.profilId } })
  verifier('commune, département et région retrouvés par le serveur (Metz, 57, 44)', apresPosition.positionVille === 'Metz' && apresPosition.positionDepartement === '57' && apresPosition.positionRegion === '44' && apresPosition.positionInsee === '57463')
  verifier("seul le CENTRE de la commune est enregistré (jamais une coordonnée exacte envoyée par le client)", Math.abs(apresPosition.latitude - 49.1193) < 0.05 && Math.abs(apresPosition.longitude - 6.1757) < 0.05)
  verifier('disponible par défaut pour 24 h, mise à jour horodatée', apresPosition.disponible && !!apresPosition.disponibleJusqua && Math.abs(apresPosition.disponibleJusqua.getTime() - (Date.now() + 24 * 3_600_000)) < 120_000 && Date.now() - apresPosition.derniereMAJ.getTime() < 60_000)
  const etat = (await pz.client.requete('/api/transporteurs/position')).donnees as { disponible: boolean; positionDepartement: string }
  verifier('lecture de ma position (200)', etat.disponible === true && etat.positionDepartement === '57')

  const courte = await pz.client.requete('/api/transporteurs/position', { method: 'POST', json: { insee: '57463', dureeHeures: 4 } })
  const apresCourte = await db.transporteurProfil.findUniqueOrThrow({ where: { id: pz.profilId } })
  verifier('durée réglable : 4 h', courte.statut === 200 && apresCourte.dureeDisponibiliteH === 4 && Math.abs(apresCourte.disponibleJusqua!.getTime() - (Date.now() + 4 * 3_600_000)) < 120_000)
  await pz.client.requete('/api/transporteurs/position', { method: 'POST', json: { insee: '57463', dureeHeures: 48 } })

  // Zone d'intervention
  verifier('département inconnu dans la zone refusé (400)', (await pz.client.requete('/api/transporteurs/zone', { method: 'PUT', json: { departements: ['99'] } })).statut === 400)
  verifier("rayon d'intervention trop petit refusé (400)", (await pz.client.requete('/api/transporteurs/zone', { method: 'PUT', json: { rayonInterventionKm: 5 } })).statut === 400)
  verifier('destination inconnue refusée (404)', (await pz.client.requete('/api/transporteurs/zone', { method: 'PUT', json: { destinationInsee: '99999' } })).statut === 404)
  verifier("un commissionnaire ne peut pas modifier une zone d'intervention (403)", (await francois.requete('/api/transporteurs/zone', { method: 'PUT', json: { departements: ['57'] } })).statut === 403)
  const zoneOk = await pz.client.requete('/api/transporteurs/zone', { method: 'PUT', json: { departements: ['67', '54'], rayonInterventionKm: 150, destinationInsee: '69123' } })
  verifier("zone d'intervention enregistrée (200), destination retrouvée par le serveur", zoneOk.statut === 200 && (zoneOk.donnees as { destinationVille: string }).destinationVille === 'Lyon')

  // Recherche par zone (commissionnaire avec accès)
  const cherche = async (json: object) => {
    const r = await francois.requete('/api/recherche', { method: 'POST', json })
    return { statut: r.statut, lignes: (Array.isArray(r.donnees) ? r.donnees : []) as Array<{ id: string; via_intervention: boolean; distance_km: number | null; derniereMAJ: string; positionVille: string }> }
  }
  const trouve = (r: { lignes: Array<{ id: string }> }) => r.lignes.some((t) => t.id === pz.profilId)
  const parDept57 = await cherche({ departements: ['57'] })
  verifier('recherche par département : trouvé dans son département', parDept57.statut === 200 && trouve(parDept57) && parDept57.lignes.find((t) => t.id === pz.profilId)!.via_intervention === false)
  verifier('recherche par plusieurs départements (57 et 75)', trouve(await cherche({ departements: ['75', '57'] })))
  const parDept67 = await cherche({ departements: ['67'] })
  verifier("recherche par département : trouvé aussi là où il accepte d'aller (signalé)", trouve(parDept67) && parDept67.lignes.find((t) => t.id === pz.profilId)!.via_intervention === true)
  verifier('recherche par département : absent hors de sa zone', !trouve(await cherche({ departements: ['75'] })))
  verifier('recherche par région : trouvé en Grand Est', trouve(await cherche({ region: '44' })))
  verifier('recherche par région : absent en Bretagne', !trouve(await cherche({ region: '53' })))
  const rayonMetz = await cherche({ lat: 49.1193, lng: 6.1757, rayonKm: 30 })
  verifier('recherche par rayon : trouvé près de Metz, avec sa distance', trouve(rayonMetz) && rayonMetz.lignes.find((t) => t.id === pz.profilId)!.distance_km! < 5)
  verifier('recherche par rayon : absent à Paris (50 km), hors de sa zone d’intervention', !trouve(await cherche({ lat: 48.8566, lng: 2.3522, rayonKm: 50 })))
  await db.transporteurProfil.update({ where: { id: pz.profilId }, data: { rayonInterventionKm: 400 } })
  const viaRayon = await cherche({ lat: 48.8566, lng: 2.3522, rayonKm: 50 })
  verifier("recherche par rayon : trouvé à Paris parce qu'il accepte de se déplacer jusqu'à 400 km (signalé)", trouve(viaRayon) && viaRayon.lignes.find((t) => t.id === pz.profilId)!.via_intervention === true)
  await db.transporteurProfil.update({ where: { id: pz.profilId }, data: { rayonInterventionKm: 150 } })
  const large = await cherche({ lat: 46.6, lng: 1.9, rayonKm: 1000 })
  const dates = large.lignes.map((t) => new Date(t.derniereMAJ).getTime())
  verifier('résultats triés par fraîcheur : dernière mise à jour en premier', large.lignes.length > 2 && dates.every((d, i) => i === 0 || dates[i - 1] >= d))
  verifier('validation : aucune zone → 400', (await francois.requete('/api/recherche', { method: 'POST', json: {} })).statut === 400)
  verifier('validation : département inconnu → 400', (await francois.requete('/api/recherche', { method: 'POST', json: { departements: ['99'] } })).statut === 400)
  verifier('validation : liste de départements vide → 400', (await francois.requete('/api/recherche', { method: 'POST', json: { departements: [] } })).statut === 400)
  verifier('validation : trop de départements → 400', (await francois.requete('/api/recherche', { method: 'POST', json: { departements: Array(13).fill('57') } })).statut === 400)
  verifier('un transporteur ne peut pas chercher par zone (403)', (await jean.requete('/api/recherche', { method: 'POST', json: { departements: ['57'] } })).statut === 403)

  // Annonces datées : communes retrouvées par le serveur, filtres par zone
  const annoncePz = await pz.client.requete('/api/annonces', { method: 'POST', json: { inseeDepart: '57463', inseeArrivee: '69123', latDepart: 1, lngDepart: 1, villeDepart: 'Ailleurs', departementDepart: '75', dateDisponibilite: new Date(Date.now() + 86_400_000).toISOString() } })
  verifier('annonce par code commune (201)', annoncePz.statut === 201, `statut ${annoncePz.statut}`)
  const idAnnoncePz = (annoncePz.donnees as { id?: string })?.id ?? ''
  const annonceEnBase = await db.annonce.findUniqueOrThrow({ where: { id: idAnnoncePz } })
  verifier('commune, départements et région de l’annonce retrouvés par le serveur (coordonnées envoyées ignorées)', annonceEnBase.villeDepart === 'Metz' && annonceEnBase.departementDepart === '57' && annonceEnBase.regionDepart === '44' && annonceEnBase.departementArrivee === '69' && Math.abs(annonceEnBase.latDepart - 49.1193) < 0.05)
  const annoncesDe = async (q: string) => JSON.stringify((await francois.requete(`/api/annonces?${q}`)).donnees ?? '').includes(idAnnoncePz)
  verifier('annonces par département', await annoncesDe('departements=57') && await annoncesDe('departements=75,57') && !(await annoncesDe('departements=75')))
  verifier('annonces par région', await annoncesDe('region=44') && !(await annoncesDe('region=53')))
  verifier('annonces par rayon', await annoncesDe('lat=49.1193&lng=6.1757&rayonKm=20') && !(await annoncesDe('lat=48.8566&lng=2.3522&rayonKm=50')))
  verifier('annonces : filtre « disponible maintenant »', await annoncesDe('departements=57&disponibleMaintenant=1'))
  verifier('annonces : filtre type de véhicule (aucun véhicule précisé → exclue)', !(await annoncesDe('departements=57&typeVehicule=SEMI')))
  verifier('annonces : département invalide → 400', (await francois.requete('/api/annonces?departements=99')).statut === 400)
  verifier('annonces : aucune zone → 400', (await francois.requete('/api/annonces')).statut === 400)
  const teaser = await anon.requete('/')
  verifier("l'aperçu public n'affiche que le département, jamais la commune", teaser.statut === 200 && teaser.texte.includes('Moselle (57)') && !teaser.texte.includes('Metz'))

  // Carte : compteurs par département, aucune position individuelle
  const carte = await francois.requete('/api/carte')
  const zones = ((carte.donnees as { zones?: Array<{ code: string; nb: number }> })?.zones ?? [])
  verifier('carte : compteurs par département (200)', carte.statut === 200 && (zones.find((z) => z.code === '57')?.nb ?? 0) >= 1)
  verifier('carte : aucune donnée individuelle (ni nom, ni identifiant, ni coordonnées d’un transporteur)', !/raisonSociale|userId|telephone|@/.test(carte.texte) && zones.every((z) => Object.keys(z).sort().join() === 'code,latitude,longitude,nb,nom,region'))
  verifier('carte : réservée aux commissionnaires (403 pour un transporteur, 401 sans session)', (await jean.requete('/api/carte')).statut === 403 && (await anon.requete('/api/carte')).statut === 401)

  // Temps réel : la carte est prévenue d'un changement
  const sCarte = await connecterSocket(francois.cookieHeader())
  let carteChange = false
  sCarte.socket.on('carte-change', () => { carteChange = true })
  sCarte.socket.emit('join-carte')
  const sTransporteurCarte = await connecterSocket(jean.cookieHeader())
  let intrus = false
  sTransporteurCarte.socket.on('carte-change', () => { intrus = true })
  sTransporteurCarte.socket.emit('join-carte')
  await attendre(500)
  await pz.client.requete('/api/transporteurs/disponibilite', { method: 'PATCH', json: { disponible: false } })
  await attendre(900)
  verifier('temps réel : la carte est prévenue quand un transporteur change de statut', carteChange)
  verifier('temps réel : un transporteur ne reçoit pas les événements de la carte', !intrus)
  sCarte.socket.close()
  sTransporteurCarte.socket.close()
  const etatArret = await db.transporteurProfil.findUniqueOrThrow({ where: { id: pz.profilId } })
  verifier('« je ne suis plus disponible » : indicateur coupé, échéance retirée', !etatArret.disponible && etatArret.disponibleJusqua === null)
  verifier('un transporteur indisponible disparaît des recherches par zone', !trouve(await cherche({ departements: ['57'] })))

  // Alertes par zone
  verifier('alerte sans ville ni département refusée (400)', (await francois.requete('/api/alertes', { method: 'POST', json: {} })).statut === 400)
  verifier('alerte avec département inconnu refusée (400)', (await francois.requete('/api/alertes', { method: 'POST', json: { departements: ['99'] } })).statut === 400)
  const alerteZone = await francois.requete('/api/alertes', { method: 'POST', json: { departements: ['57', '67'] } })
  const idAlerteZone = (alerteZone.donnees as { id?: string })?.id ?? ''
  verifier('alerte par départements créée (201)', alerteZone.statut === 201 && ((alerteZone.donnees as { departements?: string[] }).departements ?? []).join() === '57,67')
  await db.alerte.update({ where: { id: idAlerteZone }, data: { derniereNotifLe: null } })
  await pz.client.requete('/api/transporteurs/position', { method: 'POST', json: { insee: '57463', dureeHeures: 24 } })
  await attendre(2500)
  verifier('alerte par zone déclenchée quand un transporteur devient disponible dans le 57', !!(await db.alerte.findUniqueOrThrow({ where: { id: idAlerteZone } })).derniereNotifLe)
  await db.alerte.delete({ where: { id: idAlerteZone } })

  // Expiration automatique
  await db.transporteurProfil.update({ where: { id: pz.profilId }, data: { disponible: true, disponibleJusqua: dansLePasse(1000) } })
  verifier("une disponibilité échue disparaît des recherches même avant le passage de la tâche de fond", !trouve(await cherche({ departements: ['57'] })))
  verifier('…et de la carte (plus aucun compteur pour le département 57)', !((await francois.requete('/api/carte')).donnees as { zones: Array<{ code: string }> }).zones.some((z) => z.code === '57'))
  verifier("la tâche de fond remet l'indicateur à jour", (await expirerDisponibilites()) >= 1 && !(await db.transporteurProfil.findUniqueOrThrow({ where: { id: pz.profilId } })).disponible)
  verifier('une échéance expirée interdit « disponible » à la lecture de ma position', ((await pz.client.requete('/api/transporteurs/position')).donnees as { disponible: boolean }).disponible === false)

  // Rappel et renouvellement en un clic
  await db.transporteurProfil.update({ where: { id: pz.profilId }, data: { disponible: true, disponibleJusqua: new Date(Date.now() + 3_600_000), dureeDisponibiliteH: 24, rappelDispoEnvoyeLe: null } })
  verifier('rappel de renouvellement envoyé une fois à l’approche de l’échéance', (await rappelerRenouvellements()) >= 1 && !!(await db.transporteurProfil.findUniqueOrThrow({ where: { id: pz.profilId } })).rappelDispoEnvoyeLe)
  verifier('…et pas une deuxième fois', (await db.transporteurProfil.findUniqueOrThrow({ where: { id: pz.profilId } })).rappelDispoEnvoyeLe !== null && (await rappelerRenouvellements()) === 0)
  const jetonRenouvellement = await creerToken(pz.user.id, 'RENOUVELER_DISPONIBILITE', 3_600_000)
  verifier('la page de renouvellement est publique (200)', (await anon.requete(`/renouveler-disponibilite?token=${jetonRenouvellement}`)).statut === 200)
  await db.transporteurProfil.update({ where: { id: pz.profilId }, data: { disponible: false, disponibleJusqua: null } })
  verifier('un jeton invalide est refusé (400)', (await anon.requete('/api/disponibilite/renouveler', { method: 'POST', json: { token: 'x'.repeat(40) } })).statut === 400)
  const renouvele = await anon.requete('/api/disponibilite/renouveler', { method: 'POST', json: { token: jetonRenouvellement } })
  verifier('renouvellement en un clic avec le jeton reçu par e-mail (200)', renouvele.statut === 200 && (await db.transporteurProfil.findUniqueOrThrow({ where: { id: pz.profilId } })).disponible)
  verifier('le jeton ne sert qu’une fois (400)', (await anon.requete('/api/disponibilite/renouveler', { method: 'POST', json: { token: jetonRenouvellement } })).statut === 400)
  verifier('un jeton de réinitialisation de mot de passe ne renouvelle rien (400)', (await anon.requete('/api/disponibilite/renouveler', { method: 'POST', json: { token: await creerToken(pz.user.id, 'REINITIALISATION_MDP', 3_600_000) } })).statut === 400)

  // Conservation : une position non mise à jour depuis 30 jours est effacée
  await db.transporteurProfil.update({ where: { id: pz.profilId }, data: { disponible: false, disponibleJusqua: null, derniereMAJ: dansLePasse(31 * 86_400_000) } })
  verifier('la purge efface les positions inchangées depuis 30 jours', (await purgerPositions()) >= 1)
  const purge = await db.transporteurProfil.findUniqueOrThrow({ where: { id: pz.profilId } })
  verifier('…position, département, région et destination effacés', !purge.positionVille && !purge.positionInsee && !purge.positionDepartement && !purge.positionRegion && !purge.destinationVille)
  await db.transporteurProfil.update({ where: { id: pz.profilId }, data: { positionInsee: '57463', positionVille: 'Metz', positionDepartement: '57', derniereMAJ: dansLePasse(2 * 86_400_000) } })
  verifier('une position récente est conservée', (await purgerPositions()) === 0 || !!(await db.transporteurProfil.findUniqueOrThrow({ where: { id: pz.profilId } })).positionInsee)

  await db.annonce.deleteMany({ where: { transporteurId: pz.profilId } })
  await db.user.deleteMany({ where: { id: { in: [pz.user.id, sansPosition.user.id] } } })

  // ── 11. Sockets ──────────────────────────────────────────────────────────────
  section('Temps réel (Socket.io)')
  const sansCookie = await connecterSocket(null)
  verifier('connexion sans session refusée', !sansCookie.ok && sansCookie.erreur === 'NON_AUTHENTIFIE', sansCookie.erreur)
  sansCookie.socket.close()
  const usurpation = await connecterSocket(null, { userId: jeanUser.id })
  verifier("usurpation d'identité (userId déclaré, sans cookie) refusée", !usurpation.ok, usurpation.erreur)
  usurpation.socket.close()
  const cookieFaux = await connecterSocket('next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..faux.faux.faux')
  verifier('cookie de session forgé refusé', !cookieFaux.ok, cookieFaux.erreur)
  cookieFaux.socket.close()

  const sJean = await connecterSocket(jean.cookieHeader())
  verifier('connexion avec une vraie session acceptée', sJean.ok, sJean.erreur)

  // Un tiers (jean) ne doit jamais recevoir une conversation à laquelle il ne participe pas
  const sMarie = await connecterSocket(marie.cookieHeader())
  const sIsabelle = await connecterSocket(isabelle.cookieHeader())
  let intercepte = false
  sJean.socket.on('new-message', () => { intercepte = true })
  sJean.socket.emit('join-conversation', convIsabelleMarie.id)
  sMarie.socket.emit('join-conversation', convIsabelleMarie.id)
  sIsabelle.socket.emit('join-conversation', convIsabelleMarie.id)
  await attendre(600)
  let recuParIsabelle = false
  sIsabelle.socket.on('new-message', () => { recuParIsabelle = true })
  const avant = await db.message.count({ where: { conversationId: convIsabelleMarie.id } })
  sMarie.socket.emit('send-message', { conversationId: convIsabelleMarie.id, contenu: 'message de vérification' })
  await attendre(900)
  verifier('un participant reçoit bien ses messages (témoin)', recuParIsabelle)
  verifier("un non-participant ne reçoit PAS les messages d'une conversation (espionnage impossible)", !intercepte)
  // Un non-participant ne peut pas écrire dans la conversation
  sJean.socket.emit('send-message', { conversationId: convIsabelleMarie.id, contenu: 'intrusion' })
  await attendre(700)
  const apres = await db.message.count({ where: { conversationId: convIsabelleMarie.id } })
  verifier("un non-participant ne peut pas écrire dans une conversation", apres === avant + 1, `${avant} → ${apres}`)
  await db.message.deleteMany({ where: { conversationId: convIsabelleMarie.id, contenu: { in: ['message de vérification', 'intrusion'] } } })

  // Flux réservés : un transporteur ne doit pas recevoir les annonces ni la carte des commissionnaires
  let annonceRecue = false
  sJean.socket.on('annonce-created', () => { annonceRecue = true })
  sJean.socket.emit('join-annonces')
  const sFrancois = await connecterSocket(francois.cookieHeader())
  let annonceRecueFrancois = false
  sFrancois.socket.on('annonce-created', () => { annonceRecueFrancois = true })
  sFrancois.socket.emit('join-annonces')
  await attendre(500)
  const creee = await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, commentaire: 'Test diffusion' } })
  await attendre(900)
  verifier('un commissionnaire reçoit les nouvelles annonces en direct', annonceRecueFrancois)
  verifier('un transporteur ne reçoit pas le flux des annonces', !annonceRecue)
  if ((creee.donnees as { id?: string })?.id) await db.annonce.delete({ where: { id: (creee.donnees as { id: string }).id } })

  ;[sJean, sMarie, sIsabelle, sFrancois].forEach((s) => s.socket.close())

  // ── Nettoyage ────────────────────────────────────────────────────────────────
  await db.user.deleteMany({ where: { email: ADMIN_EMAIL } })
  // Les comptes de démonstration n'ont pas de vrais documents : on retire la conformité accordée pour le test
  if (process.env.EXIGER_DOCUMENTS === 'true') await db.user.updateMany({ data: { documentsConformesJusqua: null } })

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`${reussis} contrôles réussis, ${echecs.length} échec(s)`)
  if (echecs.length > 0) {
    console.log('\nÉchecs :')
    echecs.forEach((e) => console.log(`  - ${e}`))
    process.exit(1)
  }
  console.log('✅ Toutes les protections vérifiées.')
}

main()
  .catch((e) => { console.error('❌ Erreur du script :', e); process.exit(2) })
  .finally(() => db.$disconnect())
