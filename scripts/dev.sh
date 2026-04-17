#!/usr/bin/env bash
# One-command dev bootstrap: cài deps + migrate + seed + start BE & web song song.
# Yêu cầu: Node 20, PostgreSQL 16, Redis 7 đã chạy (local hoặc remote — đọc từ backend/.env).
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "──▶ 1/4  Cài dependencies"
(cd backend && npm install --silent)
(cd web     && npm install --silent)

echo "──▶ 2/4  Build backend (cần .js cho migration CLI)"
(cd backend && npm run build --silent)

echo "──▶ 3/4  Chạy migration + seed"
(cd backend && npm run migration:run --silent || true)
(cd backend && FAKE_DATA=${FAKE_DATA:-false} npm run seed:fake --silent || true)

echo "──▶ 4/4  Start backend (:3000) + web (:5173)"
trap 'kill 0' EXIT
(cd backend && npm run start:dev) &
(cd web     && npm run dev)       &
wait
