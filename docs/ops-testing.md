# Ops — testing & CI

**Supported local interface:** root [`Makefile`](../Makefile) (`make help`).  
**Source of truth for merge gates:** GitHub Actions [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (`ci-ok`).

## Quality pyramid

1. **Unit** — Django (`accounts`, `etudiants`, `operations`, `backend.tests`) + Vitest
2. **Contract** — `/api/v1` URL hygiene (`backend.tests.test_api_v1_contract`), nginx cache headers (`npm run test:nginx-cache`)
3. **PR E2E** — Playwright login-page + a11y/RTL smokes (no secrets)
4. **Staging** — optional full-login Playwright + k6 ([`load-staging.yml`](../.github/workflows/load-staging.yml))
5. **Ops drills** — backup restore (`make backup-drill`), live readyz (`make smoke-readyz`)

## Keep / delete / ops-only

| Path | Policy |
|------|--------|
| `backend/*/tests/`, `ScolariteMilitaireFront/e2e/`, Vitest `*.test.js` | **Keep** — automated suites |
| `scripts/backup/`, `load/k6/`, `scripts/smoke_scale_readyz.sh` | **Ops-only** — not unit tests; use Makefile wrappers |
| Playwright `test-results/`, `playwright-report/` | **Never commit** (gitignored) |
| One-shot `smoke_phase*.sh` archives | **Removed** — covered by CI / Makefile (map below) |

## Coverage map (former phase smokes)

| Former smoke | Replacement |
|--------------|-------------|
| Jobs (phase 21) | `etudiants` job tests in CI / `make test` |
| Media (phase 23–24) | `etudiants` media tests in CI / `make test` |
| Health (phase 25) | `backend.tests` health modules; live: `make smoke-readyz` |
| Backup (phase 26) | `scripts/backup/restore_drill.sh` → `make backup-drill` |
| SPA cache (phase 20) | `npm run test:nginx-cache` (assert nginx.conf) in CI / `make test-front` |
| Client resilience (phase 22) | Staging manual checklist below |

## Local — preferred commands

```bash
# From repo root (esp_management/)
make test              # Django labeled tests (CI-parity env)
make test-docker       # Same suite in docker-compose.test.yml
make test-front        # lint:ci + vitest + nginx cache assert
make test-e2e          # Playwright PR subset
make test-ci-local     # backend + front + e2e (closest to GHA)
make migrate-check
make audit
make backup-drill      # needs CONFIRM_RESTORE / local Postgres — see scripts/backup
make smoke-readyz      # BASE_URL=… against a live API
make help
```

### Backend without Make

```bash
cd backend
export SECRET_KEY='ci-test-key-polyspace-phase33-xxxxxxxxxxxxxxxxxxxxxxxxxx'
export DEBUG=False DJANGO_ENV=local USE_LOCMEM_CACHE=True HEALTHZ_REQUIRE_REDIS=False SECURE_SSL_REDIRECT=False
# DB_* → local Postgres (see docker compose / .env)
.venv311/bin/python manage.py makemigrations --check --dry-run
.venv311/bin/python manage.py test accounts etudiants operations backend.tests -v 2
```

### Frontend without Make

```bash
cd ScolariteMilitaireFront
npm ci
npm run lint:ci
npm run test:nginx-cache
npm run test
npm run build
npx playwright install chromium
npm run test:e2e -- e2e/smoke.login-page.spec.js e2e/smoke.a11y-rtl.spec.js
```

**i18n / a11y:** FR/AR switch, `dir=rtl`, axe smoke — see [`ops-i18n-a11y.md`](ops-i18n-a11y.md).

### Staging E2E (optional; not PR CI)

```bash
export E2E_BASE_URL=https://gesesp.onrender.com
export E2E_API_URL=https://gesesp-api.onrender.com
export E2E_EMAIL='…@esp.mr'
export E2E_PASSWORD='…'
export E2E_SKIP_WEBSERVER=1
npm run test:e2e -- e2e/auth.login.spec.js e2e/eleves.list.spec.js
```

Never commit credentials. `e2e/smoke.health.spec.js` needs `E2E_API_URL`; not default PR CI.

## Staging manual checklist (client resilience)

Use against staging or local Vite + API when validating timeouts/session UX:

1. **Slow API** — with backend cold/slow, login/dossiers requests longer than 5s must still succeed (proxy ~120s).
2. **Session refresh** — log in with remember me; delete only `esp_access` (keep `esp_refresh`); list load recovers without full re-login.
3. **Session expiry** — delete `esp_refresh` (and access); any API GET lands on `/login`.
4. **Transient GET** — stop API briefly mid-navigation, restart; list GET retries (max 2) and recovers within ~90s.
5. **Uploads** — multi-file photo/PDF client timeout 180s; Excel import upload 180s, processing async (“Import en cours…”).

## GitHub Actions

Workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) on push/PR to `demo/oracle-hassen` and `main`:

