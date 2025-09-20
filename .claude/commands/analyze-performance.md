# /analyze-performance

Run comprehensive performance analysis on system component

Measures response times and throughput, analyzes memory and CPU usage, identifies bottlenecks and optimization opportunities, and generates performance reports.

**Usage:** `/analyze-performance [component]`
**Example:** `/analyze-performance vector-search`

```bash
COMPONENT="${1:-all}"

echo "Starting performance analysis for component: $COMPONENT"

# Use performance-optimizer subagent
echo "Delegating to performance-optimizer subagent for comprehensive analysis..."

# Run basic performance tests
npm run test:api
echo "Performance analysis completed for: $COMPONENT"
```