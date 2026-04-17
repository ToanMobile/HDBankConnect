# ENV_TEMPLATE.md — Smart Attendance V2

> Copy file này thành `.env` (backend), `.env` (web), và config tương ứng cho mobile.  
> KHÔNG commit file `.env` thực tế vào git. Chỉ commit file này.

---

## 1. Backend (`backend/.env`)

```dotenv
# ─── App ────────────────────────────────────────────────────────────────────
NODE_ENV=development          # development | production | test
PORT=3000
API_PREFIX=api/v1
APP_NAME="Smart Attendance V2"
APP_VERSION=1.0.0

# ─── Database (PostgreSQL 16) ────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_attendance
DB_USER=postgres
DB_PASS=supersecretpassword
DB_SSL=false                  # true ở production
DB_POOL_SIZE=10               # max connections per instance

# TypeORM
TYPEORM_LOGGING=false         # true để debug SQL
TYPEORM_SYNCHRONIZE=false     # LUÔN false ở production — dùng migrations
TYPEORM_MIGRATIONS_RUN=true   # auto-run migrations khi start

# ─── Redis 7 ─────────────────────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASS=                   # để trống nếu không có password
REDIS_DB=0
REDIS_KEY_PREFIX=sa:          # sa:employee:{id}, sa:branch:{id}, ...

# TTL (seconds)
REDIS_TTL_EMPLOYEE=3600       # 1 giờ
REDIS_TTL_BRANCH=21600        # 6 giờ
REDIS_TTL_SCHEDULE=3600       # 1 giờ
REDIS_TTL_SESSION=900         # 15 phút (= access token lifetime)
REDIS_TTL_OTP=600             # 10 phút

# ─── JWT ─────────────────────────────────────────────────────────────────────
JWT_SECRET=change-me-to-64-random-chars-minimum-DO-NOT-USE-THIS-IN-PROD
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# ─── CORS ────────────────────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:5173,https://dashboard.smartattendance.vn
# ⚠️ React Native KHÔNG gửi Origin header → CORS không áp dụng cho mobile.
# Mobile auth bảo vệ qua JWT + device_id, không qua CORS.

# ─── Seeding (chỉ dùng khi chạy migration lần đầu) ────────────────────────────
SEED_ADMIN_EMAIL=admin@smartattendance.vn
SEED_ADMIN_PASSWORD=change-me-before-first-run

# ─── Rate Limiting ────────────────────────────────────────────────────────────
RATE_LIMIT_TTL=60             # 1 phút (seconds)
RATE_LIMIT_MAX=10             # 10 requests/minute trên attendance endpoints
RATE_LIMIT_CHECKIN_PER_DAY=2  # max checkin per employee per day

# ─── Fraud Detection ─────────────────────────────────────────────────────────
IPINFO_API_TOKEN=your-ipinfo-api-token   # https://ipinfo.io — free tier: 50k req/month
IPINFO_CACHE_TTL=86400        # cache IP lookup 24 giờ
GPS_MAX_ACCURACY_METERS=50    # reject nếu accuracy > 50m

# ─── Notifications ────────────────────────────────────────────────────────────
# Telegram
TELEGRAM_BOT_TOKEN=7123456789:AAFxxx_your_bot_token
TELEGRAM_CHAT_GLOBAL_HR=-100987654321    # HR + super admin group chat ID
# ⚠️ Branch-level Telegram chat IDs KHÔNG lưu ở env vars (không scale 100 branches).
# Lưu trong cột branches.telegram_chat_id và cập nhật qua Admin API.

# Zalo OA (dự phòng)
ZALO_OA_ACCESS_TOKEN=your_zalo_oa_access_token
ZALO_OA_SECRET_KEY=your_zalo_oa_secret_key
ZALO_OA_ID=your_zalo_oa_id

# ─── Email (SMTP — dùng cho password reset OTP) ───────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false             # true nếu dùng port 465
SMTP_USER=noreply@giaisophaso.vn
SMTP_PASS=your-app-password
EMAIL_FROM="Smart Attendance <noreply@giaisophaso.vn>"

# ─── WebSocket ────────────────────────────────────────────────────────────────
WS_CORS_ORIGIN=http://localhost:5173,https://dashboard.smartattendance.vn
WS_STATS_INTERVAL=30000      # emit stats:update mỗi 30 giây (ms)

# ─── Google Maps ─────────────────────────────────────────────────────────────
# MVP: không dùng Google Maps. BranchConfig nhập lat/lng bằng tay.
# Bổ sung sau nếu cần: tách 2 keys (server restrict by IP, web restrict by domain)

# ─── Cron Jobs ────────────────────────────────────────────────────────────────
CRON_ABSENT_REPORT=0 17 * * 1-5   # 17:00 T2-T6 gửi báo cáo vắng mặt
CRON_CLEANUP_SYNC=0 2 * * *        # 02:00 hàng ngày dọn sync_queue cũ
CRON_STATS_CACHE=*/5 * * * *       # refresh stats cache mỗi 5 phút

# ─── Monitoring ────────────────────────────────────────────────────────────────
PROMETHEUS_ENABLED=false       # true ở production
PROMETHEUS_PORT=9090

# ─── Logging ──────────────────────────────────────────────────────────────────
LOG_LEVEL=debug               # debug | info | warn | error
LOG_FORMAT=pretty             # pretty | json (json ở production)
```

