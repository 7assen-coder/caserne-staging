# Restore drill checklist (Phase 26)

**Cadence:** every **90 days**, and after any change to backup scripts.

1. Identify latest successful dump under `$BACKUP_ROOT/db/` (+ media archive if needed)
2. Verify `.sha256` matches
3. Restore into non-prod DB:  
   `CONFIRM_RESTORE=YES PGDATABASE=esp_drill ./scripts/backup/restore_db.sh path/to.dump`  
   (or `./scripts/backup/restore_drill.sh`)
4. Optionally restore media to staging dir/bucket:  
   `CONFIRM_RESTORE=YES ./scripts/backup/restore_media.sh path/to/media_….tar.gz`
5. Point a staging API at `esp_drill` (`DEBUG=False`)
6. Verify:
   - `GET /api/readyz/` → 200
   - Login works
   - Open 1 élève
   - Open 1 media file (if media restored)
7. Fill report: date, operator initials, backup ID, duration, pass/fail, notes  
   → `$BACKUP_ROOT/drills/drill_YYYYMMDD.txt`
8. Drop drill DB / delete staging media copy
9. Do **not** commit reports with hostnames into public git

**Safety:** restore scripts refuse production DB/bucket unless `ALLOW_PROD_RESTORE=YES`.
