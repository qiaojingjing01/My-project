import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ================= 内容 ================= */
const PF = 'portfolio/';
const CAMPS = [
  {
    key: 'work', no: '01', name: '工作营地', en: 'WORK CAMP', dock: '实习经历', color: '#e2894f',
    pos: [-4.6, 2.6],
    summary: '三段实习，做的都是同一类事：让 AI 和数据真正进入企业的日常工作。',
    items: [
      { tag: 'AI 产品', org: '小红书 · AI 产品经理实习生 · 企业智能部 Product Lab', time: '2026.08 – 至今',
        title: 'Flick：让企业经验主动找到对的人',
        points: ['用户访谈定位“经验找不到、看不到、用不上”，负责“关注”模块的界面与整体策略',
                 '设计 AI 内容加工链路，提出广泛推荐、定向推荐、保留检索三层分发',
                 '「问 AI」接入：基于 Agent 框架对接企业知识库检索（RAG）',
                 '信息卡生成以脱敏为底线，评估摘要准确和标题吸引，新旧两版对比择优'],
        mets: ['两轮灰度 1,000+ → 1,500 人', '613 → 102 部门归并', '1:1 A/B 实验'],
        link: [PF + '#flick', '看完整案例和 Demo'] },
      { tag: 'Agent', org: '小红书 · Colead 会议 Agent', time: '迭代中',
        title: 'Colead：贯穿会前、会中、会后的会议助手',
        points: ['按会前、会中、会后拆解任务：材料收集、议程跟踪、纪要与待办分派',
                 '设计个人、会议、企业三层知识库，承接跨会议的上下文',
                 '体验对比 WorkBuddy、TeleAgent 等办公 Agent，借鉴 Skill 的前置检查与逐步校验'],
        link: [PF + '#colead', '看会议 Agent Demo'] },
      { tag: '数据产品', org: '特斯拉 · 数据产品实习生 · Service 售后', time: '2026.03 – 2026.08',
        title: '售后运营看板：让门店经理一眼看到问题',
        points: ['走访门店，和门店经理、服务顾问、维修技师梳理看数场景，搭建分层指标体系',
                 '“大区＋门店”下钻看板，异常门店预警、周会逐店复盘',
                 '对比 FRT 标准工时和实际打卡工时，按车型和项目拆分做 bad case 分析',
                 '把面试评估拆成 5 个 Skill，打分经复核再出报告'],
        mets: ['报表 2–3 小时 → 0.5 小时', '韩国全量 + 北京近 20 家门店'],
        link: [PF + '#dash', '看看板 Demo'] },
      { tag: 'AI 应用', org: 'Ubras · AI 产品测试开发实习生 · IT 部门', time: '2025.09 – 2025.12',
        title: '对话式经营报告 + 用户画像',
        points: ['串联飞书、阿里云、观远 BI，「神笔」Agent 一句话出经营报告，取数后先复核',
                 '用 Python 处理约 100 万条购买数据，K-means 聚类、肘部法定 3 类：高消 Z 时代、精致妈妈、都市白领'],
        mets: ['单份报告 20 → 5 分钟', '日均近 100 次'],
        link: [PF + '#report', '看对话式报告 Demo'] }
    ]
  },
  {
    key: 'maker', no: '02', name: '作品营地', en: 'MAKER CAMP', dock: 'Vibe Coding', color: '#6b78e0',
    pos: [4.9, 2.7],
    summary: '用 Claude Code、Codex 做 Vibe Coding，想法当天就能变成能点、能玩的东西。',
    items: [
      { tag: '开源上线', org: '懂行 · 新人入行的行话词典', time: '个人项目',
        title: '把行话当单词背',
        points: ['AI、数据、职场黑话三本词书，像百词斩一样每天刷一组词卡',
                 '间隔复习：直接认识的词按 1、2、4、7、15、30 天再出现',
                 '发现页是一个大词库，有「猜你想搜」推荐，搜不到的词一键申请收录',
                 '规划：Agent 发现行业新词、检索生成释义，人工审核后入库'],
        link: ['donghang/', '打开懂行 ↗'] },
      { tag: '获奖', org: '秋招步步惊心 · 小游戏', time: '个人项目',
        title: '把秋招做成一个游戏',
        points: ['独立完成玩法设计、界面和前端开发', '在小红书内部上线'],
        mets: ['100+ 人试玩', '小红书 Build 大赛获奖'] },
      { tag: '3D', org: '这座小岛', time: '个人项目',
        title: '你现在逛的作品集',
        points: ['用 Three.js 搭的 3D 作品集，拖动、点击、WASD 都能逛', '每个营地对应一段经历，详细案例在完整作品集里'],
        link: [PF, '看完整作品集'] }
    ]
  },
  {
    key: 'research', no: '03', name: '研究营地', en: 'RESEARCH CAMP', dock: '科研课题', color: '#2f9f97',
    pos: [0.6, -5.4],
    summary: '研究生课题：把林下经济的知识，变成模型能用的数据。',
    items: [
      { tag: '知识图谱', org: '面向林下经济的知识图谱问答系统 · 研究生课题', time: '2025.12 – 至今',
        title: '自建「林药、林菌、林蜂」知识图谱',
        points: ['整合已有数据，清洗大量非结构化文档，抽取实体和关系',
                 '构建林药、林菌、林蜂三类知识图谱，作为自有数据集',
                 '在 Dify 上做意图分类：图谱查询、RAG 多跳检索、经验录入三路分流',
                 '以准确率、幻觉率做消融实验，确定最优检索跳数 K=2'] },
      { tag: '成果', org: '科研成果', time: '',
        title: '软著和专利',
        points: ['软件著作权 1 项', '专利申请 1 项，已通过初审'] }
    ]
  },
  {
    key: 'campus', no: '04', name: '校园营地', en: 'CAMPUS CAMP', dock: '学生工作', color: '#de6b8e',
    pos: [-5.6, -2.9],
    summary: '做学生干部的几年，练的是把一群人组织起来，把一件事办成。',
    items: [
      { tag: '组织', org: '北京林业大学 · 信息学院学生会副主席', time: '2025.09 – 2026.08',
        title: '办过的几场活动',
        points: ['和华为合办校内学术会议，200+ 人', '「芯林杯」羽毛球赛，约 100 人', '师生风采大赛，30 人'],
        mets: ['200+ 人学术会议'] },
      { tag: '荣誉', org: '北京林业大学 · 软件工程硕士', time: '2024.09 – 2027.06',
        title: '学业和荣誉',
        points: ['研究生学业一等奖学金（每年）', '优秀研究生、优秀研究生干部', '团支书，本科至研究生连任'] }
    ]
  }
];
const CONTACT = {
  key: 'light', no: '✉', name: '灯塔', en: 'SAY HELLO', color: '#4a6b8a',
  summary: '2027 届，正在找 AI 产品经理、数据产品经理相关的工作。欢迎联系。',
  items: [
    { tag: '联系', org: '王雯菁 Claire', time: '',
      title: '15619080835@163.com',
      points: ['北京林业大学 软件工程 硕士', '小红书 AI 产品经理实习生'],
      link: [PF, '看完整作品集'] }
  ]
};

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
scene.fog = new THREE.Fog(0xcdeeea, 38, 80);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
camera.position.set(17, 15, 19);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.6, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 12;
controls.maxDistance = 40;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = 1.18;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
controls.autoRotate = !reduce;
controls.autoRotateSpeed = 0.45;
controls.addEventListener('start', () => { controls.autoRotate = false; canvas.classList.add('dragging'); });
controls.addEventListener('end', () => canvas.classList.remove('dragging'));

