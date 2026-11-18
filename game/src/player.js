// Player: low-poly figure, movement, over-the-shoulder camera, shooting, reload, herbs.
import { CFG } from './config.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.pos = new THREE.Vector3(0, 0, 6);
    this.yaw = Math.PI; // facing -z toward square? start facing village center
    this.yaw = 0;
    this.pitch = 0;
    this.hp = CFG.player.hp;
    this.maxHp = CFG.player.hp;
    this.mag = CFG.player.magSize;
    this.reserve = 48;
    this.herbs = 1;
    this.coins = 0;
    this.stamina = CFG.player.stamina;
    this.reloading = false;
    this.reloadT = 0;
    this.fireT = 0;
    this.alive = true;
    this.flashT = 0;

    // Figure: capsule body, head, gun
    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a5a8a });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xc89878 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.7, 4, 10), bodyMat);
    this.body.position.y = 1.05; this.group.add(this.body);
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skinMat);
    this.head.position.y = 1.78; this.group.add(this.head);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.35, 12), darkMat);
    hat.position.y = 2.0; this.group.add(hat);
    this.gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.55), darkMat);
    this.gun.position.set(0.32, 1.25, 0.35); this.group.add(this.gun);
    // Flashlight
    this.flash = new THREE.SpotLight(0xfff2cc, 1.6, 26, 0.55, 0.45, 1.2);
    this.flashTarget = new THREE.Object3D();
    this.scene.add(this.flashTarget);
    this.flash.target = this.flashTarget;
    this.scene.add(this.flash);
    // Muzzle flash light
    this.muzzle = new THREE.PointLight(0xffc46a, 0, 9, 2);
    this.scene.add(this.muzzle);
    this.group.position.copy(this.pos);
    scene.add(this.group);
    // Tracer pool
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0 });
    this.tracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.tracer = new THREE.Line(this.tracerGeo, this.tracerMat);
    this.tracer.visible = false; scene.add(this.tracer);
    this.tracerT = 0;
  }

  forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  right() { return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }

  reset() {
    this.pos.set(0, 0, 6); this.yaw = 0; this.pitch = 0;
    this.hp = this.maxHp; this.mag = CFG.player.magSize; this.reserve = 48;
    this.herbs = 1; this.stamina = CFG.player.stamina; this.alive = true;
    this.reloading = false; this.fireT = 0;
    this.group.position.copy(this.pos);
  }

  useHerb() {
    if (this.herbs <= 0 || this.hp >= this.maxHp || !this.alive) return false;
    this.herbs--;
    this.hp = Math.min(this.maxHp, this.hp + CFG.herbHeal);
    return true;
  }

  startReload() {
    if (this.reloading || this.mag >= CFG.player.magSize || this.reserve <= 0) return false;
    this.reloading = true; this.reloadT = CFG.player.reloadTime;
    return true;
  }

  update(dt, input, world) {
    if (!this.alive) return;
    const look = input.consumeLook();
    this.yaw += look.yaw;
    this.pitch = Math.max(-0.9, Math.min(0.9, this.pitch + look.pitch));
    const mv = input.moveVector();
    const sprint = input.sprinting() && this.stamina > 1 && (mv.x !== 0 || mv.z !== 0);
    const speed = sprint ? CFG.player.sprintSpeed : CFG.player.speed;
    if (sprint) this.stamina = Math.max(0, this.stamina - CFG.player.staminaDrain * dt);
    else this.stamina = Math.min(CFG.player.stamina, this.stamina + CFG.player.staminaRegen * dt);
    const f = this.forward(), r = this.right();
    const dx = (f.x * -mv.z + r.x * mv.x) * speed * dt;
    const dz = (f.z * -mv.z + r.z * mv.x) * speed * dt;
    // Note: forward is -z when yaw=0; moveVector z=-1 means forward (W)
    const nx = this.pos.x + dx, nz = this.pos.z + dz;
    const solved = world.collide(nx, nz, CFG.player.radius);
    this.pos.x = solved.x; this.pos.z = solved.z;
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    // Walk bob
    const moving = mv.x !== 0 || mv.z !== 0;
    this.group.position.y = moving ? Math.abs(Math.sin(performance.now() * 0.012)) * 0.05 : 0;
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const need = CFG.player.magSize - this.mag;
        const take = Math.min(need, this.reserve);
        this.mag += take; this.reserve -= take;
        this.reloading = false;
      }
    }
    if (this.fireT > 0) this.fireT -= dt;
    if (this.flashT > 0) { this.flashT -= dt; this.muzzle.intensity = Math.max(0, this.flashT * 14); }
    if (this.tracerT > 0) {
      this.tracerT -= dt;
      this.tracerMat.opacity = Math.max(0, this.tracerT * 8);
      if (this.tracerT <= 0) this.tracer.visible = false;
    }
    this.updateCamera();
  }

  updateCamera() {
    const cam = Player.camera;
    if (!cam) return;
    const f = this.forward(), r = this.right();
    const eye = new THREE.Vector3(
      this.pos.x - f.x * 3.1 + r.x * 0.85,
      2.05 + this.pitch * 0.4,
      this.pos.z - f.z * 3.1 + r.z * 0.85,
    );
    cam.position.copy(eye);
    const lookAt = new THREE.Vector3(
      this.pos.x + f.x * 6 - Math.sin(this.pitch) * 0 + f.x * 0,
      1.45 + this.pitch * 3.2,
      this.pos.z + f.z * 6,
    );
    // pitch shifts look height
    lookAt.y = 1.45 + Math.tan(this.pitch) * 6;
    cam.lookAt(lookAt);
    // Flashlight follows aim
    this.flash.position.set(this.pos.x + r.x * 0.3, 1.6, this.pos.z + r.z * 0.3);
    this.flashTarget.position.copy(lookAt);
    this.muzzle.position.set(this.pos.x + f.x * 0.6 + r.x * 0.3, 1.3, this.pos.z + f.z * 0.6 + r.z * 0.3);
  }

  canShoot() { return this.alive && !this.reloading && this.fireT <= 0 && this.mag > 0; }

  shoot() {
    if (!this.canShoot()) return null;
    this.mag--; this.fireT = CFG.player.fireInterval; this.flashT = 0.07;
    const cam = Player.camera;
    const origin = cam.position.clone();
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    // Tracer from gun to far point
    const end = origin.clone().add(dir.clone().multiplyScalar(40));
    this.tracerGeo.setFromPoints([this.muzzle.position.clone(), end]);
    this.tracer.visible = true; this.tracerT = 0.08; this.tracerMat.opacity = 0.9;
    return { origin, dir, end };
  }
}
Player.camera = null;
