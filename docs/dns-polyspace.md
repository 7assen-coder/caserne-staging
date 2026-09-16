# DNS — polyspace.mr (Phase 31)

Production lives on the **Hostinger VPS**. Staging stays on **Render** (`*.onrender.com`).

## Records (at Hostinger DNS / registrar)

Replace `VPS_PUBLIC_IP` with the VPS public IPv4.

| Type | Host / name | Value | Purpose |
|------|-------------|--------|---------|
| A | `@` | `VPS_PUBLIC_IP` | https://polyspace.mr |
| A | `www` | `VPS_PUBLIC_IP` | https://www.polyspace.mr |
| A | `api` | `VPS_PUBLIC_IP` | https://api.polyspace.mr |

Optional (ops only — prefer SSH tunnel instead of public DNS):

| Type | Host | Value | Purpose |
|------|------|--------|---------|
| A | `status` | `VPS_PUBLIC_IP` | Uptime Kuma (add Caddy + basic auth if exposed) |
| A | `grafana` | `VPS_PUBLIC_IP` | Grafana UI (same) |

## Do not

- Point `polyspace.mr` or `api.polyspace.mr` at Render if the VPS is production.
- Share the Render Postgres with the VPS (two databases, always).

## Staging (no DNS required)

| URL | Role |
|-----|------|
| https://gesesp.onrender.com | SPA test |
| https://gesesp-api.onrender.com | API test |

Optional later: `CNAME demo.polyspace.mr` → `gesesp.onrender.com` (and API CNAME to Render hostname).

## After DNS

1. Wait for propagation (`dig +short polyspace.mr`).
2. On VPS: `./scripts/deploy-prod.sh <tag>` — Caddy obtains Let's Encrypt certs.
3. Smoke: `curl -fsS https://api.polyspace.mr/api/healthz/`
4. Create prod superuser (VPS shell): `docker compose -f docker-compose.prod.yml --env-file .env.prod exec backend python manage.py create_esp_superuser --email …`

## Mac (laptop) tools

```bash
brew install --cask docker
brew install git gh jq curl
```