1. **backend** — `pip-audit`, migrate, `makemigrations --check`, `manage.py test accounts etudiants operations backend.tests`
2. **frontend** — `npm ci`, `npm audit`, `lint:ci`, nginx cache assert, vitest, build, Playwright login-page + a11y
3. **ci-ok** — aggregate for branch protection

Local parity: `make test-ci-local` / `make test-docker`.

**Human step:** GitHub → Settings → Branches → require status check **`ci-ok`** before merge to `main`.

Load tests: [`.github/workflows/load-staging.yml`](../.github/workflows/load-staging.yml) (`workflow_dispatch` + weekly). Secrets: `K6_EMAIL`, `K6_PASSWORD`, optional `STAGING_API_URL`.

## Deploy gate

Before `./scripts/deploy-prod.sh <tag>`:

1. [ ] CI green on the tagged commit (`ci-ok`)
2. [ ] Staging smoke PASS (section below)
3. [ ] k6 `officers-100` **PASS** within the last 7 days (report under [`docs/load-reports/`](load-reports/)) — optional stretch for small releases
4. [ ] Then deploy

Helper (optional, needs `gh`):

```bash
./scripts/check-ci-green.sh demo/oracle-hassen
```

## Staging smoke & demo readiness (gesesp)

**Targets:** SPA `https://gesesp.onrender.com` · API `https://gesesp-api.onrender.com`

### Cold start (expected on free Render)

Free instances sleep after idle. First hit can take **30–60s**. Wake before a demo:

```bash
curl -sS -o /dev/null -w '%{http_code} %{time_total}\n' https://gesesp-api.onrender.com/api/healthz/
curl -sS -o /dev/null -w '%{http_code} %{time_total}\n' https://gesesp.onrender.com/
```

Treat cold start as **expected**, not a product defect. Staging gates in [`ops-slo-capacity.md`](ops-slo-capacity.md) assume a **warm** API.

### Smoke checklist

1. [ ] Hard refresh SPA (new Vite assets)
2. [ ] Login `EmEm@esp.mr` → dashboard, no forced password modal
3. [ ] `/eleves/dossiers` loads; pagination `page_size=25`
4. [ ] Import 3A/4A (or fixture) → list + dashboard update **without** full browser refresh
5. [ ] Répartition par compagnie shows assigned compagnies after import
6. [ ] Phone-width (~375): dossiers filters usable, no horizontal page scroll
7. [ ] Warm login / list p95 within staging gate (manual stopwatch or k6 smoke)

### Scale readiness (staging ≠ prod)

| Area | Staging now | Prod path |
|------|-------------|-----------|
| Dyno | Free / sleep | Always-on VPS / paid |
| Celery | Often eager | Worker + Redis |
| Media | Ephemeral risk | MinIO / S3 |
| Scale | Single instance | See [`ops-horizontal-scale.md`](ops-horizontal-scale.md) |

Do **not** promote to `polyspace.mr` until CI green + staging smoke PASS + capacity assumptions in [`ops-slo-capacity.md`](ops-slo-capacity.md) still hold.

## Load testing

See [`load/k6/README.md`](../load/k6/README.md). Report template: [`docs/load-reports/TEMPLATE.md`](load-reports/TEMPLATE.md).
