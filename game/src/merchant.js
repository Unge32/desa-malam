// Pak Wiro, the wandering merchant, and the shop economy.
import { CFG } from './config.js';

export class Merchant {
  constructor(scene) {
    this.scene = scene;
    this.pos = { x: -3.5, z: 1.5 };
    this.maxHpBought = 0;
    this.group = new THREE.Group();
    const robe = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
    const skin = new THREE.MeshLambertMaterial({ color: 0xc89878 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.7, 4, 10), robe);
    body.position.y = 1.05; this.group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin);
    head.position.y = 1.78; this.group.add(head);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.3, 12), new THREE.MeshLambertMaterial({ color: 0x8a6a2a }));
    hat.position.y = 2.02; this.group.add(hat);
    // Lantern cart: small box + glowing lantern
    const cart = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6), new THREE.MeshLambertMaterial({ color: 0x4a3018 }));
    cart.position.set(0.9, 0.5, 0.3); this.group.add(cart);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffc46a }));
    lamp.position.set(0.9, 1.15, 0.3); this.group.add(lamp);
    this.lantern = new THREE.PointLight(0xff9a3c, 1.4, 12, 2);
    this.lantern.position.set(0.9, 1.2, 0.3);
    this.group.add(this.lantern);
    this.group.position.set(this.pos.x, 0, this.pos.z);
    this.group.visible = false;
    scene.add(this.group);
  }
  show() { this.group.visible = true; }
  hide() { this.group.visible = false; }
  near(playerPos) {
    return Math.hypot(playerPos.x - this.pos.x, playerPos.z - this.pos.z) < 3.2;
  }
  buy(kind, player) {
    const s = CFG.shop;
    if (kind === 'ammo') {
      if (player.coins < s.ammo.price) return { ok: false, msg: 'Koin tidak cukup' };
      player.coins -= s.ammo.price; player.reserve += s.ammo.rounds;
      return { ok: true, msg: `+${s.ammo.rounds} peluru` };
    }
    if (kind === 'herb') {
      if (player.coins < s.herb.price) return { ok: false, msg: 'Koin tidak cukup' };
      player.coins -= s.herb.price; player.herbs += 1;
      return { ok: true, msg: '+1 herbal' };
    }
    if (kind === 'maxhp') {
      if (this.maxHpBought >= s.maxHp.maxTimes) return { ok: false, msg: 'Sudah maksimal' };
      if (player.coins < s.maxHp.price) return { ok: false, msg: 'Koin tidak cukup' };
      player.coins -= s.maxHp.price; this.maxHpBought++;
      player.maxHp += s.maxHp.amount; player.hp = Math.min(player.maxHp, player.hp + s.maxHp.amount);
      return { ok: true, msg: `Darah maks +${s.maxHp.amount}` };
    }
    return { ok: false, msg: '?' };
  }
}
