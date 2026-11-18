// Village world: procedural night village, lights, props, colliders.
import { rng } from './random.js';

const MAT = {};
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!MAT[key]) MAT[key] = new THREE.MeshLambertMaterial({ color, ...opts });
  return MAT[key];
}

export function buildWorld(scene) {
  const colliders = []; // {x,z,hx,hz}
  const addCollider = (x, z, hx, hz) => colliders.push({ x, z, hx, hz });
  const half = 30;

  scene.background = new THREE.Color(0x070d1a);
  scene.fog = new THREE.FogExp2(0x0a1226, 0.022);

  // Moon + ambient + hemisphere
  const moon = new THREE.DirectionalLight(0x9fb8ff, 0.55);
  moon.position.set(-18, 30, -12); scene.add(moon);
  scene.add(new THREE.HemisphereLight(0x2a3a5f, 0x0c0a08, 0.5));
  const moonDisc = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xdfe8ff }));
  moonDisc.position.set(-28, 26, -38); scene.add(moonDisc);

  // Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), mat(0x2a2118));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // Stone path cross
  const pathMat = mat(0x4a443c);
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(4, 60), pathMat);
  p1.rotation.x = -Math.PI / 2; p1.position.y = 0.02; scene.add(p1);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(60, 4), pathMat);
  p2.rotation.x = -Math.PI / 2; p2.position.y = 0.02; scene.add(p2);

  // Houses: box + prism roof + warm windows
  const houseSpots = [
    [-14, -12, 0.3], [14, -14, -0.4], [-16, 8, 0.9], [15, 10, 0.2],
    [-12, 20, -0.2], [12, 20, 0.5], [-20, -2, 1.1], [20, -4, -0.9],
    [-8, -22, 0.1], [9, -21, -0.6],
  ];
  const wallColors = [0x5a4a38, 0x4a3f30, 0x63503c, 0x54432f];
  const roofColors = [0x3a2a22, 0x2f2620, 0x402a20];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofGeo = new THREE.ConeGeometry(1, 1, 4);
  const winGeo = new THREE.PlaneGeometry(0.9, 0.9);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffb45e });
  houseSpots.forEach(([hx, hz, rot], i) => {
    const w = rng.range(5, 7), h = rng.range(3, 4), d = rng.range(4.5, 6);
    const g = new THREE.Group();
    const walls = new THREE.Mesh(boxGeo, mat(wallColors[i % wallColors.length]));
    walls.scale.set(w, h, d); walls.position.y = h / 2; g.add(walls);
    const roof = new THREE.Mesh(roofGeo, mat(roofColors[i % roofColors.length]));
    roof.scale.set(w * 0.78, h * 0.7, d * 0.78); roof.position.y = h + h * 0.32; roof.rotation.y = Math.PI / 4; g.add(roof);
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(0, h * 0.55, d / 2 + 0.02); g.add(win);
    const win2 = new THREE.Mesh(winGeo, winMat);
    win2.position.set(w * 0.28, h * 0.55, d / 2 + 0.02); g.add(win2);
    g.position.set(hx, 0, hz); g.rotation.y = rot;
    scene.add(g);
    addCollider(hx, hz, w / 2 + 0.2, d / 2 + 0.2);
  });

  // Well at the square
  const well = new THREE.Group();
  const wellBase = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 1.0, 10), mat(0x55504a));
  wellBase.position.y = 0.5; well.add(wellBase);
  const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6);
  const postMat = mat(0x3a2a1a);
  [-0.9, 0.9].forEach((x) => { const p = new THREE.Mesh(postGeo, postMat); p.position.set(x, 1.1, 0); well.add(p); });
  const wellRoof = new THREE.Mesh(roofGeo, mat(0x3a2a22));
  wellRoof.scale.set(1.6, 0.9, 1.6); wellRoof.position.y = 2.5; wellRoof.rotation.y = Math.PI / 4; well.add(wellRoof);
  well.position.set(3.5, 0, -3.5); scene.add(well);
  addCollider(3.5, -3.5, 1.3, 1.3);

  // Lantern posts (flickering point lights) — max 4 lights + flashlight + muzzle
  const lanterns = [];
  const lanternSpots = [[-6, -6], [6, 6], [-6, 8], [7, -7]];
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 3.0, 6);
  const lampGeo = new THREE.SphereGeometry(0.28, 8, 8);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffc46a });
  lanternSpots.forEach(([x, z]) => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(poleGeo, mat(0x2a2018)); pole.position.y = 1.5; g.add(pole);
    const lamp = new THREE.Mesh(lampGeo, lampMat); lamp.position.y = 3.05; g.add(lamp);
    const light = new THREE.PointLight(0xff9a3c, 1.1, 14, 2);
    light.position.y = 3.0; g.add(light);
    g.position.set(x, 0, z); scene.add(g);
    lanterns.push({ light, base: 1.1, phase: rng.range(0, 6) });
    addCollider(x, z, 0.25, 0.25);
  });

  // Dead trees
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.3, 3.4, 6);
  const branchGeo = new THREE.CylinderGeometry(0.05, 0.1, 1.6, 5);
  const treeSpots = [[-22, 14], [22, 16], [-24, -18], [24, -16], [-10, 26], [18, 24], [26, 2], [-26, -8]];
  treeSpots.forEach(([x, z]) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, mat(0x241a12)); trunk.position.y = 1.7; g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(branchGeo, mat(0x241a12));
      b.position.set(rng.range(-0.3, 0.3), 2.6 + i * 0.3, rng.range(-0.3, 0.3));
      b.rotation.z = rng.range(0.5, 1.0) * (i % 2 ? 1 : -1); g.add(b);
    }
    g.position.set(x, 0, z); scene.add(g);
    addCollider(x, z, 0.4, 0.4);
  });

  // Fences along the path edges
  const fenceGeo = new THREE.BoxGeometry(3, 0.9, 0.12);
  const fenceMat = mat(0x3a2c1c);
  [[-4, -12], [-4, -9], [4, 12], [4, 15], [-12, 4], [-15, 4]].forEach(([x, z]) => {
    const f = new THREE.Mesh(fenceGeo, fenceMat);
    f.position.set(x, 0.45, z); scene.add(f);
  });

  // Edge spawn points (village border)
  const spawnPoints = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    spawnPoints.push({ x: Math.cos(a) * 27, z: Math.sin(a) * 27 });
  }

  function collide(px, pz, radius) {
    let x = px, z = pz;
    for (const c of colliders) {
      const dx = x - c.x, dz = z - c.z;
      const ox = c.hx + radius - Math.abs(dx), oz = c.hz + radius - Math.abs(dz);
      if (ox > 0 && oz > 0) {
        if (ox < oz) x = c.x + Math.sign(dx || 1) * (c.hx + radius);
        else z = c.z + Math.sign(dz || 1) * (c.hz + radius);
      }
    }
    const lim = half - 1;
    x = Math.max(-lim, Math.min(lim, x)); z = Math.max(-lim, Math.min(lim, z));
    return { x, z };
  }

  function update(dt, t) {
    for (const l of lanterns) {
      l.light.intensity = l.base * (0.85 + 0.15 * Math.sin(t * 7 + l.phase) * Math.sin(t * 3.1 + l.phase));
    }
  }

  return { colliders, spawnPoints, squarePos: { x: 0, z: 0 }, collide, update };
}
