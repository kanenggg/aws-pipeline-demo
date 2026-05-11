FROM public.ecr.aws/docker/library/node:20-alpine

WORKDIR /app

RUN apk add --no-cache netcat-openbsd

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma generate

COPY . .

RUN chmod +x wait-for-db.sh
RUN npm run build

EXPOSE 3001

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["sh", "-c", "./wait-for-db.sh && node dist/index.js"]