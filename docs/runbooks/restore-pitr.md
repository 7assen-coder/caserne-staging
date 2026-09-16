# Point-in-time recovery (Phase 26b) — Polyspace / VPS Postgres

**RPO note (Phase 38):** RPO improves to **≤ 15 minutes** only **after** PITR is enabled and drilled. Until then, production RPO remains **≤ 24 hours** (daily `pg_dump`). See [ops-disaster-recovery.md](../ops-disaster-recovery.md).

Day-one Phase 26 ships **daily `pg_dump -Fc` only**. Enable PITR after production
Postgres is confirmed on the Hostinger VPS (Docker or host install).

## When to enable

- Production DB runs on the VPS (not Render free Postgres)
- Daily dumps are already green for ≥7 days
- Ops can store WAL off-box (second disk or S3/R2 prefix)

## Postgres settings (sketch)

```conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/backups/polyspace/wal/%f && cp %p /var/backups/polyspace/wal/%f'
# or wal-g / pgBackRest to S3
```

- Base backup weekly (`pg_basebackup` or wal-g backup-push)
- Retain WAL ≥ `BACKUP_KEEP_DAYS` (default 14)
- Test restore to a scratch instance quarterly (same drill cadence as Phase 26)

## Restore to a timestamp (outline)

1. Restore base backup to a new data directory
2. Create `recovery.signal` / set `restore_command` and `recovery_target_time`
3. Start Postgres, promote, point staging API at it
4. Smoke: `/api/readyz/`, login, 1 élève, 1 media
5. Record drill report under `/var/backups/polyspace/drills/`

## Render staging

Free Render Postgres has **no PITR**. Treat staging dumps as best-effort;
production backups = VPS.
