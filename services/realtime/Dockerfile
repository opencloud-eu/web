# Build context is the repository root, since the pnpm lockfile lives there:
#   docker build -f services/realtime/Dockerfile .
FROM node:22.18-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/realtime ./services/realtime

# Strip the parts of the workspace that only concern the frontend packages:
# the root devDependencies (which link to workspace packages not present in
# this image) and the `patchedDependencies` (whose targets are not installed
# here, which pnpm would otherwise reject).
RUN node -e "const fs=require('fs');const p=require('/repo/package.json');fs.writeFileSync('/repo/package.json',JSON.stringify({version:p.version,private:true,packageManager:p.packageManager}));fs.writeFileSync('/repo/pnpm-workspace.yaml',fs.readFileSync('/repo/pnpm-workspace.yaml','utf8').replace(/^patchedDependencies:\n(?:[ \t]+.*\n)*/m,''))"

# --legacy: the deployed package has no workspace dependencies, so the
# injected-workspace-packages setup pnpm otherwise requires is not needed.
RUN pnpm deploy --filter=web-realtime-server --prod --legacy /app

FROM node:22.18-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app ./

USER node
EXPOSE 1234

CMD ["node", "src/server.ts"]
