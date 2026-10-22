// Headless smoke test: plays every sheet to a win (after one wrong guess), completes the title
// block, opens each panel, and fails on any console error. Needs a server on the game folder.
// Usage: node tools/smoke.mjs [http://127.0.0.1:8765/index.html] [--shots DIR] [--dark] [--width 390]
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PUZZLES } from '../data/puzzles.js';
import { BUILDINGS } from '../data/buildings.js';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('usage: node tools/smoke.mjs [url] [--shots DIR] [--dark] [--width N]');
  process.exit(0);
}
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const url = args.find(a => a.startsWith('http')) || 'http://127.0.0.1:8765/index.html';
const shots = opt('--shots');
const width = Number(opt('--width') || 390);
if (shots) mkdirSync(shots, { recursive: true });

let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch { ({ chromium } = await import(pathToFileURL('/opt/node-tools/node_modules/playwright-core/index.mjs').href)); }

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width, height: width < 600 ? 844 : 900 }, deviceScaleFactor: 2,
  colorScheme: args.includes('--dark') ? 'dark' : 'light', isMobile: width < 600, hasTouch: width < 600,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED/.test(m.text())) errors.push(`console: ${m.text()}`); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());

const byId = new Map(BUILDINGS.map(b => [b.id, b]));
const shot = async name => { if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true }); };
const pick = async name => {
  await page.fill('#guess-input', name);
  await page.waitForTimeout(120);
  const opt = page.locator('#suggest li[role=option]', { hasText: name }).first();
  await opt.click();
  await page.click('#guess-btn');
  await page.waitForTimeout(300);
};

let failures = 0;
for (const p of PUZZLES) {
  const answer = byId.get(p.answer);
  await page.goto(`${url}#s${String(p.no).padStart(3, '0')}`);
  await page.waitForTimeout(400);
  if (await page.locator('#panel[open]').count()) await page.click('#panel-close');
  const decoy = BUILDINGS.find(b => b.id !== p.answer && b.country !== answer.country);
  await pick(decoy.name);
  await shot(`${p.no}-1-after-miss`);
  await pick(answer.name);
  await page.waitForTimeout(1000);
  const verdict = await page.locator('.verdict').first().textContent();
  if (!/2\/6/.test(verdict)) { console.error(`  ✗ sheet ${p.no}: expected a 2/6 win, saw "${verdict}"`); failures += 1; }
  await page.click('button:has-text("Bonus questions")');
  for (let round = 0; round < 5; round += 1) {
    await page.waitForTimeout(250);
    await page.locator('button.tile:not([disabled])').first().click();
    await page.waitForTimeout(150);
    await shot(`${p.no}-2-round-${round + 1}`);
    await page.click('button:has-text("Next →"), button:has-text("See results")');
  }
  await page.waitForTimeout(600);
  await shot(`${p.no}-3-summary`);
  const share = await page.locator('.share-pre').textContent();
  if (!share.includes(`#Markle ${String(p.no).padStart(3, '0')} · 2/6`) || !/ \d\/5/.test(share)) {
    console.error(`  ✗ sheet ${p.no}: unexpected share text:\n${share}`);
    failures += 1;
  } else console.log(`  ✓ sheet ${String(p.no).padStart(3, '0')} ${answer.name}`);
}
for (const panel of ['stats', 'settings', 'help']) {
  await page.click(`button[data-open=${panel}]`);
  await page.waitForTimeout(300);
  await shot(`panel-${panel}`);
  await page.click('#panel-close');
}
await browser.close();
if (errors.length) { console.error(errors.map(e => `  ✗ ${e}`).join('\n')); failures += errors.length; }
console.log(failures ? `\n  ${failures} problem(s)` : '\n  All sheets played clean.');
process.exit(failures ? 1 : 0);
