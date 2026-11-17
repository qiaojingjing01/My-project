import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAMPS, CONTACT } from './content.js?v=20261117c';

/* ================= 营地在星球上的位置（纬度, 经度） ================= */
const SPOTS = { work: [16, -38], maker: [20, 52], research: [-14, 148], campus: [6, -128], light: [58, 8] };
const REGIONS = [...CAMPS.map((c, i) => ({ ...c, idx: i })), { ...CONTACT, idx: 'light' }];
const D2R = Math.PI / 180;
const dirOf = ([lat, lon]) => new THREE.Vector3(Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R), Math.cos(lat * D2R) * Math.cos(lon * D2R));
REGIONS.forEach(r => { r.dir = dirOf(SPOTS[r.key]); });

/* ================= 基础 ================= */
const canvas = document.getElementById('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  document.getElementById('nogl').hidden = false;
  document.getElementById('loading').classList.add('done');
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 300);
let DIST = 34;
camera.position.copy(dirOf([18, -20]).multiplyScalar(DIST));

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.rotateSpeed = 0.6;
controls.minDistance = 22;
controls.maxDistance = 46;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = Math.PI - 0.25;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
controls.autoRotate = !reduce;
controls.autoRotateSpeed = 0.5;
controls.addEventListener('start', () => { controls.autoRotate = false; flyTo = null; canvas.classList.add('dragging'); explore(); });
controls.addEventListener('end', () => canvas.classList.remove('dragging'));

const hemi = new THREE.HemisphereLight(0xf2fbff, 0x5d7f6a, 1.15);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 1.9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 60 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const RR = (a, b) => a + rnd() * (b - a);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9, ...o });
const add = (geo, m, x = 0, y = 0, z = 0, parent) => {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};

/* ================= 星球 ================= */
const R = 5;
const planet = new THREE.Group();
scene.add(planet);

// 3D 噪声
const perm = new Uint8Array(512);
{ const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const hash = (x, y, z) => perm[(perm[(perm[x & 255] + y) & 255] + z) & 255] / 255;
const fade = t => t * t * (3 - 2 * t);
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
           l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf), zf) * 2 - 1;
}
const fbm = v => vnoise(v.x * 1.7 + 10, v.y * 1.7 + 3, v.z * 1.7 + 7) * 0.65 + vnoise(v.x * 3.6, v.y * 3.6, v.z * 3.6) * 0.35;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function land(v) { // >0 是陆地
  let b = 0, flat = 0;
  REGIONS.forEach(r => { const d = v.dot(r.dir); b = Math.max(b, smooth(0.8, 0.97, d) * 0.75); flat = Math.max(flat, smooth(0.955, 0.99, d)); });
  return { l: fbm(v) * 0.9 + b - 0.08, flat };
}
function elev(v) {
  const { l, flat } = land(v);
  if (l <= 0) return { e: 0, l };
  let e = 0.1 + Math.min(l, 0.6) * 0.32;
  if (l > 0.55) e += (l - 0.55) * 1.4;
  e = e * (1 - flat) + 0.16 * flat;
  return { e, l };
}
const surf = v => R + elev(v).e;

{
  const geo = new THREE.IcosahedronGeometry(1, 18);
  const pos = geo.attributes.position, n = pos.count;
  const colors = new Float32Array(n * 3);
  const v = new THREE.Vector3(), ls = new Float32Array(n), es = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const { e, l } = elev(v);
    ls[i] = l; es[i] = e;
    v.multiplyScalar(R + e);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  const C = {
    deep: new THREE.Color(0x5bb4cf), sea: new THREE.Color(0x7fcfdc), shoal: new THREE.Color(0xaee6e4),
    sand: new THREE.Color(0xead9b2), grass: new THREE.Color(0xa6cd7c), grass2: new THREE.Color(0x8fbf6a),
    rock: new THREE.Color(0xb4bdba), snow: new THREE.Color(0xffffff)
  };
  const tmpC = new THREE.Color();
  for (let f = 0; f < n; f += 3) {
    const l = (ls[f] + ls[f + 1] + ls[f + 2]) / 3, e = Math.max(es[f], es[f + 1], es[f + 2]);
    let c;
    if (l <= -0.18) c = C.deep; else if (l <= -0.05) c = C.sea; else if (l <= 0.0) c = C.shoal;
    else if (l < 0.07) c = C.sand; else if (e > 0.5) c = C.snow; else if (e > 0.37) c = C.rock;
    else c = (Math.sin(f * 12.9898) > 0.2) ? C.grass : C.grass2;
    tmpC.copy(c);
    for (let k = 0; k < 3; k++) { colors[(f + k) * 3] = tmpC.r; colors[(f + k) * 3 + 1] = tmpC.g; colors[(f + k) * 3 + 2] = tmpC.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ball = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.88 }));
  ball.receiveShadow = true; ball.castShadow = true;
  planet.add(ball);
}

