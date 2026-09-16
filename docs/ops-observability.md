# Ops — observability (Phase 32)

Free stack: **Sentry** (errors) · **Prometheus + Grafana + Loki + Alloy** (metrics/logs on VPS) · **Uptime Kuma** (uptime). **No Kafka** — Celery/Redis already handle jobs.

## 1. Sentry (cloud free)

1. Create org on https://sentry.io — projects `polyspace-backend` and `polyspace-frontend`.
2. Set `SENTRY_DSN` on API (Render + `backend/.env.prod`).
3. Set `VITE_SENTRY_DSN` as Docker build-arg for the SPA (staging + prod).
4. Filter by `environment`: `staging` vs `production` (`DJANGO_ENV` / `VITE_APP_ENV`).
5. Keep `SENTRY_TRACES_SAMPLE_RATE=0` on free tier until needed.

### Activation checklist

Never commit DSNs (keep `.env.sentry.local`, `.env.prod`, `backend/.env.prod` gitignored).

- [x] Sentry.org projects exist and match local DSNs (`polyspace-backend` / `polyspace-frontend`, DE ingest)
- [x] Render `gesesp-api`: `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE=0`, `DJANGO_ENV=staging`
- [x] Render `gesesp`: `VITE_SENTRY_DSN`, `VITE_SENTRY_TRACES_SAMPLE_RATE=0`, `VITE_APP_ENV=staging` (web **rebuild** after `VITE_*`)
- [x] Local `.env.prod` + `backend/.env.prod` filled with Sentry DSNs (rates `0`)
- [ ] VPS: copy those env files to `/opt/polyspace/app` and redeploy so SPA rebuilds with `VITE_SENTRY_DSN` (`scripts/deploy-prod.sh <tag>`) — blocked until `polyspace.mr` DNS / VPS is live
- [x] Sentry UI alert on `polyspace-backend`: **Production new issues (email)** (Email / preferred channel); org `polyspace`
  - Tighten **Filter Issues → environments** from “All Environments” to `production` once that env appears in the dropdown (events already tagged `production`)
- [x] Verify: controlled events accepted for backend+frontend with `staging` and `production` tags (visible in Issues / Error Monitor)
- [x] Privacy defaults already on in code (`send_default_pii=False` / `sendDefaultPii: false`) — spot-check payloads in Sentry UI when reviewing issues
- [x] No Sentry secrets in git (gitignored env files only)

Optional helper (needs `SENTRY_AUTH_TOKEN`): [`scripts/sentry-create-prod-alert.sh`](../scripts/sentry-create-prod-alert.sh).

## 2. VPS observability compose

Prod app must be up first (creates Docker network `polyspace`):

```bash
cd /opt/polyspace/app
cp .env.obs.example .env.obs   # set GRAFANA_ADMIN_PASSWORD
mkdir -p /opt/polyspace/data/{prometheus,loki,alloy,grafana,uptime-kuma}
docker compose -f docker-compose.observability.yml --env-file .env.obs up -d
```

Bound to localhost only:

| UI | URL on VPS |
|----|------------|
| Grafana | http://127.0.0.1:3000 |
| Prometheus | http://127.0.0.1:9090 |
| Uptime Kuma | http://127.0.0.1:3001 |

SSH tunnel from Mac:

```bash
ssh -L 3000:127.0.0.1:3000 -L 3001:127.0.0.1:3001 -L 9090:127.0.0.1:9090 root@VPS_IP
```

Then open http://localhost:3000 etc.

### Mac dry-run

```bash
brew install --cask docker
# For local-only obs without prod network, temporarily remove `external: true`
# from docker-compose.observability.yml networks, or create: docker network create polyspace
docker compose -f docker-compose.observability.yml --env-file .env.obs up -d
```

## 3. Uptime Kuma monitors

In Kuma UI (first visit sets admin password), add:

| Name | URL | Interval | Notes |
|------|-----|----------|--------|
| Prod API | `https://api.polyspace.mr/api/healthz/` | 60s | **P0** — alert if down &gt; 3 min |
| Prod SPA | `https://polyspace.mr/healthz` | 60s | **P0** |
| Staging API | `https://gesesp-api.onrender.com/api/healthz/` | 5 min | **P2** — free dynos sleep; longer grace / low severity |

Notifications: Telegram bot (free) or email. Do **not** page on-call for staging cold starts.

## 4. Loki queries

Example: `{container=~".*backend.*"} |= "ERROR"`

## 5. Prometheus

Django scrapes `backend:8080/metrics` on the `polyspace` network. Public `/metrics` is blocked by Caddy (404).

## 6. Weekly ops

- Check disk under `/opt/polyspace/data` (Prometheus 15d / Loki 14d retention).
- Confirm backup cron still runs (`scripts/backup/`).
- Review Sentry unresolved issues for `environment:production`.

## 7. Promote staging → production

1. Validate on https://gesesp.onrender.com (yellow test banner).
2. **CI green** on the release commit (`ci-ok` — see [`docs/ops-testing.md`](ops-testing.md)).
3. **Load gate:** k6 `officers-100` PASS within last 7 days; file report under [`docs/load-reports/`](load-reports/).
4. Tag release: `git tag -a vX.Y.Z -m "…" && git push origin vX.Y.Z`
5. On VPS: `./scripts/deploy-prod.sh vX.Y.Z`
6. Smoke prod healthz + login.
