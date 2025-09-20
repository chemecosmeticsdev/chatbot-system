#!/usr/bin/env node

/**
 * Pre-commit Hook
 * Runs code quality checks before allowing commits
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-commit checks...\n');

const errors = [];
const warnings = [];

/**
 * Execute command and return result
 */
function runCommand(command, description) {
  try {
    console.log(`⏳ ${description}...`);
    execSync(command, { stdio: 'pipe' });
    console.log(`✅ ${description} passed\n`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} failed`);
    console.log(error.stdout?.toString() || '');
    console.log(error.stderr?.toString() || '');
    console.log('');
    return false;
  }
}

/**
 * Check for potential security issues
 */
function checkSecurity() {
  console.log('🔒 Checking for security issues...');

  const sensitivePatterns = [
    /sk-[a-zA-Z0-9]{48}/g, // OpenAI API keys
    /xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}/g, // Slack bot tokens
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal access tokens
    /AKIA[0-9A-Z]{16}/g, // AWS access keys
    /password\s*=\s*["'][^"']+["']/gi, // Hardcoded passwords
    /secret\s*=\s*["'][^"']+["']/gi, // Hardcoded secrets
  ];

  const excludeFiles = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage'
  ];

  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      if (excludeFiles.includes(item)) continue;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.ts') || item.endsWith('.jsx') || item.endsWith('.tsx'))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');

          for (const pattern of sensitivePatterns) {
            const matches = content.match(pattern);
            if (matches) {
              errors.push(`🚨 Potential secret found in ${fullPath}: ${matches[0].substring(0, 10)}...`);
            }
          }
        } catch (err) {
          // Skip files that can't be read
        }
      }
    }
  }

  scanDirectory(process.cwd());

  if (errors.length === 0) {
    console.log('✅ No security issues found\n');
    return true;
  } else {
    console.log('❌ Security issues detected\n');
    return false;
  }
}

/**
 * Check for TODO comments that need attention
 */
function checkTodos() {
  console.log('📝 Checking for important TODOs...');

  try {
    const output = execSync('grep -r "TODO\\|FIXME\\|HACK" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules .', { encoding: 'utf8' });

    const criticalTodos = output.split('\n').filter(line =>
      line.includes('FIXME') ||
      line.includes('HACK') ||
      line.toLowerCase().includes('urgent') ||
      line.toLowerCase().includes('security')
    );

    if (criticalTodos.length > 0) {
      warnings.push('⚠️ Critical TODOs found:');
      criticalTodos.forEach(todo => warnings.push(`   ${todo}`));
    }

    console.log('✅ TODO check completed\n');
    return true;
  } catch (error) {
    // No TODOs found or grep not available
    console.log('✅ No critical TODOs found\n');
    return true;
  }
}

/**
 * Validate package.json and dependencies
 */
function validatePackage() {
  console.log('📦 Validating package.json...');

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    // Check for required scripts
    const requiredScripts = ['build', 'test', 'lint', 'type-check'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);

    if (missingScripts.length > 0) {
      warnings.push(`⚠️ Missing scripts in package.json: ${missingScripts.join(', ')}`);
    }

    // Check for outdated dependencies (basic check)
    const outdatedDeps = [];
    if (packageJson.dependencies) {
      Object.entries(packageJson.dependencies).forEach(([name, version]) => {
        if (version.includes('^') && version.match(/\^(\d+)\./) && parseInt(version.match(/\^(\d+)\./)[1]) < 1) {
          outdatedDeps.push(name);
        }
      });
    }

    if (outdatedDeps.length > 0) {
      warnings.push(`⚠️ Potentially outdated dependencies: ${outdatedDeps.join(', ')}`);
    }

    console.log('✅ Package.json validation completed\n');
    return true;
  } catch (error) {
    errors.push('❌ Invalid package.json file');
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  let allPassed = true;

  // Run all checks
  const checks = [
    () => runCommand('npm run lint', 'ESLint check'),
    () => runCommand('npm run type-check', 'TypeScript check'),
    () => runCommand('npm run build', 'Build check'),
    checkSecurity,
    checkTodos,
    validatePackage
  ];

  for (const check of checks) {
    if (!check()) {
      allPassed = false;
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    console.log('⚠️ Warnings:');
    warnings.forEach(warning => console.log(warning));
    console.log('');
  }

  // Display errors and exit
  if (errors.length > 0) {
    console.log('❌ Errors:');
    errors.forEach(error => console.log(error));
    console.log('');
    console.log('🚫 Commit blocked due to errors. Please fix the issues above.');
    process.exit(1);
  }

  if (!allPassed) {
    console.log('🚫 Some checks failed. Please fix the issues and try again.');
    process.exit(1);
  }

  console.log('🎉 All pre-commit checks passed! Proceeding with commit...\n');
  process.exit(0);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Pre-commit checks interrupted');
  process.exit(1);
});

main().catch(error => {
  console.error('💥 Pre-commit hook failed:', error);
  process.exit(1);
});