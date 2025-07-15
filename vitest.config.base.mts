import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Specifies the test environment to use
  // 'node' is used for running tests in a Node.js environment
  test: {
    environment: 'node',

    // Glob patterns for test files to include
    // Matches any .test.ts or .spec.ts files in the tests directory
    include: ['tests/**/*.{test,spec}.ts'],

    // Glob patterns for files to exclude from testing
    // Excludes node_modules and any files in the dist directory
    exclude: ['node_modules', 'dist'],

    // Enables code coverage reporting
    coverage: {
      // Specifies the coverage provider to use (v8 is the default)
      provider: 'v8',

      // Types of coverage reports to generate
      reporter: ['text', 'json', 'html'],

      // Directory where coverage reports will be generated
      reportsDirectory: './coverage',

      // Whether to include all files in coverage report, even if they're not tested
      all: true,

      // Files to exclude from coverage reporting
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/types/',
        '**/index.ts',
        '**/coverage/',
        '**/update-type-declarations.ts',
      ],

      // Files to include in coverage reporting
      include: ['src/**/*.ts'],

      // Coverage thresholds that will cause the test to fail if not met
      // These are percentages (0-100)
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },

    // Timeout in milliseconds for each test. Tests that take longer than this will fail.
    testTimeout: 5000,

    // Timeout in milliseconds for each hook(beforeEach, beforeAll, etc). 
    // Hooks that take longer than this will fail.
    hookTimeout: 20000,

    // Whether to show console output during test execution
    silent: false,

    // Whether to show test progress in the console
    reporters: ['default'],
  },
});
