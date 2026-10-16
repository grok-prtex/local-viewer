import { test, expect } from '@playwright/test';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const SHOTS = process.env.SHOTS_DIR ?? path.resolve('../shots');
mkdirSync(SHOTS, { recursive: true });
const empty = (name: string) => ({ name, mimeType: 'application/octet-stream', buffer: Buffer.alloc(0) });

test('0 バイトのファイルはどの拡張子でも空ファイルとして案内（再読み込み・タブ切替も）', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  for (const n of ['empty.txt', 'empty.csv', 'empty.json', 'empty.stl', 'empty.pdf', 'empty.dxf', 'empty.ipynb', 'empty.sqlite', 'empty.eml', 'noext']) {
    await page.getByTestId('file-input').setInputFiles(empty(n));
    const box = page.getByTestId('empty-file');
    await expect(box, n).toBeVisible();
    await expect(box).toContainText('中身が空のファイルです');
    await expect(box).toContainText(n);
    await expect(box).toContainText('0 バイト');
    await expect(box).toContainText(n.includes('.') ? '.' + n.split('.').pop() : 'なし');
    await expect(page.locator('.error, [role="alert"]')).toHaveCount(0);
  }
  await page.getByTestId('file-input').setInputFiles(empty('memo.txt'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/empty-file.png` });
  await page.reload();
  await expect(page.getByTestId('file-name')).toHaveText('memo.txt');
  await expect(page.getByTestId('empty-file')).toBeVisible();
  // 英語
  await page.getByTestId('lang-en').click();
  await expect(page.getByTestId('empty-file')).toContainText('This file is empty');
  await expect(page.getByTestId('empty-file')).toContainText('0 bytes');
  expect(errors).toEqual([]);
});

test('空白・改行だけのテキストは行番号付きで表示し、空に近い旨を出す', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles({ name: 'blank.txt', mimeType: 'text/plain', buffer: Buffer.from('  \n\n \n') });
  await expect(page.getByTestId('code')).toBeVisible();
  await expect(page.getByTestId('blank-note')).toContainText('空白・改行だけのファイルです');
});
