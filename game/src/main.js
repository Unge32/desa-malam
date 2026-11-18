// Desa Malam — boot, state machine, game loop. Original third-person survival horror.
import { CFG } from './config.js';
import { Input } from './input.js';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { Merchant } from './merchant.js';
import { AudioSys } from './audio.js';
import { HUD } from './hud.js';
import { registerShots } from './shots.js';
import { rng } from './random.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 200);
    Player.camera = this.camera;
    this.scene.add(this.camera);

    this.input = new Input(this.canvas);
    this.audio = new AudioSys();
    this.hud = new HUD();
    this.world = buildWorld(this.scene);
    this.player = new Player(this.scene);
    this.enemies = new EnemyManager(this.scene);
    this.merchant = new Merchant(this.scene);

    this.state = 'title'; // title | playing | paused | intermission | win | dead
    this.night = 1; this.totalNights = CFG.totalNights;
    this.nightTimeLeft = CFG.nightDuration;
    this.spawned = 0; this.toSpawn = 0; this.spawnT = 0;
    this.killsNight = 0; this.killsTotal = 0;
    this.interTimeLeft = CFG.intermissionSeconds;
    this.shopOpen = false;
    this.prevState = 'playing';

    this.input.onFirstGesture = () => this.audio.ensure();
    this.input.onPauseKey = () => this.togglePause();
    this.input.onMuteKey = () => { this.audio.ensure(); this.audio.setMuted(!this.audio.muted); };
    this.input.onHerbKey = () => {
      if (this.state !== 'playing') return;
      if (this.player.useHerb()) { this.audio.herb(); this.hud.toast('Herbal dipakai (+50 darah)'); }
    };
    this.input.onReloadKey = () => {
      if (this.state !== 'playing') return;
      if (this.player.startReload()) this.audio.reload();
    };
    this.input.onInteractKey = () => this.onInteract();
    window.addEventListener('resize', () => this.onResize());
    this.lockWasHeld = false;
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) { this.lockWasHeld = true; return; }
      // Esc released a lock that was actually held — pause the game.
      if (this.lockWasHeld && this.state === 'playing' && !this.shopOpen) this.pauseGame();
      this.lockWasHeld = false;
    });
    this.bindButtons();
    this.hud.setScreen('titleScreen');
    registerShots(this);
    this.last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.tick(dt, now / 1000);
    };
    requestAnimationFrame(loop);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  bindButtons() {
    const $ = (id) => document.getElementById(id);
    $('btnStart').addEventListener('click', () => { this.audio.ensure(); this.startGame(); });
    $('btnResume').addEventListener('click', () => this.resumeGame());
    $('btnRestartPause').addEventListener('click', () => this.startGame());
    $('btnRestartWin').addEventListener('click', () => this.startGame());
    $('btnRestartDead').addEventListener('click', () => this.startGame());
    $('btnNextNight').addEventListener('click', () => this.nextNight());
    // Shop buttons
    window.__desaMalamShop = {
      ammoPrice: $('shopAmmoPrice'), herbPrice: $('shopHerbPrice'), maxHpPrice: $('shopMaxHpPrice'), coins: $('shopCoins'),
    };
    $('btnBuyAmmo').addEventListener('click', () => this.buy('ammo'));
    $('btnBuyHerb').addEventListener('click', () => this.buy('herb'));
    $('btnBuyMaxHp').addEventListener('click', () => this.buy('maxhp'));
    $('btnCloseShop').addEventListener('click', () => this.closeShop());
  }

  startGame() {
    this.audio.ensure();
    this.player.reset();
    this.player.coins = 0;
    this.merchant.maxHpBought = 0;
    this.enemies.clear();
    this.night = 1; this.killsTotal = 0;
    this.startNight(1);
    this.hud.setScreen(null);
    this.input.requestLock();
  }

  startNight(n) {
    this.night = n;
    this.state = 'playing';
    this.shopOpen = false;
    this.merchant.hide();
    this.hud.hide('shopBox');
    this.nightTimeLeft = CFG.nightDuration;
    this.toSpawn = CFG.spawnTotal(n);
    this.spawned = 0; this.spawnT = 1.2;
    this.killsNight = 0;
    this.enemies.clear();
    this.player.pos.set(0, 0, 6); this.player.yaw = 0;
    this.hud.setScreen(null);
    this.hud.toast(`Malam ${n} — bertahanlah sampai fajar!`);
    this.input.requestLock();
  }

  nextNight() {
    this.closeShop();
    if (this.night >= this.totalNights) { this.winGame(); return; }
    this.startNight(this.night + 1);
  }

  startIntermission() {
    this.state = 'intermission';
    this.interTimeLeft = CFG.intermissionSeconds;
    this.enemies.clear();
    this.merchant.show();
    this.audio.jingle();
    this.input.unlock();
    this.hud.setScreen('interScreen');
    this.hud.setInterStats(this);
    document.getElementById('btnNextNight').textContent = `Mulai Malam ${Math.min(this.night + 1, 7)}`;
  }

  completeNight() {
    if (this.state !== 'playing') return;
    this.audio.dawn();
    if (this.night >= this.totalNights) { this.winGame(); return; }
    this.startIntermission();
  }

  winGame() {
    this.state = 'win';
    this.closeShop();
    this.enemies.clear();
    this.merchant.hide();
    this.audio.dawn();
    this.input.unlock();
    this.hud.setEndStats(this, 'win');
    this.hud.setScreen('winScreen');
  }

  die() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.closeShop();
    this.player.alive = false;
    this.input.unlock();
    this.hud.setEndStats(this, 'dead');
    this.hud.setScreen('deadScreen');
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.prevState = 'playing';
    this.state = 'paused';
    this.input.unlock();
    this.hud.setScreen('pauseScreen');
  }
  resumeGame() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.hud.setScreen(null);
    this.input.requestLock();
  }
  togglePause() {
    if (this.state === 'playing') this.pauseGame();
    else if (this.state === 'paused') this.resumeGame();
  }

  onInteract() {
    if (this.state === 'intermission') {
      if (this.merchant.near(this.player.pos) && !this.shopOpen) this.openShop();
      return;
    }
    if (this.state !== 'playing') return;
  }

  openShop() {
    if (this.state !== 'intermission') return;
    this.shopOpen = true;
    this.hud.hide('interScreen');
    this.hud.show('shopBox');
    this.hud.setShop(this, this.merchant);
    this.audio.click();
  }
  closeShop() {
    this.shopOpen = false;
    this.hud.hide('shopBox');
    if (this.state === 'intermission') this.hud.show('interScreen');
  }

  buy(kind) {
    const r = this.merchant.buy(kind, this.player);
    if (r.ok) { this.audio.coin(); this.hud.toast(r.msg); }
    else { this.audio.click(); this.hud.toast(r.msg); }
    this.hud.setShop(this, this.merchant);
  }

  debugShoot() {
    // Aim camera at nearest living enemy, then fire once (used by headless tests).
    const alive = this.enemies.list.filter((e) => !e.dead);
    if (!alive.length) return false;
    let best = alive[0], bd = 1e9;
    for (const e of alive) {
      const d = Math.hypot(e.group.position.x - this.player.pos.x, e.group.position.z - this.player.pos.z);
      if (d < bd) { bd = d; best = e; }
    }
    const dx = best.group.position.x - this.player.pos.x;
    const dz = best.group.position.z - this.player.pos.z;
    this.player.yaw = Math.atan2(-dx, -dz);
    this.player.pitch = 0;
    this.player.fireT = 0; // test hook: ignore fire-rate wait
    this.player.updateCamera();
    return this.tryShoot();
  }

  tryShoot() {
    const shot = this.player.shoot();
    if (!shot) {
      if (this.player.mag === 0 && this.player.reserve > 0) {
        if (this.player.startReload()) this.audio.reload();
      }
      return false;
    }
    this.audio.shot();
    const hit = this.enemies.hitTest(shot.origin, shot.dir);
    if (hit) {
      this.audio.thud();
      this.enemies.damage(hit.enemy, CFG.player.damage, (enemy) => {
        this.killsNight++; this.killsTotal++;
      });
    }
    return true;
  }

  tick(dt, t) {
    this.world.update(dt, t);
    if (this.state === 'playing') {
      this.player.update(dt, this.input, this.world);
      if (this.input.consumeShoot()) this.tryShoot();
      // Spawning (trickle)
      if (this.spawned < this.toSpawn && this.enemies.aliveCount() < CFG.maxAlive) {
        this.spawnT -= dt;
        if (this.spawnT <= 0) {
          this.enemies.spawnAtEdge(this.night, this.world.spawnPoints);
          this.spawned++;
          this.spawnT = Math.max(0.9, 3.2 - this.night * 0.25);
          if (Math.random() < 0.3) this.audio.groan();
        }
      }
      this.enemies.update(dt, this.player.pos,
        (e) => {
          this.player.hp -= e.damage;
          this.hud.damageFlash();
          this.audio.thud();
          if (this.player.hp <= 0) { this.player.hp = 0; this.die(); }
        },
        (p) => {
          if (p.kind === 'coin') { this.player.coins += p.value; this.audio.coin(); this.hud.toast(`+${p.value} koin`); }
          else { this.player.reserve += p.value; this.audio.coin(); this.hud.toast(`+${p.value} peluru`); }
        });
      this.nightTimeLeft -= dt;
      if (this.nightTimeLeft <= 0) this.completeNight();
      this.hud.prompt('');
      this.hud.update(this);
    } else if (this.state === 'intermission') {
      this.player.update(dt, this.input, this.world);
      this.player.updateCamera();
      if (!this.shopOpen) {
        if (this.merchant.near(this.player.pos)) this.hud.prompt('Tekan E untuk berdagang dengan Pak Wiro');
        else this.hud.prompt('Pergi ke Pak Wiro di alun-alun (E untuk berdagang)');
      } else this.hud.prompt('');
      this.interTimeLeft -= dt;
      this.hud.setInterStats(this);
      if (this.interTimeLeft <= 0) this.nextNight();
      this.hud.update(this);
    } else if (this.state === 'paused' || this.state === 'title' || this.state === 'win' || this.state === 'dead') {
      if (this.state === 'title') {
        // Slow cinematic orbit on title
        const a = t * 0.08;
        this.camera.position.set(Math.sin(a) * 14, 6, Math.cos(a) * 14);
        this.camera.lookAt(0, 1.5, 0);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => { new Game(); });
