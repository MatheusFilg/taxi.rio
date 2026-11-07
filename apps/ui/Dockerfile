FROM oven/bun:1.4-alpine AS builder
WORKDIR /app
COPY package.json bun.lock bunfig.toml* turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/ui ./apps/ui
RUN bun install --cwd .
WORKDIR /app/apps/ui
RUN bun run build

FROM nginx:1.27-alpine
COPY --from=builder /app/apps/ui/dist /usr/share/nginx/html
COPY apps/ui/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
