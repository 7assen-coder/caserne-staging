# CASERNE (public site: GESESP.com)

**Poste de commandement de la scolarité (ESP)**

Branch: `demo/oracle-hassen` — **do not merge into `main` / `master`.**

Public URLs:

| Role | URL |
|------|-----|
| App (supervisor) | **https://gesesp.com** |
| API | **https://api.gesesp.com** |
| API docs | **https://api.gesesp.com/api/docs** |

Staging host: **Render** (+ Postgres). Mock élèves disabled.

---

## Environments

| Env | Host | Branch | Audience |
|-----|------|--------|----------|
| Local | Developer Mac | `demo/oracle-hassen` | Dev |
| Staging / demo | Render · custom domain **gesesp.com** | `demo/oracle-hassen` | Supervisor |
| Production | Same or VPS | Phase B | Ops |

**Promotion:** push this branch → Render auto-deploy. No hotfixes on `main`.

---

## Architecture

```text
Supervisor browser
  → https://gesesp.com              (CASERNE SPA / nginx)
  → https://api.gesesp.com/api      (Django / Gunicorn)
  → Postgres (Render free / Neon)
```

- Build: `VITE_API_BASE_URL=https://api.gesesp.com/api`
- API: `ALLOWED_HOSTS=api.gesesp.com,...` · `CORS_ALLOWED_ORIGINS=https://gesesp.com,https://www.gesesp.com`
- Temporary Render hostnames (`*.onrender.com`) stay as fallbacks until DNS is attached

**Cold start:** free Render web services may sleep (~30–60s first hit).  
**Media:** free disk is ephemeral across redeploys.

---

## Custom domain (GESESP.com) on Render

1. Own/register **gesesp.com**
2. On **gesesp** (web): Custom Domain → `gesesp.com` + `www.gesesp.com`
3. On **gesesp-api**: Custom Domain → `api.gesesp.com`
4. Set DNS (Render shows CNAME / A records)
5. Rebuild web so Vite bakes `https://api.gesesp.com/api`

Until DNS is live, you can still use:

- https://gesesp.onrender.com  
- https://gesesp-api.onrender.com  

---

## Local development

```bash
docker compose up -d db
cd backend && source .venv311/bin/activate
python manage.py runserver 0.0.0.0:8000
cd ScolariteMilitaireFront && npm run dev
```

- App: http://127.0.0.1:9081 · Docs: http://127.0.0.1:8000/api/docs  

```bash
python manage.py create_esp_superuser --email EmEm@esp.mr --password 'YOUR_PASSWORD'
```

Compose frontend uses `nginx.compose.conf` (proxies `/api` to `backend`).

---

## Staging env (Render)

| Key | Value |
|-----|--------|
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `api.gesesp.com,gesesp-api.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | `https://gesesp.com,https://www.gesesp.com,https://gesesp.onrender.com` |
| `CSRF_TRUSTED_ORIGINS` | same as CORS |
| `DB_SSLMODE` | `require` |
| `VITE_API_BASE_URL` | `https://api.gesesp.com/api` (or `https://gesesp-api.onrender.com/api` before DNS) |
| `VITE_FRONTEND_ONLY` | `false` |
| `VITE_USE_MOCK_ELEVES` | `false` |

Admin (Render Shell on API):

```bash
python manage.py create_esp_superuser --email EmEm@esp.mr --password 'YOUR_PASSWORD'
```

---

## Supervisor checklist

- [ ] Open **https://gesesp.com** (or https://gesesp.onrender.com)
- [ ] Brand shows CASERNE; first load may be slow (cold start)
- [ ] Login works; dossiers empty (no 64 mock students)
- [ ] https://api.gesesp.com/api/docs loads (or https://gesesp-api.onrender.com/api/docs)
- [ ] Create one étudiant → visible after refresh

## Security

- Never commit real `SECRET_KEY` / DB passwords
- Do not merge this branch into `main`
