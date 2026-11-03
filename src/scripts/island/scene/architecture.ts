import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import type { SceneQuality, ScreenAsset } from "../../../lib/island/types";
import { SceneResources } from "./resources";
import { construction, roundedRect } from "./construction";
import type { IslandMaterials } from "./materials";

type Point = readonly [number, number, number];
function footprint(points: readonly (readonly [number, number])[]) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], -points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], -points[i][1]);
  s.closePath();
  return s;
}
function portal(w: number, h: number, r: number, t: number) {
  const s = new THREE.Shape(),
    l = -w / 2,
    right = w / 2;
  s.moveTo(l, 0);
  s.lineTo(l, h - r);
  s.quadraticCurveTo(l, h, l + r, h);
  s.lineTo(right - r, h);
  s.quadraticCurveTo(right, h, right, h - r);
  s.lineTo(right, 0);
  s.lineTo(right - t, 0);
  s.lineTo(right - t, h - r);
  s.quadraticCurveTo(right - t, h - t, right - r, h - t);
  s.lineTo(l + r, h - t);
  s.quadraticCurveTo(l + t, h - t, l + t, h - r);
  s.lineTo(l + t, 0);
  s.closePath();
  return s;
}

export function createArchitecture(
  resources: SceneResources,
  quality: SceneQuality,
  m: IslandMaterials,
  screens: readonly ScreenAsset[],
  invalidate: () => void,
) {
  const b = construction(resources);
  const root = new THREE.Group();
  const upper = footprint([
    [-8.3, -2.6],
    [-7.8, -3.5],
    [-3.5, -3.8],
    [1, -3.1],
    [3.9, -4],
    [7.8, -3.7],
    [8.4, -2.5],
    [8.7, -0.7],
    [7.4, 1.1],
    [4.8, 1.8],
    [1.8, 2.0],
    [-2.5, 2.0],
    [-6.4, 1.8],
    [-8.5, 0.8],
  ]);
  const lower = footprint([
    [-5.3, 1.4],
    [-2.3, 0.5],
    [2.4, 0.7],
    [6.6, 0.4],
    [8.8, 1.7],
    [9.1, 3.4],
    [8.3, 4.6],
    [5.6, 5.25],
    [1.8, 5.7],
    [-2.3, 5.3],
    [-5.2, 4.3],
    [-5.8, 2.9],
  ]);
  const land = new THREE.Group();
  root.add(land);
  function cliff(shape: THREE.Shape, top: number, bottom: number) {
    const perimeter = shape.getSpacedPoints(quality === "high" ? 220 : 140);
    const n = perimeter.length - 1;
    const positions: number[] = [],
      colors: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    const rows = 14;
    for (let row = 0; row <= rows; row++)
      for (let i = 0; i <= n; i++) {
        const a = perimeter[i % n],
          phase = i * 0.49;
        const taper = 1 - (1 - row / rows) * 0.14;
        const noise =
          (Math.sin(phase * 0.65) * 0.22 +
            Math.cos(phase * 2.1 + row * 0.08) * 0.13 +
            Math.sin(phase * 4.7) * 0.06) *
          (row === rows ? 0.08 : 1);
        positions.push(
          a.x * taper + noise,
          bottom +
            ((top - bottom) * row) / rows +
            Math.sin(phase) * 0.08 * (row === rows ? 0 : 1),
          -a.y * taper + noise,
        );
        const tone =
          0.48 + (row / rows) * 0.45 + Math.sin(phase + row * 0.4) * 0.12;
        colors.push(tone, tone * 0.97, tone * 0.91);
        uv.push((i / n) * 11, (row / rows) * 2);
        if (row < rows && i < n) {
          const v = row * (n + 1) + i;
          indices.push(v, v + n + 1, v + 1, v + 1, v + n + 1, v + n + 2);
        }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    b.mesh(land, resources.own(g), m.rock);
  }
  cliff(upper, 2.87, -0.25);
  cliff(lower, 0.99, -0.45);
  b.slab(land, upper, 0.25, 2.8, m.stone);
  b.slab(land, upper, 0.055, 3.05, m.floor);
  b.slab(land, lower, 0.21, 0.93, m.stone);
  b.slab(land, lower, 0.045, 1.14, m.floor);
  const naturalStone = resources.own(m.rock.clone());
  naturalStone.vertexColors = false;
  // Mineral boulders break the engineered perimeter and meet the water.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2,
      rx = 8.5,
      rz = 4.6;
    const g = new THREE.IcosahedronGeometry(0.58, 2);
    const p = g.getAttribute("position");
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j),
        y = p.getY(j),
        z = p.getZ(j);
      const d = 1 + 0.18 * Math.sin(x * 12 + y * 9 + z * 5 + i);
      p.setXYZ(j, x * d, y * d, z * d);
    }
    const smooth = mergeVertices(g);
    g.dispose();
    smooth.computeVertexNormals();
    const rock = b.mesh(land, resources.own(smooth), naturalStone, [
      Math.cos(a) * rx,
      0.1 + Math.sin(i * 2) * 0.1,
      Math.sin(a) * rz + 0.4,
    ]);
    rock.scale.set(0.6 + (i % 4) * 0.23, 0.5 + (i % 3) * 0.15, 0.75);
    rock.rotation.set(i * 0.7, i * 1.1, 0);
  }
  for (const [x, y, z, sx, sy, sz] of [
    [-7.8, 1.1, 1.4, 0.7, 1.5, 0.7],
    [-7.1, 0.6, 2, 0.85, 1, 0.8],
    [-5.2, 0.5, 4.1, 0.7, 0.9, 0.7],
    [-2.7, 0.2, 5.1, 1.1, 0.9, 0.8],
    [1.9, 0.15, 5.5, 0.8, 0.6, 0.7],
    [5.3, 0.15, 5, 0.9, 0.7, 0.6],
    [8.2, 0.8, 1.3, 0.65, 1.2, 0.65],
  ]) {
    const g = new THREE.IcosahedronGeometry(1, 3),
      p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const a = p.getX(i),
        b = p.getY(i),
        c = p.getZ(i),
        d =
          1 +
          0.14 * Math.sin(a * 9 + b * 7 + c * 11) +
          0.09 * Math.cos(a * 14 - c * 6);
      p.setXYZ(i, a * d, b * d, c * d);
    }
    const smooth = mergeVertices(g);
    g.dispose();
    smooth.computeVertexNormals();
    const outcrop = b.mesh(land, resources.own(smooth), naturalStone, [
      x,
      y,
      z,
    ]);
    outcrop.scale.set(sx, sy, sz);
    outcrop.rotation.y = x;
  }
  // Fine joints reinforce real slab thickness without a repeating block grid.
  const joint = resources.own(
    new THREE.MeshStandardMaterial({ color: 0x9c8d76, roughness: 0.9 }),
  );
  for (let x = -7.8; x < 1.2; x += 1.15)
    b.box(land, [0.013, 0.2, 0.02], [x, 2.94, 1.86], joint);
  for (let x = -4.5; x < 7.7; x += 1.05)
    b.box(
      land,
      [0.012, 0.17, 0.02],
      [x, 1.04, 5.16 - Math.abs(x - 1.8) * 0.1],
      joint,
    );
  const studioTerrace = footprint([
    [2.8, -3.8],
    [7.85, -3.85],
    [8.45, -2.9],
    [8.55, -1.0],
    [7.9, -0.55],
    [3.0, -0.5],
  ]);
  cliff(studioTerrace, 5.33, 2.85);
  b.slab(land, studioTerrace, 0.16, 5.3, m.stone);
  b.slab(land, studioTerrace, 0.04, 5.46, m.floor);
  b.batch(land);

  function destination(id: string, p: Point) {
    const g = new THREE.Group();
    g.userData.destination = id;
    g.position.set(...p);
    root.add(g);
    return g;
  }
  const gallery = destination("work", [-3.2, 3.1, -0.25]);
  b.extrude(gallery, portal(9.6, 3.65, 1.3, 0.32), 2.45, m.stone, [0, 0, -2.3]);
  b.box(gallery, [8.94, 3.23, 0.12], [0.08, 1.65, -2.25], m.oak);
  // Glazing behind the exhibition creates depth, mullions and warm reflections.
  for (let i = 0; i < 7; i++)
    b.box(
      gallery,
      [0.055, 2.96, 0.08],
      [-4.1 + i * 1.36, 1.54, -2.13],
      m.metal,
    );
  b.box(gallery, [8.4, 0.06, 0.08], [0, 2.95, -2.1], m.metal);
  const order = [
    screens[0],
    screens[2] ?? screens[1],
    screens[1] ?? screens[2],
  ];
  for (let i = 0; i < 3; i++) {
    const x = -3.02 + i * 3.02;
    b.box(gallery, [2.83, 2.76, 0.13], [x, 1.69, -1.27], m.metal, 0.035);
    b.box(gallery, [2.66, 2.58, 0.04], [x, 1.69, -1.185], m.white);
    for (const dx of [-1.14, 1.14])
      b.box(gallery, [0.055, 0.39, 0.08], [x + dx, 0.22, -1.25], m.metal);
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 760;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#eee8db";
    ctx.fillRect(0, 0, 768, 760);
    const texture = resources.own(new THREE.CanvasTexture(c));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const mat = resources.own(
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    const screen = b.mesh(
      gallery,
      resources.own(new THREE.PlaneGeometry(2.64, 2.58)),
      mat,
      [x, 1.69, -1.155],
    );
    screen.castShadow = false;
    const asset = order[i];
    if (!asset) continue;
    const img = new Image();
    img.decoding = "async";
    resources.onDispose(() => {
      img.onload = null;
      img.onerror = null;
      img.removeAttribute("src");
    });
    img.onload = () => {
      if (resources.disposed) return;
      ctx.fillStyle = i === 1 ? "#30241d" : "#f4eee4";
      ctx.fillRect(0, 0, 768, 760);
      ctx.fillStyle = i === 1 ? "#fcf7eb" : "#181a18";
      ctx.font = "500 48px Georgia, serif";
      ctx.fillText(asset.label, 32, 65);
      ctx.drawImage(
        img,
        0,
        100,
        768,
        Math.round((768 * img.naturalHeight) / img.naturalWidth),
      );
      ctx.fillStyle = i === 1 ? "#fcf7eb" : "#181a18";
      ctx.font = "22px Arial, sans-serif";
      ctx.fillText("SELECTED DIGITAL EXPERIENCE", 32, 710);
      texture.needsUpdate = true;
      invalidate();
      img.onload = null;
    };
    img.src = asset.src;
  }
  // Ceiling rail and seven individually articulated spotlights.
  b.box(gallery, [7.65, 0.055, 0.065], [0.05, 3.22, -0.35], m.metal);
  for (let i = 0; i < 7; i++) {
    const x = -3.6 + i * 1.22;
    b.cylinder(gallery, 0.025, 0.16, [x, 3.12, -0.35], m.metal);
    const lamp = b.cylinder(gallery, 0.07, 0.21, [x, 3.0, -0.3], m.dark);
    lamp.rotation.x = -0.45;
    const lens = b.cylinder(gallery, 0.054, 0.014, [x, 2.9, -0.25], m.glow);
    lens.rotation.x = -0.45;
  }
  b.cylinder(gallery, 0.65, 0.4, [-1.6, 0.22, 1.04], m.stone);
  const chrome = resources.own(
    new THREE.MeshStandardMaterial({
      color: 0xe5dece,
      metalness: 0.94,
      roughness: 0.08,
      envMapIntensity: 3,
    }),
  );
  b.cylinder(gallery, 0.45, 0.41, [0.25, 0.23, 0.95], chrome);
  b.extrude(
    gallery,
    portal(1.35, 0.62, 0.18, 0.19),
    0.55,
    m.blue,
    [2.4, 0.015, 0.65],
  );
  // Terracotta planter with a physical rim.
  const pot = resources.own(
    new THREE.MeshStandardMaterial({
      color: 0xbca181,
      roughness: 0.9,
      map: m.stone.map,
    }),
  );
  b.cylinder(gallery, 0.33, 0.57, [-3.92, 0.29, 0.56], pot, 0.26);
  b.cylinder(gallery, 0.29, 0.035, [-3.92, 0.585, 0.56], m.dark);

  const studio = destination("about", [5.85, 5.5, -2.3]);
  const plan = roundedRect(-2.45, -1.65, 4.9, 3.2, 0.72);
  b.slab(studio, plan, 0.2, -0.2, m.floor);
  b.slab(studio, plan, 0.35, 2.96, m.stone);
  b.box(studio, [4.25, 2.9, 0.18], [0, 1.44, -1.4], m.plaster);
  b.box(studio, [0.23, 2.98, 2.7], [-2.34, 1.48, -0.1], m.stone);
  // Curved electric blue end wall, with a gently rounded exterior corner.
  const blueWall = roundedRect(1.25, -1.42, 1.17, 2.98, 0.55);
  b.slab(studio, blueWall, 2.98, 0, m.blue);
  b.extrude(studio, portal(4.8, 3.27, 0.8, 0.23), 0.24, m.stone, [0, 0, 1.35]);
  b.extrude(
    studio,
    portal(3.75, 2.88, 0.68, 0.065),
    0.055,
    m.metal,
    [-0.42, 0.07, 1.31],
    0.005,
  );
  for (const x of [-1.25, -0.28, 0.7])
    b.box(studio, [0.045, 2.69, 0.055], [x, 1.42, 1.34], m.metal);
  b.box(studio, [3.6, 0.045, 0.055], [-0.44, 2.43, 1.34], m.metal);
  b.mesh(
    studio,
    resources.own(new THREE.PlaneGeometry(3.6, 2.5)),
    m.glass,
    [-0.44, 1.35, 1.32],
  );
  // Interior: oak desk, task chair, workstation, wall shelving, books and prints.
  b.box(studio, [2.7, 0.12, 0.8], [-0.2, 1.03, 0.25], m.oak, 0.025);
  for (const x of [-1.36, 1])
    for (const z of [-0.04, 0.52])
      b.box(studio, [0.055, 0.98, 0.055], [x, 0.49, z], m.metal);
  b.box(studio, [0.77, 0.49, 0.06], [-0.1, 1.48, 0.08], m.dark, 0.025);
  b.box(studio, [0.69, 0.4, 0.01], [-0.1, 1.48, 0.12], m.blue);
  b.box(studio, [0.035, 0.2, 0.035], [-0.1, 1.13, 0.07], m.metal);
  b.box(studio, [0.3, 0.025, 0.2], [-0.1, 1.05, 0.11], m.metal);
  b.box(studio, [0.62, 0.025, 0.23], [-0.1, 1.107, 0.54], m.dark, 0.015);
  b.box(studio, [0.56, 0.12, 0.55], [-0.82, 0.59, 0.87], m.dark, 0.065);
  b.box(studio, [0.57, 0.62, 0.1], [-0.82, 0.96, 1.11], m.dark, 0.06);
  b.cylinder(studio, 0.042, 0.5, [-0.82, 0.28, 0.87], m.metal);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 0.4;
    b.line(
      studio,
      [
        [-0.82, 0.08, 0.87],
        [-0.82 + Math.cos(a) * 0.38, 0.06, 0.87 + Math.sin(a) * 0.38],
      ],
      0.025,
      m.metal,
    );
  }
  for (const y of [1.45, 2.1]) {
    b.box(studio, [1.5, 0.06, 0.27], [-1.13, y, -1.23], m.oak);
    for (let j = 0; j < 7; j++)
      b.box(
        studio,
        [0.095, 0.18 + (j % 3) * 0.05, 0.16],
        [-1.7 + j * 0.16, y + 0.14, -1.21],
        j % 2 ? m.white : m.blue,
      );
  }
  for (let i = 0; i < 6; i++) {
    b.box(
      studio,
      [0.3, 0.38, 0.03],
      [0.2 + (i % 3) * 0.37, 1.6 + Math.floor(i / 3) * 0.46, -1.285],
      i % 2 ? m.oak : m.white,
    );
  }
  b.line(
    studio,
    [
      [-1.5, 2.95, 0.6],
      [-1.5, 2.05, 0.6],
    ],
    0.012,
    m.metal,
  );
  b.mesh(
    studio,
    resources.own(new THREE.SphereGeometry(0.16, 20, 12)),
    m.glow,
    [-1.5, 2.0, 0.6],
  );
  b.box(studio, [2.75, 0.018, 0.035], [-0.3, 2.91, -0.7], m.glow);
  const warm = new THREE.PointLight(0xffd29a, 5, 6, 2);
  warm.position.set(-1, 2, 0.6);
  studio.add(warm);
  // A companion rounded side room anchors the studio into the terrace.
  b.extrude(
    studio,
    portal(1.65, 2.4, 0.6, 0.18),
    1.4,
    m.stone,
    [-3.25, 0, -0.6],
  );
  b.box(studio, [0.04, 2, 0.04], [-3.25, 1.1, 0.82], m.metal);
  b.mesh(
    studio,
    resources.own(new THREE.PlaneGeometry(1.25, 1.9)),
    m.glass,
    [-3.25, 1.05, 0.82],
  );
  // Original solid letter sculpture: bevelled K, B and period, not a billboard.
  const k = new THREE.Shape();
  const kp = [
    [0, 0],
    [0, 1.15],
    [0.23, 1.15],
    [0.23, 0.67],
    [0.63, 1.15],
    [0.94, 1.15],
    [0.47, 0.59],
    [0.98, 0],
    [0.65, 0],
    [0.23, 0.49],
    [0.23, 0],
  ];
  kp.forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
  k.closePath();
  b.extrude(studio, k, 0.22, m.blue, [-0.78, 3.31, -0.1], 0.025);
  const letterB = new THREE.Shape();
  letterB.moveTo(0, 0);
  letterB.lineTo(0, 1.15);
  letterB.lineTo(0.49, 1.15);
  letterB.bezierCurveTo(0.95, 1.15, 0.99, 0.64, 0.64, 0.59);
  letterB.bezierCurveTo(1.05, 0.53, 1.01, 0, 0.5, 0);
  letterB.closePath();
  for (const yy of [0.19, 0.69]) {
    const hole = roundedRect(0.24, yy, 0.34, 0.25, 0.09);
    letterB.holes.push(new THREE.Path(hole.getPoints(12)));
  }
  b.extrude(studio, letterB, 0.22, m.blue, [0.25, 3.31, -0.1], 0.025);
  b.box(studio, [0.22, 0.22, 0.24], [1.4, 3.42, 0.03], m.blue, 0.065);

  const circulation = new THREE.Group();
  root.add(circulation);
  // Two continuous flights connect the high studio and broad lower promenade.
  for (let i = 0; i < 17; i++) {
    const y = 1.15 + (i + 1) * (4.35 / 17),
      z = 3.7 - i * 0.255;
    const x = 3.7 + i * 0.15625;
    b.box(
      circulation,
      [2.05, 0.26, 0.32],
      [x, y - 0.13, z],
      m.stone,
      0.018,
    ).rotation.y = -0.55;
    b.box(
      circulation,
      [2.08, 0.035, 0.34],
      [x, y + 0.006, z],
      m.floor,
      0.008,
    ).rotation.y = -0.55;
  }
  b.box(circulation, [2.15, 0.18, 0.7], [6.2, 5.41, -0.74], m.floor);
  for (let i = 0; i < 7; i++)
    b.box(
      circulation,
      [2.3, 0.17, 0.29],
      [1.95, 1.16 + (i + 1) * 0.17, 4.3 - i * 0.29],
      m.stone,
      0.015,
    );

  const timeline = destination("experience", [-1.1, 1.18, 3.16]);
  const wall = new THREE.Shape();
  wall.moveTo(-3.2, 0);
  wall.lineTo(-3.2, 0.95);
  wall.bezierCurveTo(-3.18, 1.5, -2.7, 1.53, -1.8, 1.63);
  wall.bezierCurveTo(-0.5, 1.75, 0.8, 2.62, 1.8, 2.58);
  wall.quadraticCurveTo(3.1, 2.6, 3.1, 1.9);
  wall.lineTo(3.1, 0);
  wall.closePath();
  const wallMesh = b.extrude(
    timeline,
    wall,
    0.22,
    m.stone,
    [0, 0, -0.12],
    0.055,
  );
  const pos = wallMesh.geometry.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) + 0.035 * x * x);
  }
  wallMesh.geometry.computeVertexNormals();
  const timelineCopy = [
    ["2019–2022", "Tynass IT", "Developer"],
    ["2023", "SolvR", "Developer"],
    ["2023–2024", "Freelance", "Developer"],
    ["2024–now", "nBold", "Full-Stack & AI"],
  ];
  for (let i = 0; i < 4; i++) {
    const x = -2.55 + i * 1.47,
      y = 0.3 + i * 0.25;
    b.box(timeline, [1.46, y, 0.55], [x, y / 2, 0.68], m.stone, 0.018);
    b.box(timeline, [1.48, 0.035, 0.58], [x, y + 0.01, 0.68], m.floor, 0.008);
    b.mesh(
      timeline,
      resources.own(new THREE.SphereGeometry(0.085, 16, 10)),
      m.glow,
      [x - 0.4, y + 0.12, 0.65],
    );
    b.text(
      timeline,
      timelineCopy[i],
      1.38,
      0.82,
      [x + 0.04, y + 0.7, 0.98 + 0.035 * x * x],
      "#25241d",
      105,
    );
  }

  const contactPlatform = footprint([
    [5.8, 0.65],
    [8.1, 0.4],
    [8.8, 1.3],
    [8.85, 2.65],
    [8.25, 2.9],
    [5.8, 3.15],
  ]);
  b.slab(circulation, contactPlatform, 0.94, 1.14, m.stone);
  b.slab(circulation, contactPlatform, 0.035, 2.08, m.floor);
  const contact = destination("contact", [7.15, 2.12, 1.05]);
  b.extrude(
    contact,
    portal(2.12, 2.62, 0.64, 0.23),
    1.65,
    m.yellow,
    [0, 0, -0.8],
    0.055,
  );
  b.box(contact, [1.66, 2.12, 0.13], [0, 1.1, -0.72], m.yellow, 0.12);
  b.box(contact, [1.72, 0.12, 0.8], [0, 0.86, 0.1], m.oak, 0.035);
  b.box(contact, [0.65, 0.035, 0.43], [0.16, 0.94, 0.24], m.metal, 0.018);
  const laptop = b.box(
    contact,
    [0.64, 0.43, 0.035],
    [0.16, 1.16, 0.03],
    m.dark,
    0.02,
  );
  laptop.rotation.x = -0.16;
  b.box(contact, [0.57, 0.35, 0.012], [0.16, 1.17, 0.056], m.metal, 0.01);
  b.cylinder(contact, 0.24, 0.45, [-0.12, 0.23, 0.5], m.stone);
  b.line(
    contact,
    [
      [0, 2.35, 0.2],
      [0, 1.96, 0.2],
    ],
    0.01,
    m.metal,
  );
  b.mesh(
    contact,
    resources.own(
      new THREE.SphereGeometry(0.21, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    ),
    m.white,
    [0, 1.9, 0.2],
  );
  b.cylinder(contact, 0.19, 0.02, [0, 1.9, 0.2], m.glow);
  const contactLight = new THREE.PointLight(0xffc679, 2.5, 3.5, 2);
  contactLight.position.set(0, 1.65, 0.35);
  contact.add(contactLight);
  const sign = b.text(
    contact,
    ["Contact", "↗"],
    1.45,
    1.2,
    [1.17, 1.56, 0],
    "#17170c",
    160,
  );
  sign.rotation.y = Math.PI / 2;
  // Curved bronze handrail around the small seaside contact terrace.
  const railPoints: Point[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = -0.13 + (i / 24) * 1.58;
    const x = 6.45 + Math.cos(a) * 2.2,
      z = 0.65 + Math.sin(a) * 2.1;
    railPoints.push([x, 2.94, z]);
    if (i % 2 === 0)
      b.cylinder(circulation, 0.022, 0.86, [x, 2.51, z], m.bronze);
  }
  b.line(circulation, railPoints, 0.032, m.bronze);
  b.cylinder(circulation, 0.07, 0.7, [3.2, 1.54, 4.93], m.metal);
  b.cylinder(circulation, 0.075, 0.13, [3.2, 1.91, 4.93], m.glow);
  const grout = resources.own(
    new THREE.MeshStandardMaterial({ color: 0xbca98c, roughness: 0.8 }),
  );
  for (let z = 0.25; z < 1.7; z += 0.7)
    b.box(gallery, [8.8, 0.006, 0.009], [0, 0.009, z], grout);
  for (let x = -4; x < 4; x += 1.2)
    b.box(gallery, [0.008, 0.006, 1.7], [x, 0.01, 0.7], grout);
  for (let x = -3.5; x < 5.2; x += 1.1)
    b.box(circulation, [0.008, 0.008, 0.62], [x, 1.19, 4.7], grout);
  // Furnished studio: wall pinboard, storage, warm timber and personal objects.
  b.box(studio, [1.28, 0.77, 0.055], [0.43, 1.94, -1.24], m.oak, 0.02);
  for (let i = 0; i < 7; i++) {
    b.box(
      studio,
      [0.22, 0.25, 0.016],
      [0.02 + (i % 4) * 0.25, 1.8 + Math.floor(i / 4) * 0.3, -1.2],
      i % 3 ? m.white : m.blue,
    );
  }
  b.box(studio, [0.76, 0.83, 0.55], [0.86, 0.42, -0.96], m.oak, 0.045);
  for (const y of [0.25, 0.54]) {
    b.box(studio, [0.67, 0.02, 0.012], [0.86, y, -0.676], m.bronze);
    b.box(studio, [0.13, 0.025, 0.035], [0.86, y + 0.12, -0.65], m.metal);
  }
  b.cylinder(studio, 0.18, 0.39, [-1.77, 0.2, 0.85], m.white, 0.15);
  const interiorLeaves = [0x314925, 0x56653b].map((color) =>
    resources.own(new THREE.MeshStandardMaterial({ color, roughness: 0.8 })),
  );
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4,
      x = -1.77 + Math.sin(a) * 0.23,
      z = 0.85 + Math.cos(a) * 0.18;
    const leafMaterial = interiorLeaves[i % 2];
    b.line(
      studio,
      [
        [-1.77, 0.35, 0.85],
        [x, 0.7 + (i % 3) * 0.12, z],
      ],
      0.018,
      leafMaterial,
    );
    const leaf = b.mesh(
      studio,
      resources.own(new THREE.SphereGeometry(1, 8, 6)),
      leafMaterial,
      [x, 0.75 + (i % 3) * 0.12, z],
    );
    leaf.scale.set(0.08, 0.24, 0.035);
    leaf.rotation.z = Math.sin(a) * 0.8;
  }
  b.cylinder(studio, 0.065, 0.15, [0.66, 1.16, 0.39], m.white);
  b.box(studio, [0.22, 0.03, 0.28], [-0.95, 1.12, 0.22], m.white);
  b.batch(circulation);
  for (const group of [gallery, studio, timeline, contact]) {
    b.batch(group);
    group.traverse((o) => {
      o.userData.destination = group.userData.destination;
    });
  }
  gallery.scale.z = 0.76;
  studio.scale.z = 0.72;
  studio.scale.y = 0.8;
  return { root, gallery, studio, timeline, contact };
}
