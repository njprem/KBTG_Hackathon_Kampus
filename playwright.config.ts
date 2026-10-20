import { defineConfig, devices } from '@playwright/test'

// Flow walkthroughs at phone width. Every test attaches screenshots so the HTML report
// (`npm run e2e:report`) doubles as a local gallery of each prototype path.
const port = 4174

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Pixel 7'],
    viewport: { width: 375, height: 812 },
    baseURL: `http://127.0.0.1:${port}`,
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    trace: 'retain-on-failure',
    // Optional: point at a preinstalled Chromium instead of `npx playwright install chromium`.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'phone' }],
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
})