// 大气光晕
const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.16, 48, 32), new THREE.ShaderMaterial({
  uniforms: { col: { value: new THREE.Color(0xbff3ff) }, power: { value: 2.4 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform vec3 col; uniform float power; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), power); gl_FragColor = vec4(col, f * 0.85); }',
  side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
}));
scene.add(halo);

/* ================= 把东西放到球面上 ================= */
const UP = new THREE.Vector3(0, 1, 0);
function anchor(v, lift = 0) {
  const g = new THREE.Group();
  const d = v.clone().normalize();
  g.position.copy(d).multiplyScalar(surf(d) + lift);
  g.quaternion.setFromUnitVectors(UP, d);
  planet.add(g);
  return g;
}
function randDir() {
  const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  return new THREE.Vector3(s * Math.cos(a), u, s * Math.sin(a));
}

// 树（实例化）
{
  const treeDirs = [];
  let guard = 0;
  while (treeDirs.length < 420 && guard++ < 20000) {
    const d = randDir();
    const { l } = land(d), { e } = elev(d);
    if (l < 0.09 || e > 0.34) continue;
    if (REGIONS.some(r => d.dot(r.dir) > 0.975)) continue;
    treeDirs.push(d);
  }
  const cone = new THREE.ConeGeometry(0.17, 0.48, 6); cone.translate(0, 0.42, 0);
  const cone2 = new THREE.ConeGeometry(0.13, 0.34, 6); cone2.translate(0, 0.66, 0);
  const trunk = new THREE.CylinderGeometry(0.035, 0.045, 0.22, 5); trunk.translate(0, 0.11, 0);
  const round = new THREE.IcosahedronGeometry(0.22, 0); round.translate(0, 0.42, 0);
  const pine = treeDirs.filter((_, i) => i % 3 !== 0), broad = treeDirs.filter((_, i) => i % 3 === 0);
  const mk = (geo, color, list) => {
    const im = new THREE.InstancedMesh(geo, mat(color), list.length);
    im.castShadow = true; im.receiveShadow = true;
    planet.add(im); return im;
  };
  const iC = mk(cone, 0x3f7d55, pine), iC2 = mk(cone2, 0x4e9466, pine), iT = mk(trunk, 0x7a5a43, treeDirs), iB = mk(round, 0x6aa65a, broad);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const place = (im, list, idx0 = 0) => list.forEach((d, i) => {
    const k = 0.75 + (Math.sin(i * 91.7) * 0.5 + 0.5) * 0.6;
    q.setFromUnitVectors(UP, d); s.set(k, k, k); p.copy(d).multiplyScalar(surf(d) - 0.02);
    m4.compose(p, q, s); im.setMatrixAt(i + idx0, m4);
  });
  place(iC, pine); place(iC2, pine); place(iT, treeDirs); place(iB, broad);
  // 山顶小石头
  for (let i = 0; i < 90; i++) {
    const d = randDir(); const { l } = land(d);
    if (l < 0.02 || l > 0.12 || REGIONS.some(r => d.dot(r.dir) > 0.975)) continue;
    const g = anchor(d, -0.02);
    const rk = add(new THREE.DodecahedronGeometry(RR(0.06, 0.13), 0), mat(rnd() > 0.5 ? 0xd2cdc2 : 0xbfb9ad), 0, 0.03, 0, g);
    rk.rotation.set(RR(0, 3), RR(0, 3), RR(0, 3));
  }
}

