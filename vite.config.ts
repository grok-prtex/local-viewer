import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// 画面に表示するコミット（未コミットの変更があれば -dirty を付けます）
const commit = (() => {
  try {
    const h = execSync('git rev-parse --short=12 HEAD').toString().trim();
    const dirty = execSync('git status --porcelain --untracked-files=no').toString().trim();
    return dirty ? h + '-dirty' : h;
  } catch { return 'unknown'; }
})();

// public/_headers（Cloudflare Pages 形式）の CSP をローカル preview でも同じように適用します
function pagesHeaders(): Plugin {
  const rules: { path: string; csp: string }[] = [];
  let cur = '';
  for (const line of readFileSync('public/_headers', 'utf8').split('\n')) {
    if (/^\S/.test(line)) cur = line.trim();
    const m = line.match(/^\s+Content-Security-Policy: (.*)/);
    if (m) rules.push({ path: cur, csp: m[1] });
  }
  const pick = (url: string) => {
    let csp = '';
    for (const r of rules) if (r.path === '/*' || url.split('?')[0] === r.path) csp = r.csp;
    return csp;
  };
  return {
    name: 'pages-headers',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => { res.setHeader('Content-Security-Policy', pick(req.url ?? '/')); next(); });
    },
  };
}

export default defineConfig({
  plugins: [react(), pagesHeaders()],
  define: { __COMMIT__: JSON.stringify(commit), 'process.env': {}, global: 'globalThis' },
  resolve: { alias: { buffer: 'buffer/', process: 'process/browser' } },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000, assetsDir: 'static' },
  test: { include: ['src/**/*.test.ts'] },
} as never);
