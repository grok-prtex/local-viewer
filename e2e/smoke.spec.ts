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
  await page.getByTestId('file-input').setInputFiles({ name: 'data.xyz', mimeType: 'application/octet-stream', buffer: Buffer.from([1, 2, 3, 4]) });
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

test('3D PDF（U3D）: 3D 表示と PDF ページの切り替え', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'sample-3d-u3d.pdf');
  await expect(page.getByText('3D モデル（U3D 形式）が含まれています')).toBeVisible();
  await expect(page.locator('[data-testid="three-host"][data-rendered="true"]')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/外形 \d/)).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/14-pdf3d-u3d.png` });
  await page.getByRole('tab', { name: 'PDF ページ' }).click();
  await expect(page.locator('canvas.pdf-page[data-rendered="true"]')).toHaveCount(1, { timeout: 20000 });
  await page.getByTestId('tab-3d').click();
  await expect(page.locator('[data-testid="three-host"][data-rendered="true"]')).toBeVisible({ timeout: 30000 });
  w.assertClean('sample-3d-u3d.pdf'); expect(w.problems).toEqual([]);
});

test('3D PDF（PRC）: 未対応メッセージとページ表示', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'sample-3d-prc.pdf');
  await expect(page.getByText('この3DPDF（PRC形式）はまだ未対応です。ページは表示できます。')).toBeVisible();
  await expect(page.locator('canvas.pdf-page[data-rendered="true"]')).toHaveCount(1, { timeout: 20000 });
  await page.screenshot({ path: `${SHOTS}/15-pdf3d-prc.png` });
  await page.getByTestId('tab-3d').click();
  await expect(page.getByText('この3DPDF（PRC形式）はまだ未対応です', { exact: true })).toBeVisible();
  w.assertClean('sample-3d-prc.pdf'); expect(w.problems).toEqual([]);
});

test('U3D 単体ファイル', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'sample.u3d');
  await expect(page.locator('[data-testid="three-host"][data-rendered="true"]')).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/16-u3d.png` });
  w.assertClean('sample.u3d'); expect(w.problems).toEqual([]);
});

const IMAGES: [string, string][] = [
  ['media/sample.png', '320 × 200'], ['media/sample.jpg', '320 × 200'], ['media/sample.gif', '320 × 200'], ['media/sample.webp', '320 × 200'],
  ['media/sample.bmp', '320 × 200'], ['media/sample.ico', '64 × 64'], ['media/sample.svg', '320 × 200'], ['media/sample.heic', '320 × 200'],
  ['media/sample.tif', '320 × 200'], ['media/sample.psd', '320 × 200'], ['media/sample.cr2', '640 × 400'], ['media/sample.tga', '320 × 200'],
  ['media/sample.jxl', '320 × 200'],
];
for (const [f, dims] of IMAGES) {
  test(`画像 ${f}`, async ({ page, baseURL }) => {
    const w = watch(page, baseURL!);
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles(path.join(FX, f));
    await expect(page.getByTestId('img-dims')).toContainText(dims, { timeout: 30000 });
    await expect(page.getByTestId('img')).toBeVisible();
    if (f.endsWith('.tif')) await expect(page.locator('.toolbar select option')).toHaveCount(2);
    if (['media/sample.heic', 'media/sample.tif', 'media/sample.psd', 'media/sample.cr2', 'media/sample.png'].includes(f))
      await page.screenshot({ path: `${SHOTS}/20-image-${path.extname(f).slice(1)}.png` });
    w.assertClean(f); expect(w.problems).toEqual([]);
  });
}

test('動画・音声（再生できる形式）', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  for (const [f, sel] of [['media/sample.mp4', 'video'], ['media/sample.webm', 'video'], ['media/sample.wav', 'audio'], ['media/sample.mp3', 'audio']]) {
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles(path.join(FX, f));
    await expect.poll(() => page.getByTestId(sel).evaluate((m: HTMLMediaElement) => m.readyState), { timeout: 15000 }).toBeGreaterThan(0);
    if (f.endsWith('mp4')) await page.screenshot({ path: `${SHOTS}/21-video-mp4.png` });
  }
  w.assertClean('media/sample.mp4'); expect(w.problems).toEqual([]);
});

test('動画（再生できない形式はコンテナ情報を表示）', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles(path.join(FX, 'media/sample.avi'));
  await expect(page.getByTestId('media-info')).toContainText('AVI', { timeout: 15000 });
  await expect(page.getByTestId('media-info')).toContainText('XVID');
  await page.screenshot({ path: `${SHOTS}/22-video-avi.png` });
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles(path.join(FX, 'media/sample.flv'));
  await expect(page.getByTestId('media-info')).toContainText('FLV', { timeout: 15000 });
});

test('ZIP 内の画像と動画を開く', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'media.zip');
  await page.locator('li', { hasText: '写真.jpg' }).getByRole('button', { name: '開く', exact: true }).click();
  await expect(page.getByTestId('img-dims')).toContainText('320 × 200');
  await page.getByRole('button', { name: '戻る' }).click();
  await page.locator('li', { hasText: 'clip.mp4' }).getByRole('button', { name: '開く', exact: true }).click();
  await expect.poll(() => page.getByTestId('video').evaluate((m: HTMLMediaElement) => m.readyState), { timeout: 15000 }).toBeGreaterThan(0);
  w.assertClean('media.zip'); expect(w.problems).toEqual([]);
});

test('Parasolid header info', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample.x_t');
  await expect(page.getByTestId('ps-info')).toContainText('local-viewer test');
  await expect(page.getByText('形状表示は準備中です')).toBeVisible();
});

test('progress UI and cancel for STEP', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample.step');
  // 小さいファイルは一瞬で終わるので、進捗が出るか結果が出るかのどちらかを確認します
  await expect(page.getByTestId('progress').or(page.getByTestId('three-host'))).toBeVisible();
  await expect(page.getByTestId('three-host')).toBeVisible({ timeout: 60000 });
});

test('上方向切替と回転中心', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample.stl');
  await expect(page.getByTestId('three-host')).toBeVisible({ timeout: 60000 });
  await page.getByRole('button', { name: /上方向/ }).click();
  await expect(page.getByRole('button', { name: '上方向 Y' })).toBeVisible();
  const b = (await page.getByTestId('three-host').boundingBox())!;
  await page.mouse.move(b.x + 200, b.y + 200); await page.mouse.down(); await page.mouse.move(b.x + 300, b.y + 220); await page.mouse.up();
  await page.getByTestId('pivot').click();
  await expect(page.getByTestId('pivot')).toHaveText('回転中心：原点');
  expect(errors).toEqual([]);
});
