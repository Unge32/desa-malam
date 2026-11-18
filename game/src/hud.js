// HUD + screens + toasts (all Indonesian text).
export class HUD {
  constructor() {
    this.el = {};
    for (const id of ['hud', 'hpFill', 'hpText', 'herbCount', 'nightLabel', 'dawnTimer', 'coinCount', 'ammoText', 'prompt', 'crosshair', 'vignette', 'toastBox', 'lowAmmo', 'titleScreen', 'pauseScreen', 'interScreen', 'winScreen', 'deadScreen', 'shopBox', 'interStats', 'interCountdown', 'winStats', 'deadStats', 'muteLabel']) {
      this.el[id] = document.getElementById(id);
    }
    this.toastTimer = null;
  }
  show(id) { this.el[id].classList.remove('hidden'); }
  hide(id) { this.el[id].classList.add('hidden'); }
  setScreen(name) {
    for (const s of ['titleScreen', 'pauseScreen', 'interScreen', 'winScreen', 'deadScreen']) this.hide(s);
    if (name) this.show(name);
    this.el.hud.classList.toggle('hidden', name === 'titleScreen' || name === 'winScreen' || name === 'deadScreen');
    this.el.crosshair.classList.toggle('hidden', !!name);
  }
  update(g) {
    const p = g.player;
    this.el.hpFill.style.width = Math.max(0, (p.hp / p.maxHp) * 100) + '%';
    this.el.hpFill.style.background = p.hp < 30 ? '#c22' : '#4caf50';
    this.el.hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    this.el.herbCount.textContent = 'Herbal: ' + p.herbs + ' (H)';
    this.el.nightLabel.textContent = `MALAM ${g.night} / ${g.totalNights}`;
    const t = Math.max(0, Math.ceil(g.nightTimeLeft));
    this.el.dawnTimer.textContent = `Fajar ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    this.el.coinCount.textContent = '🪙 ' + p.coins;
    this.el.ammoText.textContent = `${p.mag} / ${p.reserve}`;
    this.el.lowAmmo.classList.toggle('hidden', !(p.mag <= 3 && g.state === 'playing'));
    this.el.muteLabel.textContent = g.audio.muted ? 'Suara: MATI (M)' : 'Suara: HIDUP (M)';
  }
  prompt(text) {
    this.el.prompt.textContent = text || '';
    this.el.prompt.classList.toggle('hidden', !text);
  }
  damageFlash() {
    this.el.vignette.style.opacity = '0.85';
    setTimeout(() => { this.el.vignette.style.opacity = '0'; }, 180);
  }
  toast(text) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = text;
    this.el.toastBox.appendChild(d);
    setTimeout(() => d.remove(), 2200);
  }
  setInterStats(g) {
    this.el.interStats.textContent = `Malam ${g.night} selesai — Terbunuh: ${g.killsNight} · Koin: ${g.player.coins} · Darah: ${Math.ceil(g.player.hp)}/${g.player.maxHp}`;
    this.el.interCountdown.textContent = `Malam ${g.night + 1} mulai otomatis dalam ${Math.ceil(g.interTimeLeft)} dtk`;
  }
  setShop(g, merchant) {
    const s = window.__desaMalamShop;
    if (!s) return;
    s.ammoPrice.textContent = `30 koin`;
    s.herbPrice.textContent = `25 koin`;
    s.maxHpPrice.textContent = merchant.maxHpBought >= 3 ? 'MAKS' : `60 koin (${merchant.maxHpBought}/3)`;
    s.coins.textContent = `Koinmu: ${g.player.coins}`;
  }
  setEndStats(g, kind) {
    const txt = `Malam tercapai: ${g.night}/${g.totalNights} · Terbunuh total: ${g.killsTotal} · Koin: ${g.player.coins}`;
    if (kind === 'win') this.el.winStats.textContent = txt;
    else this.el.deadStats.textContent = txt;
  }
}
