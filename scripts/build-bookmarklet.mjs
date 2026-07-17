// bookmarklet/super-favicon-viewer.js から javascript: URL を生成し、
// インストール用ページ bookmarklet/index.html を出力する。
// 使い方: node scripts/build-bookmarklet.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = join(root, 'bookmarklet', 'super-favicon-viewer.js');
const outPath = join(root, 'bookmarklet', 'index.html');

const src = readFileSync(srcPath, 'utf8');

// コメント行を除去し、各行を trim して連結する簡易 minify。
// ソース側は「全文が ; か { } で終わる（ASI に依存しない）」前提で書く。
const minified = src
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('//'))
  .join('');

const url = 'javascript:' + encodeURIComponent(minified);

const escapeHtml = (s) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SUPER-FAVICON Viewer bookmarklet</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 3rem auto; padding: 0 1rem; line-height: 1.8; }
  a.bookmarklet { display: inline-block; padding: .6rem 1.2rem; border: 2px solid #333; border-radius: 8px; font-weight: bold; text-decoration: none; color: #111; background: #ffe066; }
  textarea { width: 100%; height: 8rem; font-family: monospace; font-size: 12px; }
  @media (prefers-color-scheme: dark) {
    body { background: #111; color: #eee; }
    a.bookmarklet { border-color: #eee; }
  }
</style>
</head>
<body>
<h1>SUPER-FAVICON Viewer</h1>
<p>下のリンクをブックマークバーにドラッグ＆ドロップして登録してください。</p>
<p><a class="bookmarklet" href="${escapeHtml(url)}">🔍 SUPER-FAVICON Viewer</a></p>
<p>favicon を巨大表示したいページでブックマークをクリックすると、別ウィンドウに favicon がドット絵拡大で表示されます。favicon のアニメーションにも追従します。もう一度クリックするとウィンドウが閉じます。</p>
<details>
<summary>URL を手動でコピーする場合</summary>
<textarea readonly>${escapeHtml(url)}</textarea>
</details>
</body>
</html>
`;

writeFileSync(outPath, html);
console.log(`generated: ${outPath}`);
console.log(`bookmarklet length: ${url.length} chars`);
