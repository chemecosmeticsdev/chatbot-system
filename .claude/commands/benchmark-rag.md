# /benchmark-rag

Benchmark RAG performance with test queries and generate reports

Tests multiple query types, measures accuracy and relevance, compares different models, and generates performance benchmarks.

**Usage:** `/benchmark-rag [queries]`
**Example:** `/benchmark-rag "auth,database,setup"`

```bash
QUERIES="${1:-auth,database,setup}"

echo "Starting RAG performance benchmarking..."
echo "Test queries: $QUERIES"

# Use rag-architect subagent for comprehensive benchmarking
echo "Delegating to rag-architect subagent for performance benchmarking..."

# Create benchmark report directory
mkdir -p reports/benchmarks
REPORT_FILE="reports/benchmarks/rag-benchmark-$(date +%Y%m%d-%H%M%S).json"

echo "Benchmark report will be saved to: $REPORT_FILE"

# Initialize benchmark report
echo "{" > "$REPORT_FILE"
echo "  \"timestamp\": \"$(date -u --iso-8601=seconds)\"," >> "$REPORT_FILE"
echo "  \"queries\": \"$QUERIES\"," >> "$REPORT_FILE"
echo "  \"results\": []" >> "$REPORT_FILE"
echo "}" >> "$REPORT_FILE"

echo "RAG benchmarking initiated for queries: $QUERIES"
```