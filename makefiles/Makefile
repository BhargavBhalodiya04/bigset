SHELL := /usr/bin/env bash

.PHONY: all dev validate-dev-env down clean convex-push convex-env seed-public-datasets ensure-admin-key install-deps

all: dev

install-deps:
	@if command -v npm > /dev/null 2>&1; then \
		echo "Installing host dependencies..."; \
		cd frontend && npm install --silent; \
		cd backend && npm install --silent; \
	else \
		echo "npm not found on host. Skipping host dependency installation."; \
	fi

dev: validate-dev-env install-deps
	bash dev.sh
	docker compose -f docker-compose.dev.yml logs -f

validate-dev-env:
	@test -f .env || { echo "Error: .env not found. Run: cp .env.example .env"; exit 1; }

ensure-admin-key:
	@admin_key="$$(grep '^CONVEX_SELF_HOSTED_ADMIN_KEY=' .env | cut -d= -f2-)"; \
	needs_gen=false; \
	if [[ -z "$$admin_key" ]]; then \
		needs_gen=true; \
	else \
		echo "Validating Convex admin key..."; \
		if ! docker compose -f docker-compose.dev.yml run --rm frontend bunx convex env list \
			--url http://convex:3210 --admin-key "$$admin_key" > /dev/null 2>&1; then \
			echo "Admin key is stale (volumes were probably wiped). Regenerating..."; \
			needs_gen=true; \
		fi; \
	fi; \
	if [[ "$$needs_gen" == "true" ]]; then \
		echo "Generating Convex admin key..."; \
		generated="$$(docker compose -f docker-compose.dev.yml exec -T convex ./generate_admin_key.sh 2>/dev/null \
			| grep '^convex-self-hosted|')"; \
		if [[ -z "$$generated" ]]; then \
			echo "Error: Failed to generate admin key."; exit 1; \
		fi; \
		if grep -q '^CONVEX_SELF_HOSTED_ADMIN_KEY=' .env; then \
			if [[ "$$OSTYPE" == "darwin"* ]]; then \
				sed -i '' "s#^CONVEX_SELF_HOSTED_ADMIN_KEY=.*#CONVEX_SELF_HOSTED_ADMIN_KEY=$$generated#" .env; \
			else \
				sed -i "s#^CONVEX_SELF_HOSTED_ADMIN_KEY=.*#CONVEX_SELF_HOSTED_ADMIN_KEY=$$generated#" .env; \
			fi; \
		else \
			echo "CONVEX_SELF_HOSTED_ADMIN_KEY=$$generated" >> .env; \
		fi; \
		echo "Admin key saved to .env"; \
	else \
		echo "Convex admin key is valid."; \
	fi

convex-env:
	@test -f .env || { echo "Error: .env not found. Run: cp .env.example .env"; exit 1; }
	@issuer="$$(grep '^CLERK_JWT_ISSUER_DOMAIN=' .env | cut -d= -f2-)"; \
		admin_key="$$(grep '^CONVEX_SELF_HOSTED_ADMIN_KEY=' .env | cut -d= -f2-)"; \
		if [[ -z "$$issuer" ]]; then \
			echo "Error: CLERK_JWT_ISSUER_DOMAIN is missing in root .env"; \
			exit 1; \
		fi; \
		if [[ -z "$$admin_key" ]]; then \
			echo "Error: CONVEX_SELF_HOSTED_ADMIN_KEY is missing in root .env"; \
			exit 1; \
		fi; \
		docker compose -f docker-compose.dev.yml run --rm frontend bunx convex env set CLERK_JWT_ISSUER_DOMAIN "$$issuer" \
			--url http://convex:3210 \
			--admin-key "$$admin_key"

convex-push:
	@test -f .env || { echo "Error: .env not found. Run: cp .env.example .env"; exit 1; }
	@admin_key="$$(grep '^CONVEX_SELF_HOSTED_ADMIN_KEY=' .env | cut -d= -f2-)"; \
		if [[ -z "$$admin_key" ]]; then \
			echo "Error: CONVEX_SELF_HOSTED_ADMIN_KEY is missing in root .env"; \
			exit 1; \
		fi; \
		docker compose -f docker-compose.dev.yml run --rm frontend bunx convex deploy \
			--url http://convex:3210 \
			--admin-key "$$admin_key"

seed-public-datasets:
	@test -f .env || { echo "Error: .env not found. Run: cp .env.example .env"; exit 1; }
	@admin_key="$$(grep '^CONVEX_SELF_HOSTED_ADMIN_KEY=' .env | cut -d= -f2-)"; \
		if [[ -z "$$admin_key" ]]; then \
			echo "Error: CONVEX_SELF_HOSTED_ADMIN_KEY is missing in root .env"; \
			exit 1; \
		fi; \
		docker compose -f docker-compose.dev.yml run --rm frontend bunx convex run publicSeed:seedPublicDatasets \
			--url http://convex:3210 \
			--admin-key "$$admin_key"

down:
	docker compose -f docker-compose.dev.yml down

clean:
	docker compose -f docker-compose.dev.yml down -v --rmi local
	@if [ -f .env ]; then \
		if [[ "$$OSTYPE" == "darwin"* ]]; then \
			sed -i '' 's|^CONVEX_SELF_HOSTED_ADMIN_KEY=.*|CONVEX_SELF_HOSTED_ADMIN_KEY=|' .env; \
		else \
			sed -i 's|^CONVEX_SELF_HOSTED_ADMIN_KEY=.*|CONVEX_SELF_HOSTED_ADMIN_KEY=|' .env; \
		fi; \
		echo "Cleared CONVEX_SELF_HOSTED_ADMIN_KEY from .env (volumes wiped)."; \
	fi
