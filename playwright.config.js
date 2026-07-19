import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.FE_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    ...(process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL }
      : {}),
  },
  projects: [
    {
      name: 'default',
      testIgnore: [
        /dev-seed-matrix\.spec\.js/,
        /seed-parity\.spec\.js/,
        /visual\//,
        /cross-browser-primary-matrix\.spec\.js/,
        /fall-track-select-mutating\.spec\.js/,
        /hackathon-progression-mutating\.spec\.js/,
        /event-notification-mutating\.spec\.js/,
        /close-submission-early\.spec\.js/,
        /mentor-portal-mutating\.spec\.js/,
        /mode-b-continuous-ui\.spec\.js/,
        /websocket-queue-timer\.spec\.js/,
        /coord-concurrent-race\.spec\.js/,
        /permission-idor-mutating\.spec\.js/,
        /5-secondary-portals-mutating\.spec\.js/,
        /people-mentor-pool\.spec\.js/,
      ],
      workers: 1,
    },
    {
      name: 'gd2-e2e',
      testMatch: /e2e-gd2-e2e-2026\.spec\.js/,
      timeout: 60_000,
      workers: 1,
    },
    {
      name: 'dedicated-e2e',
      testMatch:
        /(fall-track-select|fall-track-select-mutating|student-portal-parity|mentor-track-bootstrap|team-mentor-history|people-mentor-pool)\.spec\.js/,
      timeout: 90_000,
      workers: 1,
    },
    {
      name: 'mutating-e2e',
      testMatch:
        /(hackathon-progression-mutating|event-notification-mutating|close-submission-early|mentor-portal-mutating|mode-b-continuous-ui|websocket-queue-timer|coord-concurrent-race|5-secondary-portals-mutating|permission-idor-mutating)\.spec\.js/,
      timeout: 900_000,
      actionTimeout: 45_000,
      workers: 1,
    },
    {
      name: 'seed-parity',
      testMatch: /seed-parity\.spec\.js/,
      timeout: 30_000,
    },
    {
      name: 'seed-matrix',
      testMatch: /dev-seed-matrix\.spec\.js/,
      timeout: 90_000,
      workers: 1,
    },
    {
      name: 'visual',
      testMatch: /visual\/.*\.spec\.js/,
      snapshotPathTemplate: '{testDir}/visual-baselines/{testFilePath}/{arg}{ext}',
      timeout: 60_000,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testMatch: /cross-browser-primary-matrix\.spec\.js/,
      timeout: 90_000,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: /cross-browser-primary-matrix\.spec\.js/,
      timeout: 90_000,
      workers: 1,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /cross-browser-primary-matrix\.spec\.js/,
      timeout: 90_000,
      workers: 1,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testMatch: /cross-browser-primary-matrix\.spec\.js/,
      timeout: 90_000,
      workers: 1,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      testMatch: /cross-browser-primary-matrix\.spec\.js/,
      timeout: 90_000,
      workers: 1,
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});

