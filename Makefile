# Quality gates — local parity with .github/workflows/ci.yml
# See docs/ops-testing.md

.PHONY: help test test-docker test-front test-e2e test-ci-local migrate-check audit backup-drill smoke-readyz

ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
BACKEND := $(ROOT)/backend
FRONT := $(ROOT)/ScolariteMilitaireFront
PY := $(BACKEND)/.venv311/bin/python
COMPOSE_TEST := docker compose -f $(ROOT)/docker-compose.test.yml

# CI-parity env for host-run Django tests
export SECRET_KEY ?= ci-test-key-polyspace-phase33-xxxxxxxxxxxxxxxxxxxxxxxxxx
export DEBUG ?= False
export DJANGO_ENV ?= local
export USE_LOCMEM_CACHE ?= True
export HEALTHZ_REQUIRE_REDIS ?= False
export SECURE_SSL_REDIRECT ?= False
export CELERY_TASK_ALWAYS_EAGER ?= True
export EMAIL_BACKEND ?= django.core.mail.backends.locmem.EmailBackend
export ALLOWED_HOSTS ?= localhost,127.0.0.1,testserver
export DB_SSLMODE ?= disable

DJANGO_TEST_LABELS := accounts etudiants operations backend.tests

help:
	@echo "Targets:"
	@echo "  make test           Django labeled tests (host venv; needs Postgres)"
	@echo "  make test-docker    Same suite via docker-compose.test.yml"
	@echo "  make test-front     lint:ci + nginx cache assert + vitest"
	@echo "  make test-e2e       Playwright PR smokes (login-page + a11y)"
	@echo "  make test-ci-local  test + test-front + test-e2e"
	@echo "  make migrate-check  makemigrations --check --dry-run"
	@echo "  make audit          pip-audit + npm audit (CI flags)"
	@echo "  make backup-drill   scripts/backup/restore_drill.sh"
	@echo "  make smoke-readyz   scripts/smoke_scale_readyz.sh (set BASE_URL)"

test: migrate-check
	cd $(BACKEND) && $(PY) manage.py test $(DJANGO_TEST_LABELS) -v 1

test-docker:
	$(COMPOSE_TEST) run --rm --build backend_test

test-front:
	cd $(FRONT) && npm run lint:ci && npm run test:nginx-cache && npm run test

test-e2e:
	cd $(FRONT) && npx playwright test e2e/smoke.login-page.spec.js e2e/smoke.a11y-rtl.spec.js

test-ci-local: test test-front test-e2e

migrate-check:
	cd $(BACKEND) && $(PY) manage.py makemigrations --check --dry-run

audit:
	cd $(BACKEND) && $(PY) -m pip install -q pip-audit==2.9.0 && \
		$(PY) -m pip_audit -r requirements.txt
	cd $(FRONT) && npm audit --omit=dev --audit-level=high

backup-drill:
	$(ROOT)/scripts/backup/restore_drill.sh

smoke-readyz:
	$(ROOT)/scripts/smoke_scale_readyz.sh
