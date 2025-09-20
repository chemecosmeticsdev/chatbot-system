# /create-component

Generate new UI component with tests and documentation

Creates component file with TypeScript, generates Storybook stories, adds unit tests with Jest/Testing Library, and updates component index exports.

**Usage:** `/create-component [name] [type]`
**Example:** `/create-component UserCard interactive`

```bash
# Create component directory and files
mkdir -p "components/ui/$1"
touch "components/ui/$1/$1.tsx"
touch "components/ui/$1/$1.stories.tsx"
touch "components/ui/$1/$1.test.tsx"

echo "Component $1 of type $2 created. Please implement the component logic."
```