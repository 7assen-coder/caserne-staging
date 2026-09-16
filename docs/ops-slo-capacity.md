# Ops — capacity plan & SLOs (Phase 37)

**Production host:** Hostinger VPS (`polyspace.mr` / `api.polyspace.mr`).  
**Staging:** Render (`polyspace*.onrender.com`) — go-live **gate** only; cold start allowed; **not** measured against prod SLOs.

Related: [ops-observability.md](ops-observability.md) · [ops-testing.md](ops-testing.md) · [ops-disaster-recovery.md](ops-disaster-recovery.md) · [load/k6/README.md](../load/k6/README.md)

---

## A. Scope & assumptions

| Assumption | Value |
|------------|--------|
| Concurrent users | **≤ 100 officers** (authenticated SPA) |
| Data volume | **≤ 3000 élèves** in Postgres (not 3000 student logins) |
| Student portal | Out of scope until product adds student accounts |
| Production | Always-on VPS (Docker Compose + Caddy) |
| Staging | Render free may sleep (~30–60s first hit) |
| Peak windows | Weekday mornings **07:30–10:00** local; exam / inscription periods |

If concurrent load or élève count grows beyond this, re-run capacity sizing (section D) before changing SLOs.

---

## B. Service catalog

| Service | Prod URL / location | Criticality |
|---------|---------------------|-------------|
| SPA | `https://polyspace.mr` | **P0** |
| API | `https://api.polyspace.mr` | **P0** |
| Postgres / Redis / MinIO / Celery | VPS `docker-compose.prod.yml` | **P0** |
| Status (Uptime Kuma) | `https://status.polyspace.mr` | **P1** |
| Grafana (ops only) | tunnel / `grafana.polyspace.mr` | **P1** |
| Staging SPA + API | `*.onrender.com` | **P2** — no paging for cold start |

---

## C. SLO targets (production)

| ID | Indicator | Target | Window | Notes |
|----|-----------|--------|--------|-------|
| SLO-AVAIL | Availability API + SPA | **99.5%** monthly | calendar month | Exclude planned maintenance announced ≥24h |
| SLO-LOGIN | `POST /api/v1/auth/login/` | **p95 &lt; 2s** | rolling 7d | Warm workers (not first boot) |
| SLO-LIST | Élèves list `?page=&page_size=25` | **p95 &lt; 1s** | rolling 7d | Paginated list only |
| SLO-DETAIL | Élève detail `GET` | **p95 &lt; 1s** | rolling 7d | |
| SLO-DASH | `GET …/dashboard-stats/` | **p95 &lt; 1.5s** | rolling 7d | |
| SLO-HEALTH | `GET /api/healthz/` | **p95 &lt; 300ms** | rolling 7d | |
| SLO-ERROR | API 5xx rate | **&lt; 0.5%** | rolling 7d | Exclude 401 / 403 |
| SLO-IMPORT | Bulk import job (Celery) | **&lt; 5 min** for ≤500 rows | per job | Not measured on HTTP request thread |

### Staging gate (not prod SLO)

k6 script [`load/k6/officers-100.js`](../load/k6/officers-100.js):

| Check | Staging gate |
|-------|----------------|
| Login p95 | &lt; **3s** |
| List / detail p95 | &lt; **2s** |
| Failed requests | &lt; 1% |
| Checks | &gt; 99% |

**Staging PASS = go-live gate** before `./scripts/deploy-prod.sh &lt;tag&gt;`. It does **not** prove production SLOs (stricter, always-on hardware).

---

## D. Capacity model (sizing)

### Rule of thumb

- Gunicorn workers ≈ `(2 × CPU cores) + 1`, plus threads if configured.
- Celery concurrency sized for import/export bursts (not equal to web VUs).
- Postgres: prefer `CONN_MAX_AGE` (prod default **600**) + keep max connections below Postgres `max_connections`.
- Redis: OTP, cache, Celery broker — must be up for `HEALTHZ_REQUIRE_REDIS=True`.

### Current prod compose defaults

From [`docker-compose.prod.yml`](../docker-compose.prod.yml):

