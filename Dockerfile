FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# ── Dépendances ───────────────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Exécution ─────────────────────────────────────────────────────────────────
# tsx et prisma (devDependencies) sont nécessaires au démarrage (serveur custom + migrations) :
# on conserve donc node_modules en entier.
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/package-lock.json /app/tsconfig.json /app/next.config.mjs /app/server.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["npx", "tsx", "server.ts"]
