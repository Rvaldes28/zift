# ZiftLab — automatización del entorno local (macOS + Homebrew)
#
# Uso (desde /):
#   make install   # instala TODO: Homebrew, formulas, .env, DB, MinIO+bucket, deps y seed
#   make start     # arranca PostgreSQL + MinIO + CMS (:3000) + Web (:4321)
#   make stop      # apaga todo, como apagar la compu
#   make status    # estado rápido de servicios y puertos

SHELL := /bin/bash

BREW_FORMULAS := node pnpm postgresql@16 minio minio-mc
DB_NAME       := ziftlab_dev
ADMIN_DB_NAME := ziftlab_admin_dev
ADMIN_DATABASE_URL ?= postgresql://localhost:5432/$(ADMIN_DB_NAME)
ADMIN_DEV_EMAIL ?= admin@ziftlab.local
ADMIN_DEV_NAME ?= Admin Local
ADMIN_DEV_PASSWORD ?= ZiftLabAdmin1234
ADMIN_BOOTSTRAP_TOKEN ?= ziftlab-local-bootstrap
ADMIN_TOTP_ENCRYPTION_KEY ?= ziftlab-local-totp-key-change-me
MINIO_LABEL   := com.ziftlab.minio
CMS_LOG       := $(HOME)/Library/Logs/ziftlab-cms.log
WEB_LOG       := $(HOME)/Library/Logs/ziftlab-web.log
ADMIN_LOG     := $(HOME)/Library/Logs/ziftlab-admin.log
CMS_PID       := /tmp/ziftlab-cms.pid
WEB_PID       := /tmp/ziftlab-web.pid
ADMIN_PID     := /tmp/ziftlab-admin.pid

.PHONY: help install brew formulas env db admin-db admin-setup admin-user admin minio deps seed start stop status

help:
	@echo "ZiftLab — targets disponibles (correr desde la raíz del repo):"
	@echo "  make install   Instala todo lo necesario (Homebrew → seed)"
	@echo "  make start     Arranca todos los servicios y deja los puertos listos"
	@echo "  make admin     Prepara DB propia, crea admin local y arranca dashboard en :3000"
	@echo "  make admin-user Crea/resetea el usuario admin local sin arrancar el dashboard"
	@echo "  make stop      Apaga dev servers, MinIO y PostgreSQL"
	@echo "  make status    Muestra qué está corriendo"
	@echo "  make admin-db  Crea la DB propia del dashboard sin tocar Payload"

# ────────────────────────────── INSTALL ──────────────────────────────

install: brew formulas env db minio deps seed
	@echo ""
	@echo "✔ Instalación completa. Arranca todo con: make start"

brew:
	@if command -v brew >/dev/null 2>&1; then echo "✓ Homebrew"; else \
		echo "→ Instalando Homebrew (va a pedir tu contraseña)…"; \
		/bin/bash -c "$$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; \
		command -v brew >/dev/null 2>&1 || \
		{ echo "✗ Homebrew instalado pero no está en el PATH: abre una terminal nueva y vuelve a correr 'make install'"; exit 1; }; \
	fi

formulas: brew
	@for f in $(BREW_FORMULAS); do \
		if brew list --formula $$f >/dev/null 2>&1; then echo "✓ $$f"; \
		else echo "→ Instalando $$f…"; brew install $$f; fi; \
	done

