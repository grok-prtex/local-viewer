import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  // e2e/private/ の受け入れ用 spec は ACCEPTANCE.md を書き換えるため、通常の実行では動かしません（PW_PRIVATE=1 で含める）
  testIgnore: process.env.PW_PRIVATE ? [] : ['private/**'],
  timeout: 60_000,
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:4173', locale: 'ja-JP', channel: process.env.PW_CHANNEL ?? 'chrome', viewport: { width: 1280, height: 860 }, launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: process.env.BASE_URL ? undefined : { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
});