const hemi = new THREE.HemisphereLight(0xeafcff, 0x6d8c5a, 1.15);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 1.7);
sun.position.set(12, 20, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 60 });
sun.shadow.bias = -0.0006;
scene.add(sun);

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const R = (a, b) => a + rnd() * (b - a);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9, ...o });
const add = (geo, m, x = 0, y = 0, z = 0, parent = scene) => {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};
const GROUND = 0.5;

/* ================= 海和岛 ================= */
const waterGeo = new THREE.PlaneGeometry(140, 140, 70, 70);
waterGeo.rotateX(-Math.PI / 2);
const waterBase = waterGeo.attributes.position.array.slice();
const waterMat = mat(0x84d2d4, { transparent: true, opacity: 0.94, roughness: 0.35, metalness: 0.05 });
const water = new THREE.Mesh(waterGeo, waterMat);
water.position.y = -0.35;
water.receiveShadow = true;
scene.add(water);

const foam = new THREE.Mesh(new THREE.RingGeometry(10.5, 11.6, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
foam.rotation.x = -Math.PI / 2; foam.position.y = -0.22;
scene.add(foam);

add(new THREE.CylinderGeometry(10.7, 9.4, 1.3, 64), mat(0xead9b2), 0, -0.55, 0);
const grass = add(new THREE.CylinderGeometry(9.7, 10.0, 0.55, 64), mat(0xa6cd7c), 0, 0.22, 0);
grass.castShadow = false;

for (let i = 0; i < 70; i++) {
  const a = (i / 70) * Math.PI * 2 + R(-0.03, 0.03);
  const r = R(10.0, 10.6);
  const s = R(0.22, 0.5);
  const rock = add(new THREE.DodecahedronGeometry(s, 0), mat(rnd() > 0.5 ? 0xd2cdc2 : 0xbfb9ad), Math.cos(a) * r, R(-0.1, 0.15), Math.sin(a) * r);
  rock.rotation.set(R(0, 3), R(0, 3), R(0, 3));
}

// 山
[[-2.6, -7.0, 2.0, 3.6], [-0.4, -7.6, 1.6, 2.7], [-4.6, -6.0, 1.4, 2.3], [3.2, -7.2, 1.3, 2.1]].forEach(([x, z, r, h]) => {
  add(new THREE.ConeGeometry(r, h, 6), mat(0xb4bdba), x, GROUND + h / 2 - 0.05, z);
  add(new THREE.ConeGeometry(r * 0.42, h * 0.42, 6), mat(0xffffff), x, GROUND + h - h * 0.21 - 0.02, z);
});

// 湖
const lake = new THREE.Mesh(new THREE.CircleGeometry(1.35, 24), new THREE.MeshStandardMaterial({ color: 0x8ccfe0, roughness: 0.2 }));
lake.rotation.x = -Math.PI / 2; lake.position.set(2.6, GROUND + 0.01, -1.6); lake.receiveShadow = true;
scene.add(lake);

/* ================= 营地 ================= */
const campMeshes = [];
function ring(color) {
  const m = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.65, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }));
  m.rotation.x = -Math.PI / 2;
  return m;
}
function buildCamp(c, i) {
  const g = new THREE.Group();
  g.position.set(c.pos[0], GROUND, c.pos[1]);
  scene.add(g);
  const col = new THREE.Color(c.color);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.75, 32), mat(0xd9c7a0));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.01; pad.receiveShadow = true; g.add(pad);
  const rg = ring(col); rg.position.y = 0.03; g.add(rg);
  if (c.key === 'work') {
    const tent = add(new THREE.ConeGeometry(0.95, 1.3, 4), mat(col), 0.1, 0.65, -0.2, g); tent.rotation.y = Math.PI / 4;
    add(new THREE.BoxGeometry(0.3, 0.55, 0.04), mat(0x5a3b2a), 0.1, 0.28, 0.48, g);
    fire(g, -0.85, 0.65);
    add(new THREE.CylinderGeometry(0.03, 0.03, 1.8), mat(0x7a5a43), 0.95, 0.9, -0.6, g);
    flag(g, 0.95, 1.6, -0.6, c.color);
  } else if (c.key === 'maker') {
    add(new THREE.BoxGeometry(1.4, 0.95, 1.1), mat(0xf3e8d2), 0, 0.48, -0.15, g);
    const roof = add(new THREE.ConeGeometry(1.15, 0.75, 4), mat(col), 0, 1.32, -0.15, g); roof.rotation.y = Math.PI / 4;
    const scr = add(new THREE.BoxGeometry(0.62, 0.38, 0.04), mat(0x223, { emissive: col, emissiveIntensity: 0.9 }), 0, 0.55, 0.42, g); scr.castShadow = false;
    add(new THREE.BoxGeometry(0.18, 0.16, 0.18), mat(0xffd36b, { emissive: 0xffb84d, emissiveIntensity: 0.6 }), 0.95, 0.08, 0.55, g);
    add(new THREE.BoxGeometry(0.18, 0.16, 0.18), mat(0x8fd3ff), 1.1, 0.08, 0.32, g);
    add(new THREE.BoxGeometry(0.18, 0.16, 0.18), mat(0xff8fb0), 0.98, 0.24, 0.42, g);
  } else if (c.key === 'research') {
    add(new THREE.CylinderGeometry(0.7, 0.78, 0.9, 12), mat(0xefe9dc), 0, 0.45, -0.1, g);
    add(new THREE.SphereGeometry(0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(col), 0, 0.9, -0.1, g);
    const tel = add(new THREE.CylinderGeometry(0.08, 0.11, 0.9, 8), mat(0x3c4a52), 0.25, 1.35, 0.1, g); tel.rotation.z = -0.8;
    for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.34, 0.1, 0.24), mat([0xe2894f, 0x6b78e0, 0xde6b8e][k]), -0.95, 0.06 + k * 0.1, 0.55, g);
  } else if (c.key === 'campus') {
    add(new THREE.CylinderGeometry(0.03, 0.03, 2.0), mat(0x7a5a43), -0.6, 1.0, -0.5, g);
    flag(g, -0.6, 1.8, -0.5, c.color);
    chair(g, 0.4, 0.2, 0.3, col); chair(g, 0.9, 0.1, -0.1, new THREE.Color('#6fb1d6'));
    const net = add(new THREE.BoxGeometry(1.4, 0.35, 0.02), mat(0xffffff, { transparent: true, opacity: 0.65 }), -0.1, 0.62, 0.75, g);
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.8), mat(0x777777), -0.8, 0.4, 0.75, g);
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.8), mat(0x777777), 0.6, 0.4, 0.75, g);
    net.castShadow = false;
  }
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 3, 12), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 1.5; hit.userData.camp = i; g.add(hit);
  campMeshes.push({ group: g, ring: rg, hit });
}
const flags = [];
function flag(g, x, y, z, color) {
  const geo = new THREE.PlaneGeometry(0.6, 0.36, 8, 2);
  const f = add(geo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, flatShading: true }), x + 0.3, y, z, g);
  f.userData.base = geo.attributes.position.array.slice();
  flags.push(f);
}
const fires = [];
function fire(g, x, z) {
  for (let k = 0; k < 5; k++) {
    const log = add(new THREE.CylinderGeometry(0.05, 0.05, 0.5), mat(0x6b4630), x, 0.06, z, g);
    log.rotation.set(Math.PI / 2, 0, (k / 5) * Math.PI);
  }
  const fl = add(new THREE.ConeGeometry(0.18, 0.45, 6), mat(0xffa23a, { emissive: 0xff7a1a, emissiveIntensity: 1 }), x, 0.3, z, g);
  fl.castShadow = false;
  const light = new THREE.PointLight(0xff9a40, 1.2, 4);
  light.position.set(x, 0.6, z); g.add(light);
  fires.push({ fl, light });
}
function chair(g, x, z, r, col) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = r; g.add(c);
  add(new THREE.BoxGeometry(0.42, 0.05, 0.38), mat(col), 0, 0.28, 0, c);
  const back = add(new THREE.BoxGeometry(0.42, 0.4, 0.05), mat(col), 0, 0.48, -0.2, c); back.rotation.x = -0.25;
  [[-0.18, -0.15], [0.18, -0.15], [-0.18, 0.15], [0.18, 0.15]].forEach(([a, b]) => add(new THREE.CylinderGeometry(0.02, 0.02, 0.28), mat(0xdddddd), a, 0.14, b, c));
}
CAMPS.forEach(buildCamp);

