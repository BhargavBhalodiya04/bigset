#!/usr/bin/env bash
set -e

# 1. Make sure .env exists
if [ ! -f .env ]; then
  echo "Error: .env file not found."
  exit 1
fi

# 2. Spin up db and convex first
echo "Starting db, convex, and convex-dashboard..."
docker compose -f docker-compose.dev.yml up -d db convex convex-dashboard

# 3. Wait for Convex to be healthy
echo "Waiting for Convex to start..."
for i in {1..120}; do
  if curl -sf http://127.0.0.1:3210/version > /dev/null 2>&1; then
    break
  fi
  if [ $i -eq 120 ]; then
    echo "Error: Convex did not start within 120s"
    exit 1
  fi
  sleep 1
done
echo "Convex is up."

# 4. Generate/validate admin key
admin_key=$(grep '^CONVEX_SELF_HOSTED_ADMIN_KEY=' .env | cut -d= -f2-)
needs_gen=false

if [ -z "$admin_key" ]; then
  needs_gen=true
else
  echo "Validating Convex admin key..."
  # Run a quick check using a temporary frontend container.
  if ! docker compose -f docker-compose.dev.yml run --rm frontend bunx convex env list --url http://convex:3210 --admin-key "$admin_key" > /dev/null 2>&1; then
    echo "Admin key is stale or invalid. Regenerating..."
    needs_gen=true
  fi
fi

if [ "$needs_gen" = true ]; then
  echo "Generating Convex admin key..."
  generated=$(docker compose -f docker-compose.dev.yml exec -T convex ./generate_admin_key.sh 2>/dev/null | grep '^convex-self-hosted|')
  if [ -z "$generated" ]; then
    echo "Error: Failed to generate admin key."
    exit 1
  fi
  
  if grep -q '^CONVEX_SELF_HOSTED_ADMIN_KEY=' .env; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s#^CONVEX_SELF_HOSTED_ADMIN_KEY=.*#CONVEX_SELF_HOSTED_ADMIN_KEY=$generated#" .env
    else
      sed -i "s#^CONVEX_SELF_HOSTED_ADMIN_KEY=.*#CONVEX_SELF_HOSTED_ADMIN_KEY=$generated#" .env
    fi
  else
    echo "CONVEX_SELF_HOSTED_ADMIN_KEY=$generated" >> .env
  fi
  admin_key="$generated"
  echo "Admin key saved to .env"
else
  echo "Convex admin key is valid."
fi

# 5. Set CLERK_JWT_ISSUER_DOMAIN in Convex
issuer=$(grep '^CLERK_JWT_ISSUER_DOMAIN=' .env | cut -d= -f2-)
if [ -n "$issuer" ]; then
  echo "Setting CLERK_JWT_ISSUER_DOMAIN in Convex..."
  docker compose -f docker-compose.dev.yml run --rm frontend bunx convex env set CLERK_JWT_ISSUER_DOMAIN "$issuer" --url http://convex:3210 --admin-key "$admin_key"
fi

# 6. Deploy Convex schema and generate code
echo "Deploying Convex schema and generating client code..."
docker compose -f docker-compose.dev.yml run --rm frontend bunx convex deploy --url http://convex:3210 --admin-key "$admin_key"

# 7. Start the rest of the services
echo "Starting all remaining services..."
docker compose -f docker-compose.dev.yml up -d

echo ""
echo "BigSet is ready!"
echo "  App:              http://13.234.200.90:3500"
echo "  Mastra Studio:    http://13.234.200.90:4111"
echo "  Convex Dashboard: http://13.234.200.90:6791"
echo ""
