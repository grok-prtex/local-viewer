import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

/** 追加した形式（3D・圧縮・TSV・Parquet・MBOX・フォント）の公開テスト。外部通信とエラーがないことも確かめます */
const FX = path.resolve('tests/fixtures/newfmt');
const SHOTS = process.env.SHOTS_DIR ?? path.resolve('../shots');
mkdirSync(SHOTS, { recursive: true });

function watch(page: Page, base: string) {
  const out: string[] = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (u.protocol !== 'data:' && u.protocol !== 'blob:' && u.origin !== new URL(base).origin) out.push('外部通信 ' + r.url()); });
  page.on('pageerror', (e) => out.push('pageerror ' + e.message));
  page.on('console', (m) => { if (/Content.Security.Policy|Refused to/i.test(m.text())) out.push(m.text()); });
  return out;
}
async function open(page: Page, ...names: string[]) {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles(names.map((n) => path.join(FX, n)));
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test('OBJ と MTL（テクスチャがなくても色で表示）', async ({ page, baseURL }) => {
  const p = watch(page, baseURL!);
  await open(page, 'cube.obj', 'cube.mtl');
  await expect(page.locator('[data-testid=three-host][data-rendered=true]')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('model-note').first()).toContainText('missing.png');
  await page.screenshot({ path: `${SHOTS}/newfmt-obj.png` });
  expect(p).toEqual([]);
});

for (const f of ['Box_embedded.gltf', 'pyramid_vertexcolor.3mf', 'dolphins.ply']) {
  test(`3D ${f}`, async ({ page, baseURL }) => {
    const p = watch(page, baseURL!);
    await open(page, f);
    await expect(page.locator('[data-testid=three-host][data-rendered=true]')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('model-stats')).toBeVisible();
    expect(p).toEqual([]);
  });
}

test('7z（日本語名・中のファイルを開いて戻る）', async ({ page, baseURL }) => {
  const p = watch(page, baseURL!);
  await open(page, 'japanese.7z');
  await expect(page.getByTestId('zip-list')).toContainText('日本語', { timeout: 30000 });
  await page.locator('[data-testid=zip-list] button', { hasText: /^開く$/ }).first().click();
  await page.getByTestId('back').click();
  await expect(page.getByTestId('archive-view')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/newfmt-7z.png` });
  expect(p).toEqual([]);
});

test('7z（暗号化）と壊れた 7z は日本語で知らせる', async ({ page, baseURL }) => {
  const p = watch(page, baseURL!);
  await open(page, 'encrypted.7z');
  await expect(page.locator('.state.error')).toContainText('パスワード', { timeout: 30000 });
  await open(page, 'broken.7z');
  await expect(page.locator('.state.error')).toBeVisible({ timeout: 30000 });
  expect(p).toEqual([]);
});

for (const f of ['japanese.tar', 'japanese.tar.gz']) {
  test(`tar ${f}`, async ({ page, baseURL }) => {
    const p = watch(page, baseURL!);
    await open(page, f);
    await expect(page.getByTestId('zip-list')).toContainText('日本語メモ.txt');
    expect(p).toEqual([]);
  });
}

test('.gz は中のファイルを開く', async ({ page, baseURL }) => {
  const p = watch(page, baseURL!);
  await open(page, 'memo.txt.gz');
  await expect(page.getByTestId('file-name')).toContainText('.txt', { timeout: 30000 });
  expect(p).toEqual([]);
});

test('TSV（列幅を変えられる）', async ({ page, baseURL }) => {
  const p = watch(page, baseURL!);
  await open(page, 'symbol.tsv');
  const th = page.locator('[data-testid=sheet] thead th').nth(1), h = page.getByTestId('col-rs-1');
  const w0 = (await th.boundingBox())!.width, b = (await h.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + 100, b.y + b.height / 2, { steps: 5 }); await page.mouse.up();
  expect((await th.boundingBox())!.width).toBeGreaterThan(w0 + 50);
  expect(p).toEqual([]);
});

test('Parquet（型・行数・列幅）', async ({ page, baseURL }) => {
  const p = watch(page, baseURL!);
  await open(page, 'alltypes_plain.parquet');
  await expect(page.getByTestId('pq-meta')).toContainText('8 行');
  await expect(page.locator('.pq-type').first()).toHaveText('INT32');
  await expect(page.locator('[data-testid=sheet] tbody tr')).toHaveCount(8);
  const th = page.locator('[data-testid=sheet] thead th').nth(1), h = page.getByTestId('col-rs-1');
  const w0 = (await th.boundingBox())!.width, b = (await h.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + 100, b.y + b.height / 2, { steps: 5 }); await page.mouse.up();
  expect((await th.boundingBox())!.width).toBeGreaterThan(w0 + 50);
  await page.screenshot({ path: `${SHOTS}/newfmt-parquet.png` });
  expect(p).toEqual([]);
});

test('MBOX（文字化けせず、開くと EML 表示）', async ({ page, baseURL }) => {
  const p = watch(page, baseURL!);
  await open(page, 'mixed.mbox');
  const list = page.getByTestId('mbox-list');
  await expect(list).toContainText('ISO-2022-JP の件名テスト');
  await expect(list).toContainText('UTF-8 の件名');
  await expect(list).not.toContainText('=?');
  await page.getByTestId('mbox-open').first().click();
  await expect(page.getByTestId('mail-from')).toBeVisible();
  await page.getByTestId('back').click();
  await expect(list).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.screenshot({ path: `${SHOTS}/newfmt-mbox-mobile.png` });
  expect(p).toEqual([]);
});

test('フォント（情報・見本・グリフ・文字の入力）', async ({ page, baseURL }) => {
  const p = watch(page, baseURL!);
  await open(page, 'inter-latin-700.woff2');
  await expect(page.getByTestId('font-info')).toContainText('Inter');
  expect(await page.locator('[data-testid=glyph-grid] li').count()).toBeGreaterThan(50);
  await page.getByTestId('font-input').fill('Hello 123');
  await expect(page.getByTestId('font-samples')).toContainText('Hello 123');
  await page.screenshot({ path: `${SHOTS}/newfmt-font.png` });
  expect(p).toEqual([]);
});

test('壊れた GLB は日本語で知らせる', async ({ page, baseURL }) => {
  const p = watch(page, baseURL!);
  await open(page, 'broken.glb');
  await expect(page.locator('.state.error')).toBeVisible({ timeout: 30000 });
  expect(p).toEqual([]);
});
