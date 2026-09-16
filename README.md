# Polyspace

**Poste de commandement de la scolarité (ESP)**

Branch: `demo/oracle-hassen` — **do not merge into `main` / `master`.**

**Phase 31 — two environments, two databases (never share):**

| Role | Production (VPS) | Staging (Render) |
|------|------------------|------------------|
| App | **https://polyspace.mr** | **https://gesesp.onrender.com** |
| API | **https://api.polyspace.mr** | **https://gesesp-api.onrender.com** |
| API docs | **https://api.polyspace.mr/api/docs** | **https://gesesp-api.onrender.com/api/docs** |
| Database | Postgres on Hostinger VPS | Render Postgres (separate) |

Mock élèves disabled on both. Staging may cold-start (~30–60s); production VPS is always-on.

---

## Environments

| Env | Front URL | API URL | DB | Deploy |
|-----|-----------|---------|-----|--------|
| Local | `http://127.0.0.1:9081` | `http://127.0.0.1:8000/api` | Compose `:5433` | laptop |
| Staging | `https://gesesp.onrender.com` | `https://gesesp-api.onrender.com/api` | Render PG | push → GitHub mirror → Render |
| Production | `https://polyspace.mr` | `https://api.polyspace.mr/api` | VPS `pg_data` | approved tag + [`scripts/deploy-prod.sh`](scripts/deploy-prod.sh) |

**Promotion:** develop on staging (Render). When approved, deploy a **tag** to the VPS — do not auto-promote experimental commits to prod. No hotfixes on org `main` without review.

Mac tooling (once): `brew install --cask docker` then `brew install git gh jq curl`.

---

## Architecture

```text
Staging (test)                         Production (officers)
  gesesp.onrender.com                    polyspace.mr
       → gesesp-api.onrender.com              → api.polyspace.mr
       → Render Postgres                      → VPS Postgres + Redis + MinIO + Celery
```

- Staging build: `VITE_API_BASE_URL=https://gesesp-api.onrender.com/api/v1` · `VITE_APP_ENV=staging`
- Prod build: `VITE_API_BASE_URL=https://api.polyspace.mr/api/v1` · `VITE_APP_ENV=production`
- Auth: httpOnly cookie JWT + CSRF; login lockout after failed attempts
- Observability (Phase 32): Sentry (errors) · Prometheus/Grafana/Loki on VPS · Uptime Kuma — see [`docs/ops-observability.md`](docs/ops-observability.md)
- Capacity & SLOs (Phase 37): ≤100 officers / ≤3000 élèves — see [`docs/ops-slo-capacity.md`](docs/ops-slo-capacity.md)
- Dependency hygiene (Phase 39): lockfiles, CVE audits, lean exports — see [`docs/ops-deps.md`](docs/ops-deps.md)
- Horizontal scale (Phase 40): multi-replica API + shared Redis/MinIO — see [`docs/ops-horizontal-scale.md`](docs/ops-horizontal-scale.md)
- Disaster recovery (Phase 38): RPO/RTO + runbooks IT — see [`docs/ops-disaster-recovery.md`](docs/ops-disaster-recovery.md) · [`docs/runbooks/officer-it/`](docs/runbooks/officer-it/)
- i18n + a11y (Phase 35): FR/AR + RTL, Arabic name fields, Modal/DataTable a11y — see [`docs/ops-i18n-a11y.md`](docs/ops-i18n-a11y.md)

**Media:** Render disk is ephemeral unless S3/R2; VPS uses MinIO volumes (see Phase 23).

---

## DNS — production (polyspace.mr) → Hostinger VPS

Do **not** point `polyspace.mr` at Render. Staging stays on `*.onrender.com`.

| Type | Name | Value |
|------|------|--------|
| A | `@` | `VPS_PUBLIC_IP` |
| A | `www` | `VPS_PUBLIC_IP` |
| A | `api` | `VPS_PUBLIC_IP` |
| A | `status` | `VPS_PUBLIC_IP` (Uptime Kuma, basic auth) |
| A | `grafana` | `VPS_PUBLIC_IP` (Grafana, basic auth / tunnel) |

Full checklist: [`docs/dns-polyspace.md`](docs/dns-polyspace.md). Deploy: [`docker-compose.prod.yml`](docker-compose.prod.yml) + Caddy.

---

## Local development

