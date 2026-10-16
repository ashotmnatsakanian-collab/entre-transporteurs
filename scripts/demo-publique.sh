#!/usr/bin/env bash
# Lance l'application en mode production avec un lien public temporaire
# (tunnel SSH localhost.run — aucun compte ni installation requis).
#
#   ./scripts/demo-publique.sh            # construit puis lance
#   SKIP_BUILD=1 ./scripts/demo-publique.sh   # relance sans reconstruire
#
# Le lien reste valide tant que ce script tourne et que l'ordinateur est allumé.
# Mode démo = boutons de connexion en un clic avec les comptes du seed.
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${PORT:-3001}"
LOG="$(mktemp)"

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "▶ Construction de l'application (mode démo)…"
  NEXT_PUBLIC_DEMO_MODE=true npx next build > /dev/null
fi

echo "▶ Ouverture du lien public…"
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes \
  -R "80:localhost:${PORT}" nokey@localhost.run > "$LOG" 2>&1 &
TUNNEL_PID=$!
trap 'kill "$TUNNEL_PID" 2>/dev/null || true' EXIT

URL=""
for _ in $(seq 1 40); do
  URL="$(grep -oE 'https://[a-zA-Z0-9-]+\.lhr\.life' "$LOG" | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "Impossible d'obtenir le lien public. Sortie du tunnel :"
  cat "$LOG"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ LIEN À ENVOYER : $URL"
echo "════════════════════════════════════════════════════════"
echo ""

NODE_ENV=production PORT="$PORT" NEXTAUTH_URL="$URL" npx tsx server.ts