# Crea cms/.env y web/.env si no existen (valores locales de .env.example,
# con PAYLOAD_SECRET generado). Nunca pisa archivos existentes.
env:
	@if [ -f cms/.env ]; then echo "✓ cms/.env"; else \
		{ \
			echo "PAYLOAD_SECRET=$$(openssl rand -hex 32)"; \
			echo "PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000"; \
			echo "WEB_URL=http://localhost:4321"; \
			echo "DATABASE_URL=postgresql://localhost:5432/$(DB_NAME)"; \
			echo "S3_ENDPOINT=http://localhost:9000"; \
			echo "S3_REGION=us-east-1"; \
			echo "S3_BUCKET=payload-media"; \
			echo "S3_ACCESS_KEY_ID=minioadmin"; \
			echo "S3_SECRET_ACCESS_KEY=minioadmin"; \
			echo "S3_FORCE_PATH_STYLE=true"; \
		} > cms/.env; \
		echo "→ cms/.env creado (PAYLOAD_SECRET generado)"; \
	fi
	@if [ -f web/.env ]; then echo "✓ web/.env"; else \
		{ \
			echo "PUBLIC_SITE_URL=http://localhost:4321"; \
			echo "PUBLIC_PAYLOAD_API_URL=http://localhost:3000"; \
			echo "PUBLIC_GA4_ID="; \
			echo "PUBLIC_CLARITY_ID="; \
		} > web/.env; \
		echo "→ web/.env creado"; \
	fi
	@if [ -f admin/.env ]; then echo "✓ admin/.env"; else \
		{ \
			echo "ADMIN_APP_URL=http://localhost:3000"; \
			echo "ADMIN_ROUTE_GUARD=true"; \
			echo "ADMIN_BOOTSTRAP_TOKEN=$(ADMIN_BOOTSTRAP_TOKEN)"; \
			echo "ADMIN_DATABASE_URL=$(ADMIN_DATABASE_URL)"; \
			echo "ADMIN_SESSION_DAYS=14"; \
			echo "ADMIN_LOGIN_MAX_ATTEMPTS=5"; \
			echo "ADMIN_LOGIN_WINDOW_MINUTES=15"; \
			echo "ADMIN_LOGIN_LOCK_MINUTES=15"; \
			echo "ADMIN_PASSWORD_MIN_LENGTH=12"; \
			echo "ADMIN_ARGON2_MEMORY=65536"; \
			echo "ADMIN_ARGON2_TIME=3"; \
			echo "ADMIN_ARGON2_PARALLELISM=1"; \
			echo "ADMIN_TOTP_ISSUER=ZiftLab"; \
			echo "ADMIN_TOTP_ENCRYPTION_KEY=$$(openssl rand -hex 32)"; \
			echo "ADMIN_2FA_CHALLENGE_MINUTES=5"; \
		} > admin/.env; \
		echo "→ admin/.env creado"; \
	fi
	@if [ -f packages/db/.env ]; then echo "✓ packages/db/.env"; else \
		{ \
			echo "ADMIN_DATABASE_URL=$(ADMIN_DATABASE_URL)"; \
		} > packages/db/.env; \
		echo "→ packages/db/.env creado"; \
	fi

db: formulas
	@brew services list | grep postgresql@16 | grep -q started || \
		{ echo "→ Arrancando PostgreSQL…"; brew services start postgresql@16; }
	@PGBIN="$$(brew --prefix postgresql@16)/bin"; \
	for i in $$(seq 1 30); do "$$PGBIN/pg_isready" -q -h localhost && break; sleep 1; done; \
	"$$PGBIN/pg_isready" -q -h localhost || { echo "✗ PostgreSQL no respondió en :5432"; exit 1; }; \
	if "$$PGBIN/psql" -h localhost -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='$(DB_NAME)'" | grep -q 1; \
	then echo "✓ DB $(DB_NAME)"; \
	else "$$PGBIN/createdb" -h localhost $(DB_NAME) && echo "→ DB $(DB_NAME) creada"; fi

admin-db: formulas
	@brew services list | grep postgresql@16 | grep -q started || \
		{ echo "→ Arrancando PostgreSQL…"; brew services start postgresql@16; }
	@PGBIN="$$(brew --prefix postgresql@16)/bin"; \
	for i in $$(seq 1 30); do "$$PGBIN/pg_isready" -q -h localhost && break; sleep 1; done; \
	"$$PGBIN/pg_isready" -q -h localhost || { echo "✗ PostgreSQL no respondió en :5432"; exit 1; }; \
	if "$$PGBIN/psql" -h localhost -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='$(ADMIN_DB_NAME)'" | grep -q 1; \
	then echo "✓ DB $(ADMIN_DB_NAME)"; \
	else "$$PGBIN/createdb" -h localhost $(ADMIN_DB_NAME) && echo "→ DB $(ADMIN_DB_NAME) creada"; fi

admin-setup: admin-db
	@[ -d node_modules ] || { echo "→ Faltan dependencias; corriendo pnpm install…"; pnpm install; }
	@echo "→ Migraciones del dashboard propio…"
	@ADMIN_DATABASE_URL="$(ADMIN_DATABASE_URL)" pnpm db:migrate
	@echo "→ Seed base del dashboard propio…"
	@ADMIN_DATABASE_URL="$(ADMIN_DATABASE_URL)" pnpm db:seed
	@$(MAKE) admin-user

