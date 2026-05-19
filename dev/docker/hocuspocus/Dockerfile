FROM node:22-alpine

WORKDIR /app

# `patch` isn't in node:alpine by default; needed for the hocuspocus patch.
RUN apk add --no-cache patch

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund --loglevel=error

# Apply the pre-built hocuspocus PR #1096 (beforeHandleAwareness) on top of
# the npm @hocuspocus/server@4.0.0 release. Removable once that hook ships in
# a release. See patches/hocuspocus-server-4.0.0.patch.
COPY patches/ ./patches/
RUN cd node_modules/@hocuspocus/server && patch -p1 < /app/patches/hocuspocus-server-4.0.0.patch

COPY server.js ./

CMD ["node", "server.js"]
