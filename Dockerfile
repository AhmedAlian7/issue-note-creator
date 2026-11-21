FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
RUN pnpm exec esbuild src/pdf/render-note-pdf.ts --bundle --platform=node --format=cjs --external:playwright --outfile=/tmp/render-note-pdf.cjs \
    && cp -RL node_modules/playwright /tmp/playwright \
    && cp -RL "$(dirname "$(realpath node_modules/playwright)")/playwright-core" /tmp/playwright-core

FROM node:24-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 TZ=Africa/Cairo
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build /tmp/playwright-core ./node_modules/playwright-core
COPY --from=build /tmp/playwright ./node_modules/playwright
COPY --from=build /tmp/render-note-pdf.cjs ./src/pdf/render-note-pdf.cjs
COPY --from=build /app/src/pdf/assets ./src/pdf/assets
COPY --from=build /app/src/pdf/fonts ./src/pdf/fonts
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
RUN node node_modules/playwright-core/cli.js install --with-deps --only-shell chromium
RUN mkdir -p /data/pdfs && chown node:node /data/pdfs
USER node
EXPOSE 3000
CMD ["node", "server.js"]
