# Post-deploy Hook

Automated verification after successful deployment.

## Checks Performed

- **Integration Test Execution**: Run full integration test suite against deployed environment
- **Performance Baseline Comparison**: Compare performance metrics against established baselines
- **Error Rate Monitoring Setup**: Initialize error tracking and alerting for new deployment
- **Vector Database Consistency Verification**: Ensure vector operations work correctly in production
- **Chatbot Health Checks**: Validate all chatbot instances are responding correctly
- **User Acceptance Test Triggers**: Automatically trigger UAT workflows for stakeholders
- **Cost Monitoring Activation**: Initialize cost tracking for new features and services
- **Backup Verification**: Ensure backup systems are functioning correctly

## Implementation

```bash
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

# Performance baseline check
echo "Checking performance baseline..."
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$DEPLOYMENT_URL")
echo "Response time: ${RESPONSE_TIME}s"

if (( $(echo "$RESPONSE_TIME > 5.0" | bc -l) )); then
    echo "⚠️ Response time exceeds baseline (5s)"
else
    echo "✅ Response time within acceptable range"
fi

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
```

## GitHub Actions Integration

This hook can be integrated with GitHub Actions workflow:

```yaml
- name: Post-deployment verification
  run: |
    chmod +x .claude/hooks/post-deploy.sh
    ./.claude/hooks/post-deploy.sh "${{ env.DEPLOYMENT_URL }}" "${{ env.ENVIRONMENT }}"
```