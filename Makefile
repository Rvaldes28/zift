# ZiftLab - GitHub Codespaces automation

SHELL := /bin/bash

ADMIN_DEV_EMAIL ?= admin@ziftlab.codespace
ADMIN_DEV_NAME ?= Admin Codespace
ADMIN_DEV_PASSWORD ?= ZiftLabCodespace1234

.PHONY: help install setup env start dev admin-user status stop

help:
	@echo "ZiftLab - targets for GitHub Codespaces:"
	@echo "  make install     Generate env files, migrate, seed, and create the admin user"
	@echo "  make start       Start dashboard (:3000) and web (:4321)"
	@echo "  make env         Regenerate Codespaces env files"
	@echo "  make admin-user  Create/reset the Codespaces admin user"
	@echo "  make status      Check container services and dev servers"

install setup:
	@pnpm codespace:setup

env:
	@pnpm codespace:env

start dev:
	@pnpm codespace:dev

admin-user:
	@pnpm --filter @ziftlab/db build >/dev/null
	@ADMIN_DEV_EMAIL="$(ADMIN_DEV_EMAIL)" \
		ADMIN_DEV_NAME="$(ADMIN_DEV_NAME)" \
		ADMIN_DEV_PASSWORD="$(ADMIN_DEV_PASSWORD)" \
		pnpm --filter admin dev:user

status:
	@printf "PostgreSQL :5432  "; \
		timeout 1 bash -c "cat < /dev/null > /dev/tcp/postgres/5432" 2>/dev/null && echo "up" || echo "down"
	@printf "MinIO      :9000  "; \
		curl -sfo /dev/null http://minio:9000/minio/health/live && echo "up" || echo "down"
	@printf "Admin      :3000  "; \
		curl -sfo /dev/null http://app:3000/api/health && echo "up" || echo "down"
	@printf "Web        :4321  "; \
		curl -sfo /dev/null http://app:4321/ && echo "up" || echo "down"

stop:
	@echo "Stop the running dev command with Ctrl+C. Codespaces stops services with the codespace."
