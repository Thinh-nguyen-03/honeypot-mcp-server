import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Environment setup
    environment: 'node',
    
    // Test patterns
    include: [
      'tests/unit/handlers/**/*.test.js',
      'tests/security/**/*.test.js', 
      'tests/performance/**/*.test.js',
      'tests/integration/**/*.test.js'
    ],
    exclude: [
      'node_modules/**', 
      'dist/**',
      'tests/unit/services/**', // Exclude existing service tests (custom framework)
    ],
    
    // Coverage configuration (90%+ requirement from DEVELOPER_INSTRUCTIONS.md)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      
      // Coverage thresholds as per DEVELOPER_INSTRUCTIONS.md
      thresholds: {
        lines: 90,
        branches: 95,
        functions: 90,
        statements: 90
      },
      
      // Include only source files
      include: ['src/**/*.js'],
      exclude: [
        'src/**/*.test.js',
        'src/**/__tests__/**',
        'node_modules/**',
        'tests/**'
      ]
    },
    
    // Test timeout for performance requirements
    testTimeout: 10000, // 10 seconds max per test
    
    // Globals for easier testing
    globals: true,
    
    // Setup files
    setupFiles: ['./tests/setup.js'],
    
    // Reporter configuration
    reporter: process.env.CI ? ['json', 'github-actions'] : ['verbose'],
    
    // Performance monitoring
    benchmark: {
      outputFile: './benchmark-results.json'
    },
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true
  },
  
  // ESM support
  esbuild: {
    target: 'node18'
  }
}); 