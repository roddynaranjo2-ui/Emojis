/**
 * Bump the app version everywhere at once:
 *   npm run bump -- 0.4.0            (versionCode = auto-increment)
 *   npm run bump -- 0.4.0 --code 7
 * Touches: package.json, packages/app/package.json, src/version.ts, android build.gradle,
 * docs/store/LISTING.md is left to humans. Then: git tag v0.4.0 && git push --tags → release.yml.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [ver, ...rest] = process.argv.slice(2);
if (!ver || !/^\d+\.\d+\.\d+$/.test(ver)) { console.error('usage: npm run bump -- <x.y.z> [--code N]'); process.exit(1); }
const codeIdx = rest.indexOf('--code');

const edit = (path: string, fn: (s: string) => string) => { const s = readFileSync(path, 'utf8'); const n = fn(s); if (n !== s) { writeFileSync(path, n); console.log('✏️ ', path); } };

for (const p of ['package.json', 'packages/app/package.json']) edit(p, (s) => s.replace(/"version": "[^"]+"/, `"version": "${ver}"`));
edit('packages/app/src/version.ts', (s) => s.replace(/APP_VERSION = '[^']+'/, `APP_VERSION = '${ver}'`));
edit('packages/app/android/app/build.gradle', (s) => {
  const cur = Number(/versionCode (\d+)/.exec(s)?.[1] ?? '1');
  const code = codeIdx >= 0 ? Number(rest[codeIdx + 1]) : cur + 1;
  return s.replace(/versionCode \d+/, `versionCode ${code}`).replace(/versionName "[^"]+"/, `versionName "${ver}"`);
});
console.log(`\n✅ version ${ver}. Next: git commit -am "chore: v${ver}" && git tag v${ver} && git push --tags`);
