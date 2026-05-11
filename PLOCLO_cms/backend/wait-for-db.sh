#!/bin/sh
set -e

DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}

until nc -z "$DB_HOST" "$DB_PORT"; do
  echo "⏳ Waiting for Postgres at $DB_HOST:$DB_PORT..."
  sleep 2
done

echo "✅ Postgres is ready!"
npx prisma db push
npm run dev
