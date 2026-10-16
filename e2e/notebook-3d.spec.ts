import { test, expect } from '@playwright/test';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const FX = path.resolve('tests/fixtures');
const SHOTS = process.env.SHOTS_DIR ?? path.resolve('../shots');
const NB = process.env.NB_FILE ?? path.join(FX, 'notebook/sample.ipynb');
mkdirSync(SHOTS, { recursive: true });

test.describe('Jupyter ノートブック', () => {
  test('セル表示・出力・安全性・JSON 切替（PC）', async ({ page, baseURL }) => {
    const ext: string[] = []; page.on('request', (r) => { const u = r.url(); if (!u.startsWith(baseURL!) && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
    await page.goto('/');
    await expect(page.locator('section.formats')).toContainText('Jupyter ノートブック');
    await page.getByTestId('file-input').setInputFiles(NB);
    const nb = page.getByTestId('notebook');
    await expect(nb.getByTestId('nb-code').first()).toBeVisible();
    if (!process.env.NB_FILE) {
      await expect(nb.locator('.nb-md h1')).toHaveText('解析ノート');
      await expect(nb.getByText('In [1]:')).toBeVisible();
      await expect(nb.locator('.nb-src .hljs-keyword').first()).toBeVisible();
      await expect(nb.getByText('面積 12.566370614359172')).toBeVisible();
      await expect(nb.locator('.nb-stderr')).toContainText('UserWarning');
      await expect(nb.getByTestId('nb-html').locator('table')).toBeVisible();
      await expect(nb.getByTestId('nb-html').locator('script, iframe, img')).toHaveCount(0);
      await expect(nb.getByTestId('nb-img')).toBeVisible();
      await expect(nb.getByTestId('nb-error')).toContainText('ZeroDivisionError: division by zero');
      await expect(nb.locator('.nb-md .md-noimg')).toContainText('外部の画像は読み込みません');
      await expect(nb.locator('.nb-md img[src^="data:image/png"]')).toHaveCount(1);
      expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
    } else {
      await expect(nb.getByTestId('nb-img').first()).toBeVisible();
    }
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/ipynb-pc.png` });
    await page.getByTestId('nb-toggle').click();
    await expect(page.getByTestId('code')).toContainText('"cells"');
    await page.getByTestId('nb-toggle').click();
    await expect(nb.getByTestId('nb-code').first()).toBeVisible();
    expect(ext).toEqual([]);
  });
  test.describe('スマホ・英語・ダーク', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'en-US', colorScheme: 'dark' });
    test('ipynb スマホ', async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('file-input').setInputFiles(NB);
      const nb = page.getByTestId('notebook');
      await expect(nb.getByTestId('nb-code').first()).toBeVisible();
      await expect(nb.getByTestId('nb-toggle')).toHaveText('View as JSON');
      await expect(nb).toContainText('code is never executed');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/ipynb-mobile.png` });
    });
  });
});

test('3D：上下の制限なく回して裏返せる・上方向切替で戻る', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles(path.join(FX, 'sample.step'));
  const host = page.locator('[data-testid="three-host"][data-rendered="true"]');
  await expect(host).toBeVisible({ timeout: 60000 });
  await expect.poll(async () => Number(await host.getAttribute('data-up-dot'))).toBeGreaterThan(0.5);
  const b = (await host.boundingBox())!;
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  // 縦に大きくドラッグ（約 180°）。OrbitControls なら真上で止まる
  await page.mouse.move(cx, cy - 120); await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(cx, cy - 120 + i * 14);
  await page.mouse.up();
  await expect.poll(async () => Number(await host.getAttribute('data-up-dot'))).toBeLessThan(-0.3);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/3d-free-rotate-flipped.png` });
  // 横にも回せる・パン・ズームが動く
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 200, cy, { steps: 8 }); await page.mouse.up();
  await page.mouse.wheel(0, -400);
  // 上方向切替で選んだ軸が上になる
  await page.getByRole('button', { name: /上方向/ }).click();
  await expect.poll(async () => Number(await host.getAttribute('data-up-dot'))).toBeGreaterThan(0.5);
  await page.getByRole('button', { name: /全体表示/ }).click();
  await expect.poll(async () => Number(await host.getAttribute('data-up-dot'))).toBeGreaterThan(0.5);
});
