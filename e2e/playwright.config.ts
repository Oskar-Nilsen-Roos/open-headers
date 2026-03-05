import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Extension tests share browser state, run serially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker since we use a persistent context with extension
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60000,
  use: {
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'bun run e2e/test-server.ts',
    port: Number(process.env.TEST_SERVER_PORT) || 3456,
    reuseExistingServer: true,
  },
})