// 灯塔（联系）
const lh = new THREE.Group(); lh.position.set(7.6, GROUND, -2.6); scene.add(lh);
[0xffffff, 0xd9485f, 0xffffff, 0xd9485f].forEach((c, k) => add(new THREE.CylinderGeometry(0.42 - k * 0.05, 0.47 - k * 0.05, 0.5), mat(c), 0, 0.25 + k * 0.5, 0, lh));
const lamp = add(new THREE.CylinderGeometry(0.26, 0.26, 0.35, 8), mat(0xfff3b0, { emissive: 0xffd76b, emissiveIntensity: 1.2 }), 0, 2.2, 0, lh);
add(new THREE.ConeGeometry(0.34, 0.35, 8), mat(0x2f3b45), 0, 2.55, 0, lh);
const lhHit = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.2, 8), new THREE.MeshBasicMaterial({ visible: false }));
lhHit.position.y = 1.5; lhHit.userData.camp = 'light'; lh.add(lhHit);

/* ================= 树、草、花 ================= */
const blockers = [
  ...CAMPS.map(c => [c.pos[0], c.pos[1], 2.6]),
  [0, 0, 1.7], [2.6, -1.6, 1.8], [7.6, -2.6, 1.2],
  [-2.6, -7.0, 2.3], [-0.4, -7.6, 1.9], [-4.6, -6.0, 1.7], [3.2, -7.2, 1.6]
];
const free = (x, z, pad = 0) => Math.hypot(x, z) < 9.0 && blockers.every(([bx, bz, br]) => Math.hypot(x - bx, z - bz) > br + pad);
// 小路
CAMPS.forEach(c => {
  const n = 7;
  for (let k = 1; k < n; k++) {
    const t = k / n, x = c.pos[0] * t * 0.82, z = c.pos[1] * t * 0.82;
    const st = new THREE.Mesh(new THREE.CircleGeometry(R(0.16, 0.24), 7), mat(0xdcccaa));
    st.rotation.x = -Math.PI / 2; st.position.set(x + R(-0.15, 0.15), GROUND + 0.012, z + R(-0.15, 0.15)); st.receiveShadow = true;
    scene.add(st);
    blockers.push([x, z, 0.55]);
  }
});
const greens = [0x5f9f68, 0x74b36a, 0x8cc36d, 0x4f8f62];
const trees = [];
let placed = 0, guard = 0;
while (placed < 62 && guard++ < 4000) {
  const a = R(0, Math.PI * 2), r = Math.sqrt(rnd()) * 8.9, x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (!free(x, z, 0)) continue;
  const s = R(0.75, 1.3), t = new THREE.Group();
  t.position.set(x, GROUND, z); t.scale.setScalar(s); t.rotation.y = R(0, 6);
  add(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 6), mat(0x7a5a43), 0, 0.25, 0, t);
  if (rnd() < 0.45) {
    const c = rnd() < 0.5 ? 0x3d7a58 : 0x47876a;
    add(new THREE.ConeGeometry(0.55, 1.0, 7), mat(c), 0, 0.85, 0, t);
    add(new THREE.ConeGeometry(0.4, 0.8, 7), mat(c), 0, 1.3, 0, t);
  } else {
    add(new THREE.IcosahedronGeometry(0.58, 0), mat(greens[Math.floor(rnd() * greens.length)]), 0, 0.95, 0, t);
  }
  scene.add(t); trees.push(t);
  blockers.push([x, z, 0.5 * s]);
  placed++;
}
function scatter(geo, color, count, y, sMin, sMax) {
  const im = new THREE.InstancedMesh(geo, mat(color), count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  let n = 0, g2 = 0;
  while (n < count && g2++ < count * 30) {
    const a = R(0, Math.PI * 2), r = Math.sqrt(rnd()) * 9.2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) > 9.3) continue;
    const s = R(sMin, sMax);
    q.setFromEuler(e.set(0, R(0, 6), 0));
    m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
    im.setMatrixAt(n++, m4);
  }
  im.count = n; im.receiveShadow = true;
  scene.add(im);
}
scatter(new THREE.ConeGeometry(0.06, 0.22, 4), 0x86b866, 380, GROUND + 0.1, 0.7, 1.4);
scatter(new THREE.IcosahedronGeometry(0.06, 0), 0xffd36b, 60, GROUND + 0.06, 0.8, 1.2);
scatter(new THREE.IcosahedronGeometry(0.06, 0), 0xff9fbf, 60, GROUND + 0.06, 0.8, 1.2);
scatter(new THREE.IcosahedronGeometry(0.06, 0), 0xffffff, 50, GROUND + 0.06, 0.8, 1.2);

