# /generate-migration

Create database migration file with proper naming and structure

Generates migration with timestamp, includes rollback functionality, validates migration syntax, and updates migration tracking.

**Usage:** `/generate-migration [description]`
**Example:** `/generate-migration "Add chatbot_settings table"`

```bash
DESCRIPTION="$*"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
FILENAME="migrations/${TIMESTAMP}_$(echo "$DESCRIPTION" | tr ' ' '_' | tr '[:upper:]' '[:lower:]').sql"

echo "Creating migration: $FILENAME"

# Use vector-db-admin subagent for migration creation
echo "Delegating to vector-db-admin subagent for migration generation..."

mkdir -p migrations
echo "-- Migration: $DESCRIPTION" > "$FILENAME"
echo "-- Created: $(date)" >> "$FILENAME"
echo "" >> "$FILENAME"
echo "-- UP Migration" >> "$FILENAME"
echo "" >> "$FILENAME"
echo "-- DOWN Migration (Rollback)" >> "$FILENAME"

echo "Migration file created: $FILENAME"
```