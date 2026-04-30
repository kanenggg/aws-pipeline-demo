#!/bin/sh
set -e

until pg_isready -h postgres -p 5432 -U postgres; do
  echo "⏳ Waiting for Postgres..."
  sleep 2
done

echo "✅ Postgres is ready!"
npx prisma db push
npm run dev
