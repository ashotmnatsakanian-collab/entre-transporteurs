import { db } from '@/lib/db'
import { json } from '@/lib/api'

export const dynamic = 'force-dynamic'

// GET /api/sante — contrôle de santé pour l'hébergeur (Render) et la supervision
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return json({ statut: 'ok' })
  } catch {
    return json({ statut: 'indisponible' }, { status: 503 })
  }
}
