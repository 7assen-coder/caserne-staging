# Ops — dependency hygiene (Phase 39)

## Policy

| Rule | Detail |
|------|--------|
| Lockfiles | Commit `ScolariteMilitaireFront/package-lock.json` and pin `backend/requirements.txt` |
| Install | **`npm ci`** only in CI and Docker (never `npm install` in images) |
| Prod Python | `pip install -r requirements.txt` — **no** `requirements-dev.txt` in prod image |
| Dev / seed | `pip install -r requirements-dev.txt` (includes Faker for `seed_students`) |
| Audits | CI runs `npm audit --omit=dev --audit-level=high` and `pip-audit -r requirements.txt` |
| Updates | Dependabot weekly PRs (`.github/dependabot.yml`) |

If an audit fails: fix or bump first. Temporary allowlist only with a tracked ticket listed below.

### Known allowlists

_None as of Phase 39._ Prod npm audit (`--omit=dev --audit-level=high`) must be clean.

### Overrides

- `image-size@2.0.4` forced via `package.json` `overrides` (pptxgenjs transitive CVE).

## Removed / deferred from initial load

| Package | Action |
|---------|--------|
| `mammoth` | Removed (unused) |
| `xlsx` | Removed; use dynamic `xlsx-js-style` only |
| `@tanstack/react-query-devtools` | `devDependencies` only (DEV gate in `main.jsx`) |
| `pptxgenjs` | Kept; **dynamic `import()`** on PPTX export |
| `Faker` | `requirements-dev.txt` only |

## Chunk sizes (after Phase 39)

Recorded with `npm run build` (Vite, Sep 2026):

| Chunk | ≈ size | gzip |
|-------|--------|------|
| `index-*.js` (app shell) | ~157 kB | ~51 kB |
| `vendor-react-*.js` | ~217 kB | ~70 kB |
| `vendor-charts-*.js` | ~536 kB | ~146 kB (lazy with charts) |
| `vendor-export-*.js` | ~1.3 MB | ~457 kB (**lazy** on export click) |

Login/shell should not need `vendor-export` until PDF/Excel/PPTX export.

## Testing entrypoints

**Source of truth = GitHub Actions.** Local parity: `make test-ci-local` / `make test-docker`. See [`docs/ops-testing.md`](ops-testing.md).
