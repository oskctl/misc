// Renders a drawing's six reveal stages as a contact sheet PNG, for checking drawings by eye.
// Usage: node tools/render-drawing.mjs drawings/trellick.svg out.png [--dark] [--stage N]
// Needs playwright-core (npm i playwright-core) or the copy under /opt/node-tools.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const [svgPath, outPath] = args.filter(a => !a.startsWith('--') && !/^\d+$/.test(a));
if (!svgPath || !outPath || args.includes('--help')) {
  console.log('usage: node tools/render-drawing.mjs <drawing.svg> <out.png> [--dark] [--stage N]');
  process.exit(svgPath ? 0 : 2);
}
const dark = args.includes('--dark');
const stageArg = args.indexOf('--stage');
const only = stageArg >= 0 ? Number(args[stageArg + 1]) : null;

let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch { ({ chromium } = await import(pathToFileURL('/opt/node-tools/node_modules/playwright-core/index.mjs').href)); }

const svg = readFileSync(resolve(svgPath), 'utf8').replace(/<\?xml[^>]*>/, '');
const css = readFileSync(resolve(here, '../styles/drawing.css'), 'utf8');
const tokens = dark
  ? '--bg:#151514;--dw-ink:#E8E6E1;--dw-poche:#2B2A28;--dw-hair:#8D8A84;--dw-ctx:#77746E;--dw-void:#050505;--dw-glaze:#3A3B3B;--dw-shade:#222120;--dw-light:#F4F1E6;--dw-accent:#E0442B;'
  : '--bg:#ECEBE7;--dw-ink:#161616;--dw-poche:#D5D2CB;--dw-hair:#77746E;--dw-ctx:#8F8C86;--dw-void:#1E1E1E;--dw-glaze:#C3C6C7;--dw-shade:#BDBAB3;--dw-light:#FFFDF6;--dw-accent:#C8361F;';
const stages = only ? [only] : [1, 2, 3, 4, 5, 6];
const cell = only ? 900 : 420;
const html = `<!doctype html><meta charset="utf-8"><style>
:root{${tokens}--font-mono:ui-monospace,monospace} body{margin:0;background:var(--bg);font:12px ui-monospace,monospace;color:var(--dw-ink)}
.grid{display:grid;grid-template-columns:repeat(${only ? 1 : 3},${cell}px);gap:16px;padding:16px}
figure{margin:0} figcaption{padding:4px 0}
${css}</style><div class="grid">${stages.map(s =>
  `<figure><figcaption>stage ${s}</figcaption>${svg.replace('<svg', `<svg class="dwg" data-stage="${s}"`)}</figure>`).join('')}</div>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: only ? 940 : 1340, height: 600 }, deviceScaleFactor: 1.5 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.setContent(html);
await page.waitForTimeout(800); // let the stage transitions settle
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
if (errors.length) console.error(errors.join('\n'));
console.log(`  Rendered ${stages.length} stage(s) to ${outPath}`);
