FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

# ✅ 1. Accept the argument
ARG DATABASE_URL
# ✅ 2. Set it as an environment variable for the next commands
ENV DATABASE_URL=$DATABASE_URL

# Now this works because it can see the variable
RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 9771

CMD ["sh", "-c", "./wait-for-db.sh postgres && node dist/index.js"]