# Ops — horizontal scale (Phase 40)

**Goal:** run **N** Gunicorn API replicas (and optional N Celery workers) on the VPS without sticky sessions or local disk for media.

## Shared state (required)

| Concern | Shared store | Prod setting |
|---------|--------------|--------------|
| Data | Postgres | `db` service |
| Cache / login lockout / sessions | Redis | `USE_LOCMEM_CACHE=False`, `REDIS_URL`, `HEALTHZ_REQUIRE_REDIS=True` |
| Media / uploads | MinIO (S3 API) | `USE_S3_MEDIA=True`, `MEDIA_DELIVERY=stream` |
| Jobs | Celery + Redis broker | `CELERY_TASK_ALWAYS_EAGER=False` |
| Auth | Stateless JWT cookies | No sticky session needed |

Django raises `ImproperlyConfigured` if `DJANGO_ENV=production` with locmem cache or without S3 media, or if `BACKEND_REPLICAS>1` with locmem.

## Scale on one VPS

```bash
cd /opt/polyspace/app
export BACKEND_REPLICAS=2   # optional; informs Django guard
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d \
  --scale backend=2 --scale celery=2
```

Caddy (`deploy/Caddyfile`) reverse-proxies `backend:8080` with **round_robin** and `health_uri /api/readyz/` (Compose DNS RR).

**Do not** mount a local `media` volume on backend replicas.

## Capacity formula (~100 officers)

| Layer | Starting point | Notes |
|-------|----------------|-------|
| Backend replicas | 1 → **2** under sustained p95 miss | Each with `GUNICORN_WORKERS=3`–`4`, `THREADS=2` |
| Celery | concurrency 2 → scale workers | Import/export bursts |
| Postgres | single primary | Add **PgBouncer** later; then `CONN_MAX_AGE=0` |
| Redis | single | Consider `maxmemory-policy allkeys-lru` on cache DB |
| MinIO | single node on VPS | Multi-VPS → external R2/S3 (same env vars) |
| Frontend | 1× nginx | CDN later if needed |

See also [`ops-slo-capacity.md`](ops-slo-capacity.md).

## Staging (Render)

Render **free / single instance** is **not** a horizontal-scale path. Use it for feature testing only. True multi-replica is the **VPS production** path (`polyspace.mr`).

## Smoke after scale

```bash
curl -sf https://api.polyspace.mr/api/readyz/ | jq .
# Login 20× from SPA or:
# for i in $(seq 1 20); do curl -sf -c /tmp/cj -b /tmp/cj .../api/v1/auth/login/ ; done
```

Cookies must work across replicas (JWT in httpOnly cookies + shared Redis for any session/cache).
