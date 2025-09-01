# Deployment Runbook (Production)

## Prereqs
- Docker or Kubernetes cluster
- Managed Postgres (e.g., Neon, RDS)
- S3 bucket (AWS S3 or compatible) + CORS policy
- Stripe account (optional initially)

## Steps
1) Create production `.env` files for web, api, worker with your secrets.
2) Build and push images (GitHub Actions example could be added).
3) Provision DB and run migrations.
4) Create S3 bucket and set CORS.
5) Point your domain to the load balancer / ingress.
6) Add Stripe API keys and webhook pointing to `/billing/stripe/webhook` when enabling billing.


## Production Deployment (Step-by-step)

### Option A: Docker on a single VM (fastest to test)
- Provision a VM (Ubuntu 22.04).
- Install Docker + Docker Compose.
- Copy the repo, set production `.env` files for `api`, `worker`, and `web`.
- Point DNS for your root/app domain to the VM's IP.
- Run:
  ```bash
  docker compose -f infrastructure/docker-compose.yml up -d --build
  ```
- Put NGINX/Caddy in front if you want TLS termination and host-based routing.

### Option B: Fly.io (containers, global)
- Install `flyctl` and run `fly launch` for each service or use a single app with `fly.toml` and processes.
- Use Fly Postgres for DB or a managed Postgres (Neon, RDS).
- Use Fly Volumes or external S3 for object storage; recommend real S3 or Cloudflare R2 for production.
- Configure secrets (`flyctl secrets set ...`) for all env vars.

### Option C: Railway / Render
- **API & Worker**: Deploy from repo as Docker services; set env vars, attach to **Railway Postgres**.
- **Web**: Deploy Next.js; set `NEXT_PUBLIC_API_URL` to your API URL.
- Object storage: use MinIO add-on (if provided) or external S3-compatible storage.

### Option D: Vercel (web) + Render/Railway (API/Worker)
- Deploy the `web/` app on Vercel.
- Deploy `api/` + `worker/` on Render/Railway.
- Set CORS to allow the web origin; ensure `NEXT_PUBLIC_API_URL` points to API.
- Put S3 (AWS or R2) and managed Postgres behind the API.

### Domains & TLS
- For white-label custom domains, terminate TLS via Cloudflare or cert-manager on Kubernetes.
- Add domains via `POST /domains/add` then `POST /domains/verify`; point the customer's domain CNAME to your ingress.
- Host-based tenant resolution is automatic when a verified domain is received on `Host`.

### CI/CD (quick outline)
- Build images per service and push to a registry:
  ```bash
  docker build -t YOUR_REG/api:latest ./api
  docker build -t YOUR_REG/worker:latest ./worker
  docker build -t YOUR_REG/web:latest ./web
  docker push YOUR_REG/api:latest
  docker push YOUR_REG/worker:latest
  docker push YOUR_REG/web:latest
  ```
- Use GitHub Actions to build on each push to `main` and deploy via your platform’s CLI/API.

### Environment variables (prod checklist)
- **API**: `DATABASE_URL`, `S3_*`, `JWT_SECRET`, `ORIGINS`, `POSTMARK_*`, `STRIPE_*`, `TOPUP_*`, `PUBLIC_APP_URL`
- **Worker**: `DATABASE_URL`, `S3_*`, `WHISPER_MODEL`
- **Web**: `NEXT_PUBLIC_API_URL`
- **DB**: Run migrations (the app auto-creates tables on boot; for stricter control, add Alembic later).

### Observability
- Add structured logging (JSON) and forward to a collector (Datadog/Logtail).
- Health endpoints: `/health` (API). Add uptime checks.
- For queues: set retry policies; add a dead-letter store (e.g., a table) for failed jobs.

