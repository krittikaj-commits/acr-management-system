#!/bin/bash
# Health check script for local Docker Compose services
# Usage: ./scripts/docker-healthcheck.sh
#
# Checks that MSSQL, Redis, and LocalStack are healthy and accepting connections.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MSSQL_PORT=${MSSQL_PORT:-1433}
REDIS_PORT=${REDIS_PORT:-6379}
LOCALSTACK_PORT=${LOCALSTACK_PORT:-4566}

PASS=0
FAIL=0

check_service() {
  local name="$1"
  local check_cmd="$2"

  if eval "$check_cmd" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} $name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $name"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "ACR Management System — Service Health Check"
echo "=============================================="
echo ""

# Check MSSQL
check_service "MSSQL (port $MSSQL_PORT)" \
  "docker exec acr-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"\${MSSQL_SA_PASSWORD:-YourPassword123}\" -C -Q 'SELECT 1' 2>/dev/null"

# Check Redis
check_service "Redis (port $REDIS_PORT)" \
  "docker exec acr-redis redis-cli ping"

# Check LocalStack
check_service "LocalStack (port $LOCALSTACK_PORT)" \
  "curl -sf http://localhost:$LOCALSTACK_PORT/_localstack/health"

# Check LocalStack S3 bucket
check_service "LocalStack S3 bucket (acr-attachments-dev)" \
  "curl -sf http://localhost:$LOCALSTACK_PORT/_localstack/health | grep -q '\"s3\": \"available\"'"

# Check LocalStack SES
check_service "LocalStack SES" \
  "curl -sf http://localhost:$LOCALSTACK_PORT/_localstack/health | grep -q '\"ses\": \"available\"'"

echo ""
echo "----------------------------------------------"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "${YELLOW}Tip:${NC} Run 'docker-compose up -d' and wait ~30s for services to initialize."
  exit 1
fi

echo -e "${GREEN}All services healthy!${NC}"
exit 0
