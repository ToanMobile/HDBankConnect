# Smart Attendance V2

Zero-Touch Attendance System for 100 branches and 5,000 employees. Runs silently in the background on employee devices, verifying location (WiFi BSSID + GPS Geofencing) and then recording attendance automatically u2014 no manual tapping required.

Built by **Giu1ea3i Phu00e1p Su1ed1**.

---

## Architecture Overview

```
 u250cu2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2510
 u2502                     CLIENTS                          u2502
 u2502  u250cu2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2510  u250cu2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2510              u2502
 u2502  u2502 React Native u2502  u2502 React PWA  u2502              u2502
 u2502  u2502  (Employee)  u2502  u2502  (Manager) u2502              u2502
 u2502  u2514u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2518  u2514u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2518              u2502
 u2514u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u252cu2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2518
                           u2502 HTTPS / WSS
                     u250cu2500u2500u2500u2500u2534u2500u2500u2500u2500u2510
                     u2502  Nginx   u2502   :80 u2192 :443 redirect
                     u2502 (Proxy) u2502   :443 TLS termination
                     u2514u2500u2500u2500u2500u252cu2500u2500u2500u2518
                          u2502
           u250cu2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u253cu2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2510
           u2502            u2502             u2502
   u250cu2500u2500u2500u2500u2500u2500u2534u2500u2500u2500u2500u2500u2510   u250cu2500u2500u2500u2500u2500u2500u2500u2534u2500u2500u2500u2500u2500u2510  u2502
   u2502  NestJS  u2502   u2502  React PWA u2502  u2502
   u2502  Backend  u2502   u2502  (Nginx)  u2502  u2502
   u2502  :3000   u2502   u2514u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2518  u2502
   u2514u2500u2500u252cu2500u2500u2500u252cu2500u2500u2518                      u2502
      u2502     u2502  WebSocket (Socket.IO) u2500u2518
      u2502     u2502
 u250cu2500u2500u2500u2500u2534u2500u2500u2510  u250cu2500u2500u2500u2500u2534u2500u2500u2510
 u2502  PG 16 u2502  u2502 Redis 7 u2502
 u2514u2500u2500u2500u2500u2500u2500u2500u2518  u2514u2500u2500u2500u2500u2500u2500u2500u2518
```

### How auto check-in works

```
Background scheduler fires near check-in window
    u2502
    u251cu2500u2500 Is today a workday?                  [skip if not]
    u251cu2500u2500 Is current time within window?        [skip if not]
    u251cu2500u2500 Scan WiFi u2014 BSSID in branch list?    [fail-fast]
    u251cu2500u2500 GPS u2014 within branch radius?          [fail-fast]
    u251cu2500u2500 VPN detected?                         [reject]
    u251cu2500u2500 Mock location detected?               [reject]
    u2514u2500u2500 POST /api/v1/attendance/auto-checkin
            u2502
            u251cu2500u2500 Server re-validates all conditions
            u251cu2500u2500 Fraud checks (device ID, rate limit, IP VPN)
            u251cu2500u2500 Determines status: on_time / late
            u2514u2500u2500 Persists record + fires WebSocket event
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | NestJS 10 + TypeScript (strict) |
| Database | PostgreSQL 16 (TypeORM migrations) |
| Cache / Pub-Sub | Redis 7 |
| Auth | JWT (access 15 min / refresh 7 d) |
| Realtime | Socket.IO (WebSocket) |
| Mobile | React Native 0.73+ (New Architecture) |
| Admin Dashboard | React 18 + Vite + Tailwind CSS + shadcn/ui |
| Reverse Proxy | Nginx (TLS termination, WebSocket upgrade) |
| Container | Docker + docker-compose |
| CI/CD | GitHub Actions u2192 GHCR |

---

## Prerequisites

- Docker 24+ and docker-compose v2
- Node.js 20 LTS (for local development without Docker)
- Git

---

## Quick Start

### Development (hot reload)

```bash
# 1. Clone
git clone https://github.com/your-org/smart-attendance-v2.git
cd smart-attendance-v2

# 2. Copy env templates
cp backend/.env.example backend/.env
cp web/.env.example web/.env
# Edit both files with your local values

# 3. Start infrastructure (Postgres + Redis) and services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 4. Check logs
docker-compose logs -f backend
```

Services in dev mode:
- Backend API: http://localhost:3000
- Web PWA: http://localhost:5173
- Postgres: localhost:5432
- Redis: localhost:6379

### Production

```bash
# 1. Copy and fill env
cp backend/.env.example backend/.env
cp web/.env.example web/.env
# Set all secrets: JWT_SECRET (min 64 chars), DB passwords, Telegram token, etc.

