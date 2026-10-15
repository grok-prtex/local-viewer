import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

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
  resolve: { alias: { buffer: 'buffer/' } },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  test: { include: ['src/**/*.test.ts'] },
} as never);
