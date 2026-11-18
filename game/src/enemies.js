// Infected enemies: types, spawn, AI, combat, drops.
import { CFG } from './config.js';
import { rng } from './random.js';

const bodyGeo = new THREE.BoxGeometry(0.62, 0.95, 0.38);
const headGeo = new THREE.SphereGeometry(0.26, 10, 8);
const armGeo = new THREE.BoxGeometry(0.16, 0.75, 0.16);
const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffb020 });
const bloodGeo = new THREE.SphereGeometry(0.09, 6, 6);
const bloodMat = new THREE.MeshBasicMaterial({ color: 0x7a0d0d });

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.pickups = [];
    this.raycaster = new THREE.Raycaster();
    this.bloodPool = [];
    for (let i = 0; i < 24; i++) {
      const p = new THREE.Mesh(bloodGeo, bloodMat);
      p.visible = false; scene.add(p);
      this.bloodPool.push({ mesh: p, t: 0, vel: new THREE.Vector3() });
    }
    this.coinGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 10);
    this.coinMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
    this.ammoGeo = new THREE.BoxGeometry(0.4, 0.25, 0.3);
    this.ammoMat = new THREE.MeshBasicMaterial({ color: 0x4dff7a });
  }

  clear() {
    for (const e of this.list) this.scene.remove(e.group);
    this.list = [];
    for (const p of this.pickups) this.scene.remove(p.mesh);
    this.pickups = [];
  }

  typeForNight(night) {
    const roll = rng.next();
    if (night >= 5 && roll < 0.14) return 'brute';
    if (night >= 3 && roll < 0.45) return 'runner';
    return 'shambler';
  }

  spawn(type, night, at) {
    const def = CFG.enemies[type];
    const scale = CFG.nightScale(night);
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: def.color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.05; group.add(body);
    const head = new THREE.Mesh(headGeo, new THREE.MeshLambertMaterial({ color: 0x9aa88a }));
    head.position.y = 1.78; group.add(head);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.09, 1.82, 0.22); group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.09, 1.82, 0.22); group.add(eyeR);
    const armMat = new THREE.MeshLambertMaterial({ color: 0x8a9a7a });
    const armL = new THREE.Mesh(armGeo, armMat); armL.position.set(-0.42, 1.25, 0.3); armL.rotation.x = -1.2; group.add(armL);
    const armR = new THREE.Mesh(armGeo, armMat); armR.position.set(0.42, 1.25, 0.3); armR.rotation.x = -1.2; group.add(armR);
    const legL = new THREE.Mesh(legGeo, bodyMat); legL.position.set(-0.16, 0.35, 0); group.add(legL);
    const legR = new THREE.Mesh(legGeo, bodyMat); legR.position.set(0.16, 0.35, 0); group.add(legR);
    group.scale.setScalar(def.scale);
    group.position.set(at.x, 0, at.z);
    this.scene.add(group);
    const e = {
      type, group, body, bodyMat, hp: def.hp * scale, maxHp: def.hp * scale,
      speed: def.speed * scale, damage: def.damage, range: def.range, cooldown: def.cooldown,
      attackT: 0, flinchT: 0, dead: false, fadeT: 0, walkPhase: rng.range(0, 6),
      hitMeshes: [body, head],
    };
    body.userData.enemy = e; head.userData.enemy = e;
    this.list.push(e);
    return e;
  }

  spawnAtEdge(night, spawnPoints) {
    const pt = rng.pick(spawnPoints);
    const at = { x: pt.x + rng.range(-2, 2), z: pt.z + rng.range(-2, 2) };
    return this.spawn(this.typeForNight(night), night, at);
  }

  hitTest(origin, dir) {
    this.raycaster.set(origin, dir);
    this.raycaster.far = CFG.player.range;
    const meshes = [];
    for (const e of this.list) if (!e.dead) meshes.push(...e.hitMeshes);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    return { enemy: hits[0].object.userData.enemy, point: hits[0].point, distance: hits[0].distance };
  }

  damage(enemy, dmg, onDeath) {
    if (enemy.dead) return;
    enemy.hp -= dmg;
    enemy.flinchT = 0.25;
    enemy.bodyMat.emissive = new THREE.Color(0x881111);
    setTimeout(() => { if (enemy.bodyMat) enemy.bodyMat.emissive = new THREE.Color(0x000000); }, 90);
    this.burstBlood(enemy.group.position);
    if (enemy.hp <= 0) {
      enemy.dead = true; enemy.fadeT = 1.2;
      enemy.group.rotation.x = -Math.PI / 2; enemy.group.position.y = 0.3;
      const coins = rng.int(CFG.enemies[enemy.type].coins[0], CFG.enemies[enemy.type].coins[1]);
      this.dropPickup('coin', enemy.group.position, coins);
      if (rng.chance(CFG.ammoDropChance)) this.dropPickup('ammo', enemy.group.position, 12);
      if (onDeath) onDeath(enemy, coins);
    }
  }

  burstBlood(pos) {
    let n = 0;
    for (const b of this.bloodPool) {
      if (b.t > 0) continue;
      b.t = 0.5; b.mesh.visible = true;
      b.mesh.position.set(pos.x, 1.2, pos.z);
      b.vel.set(rng.range(-2, 2), rng.range(1, 3), rng.range(-2, 2));
      if (++n >= 5) break;
    }
  }

  dropPickup(kind, pos, value) {
    const mesh = new THREE.Mesh(kind === 'coin' ? this.coinGeo : this.ammoGeo, kind === 'coin' ? this.coinMat : this.ammoMat);
    mesh.position.set(pos.x + rng.range(-0.6, 0.6), 0.5, pos.z + rng.range(-0.6, 0.6));
    if (kind === 'coin') mesh.rotation.x = Math.PI / 2;
    this.scene.add(mesh);
    this.pickups.push({ kind, value, mesh, t: 0 });
  }

  update(dt, playerPos, onAttack, onPickup) {
    const t = performance.now() / 1000;
    for (const e of this.list) {
      if (e.dead) {
        e.fadeT -= dt;
        if (e.fadeT <= 0) { this.scene.remove(e.group); }
        continue;
      }
      if (e.flinchT > 0) { e.flinchT -= dt; continue; }
      const dx = playerPos.x - e.group.position.x, dz = playerPos.z - e.group.position.z;
      const dist = Math.hypot(dx, dz);
      e.group.rotation.y = Math.atan2(dx, dz);
      e.attackT -= dt;
      if (dist <= e.range) {
        if (e.attackT <= 0) {
          e.attackT = e.cooldown;
          if (onAttack) onAttack(e);
        }
      } else {
        const step = (e.speed * dt) / Math.max(dist, 0.001);
        e.group.position.x += dx * step;
        e.group.position.z += dz * step;
        e.walkPhase += dt * (e.type === 'runner' ? 11 : 6);
        e.group.position.y = Math.abs(Math.sin(e.walkPhase)) * 0.06;
        e.group.rotation.z = Math.sin(e.walkPhase) * 0.08;
      }
    }
    this.list = this.list.filter((e) => !(e.dead && e.fadeT <= 0));
    // Blood particles
    for (const b of this.bloodPool) {
      if (b.t <= 0) continue;
      b.t -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      b.vel.y -= 9 * dt;
      if (b.t <= 0) b.mesh.visible = false;
    }
    // Pickups: spin, magnet, collect
    for (const p of this.pickups) {
      p.t += dt;
      p.mesh.rotation.y += dt * 3;
      p.mesh.position.y = 0.5 + Math.sin(p.t * 3) * 0.08;
      const dx = playerPos.x - p.mesh.position.x, dz = playerPos.z - p.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 3) { p.mesh.position.x += (dx / d) * dt * 5; p.mesh.position.z += (dz / d) * dt * 5; }
      if (d < 1.3) {
        if (onPickup) onPickup(p);
        this.scene.remove(p.mesh);
        p.taken = true;
      }
    }
    this.pickups = this.pickups.filter((p) => !p.taken);
  }

  aliveCount() { return this.list.filter((e) => !e.dead).length; }
}
