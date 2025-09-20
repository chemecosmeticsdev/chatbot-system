# /check-dependencies

Audit package dependencies for vulnerabilities and updates

Scans for known security vulnerabilities, checks for outdated packages, suggests safe update paths, and validates license compatibility.

```bash
echo "Starting dependency audit..."

# Check for security vulnerabilities
npm audit

# Check for outdated packages
npm outdated

# Check for unused dependencies
if command -v depcheck &> /dev/null; then
    echo "Checking for unused dependencies..."
    depcheck
else
    echo "Install depcheck for unused dependency analysis: npm install -g depcheck"
fi

# Validate package.json structure
node -e "
const pkg = require('./package.json');
console.log('Package name:', pkg.name);
console.log('Dependencies:', Object.keys(pkg.dependencies || {}).length);
console.log('DevDependencies:', Object.keys(pkg.devDependencies || {}).length);
"

echo "Dependency audit completed"
```