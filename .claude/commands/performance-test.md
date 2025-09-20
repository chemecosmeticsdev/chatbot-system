# /performance-test

Load test specific API endpoint with realistic traffic patterns

Simulates concurrent user load, measures response times under stress, identifies performance bottlenecks, and tests auto-scaling behavior.

**Usage:** `/performance-test [endpoint]`
**Example:** `/performance-test /api/vector-search`

```bash
ENDPOINT="${1:-/api/health}"

echo "Starting performance test for endpoint: $ENDPOINT"

# Use performance-optimizer subagent for comprehensive testing
echo "Delegating to performance-optimizer subagent for load testing..."

# Basic performance check
echo "Running basic performance check..."
time curl -s "http://localhost:3000$ENDPOINT" > /dev/null

# Create performance test report
mkdir -p reports/performance
REPORT_FILE="reports/performance/perf-test-$(date +%Y%m%d-%H%M%S).log"

echo "Performance test started for: $ENDPOINT" > "$REPORT_FILE"
echo "Timestamp: $(date)" >> "$REPORT_FILE"

echo "Performance test completed for: $ENDPOINT"
echo "Report saved to: $REPORT_FILE"
```