// Desa Malam — tuning constants (all original).
export const CFG = {
  nightDuration: 90,
  totalNights: 7,
  worldSize: 60,
  player: {
    hp: 100, speed: 5.2, sprintSpeed: 8.0, stamina: 100, staminaDrain: 22, staminaRegen: 16,
    radius: 0.55, magSize: 12, reloadTime: 1.2, damage: 34, fireInterval: 0.25, range: 60,
  },
  enemies: {
    shambler: { hp: 50, speed: 1.6, damage: 12, range: 1.7, cooldown: 1.0, scale: 1.0, color: 0x7a8a6a, coins: [2, 4] },
    runner:   { hp: 40, speed: 3.4, damage: 8,  range: 1.6, cooldown: 0.8, scale: 0.95, color: 0x8a7a5a, coins: [3, 5] },
    brute:    { hp: 220, speed: 1.1, damage: 25, range: 2.0, cooldown: 1.4, scale: 1.45, color: 0x5a6a5a, coins: [5, 8] },
  },
  nightScale: (n) => 1 + 0.06 * (n - 1),
  spawnTotal: (n) => 8 + 4 * n,
  maxAlive: 10,
  shop: {
    ammo: { price: 30, rounds: 24, label: 'Kotak Amunisi (+24 peluru)' },
    herb: { price: 25, label: 'Herbal (+1)' },
    maxHp: { price: 60, amount: 25, maxTimes: 3, label: 'Darah Maks +25' },
  },
  intermissionSeconds: 25,
  ammoDropChance: 0.25,
  herbHeal: 50,
};