// 云
const clouds = [];
for (let i = 0; i < 6; i++) {
  const cg = new THREE.Group();
  const n = 3 + Math.floor(R(0, 3));
  for (let k = 0; k < n; k++) add(new THREE.IcosahedronGeometry(R(0.45, 0.75), 0), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.55 }), k * 0.6 - n * 0.3, R(-0.1, 0.15), R(-0.25, 0.25), cg).castShadow = false;
  const a = (i / 6) * Math.PI * 2;
  cg.position.set(Math.cos(a) * R(31, 37), R(4.5, 7.5), Math.sin(a) * R(31, 37)); cg.scale.setScalar(R(1.6, 2.2));
  cg.userData = { a, r: Math.hypot(cg.position.x, cg.position.z), sp: R(0.01, 0.025) };
  scene.add(cg); clouds.push(cg);
}

/* ================= 小人 ================= */
const me = new THREE.Group();
const skin = mat(0xf2cba8), hair = mat(0x2a1f1b), coat = mat(0x3f6e54), pants = mat(0x2d3532);
const legL = add(new THREE.BoxGeometry(0.15, 0.42, 0.17), pants, -0.1, 0.21, 0, me);
const legR = add(new THREE.BoxGeometry(0.15, 0.42, 0.17), pants, 0.1, 0.21, 0, me);
add(new THREE.BoxGeometry(0.5, 0.55, 0.3), coat, 0, 0.68, 0, me);
const armL = add(new THREE.BoxGeometry(0.12, 0.46, 0.14), coat, -0.32, 0.7, 0, me);
const armR = add(new THREE.BoxGeometry(0.12, 0.46, 0.14), coat, 0.32, 0.7, 0, me);
[armL, armR, legL, legR].forEach(p => { p.geometry.translate(0, -0.2, 0); p.position.y += 0.2; });
add(new THREE.BoxGeometry(0.42, 0.42, 0.4), skin, 0, 1.17, 0, me);
add(new THREE.BoxGeometry(0.46, 0.14, 0.44), hair, 0, 1.42, 0, me);
add(new THREE.BoxGeometry(0.46, 0.62, 0.1), hair, 0, 1.08, -0.22, me);
add(new THREE.BoxGeometry(0.07, 0.07, 0.02), mat(0x222222), -0.1, 1.2, 0.205, me);
add(new THREE.BoxGeometry(0.07, 0.07, 0.02), mat(0x222222), 0.1, 1.2, 0.205, me);
add(new THREE.BoxGeometry(0.09, 0.04, 0.02), mat(0xe58a8a), 0, 1.06, 0.205, me);
me.position.set(0.4, GROUND, 0.6);
me.scale.setScalar(0.95);
scene.add(me);

