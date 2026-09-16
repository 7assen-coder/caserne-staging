# Backup verify — daily (ops)

**Goal:** latest production dump younger than **26 hours**, checksum OK.

## Steps

1. On VPS (or backup host): list `$BACKUP_ROOT/db/` (default `/var/backups/polyspace/db/`).
2. Confirm newest `*.dump` (or archive) **mtime &lt; 26h**.
3. Verify matching `.sha256` (e.g. `sha256sum -c …`).
4. Confirm media backup sibling exists for the same day (or document media-less day with reason).
5. Confirm **off-box** copy present ([ops-disaster-recovery.md](../ops-disaster-recovery.md) checklist).
6. If missing/failed → treat as **P1**, re-run `scripts/backup/backup_all.sh`, page backup ops.

## Cadence

Every morning (or first ops check after 02:15 UTC cron).  
Full restore drill remains every **90 days** — [restore-drill.md](restore-drill.md).