| Setting | Default |
|---------|---------|
| `GUNICORN_WORKERS` | **4** (per replica) |
| `GUNICORN_THREADS` | **2** |
| Backend replicas | **1** (scale with `--scale backend=2`, see [ops-horizontal-scale.md](ops-horizontal-scale.md)) |
| `CONN_MAX_AGE` | **600** |
| Data paths | `/opt/polyspace/data/{postgres,redis,minio}` |
| Backups | `/var/backups/polyspace` (see Phase 26 / DR doc) |

**Horizontal scale (Phase 40):** prefer **2 replicas × 3–4 workers** before jumping VPS size, once Redis + MinIO are shared (already required in prod).

### Scale-up table

| Symptom | Action |
|---------|--------|
| p95 login or list above SLO for **≥3 consecutive days** | `--scale backend=2` (or raise workers); then VPS **4 vCPU / 8 GB** if still hot |
| Celery import backlog / SLO-IMPORT miss | `--scale celery=2` or raise concurrency; keep web workers unchanged |
| Disk ≥ **80%** on `/opt/polyspace` or `/var/backups/polyspace` | Expand volume; prune old media/backups within retention |
| Postgres connections near `max_connections` | Add PgBouncer; set `CONN_MAX_AGE=0` |
| Postgres CPU high with correct indexes | Add read replica only after DBA review (not day-one) |

Document actual VPS SKU in the private ops notes (do not commit host passwords).

---

## E. How we measure

| Source | What |
|--------|------|
| **Uptime Kuma** | SLO-AVAIL — monitors Prod API `/api/healthz/`, Prod SPA `/healthz` ([ops-observability.md](ops-observability.md)) |
| **Prometheus / Grafana** | Latency histograms for login / list / detail when Django metrics are scraped |
| **k6** | Weekly smoke; `officers-100` before each prod tag ([ops-testing.md](ops-testing.md)) |
| **Sentry** | Prod error volume / unresolved issues (`environment:production`) |
| **Load reports** | `docs/load-reports/YYYY-MM-DD-officers-100.md` |

### Checklist — latency metrics

- [ ] Django `/metrics` scraped on VPS network (Phase 32).
- [ ] Grafana panel: p95 for login, eleves list, eleves detail.
- [ ] If panels missing: add before claiming continuous SLO compliance (k6 gate still required for deploy).

---

## F. Error budget & escalation

| Item | Value |
|------|--------|
| Monthly availability target | 99.5% |
| Error budget | ≈ **3.6 hours** downtime / month |
| Budget &lt; **25%** remaining mid-month | Freeze non-critical deploys |
| SLO-LOGIN or SLO-LIST breached **&gt; 15 min** continuous | Open **P0/P1** incident — [incident-p0-api-down.md](runbooks/incident-p0-api-down.md) / officer IT escalate |

### Contacts (fill once — do not commit personal phones to public forks)

| Role | Name | Channel |
|------|------|---------|
| Primary ops | TBD_NAME | TBD_PHONE / Telegram |
| Backup ops | TBD_NAME | TBD_PHONE |
| Supervisor / commandement | TBD_NAME | TBD_PHONE |
| Hostinger support | ticket via panel | VPS contract ID TBD |

Officer-facing contacts: [runbooks/officer-it/00-contacts-et-statuts.md](runbooks/officer-it/00-contacts-et-statuts.md).

---

## G. Load-test calendar

| Cadence | Action |
|---------|--------|
| **Weekly** | `k6 run … load/k6/smoke.js` against **staging** (wake `/api/healthz/` first) |
| **Pre-release** | `officers-100.js` + report under `docs/load-reports/` (PASS within last **7 days** before prod tag) |
| **Quarterly** | Optional soak **30 min @ 50 VUs** on staging only — **never** load-test live production |

---

## Appendix — Grafana / alert stubs

Text-only rules (wire in Grafana when metrics exist):

1. **API down &gt; 3 min** — Uptime Kuma P0 (already documented).
2. **p95 élèves list &gt; 1s for 10 min** — Prometheus/Grafana on prod API.
3. **Disk &gt; 80%** on data or backup volumes — node exporter or host cron check.

---

## Change log

| Date | Note |
|------|------|
| 2026-09 | Phase 37 initial publication |