```bash
docker compose -f docker-compose.dev.yml up -d db redis
cd backend && cp .env.example .env   # then set Gmail App Password (or later Resend API key)
source .venv311/bin/activate
pip install -r requirements.txt
# OTP mail without a Celery worker (already True in .env.example):
# USE_LOCMEM_CACHE=True CELERY_TASK_ALWAYS_EAGER=True
# Migrations: run `makemigrations` on your laptop, commit files under */migrations/,
# then deploy. Containers / Render only run `migrate` (entrypoint never wipes or regenerates them).
# CI / pre-deploy (Phases 33–34): see [`docs/ops-testing.md`](docs/ops-testing.md)
# — GitHub Actions `ci-ok` must be green; `makemigrations --check --dry-run` must exit 0;
# — k6 officers-100 pass + report in `docs/load-reports/` before go-live.
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
# In another terminal (when Redis is up):
celery -A backend worker -l info
cd ScolariteMilitaireFront && npm run dev
```

- App: http://127.0.0.1:9081 · Docs: http://127.0.0.1:8000/api/docs  

```bash
python manage.py create_esp_superuser --email EmEm@esp.mr --password 'YOUR_PASSWORD'
```

Compose frontend uses `nginx.compose.conf` (proxies `/api` to `backend`).

### API versioning

Business routes live under **`/api/v1/`**. Set `VITE_API_BASE_URL` to end with `/api/v1` (local default in the SPA). Health (`/api/livez|readyz|healthz`), docs (`/api/docs`), and `/media/` stay unversioned.

### Auth / password reset (OTP) — mail

Copy [`backend/.env.example`](backend/.env.example) → `backend/.env`.