---

## 2. Web PWA (`web/.env`)

```dotenv
# ─── Vite env (phải prefix VITE_ để expose ra client) ─────────────────────────
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
# VITE_GOOGLE_MAPS_API_KEY=   ← MVP: không dùng, nhập lat/lng bằng tay
VITE_APP_NAME="Smart Attendance"
VITE_APP_VERSION=1.0.0

# PWA
VITE_PWA_NAME="Smart Attendance"
VITE_PWA_SHORT_NAME="SA"
VITE_PWA_THEME_COLOR=#49B7C3
```

---

## 3. Mobile React Native (`mobile/.env`)

Dùng `react-native-config` hoặc `expo-constants`:

```dotenv
API_URL=http://10.0.2.2:3000/api/v1      # Android emulator
# API_URL=http://localhost:3000/api/v1   # iOS simulator
# API_URL=https://api.smartattendance.vn/api/v1  # production

APP_VERSION=1.0.0
SENTRY_DSN=https://xxx@sentry.io/xxx     # crash reporting (optional)
```

---

## 4. Docker / docker-compose (`docker-compose.yml` variables)

Tạo file `.env` ở root cùng cấp `docker-compose.yml`:

```dotenv
# ─── Versions ─────────────────────────────────────────────────────────────────
POSTGRES_VERSION=16-alpine
REDIS_VERSION=7-alpine
NODE_VERSION=20-alpine

# ─── PostgreSQL ───────────────────────────────────────────────────────────────
POSTGRES_DB=smart_attendance
POSTGRES_USER=postgres
POSTGRES_PASSWORD=supersecretpassword
POSTGRES_PORT=5432

# ─── Redis ────────────────────────────────────────────────────────────────────
REDIS_PORT=6379

# ─── Backend ──────────────────────────────────────────────────────────────────
BACKEND_PORT=3000
BACKEND_IMAGE=smart-attendance-backend:latest

# ─── Web PWA ──────────────────────────────────────────────────────────────────
WEB_PORT=80
WEB_IMAGE=smart-attendance-web:latest

# ─── Nginx ────────────────────────────────────────────────────────────────────
NGINX_PORT=80
NGINX_SSL_PORT=443
DOMAIN=smartattendance.vn
```

---

## 5. Environment per Stage

| Variable | development | staging | production |
|---|---|---|---|
| `NODE_ENV` | `development` | `staging` | `production` |
| `DB_SSL` | `false` | `true` | `true` |
| `TYPEORM_LOGGING` | `true` | `false` | `false` |
| `LOG_LEVEL` | `debug` | `info` | `warn` |
| `LOG_FORMAT` | `pretty` | `json` | `json` |
| `CORS_ORIGINS` | `localhost:*` | staging domain | production domain |
| `PROMETHEUS_ENABLED` | `false` | `true` | `true` |
| `REDIS_PASS` | _(empty)_ | required | required |
| `DB_POOL_SIZE` | `5` | `10` | `20` |

---

## 6. Secret Management Checklist

- [ ] `JWT_SECRET` — min 64 random chars. Generate: `openssl rand -hex 64`
- [ ] `POSTGRES_PASSWORD` — min 20 chars, lưu trong secret manager (AWS Secrets Manager / Vault)
- [ ] `TELEGRAM_BOT_TOKEN` — không share public, set trong CI/CD secrets
- [ ] `IPINFO_API_TOKEN` — free tier 50k req/month, nâng paid nếu cần
- [ ] `GOOGLE_MAPS_API_KEY` — restrict theo domain + IP ở Google Cloud Console
- [ ] Rotate tất cả secrets mỗi 90 ngày
- [ ] Không commit `.env` — chỉ commit `.env.example` (file này)
