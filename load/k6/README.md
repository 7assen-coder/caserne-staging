# k6 load tests — Phase 34 (+ Phase 37 SLO alignment)

Target: **staging API only** (default `https://gesesp-api.onrender.com`). Never point at production.

**SLOs:** Production targets live in [`docs/ops-slo-capacity.md`](../../docs/ops-slo-capacity.md) (stricter: login p95 &lt; 2s, list p95 &lt; 1s).  
This folder’s `officers-100` script is a **staging go-live gate** (login &lt; 3s, list/detail &lt; 2s) — PASS does not prove prod SLOs.

## Install

```bash
brew install k6
# or: docker pull grafana/k6
```

## Wake Render free dyno first

```bash
curl -fsS --max-time 120 https://gesesp-api.onrender.com/api/healthz/
```

## Smoke (5 VUs, 1 min)

```bash
k6 run -e BASE_URL=https://gesesp-api.onrender.com \
  -e K6_EMAIL='officer@esp.mr' \
  -e K6_PASSWORD='…' \
  load/k6/smoke.js
```

## Go-live gate (100 concurrent officers)

```bash
k6 run -e BASE_URL=https://gesesp-api.onrender.com \
  -e K6_EMAIL='officer@esp.mr' \
  -e K6_PASSWORD='…' \
  --out json=docs/load-reports/run-$(date +%Y%m%d).json \
  load/k6/officers-100.js
```

Then copy metrics into `docs/load-reports/YYYY-MM-DD-officers-100.md` from `TEMPLATE.md`.

## Notes

- Auth uses CSRF + httpOnly cookies (`esp_access`), same as the SPA.
- One shared staging user can trigger **login lockout** under 100 VUs — prefer several seed officers for a formal gate, or raise lockout limits on staging only for the test window.
- Example user file: [`users.json.example`](users.json.example) (not used by default scripts).