**Interim (no DNS yet):** Gmail SMTP + [App Password](https://myaccount.google.com/apppasswords)

1. Enable 2FA on the Gmail account, create an App Password  
2. Set in `.env`:
   - `EMAIL_HOST=smtp.gmail.com`
   - `EMAIL_HOST_USER=you@gmail.com`
   - `EMAIL_HOST_PASSWORD` (16-char app password, no spaces)
   - `DEFAULT_FROM_EMAIL=Polyspace <you@gmail.com>`
3. Restart API (`CELERY_TASK_ALWAYS_EAGER=True` for in-process send)
4. Smoke: `/login/recovery` with a real `@esp.mr` user — UI language (FR/AR) selects OTP locale  

**Later (prod with DNS):** Resend + verified **polyspace.mr**

1. Create a [Resend](https://resend.com/) account and API key  
2. Verify domain **polyspace.mr** (SPF + DKIM)  
3. Set:
   - `EMAIL_HOST=smtp.resend.com`
   - `EMAIL_HOST_USER=resend`
   - `EMAIL_HOST_PASSWORD` (Resend API key)
   - `DEFAULT_FROM_EMAIL=Polyspace <noreply@polyspace.mr>`

Without `EMAIL_HOST_PASSWORD`, DEBUG uses the console backend (OTP in server logs).

Server rules for OTP request:

- Email must be `@esp.mr` (400 otherwise)
- Mail is sent **only** if an active account exists (unknown addresses get the same success text — no enumeration)
- Rate limits: per-email / per-IP hourly caps, **60s resend cooldown**, plus DRF IP throttles

| Env | Purpose |
|-----|---------|
| `PLATFORM_NAME` | Brand in OTP mail (default `Polyspace`) |
| `EMAIL_*` / `DEFAULT_FROM_EMAIL` | SMTP (Gmail interim or Resend prod) |
| `REDIS_URL` | OTP cache + rate limits |
| `CELERY_TASK_ALWAYS_EAGER` | `True` = send in-process |
| `USE_LOCMEM_CACHE` | LocMem when Redis is down |
| `OTP_RESEND_COOLDOWN_SECONDS` | Min seconds between requests for the same email (default 60) |
| `OTP_REQUEST_PER_EMAIL_PER_HOUR` / `OTP_REQUEST_PER_IP_PER_HOUR` | Hourly caps |

Web: `/login/recovery` (`login_recovery`) · Profil → Sécurité (`profile_reset`). OTP body language follows request `lang` (`fr`|`ar`).

---

## Staging env (Render) — test only

| Key | Value |
|-----|--------|
| `DJANGO_ENV` | `staging` |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `gesesp-api.onrender.com` (+ `demo.polyspace.mr` if used) |
| `CORS_ALLOWED_ORIGINS` | `https://gesesp.onrender.com` (+ demo host if used) |
| `CSRF_TRUSTED_ORIGINS` | same as CORS |
| `DB_*` | **Render Postgres only** (never VPS) |
| `DB_SSLMODE` | `require` |
| `VITE_API_BASE_URL` | `https://gesesp-api.onrender.com/api/v1` |
| `VITE_APP_ENV` | `staging` (yellow banner in SPA) |
| `VITE_FRONTEND_ONLY` / `VITE_USE_MOCK_ELEVES` | `false` |
| `SENTRY_DSN` | optional shared org, `environment=staging` |

Wake API before demos: `curl -s https://gesesp-api.onrender.com/api/healthz/`

Admin (Render Shell on API):

```bash
python manage.py create_esp_superuser --email EmEm@esp.mr --password 'YOUR_PASSWORD'
```

## Production env (Hostinger VPS)

| Key | Value |
|-----|--------|
| `DJANGO_ENV` | `production` |
| `ALLOWED_HOSTS` | `api.polyspace.mr` |
| `CORS` / `CSRF` | `https://polyspace.mr`, `https://www.polyspace.mr` |
| `VITE_API_BASE_URL` | `https://api.polyspace.mr/api/v1` |
| `VITE_APP_ENV` | `production` |
| `CONN_MAX_AGE` | `600` |
| `SENTRY_DSN` | same org, `environment=production` |

Deploy: `./scripts/deploy-prod.sh <tag>` — see [`docs/ops-observability.md`](docs/ops-observability.md).

---

## Supervisor checklist

### Staging (test)

- [ ] Open **https://gesesp.onrender.com** — yellow « ENVIRONNEMENT DE TEST » banner
- [ ] First load may be slow (cold start); wake `/api/healthz/` if needed
- [ ] Login + create one étudiant

### Production

- [ ] Open **https://polyspace.mr** (no test banner)
- [ ] Login; docs at https://api.polyspace.mr/api/docs
- [ ] OTP From `noreply@polyspace.mr`
- [ ] Uptime: https://status.polyspace.mr (ops only)

## Security

- Never commit real `SECRET_KEY` / DB / Resend API keys
- Do not merge this branch into `main`

### Secrets (Phase 8)

- First local boot: `cp backend/.env.example backend/.env`, then set `SECRET_KEY` with `openssl rand -base64 48` and `DEBUG=True` / `DJANGO_ENV=local`
- Django **refuses to start** without `SECRET_KEY`; when `DEBUG=False` or `DJANGO_ENV` is `production`/`staging`/`render`, weak keys (`insecure`, `change-me`, `esp-demo`, length &lt; 50) are rejected
- Compose loads `backend/.env` — no demo `SECRET_KEY` default in `docker-compose.yml`
- Rotating `SECRET_KEY` invalidates outstanding password-reset OTPs (HMAC)
- Check without leaking the key: `python manage.py check_secrets`

### Security headers (Phase 5)

- SPA nginx ([`nginx.conf`](ScolariteMilitaireFront/nginx.conf) / compose): `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, HSTS, **CSP**
- Django API: when `DEBUG=False` / `SECURITY_HEADERS_ENABLED=True` — SSL redirect, HSTS, nosniff, referrer, `X_FRAME_OPTIONS=DENY`, API CSP middleware
- **If you change the API host** (`VITE_API_BASE_URL`), update nginx CSP `connect-src` and rebuild the web image
- Local HTTP: keep `SECURITY_HEADERS_ENABLED=False` and `SECURE_SSL_REDIRECT=False` (see `.env.example`)

### Audit log (Phase 6)

- Append-only `AuditEvent` for élève view/create/update/delete, related dossiers, media download, import, login/logout/password
- List views are **not** audited (noise)
- Sensitive fields in diffs are redacted (`nni`, santé, passwords, …)
- Who can read: **administrateur**, **commandant d’unité**, **commandant de groupement** — UI `/audit` + `GET /api/v1/audit/`
- Django admin: audit events are **view-only** (no add/edit/delete)
- Retention: keep ≥ 12 months; a future `purge_audit` command is planned (not shipped yet)
- Medical / file bytes are never stored in the audit trail

### Student portal (Phase 12)

- Role `etudiant` linked to one `Eleve` (`UserProfile.eleve`) — login with `{matricule}@esp.mr`
- SPA: after login → `/etudiant/*` (read-only). Officers stay on `/dashboard` / `/eleves/*`
- Provision one account: `POST /api/v1/auth/users/provision/` `{ "eleve_id": N }` (admin / commandant d’unité)
- Bulk: `python manage.py provision_student_accounts [--limit N] [--dry-run] [--print-secrets]`
- Demo seed: `python manage.py seed_rbac_users` also creates `9001@esp.mr` (password `TestPass12!`)
- Password reset: same OTP flow as officers (`/login/recovery`)
- Students cannot manage users, import, or write dossiers (403)

### Optimistic locking (Phase 13)

- `Eleve` and editable ops rows expose `row_version`; writes require `expected_version` (or `If-Match`)
- Stale save → **409** `{ code: "version_conflict", current_version, current, … }` — UI forces reload (no silent merge)
- Import bulk bypasses the check; PDF/export ignore version

### Eleves list scale (Phases 14–16)

- **Pagination:** `GET /api/v1/eleves/?page=&page_size=` (default 25, max 100). Response: `{ count, next, previous, results }`
- **Filters / search:** `q` (name or exact matricule if digits), `departement`, `niveau` (alias `annee`), `compagnie`, `section`, `sexe`, `ordering` (whitelist; default `-updated_at`)
- **Slim list vs detail:** list uses `EleveListSerializer` (id, identity, slim academique/militaire only). Full nested dossiers/docs → `GET /api/v1/eleves/:id/`
- **Indexes:** nom/prenom, dates, académique departement/niveau, militaire compagnie/section (+ composites)
- **SPA:** Dossiers table uses `eleveService.listPage` + DataTable `mode="server"`. Exports / module rosters use `listAllPages` (slim pages, capped)
- **Smoke:** filter → change page → open fiche (detail) → export filtered list

### Connection pooling (Phase 17)

- `CONN_MAX_AGE` (default `60`; **VPS prod `600`** with direct Postgres). PgBouncer later → set `0`.
- Optional: `DB_CONNECT_TIMEOUT`, `DB_STATEMENT_TIMEOUT_MS`
- Budget on Hostinger VPS (4 vCPU): `9 workers × 2 threads + celery 4 + spare ≈ 24` connections ≪ Postgres `max_connections` (~100) → **no PgBouncer required** at first deploy

### Redis cache (Phase 18)

- `GET /api/v1/eleves/dashboard-stats/` — SQL aggregates + versioned cache (`DASHBOARD_CACHE_TTL`, default 30s)
- Hot list: first page (`page=1`, `page_size` 25|50) cached (`ELEVE_HOT_LIST_TTL`, default 20s)
- Writes on `Eleve` / académique / militaire bump version keys (no stale lists)
- Dashboard SPA uses `eleveService.dashboardStats()` (no full `listAllPages` for KPIs)
- Redis blip → compute live (no hard 500). Staging Render may keep `USE_LOCMEM_CACHE=True`

### Workers / always-on VPS (Phase 19)

- Measured VPS: **4 vCPU / 15 GiB / 200 GB SSD**, Docker already present; **do not** alter other users/containers
- Gunicorn via `backend/gunicorn.sh` (`GUNICORN_WORKERS` / `THREADS` / `TIMEOUT` / `MAX_REQUESTS`)
- VPS defaults: **workers=9, threads=2**, Celery `--concurrency=4`
- Health: `GET /api/healthz/` (readiness — DB + Redis ping) — Render `healthCheckPath` points here; also `/api/livez/` / `/api/readyz/` (Phase 25)
- Prod compose: [`docker-compose.prod.yml`](docker-compose.prod.yml) — host ports **8080** (API), **9080** (SPA), localhost **5434**/ **6380** for DB/Redis. Avoid 7080/7090/9400/…
- Smoke on VPS: `curl -s http://127.0.0.1:8080/api/healthz/`

### Health probes (Phase 25)

| Path | Role | Behaviour |
|------|------|-----------|
| `GET /api/livez/` | Liveness | Always **200** if Django is up (no DB/Redis checks — avoids restart loops) |
| `GET /api/readyz/` | Readiness | **200** if DB OK (+ Redis if required, + storage if required); else **503** |
| `GET /api/healthz/` | Compat | Same as **readyz** (Render `healthCheckPath`) |

- **Never** use `/api/docs/` or `/api/schema/` as a health probe (Swagger is locked when `DEBUG=False`).
- Env: `HEALTHZ_REQUIRE_REDIS` (auto: false when `USE_LOCMEM_CACHE=true`, else true); `HEALTHZ_REQUIRE_STORAGE` (Phase 23).
- SPA container: `GET /healthz` → plain `ok` ([`nginx.conf`](ScolariteMilitaireFront/nginx.conf)).
- Covered by CI health tests; live probes: `make smoke-readyz` — see [`docs/ops-testing.md`](docs/ops-testing.md)

### CDN / static cache (Phase 20)

- SPA nginx ([`nginx.conf`](ScolariteMilitaireFront/nginx.conf) / compose): **gzip** on; `/assets/` → `Cache-Control: public, max-age=31536000, immutable`; **`index.html` / `/` → `no-cache`** (so deploys pick new Vite hashes); logos/favicon → 7 days
- **Brotli** at the edge via **Cloudflare Free** (no custom nginx-brotli image). Origin still serves gzip.
- Never CDN-cache `/api/` or `/media/` (auth + private files). Do **not** enable Cloudflare “Cache Everything” globally.
- Covered by `npm run test:nginx-cache` in CI / `make test-front` — see [`docs/ops-testing.md`](docs/ops-testing.md)

**Cloudflare Free checklist (CDN)**

1. Add the site; orange-cloud DNS for `polyspace.mr` (or staging host) → VPS IP / Render
2. SSL/TLS: **Full (strict)** when origin has HTTPS; avoid Flexible long-term
3. Cache Rules:
   - Path starts with `/assets/` → Eligible to cache, long Edge TTL, Browser TTL = Respect origin
   - `/`, `/index.html`, HTML shell → **Bypass** cache
   - Path starts with `/api/` or `/media/` → **Bypass** always
4. Speed → Optimization → **Brotli** On
5. Free-tier note: CDN speeds **repeat** SPA loads; Render dynos can still **cold-start** on first HTML/API hit — wake `/api/healthz/` before a demo, or use Phase 19 VPS for always-on

**Free-tier playbook**

- Repeat visit: browser + CF serve hashed JS/CSS from cache; only tiny HTML + API round-trips
- Deploy: new asset hashes + HTML no-cache → officers get the new UI without purge of `/assets/`
- Measure origin: `curl -sI -H 'Accept-Encoding: gzip' https://…/assets/index-….js` → `Content-Encoding: gzip`
- Through CF (modern browser / `br`): expect Brotli when supported

### Background jobs (Phase 21)

Celery + Redis (broker DB0) already power OTP email. Phase 21 adds domain jobs:

- **Async Excel/CSV import:** `POST /api/v1/eleves/import/` → **202** `{ id }` then poll `GET /api/v1/eleves/import/jobs/<uuid>/`. Limits: **5 Mo**, **5000 rows**. Errors CSV: `.../errors/`. Sync only when `CELERY_TASK_ALWAYS_EAGER` or `?sync=1` (DEBUG/staff).
- **Async Excel export:** `POST /api/v1/eleves/export/` `{ format: "xlsx", filters, columns }` → poll `GET /api/v1/eleves/export/jobs/<uuid>/` → download `.../fichier/`. **PDF export stays in the browser.**
- **Photo WebP thumbs:** after `DocumentEleve` photo upload, Celery writes `_128.webp` / `_320.webp` variants; paths on the model / serializer.
- Upload memory: `DATA_UPLOAD_MAX_MEMORY_SIZE` / `FILE_UPLOAD_MAX_MEMORY_SIZE` = 6M (nginx `client_max_body_size`).
- Compose nginx: `proxy_read_timeout 180s` on `/api/`.
- Covered by etudiants job tests in CI / `make test` (or run worker + real Redis).

### Client resilience (Phase 22)

- Axios default timeout **90s**; multipart / import upload **180s** (`apiConstants.js`, `withUploadTimeout`)
- Vite proxy `/api` + `/media`: **120s** (`timeout` + `proxyTimeout`) — was 5s
- **401** → single-flight cookie refresh → retry once; refresh fail → `esp:auth-expired` → login
- Transient retry on **GET** only: network / timeout / 408 / 429 / 502–504, max 2 with backoff
- Auth bootstrap timeout **15s** (hard fallback 20s)
- Smoke (browser): slow API >5s works locally; expire access cookie → list recovers; kill refresh → login

### Durable media (Phase 23)

- **S3-compatible storage** via `django-storages` when `USE_S3_MEDIA=true` (MinIO on Compose/VPS; same env for Cloudflare R2 / AWS S3)
- Compose services: `minio` + `minio-init` (private bucket `polyspace-media`); backend/celery get `AWS_*` + `AWS_S3_ENDPOINT_URL=http://minio:9000`
- Photo WebP thumbs write through **`default_storage`** (not `MEDIA_ROOT` only)
- One-shot migrate: `python manage.py migrate_media_to_s3 [--dry-run] [--source-dir …]`
- Health: `/api/healthz/` reports `storage` when S3 enabled; set `HEALTHZ_REQUIRE_STORAGE=true` to fail hard (Phase 25 also gates Redis via `HEALTHZ_REQUIRE_REDIS`)
- Env: see `backend/.env.example` (Phase 23–24 block)
- Covered by etudiants media tests in CI / `make test` — see [`docs/ops-testing.md`](docs/ops-testing.md)

**R2 switch (no code change):** set `USE_S3_MEDIA=true`, `AWS_S3_ENDPOINT_URL=https://<accountid>.r2.cloudflarestorage.com`, R2 access keys, `AWS_STORAGE_BUCKET_NAME=…`, `AWS_S3_REGION_NAME=auto`.

### Protected media delivery (Phase 24)

| Deploy | USE_S3_MEDIA | MEDIA_DELIVERY | Behavior |
|--------|--------------|----------------|----------|
| Render / VPS / Compose+MinIO | true or false | **stream** (default) | Gunicorn streams from `default_storage` |
| Compose local disk only | false | **xaccel** | `X-Accel-Redirect` → nginx `/protected-media/` |

- Object RBAC: `/media/<path>` requires role cap **media** + file owned by an élève in scope (or import/export job owner / staff)
- Responses: `Cache-Control: private, no-store`
- Front: `mediaUrl()` prefixes `/media/…` with API origin when `VITE_API_BASE_URL` is absolute (split hosting)
- Never CDN-cache `/media/` (Phase 20 rule unchanged)
- Covered by etudiants media delivery tests in CI / `make test` — see [`docs/ops-testing.md`](docs/ops-testing.md)

### Backups (Phase 26)

**Production source of truth = VPS** (Phase 19). Render free Postgres is staging-only (no PITR; best-effort export).

| Asset | Script | Notes |
|-------|--------|-------|
| Postgres | [`scripts/backup/backup_db.sh`](scripts/backup/backup_db.sh) | `pg_dump -Fc` + `.sha256` |
| Media | [`scripts/backup/backup_media.sh`](scripts/backup/backup_media.sh) | S3/`mc` mirror or local/compose tar |
| Daily | [`scripts/backup/backup_all.sh`](scripts/backup/backup_all.sh) | Both + retention `BACKUP_KEEP_DAYS` (default **14**) |
| Restore DB | [`scripts/backup/restore_db.sh`](scripts/backup/restore_db.sh) | Requires `CONFIRM_RESTORE=YES`; refuses prod DB unless `ALLOW_PROD_RESTORE=YES` |
| Restore media | [`scripts/backup/restore_media.sh`](scripts/backup/restore_media.sh) | Staging dir/bucket only by default |
| Drill | [`scripts/backup/restore_drill.sh`](scripts/backup/restore_drill.sh) | Quarterly — see [`docs/runbooks/restore-drill.md`](docs/runbooks/restore-drill.md) |

- Cron example: [`scripts/backup/polyspace-backup.cron.example`](scripts/backup/polyspace-backup.cron.example) (02:15 UTC)
- Permissions: `chmod 700` on `BACKUP_ROOT` (default `/var/backups/polyspace`); optional `BACKUP_ENCRYPT_RECIPIENT` + `age`
- Secrets: do not commit `.env` or dumps; load cron secrets from a root-only env file
- **PITR (Phase 26b):** daily dumps first; WAL/PITR when prod Postgres is confirmed on VPS — [`docs/runbooks/restore-pitr.md`](docs/runbooks/restore-pitr.md)
- Restore drill: `make backup-drill` (`scripts/backup/restore_drill.sh`) — see [`docs/ops-testing.md`](docs/ops-testing.md)

### Route code splitting (Phase 28)

- Officer/student pages load via `React.lazy` + `Suspense` (`PageFallback`); login/recovery/set-password stay eager
- Vite `manualChunks`: `vendor-react`, `vendor-charts` (recharts), `vendor-export` (jspdf/xlsx/docx/…)
- Smoke: `npm run build` → separate page chunks + vendor chunks; login shell does not download export libs first

### React Query (Phase 27)

- `@tanstack/react-query` provider in `main.jsx` (outside `AuthProvider`); DevTools in DEV only
- Shared `queryClient` + `queryKeys` factory; `staleTime` 30s; logout / `esp:auth-expired` → `queryClient.clear()`
- Lists/dashboard use `useQuery` (replaces `useFetch`); élève CRUD invalidates `queryKeys.eleves.all`
- Thin hooks: `useElevesPage`, `useDashboardStats`, `useInvalidateEleves`
- Smoke: Dashboard → Dossiers → back uses cache; edit élève refreshes lists; logout clears cache

### Error boundaries + honest states (Phase 29)

- `ErrorBoundary` (root) + `RouteErrorBoundary` (MainLayout / StudentLayout / App routes) — render crash → Réessayer / accueil, reset on pathname
- Shared: `QueryErrorPanel`, `EmptyState`, `LoadingBlock`, `QueryState`
- Honesty: API error ≠ empty list; empty DB ≠ « filtres »; filters empty → Effacer les filtres
- Applied on ops lists, dossiers, dashboard, droits, présence, export

### Ops module shell (Phase 30)

- Shared UI under `src/components/ops/`: `OpsModuleShell`, `OpsFicheShell`, `OpsStatCard`, `OpsFilterSelect`, `OpsStudentRow`, …
- Équipement / sanctions / demandes / médical / journal / scolarité list pages use the shell; still call real `/api/v1/` operations endpoints
- Dashboard `common/StatCard` unchanged (large KPI); ops use compact `OpsStatCard`
- Smoke: `npm run build`; open équipement list → fiche → back; offline API shows Réessayer not « aucun dossier »

### i18n + accessibility (Phase 35)

- FR/AR via i18next; `html[lang]` + `dir`; preference `localStorage.polyspace_lang`
- Arabic student names: `prenom_ar` / `nom_famille_ar` (optional) on create/fiche
- Modal focus trap + DataTable `aria-sort` / keyboard rows; skip link; jsx-a11y + axe smoke in CI
- Docs: [`docs/ops-i18n-a11y.md`](docs/ops-i18n-a11y.md) · E2E: `e2e/smoke.a11y-rtl.spec.js`
- Official PDF exports remain French-primary this phase

### Capacity & SLOs (Phase 37)

- Targets: availability 99.5%; login p95 &lt; 2s; list/detail p95 &lt; 1s (prod VPS)
- Staging k6 `officers-100` = go-live gate only (looser thresholds)
- Docs: [`docs/ops-slo-capacity.md`](docs/ops-slo-capacity.md) · reports: [`docs/load-reports/`](docs/load-reports/)

### Disaster recovery (Phase 38)

- RPO ≤ 24h / RTO ≤ 4–8h until PITR; Render staging is not a DR site
- Officer IT runbooks (FR): [`docs/runbooks/officer-it/`](docs/runbooks/officer-it/)
- Ops: [`docs/ops-disaster-recovery.md`](docs/ops-disaster-recovery.md) · printable pack: [`docs/polyspace-ops-SLO-DR.docx`](docs/polyspace-ops-SLO-DR.docx)

### Field-level access (Phase 7)

- API strips/masks **NNI**, **dossier santé**, **contacts parents** by role (`sensitive_caps` on `/auth/me/`)
- Superviseur: NNI masked (`******` + 4 last digits); no santé / parents
- Chef section → groupement: full view, no edit of those fields
- Commandant d’unité + administrateur: full view + edit
- Étudiant: own dossier only, full view, no edit
- Forbidden writes return **403** (not silent drop)
- Django admin (staff) bypasses SPA caps — intentional for Phase 7