/* ================= 营地 ================= */
const flags = [], fires = [], rings = [], beams = [];
function flag(g, x, y, z, color) {
  const geo = new THREE.PlaneGeometry(0.6, 0.36, 8, 2);
  const f = add(geo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, flatShading: true }), x + 0.3, y, z, g);
  f.userData.base = geo.attributes.position.array.slice();
  flags.push(f);
}
function fire(g, x, z) {
  for (let k = 0; k < 5; k++) {
    const log = add(new THREE.CylinderGeometry(0.05, 0.05, 0.5), mat(0x6b4630), x, 0.06, z, g);
    log.rotation.set(Math.PI / 2, 0, (k / 5) * Math.PI);
  }
  const fl = add(new THREE.ConeGeometry(0.18, 0.45, 6), mat(0xffa23a, { emissive: 0xff7a1a, emissiveIntensity: 1 }), x, 0.3, z, g);
  fl.castShadow = false;
  fires.push(fl);
}
function chair(g, x, z, r, col) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = r; g.add(c);
  add(new THREE.BoxGeometry(0.42, 0.06, 0.4), mat(col), 0, 0.32, 0, c);
  add(new THREE.BoxGeometry(0.42, 0.42, 0.05), mat(col), 0, 0.52, -0.18, c);
  [[-0.17, -0.16], [0.17, -0.16], [-0.17, 0.16], [0.17, 0.16]].forEach(([a, b]) => add(new THREE.CylinderGeometry(0.02, 0.02, 0.32), mat(0x777777), a, 0.16, b, c));
}
const campTops = [];
REGIONS.forEach((c, i) => {
  const g = anchor(c.dir, -0.02);
  g.scale.setScalar(0.62);
  const col = new THREE.Color(c.color);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.75, 32), mat(0xd9c7a0));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.04; pad.receiveShadow = true; g.add(pad);
  const rg = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.72, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  rg.rotation.x = -Math.PI / 2; rg.position.y = 0.06; g.add(rg); rings.push(rg);
  let top = 2.2;
  if (c.key === 'work') {
    const tent = add(new THREE.ConeGeometry(0.95, 1.3, 4), mat(col), 0.1, 0.7, -0.2, g); tent.rotation.y = Math.PI / 4;
    add(new THREE.BoxGeometry(0.3, 0.55, 0.04), mat(0x5a3b2a), 0.1, 0.32, 0.48, g);
    fire(g, -0.85, 0.65);
    add(new THREE.CylinderGeometry(0.03, 0.03, 1.8), mat(0x7a5a43), 0.95, 0.95, -0.6, g);
    flag(g, 0.95, 1.65, -0.6, c.color);
  } else if (c.key === 'maker') {
    add(new THREE.BoxGeometry(1.4, 0.95, 1.1), mat(0xf3e8d2), 0, 0.52, -0.15, g);
    const roof = add(new THREE.ConeGeometry(1.15, 0.75, 4), mat(col), 0, 1.36, -0.15, g); roof.rotation.y = Math.PI / 4;
    const scr = add(new THREE.BoxGeometry(0.62, 0.38, 0.04), mat(0x223, { emissive: col, emissiveIntensity: 0.9 }), 0, 0.59, 0.42, g); scr.castShadow = false;
    add(new THREE.BoxGeometry(0.18, 0.16, 0.18), mat(0xffd36b, { emissive: 0xffb84d, emissiveIntensity: 0.6 }), 0.95, 0.12, 0.55, g);
    add(new THREE.BoxGeometry(0.18, 0.16, 0.18), mat(0x8fd3ff), 1.1, 0.12, 0.32, g);
    add(new THREE.BoxGeometry(0.18, 0.16, 0.18), mat(0xff8fb0), 0.98, 0.28, 0.42, g);
  } else if (c.key === 'research') {
    add(new THREE.CylinderGeometry(0.7, 0.78, 0.9, 12), mat(0xefe9dc), 0, 0.49, -0.1, g);
    add(new THREE.SphereGeometry(0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(col), 0, 0.94, -0.1, g);
    const tel = add(new THREE.CylinderGeometry(0.08, 0.11, 0.9, 8), mat(0x3c4a52), 0.25, 1.39, 0.1, g); tel.rotation.z = -0.8;
    for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.34, 0.1, 0.24), mat([0xe2894f, 0x6b78e0, 0xde6b8e][k]), -0.95, 0.1 + k * 0.1, 0.55, g);
  } else if (c.key === 'campus') {
    add(new THREE.CylinderGeometry(0.03, 0.03, 2.0), mat(0x7a5a43), -0.6, 1.04, -0.5, g);
    flag(g, -0.6, 1.84, -0.5, c.color);
    chair(g, 0.4, 0.2, 0.3, col); chair(g, 0.9, 0.1, -0.1, new THREE.Color('#6fb1d6'));
    const net = add(new THREE.BoxGeometry(1.4, 0.35, 0.02), mat(0xffffff, { transparent: true, opacity: 0.65 }), -0.1, 0.66, 0.75, g);
    net.castShadow = false;
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.8), mat(0x777777), -0.8, 0.44, 0.75, g);
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.8), mat(0x777777), 0.6, 0.44, 0.75, g);
  } else if (c.key === 'light') {
    for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.42 - k * 0.06, 0.48 - k * 0.06, 0.55, 12), mat(k % 2 ? 0xffffff : 0xd0484f), 0, 0.3 + k * 0.55, 0, g);
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.35, 10), mat(0xfff2b0, { emissive: 0xffd36b, emissiveIntensity: 1.2 }), 0, 2.5, 0, g);
    add(new THREE.ConeGeometry(0.42, 0.45, 10), mat(0x2d3a42), 0, 2.9, 0, g);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.5, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3c0, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    beam.rotation.z = Math.PI / 2; beam.position.set(2.4, 2.5, 0);
    const pivot = new THREE.Group(); pivot.add(beam); g.add(pivot); beams.push(pivot);
    top = 3.3;
  }
  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.9, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 1; hit.userData.region = i; g.add(hit);
  c.group = g; c.hit = hit;
  const tp = new THREE.Object3D(); tp.position.y = top; g.add(tp); campTops.push(tp);
});

