import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: '.',
  testMatch: 'site.spec.mjs',
  outputDir: '../evidence/test-results',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: fileURLToPath(new URL('../evidence/playwright-results.json', import.meta.url)) }]],
  use: { baseURL: 'http://127.0.0.1:4174', browserName: 'chromium', headless: true },
});
