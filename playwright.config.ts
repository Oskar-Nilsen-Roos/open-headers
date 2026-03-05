import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/__tests__/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  timeout: 10_000,
  expect: { timeout: 2_000 },
  use: {
    baseURL: 'http://localhost:5181',
    trace: 'on-first-retry',
    actionTimeout: 3_000,
    navigationTimeout: 5_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun run dev -- --port 5181',
    url: 'http://localhost:5181',
    reuseExistingServer: true,
  },
})