// 云
const clouds = [];
const cloudMat = mat(0xffffff, { transparent: true, opacity: 0.85, emissive: 0xffffff, emissiveIntensity: 0.55 });
for (let i = 0; i < 9; i++) {
  const c = new THREE.Group();
  const n = 3 + Math.floor(rnd() * 3);
  for (let k = 0; k < n; k++) add(new THREE.IcosahedronGeometry(RR(0.25, 0.45), 0), cloudMat, k * 0.38 - n * 0.19, RR(-0.05, 0.12), RR(-0.12, 0.12), c);
  const pivot = new THREE.Group();
  pivot.rotation.set(RR(0, Math.PI), RR(0, Math.PI), 0);
  c.position.set(0, R + RR(1.9, 2.5), 0); c.scale.setScalar(0.8);
  pivot.add(c); scene.add(pivot);
  clouds.push({ pivot, sp: RR(0.03, 0.07) * (rnd() > 0.5 ? 1 : -1) });
}

/* ================= 界面 ================= */
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const isExt = href => href.startsWith('donghang');
const labels = document.getElementById('labels');
const pins = REGIONS.map((c, i) => {
  const b = document.createElement('button');
  b.className = 'pin'; b.style.color = c.color;
  b.innerHTML = c.key === 'light'
    ? `<span class="no" style="background:${c.color}">✉</span><span class="tx" style="color:var(--ink)">灯塔 · 联系我</span>`
    : `<span class="no" style="background:${c.color}">${c.no}</span><span class="tx" style="color:var(--ink)">${c.name}</span><i></i>`;
  b.setAttribute('aria-label', c.key === 'light' ? '灯塔：联系我' : `${c.no} ${c.name}：${c.dock}`);
  b.addEventListener('click', () => goRegion(i));
  labels.appendChild(b);
  return b;
});

