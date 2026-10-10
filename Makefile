.PHONY: deploy build-web up down seed status logs

# 1-Command Server Deployment
deploy:
	git pull
	pnpm --prefix web build
	docker compose up -d --build

# Build static frontend to web/out
build-web:
	pnpm --prefix web build

web-build:
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

# Seed database (upserts users and syncs fabrics)
seed:
	@if docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "backend"; then \
		echo "Seeding database inside backend container..."; \
		docker compose exec backend /app/seed; \
	else \
		echo "Seeding database via local Go..."; \
		cd backend && go run cmd/seed/main.go; \
	fi

# Wipe old data and seed freshly
seed-clean:
	@if docker compose ps --services --filter "status=running" 2>/dev/null | grep -q "backend"; then \
		echo "Cleaning and seeding database inside backend container..."; \
		docker compose exec backend /app/seed -clean; \
	else \
		echo "Cleaning and seeding database via local Go..."; \
		cd backend && go run cmd/seed/main.go -clean; \
	fi

# Reset PostgreSQL password to match default 'postgres'
db-reset-pass:
	docker compose exec postgres psql -U postgres -d stock_library -c "ALTER USER postgres WITH PASSWORD 'postgres';"
