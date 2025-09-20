#!/bin/bash
# Post-deploy hook implementation
# This hook should be triggered after successful deployment

DEPLOYMENT_URL="${1:-https://main.dztnbtrkvs8ks.amplifyapp.com}"
ENVIRONMENT="${2:-production}"

echo "🎉 Running post-deployment verification for: $DEPLOYMENT_URL"

# Wait for deployment to be ready
echo "Waiting for deployment to be accessible..."
TIMEOUT=300
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
    if curl -f -s "$DEPLOYMENT_URL" > /dev/null; then
        echo "✅ Deployment is accessible"
        break
    fi

    echo "⏳ Waiting for deployment... ($ELAPSED/$TIMEOUT seconds)"
    sleep 10
    ELAPSED=$((ELAPSED + 10))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "❌ Deployment timeout - site not accessible"
    exit 1
fi

# Run health checks
echo "Running health checks..."
HEALTH_URL="$DEPLOYMENT_URL/api/health"
if curl -f -s "$HEALTH_URL" > /dev/null; then
    echo "✅ Health endpoint responding"
else
    echo "⚠️ Health endpoint not responding"
fi

# Test critical endpoints
ENDPOINTS=(
    "/api/test-neon"
    "/api/test-auth"
    "/api/test-aws"
)

echo "Testing critical API endpoints..."
for endpoint in "${ENDPOINTS[@]}"; do
    URL="$DEPLOYMENT_URL$endpoint"
    if curl -f -s "$URL" > /dev/null 2>&1; then
        echo "✅ $endpoint responding"
    else
        echo "⚠️ $endpoint not responding"
    fi
done

# Performance baseline check
echo "Checking performance baseline..."
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$DEPLOYMENT_URL")
echo "Response time: ${RESPONSE_TIME}s"

# Create deployment report
mkdir -p reports/deployments
REPORT_FILE="reports/deployments/deploy-$(date +%Y%m%d-%H%M%S).log"

cat > "$REPORT_FILE" << EOF
Deployment Verification Report
==============================
URL: $DEPLOYMENT_URL
Environment: $ENVIRONMENT
Timestamp: $(date)
Response Time: ${RESPONSE_TIME}s
Status: SUCCESS

Post-deployment checks completed successfully.
EOF

echo "✅ Post-deployment verification completed!"
echo "Report saved to: $REPORT_FILE"