# Rollback release (ops)

Redeploy a **previous known-good git tag** on the VPS.

## When

- New tag causes P0/P1 (errors, login broken, mass 5xx)
- Smoke after deploy fails (`/api/readyz/`, login, 1 élève)

## Steps

1. Identify last good tag (from deploy log / GitHub releases).
2. From ops machine or VPS clone:  
   `./scripts/deploy-prod.sh <previous-tag>`
3. Smoke: `/api/readyz/`, login, open 1 élève, 1 media.
4. If failure is a **forward-only migration** that already ran:
   - Do **not** casually reverse schema on prod
   - Prefer fix-forward hotfix tag, or restore DB from backup with dual approval ([ops-disaster-recovery.md](../ops-disaster-recovery.md))

## Never

- Point production at Render staging DB
- Load-test production to “force” recovery
