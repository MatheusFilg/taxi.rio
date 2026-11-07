FROM oven/bun:1.4-alpine
WORKDIR /app
COPY package.json bun.lock bunfig.toml* turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY keys/test-public.pem ./keys/test-public.pem
RUN bun install --cwd .
RUN bun build ./apps/api/src/index.ts --outdir ./apps/api/dist --target bun
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "./apps/api/dist/index.js"]
