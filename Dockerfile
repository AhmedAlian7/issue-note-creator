FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN --mount=type=cache,id=warehouse-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store --network-concurrency=8 --fetch-timeout=120000
COPY next.config.ts postcss.config.mjs tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY public ./public
COPY deploy/bootstrap-owner.ts ./deploy/bootstrap-owner.ts
RUN pnpm build
RUN cp -RL node_modules/playwright /tmp/playwright \
    && cp -RL "$(dirname "$(realpath node_modules/playwright)")/playwright-core" /tmp/playwright-core

FROM build AS maintenance
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

FROM node:24-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 TZ=Africa/Cairo
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build /tmp/playwright-core ./node_modules/playwright-core
COPY --from=build /tmp/playwright ./node_modules/playwright
COPY --from=build /app/src/pdf/assets ./src/pdf/assets
COPY --from=build /app/src/pdf/fonts ./src/pdf/fonts
RUN node node_modules/playwright/cli.js install --with-deps --only-shell chromium \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data/pdfs \
    && chown node:node /data/pdfs
USER node
EXPOSE 3000
CMD ["node", "server.js"]
