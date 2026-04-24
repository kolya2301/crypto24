#!/bin/bash
# deploy.sh — первоначальный деплой на VPS
# Запускать на сервере: bash deploy.sh

set -e

echo "🚀 Crypto24.co.il — деплой"

# ─── 1. Проверка .env.production ──────────────────────────────────────────────
if [ ! -f ".env.production" ]; then
  echo "❌ Файл .env.production не найден! Создай его из .env.production.example"
  exit 1
fi

# ─── 2. Генерация секретов если не заполнены ──────────────────────────────────
if grep -q "REPLACE_ME" .env.production; then
  echo "⚠️  Обнаружены незаполненные секреты. Генерирую автоматически..."
  JWT_SECRET=$(openssl rand -base64 48)
  SESSION_SECRET=$(openssl rand -base64 48)
  ENCRYPTION_KEY=$(openssl rand -hex 32)
  sed -i "s|JWT_SECRET=REPLACE_ME|JWT_SECRET=$JWT_SECRET|" .env.production
  sed -i "s|SESSION_SECRET=REPLACE_ME|SESSION_SECRET=$SESSION_SECRET|" .env.production
  sed -i "s|ENCRYPTION_KEY=REPLACE_ME|ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env.production
  echo "✅ Секреты сгенерированы и записаны в .env.production"
fi

# ─── 3. Сборка и запуск ───────────────────────────────────────────────────────
echo "🔨 Собираю Docker образы..."
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

echo "🗄️  Запускаю БД..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis

echo "⏳ Жду готовности БД (30 сек)..."
sleep 30

echo "🔄 Запускаю миграции Prisma..."
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm \
  -e DATABASE_URL="postgresql://$(grep POSTGRES_USER .env.production | cut -d= -f2):$(grep POSTGRES_PASSWORD .env.production | cut -d= -f2)@postgres:5432/$(grep POSTGRES_DB .env.production | cut -d= -f2)" \
  app sh -c "npx prisma migrate deploy && npx prisma db seed" 2>/dev/null || \
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm \
  -e DATABASE_URL="postgresql://$(grep POSTGRES_USER .env.production | cut -d= -f2):$(grep POSTGRES_PASSWORD .env.production | cut -d= -f2)@postgres:5432/$(grep POSTGRES_DB .env.production | cut -d= -f2)" \
  app sh -c "npx prisma migrate deploy"

echo "🚀 Запускаю все сервисы..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

echo ""
echo "✅ Готово! Сайт поднимается на https://crypto24.co.il"
echo "📋 Логи: docker compose -f docker-compose.prod.yml logs -f app"
