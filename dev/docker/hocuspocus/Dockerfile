FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund --loglevel=error

COPY server.js ./

CMD ["node", "server.js"]
