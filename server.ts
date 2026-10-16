import { createServer } from 'http'
import next from 'next'
import { loadEnvConfig } from '@next/env'
import { verifierEnvironnement } from './src/lib/env'
import { initSocketServer } from './src/lib/socket-server'
import { db } from './src/lib/db'
import { planifierPurge } from './src/lib/purge'
import { log, messageErreur } from './src/lib/logger'

const dev = process.env.NODE_ENV !== 'production'
// Charge .env avant toute vérification (sinon la validation ne verrait que les variables du shell)
loadEnvConfig(process.cwd(), dev)
verifierEnvironnement()

// 0.0.0.0 en production (conteneur / hébergeur) ; localhost en développement
const hostname = process.env.BIND_HOST || (dev ? 'localhost' : '0.0.0.0')
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res).catch((err) => {
      log.error('requête non gérée', { erreur: messageErreur(err), url: req.url?.split('?')[0] })
      if (!res.headersSent) res.writeHead(500)
      res.end()
    })
  })

  // Délais serrés contre les connexions lentes (slowloris) ; keep-alive > celui des load balancers (60 s)
  httpServer.headersTimeout = 20_000
  httpServer.requestTimeout = 60_000
  httpServer.keepAliveTimeout = 65_000
  httpServer.maxHeadersCount = 100

  initSocketServer(httpServer)
  planifierPurge()

  httpServer.listen(port, hostname, () => {
    console.log(`▶  Ready on http://${hostname}:${port}`)
  })

  // Arrêt propre : on cesse d'accepter, on laisse finir les requêtes en cours, puis on ferme la base
  let arret = false
  const arreter = (signal: string) => {
    if (arret) return
    arret = true
    log.info('arrêt demandé', { signal })
    httpServer.close(async () => {
      await db.$disconnect().catch(() => {})
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on('SIGTERM', () => arreter('SIGTERM'))
  process.on('SIGINT', () => arreter('SIGINT'))
})

process.on('unhandledRejection', (raison) => log.error('promesse rejetée non gérée', { erreur: messageErreur(raison) }))
process.on('uncaughtException', (err) => {
  log.error('exception non interceptée', { erreur: messageErreur(err) })
  process.exit(1)
})
