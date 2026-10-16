import { log, messageErreur } from './logger'

function luhnValide(chiffres: string): boolean {
  let somme = 0
  for (let i = 0; i < chiffres.length; i++) {
    let n = Number(chiffres[chiffres.length - 1 - i])
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    somme += n
  }
  return somme % 10 === 0
}

/**
 * Contrôle de forme : 14 chiffres + clé de Luhn. Exception officielle : les établissements de
 * La Poste (SIREN 356000000) sont valides si la clé de Luhn OU la règle "somme des chiffres
 * multiple de 5" est satisfaite.
 */
export function siretValide(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false
  if (luhnValide(siret)) return true
  if (siret.startsWith('356000000')) return siret.split('').reduce((a, c) => a + Number(c), 0) % 5 === 0
  return false
}

export type StatutSiret = 'ACTIF' | 'CESSE' | 'INTROUVABLE' | 'INDISPONIBLE'

export interface ResultatSiret {
  statut: StatutSiret
  nom?: string
  activite?: string
}

interface Etablissement {
  siret?: string
  etat_administratif?: string
  activite_principale?: string
}

interface Resultat {
  nom_complet?: string
  siege?: Etablissement
  matching_etablissements?: Etablissement[]
}

/**
 * Interroge l'API publique "Recherche d'entreprises" (data.gouv.fr, sans clé).
 * Un SIRET actif ne prouve pas la licence de transport : le badge signifie
 * "entreprise existante et en activité", rien de plus.
 */
export async function verifierSiret(siret: string): Promise<ResultatSiret> {
  if (!siretValide(siret)) return { statut: 'INTROUVABLE' }
  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&per_page=1`, {
      signal: AbortSignal.timeout(6000),
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return { statut: 'INDISPONIBLE' }
    const data = (await res.json()) as { results?: Resultat[] }
    const r = data.results?.[0]
    if (!r) return { statut: 'INTROUVABLE' }
    const etab = [...(r.matching_etablissements ?? []), ...(r.siege ? [r.siege] : [])].find((e) => e.siret === siret)
    if (!etab) return { statut: 'INTROUVABLE' }
    return {
      statut: etab.etat_administratif === 'A' ? 'ACTIF' : 'CESSE',
      nom: r.nom_complet,
      activite: etab.activite_principale,
    }
  } catch (err) {
    log.warn('vérification SIRET indisponible', { erreur: messageErreur(err) })
    return { statut: 'INDISPONIBLE' }
  }
}
