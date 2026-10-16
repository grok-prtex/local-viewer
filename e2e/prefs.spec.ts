import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const FX = path.resolve('tests/fixtures');
const SHOTS = process.env.SHOTS_DIR ?? path.resolve('../shots');
mkdirSync(SHOTS, { recursive: true });
const JA = /[\u3040-\u30ff\u4e00-\u9fff]/;
/** ファイルの中身（表・本文・図面）を除いた画面の文字に日本語が残っていないこと */
async function uiText(page: Page) {
  return page.evaluate(() => {
    const skip = '.sheetx, .sql-side, .sql-schema, .mail-body, iframe, .text-body, pre, .code, [data-testid="dxf-host"] canvas, .people, .mail-head dd';
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(skip).forEach((n) => n.remove());
    clone.querySelectorAll('[lang="ja"]').forEach((n) => n.remove());
    return clone.innerText + ' ' + [...document.querySelectorAll('[title],[aria-label],[placeholder]')].filter((e) => !e.closest('.sheetx, .sql-side, .sql-schema, .people, .mail-head dd, iframe')).map((e) => (e.getAttribute('title') ?? '') + (e.getAttribute('aria-label') ?? '') + (e.getAttribute('placeholder') ?? '')).join(' ');
  });
}

test.describe('英語ブラウザ', () => {
  test.use({ locale: 'en-US', colorScheme: 'dark', viewport: { width: 1280, height: 860 } });
  test('lang=en で英語表示、日本語が残らない（ダーク PC）', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByText('Anything Local Viewer').first()).toBeVisible();
    const txt = await uiText(page);
    expect(txt.match(new RegExp(JA.source + '.{0,20}', 'g')) ?? []).toEqual([]);
    await expect(page).toHaveTitle(/Anything Local Viewer/);
    await page.screenshot({ path: `${SHOTS}/i18n-en-dark-pc.png` });
    for (const f of ['sample.sqlite', 'sample.csv', 'sample.eml', 'sample.dxf', 'sample.pdf']) {
      await page.getByTestId('file-input').setInputFiles(path.join(FX, f));
      await page.waitForTimeout(1500);
      const t2 = await uiText(page);
      expect(t2.match(new RegExp(JA.source + '.{0,20}', 'g')) ?? [], f).toEqual([]);
      if (f === 'sample.sqlite') await page.screenshot({ path: `${SHOTS}/i18n-en-dark-pc-sqlite.png` });
    }
  });
});

test.describe('日本語ブラウザ（スマホ）', () => {
  test.use({ locale: 'ja-JP', colorScheme: 'light', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('日本語 × ライト、切替で英語・ダークになり再読み込み後も保持', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByText('なんでもローカルビューア').first()).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/i18n-ja-light-mobile.png`, fullPage: false });
    await page.getByTestId('prefs').screenshot({ path: `${SHOTS}/i18n-switcher-ja.png` });
    await page.getByTestId('lang-en').click();
    await page.getByTestId('theme-dark').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByText('Anything Local Viewer').first()).toBeVisible();
    await page.getByTestId('prefs').screenshot({ path: `${SHOTS}/i18n-switcher-en-dark.png` });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('theme-auto').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('列幅変更', () => {
  test.use({ locale: 'ja-JP', viewport: { width: 1280, height: 860 } });
  test('DB：ドラッグで広げる・最小幅・ダブルクリックで自動調整・キーボード', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles(path.join(FX, 'sample.sqlite'));
    const grid = page.getByTestId('sql-grid');
    await expect(grid.locator('tbody tr').first()).toBeVisible();
    const th = grid.locator('thead th').nth(1), h = grid.getByTestId('col-rs-1');
    const w0 = (await th.boundingBox())!.width;
    const b = (await h.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + 160, b.y + b.height / 2, { steps: 6 });
    await expect(h).toHaveClass(/active/);
    await page.mouse.up();
    const w1 = (await th.boundingBox())!.width;
    expect(w1).toBeGreaterThan(Math.min(w0, 60) + 120);
    // 初回の固定幅化で、ほかの列は内容に合った幅になる（id 列が広く残らない）
    expect((await grid.locator('thead th').first().boundingBox())!.width).toBeLessThan(70);
    await page.screenshot({ path: `${SHOTS}/colresize-db-after.png` });
    const b2 = (await h.boundingBox())!;
    await page.mouse.move(b2.x + b2.width / 2, b2.y + 5); await page.mouse.down(); await page.mouse.move(b2.x - 900, b2.y + 5, { steps: 5 }); await page.mouse.up();
    expect(Math.round((await th.boundingBox())!.width)).toBeGreaterThanOrEqual(39);
    await h.dblclick();
    const wa = (await th.boundingBox())!.width; expect(wa).toBeGreaterThan(45);
    await h.focus(); await page.keyboard.press('ArrowRight');
    expect((await th.boundingBox())!.width).toBeGreaterThan(wa + 5);
  });
  test('DXF ライト背景で黄色の文字・線を濃く表示', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles(path.join(FX, 'dxf/jp-titleblock.dxf'));
    await page.locator('[data-rendered=true]').waitFor();
    await page.getByTestId('dxf-space').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/dxf-light-contrast.png` });
  });
  test('CSV：列見出しの境界をドラッグ', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles(path.join(FX, 'sample.csv'));
    const sheet = page.getByTestId('sheet');
    const th = sheet.locator('thead th').first(), h = sheet.getByTestId('col-rs-0');
    const w0 = (await th.boundingBox())!.width, b = (await h.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + 120, b.y + b.height / 2, { steps: 5 }); await page.mouse.up();
    expect((await th.boundingBox())!.width).toBeGreaterThan(w0 + 90);
    await page.screenshot({ path: `${SHOTS}/colresize-csv-after.png` });
  });
});