admin-user:
	@echo "→ Usuario admin local…"
	@ADMIN_DATABASE_URL="$(ADMIN_DATABASE_URL)" \
		ADMIN_DEV_EMAIL="$(ADMIN_DEV_EMAIL)" \
		ADMIN_DEV_NAME="$(ADMIN_DEV_NAME)" \
		ADMIN_DEV_PASSWORD="$(ADMIN_DEV_PASSWORD)" \
		pnpm --filter @ziftlab/db build >/dev/null
	@ADMIN_DATABASE_URL="$(ADMIN_DATABASE_URL)" \
		ADMIN_DEV_EMAIL="$(ADMIN_DEV_EMAIL)" \
		ADMIN_DEV_NAME="$(ADMIN_DEV_NAME)" \
		ADMIN_DEV_PASSWORD="$(ADMIN_DEV_PASSWORD)" \
		pnpm --filter admin dev:user

admin: admin-setup
	@if lsof -ti tcp:3000 >/dev/null 2>&1; then \
		if curl -s http://localhost:3000/api/health | grep -q '"service":"admin"'; then \
			echo "✓ Admin propio ya corría en :3000"; \
		else \
			echo "✗ El puerto :3000 está ocupado (probablemente Payload/CMS)."; \
			echo "  Apágalo con: make stop"; \
			echo "  Luego vuelve a correr: make admin"; \
			exit 1; \
		fi; \
	else \
		echo "→ Admin propio (Next.js)…"; \
		nohup env \
			ADMIN_DATABASE_URL="$(ADMIN_DATABASE_URL)" \
			ADMIN_BOOTSTRAP_TOKEN="$(ADMIN_BOOTSTRAP_TOKEN)" \
			ADMIN_TOTP_ENCRYPTION_KEY="$(ADMIN_TOTP_ENCRYPTION_KEY)" \
			pnpm dev:admin > "$(ADMIN_LOG)" 2>&1 & echo $$! > $(ADMIN_PID); \
	fi
	@echo "  … esperando admin en :3000"; \
	for i in $$(seq 1 60); do curl -sfo /dev/null http://localhost:3000/api/health && break; sleep 1; done; \
	curl -sfo /dev/null http://localhost:3000/api/health || \
		{ echo "✗ El admin no respondió; revisa $(ADMIN_LOG)"; exit 1; }
	@echo ""
	@echo "  ✔ Dashboard propio arriba"
	@echo "  ─────────────────────────────────────────────"
	@echo "  URL        http://localhost:3000/dashboard"
	@echo "  Email      $(ADMIN_DEV_EMAIL)"
	@echo "  Password   $(ADMIN_DEV_PASSWORD)"
	@echo "  DB         $(ADMIN_DATABASE_URL)"
	@echo "  Logs       $(ADMIN_LOG)"
	@echo "  ─────────────────────────────────────────────"

minio: formulas
	@./infra/scripts/install-minio-autostart.sh
	@for i in $$(seq 1 30); do curl -sfo /dev/null http://localhost:9000/minio/health/live && break; sleep 1; done; \
	curl -sfo /dev/null http://localhost:9000/minio/health/live || \
		{ echo "✗ MinIO no respondió en :9000 (log: ~/Library/Logs/ziftlab-minio.log)"; exit 1; }
	@./infra/scripts/create-minio-bucket.sh

deps: formulas
	@echo "→ pnpm install…"
	@pnpm install

seed: db
	@echo "→ Seed (14 servicios + globals, idempotente)…"
	@pnpm --filter cms seed

# ────────────────────────────── START ──────────────────────────────

