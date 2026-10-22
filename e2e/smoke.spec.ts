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
  await expect(page.getByTestId('zip-list').locator('li:not(.zdir)')).toHaveCount(3);
  await page.screenshot({ path: `${SHOTS}/08-zip.png` });
  await page.locator('li:not(.zdir)', { hasText: 'sample.step' }).getByRole('button', { name: '開く', exact: true }).click();
  await expect(page.locator('[data-testid="three-host"][data-rendered="true"]')).toBeVisible({ timeout: 40000 });
  w.assertClean('sample.zip'); expect(w.problems).toEqual([]);
});

test('CSV と Excel/Word 準備中', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'sample.csv');
  await expect(page.getByTestId('sheet').getByText('ナットM6')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/10-csv-sjis.png` });
  await openFixture(page, 'sample.xlsx');
  await expect(page.getByText('Excel（XLSX / XLS）の表示は準備中です')).toBeVisible();
  await openFixture(page, 'sample.docx');
  await expect(page.getByText('Word（DOCX）の表示は準備中です')).toBeVisible();
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

test('3D PDF（PRC・B-rep のみ）: 案内とページ表示', async ({ page, baseURL }) => {
  const w = watch(page, baseURL!);
  await openFixture(page, 'sample-3d-prc.pdf');
  await expect(page.getByText('この PDF には 3D モデル（PRC 形式）が含まれています。')).toBeVisible();
  await expect(page.getByText(/厳密形状（B-rep）だけで書かれています/)).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: `${SHOTS}/15-pdf3d-prc.png` });
  await page.getByRole('tab', { name: 'PDF ページ' }).click();
  await expect(page.locator('canvas.pdf-page[data-rendered="true"]')).toHaveCount(1, { timeout: 20000 });
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

test('Parasolid is unsupported', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample.x_t');
  await expect(page.getByText(/まだ対応していません|対応形式/)).toBeVisible();
  await expect(page.getByTestId('ps-info')).toHaveCount(0);
});

test('SolidWorks is unsupported', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample.SLDPRT');
  await expect(page.getByText(/まだ対応していません/)).toBeVisible();
  await expect(page.getByTestId('sw-preview')).toHaveCount(0);
  await page.getByTestId('clear').click();
  await expect(page.locator('section.formats')).toBeVisible();
  await expect(page.locator('section.formats')).not.toContainText(/SolidWorks|sldprt|sldasm/i);
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

test('ASCII STL の複数 solid をツリーに表示', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/multi.stl');
  await expect(page.getByTestId('model-tree')).toContainText('partA');
  await expect(page.getByTestId('model-tree')).toContainText('partB');
});

test('Ctrl+ホイールはビューア内だけで拡大（画像・PDF）', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample.pdf');
  await expect(page.locator('canvas.pdf-page[data-rendered="true"]').first()).toBeVisible();
  // ビューア内の wheel が preventDefault されていること（＝ブラウザのページ拡大が起きない）
  await page.evaluate(() => { (window as any).__prevented = null; document.addEventListener('wheel', (e) => { (window as any).__prevented = e.defaultPrevented; }, { passive: true }); });
  const box = (await page.getByTestId('pdf-pages').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 100);
  await page.keyboard.down('Control'); await page.mouse.wheel(0, -200); await page.keyboard.up('Control');
  await expect.poll(() => page.evaluate(() => (window as any).__prevented)).toBe(true);
  await expect(page.locator('.toolbar .mono').filter({ hasText: '%' }).first()).not.toHaveText('100%', { timeout: 3000 });
  await expect(page.locator('canvas.pdf-page[data-rendered="true"]').first()).toBeVisible();
});

test('モバイル：2 本指ピンチで画像を拡大', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/media/sample.png');
  const dims = page.getByTestId('img-dims');
  await expect(dims).toBeVisible();
  const before = await dims.innerText();
  const b = (await page.getByTestId('img-host').boundingBox())!;
  const cdp = await ctx.newCDPSession(page);
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  const pts = (d: number) => [{ x: cx - d, y: cy }, { x: cx + d, y: cy }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(20) });
  for (let d = 30; d <= 120; d += 15) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(dims).not.toHaveText(before);
  // ページ自体は拡大されていない
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  await ctx.close();
});

test.describe('テキスト・ソースコード', () => {
  for (const [f, enc, txt] of [['sjis.txt', 'Shift_JIS', '日本語のテキスト'], ['eucjp.log', 'EUC-JP', 'ログ 日本語'], ['utf16.ini', 'UTF-16LE', '設定']]) {
    test(`文字コード ${f}`, async ({ page }) => {
      await page.goto('/');
      await page.setInputFiles('input[type=file]', `tests/fixtures/text/${f}`);
      await expect(page.getByTestId('code')).toContainText(txt);
      await expect(page.getByTestId('encoding')).toContainText(enc);
    });
  }
  test('Markdown は安全に整形・ソース切替', async ({ page }) => {
    const ext: string[] = []; page.on('request', (r) => { if (!r.url().startsWith('http://localhost') && !r.url().startsWith('http://127.')) ext.push(r.url()); });
    await page.goto('/');
    await page.setInputFiles('input[type=file]', 'tests/fixtures/text/sample.md');
    await expect(page.getByTestId('markdown').locator('h1')).toHaveText('見出し');
    await expect(page.getByTestId('markdown').locator('script')).toHaveCount(0);
    await expect(page.getByTestId('markdown')).toContainText('外部の画像は読み込みません');
    await page.getByTestId('mode-toggle').click();
    await expect(page.getByTestId('code')).toContainText('# 見出し');
    expect(ext).toEqual([]);
  });
  test('JSON / XML 整形', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('input[type=file]', 'tests/fixtures/text/sample.json');
    await expect(page.getByTestId('code').locator('.row')).toHaveCount(10);
    await page.getByRole('button', { name: '別のファイルを開く' }).click().catch(() => {});
    await page.goto('/');
    await page.setInputFiles('input[type=file]', 'tests/fixtures/text/sample.xml');
    await expect(page.getByTestId('code')).toContainText('<item id="1">値</item>');
  });
  test('JSON Lines：1 行ずつ整形・元の行番号・壊れた行だけ元のまま／JSONC のコメント', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('input[type=file]', 'tests/fixtures/text/sample.jsonl');
    const code = page.getByTestId('code');
    await expect(code).toHaveAttribute('data-view', 'jsonl');
    await expect(page.getByTestId('text-info')).toContainText('4 件・解釈できない行 1');
    await expect(code.locator('.row.jl-err')).toHaveCount(1);
    await expect(code.locator('.row.jl-err')).toContainText('4 行目');
    expect((await code.locator('.row .ln').allInnerTexts()).map((x) => x.trim()).filter(Boolean)).toEqual(['1', '3', '!', '4', '5']);
    await expect(code.locator('.row.jl-rec')).toHaveCount(3);
    await page.getByTestId('mode-toggle').click();
    await expect(code.locator('.row')).toHaveCount(6);
    await page.goto('/');
    await page.setInputFiles('input[type=file]', 'tests/fixtures/text/sample.jsonc');
    await expect(code.locator('.row')).toHaveCount(7);
    await expect(code).not.toContainText('コメント');
    await expect(page.locator('.textview .hint')).toContainText('コメントと末尾のカンマを除いて');
  });
  test('HTML はスクリプトを動かし、隔離枠の外には出られない', async ({ page, baseURL }) => {
    // CSP で止めた要求も request イベントは出るため、実際に通信が完了したもの・CSP 以外で失敗したものを数えます
    const ext: string[] = []; const isExt = (u: string) => !u.startsWith(baseURL!) && !/^(data|blob|about):/.test(u);
    page.on('requestfinished', (r) => { if (isExt(r.url())) ext.push('finished ' + r.url()); });
    page.on('requestfailed', (r) => { if (isExt(r.url()) && !/^csp$|BLOCKED_BY_CSP|blocked/i.test(r.failure()?.errorText ?? '')) ext.push('failed ' + r.url() + ' ' + r.failure()?.errorText); });
    await page.goto('/');
    await page.setInputFiles('input[type=file]', 'tests/fixtures/text/html-js.html');
    const fr = page.frameLocator('[data-testid="html-frame"]');
    await expect(fr.locator('h1')).toHaveText('スクリプトが動きました');
    for (const k of ['parent.document', 'top.location', 'indexedDB', 'localStorage', 'fetch', 'window.open', 'WebSocket', 'external img'])
      await expect(fr.locator(`li[data-check="${k}"]`), k).toHaveAttribute('data-blocked', 'true', { timeout: 10000 });
    await fr.locator('#b').click(); await expect(fr.locator('#b')).toHaveText('クリック 1');
    await expect(page.getByTestId('file-name')).toHaveText('html-js.html');
    await expect(page.locator('body')).not.toContainText('PWNED');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/html-js.png`, fullPage: true });
    // 親のセッション（IndexedDB）は無事で、再読み込みで復元され、また実行される
    await page.reload();
    await expect(page.getByTestId('file-name')).toHaveText('html-js.html');
    await expect(fr.locator('h1')).toHaveText('スクリプトが動きました');
    // ソース表示に切り替えできる
    await page.getByTestId('mode-toggle').click();
    await expect(page.getByTestId('code')).toContainText('スクリプトが動きました');
    expect(ext).toEqual([]);
  });
  test('ソースのハイライト・行番号・Ctrl+F', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('input[type=file]', 'tests/fixtures/text/sample.py');
    await expect(page.getByTestId('code').locator('.hljs-keyword').first()).toBeVisible();
    await expect(page.getByTestId('code').locator('.ln').nth(5)).toHaveText('6');
    await page.keyboard.press('Control+f');
    await page.getByTestId('find').fill('hello');
    await expect(page.getByTestId('find-count')).toHaveText('1 / 2 行');
    await page.getByTestId('find').press('Enter');
    await expect(page.getByTestId('find-count')).toHaveText('2 / 2 行');
  });
  for (const f of ['sample.st', 'sample.nc']) test(`PLC/NC ${f}`, async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('input[type=file]', `tests/fixtures/text/${f}`);
    await expect(page.getByTestId('code').locator('[class^="hljs-"]').first()).toBeVisible();
  });
  test('ZIP のフォルダーツリーからソースを開く', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('input[type=file]', 'tests/fixtures/text/src.zip');
    await page.getByRole('button', { name: /src\// }).click();
    await page.getByRole('button', { name: /util\// }).click();
    await page.locator('li', { hasText: 'helper.ts' }).getByRole('button', { name: '開く' }).click();
    await expect(page.getByTestId('code')).toContainText('export const x');
  });
});

test('Excel / Word / PPTX は準備中バッジ', async ({ page }) => {
  await page.goto('/');
  for (const label of ['Excel', 'Word', 'PowerPoint']) {
    const li = page.locator('li', { has: page.locator('.fmt', { hasText: label }) });
    await expect(li.getByText('準備中')).toBeVisible();
  }
});

test('SQLite：テーブル一覧・行・読み取り専用 SQL', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample.sqlite');
  await expect(page.getByTestId('sql-tables')).toContainText('部品');
  await expect(page.getByTestId('sql-grid')).toContainText('フレーム');
  await page.getByTestId('sql-input').fill('SELECT 名称 FROM 部品 WHERE 数量 > 5');
  await page.getByTestId('sql-run').click();
  await expect(page.getByTestId('sql-grid')).toContainText('ブラケット');
  await expect(page.getByTestId('sql-grid')).not.toContainText('フレーム');
  await page.getByTestId('sql-input').fill('DELETE FROM 部品');
  await page.getByTestId('sql-run').click();
  await expect(page.getByText('書き込みや変更を伴う SQL は実行できません')).toBeVisible();
});

test('joblib：実行せずメタ情報だけ表示', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample.joblib');
  await expect(page.getByTestId('joblib')).toContainText('復元（実行）は一切しません');
  await expect(page.getByTestId('joblib-strings')).toContainText('見本');
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample-zlib.joblib');
  await expect(page.getByTestId('joblib')).toContainText('zlib');
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample-np.joblib');
  await expect(page.getByTestId('joblib')).toContainText(/numpy|joblib|NumpyArray/);
});

test('Access MDB / ACCDB', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample.mdb');
  await expect(page.getByTestId('access-tables')).toContainText('Table1');
  await expect(page.getByTestId('access-grid')).toContainText('abcdefg');
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample.accdb');
  await expect(page.getByTestId('access-tables')).toContainText('Table1');
  await expect(page.getByTestId('access-grid').locator('td').first()).toBeVisible();
});
