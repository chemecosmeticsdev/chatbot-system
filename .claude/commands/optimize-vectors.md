# /optimize-vectors

Analyze and optimize vector database performance

Checks index performance, analyzes query patterns, suggests optimization strategies, updates vector indexes if needed, and provides performance benchmarks.

```bash
echo "Starting vector database optimization analysis..."

# Use vector-db-admin subagent for optimization
echo "Delegating to vector-db-admin subagent for comprehensive performance analysis..."

# Run basic performance check
npm run test:api | grep -i vector || echo "No vector-specific tests found"
```