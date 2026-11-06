import * as THREE from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import type { SceneQuality } from "../../../lib/island/types";
import { SceneResources } from "./resources";

type Instance = {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: THREE.Quaternion;
  color: THREE.Color;
};

/** Original Mediterranean planting. All randomness is seeded, including the posters. */
export function createLandscape(
  resources: SceneResources,
  quality: SceneQuality,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "Mediterranean planting";
  let seed = 81261;
  const random = (): number => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const range = (a: number, b: number): number => a + (b - a) * random();
  const density = quality === "high" ? 1 : 0.64;
  const up = new THREE.Vector3(0, 1, 0);
  const barkParts: THREE.BufferGeometry[] = [];
  const leafInstances: Instance[] = [];
  const ivyInstances: Instance[] = [];
  const grassInstances: Instance[] = [];
  const purpleInstances: Instance[] = [];
  const yellowInstances: Instance[] = [];
  const rockInstances: Instance[] = [];

  function texture(kind: "bark" | "limestone"): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = kind === "bark" ? 512 : 256;
    const context = canvas.getContext("2d");
    if (context) {
      const pixels = context.createImageData(canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const index = (y * canvas.width + x) * 4;
          const drift = Math.sin(y * 0.018) * 3 + Math.sin(y * 0.065) * 1.2;
          const groove = Math.pow(Math.abs(Math.sin((x + drift) * 0.21)), 10);
          const grain = random() * 22 - 11;
          const cloud =
            Math.sin(x * 0.07 + Math.sin(y * 0.034) * 4) * 9 +
            Math.sin(y * 0.075 + x * 0.037) * 6;
          const shade = kind === "bark" ? -groove * 48 + cloud * 0.6 : cloud;
          const base = kind === "bark" ? [117, 105, 84] : [192, 177, 151];
          for (let c = 0; c < 3; c++)
            pixels.data[index + c] = base[c] + shade + grain;
          pixels.data[index + 3] = 255;
        }
      }
      context.putImageData(pixels, 0, 0);
    }
    const map = resources.own(new THREE.CanvasTexture(canvas));
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 4;
    return map;
  }

  const barkMap = texture("bark");
  const stoneMap = texture("limestone");
  const bark = resources.own(
    new THREE.MeshStandardMaterial({
      color: 0xc2b79e,
      map: barkMap,
      bumpMap: barkMap,
      bumpScale: 0.065,
      roughness: 0.98,
    }),
  );
  const leaf = resources.own(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.83,
      emissive: 0x5e642b,
      emissiveIntensity: 0.06,
      side: THREE.DoubleSide,
    }),
  );
  const flower = resources.own(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
    }),
  );
  const limestone = resources.own(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: stoneMap,
      bumpMap: stoneMap,
      bumpScale: 0.085,
      roughness: 0.99,
    }),
  );

  // Creased lanceolate leaves catch light with a silver edge instead of flat disks.
  const leafGeometry = resources.own(new THREE.BufferGeometry());
  leafGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0, -0.42, 0.24, 0, -0.5, 0.53, 0, -0.26, 0.83, 0, 0, 1, -0.025,
        0.26, 0.83, 0, 0.5, 0.53, 0, 0.42, 0.24, 0, 0, 0.46, 0.08,
      ],
      3,
    ),
  );
  leafGeometry.setIndex([
    0, 1, 8, 1, 2, 8, 2, 3, 8, 3, 4, 8, 4, 5, 8, 5, 6, 8, 6, 7, 8, 7, 0, 8,
  ]);
  leafGeometry.computeVertexNormals();

  const grassGeometry = resources.own(new THREE.BufferGeometry());
  grassGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [-0.5, 0, 0, 0.5, 0, 0, -0.31, 0.52, 0.12, 0.31, 0.52, 0.12, 0, 1, 0.45],
      3,
    ),
  );
  grassGeometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  grassGeometry.computeVertexNormals();

  const ivyGeometry = resources.own(new THREE.BufferGeometry());
  ivyGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0, -0.43, 0.25, 0, -0.5, 0.67, 0, -0.12, 0.61, 0.015, 0, 1, 0,
        0.14, 0.65, 0.015, 0.5, 0.68, 0, 0.43, 0.24, 0, 0, 0.4, 0.1,
      ],
      3,
    ),
  );
  ivyGeometry.setIndex([
    0, 1, 8, 1, 2, 8, 2, 3, 8, 3, 4, 8, 4, 5, 8, 5, 6, 8, 6, 7, 8, 7, 0, 8,
  ]);
  ivyGeometry.computeVertexNormals();

  function place(
    instances: Instance[],
    position: THREE.Vector3,
    scale: THREE.Vector3,
    color: THREE.Color,
    direction?: THREE.Vector3,
  ): void {
    const rotation = direction
      ? new THREE.Quaternion().setFromUnitVectors(
          up,
          direction.clone().normalize(),
        )
      : new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            range(-Math.PI, Math.PI),
            range(-Math.PI, Math.PI),
            range(-Math.PI, Math.PI),
          ),
        );
    if (direction)
      rotation.multiply(
        new THREE.Quaternion().setFromAxisAngle(up, range(0, Math.PI * 2)),
      );
    instances.push({ position, scale, rotation, color });
  }

  function batch(
    name: string,
    instances: Instance[],
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    shadows = true,
  ): void {
    const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
    mesh.name = name;
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    instances.forEach((item, index) => {
      matrix.compose(item.position, item.rotation, item.scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, item.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
    resources.onDispose(() => mesh.dispose());
  }

  /** A tapered, ridged tube follows the branch; it has no constant-width pipe ends. */
  function branch(
    points: THREE.Vector3[],
    start: number,
    end: number,
    ridges = true,
  ): void {
    const curve = new THREE.CatmullRomCurve3(points);
    const segments = Math.max(5, Math.ceil(curve.getLength() * 8));
    const radial = start > 0.12 ? 12 : 7;
    const frames = curve.computeFrenetFrames(segments, false);
    const positions: number[] = [];
    const uv: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const center = curve.getPointAt(t);
      const radius = THREE.MathUtils.lerp(start, end, t);
      for (let j = 0; j <= radial; j++) {
        const angle = (j / radial) * Math.PI * 2;
        const flute = ridges ? 1 + Math.sin(angle * 5 + t * 11) * 0.13 : 1;
        const point = center
          .clone()
          .addScaledVector(frames.normals[i], Math.cos(angle) * radius * flute)
          .addScaledVector(
            frames.binormals[i],
            Math.sin(angle) * radius * flute,
          );
        positions.push(point.x, point.y, point.z);
        uv.push(j / radial, (t * curve.getLength()) / 2);
        if (i < segments && j < radial) {
          const a = i * (radial + 1) + j;
          const b = a + radial + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    barkParts.push(geometry);
  }

  const oliveColors = [
    0x3b4825, 0x535c32, 0x6b713e, 0x2f3b20, 0x737a4d, 0x46532c,
  ];
  const shrubColors = [0x3a491d, 0x4f5f29, 0x67743a, 0x7a7f39, 0x32431b];
  const colorFrom = (colors: number[]): THREE.Color =>
    new THREE.Color(colors[Math.floor(random() * colors.length)]);

  function crown(
    center: THREE.Vector3,
    size: THREE.Vector3,
    count: number,
    colors: number[],
  ): void {
    for (let i = 0; i < count * density; i++) {
      const azimuth = range(0, Math.PI * 2);
      const elevation = range(-1, 1);
      const radius = Math.cbrt(random());
      const ring = Math.sqrt(1 - elevation * elevation);
      const offset = new THREE.Vector3(
        Math.cos(azimuth) * ring * radius * size.x,
        elevation * radius * size.y,
        Math.sin(azimuth) * ring * radius * size.z,
      );
      const direction = offset
        .clone()
        .multiplyScalar(0.8)
        .add(
          new THREE.Vector3(
            range(-0.5, 0.5),
            range(-0.1, 0.7),
            range(-0.5, 0.5),
          ),
        );
      place(
        leafInstances,
        center.clone().add(offset),
        new THREE.Vector3(
          range(0.035, 0.067) * (count > 200 ? 0.7 : 1),
          range(0.105, 0.2) * (count > 200 ? 0.65 : 1),
          0.12,
        ),
        colorFrom(colors),
        direction,
      );
    }
  }

  function olive(origin: THREE.Vector3, scale = 1): void {
    const mature = scale > 0.8;
    const spread = mature ? 1.3 : 1;
    const point = (x: number, y: number, z: number): THREE.Vector3 =>
      new THREE.Vector3(
        x * spread,
        mature && y > 0.6 ? 0.6 + (y - 0.6) * 1.55 : y,
        z * spread,
      )
        .multiplyScalar(scale)
        .add(origin);
    const trunk = [
      point(0, 0, 0),
      point(0.19, 0.43, 0.02),
      point(-0.02, 0.94, 0.05),
      point(-0.48, 1.45, 0.1),
      point(-0.32, 1.93, -0.03),
      point(-0.05, 2.42, -0.11),
    ];
    branch(trunk, 0.275 * scale, 0.105 * scale);
    // Exposed roots and counter-twisting secondary trunks give the olive its age.
    for (let r = 0; r < 7; r++) {
      const angle = (r * Math.PI * 2) / 7;
      branch(
        [
          point(Math.cos(angle) * 0.75, 0.015, Math.sin(angle) * 0.58),
          point(Math.cos(angle) * 0.38, 0.13, Math.sin(angle) * 0.32),
          point(0.12, 0.57, 0),
        ],
        0.045 * scale,
        0.17 * scale,
      );
    }
    branch(
      [
        point(0.25, 0.12, -0.11),
        point(0.35, 0.65, -0.14),
        point(0.16, 1.17, -0.22),
        point(0.28, 1.83, -0.28),
        point(0.65, 2.5, -0.39),
      ],
      0.16 * scale,
      0.04 * scale,
    );
    for (let limb = 0; limb < 8; limb++) {
      const angle = (limb * Math.PI * 2) / 8 + range(-0.18, 0.18);
      const reach = range(0.9, 1.35);
      const start = point(-0.17, range(1.55, 2.05), -0.03);
      const middle = point(
        Math.cos(angle) * reach * 0.58 - 0.1,
        range(2.35, 2.65),
        Math.sin(angle) * reach * 0.5,
      );
      const tip = point(
        Math.cos(angle) * reach,
        range(2.95, 3.4),
        Math.sin(angle) * reach,
      );
      branch([start, middle, tip], range(0.075, 0.12) * scale, 0.022 * scale);
      for (let fork = 0; fork < 4; fork++) {
        const offset = new THREE.Vector3(
          range(-0.42, 0.42) * spread,
          range(-0.18, mature ? 0.7 : 0.4),
          range(-0.4, 0.4) * spread,
        ).multiplyScalar(scale);
        const shoot = tip.clone().add(offset);
        const joint = middle.clone().lerp(tip, range(0.5, 0.83));
        branch(
          [
            joint,
            joint
              .clone()
              .lerp(shoot, 0.55)
              .add(new THREE.Vector3(0, 0.08 * scale, 0)),
            shoot,
          ],
          0.018 * scale,
          0.004 * scale,
          false,
        );
        crown(
          shoot,
          new THREE.Vector3(
            mature ? 0.62 : 0.4,
            mature ? 0.48 : 0.32,
            mature ? 0.58 : 0.38,
          ).multiplyScalar(scale),
          mature ? 520 : 66,
          oliveColors,
        );
      }
    }
  }

  olive(new THREE.Vector3(2.6, 3.1, -0.6));
  olive(new THREE.Vector3(-5.12, 1.16, 3.48), 0.54);

  // Muted limestone, smoothly shaded but uneven enough to read as eroded rock.
  const rawRock = new THREE.IcosahedronGeometry(1, 3);
  const rockPosition = rawRock.getAttribute("position");
  for (let i = 0; i < rockPosition.count; i++) {
    const x = rockPosition.getX(i);
    const y = rockPosition.getY(i);
    const z = rockPosition.getZ(i);
    const warp =
      1 +
      Math.sin(x * 9 + z * 7) * 0.085 +
      Math.sin(y * 13 - x * 5) * 0.065 +
      Math.cos(z * 15 + y * 7) * 0.045;
    rockPosition.setXYZ(i, x * warp, y * warp, z * warp);
  }
  rawRock.deleteAttribute("normal");
  const rockGeometry = resources.own(mergeVertices(rawRock, 0.00001));
  rawRock.dispose();
  rockGeometry.computeVertexNormals();

  function boulder(x: number, y: number, z: number, scale: number): void {
    const tint = range(0.82, 1.04);
    place(
      rockInstances,
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(
        scale * range(0.8, 1.3),
        scale * range(0.6, 0.95),
        scale * range(0.8, 1.2),
      ),
      new THREE.Color(tint, tint * 0.99, tint * 0.94),
    );
  }

  for (let i = 0; i < 36; i++) {
    const angle = range(0, Math.PI * 2);
    const radius = range(0.5, 1.53);
    boulder(
      2.55 + Math.cos(angle) * radius,
      3.05 + range(0.1, 0.31),
      -0.45 + Math.sin(angle) * radius * 0.67,
      range(0.21, 0.46),
    );
  }
  [
    [7.42, 3.0, -0.1, 0.37],
    [-5.02, 1.18, 3.55, 0.28],
    [-4.78, 1.15, 3.83, 0.21],
  ].forEach(([x, y, z, scale]) => boulder(x, y, z, scale));

  function shrub(
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
  ): void {
    const origin = new THREE.Vector3(x, y, z);
    for (let twig = 0; twig < 7; twig++) {
      const angle = range(0, Math.PI * 2);
      const reach = range(0.3, 1) * radius;
      const end = origin
        .clone()
        .add(
          new THREE.Vector3(
            Math.cos(angle) * reach,
            height * range(0.5, 0.95),
            Math.sin(angle) * reach,
          ),
        );
      branch(
        [origin, origin.clone().lerp(end, 0.55), end],
        0.015,
        0.003,
        false,
      );
      crown(
        end,
        new THREE.Vector3(radius * 0.4, height * 0.25, radius * 0.4),
        48,
        shrubColors,
      );
    }
  }

  function grasses(
    x: number,
    y: number,
    z: number,
    spread: number,
    height: number,
    count = 42,
  ): void {
    for (let i = 0; i < count * density; i++) {
      const angle = range(0, Math.PI * 2);
      const radius = range(0, spread);
      const direction = new THREE.Vector3(
        Math.cos(angle) * range(0.15, 0.8),
        1,
        Math.sin(angle) * range(0.15, 0.8),
      );
      place(
        grassInstances,
        new THREE.Vector3(
          x + Math.cos(angle) * radius,
          y,
          z + Math.sin(angle) * radius,
        ),
        new THREE.Vector3(
          range(0.012, 0.028),
          height * range(0.5, 1.1),
          height,
        ),
        colorFrom([0x787a3e, 0x999660, 0x666f34, 0xb0a76d]),
        direction,
      );
    }
  }

  function flowers(
    x: number,
    y: number,
    z: number,
    radius: number,
    yellow: boolean,
  ): void {
    const count = yellow ? 30 : 24;
    for (let i = 0; i < count * density; i++) {
      const angle = range(0, Math.PI * 2);
      const r = radius * Math.sqrt(random());
      const stemHeight = range(yellow ? 0.14 : 0.3, yellow ? 0.42 : 0.66);
      const base = new THREE.Vector3(
        x + Math.cos(angle) * r,
        y,
        z + Math.sin(angle) * r,
      );
      const sway = new THREE.Vector3(
        Math.cos(angle) * 0.11,
        stemHeight,
        Math.sin(angle) * 0.11,
      );
      place(
        grassInstances,
        base,
        new THREE.Vector3(0.012, stemHeight, 0.1),
        new THREE.Color(0x7b7e42),
        sway,
      );
      const tip = base.clone().add(sway);
      if (yellow) {
        for (let blossom = 0; blossom < 3; blossom++) {
          place(
            yellowInstances,
            tip
              .clone()
              .add(
                new THREE.Vector3(
                  range(-0.04, 0.04),
                  range(-0.04, 0.04),
                  range(-0.04, 0.04),
                ),
              ),
            new THREE.Vector3(0.026, 0.021, 0.026),
            colorFrom([0xf0cf4a, 0xe2b93c, 0xffdf72]),
          );
        }
      } else {
        // Lavender blooms form narrow vertical spikes, not large colourful balls.
        for (let blossom = 0; blossom < 6; blossom++) {
          const width = 0.016 + Math.sin((blossom / 6) * Math.PI) * 0.012;
          place(
            purpleInstances,
            tip
              .clone()
              .add(
                new THREE.Vector3(
                  range(-0.015, 0.015),
                  blossom * 0.028,
                  range(-0.015, 0.015),
                ),
              ),
            new THREE.Vector3(width, 0.027, width),
            colorFrom([0x716391, 0x8c78a9, 0x5f507f, 0x9e8ab0]),
          );
        }
      }
    }
  }

  const beds: [number, number, number, number, number][] = [
    [1.47, 3.12, 0.15, 0.35, 0.38],
    [3.37, 3.17, 0.25, 0.31, 0.5],
    [2.9, 3.1, -1.68, 0.35, 0.41],
    [8.05, 3.12, -0.25, 0.45, 0.47],
    [6.45, 3.1, -0.3, 0.3, 0.35],
    // Keep the foreground bed to the left of the first timeline inscription.
    [-5.14, 1.17, 3.34, 0.33, 0.38],
    [-5.03, 1.16, 3.92, 0.25, 0.3],
    [2.18, 1.2, 2.35, 0.35, 0.38],
    [2.55, 1.2, 2.55, 0.32, 0.5],
    [7.25, 1.2, 4.57, 0.43, 0.4],
    [6.38, 1.2, 4.85, 0.45, 0.34],
    [-7.5, 3.06, -0.1, 0.3, 0.4],
    [1.3, 3.13, -0.3, 0.4, 0.55],
    [3.65, 3.12, -0.15, 0.38, 0.47],
    [2.5, 3.13, 0.55, 0.46, 0.49],
    [6.15, 1.2, 4.7, 0.43, 0.45],
    [-5.22, 1.19, 2.88, 0.28, 0.4],
  ];
  beds.forEach(([x, y, z, radius, height], index) => {
    shrub(x, y, z, radius, height);
    grasses(x + radius * 0.6, y, z - radius * 0.2, radius * 0.6, height * 0.8);
    flowers(
      x - radius * 0.4,
      y,
      z + radius * 0.35,
      radius * 0.7,
      index % 3 !== 0,
    );
  });
  flowers(2.35, 1.2, 2.05, 0.48, false);
  flowers(-5.15, 1.18, 3.63, 0.28, false);
  flowers(3.45, 3.11, 0.42, 0.28, false);
  shrub(-7.12, 3.69, 0.31, 0.29, 0.92);
  flowers(1.65, 3.16, 0.63, 0.36, true);
  flowers(3.16, 3.2, 0.57, 0.38, true);
  flowers(-5.26, 1.2, 3.14, 0.26, false);
  flowers(2.9, 1.2, 2.15, 0.36, false);

  function cascade(
    x: number,
    y: number,
    z: number,
    width: number,
    length: number,
    sweep = 0,
  ): void {
    for (let strand = 0; strand < 17; strand++) {
      const dx = range(-width * 0.5, width * 0.5);
      const drop = length * range(0.35, 1);
      const start = new THREE.Vector3(x + dx, y, z + range(-0.15, 0.1));
      const middle = start
        .clone()
        .add(
          new THREE.Vector3(range(-0.1, 0.1) + sweep * 0.5, -drop * 0.45, 0.15),
        );
      const end = start
        .clone()
        .add(new THREE.Vector3(range(-0.18, 0.18) + sweep, -drop, 0.14));
      branch([start, middle, end], 0.009, 0.002, false);
      const curve = new THREE.CatmullRomCurve3([start, middle, end]);
      for (let i = 0; i < 57 * density; i++) {
        const p = curve.getPoint(random());
        p.x += range(-0.1, 0.1);
        p.z += range(-0.1, 0.12);
        place(
          ivyInstances,
          p,
          new THREE.Vector3(range(0.09, 0.14), range(0.1, 0.17), 0.08),
          colorFrom([0x3c501f, 0x596b2e, 0x798a43, 0x2f431b]),
        );
      }
    }
    flowers(x, y + 0.015, z - 0.04, width * 0.45, true);
  }
  cascade(-7.12, 6.75, 0.17, 1.28, 1.85, -0.5);
  cascade(8.36, 3.13, -0.1, 0.55, 1.6);
  cascade(6.6, 1.21, 4.91, 1.55, 1.19);
  cascade(-4.94, 1.17, 4.18, 0.54, 1.04);

  if (barkParts.length) {
    const merged = mergeGeometries(barkParts);
    barkParts.forEach((geometry) => geometry.dispose());
    if (merged) {
      resources.own(merged);
      const branches = new THREE.Mesh(merged, bark);
      branches.name = "Olive trunks, roots and garden stems";
      branches.castShadow = branches.receiveShadow = true;
      group.add(branches);
    }
  }
  batch(
    "Olive and Mediterranean shrub leaves",
    leafInstances,
    leafGeometry,
    leaf,
  );
  batch("Draping ivy", ivyInstances, ivyGeometry, leaf);
  batch("Fine grasses and flower stems", grassInstances, grassGeometry, leaf);
  const blossomGeometry = resources.own(new THREE.IcosahedronGeometry(1, 0));
  batch("Lavender spikes", purpleInstances, blossomGeometry, flower, false);
  batch(
    "Small golden flowers",
    yellowInstances,
    blossomGeometry,
    flower,
    false,
  );
  batch(
    "Eroded planting and shore rocks",
    rockInstances,
    rockGeometry,
    limestone,
  );
  return group;
}
