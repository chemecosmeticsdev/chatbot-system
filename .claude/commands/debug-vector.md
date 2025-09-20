# /debug-vector

Debug vector database operations with detailed logging

Traces vector operations step-by-step, analyzes embedding quality, tests similarity calculations, and provides debugging insights.

**Usage:** `/debug-vector [operation]`
**Example:** `/debug-vector similarity-search`

```bash
OPERATION="${1:-similarity-search}"

echo "Starting vector debug session for operation: $OPERATION"

# Use vector-db-admin subagent for detailed debugging
echo "Delegating to vector-db-admin subagent for comprehensive vector debugging..."

# Enable debug logging
export DEBUG=vector:*
export NODE_ENV=development

echo "Debug mode enabled for vector operations"
echo "Operation: $OPERATION"
```