// 卡片层
const cardsEl = document.getElementById('gcards');
const linesEl = document.getElementById('glines');
const deckHead = document.createElement('div');
deckHead.className = 'deck-head';
cardsEl.appendChild(deckHead);
const decks = REGIONS.map((c, ri) => {
  const els = c.items.map((it, k) => {
    const a = document.createElement('article');
    a.className = 'gcard'; a.style.setProperty('--c', c.color);
    const met = it.mets ? `<span class="gm">${esc(it.mets[0])}</span>` : '';
    const link = it.link
      ? `<a class="glk" href="${it.link[0]}"${isExt(it.link[0]) ? ' target="_blank" rel="noopener"' : ''}>${esc(it.link[1].replace(' ↗', ''))} ${isExt(it.link[0]) ? '↗' : '→'}</a>`
      : `<button class="glk" type="button">看详情 →</button>`;
    a.innerHTML = `<div class="gtop"><span class="gno">${k + 1}</span><span class="gtg">${esc(it.tag)}</span><span class="gtime">${esc(it.time || '')}</span></div>
      <h3>${esc(it.title)}</h3><p class="gorg">${esc(it.org)}</p>${met}<div class="gfoot">${link}</div>`;
    a.tabIndex = 0;
    a.addEventListener('click', e => { if (e.target.closest('a')) return; openPanel(ri, k); });
    a.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.target.closest('a')) openPanel(ri, k); });
    cardsEl.appendChild(a);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('stroke', c.color);
    linesEl.appendChild(line);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '4'); dot.setAttribute('fill', c.color);
    linesEl.appendChild(dot);
    return { el: a, line, dot };
  });
  // 卡片在球面上的锚点：围着营地中心
  const n = els.length;
  const ANG = { 1: [0], 2: [160, 20], 3: [150, 30, -20], 4: [148, 32, -32, -148] }[Math.min(n, 4)];
  const east = new THREE.Vector3().crossVectors(UP, c.dir).normalize();
  if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
  const north = new THREE.Vector3().crossVectors(c.dir, east).normalize();
  const anchors = els.map((_, k) => {
    const a = ANG[k] * D2R;
    const p = c.dir.clone().multiplyScalar(1).add(east.clone().multiplyScalar(Math.cos(a) * 0.2)).add(north.clone().multiplyScalar(Math.sin(a) * 0.2)).normalize();
    const o = new THREE.Object3D(); o.position.copy(p).multiplyScalar(surf(p) + 0.05); planet.add(o);
    return { obj: o, ang: a };
  });
  return { els, anchors };
});

const dock = document.getElementById('dock');
REGIONS.forEach((c, i) => {
  if (c.key === 'light') return;
  const b = document.createElement('button');
  b.innerHTML = `<i style="background:${c.color}"></i><small>${c.no}</small>${c.name}<small>${c.dock}</small>`;
  b.addEventListener('click', () => goRegion(i));
  dock.appendChild(b);
});

