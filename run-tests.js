#!/usr/bin/env node

// Simple test runner for Math Dodge settings tests
console.log('Setting up test environment...\n');

// Register TypeScript compiler
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
    lib: ['es2020'],
    moduleResolution: 'node'
  }
});

// Run tests
try {
  console.log('Running generator tests...');
  const generatorTests = require('./tests/generator.test');
  generatorTests.runAllTests();
  
  console.log('\nRunning feature tests...');
  const featureTests = require('./tests/features.test');
  featureTests.runAllTests();
} catch (error) {
  console.error('Test execution failed:', error);
  process.exit(1);
}