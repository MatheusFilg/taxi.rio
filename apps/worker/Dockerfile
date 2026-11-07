FROM oven/bun:1.4-alpine
WORKDIR /app
COPY package.json bun.lock bunfig.toml* turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN bun install --cwd .
RUN bun build ./apps/worker/src/index.ts --outdir ./apps/worker/dist --target bun
ENV PORT=3001
EXPOSE 3001
CMD ["bun", "./apps/worker/dist/index.js"]