const panel = document.getElementById('panel');
const body = document.getElementById('panelBody');
const hero = document.getElementById('hero');
let current = null, exploring = false;
function explore() {
  if (exploring) return;
  exploring = true;
  hero.classList.add('away');
  document.body.classList.add('exploring');
}
function openPanel(ri, k = 0) {
  const c = REGIONS[ri];
  current = ri;
  body.innerHTML = `<p class="ph-k" style="color:${c.color}"><i style="background:${c.color}"></i>${c.no} · ${c.en}</p>
    <h2>${c.name}</h2><p class="ph-s">${esc(c.summary)}</p>` +
    c.items.map((it, j) => `<article class="card" id="it-${j}" style="--c:${c.color}">
      <div class="meta"><span class="tg">${j + 1} · ${esc(it.tag)}</span><span>${esc(it.time || '')}</span></div>
      <h3>${esc(it.title)}</h3><p class="org">${esc(it.org)}</p>
      <ul>${it.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      ${it.mets ? `<div class="mets">${it.mets.map(m => `<span>${esc(m)}</span>`).join('')}</div>` : ''}
      ${it.link ? `<a class="lk" href="${it.link[0]}"${isExt(it.link[0]) ? ' target="_blank" rel="noopener"' : ''}>${esc(it.link[1])}${it.link[1].includes('↗') ? '' : ' →'}</a>` : ''}
    </article>`).join('');
  panel.hidden = false;
  document.body.classList.add('panel-open');
  explore();
  const el = body.querySelector('#it-' + k);
  body.scrollTop = 0;
  if (el && k > 0) requestAnimationFrame(() => { body.scrollTop = el.offsetTop - 16; });
  syncNav(ri);
}
function closePanel() {
  panel.hidden = true; current = null;
  document.body.classList.remove('panel-open');
}
function syncNav(ri) {
  pins.forEach((p, i) => p.classList.toggle('on', i === ri));
  let j = 0;
  REGIONS.forEach((c, i) => { if (c.key === 'light') return; dock.children[j++].classList.toggle('on', i === ri); });
}
document.getElementById('closePanel').addEventListener('click', closePanel);
const step = d => { const n = REGIONS.length; const ri = ((current ?? 0) + d + n) % n; goRegion(ri); openPanel(ri); };
document.getElementById('nextCamp').addEventListener('click', () => step(1));
document.getElementById('prevCamp').addEventListener('click', () => step(-1));
document.getElementById('goBtn').addEventListener('click', () => goRegion(0));
const helpBtn = document.getElementById('helpBtn'), helpBox = document.getElementById('helpBox');
helpBtn.addEventListener('click', () => { helpBox.hidden = !helpBox.hidden; helpBtn.setAttribute('aria-expanded', String(!helpBox.hidden)); });
addEventListener('keydown', e => {
  if (e.key === 'Escape') { closePanel(); helpBox.hidden = true; return; }
  if (e.target.closest && e.target.closest('input,textarea')) return;
  if (e.key === 'ArrowRight') { const a = activeRegion(); goRegion(((a < 0 ? 0 : a) + 1) % REGIONS.length); }
  if (e.key === 'ArrowLeft') { const a = activeRegion(); goRegion(((a < 0 ? 0 : a) - 1 + REGIONS.length) % REGIONS.length); }
});

/* ================= 转到某一面 ================= */
let flyTo = null;
function goRegion(ri) {
  controls.autoRotate = false;
  helpBox.hidden = true;
  explore();
  if (!panel.hidden && current !== ri) closePanel();
  const d = REGIONS[ri].dir.clone();
  const tilt = new THREE.Vector3(0, 1, 0).sub(d.clone().multiplyScalar(d.y)).normalize().multiplyScalar(0.12);
  const to = d.add(tilt).normalize();
  flyTo = { from: camera.position.clone().normalize(), to, dist0: camera.position.length(), t: 0 };
  syncNav(ri);
}

// 点击星球上的营地
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downAt = null;
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(REGIONS.map(r => r.hit), false)[0];
  if (hit) goRegion(hit.object.userData.region);
});

/* ================= 白天 / 黄昏 ================= */
const THEMES = {
  day: { hemi: [0xf2fbff, 0x5d7f6a, 1.15], sun: [0xfff1d6, 1.9], halo: 0xbff3ff },
  dusk: { hemi: [0xffd9e6, 0x5a4a6e, 0.95], sun: [0xffb487, 1.6], halo: 0xffc6e0 }
};
function setTime(t) {
  const th = THEMES[t];
  hemi.color.set(th.hemi[0]); hemi.groundColor.set(th.hemi[1]); hemi.intensity = th.hemi[2];
  sun.color.set(th.sun[0]); sun.intensity = th.sun[1];
  halo.material.uniforms.col.value.set(th.halo);
  document.body.classList.toggle('dusk', t === 'dusk');
  document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.time === t));
  try { localStorage.setItem('globe-time', t); } catch (e) {}
}
document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => setTime(b.dataset.time)));
try { const t = localStorage.getItem('globe-time'); if (t && THEMES[t]) setTime(t); } catch (e) {}

