import { defineConfig } from '@playwright/test'

// BASE_URL points at a running build (vite preview or astro preview). System Chrome is used so no browser download is needed.
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: process.env.STRICT ? 0 : 0.01, animations: 'disabled' } },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: process.env.BASE_URL || 'http://127.0.0.1:5175', channel: 'chrome', deviceScaleFactor: 1 },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
})