# 2. Place TLS certificates
mkdir -p nginx/ssl
cp /path/to/cert.pem nginx/ssl/cert.pem
cp /path/to/key.pem  nginx/ssl/key.pem

# 3. Pull or build images and start stack
docker-compose pull   # if using pre-built images from GHCR
docker-compose up -d

# 4. Monitor health
docker-compose ps
docker-compose logs -f
```

Production endpoints:
- HTTPS: https://smartattendance.vn
- API: https://smartattendance.vn/api/v1
- WebSocket: wss://smartattendance.vn/socket.io

---

## Environment Setup

| File | Template | Purpose |
|---|---|---|
| `backend/.env` | `backend/.env.example` | NestJS runtime config |
| `web/.env` | `web/.env.example` | Vite / PWA config |
| `.env` (root) | `docs/ENV_TEMPLATE.md` u00a7 4 | Docker compose overrides |

Key secrets to rotate every 90 days:
- `JWT_SECRET` u2014 generate with `openssl rand -hex 64`
- `POSTGRES_PASSWORD` u2014 min 20 chars, store in secret manager
- `TELEGRAM_BOT_TOKEN`, `IPINFO_API_TOKEN`

---

## Running Tests

```bash
# Backend unit tests
cd backend
npm ci
npm run test

# Backend unit tests with coverage
npm run test -- --coverage

# Backend e2e tests (requires Postgres + Redis running)
npm run test:e2e

# Web type-check + build
cd web
npm ci
npm run build
```

CI runs all tests automatically on every push and pull request to `main` / `develop` branches.

---

## API Documentation

Interactive Swagger UI is available at:

```
http://localhost:3000/api/docs    (development)
https://smartattendance.vn/api/docs  (production, admin access only)
```

Key endpoints:

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh

GET    /api/v1/branches
POST   /api/v1/branches
GET    /api/v1/branches/:id
PUT    /api/v1/branches/:id

GET    /api/v1/schedules/my
GET    /api/v1/schedules
POST   /api/v1/schedules

POST   /api/v1/attendance/auto-checkin
POST   /api/v1/attendance/auto-checkout
POST   /api/v1/attendance/manual
GET    /api/v1/attendance
GET    /api/v1/attendance/stats
GET    /api/v1/attendance/export    ?branch_id=&date_from=&date_to=

POST   /api/v1/sync/batch
GET    /api/v1/sync/status

GET    /api/v1/health
```

---

## Git Flow

```
main              u2190 production-ready, protected, SemVer tagged
u2514u2500u2500 develop       u2190 integration branch
    u251cu2500u2500 feature/SA-001-db-schema
    u251cu2500u2500 feature/SA-004-auto-checkin-api
    u251cu2500u2500 feature/SA-005-fraud-detection
    u251cu2500u2500 feature/SA-006-background-scheduler
    u2514u2500u2500 fix/SA-xxx-description
```

Commit format: `feat(module): description` following Conventional Commits.

---

## Scale Strategy

### Current: 5,000 employees / 100 branches

- Single NestJS instance handles peak load comfortably (~5.5 req/sec during 15-minute check-in window)
- Redis cache eliminates 90% of DB reads (branch config, schedules, employee lookups)
- PostgreSQL handles all writes with room to spare

### Future: 50,000 employees

| Concern | Solution |
|---|---|
| API throughput | Horizontal scale: 3u20135 NestJS instances behind Nginx upstream |
| Read load | PostgreSQL read replicas for dashboard queries |
| Write load | Primary PostgreSQL for attendance inserts only |
| Data volume | Attendance table partitioned by month; prune after 2 years |
| Cache layer | Redis Cluster (3 nodes) |
| Notifications | Bull queue (Redis-backed) for async Telegram / Zalo delivery |
| Static assets | CloudFront / Cloudflare CDN in front of PWA |
| Observability | Prometheus + Grafana: API latency, error rate, queue depth |

---

## Project Structure

```
smrt-attendance-v2/
u251cu2500u2500 backend/           # NestJS API (TypeScript strict)
u251cu2500u2500 web/               # React 18 + Vite PWA (admin dashboard)
u251cu2500u2500 mobile/            # React Native (employee app)
u251cu2500u2500 nginx/             # Nginx reverse proxy config + SSL
u251cu2500u2500 docs/              # Architecture docs, env templates, test cases
u251cu2500u2500 .github/workflows/ # GitHub Actions CI/CD
u251cu2500u2500 docker-compose.yml
u2514u2500u2500 docker-compose.dev.yml
```

---

## License

Proprietary u2014 Giu1ea3i Phu00e1p Su1ed1 u00a9 2025
