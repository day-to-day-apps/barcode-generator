// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8765',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CI ? { channel: 'chromium', args: ['--disable-gpu'] } : undefined,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'tester-pl-desktop',
      testDir: './tests/comprehensive',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, locale: 'pl-PL', baseURL: 'http://127.0.0.1:8765/pl/' },
    },
    {
      name: 'tester-pl-mobile',
      testDir: './tests/comprehensive',
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 }, locale: 'pl-PL', baseURL: 'http://127.0.0.1:8765/pl/' },
    },
    {
      name: 'tester-en-desktop',
      testDir: './tests/comprehensive',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, locale: 'en-US', baseURL: 'http://127.0.0.1:8765/en/' },
    },
    {
      name: 'tester-en-mobile',
      testDir: './tests/comprehensive',
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 }, locale: 'en-US', baseURL: 'http://127.0.0.1:8765/en/' },
    },
  ],
  globalSetup: './tests/comprehensive/_helpers/global-setup.js',
  globalTeardown: './tests/comprehensive/_helpers/global-teardown.js',
});
