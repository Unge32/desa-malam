// Keyboard + mouse + pointer lock input.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.yawDelta = 0; this.pitchDelta = 0;
    this.shootQueued = false;
    this.locked = false;
    this.onFirstGesture = null;
    this.onPauseKey = null; this.onMuteKey = null; this.onHerbKey = null; this.onReloadKey = null; this.onInteractKey = null;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (this.onFirstGesture) this.onFirstGesture();
      if (e.code === 'KeyP') this.onPauseKey && this.onPauseKey();
      if (e.code === 'KeyM') this.onMuteKey && this.onMuteKey();
      if (e.code === 'KeyH') this.onHerbKey && this.onHerbKey();
      if (e.code === 'KeyR') this.onReloadKey && this.onReloadKey();
      if (e.code === 'KeyE') this.onInteractKey && this.onInteractKey();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yawDelta -= e.movementX * 0.0023;
      this.pitchDelta -= e.movementY * 0.0023;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (this.onFirstGesture) this.onFirstGesture();
      if (e.button === 0) {
        if (!this.locked) this.requestLock();
        else this.shootQueued = true;
      }
    });
    canvas.addEventListener('click', () => { if (this.onFirstGesture) this.onFirstGesture(); });
  }
  requestLock() {
    try { this.canvas.requestPointerLock(); } catch (_) { /* pointer lock unavailable in headless */ }
  }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  down(code) { return this.keys.has(code); }
  consumeLook() {
    const d = { yaw: this.yawDelta, pitch: this.pitchDelta };
    this.yawDelta = 0; this.pitchDelta = 0;
    return d;
  }
  consumeShoot() { const s = this.shootQueued; this.shootQueued = false; return s; }
  moveVector() {
    let x = 0, z = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) z -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z += 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    const len = Math.hypot(x, z);
    if (len > 0) { x /= len; z /= len; }
    return { x, z };
  }
  sprinting() { return this.down('ShiftLeft') || this.down('ShiftRight'); }
}
