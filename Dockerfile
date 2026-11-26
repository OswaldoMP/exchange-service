FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DB_PATH=/data/exchange-2026.sqlite

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY src ./src

RUN mkdir -p /data && chown -R node:node /app /data
USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
