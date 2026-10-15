import { test, expect, type Page, type Request } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const FX = path.resolve('tests/fixtures');
const SHOTS = process.env.SHOTS_DIR ?? path.resolve('../shots');
mkdirSync(SHOTS, { recursive: true });

function watch(page: Page, base: string) {
  const reqs: Request[] = []; const problems: string[] = [];
  page.on('request', (r) => reqs.push(r));
  page.on('console', (m) => { if (/Content.Security.Policy|Refused to/i.test(m.text())) problems.push(m.text()); });
  return {
    problems,
    assertClean(fixture: string) {
      const bytes = readFileSync(path.join(FX, fixture));
      const probe = bytes.subarray(0, Math.min(64, bytes.length)).toString('latin1');
      for (const r of reqs) {
        const u = new URL(r.url());
        if (u.protocol === 'data:' || u.protocol === 'blob:') continue;
        expect(u.origin, `外部通信: ${r.url()}`).toBe(new URL(base).origin);
        expect(r.method(), `GET 以外: ${r.url()}`).toBe('GET');
        expect(r.postDataBuffer(), `本文つき: ${r.url()}`).toBeNull();
        expect(r.url().includes(fixture)).toBeFalsy();
        expect(decodeURIComponent(r.url()).includes(probe.slice(0, 16))).toBeFalsy();
      }
    },
  };
}

async function openFixture(page: Page, name: string) {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles(path.join(FX, name));
  await expect(page.getByTestId('file-name')).toHaveText(name);
}

test('ドロップ画面', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await page.goto('/');
  await expect(page.getByText('ファイルはPCから外部送信されません')).toBeVisible();
  await expect(page.getByText('準備中').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${SHOTS}/00-drop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${SHOTS}/00-drop-mobile.png`, fullPage: true });
  w.assertClean('sample.pdf'); expect(w.problems).toEqual([]);
});

test('PDF', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'sample.pdf');
  await expect(page.locator('canvas.pdf-page[data-rendered="true"]')).toHaveCount(1, { timeout: 20000 });
  await page.screenshot({ path: `${SHOTS}/01-pdf.png` });
  w.assertClean('sample.pdf'); expect(w.problems).toEqual([]);
});

test('EML（添付を開く）', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'sample.eml');
  await expect(page.getByText('お見積りの件')).toBeVisible();
  await expect(page.getByText('mitsumori.pdf')).toBeVisible();
  const body = page.frameLocator('[data-testid="mail-body"]');
  await expect(body.getByText('お見積りを添付いたします。')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/02-eml.png` });
  await page.getByRole('button', { name: '開く', exact: true }).click();
  await expect(page.locator('canvas.pdf-page[data-rendered="true"]')).toHaveCount(1, { timeout: 20000 });
  await page.getByRole('button', { name: '戻る' }).click();
  await expect(page.getByText('お見積りの件')).toBeVisible();
  w.assertClean('sample.eml');
  // tracker.example.com の画像は CSP で遮断され、リクエスト自体が外部に出ないこと
});

for (const [name, shot] of [['sample.stl', '03-stl'], ['sample.step', '04-step'], ['sample.igs', '05-iges']] as const) {
  test(`3D ${name}`, async ({ page, baseURL }) => {
    const w = watch(page, baseURL!);
    await openFixture(page, name);
    await expect(page.locator('[data-testid="three-host"][data-rendered="true"]')).toBeVisible({ timeout: 40000 });
    await expect(page.getByText(/外形 40\.\d+ × 30\.\d+ × 10\.\d+/)).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/${shot}.png` });
    if (name === 'sample.step') {
      await page.getByRole('button', { name: 'ワイヤーフレーム' }).click();
      await page.getByRole('button', { name: /背景/ }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SHOTS}/04-step-wire-dark.png` });
    }
    w.assertClean(name); expect(w.problems).toEqual([]);
  });
}

test('DXF', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'sample.dxf');
  await expect(page.locator('[data-testid="dxf-host"][data-rendered="true"]')).toBeVisible();
  await expect(page.getByText('HOLES')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/06-dxf.png` });
  w.assertClean('sample.dxf'); expect(w.problems).toEqual([]);
});

test('MSG', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'sample.msg');
  await expect(page.locator('.mail-head .subject')).not.toBeEmpty();
  await page.screenshot({ path: `${SHOTS}/07-msg.png` });
  w.assertClean('sample.msg'); expect(w.problems).toEqual([]);
});

test('ZIP（中の STEP を開く）', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'sample.zip');
  await expect(page.getByTestId('zip-list').locator('li')).toHaveCount(3);
  await page.screenshot({ path: `${SHOTS}/08-zip.png` });
  await page.locator('li', { hasText: 'cad/sample.step' }).getByRole('button', { name: '開く', exact: true }).click();
  await expect(page.locator('[data-testid="three-host"][data-rendered="true"]')).toBeVisible({ timeout: 40000 });
  w.assertClean('sample.zip'); expect(w.problems).toEqual([]);
});

test('XLSX / CSV / DOCX', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'sample.xlsx');
  await expect(page.getByTestId('sheet').getByText('ボルトM6')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/09-xlsx.png` });
  await openFixture(page, 'sample.csv');
  await expect(page.getByTestId('sheet').getByText('ナットM6')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/10-csv-sjis.png` });
  await openFixture(page, 'sample.docx');
  await expect(page.getByTestId('docx').getByText('作業手順書')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/11-docx.png` });
  w.assertClean('sample.docx'); expect(w.problems).toEqual([]);
});

test('未対応形式', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles({ name: 'photo.heic', mimeType: 'image/heic', buffer: Buffer.from([1, 2, 3, 4]) });
  await expect(page.getByText('この形式のファイルには、まだ対応していません。')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/12-unsupported.png` });
});

test('タブ内の一時保存（再読み込みで復元・消去・別コンテキストでは空）', async ({ page, browser, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'sample.pdf');
  await expect(page.locator('canvas.pdf-page[data-rendered="true"]')).toHaveCount(1, { timeout: 20000 });
  await page.reload();
  await expect(page.getByTestId('file-name')).toHaveText('sample.pdf');
  await expect(page.locator('canvas.pdf-page[data-rendered="true"]')).toHaveCount(1, { timeout: 20000 });
  expect(await page.evaluate(() => Object.keys(localStorage).length)).toBe(0);
  await page.screenshot({ path: `${SHOTS}/13-restored.png` });
  await page.getByTestId('clear').click();
  await expect(page.getByTestId('drop-zone')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('drop-zone')).toBeVisible();
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await p2.goto(baseURL! + '/');
  await expect(p2.getByTestId('drop-zone')).toBeVisible();
  await ctx.close();
  w.assertClean('sample.pdf'); expect(w.problems).toEqual([]);
});
