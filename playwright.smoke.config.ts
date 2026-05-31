import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    // Core smoke: critical paths that must always pass
    '**/app-smoke.spec.ts',
    '**/main-navigation.spec.ts',
    '**/chat-model-picker.spec.ts',
    '**/provider-lifecycle.spec.ts',
    '**/gateway-lifecycle.spec.ts',
  ],
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});