/* ================= 标签、底栏、卡片 ================= */
const labels = document.getElementById('labels');
const pins = CAMPS.map((c, i) => {
  const b = document.createElement('button');
  b.className = 'pin'; b.style.color = c.color;
  b.innerHTML = `<span class="no" style="background:${c.color}">${c.no}</span><span class="tx" style="color:var(--ink)">${c.name}</span><i></i>`;
  b.setAttribute('aria-label', `${c.no} ${c.name}：${c.dock}`);
  b.addEventListener('click', () => goCamp(i));
  labels.appendChild(b);
  return b;
});
const lhPin = document.createElement('button');
lhPin.className = 'pin'; lhPin.style.color = CONTACT.color;
lhPin.innerHTML = `<span class="no" style="background:${CONTACT.color}">✉</span><span class="tx" style="color:var(--ink)">灯塔 · 联系我</span>`;
lhPin.addEventListener('click', () => goCamp('light'));
labels.appendChild(lhPin);
const meTag = document.createElement('div');
meTag.className = 'tag-me'; meTag.textContent = 'Claire';
labels.appendChild(meTag);

const dock = document.getElementById('dock');
CAMPS.forEach((c, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<i style="background:${c.color}"></i><small>${c.no}</small>${c.name}<small>${c.dock}</small>`;
  b.addEventListener('click', () => goCamp(i));
  dock.appendChild(b);
});

const panel = document.getElementById('panel');
const body = document.getElementById('panelBody');
const hero = document.getElementById('hero');
let current = null;
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
function openPanel(idx) {
  const c = idx === 'light' ? CONTACT : CAMPS[idx];
  current = idx;
  body.innerHTML = `<p class="ph-k" style="color:${c.color}"><i style="background:${c.color}"></i>${c.no} · ${c.en}</p>
    <h2>${c.name}</h2><p class="ph-s">${esc(c.summary)}</p>` +
    c.items.map(it => `<article class="card" style="--c:${c.color}">
      <div class="meta"><span class="tg">${esc(it.tag)}</span><span>${esc(it.time || '')}</span></div>
      <h3>${esc(it.title)}</h3><p class="org">${esc(it.org)}</p>
      <ul>${it.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      ${it.mets ? `<div class="mets">${it.mets.map(m => `<span>${esc(m)}</span>`).join('')}</div>` : ''}
      ${it.link ? `<a class="lk" href="${it.link[0]}"${it.link[0].startsWith('donghang') ? ' target="_blank" rel="noopener"' : ''}>${esc(it.link[1])}${it.link[1].includes('↗') ? '' : ' →'}</a>` : ''}
    </article>`).join('');
  body.scrollTop = 0;
  panel.hidden = false;
  document.body.classList.add('panel-open');
  hero.classList.add('away');
  pins.forEach((p, i) => p.classList.toggle('on', i === idx));
  [...dock.children].forEach((b, i) => b.classList.toggle('on', i === idx));
  document.getElementById('prevCamp').style.visibility = idx === 'light' ? 'hidden' : '';
}
function closePanel() {
  panel.hidden = true; current = null;
  document.body.classList.remove('panel-open');
  hero.classList.remove('away');
  pins.forEach(p => p.classList.remove('on'));
  [...dock.children].forEach(b => b.classList.remove('on'));
}
document.getElementById('closePanel').addEventListener('click', closePanel);
document.getElementById('nextCamp').addEventListener('click', () => goCamp(current === 'light' ? 0 : (current + 1) % CAMPS.length));
document.getElementById('prevCamp').addEventListener('click', () => goCamp((current - 1 + CAMPS.length) % CAMPS.length));
document.getElementById('goBtn').addEventListener('click', () => goCamp(0));
const helpBtn = document.getElementById('helpBtn'), helpBox = document.getElementById('helpBox');
helpBtn.addEventListener('click', () => { helpBox.hidden = !helpBox.hidden; helpBtn.setAttribute('aria-expanded', String(!helpBox.hidden)); });

/* ================= 走动 ================= */
let target = null, arriveCb = null;
const focus = new THREE.Vector3(0, 0.6, 0);
function campPoint(idx) {
  const p = idx === 'light' ? [7.6, -2.6] : CAMPS[idx].pos;
  const v = new THREE.Vector3(p[0], 0, p[1]);
  const back = v.clone().setLength(Math.max(v.length() - 1.9, 0));
  return { stand: new THREE.Vector3(back.x, GROUND, back.z), center: new THREE.Vector3(p[0], 0.6, p[1]) };
}
function goCamp(idx) {
  controls.autoRotate = false;
  helpBox.hidden = true;
  const { stand, center } = campPoint(idx);
  target = stand;
  arriveCb = null;
  openPanel(idx);
  focus.copy(center).multiplyScalar(0.45); focus.y = 0.6;
  lastAuto = idx;
}
let lastAuto = null;

const keys = new Set();
addEventListener('keydown', e => {
  if (e.key === 'Escape') { closePanel(); helpBox.hidden = true; return; }
  if (e.target.closest && e.target.closest('input,textarea')) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
    keys.add(k); controls.autoRotate = false; target = null;
    if (k.startsWith('arrow')) e.preventDefault();
  }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downAt = null;
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects([...campMeshes.map(c => c.hit), lhHit], false);
  if (hits.length) { goCamp(hits[0].object.userData.camp); return; }
  const g = ray.intersectObject(grass, false)[0];
  if (g) {
    const p = g.point.clone(); p.y = GROUND;
    if (Math.hypot(p.x, p.z) > 8.8) p.setLength(8.8).setY(GROUND);
    target = p; arriveCb = null; controls.autoRotate = false;
  }
});

/* ================= 主题 ================= */
const THEMES = {
  day: { hemiS: 0xeafcff, hemiG: 0x6d8c5a, hemiI: 1.15, sun: 0xfff1d6, sunI: 1.7, water: 0x84d2d4, waterE: 0x000000, fog: 0xcdeeea, grass: 0xa6cd7c, lamp: 0.6 },
  dusk: { hemiS: 0xffe6d6, hemiG: 0x9a7fa0, hemiI: 1.35, sun: 0xffb27a, sunI: 1.6, water: 0xd7bce9, waterE: 0x4a2f55, fog: 0xf6d6d0, grass: 0xb9cc7c, lamp: 2.4 }
};
function setTime(t) {
  const th = THEMES[t];
  document.body.classList.toggle('dusk', t === 'dusk');
  document.body.classList.toggle('day', t === 'day');
  hemi.color.set(th.hemiS); hemi.groundColor.set(th.hemiG); hemi.intensity = th.hemiI;
  sun.color.set(th.sun); sun.intensity = th.sunI;
  sun.position.set(t === 'dusk' ? -14 : 12, t === 'dusk' ? 13 : 20, t === 'dusk' ? 10 : 8);
  waterMat.color.set(th.water); waterMat.emissive.set(th.waterE); scene.fog.color.set(th.fog); grass.material.color.set(th.grass);
  lamp.material.emissiveIntensity = th.lamp;
  document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.time === t));
  try { localStorage.setItem('island-time', t); } catch (e) {}
}
document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => setTime(b.dataset.time)));
try { const t = localStorage.getItem('island-time'); if (t && THEMES[t]) setTime(t); } catch (e) {}

/* ================= 渲染循环 ================= */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < 760 ? 46 : 34;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
if (innerWidth < 760) camera.position.set(25, 23, 30);

const clock = new THREE.Clock();
const tmp = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
let walkT = 0, first = true, insideCamp = null;
function placeLabel(el, v, dy) {
  tmp.copy(v); tmp.y += dy; tmp.project(camera);
  const hidden = tmp.z > 1;
  const x = (tmp.x * 0.5 + 0.5) * innerWidth, y = (-tmp.y * 0.5 + 0.5) * innerHeight;
  el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
  el.classList.toggle('hide', hidden);
}
let offX = 0, offY = 0;
function viewOffset() {
  const w = innerWidth, h = innerHeight, open = !panel.hidden;
  let tx = 0, ty = 0;
  if (w >= 760) tx = open ? w * (w >= 1180 ? 0.15 : 0.2) : -w * (w >= 1180 ? 0.12 : 0.1);
  else ty = open ? h * 0.27 : -h * 0.1;
  offX += (tx - offX) * 0.08; offY += (ty - offY) * 0.08;
  camera.setViewOffset(w, h, offX, offY, w, h);
}
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;

  // 水
  const pos = waterGeo.attributes.position, arr = pos.array, amp = reduce ? 0.02 : 0.09;
  for (let i = 0; i < arr.length; i += 3) {
    const x = waterBase[i], z = waterBase[i + 2];
    arr[i + 1] = Math.sin(x * 0.35 + t * 0.9) * amp + Math.cos(z * 0.3 + t * 0.7) * amp;
  }
  pos.needsUpdate = true;
  foam.scale.setScalar(1 + Math.sin(t * 1.2) * 0.015);
  foam.material.opacity = 0.28 + Math.sin(t * 1.2) * 0.08;

  flags.forEach(f => {
    const p = f.geometry.attributes.position, b = f.userData.base;
    for (let i = 0; i < p.array.length; i += 3) p.array[i + 2] = Math.sin(b[i] * 6 + t * 4) * 0.05 * (b[i] + 0.3);
    p.needsUpdate = true;
  });
  fires.forEach(({ fl, light }) => { const s = 1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 13) * 0.05; fl.scale.set(s, s * 1.1, s); light.intensity = 1.1 + Math.sin(t * 11) * 0.25; });
  campMeshes.forEach((c, i) => { c.ring.material.opacity = 0.45 + Math.sin(t * 2 + i) * 0.25; c.ring.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.03); });
  clouds.forEach(c => { c.userData.a += c.userData.sp * dt; c.position.x = Math.cos(c.userData.a) * c.userData.r; c.position.z = Math.sin(c.userData.a) * c.userData.r; });

  // 小人
  let moving = false;
  if (keys.size) {
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    right.crossVectors(fwd, camera.up).normalize();
    const mv = new THREE.Vector3();
    if (keys.has('w') || keys.has('arrowup')) mv.add(fwd);
    if (keys.has('s') || keys.has('arrowdown')) mv.sub(fwd);
    if (keys.has('d') || keys.has('arrowright')) mv.add(right);
    if (keys.has('a') || keys.has('arrowleft')) mv.sub(right);
    if (mv.lengthSq() > 0) {
      mv.normalize().multiplyScalar(3.4 * dt);
      me.position.add(mv);
      const r = Math.hypot(me.position.x, me.position.z);
      if (r > 8.8) { me.position.x *= 8.8 / r; me.position.z *= 8.8 / r; }
      me.rotation.y = Math.atan2(mv.x, mv.z);
      moving = true;
      focus.set(me.position.x * 0.45, 0.6, me.position.z * 0.45);
    }
  } else if (target) {
    tmp.subVectors(target, me.position); tmp.y = 0;
    const d = tmp.length();
    if (d < 0.06) {
      target = null;
      if (arriveCb) { const cb = arriveCb; arriveCb = null; cb(); }
    } else {
      tmp.normalize();
      me.position.addScaledVector(tmp, Math.min(d, 3.6 * dt));
      me.rotation.y = Math.atan2(tmp.x, tmp.z);
      moving = true;
    }
  }
  // 走进营地自动翻开
  let near = null;
  CAMPS.forEach((c, i) => { if (Math.hypot(me.position.x - c.pos[0], me.position.z - c.pos[1]) < 2.2) near = i; });
  if (Math.hypot(me.position.x - 7.6, me.position.z + 2.6) < 1.6) near = 'light';
  if (near !== insideCamp) {
    insideCamp = near;
    if (near !== null && keys.size && current !== near) openPanel(near);
  }

  walkT += moving ? dt * 10 : 0;
  const sw = moving ? Math.sin(walkT) * 0.6 : 0;
  legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw * 0.8; armR.rotation.x = sw * 0.8;
  me.position.y = GROUND + (moving ? Math.abs(Math.sin(walkT)) * 0.06 : Math.sin(t * 2) * 0.015);

  controls.target.lerp(focus, 0.04);
  viewOffset();
  controls.update();
  renderer.render(scene, camera);

  CAMPS.forEach((c, i) => placeLabel(pins[i], campMeshes[i].group.position, 2.75));
  placeLabel(lhPin, lh.position, 3.3);
  placeLabel(meTag, me.position, 1.85);

  if (first) { first = false; setTimeout(() => document.getElementById('loading').classList.add('done'), 150); }
  requestAnimationFrame(tick);
}
tick();
