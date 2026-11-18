// Screenshot / debug hooks (tests only). Real play never needs them.
export function registerShots(game) {
  window.__desaMalam = {
    game,
    state: () => game.state,
    night: () => game.night,
    hp: () => game.player.hp,
    coins: () => game.player.coins,
    ammo: () => ({ mag: game.player.mag, reserve: game.player.reserve }),
    enemiesAlive: () => game.enemies.aliveCount(),
    spawnEnemy: (type = 'shambler', dist = 6) => {
      const f = game.player.forward();
      const at = { x: game.player.pos.x + f.x * dist, z: game.player.pos.z + f.z * dist };
      return game.enemies.spawn(type || 'shambler', game.night, at);
    },
    setHP: (v) => { game.player.hp = v; if (v <= 0) game.die(); },
    setCoins: (v) => { game.player.coins = v; },
    skipNight: () => game.completeNight(),
    toIntermission: () => { game.startIntermission(); },
    toWin: () => game.winGame(),
    openShop: () => game.openShop(),
    start: () => game.startGame(),
    shootAtEnemy: () => game.debugShoot(),
  };
}
