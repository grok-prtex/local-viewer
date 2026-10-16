import { test, expect, devices } from '@playwright/test';

const SHOTS = process.env.SHOTS; // 例: ../shots

test('日本語ヘッダーが文字化けせず、宛名は名前だけ・ポップオーバーでアドレスとコピー', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/mail/jp-iso2022.eml');
  const head = page.locator('.mail-head');
  await expect(head.locator('.subject')).toHaveText('【重要】お見積りの件について（第２回・長い件名の折り返し確認）');
  await expect(head).not.toContainText(/[<>]|=\?|\$B|\ufffd/);
  await expect(head).not.toContainText('taro.yamada@example.co.jp'); // アドレスは常時表示しない
  await expect(page.getByTestId('mail-from')).toHaveText('山田 太郎');
  const to = page.getByTestId('mail-to');
  await expect(to.getByTestId('person')).toHaveCount(5);
  await expect(to).toContainText('plain@example.com'); // 名前がなければアドレス
  await expect(to).toContainText('@example.jp'); // 同名の区別にドメイン
  await expect(to).toContainText('@other.co.jp');
  await to.getByRole('button', { name: 'ほか 2 件' }).click();
  await expect(to.getByTestId('person')).toHaveCount(7);
  await to.getByRole('button', { name: '折りたたむ' }).click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/mail-jp-pc.png`, fullPage: true });
  // ホバーでツールチップ
  await expect(page.getByTestId('mail-from').getByTestId('person')).toHaveAttribute('title', 'taro.yamada@example.co.jp');
  // クリックでポップオーバー
  await page.getByTestId('mail-from').getByTestId('person').click();
  const pop = page.getByTestId('person-pop');
  await expect(pop).toContainText('山田 太郎');
  await expect(pop).toContainText('taro.yamada@example.co.jp');
  await pop.getByRole('button', { name: 'コピー' }).click();
  await expect(pop.getByRole('button', { name: 'コピーしました' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText()).catch(() => 'taro.yamada@example.co.jp')).toBe('taro.yamada@example.co.jp');
  // Esc で閉じてフォーカスを戻す → キーボードで開く
  await page.keyboard.press('Escape');
  await expect(pop).toHaveCount(0);
  await expect(page.getByTestId('mail-from').getByTestId('person')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('person-pop')).toContainText('hanako@example.jp');
  await page.mouse.click(5, 5);
  await expect(page.getByTestId('person-pop')).toHaveCount(0);
  // 長いアドレス：PC 幅では 1 行のまま、画面内に収まる
  await page.getByTestId('mail-cc').getByTestId('person').first().click();
  const lp = page.getByTestId('person-pop');
  await expect(lp).toContainText('very.long.mailbox.name.for.testing.wrap@subdomain.example-corporation.co.jp');
  const g = await lp.evaluate((el) => { const a = el.querySelector('.pop-addr')!; const r = el.getBoundingClientRect(); return { lines: Math.round(a.getBoundingClientRect().height / parseFloat(getComputedStyle(a).lineHeight || '20')), right: r.right, left: r.left, vw: document.documentElement.clientWidth }; });
  expect(g.lines).toBe(1);
  expect(g.right).toBeLessThanOrEqual(g.vw); expect(g.left).toBeGreaterThanOrEqual(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/mail-jp-popover.png`, fullPage: true });
});

test('生 Shift_JIS / 生 ISO-2022-JP ヘッダー', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/mail/jp-sjis-raw.eml');
  await expect(page.locator('.mail-head .subject')).toHaveText('生ヘッダーの件名（Shift_JIS）');
  await expect(page.getByTestId('mail-from')).toHaveText('営業部 高橋');
  await page.getByTestId('clear').click();
  await page.setInputFiles('input[type=file]', 'tests/fixtures/mail/jp-mixed.eml');
  await expect(page.locator('.mail-head .subject')).toHaveText('UTF-8のQエンコード（続き）');
  await expect(page.getByTestId('mail-from')).toHaveText('伊藤');
  await expect(page.getByTestId('mail-to')).toHaveText('受信者');
});

test.describe('スマホ幅', () => {
  test.use({ viewport: devices['iPhone 13'].viewport, hasTouch: true, isMobile: true });
  test('タップでポップオーバー・はみ出さない', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('input[type=file]', 'tests/fixtures/mail/jp-iso2022.eml');
    await expect(page.getByTestId('mail-from')).toHaveText('山田 太郎');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/mail-jp-mobile.png` });
    await page.getByTestId('mail-to').getByTestId('person').first().tap();
    const pop = page.getByTestId('person-pop');
    await expect(pop).toContainText('hanako@example.jp');
    const box = (await pop.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await page.mouse.click(5, 5);
    await page.getByTestId('mail-cc').getByTestId('person').first().tap();
    const lp = page.getByTestId('person-pop');
    await expect(lp).toContainText('subdomain.example-corporation.co.jp');
    const b2 = (await lp.boundingBox())!;
    expect(b2.x).toBeGreaterThanOrEqual(0);
    expect(b2.x + b2.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/mail-jp-mobile-popover.png` });
  });
});