/* ================= 渲染 ================= */
let narrow = false;
function resize() {
  const w = innerWidth, h = innerHeight;
  narrow = w < 760;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = narrow ? 44 : 32;
  camera.updateProjectionMatrix();
  // 让星球的屏幕半径约为高度的 26%，两侧留出卡片的位置
  const rsT = narrow ? Math.min(w * 0.36, h * 0.24) : Math.min(h * 0.26, (w - 2 * (248 + 90)) / 2);
  const th = Math.atan(Math.max(rsT, 120) / (h / 2) * Math.tan(camera.fov * D2R / 2));
  DIST = (R * 1.08) / Math.sin(th);
  controls.minDistance = DIST * 0.75; controls.maxDistance = DIST * 1.5;
  if (!exploring && camera.position.length() > 0) camera.position.setLength(DIST);
  linesEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
  document.body.classList.toggle('narrow', narrow);
}
addEventListener('resize', resize); resize();

let offX = 0, offY = 0;
function viewOffset(dt) {
  const w = innerWidth, h = innerHeight, open = !panel.hidden;
  let tx = 0, ty = 0;
  if (!narrow) tx = open ? w * (w >= 1180 ? 0.16 : 0.22) : (!exploring ? -w * (w >= 1180 ? 0.16 : 0.13) : 0);
  else ty = open ? h * 0.28 : (exploring ? h * 0.1 : -h * 0.06);
  const k = 1 - Math.exp(-dt * 5);
  offX += (tx - offX) * k; offY += (ty - offY) * k;
  camera.setViewOffset(w, h, offX, offY, w, h);
}

