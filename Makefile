.PHONY: deploy build-web up down seed status logs

# 1-Command Server Deployment
deploy:
	git pull
	pnpm --prefix web build
	docker compose up -d --build

# Build static frontend to web/out
build-web:
	pnpm --prefix web build

# Start Docker services (PostgreSQL + Go API backend)
up:
	docker compose up -d --build

# Stop Docker services
down:
	docker compose down

# View backend logs
logs:
	docker compose logs -f backend

# Status
status:
	docker compose ps

# Seed database from CSV
seed:
	cd backend && go run cmd/seed/main.go
