# /test-rag

Test RAG pipeline with sample query and performance metrics

Executes vector similarity search, measures response time and accuracy, tests different retrieval strategies, and validates embedding quality.

**Usage:** `/test-rag [query]`
**Example:** `/test-rag "How to setup authentication?"`

```bash
# Test RAG pipeline with provided query
QUERY="$*"
echo "Testing RAG pipeline with query: $QUERY"

# Use the rag-architect subagent to test the query
echo "Delegating to rag-architect subagent for comprehensive RAG testing..."
```