start:
	@command -v brew >/dev/null 2>&1 || { echo "Falta Homebrew: corre 'make install' primero"; exit 1; }
	@[ -d node_modules ] || { echo "Faltan dependencias: corre 'make install' primero"; exit 1; }
	@brew services list | grep postgresql@16 | grep -q started || \
		{ echo "→ PostgreSQL…"; brew services start postgresql@16; }
	@if curl -sfo /dev/null http://localhost:9000/minio/health/live; then echo "✓ MinIO ya corría"; else \
		echo "→ MinIO…"; \
		launchctl bootstrap "gui/$$(id -u)" "$$HOME/Library/LaunchAgents/$(MINIO_LABEL).plist" 2>/dev/null || \
		launchctl kickstart "gui/$$(id -u)/$(MINIO_LABEL)" 2>/dev/null || true; \
		for i in $$(seq 1 30); do curl -sfo /dev/null http://localhost:9000/minio/health/live && break; sleep 1; done; \
	fi
	@if lsof -ti tcp:3000 >/dev/null 2>&1; then echo "✓ CMS ya corría en :3000"; else \
		echo "→ CMS (Payload)…"; \
		nohup pnpm dev:cms > "$(CMS_LOG)" 2>&1 & echo $$! > $(CMS_PID); \
	fi
	@echo "  … esperando CMS en :3000 (el primer arranque tarda)"; \
	for i in $$(seq 1 90); do curl -sfo /dev/null http://localhost:3000/api/globals/header && break; sleep 2; done; \
	curl -sfo /dev/null http://localhost:3000/api/globals/header || \
		{ echo "✗ El CMS no respondió; revisa $(CMS_LOG)"; exit 1; }
	@if lsof -ti tcp:4321 >/dev/null 2>&1; then echo "✓ Web ya corría en :4321"; else \
		echo "→ Web (Astro)…"; \
		nohup pnpm dev:web > "$(WEB_LOG)" 2>&1 & echo $$! > $(WEB_PID); \
	fi
	@for i in $$(seq 1 30); do curl -sfo /dev/null http://localhost:4321/ && break; sleep 1; done; \
	curl -sfo /dev/null http://localhost:4321/ || \
		{ echo "✗ Astro no respondió; revisa $(WEB_LOG)"; exit 1; }
	@echo ""
	@echo "  ✔ ZiftLab arriba — puertos (VS Code los detecta y los hace clic):"
	@echo "  ─────────────────────────────────────────────"
	@echo "  Web (Astro)       http://localhost:4321"
	@echo "  Admin (Payload)   http://localhost:3000/admin"
	@echo "  API (Payload)     http://localhost:3000/api"
	@echo "  Dashboard propio  make admin  (usa también :3000, alternativo a Payload)"
	@echo "  MinIO S3          http://localhost:9000"
	@echo "  MinIO consola     http://localhost:9001"
	@echo "  PostgreSQL        localhost:5432 · DB $(DB_NAME)"
	@echo "  ─────────────────────────────────────────────"
	@echo "  Logs: $(CMS_LOG)"
	@echo "        $(WEB_LOG)"

# ────────────────────────────── STOP ──────────────────────────────

stop:
	@echo "→ Apagando Web (:4321)…"
	-@[ -f $(WEB_PID) ] && kill "$$(cat $(WEB_PID))" 2>/dev/null; rm -f $(WEB_PID)
	-@lsof -ti tcp:4321 | xargs kill 2>/dev/null; true
	@echo "→ Apagando Admin propio (:3000)…"
	-@[ -f $(ADMIN_PID) ] && kill "$$(cat $(ADMIN_PID))" 2>/dev/null; rm -f $(ADMIN_PID)
	@echo "→ Apagando CMS (:3000)…"
	-@[ -f $(CMS_PID) ] && kill "$$(cat $(CMS_PID))" 2>/dev/null; rm -f $(CMS_PID)
	-@lsof -ti tcp:3000 | xargs kill 2>/dev/null; true
	@echo "→ Apagando MinIO…"
	-@launchctl bootout "gui/$$(id -u)/$(MINIO_LABEL)" 2>/dev/null; true
	@echo "→ Apagando PostgreSQL…"
	-@brew services stop postgresql@16 >/dev/null 2>&1; true
	@echo "✔ Todo apagado"

# ────────────────────────────── STATUS ──────────────────────────────

status:
	@printf "PostgreSQL :5432  "; PGBIN="$$(brew --prefix postgresql@16 2>/dev/null)/bin"; \
		"$$PGBIN/pg_isready" -q -h localhost 2>/dev/null && echo "✓ arriba" || echo "✗ abajo"
	@printf "MinIO      :9000  "; curl -sfo /dev/null http://localhost:9000/minio/health/live && echo "✓ arriba" || echo "✗ abajo"
	@printf "CMS        :3000  "; curl -sfo /dev/null http://localhost:3000/api/globals/header && echo "✓ arriba" || echo "✗ abajo"
	@printf "Admin      :3000  "; curl -s http://localhost:3000/api/health | grep -q '"service":"admin"' && echo "✓ arriba" || echo "✗ abajo"
	@printf "Web        :4321  "; curl -sfo /dev/null http://localhost:4321/ && echo "✓ arriba" || echo "✗ abajo"
