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
  const baseAnnonce = { villeDepart: 'Lyon', latDepart: 45.76, lngDepart: 4.83, dateDisponibilite: new Date(Date.now() + 86_400_000).toISOString() }
  verifier('JSON invalide → 400', (await jean.requete('/api/annonces', { method: 'POST', corps: '{pas du json', headers: { 'content-type': 'application/json' } })).statut === 400)
  verifier('champs manquants → 400', (await jean.requete('/api/annonces', { method: 'POST', json: { villeDepart: 'Lyon' } })).statut === 400)
  verifier('latitude hors limites → 400', (await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, latDepart: 999 } })).statut === 400)
  verifier('date passée → 400', (await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, dateDisponibilite: '2020-01-01' } })).statut === 400)
  verifier('corps de 200 Ko → 413', (await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, commentaire: 'x'.repeat(200_000) } })).statut === 413)
  verifier('véhicule appartenant à un autre → 400', (await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, vehiculeId: vehiculeMarie.id } })).statut === 400)
  const injection = await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, villeDepart: "Lyon'; DROP TABLE \"User\"; --", commentaire: '<script>alert(1)</script>' } })
  verifier("tentative d'injection SQL/XSS stockée telle quelle, sans effet (201)", injection.statut === 201, `statut ${injection.statut}`)
  const idInjection = (injection.donnees as { id?: string })?.id
  verifier('la table User existe toujours', (await db.user.count()) > 0)
  const recInj = await francois.requete('/api/annonces?lat=48.85&lng=2.35&villeArrivee=%25%27%3B--&rayonKm=999')
  verifier('paramètres de recherche malveillants gérés sans erreur 500', recInj.statut === 200, `statut ${recInj.statut}`)
  if (idInjection) await db.annonce.delete({ where: { id: idInjection } })
  verifier('SIRET à clé de contrôle invalide → 400', (await jean.requete('/api/transporteurs', { method: 'PUT', json: { siret: '12345678900001', raisonSociale: 'Test', latitude: 48, longitude: 2 } })).statut === 400)

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

  const alerte = await francois.requete('/api/alertes', { method: 'POST', json: { villeDepart: 'Lyon', latDepart: 45.76, lngDepart: 4.83, rayonKm: 100, villeArrivee: '100%_joker' } })
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
    data: { email: ADMIN_EMAIL, nom: 'Admin Vérif', role: 'ADMIN', password: await hash(MOT_DE_PASSE, 10), emailVerifieLe: new Date(), cguAccepteesLe: new Date() },
  })
  verifier('connexion administrateur', (await admin.connecter(ADMIN_EMAIL)).connecte)
  verifier('espace admin accessible (200)', (await admin.requete('/admin')).statut === 200)
  verifier("l'admin ne peut pas utiliser la messagerie (403)", (await admin.requete('/api/messages')).statut === 403)

  const victime = new Client('victime')
  const emailVictime = `victime-${randomBytes(3).toString('hex')}@example.invalid`
  await db.user.create({
    data: {
      email: emailVictime, nom: 'Victime Test', role: 'COMMISSIONNAIRE', password: await hash(MOT_DE_PASSE, 10),
      emailVerifieLe: new Date(), cguAccepteesLe: new Date(),
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
  await db.user.delete({ where: { id: idVictime } })

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
  const creee = await jean.requete('/api/annonces', { method: 'POST', json: { ...baseAnnonce, villeDepart: 'Test Diffusion' } })
  await attendre(900)
  verifier('un commissionnaire reçoit les nouvelles annonces en direct', annonceRecueFrancois)
  verifier('un transporteur ne reçoit pas le flux des annonces', !annonceRecue)
  if ((creee.donnees as { id?: string })?.id) await db.annonce.delete({ where: { id: (creee.donnees as { id: string }).id } })

  ;[sJean, sMarie, sIsabelle, sFrancois].forEach((s) => s.socket.close())

  // ── Nettoyage ────────────────────────────────────────────────────────────────
  await db.user.deleteMany({ where: { email: ADMIN_EMAIL } })

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
