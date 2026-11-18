// Takes the 4 screenshots for Desa Malam. Run: node tests/shots.mjs (serve.ts on :8080)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.GAME_URL || 'http://localhost:8080/';
mkdirSync('screenshots', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(URL, { waitUntil: 'load' });
await sleep(3000);
await page.screenshot({ path: 'screenshots/1-title.jpg', type: 'jpeg', quality: 72 });

await page.click('#btnStart');
await sleep(1000);
await page.evaluate(() => {
  window.__desaMalam.spawnEnemy('shambler', 7);
  window.__desaMalam.spawnEnemy('runner', 9);
  window.__desaMalam.spawnEnemy('shambler', 11);
});
await sleep(600);
await page.screenshot({ path: 'screenshots/2-play.jpg', type: 'jpeg', quality: 72 });

await page.evaluate(() => { window.__desaMalam.setCoins(120); window.__desaMalam.toIntermission(); });
await sleep(600);
await page.evaluate(() => window.__desaMalam.openShop());
await sleep(400);
await page.screenshot({ path: 'screenshots/3-merchant.jpg', type: 'jpeg', quality: 72 });

await page.evaluate(() => { const g = window.__desaMalam.game; g.night = 7; window.__desaMalam.toWin(); });
await sleep(600);
await page.screenshot({ path: 'screenshots/4-dawn.jpg', type: 'jpeg', quality: 72 });
await browser.close();
console.log('shots done');
