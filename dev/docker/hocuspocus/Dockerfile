FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=optional --no-audit --no-fund

FROM node:22-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json server.ts ./
ENV NODE_ENV=production
EXPOSE 9400
CMD ["npx", "tsx", "server.ts"]