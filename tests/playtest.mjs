// Headless playtest for Desa Malam. Run: node tests/playtest.mjs (serve.ts must be running on :8080)
import { chromium } from 'playwright';

const URL = process.env.GAME_URL || 'http://localhost:8080/';
const results = [];
function check(name, ok, extra = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
try {
  browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; const failedReqs = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => failedReqs.push(r.url() + ' ' + (r.failure()?.errorText || '')));

  await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  check('page loads, title screen visible', await page.locator('#titleScreen').isVisible());
  check('debug hook present', await page.evaluate(() => !!window.__desaMalam));
  check('zero console errors on load', errors.length === 0, errors.slice(0, 3).join(' | '));
  check('zero failed requests on load', failedReqs.length === 0, failedReqs.slice(0, 3).join(' | '));

  // Start game
  await page.click('#btnStart');
  await sleep(1200);
  check('start hides title, state=playing', await page.evaluate(() => window.__desaMalam.state() === 'playing'));
  check('HUD visible', await page.locator('#hud').isVisible());
  check('HUD shows MALAM 1/7', (await page.locator('#nightLabel').textContent()).includes('MALAM 1'));

  // Movement: hold W, position changes
  const p0 = await page.evaluate(() => ({ x: window.__desaMalam.game.player.pos.x, z: window.__desaMalam.game.player.pos.z }));
  await page.keyboard.down('w'); await sleep(700); await page.keyboard.up('w');
  const p1 = await page.evaluate(() => ({ x: window.__desaMalam.game.player.pos.x, z: window.__desaMalam.game.player.pos.z }));
  check('WASD moves player', Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.5, `moved ${Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2)}m`);

  // Shooting: spawn enemy ahead, aim+shoot via debug hook, ammo decreases
  const ammo0 = await page.evaluate(() => window.__desaMalam.ammo());
  await page.evaluate(() => window.__desaMalam.spawnEnemy('shambler', 6));
  await sleep(300);
  check('enemy spawned', await page.evaluate(() => window.__desaMalam.enemiesAlive()) >= 1);
  // Shoot repeatedly until enemy dies (34 dmg vs 50 hp = 2 hits)
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.__desaMalam.shootAtEnemy());
    await sleep(400);
    if (await page.evaluate(() => window.__desaMalam.enemiesAlive()) === 0) break;
  }
  check('infected can be killed', await page.evaluate(() => window.__desaMalam.enemiesAlive()) === 0);
  const ammo1 = await page.evaluate(() => window.__desaMalam.ammo());
  check('ammo decreases when shooting', ammo1.mag < ammo0.mag, `${ammo0.mag} -> ${ammo1.mag}`);
  // Coins: pickups drop on death; walk over them — give time, then check coins via pickup magnet by teleporting player near pickup is not possible; instead verify coins increase after collecting: move player onto pickup pos via debug
  await sleep(500);
  const coinsBefore = await page.evaluate(() => window.__desaMalam.coins());
  await page.evaluate(() => {
    const g = window.__desaMalam.game;
    const p = g.enemies.pickups[0];
    if (p) { g.player.pos.x = p.mesh.position.x; g.player.pos.z = p.mesh.position.z; }
  });
  await sleep(800);
  const coinsAfter = await page.evaluate(() => window.__desaMalam.coins());
  check('coins increase after pickup', coinsAfter > coinsBefore || coinsBefore > 0, `${coinsBefore} -> ${coinsAfter}`);

  // Reload — wait until the magazine is actually full (headless fps is slow)
  await page.keyboard.press('r');
  await page.waitForFunction(() => window.__desaMalam.ammo().mag === 12, null, { timeout: 60000 });
  check('reload refills magazine', await page.evaluate(() => window.__desaMalam.ammo().mag) === 12);

  // Herb
  await page.evaluate(() => { window.__desaMalam.game.player.hp = 50; });
  await page.keyboard.press('h'); await sleep(200);
  check('herb heals', await page.evaluate(() => window.__desaMalam.hp()) === 100);

  // Night complete -> intermission + shop
  await page.evaluate(() => window.__desaMalam.setCoins(100));
  await page.evaluate(() => window.__desaMalam.skipNight());
  await sleep(600);
  check('night completes to intermission', await page.evaluate(() => window.__desaMalam.state() === 'intermission'));
  check('intermission screen visible', await page.locator('#interScreen').isVisible());
  await page.evaluate(() => window.__desaMalam.openShop());
  await sleep(300);
  check('shop opens', await page.locator('#shopBox').isVisible());
  const buyBefore = await page.evaluate(() => ({ coins: window.__desaMalam.coins(), ammo: window.__desaMalam.ammo() }));
  await page.click('#btnBuyAmmo');
  await sleep(300);
  const buyAfter = await page.evaluate(() => ({ coins: window.__desaMalam.coins(), ammo: window.__desaMalam.ammo() }));
  check('buying ammo costs coins and adds reserve', buyAfter.coins === buyBefore.coins - 30 && buyAfter.ammo.reserve === buyBefore.ammo.reserve + 24, JSON.stringify({ buyBefore, buyAfter }));

  // Win path
  await page.evaluate(() => { const g = window.__desaMalam.game; g.night = 7; g.state = 'playing'; window.__desaMalam.skipNight(); });
  await sleep(600);
  check('win path shows win screen', await page.evaluate(() => window.__desaMalam.state() === 'win') && await page.locator('#winScreen').isVisible());

  // Restart from win
  await page.click('#btnRestartWin'); await sleep(600);
  check('restart works from win', await page.evaluate(() => window.__desaMalam.state() === 'playing' && window.__desaMalam.night() === 1));

  // Lose path
  await page.evaluate(() => window.__desaMalam.setHP(0));
  await sleep(600);
  check('HP 0 shows death screen', await page.evaluate(() => window.__desaMalam.state() === 'dead') && await page.locator('#deadScreen').isVisible());
  await page.click('#btnRestartDead'); await sleep(600);
  check('restart works from death', await page.evaluate(() => window.__desaMalam.state() === 'playing'));

  // Pause
  await page.keyboard.press('p'); await sleep(300);
  check('pause overlay appears', await page.locator('#pauseScreen').isVisible());
  await page.click('#btnResume'); await sleep(300);
  check('resume works', await page.evaluate(() => window.__desaMalam.state() === 'playing'));

  check('zero console errors overall', errors.length === 0, errors.slice(0, 5).join(' | '));
  check('zero failed requests overall', failedReqs.length === 0, failedReqs.slice(0, 5).join(' | '));
} catch (e) {
  console.log('FAIL  harness exception — ' + e.message);
  results.push({ name: 'harness', ok: false });
} finally {
  if (browser) await browser.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
