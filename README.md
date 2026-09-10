# CASERNE

**Poste de commandement de la scolarité (ESP)**

Branch: `demo/oracle-hassen` — **do not merge into `main` / `master`.**

Staging target: **Neon Postgres** + **Render** (API Web Service + Static Site). Mock élèves disabled.

---

## Environments

| Env | Host | Branch | Audience |
|-----|------|--------|----------|
| Local | Developer Mac | `demo/oracle-hassen` | Dev |
| Staging / demo | Render + Neon | `demo/oracle-hassen` | Supervisor |
| Production | Future always-on host / VPS | same app + TLS | Phase B |

**Promotion:** push/pull this branch → Render auto-deploy (or Manual Deploy). No hotfixes on `main`.

---

## Architecture

```text
Supervisor browser
  → https://<caserne-static>.onrender.com   (CASERNE SPA)
  → https://<caserne-api>.onrender.com/api  (Django / Gunicorn)
  → Neon Postgres
```

- Frontend build sets `VITE_API_BASE_URL=https://<caserne-api>.onrender.com/api`
- API allows that origin via `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS`
- Auth: Bearer token (primary) + cookies when same-site

**Cold start:** free Render web services sleep after idle; first request can take 30–60s.  
**Media:** container disk is ephemeral on free tier — uploads may vanish on redeploy (OK for supervisor demo).

---

## Phase 0 — Accounts (human)

1. **[Neon Console](https://console.neon.tech)** → create free project → copy DB host, database, user, password, port `5432`. Prefer the **direct** (non-pooler) host for migrations.
2. **[Render Dashboard](https://dashboard.render.com)** → sign up / sign in → connect GitHub → grant access to `Bouhe-Moustapa/esp_management` (branch `demo/oracle-hassen`).
3. If Render asks for a payment card and you cannot proceed, stop and switch path (Railway / VPS).

---

## Local development

```bash
docker compose up -d db

cd backend && source .venv311/bin/activate
python manage.py runserver 0.0.0.0:8000

cd ScolariteMilitaireFront
# VITE_FRONTEND_ONLY=false , VITE_USE_MOCK_ELEVES=false
npm run dev
```

- App: http://127.0.0.1:9081  
- API docs: http://127.0.0.1:8000/api/docs  

```bash
cd backend
python manage.py create_esp_superuser --email EmEm@esp.mr --password 'YOUR_PASSWORD'
```

Optional full Docker stack (API proxied as `/api`):

```bash
export DEBUG=False
export SECRET_KEY="$(openssl rand -hex 32)"
docker compose up -d --build
```

---

## Staging — Neon + Render

### 1) Neon

Create project `caserne`. Note:

| Env var | Value |
|---------|--------|
| `DB_HOST` | Neon direct host |
| `DB_PORT` | `5432` |
| `DB_NAME` | Neon database name |
| `DB_USER` | Neon role |
| `DB_PASSWORD` | Neon password |
| `DB_SSLMODE` | `require` |

### 2) Render Web Service (API)

- **Name:** `caserne-api`
- **Branch:** `demo/oracle-hassen`
- **Root / Docker:** `backend` · Dockerfile `backend/Dockerfile`
- **Instance:** Free
- **Start:** image `CMD` already binds `0.0.0.0:$PORT`

Runtime env:

| Key | Example |
|-----|---------|
| `DEBUG` | `False` |
| `SECRET_KEY` | strong random |
| `ALLOWED_HOSTS` | `caserne-api.onrender.com` |
| `DB_*` / `DB_SSLMODE` | from Neon |
| `CORS_ALLOWED_ORIGINS` | `https://caserne-web.onrender.com` |
| `CSRF_TRUSTED_ORIGINS` | `https://caserne-web.onrender.com` |

Deploy API first; copy its URL `https://<caserne-api>.onrender.com`.

### 3) Render Static Site (CASERNE UI)

- **Name:** `caserne-web`
- **Branch:** `demo/oracle-hassen`
- **Root directory:** `ScolariteMilitaireFront`
- **Build:** `npm ci && npm run build`
- **Publish:** `dist`
- **SPA:** rewrite all routes to `/index.html`

Build env:

| Key | Value |
|-----|--------|
| `VITE_FRONTEND_ONLY` | `false` |
| `VITE_USE_MOCK_ELEVES` | `false` |
| `VITE_API_BASE_URL` | `https://<caserne-api>.onrender.com/api` |

Then set API `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` to `https://<caserne-web>.onrender.com` and redeploy API if needed.

### Blueprint (optional)

Repo root [`render.yaml`](render.yaml) can seed both services; still set secret env vars in the dashboard.

### Admin on Render

Render Shell on `caserne-api`:

```bash
python manage.py create_esp_superuser --email EmEm@esp.mr --password 'YOUR_PASSWORD'
```

### Update procedure

Push to `demo/oracle-hassen` → Render rebuilds. Or **Manual Deploy** in the dashboard.

### Backup (Neon)

Use Neon console PITR / export, or:

```bash
pg_dump "postgresql://USER:PASS@HOST/DB?sslmode=require" > caserne-backup.sql
```

---

## Supervisor acceptance checklist

- [ ] Open static URL — brand shows **CASERNE**
- [ ] First load may be slow (cold start) — wait and retry
- [ ] Log in with provided admin
- [ ] Dashboard / dossiers show **0** fake mock students
- [ ] `https://<api>/api/docs` loads
- [ ] Create one étudiant → appears after refresh
- [ ] Logout / login again OK

---

## Phase B

Always-on host or paid Render: persistent media disk, custom domain. Keep this branch unmerged.

## Security

- `DEBUG=False` on staging
- Never commit real `SECRET_KEY` or DB passwords
- Data policy: `VITE_USE_MOCK_ELEVES=false`
