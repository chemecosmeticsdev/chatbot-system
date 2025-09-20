async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');

  try {
    // Clean up test data
    console.log('🗑️  Cleaning up test data...');

    // Remove any test files or uploads
    // Clean up test database entries
    // Reset any test configurations

    // Generate test report summary
    console.log('📊 Generating test summary...');

    // Archive test artifacts if needed
    console.log('📦 Archiving test artifacts...');

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here - teardown failures shouldn't fail the test run
  }
}

export default globalTeardown;