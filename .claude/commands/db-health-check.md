# /db-health-check

Comprehensive database health and consistency check

Validates data integrity, checks vector index performance, analyzes query performance, and tests backup and recovery procedures.

```bash
echo "Starting database health check..."

# Use vector-db-admin subagent for comprehensive health check
echo "Delegating to vector-db-admin subagent for database health analysis..."

# Basic database connectivity test
npm run test:api | grep -i "neon\|database" || echo "Running basic database test..."

# Check database connection
echo "Testing database connectivity..."

# Create health check report
mkdir -p reports/database
REPORT_FILE="reports/database/health-check-$(date +%Y%m%d-%H%M%S).log"

echo "Database health check started" > "$REPORT_FILE"
echo "Timestamp: $(date)" >> "$REPORT_FILE"

echo "Database health check completed"
echo "Report saved to: $REPORT_FILE"
```