const tmp = new THREE.Vector3(), camDir = new THREE.Vector3(), wp = new THREE.Vector3();
function toScreen(v) {
  tmp.copy(v).project(camera);
  return [(tmp.x * 0.5 + 0.5) * innerWidth, (-tmp.y * 0.5 + 0.5) * innerHeight, tmp.z];
}
function facing(ri) { return REGIONS[ri].dir.dot(camDir); }
function activeRegion() {
  let best = -1, bv = -2;
  REGIONS.forEach((_, i) => { const f = facing(i); if (f > bv) { bv = f; best = i; } });
  return bv > 0.8 ? best : -1;
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
let lastActive = -2;
function layoutCards() {
  const act = (exploring && panel.hidden) ? activeRegion() : -1;
  const w = innerWidth, h = innerHeight;
  if (act !== lastActive) {
    decks.forEach((d, ri) => d.els.forEach(({ el, line, dot }, k) => {
      const on = ri === act;
      el.classList.toggle('show', on);
      el.style.transitionDelay = on ? `${k * 70}ms` : '0ms';
      line.style.opacity = dot.style.opacity = on ? '' : '0';
    }));
    if (act >= 0) {
      const c = REGIONS[act];
      deckHead.innerHTML = `<span class="dh-no" style="background:${c.color}">${c.key === 'light' ? '✉' : c.no}</span><b>${c.name}</b><span>${esc(c.summary)}</span>`;
    }
    deckHead.classList.toggle('show', act >= 0);
    document.body.classList.toggle('has-deck', act >= 0);
    lastActive = act;
  }
  if (act < 0) return;
  const fade = smooth(0.8, 0.93, facing(act));
  cardsEl.style.setProperty('--fade', fade.toFixed(3));
  const deck = decks[act];
  const [cx, cy] = toScreen(wp.set(0, 0, 0));
  tmp.set(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(R * 1.06);
  const [ex] = toScreen(tmp);
  const rs = Math.abs(ex - cx);
  tmp.copy(REGIONS[act].dir).multiplyScalar(R);
  const [rcx] = toScreen(tmp);
  const pts = deck.els.map((c, k) => {
    deck.anchors[k].obj.getWorldPosition(wp);
    const [ax, ay] = toScreen(wp);
    let side = Math.abs(ax - rcx) < 2 ? (Math.cos(deck.anchors[k].ang) >= 0 ? 1 : -1) : Math.sign(ax - rcx);
    return { ...c, k, ax, ay, side };
  });
  if (narrow) { pts.forEach(p => { p.line.setAttribute('d', ''); p.dot.setAttribute('cx', p.ax); p.dot.setAttribute('cy', p.ay); }); return; }
  // 一边最多两张
  const L = pts.filter(p => p.side < 0), Rt = pts.filter(p => p.side > 0);
  while (L.length > 2) Rt.push(L.pop());
  while (Rt.length > 2) L.push(Rt.pop());
  [[L, -1], [Rt, 1]].forEach(([list, side]) => {
    list.sort((a, b) => a.ay - b.ay);
    const hs = list.map(p => p.el.offsetHeight), gap = 18;
    const total = hs.reduce((a, b) => a + b, 0) + gap * (list.length - 1);
    let y = clamp(cy - total / 2, 132, h - total - 92);
    list.forEach((p, i) => {
      const cw = p.el.offsetWidth, ch = hs[i];
      let px = side > 0 ? cx + rs + 70 : cx - rs - 70 - cw;
      px = Math.round(clamp(px, 14, w - cw - 14));
      const py = Math.round(y);
      p.el.style.transform = `translate(${px}px,${py}px)`;
      const ex2 = side > 0 ? px : px + cw, ey2 = py + Math.min(ch / 2, 34);
      const mx = (p.ax + ex2) / 2;
      p.line.setAttribute('d', `M${p.ax.toFixed(1)},${p.ay.toFixed(1)} C${mx.toFixed(1)},${p.ay.toFixed(1)} ${mx.toFixed(1)},${ey2} ${ex2},${ey2}`);
      p.dot.setAttribute('cx', p.ax.toFixed(1)); p.dot.setAttribute('cy', p.ay.toFixed(1));
      y += ch + gap;
    });
  });
}

const clock = new THREE.Clock();
let first = true;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (flyTo) {
    flyTo.t = Math.min(1, flyTo.t + dt / 1.1);
    const e = 1 - Math.pow(1 - flyTo.t, 3);
    const q = new THREE.Quaternion().setFromUnitVectors(flyTo.from, flyTo.to);
    const qi = new THREE.Quaternion().slerp(q, e);
    const d = flyTo.dist0 + (DIST - flyTo.dist0) * e;
    camera.position.copy(flyTo.from).applyQuaternion(qi).multiplyScalar(d);
    if (flyTo.t >= 1) flyTo = null;
  }
  controls.update();
  camDir.copy(camera.position).normalize();
  // 太阳跟着相机，从左上方照过来
  tmp.set(-0.6, 0.8, 0.4).applyQuaternion(camera.quaternion);
  sun.position.copy(tmp.multiplyScalar(30));
  if (!reduce) {
    flags.forEach(f => {
      const p = f.geometry.attributes.position, b = f.userData.base;
      for (let i = 0; i < p.array.length; i += 3) p.array[i + 2] = Math.sin(b[i] * 6 + t * 4) * 0.05 * (b[i] + 0.3);
      p.needsUpdate = true;
    });
    fires.forEach(fl => { const s = 1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 13) * 0.05; fl.scale.set(s, s * 1.1, s); });
    rings.forEach((rg, i) => { rg.material.opacity = 0.45 + Math.sin(t * 2 + i) * 0.25; });
    beams.forEach(b => { b.rotation.y = t * 0.8; });
    clouds.forEach(c => { c.pivot.rotateY(c.sp * dt); });
  }
  viewOffset(dt);
  // 营地标签
  REGIONS.forEach((c, i) => {
    campTops[i].getWorldPosition(wp);
    const [x, y] = toScreen(wp);
    const f = facing(i);
    pins[i].style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
    pins[i].classList.toggle('hide', f < 0.12);
  });
  layoutCards();
  renderer.render(scene, camera);
  if (first) { first = false; setTimeout(() => document.getElementById('loading').classList.add('done'), 150); }
  requestAnimationFrame(tick);
}
tick();
