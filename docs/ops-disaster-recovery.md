# Ops — disaster recovery (Phase 38)

**Production:** Hostinger VPS (`polyspace.mr`).  
**Staging Render is not a DR site** for production officer / élève PII.

Related: [ops-slo-capacity.md](ops-slo-capacity.md) · [runbooks/restore-drill.md](runbooks/restore-drill.md) · [runbooks/restore-pitr.md](runbooks/restore-pitr.md) · [README backup section](../README.md)

---

## A. Definitions

| Term | Plain language | Technical |
|------|----------------|-----------|
| **RPO** | How much data we can afford to lose | Max age of last good backup at failure time |
| **RTO** | How long the service may stay down | Time from declare-incident to smoke-pass on prod |

---

## B. Published targets (production VPS)

| Scenario | RPO | RTO | Mechanism |
|----------|-----|-----|-----------|
| Accidental delete / bad deploy (logical) | **≤ 24 h** (daily dump) | **≤ 4 h** | `pg_dump` + media restore; dual approval for prod |
| VPS disk failure / host loss | **≤ 24 h** | **≤ 8 h** | Off-box dumps + media; rebuild compose from git tag |
| Regional / full Hostinger outage | **≤ 24 h** | **≤ 48 h** (best effort) | New VPS + DNS cutover; **not** failover to Render for prod data |
| After PITR enabled (Phase 26b) | **≤ 15 min** | **≤ 4 h** | WAL + base backup — only when PITR is live |

Until PITR is enabled and drilled, treat **RPO = 24 h**.

---

## C. Backup inventory

| What | Script | Notes |
|------|--------|--------|
| Postgres | [`scripts/backup/backup_db.sh`](../scripts/backup/backup_db.sh) | `pg_dump -Fc` + `.sha256` |
| Media (MinIO / files) | [`scripts/backup/backup_media.sh`](../scripts/backup/backup_media.sh) | `mc` mirror or tar |
| Daily both | [`scripts/backup/backup_all.sh`](../scripts/backup/backup_all.sh) | Retention `BACKUP_KEEP_DAYS` (default **14**) |
| Cron | [`scripts/backup/polyspace-backup.cron.example`](../scripts/backup/polyspace-backup.cron.example) | **02:15 UTC** |
| Restore DB | [`scripts/backup/restore_db.sh`](../scripts/backup/restore_db.sh) | `CONFIRM_RESTORE=YES`; prod needs `ALLOW_PROD_RESTORE=YES` |
| Restore media | [`scripts/backup/restore_media.sh`](../scripts/backup/restore_media.sh) | Staging target by default |
| Drill | [`scripts/backup/restore_drill.sh`](../scripts/backup/restore_drill.sh) | See [restore-drill.md](runbooks/restore-drill.md) |

**Backed up:** Postgres, MinIO/media.  
**Not backed up (acceptable):** Redis cache/OTP keys; Prometheus/Loki local data (rebuild).

### Off-box copy (required)

- [ ] Daily dumps also land on a **second location** (Hostinger backup disk, second VPS path, or S3/R2).
- [ ] Access to off-box copy tested at least once per drill.
- [ ] `BACKUP_ROOT` permissions `chmod 700`; optional `BACKUP_ENCRYPT_RECIPIENT` + `age`.

Do not commit backup paths with credentials into public git.

---

## D. Restore decision tree

1. **Classify** — data loss vs outage vs wipe / ransomware-like.
2. **Preserve evidence** — snapshot volumes if possible; do not overwrite last good dump.
3. **Prefer drill first** — restore into `esp_drill` ([restore-drill.md](runbooks/restore-drill.md)).
4. **Prod restore** — only with `ALLOW_PROD_RESTORE=YES` + **dual approval** (ops initials + supervisor initials).
5. **Smoke** — `GET /api/readyz/` → login → 1 élève → 1 media file.
6. **Report** — `$BACKUP_ROOT/drills/drill_YYYYMMDD.txt` (date, operator, backup ID, duration, pass/fail).

Officer IT intake form: [officer-it/05-demande-restauration.md](runbooks/officer-it/05-demande-restauration.md).

---

## E. Cadence

| Activity | When |
|----------|------|
| Restore drill | Every **90 days** ([restore-drill.md](runbooks/restore-drill.md)) |
| Extra drill | Within **14 days** after any backup script change |
| Tabletop “VPS gone” | **Annual**, ~30 min with officer IT |
| Daily verify | Ops: [backup-verify-daily.md](runbooks/backup-verify-daily.md) |

---

## F. Related runbooks

| Audience | Doc |
|----------|-----|
| Officers’ IT (FR) | [runbooks/officer-it/](runbooks/officer-it/) |
| Ops P0 API down | [runbooks/incident-p0-api-down.md](runbooks/incident-p0-api-down.md) |
| Rollback release | [runbooks/rollback-release.md](runbooks/rollback-release.md) |
| PITR (future) | [runbooks/restore-pitr.md](runbooks/restore-pitr.md) |

---

## Change log

| Date | Note |
|------|------|
| 2026-09 | Phase 38 initial publication |
