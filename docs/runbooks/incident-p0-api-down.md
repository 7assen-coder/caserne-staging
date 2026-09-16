# Incident P0 — API / site down (ops)

**Audience:** ops technique. Officers’ IT: [officer-it/01-site-inaccessible.md](officer-it/01-site-inaccessible.md).

## Trigger

Uptime Kuma: Prod API or Prod SPA down **&gt; 3 min**, or SLO-LOGIN/LIST breach **&gt; 15 min** continuous ([ops-slo-capacity.md](../ops-slo-capacity.md)).

## Steps

1. Confirm on `https://status.polyspace.mr` and from an external network.
2. SSH to VPS → `cd /opt/polyspace/app`
3. `docker compose -f docker-compose.prod.yml --env-file .env.prod ps`
4. Logs: `docker compose -f docker-compose.prod.yml logs --tail=200 backend` (and `caddy`, `db`, `redis`, `celery` as needed)
5. Quick health: `curl -fsS https://api.polyspace.mr/api/healthz/` and `https://polyspace.mr/healthz`
6. If bad release suspected → [rollback-release.md](rollback-release.md)
7. If data corruption suspected → **do not** restore prod until drill path; see [ops-disaster-recovery.md](../ops-disaster-recovery.md)
8. Update status page / notify primary contacts when mitigated

## Close

Note start/end time for error-budget tracking (Phase 37).
