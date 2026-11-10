/**
 * The keep's geometry, built once from primitives into a single stone mesh.
 *
 * Nothing here is loaded from a file: the whole world is a few hundred boxes,
 * cylinders and extruded arches merged into one draw call. Normals are derived
 * in the fragment shader, so only positions and a per-piece tint are stored.
 *
 * The road runs toward -Z: gate (z -6), nave (z -14…-50), end wall (z -56),
 * courtyard, stair (z -72…-100) and the summit with the signal fire (z -108).
 */
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Matrix4,
  Path,
  Quaternion,
  Shape,
  Vector3,
} from "three";

export interface Fire {
  x: number;
  y: number;
  z: number;
  /** Flame height in metres. */
  size: number;
  /** Brightness before the visitor arrives, 0…1. */
  base: number;
  /** The fire is fully lit once the camera has passed this z. */
  igniteZ: number;
}

export interface World {
  geometry: BufferGeometry;
  fires: Fire[];
}

export const STAIR_START = -72;
export const STAIR_END = -100;
export const SUMMIT_Y = 5.6;
export const SUMMIT_Z = -108;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Stone {
  readonly positions: number[] = [];
  readonly tints: number[] = [];
  private readonly vertex = new Vector3();
  private readonly matrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly euler = new Euler();
  private readonly scale = new Vector3(1, 1, 1);
  private readonly origin = new Vector3();

  /** Bakes a primitive into the merged buffer and releases it. */
  add(
    source: BufferGeometry,
    x: number,
    y: number,
    z: number,
    tint: number,
    ry = 0,
    rx = 0,
    rz = 0,
  ): void {
    const geometry = source.index ? source.toNonIndexed() : source;
    this.euler.set(rx, ry, rz, "YXZ");
    this.quaternion.setFromEuler(this.euler);
    this.matrix.compose(this.origin.set(x, y, z), this.quaternion, this.scale);
    const position = geometry.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) {
      this.vertex.fromBufferAttribute(position, i).applyMatrix4(this.matrix);
      this.positions.push(this.vertex.x, this.vertex.y, this.vertex.z);
      this.tints.push(tint);
    }
    if (geometry !== source) geometry.dispose();
    source.dispose();
  }

  /** A box standing on y. */
  box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    tint: number,
    ry = 0,
    rx = 0,
    rz = 0,
  ): void {
    this.add(new BoxGeometry(w, h, d), x, y + h / 2, z, tint, ry, rx, rz);
  }

  /** A faceted column standing on y. */
  column(
    top: number,
    bottom: number,
    h: number,
    x: number,
    y: number,
    z: number,
    tint: number,
    sides = 8,
    ry = 0,
    rx = 0,
    rz = 0,
  ): void {
    this.add(
      new CylinderGeometry(top, bottom, h, sides, 1),
      x,
      y + h / 2,
      z,
      tint,
      ry,
      rx,
      rz,
    );
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(this.positions, 3),
    );
    geometry.setAttribute("aTint", new Float32BufferAttribute(this.tints, 1));
    geometry.computeBoundingSphere();
    return geometry;
  }
}

/**
 * A wall with a pointed opening cut from its base. Drawn as one outline, so no
 * hole ever touches the outer edge.
 */
function gateShape(
  width: number,
  height: number,
  opening: number,
  spring: number,
  peak: number,
): Shape {
  const w = width / 2;
  const o = opening / 2;
  const lift = spring + (peak - spring) * 0.72;
  const shape = new Shape();
  shape.moveTo(-w, 0);
  shape.lineTo(-w, height);
  shape.lineTo(w, height);
  shape.lineTo(w, 0);
  shape.lineTo(o, 0);
  shape.lineTo(o, spring);
  shape.quadraticCurveTo(o, lift, 0, peak);
  shape.quadraticCurveTo(-o, lift, -o, spring);
  shape.lineTo(-o, 0);
  shape.closePath();
  return shape;
}

/** A free-standing pointed rib: the same curve inside and out. */
function ribShape(span: number, rise: number, thickness: number): Shape {
  const o = span / 2;
  const w = o + thickness;
  const shape = new Shape();
  shape.moveTo(-w, 0);
  shape.quadraticCurveTo(-w, (rise + thickness) * 0.78, 0, rise + thickness);
  shape.quadraticCurveTo(w, (rise + thickness) * 0.78, w, 0);
  shape.lineTo(o, 0);
  shape.quadraticCurveTo(o, rise * 0.74, 0, rise);
  shape.quadraticCurveTo(-o, rise * 0.74, -o, 0);
  shape.closePath();
  return shape;
}

function pointedWindow(
  x: number,
  sill: number,
  width: number,
  spring: number,
  peak: number,
): Path {
  const o = width / 2;
  const lift = spring + (peak - spring) * 0.72;
  const hole = new Path();
  hole.moveTo(x - o, sill);
  hole.lineTo(x + o, sill);
  hole.lineTo(x + o, spring);
  hole.quadraticCurveTo(x + o, lift, x, peak);
  hole.quadraticCurveTo(x - o, lift, x - o, spring);
  hole.closePath();
  return hole;
}

function extrude(shape: Shape, depth: number): ExtrudeGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 5,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** Stone the road climbs over: flat, then the stair, then the summit. */
export function roadHeight(z: number): number {
  if (z >= STAIR_START) return 0;
  if (z <= STAIR_END) return SUMMIT_Y;
  return ((STAIR_START - z) / (STAIR_START - STAIR_END)) * SUMMIT_Y;
}

function brazier(
  stone: Stone,
  fires: Fire[],
  x: number,
  y: number,
  z: number,
  options: { size?: number; base?: number; lead?: number; post?: number } = {},
): void {
  const post = options.post ?? 1.05;
  stone.box(0.62, 0.22, 0.62, x, y, z, 0.35);
  stone.column(0.16, 0.22, post, x, y + 0.22, z, 0.3, 6);
  stone.column(0.5, 0.24, 0.34, x, y + 0.22 + post, z, 0.2, 8);
  fires.push({
    x,
    y: y + 0.22 + post + 0.3,
    z,
    size: options.size ?? 1,
    base: options.base ?? 0,
    igniteZ: z + (options.lead ?? 9),
  });
}

/** `milestones` fires stand on the stair, one per career entry. */
export function buildWorld(milestones: number): World {
  const random = mulberry32(1612);
  const stone = new Stone();
  const fires: Fire[] = [];
  const tint = (): number => 0.25 + random() * 0.6;

  /* ---------- ground ---------- */
  stone.box(260, 1, 330, 0, -1, -110, 0.5);

  /* ---------- gatehouse, z -6 ---------- */
  stone.add(extrude(gateShape(12, 9.4, 4.6, 4.3, 6.8), 2.4), 0, 0, -6, 0.55);
  for (let i = 0; i < 6; i += 1) {
    stone.box(1.05, 0.9, 2.4, -5.2 + i * 2.08, 9.4, -6, tint());
  }
  for (const side of [-1, 1]) {
    stone.box(4.8, 12.6, 4.8, side * 8.2, 0, -6.4, 0.6);
    stone.box(5.4, 0.5, 5.4, side * 8.2, 12.6, -6.4, 0.45);
    for (const cx of [-2.1, 2.1]) {
      for (const cz of [-2.1, 2.1]) {
        stone.box(1.1, 1, 1.1, side * 8.2 + cx, 13.1, -6.4 + cz, tint());
      }
    }
    /* Curtain wall falling into ruin as it leaves the gate. */
    for (let i = 0; i < 7; i += 1) {
      const height = Math.max(1.2, 7.4 - i * 0.7 - random() * 2.2);
      stone.box(
        5.6,
        height,
        1.7,
        side * (13.4 + i * 5.6),
        0,
        -6.2 + (random() - 0.5) * 0.4,
        tint(),
      );
    }
    brazier(stone, fires, side * 3.5, 0, -2.4, { base: 1, size: 1.15 });
  }

  /* ---------- nave, z -14 … -50 ---------- */
  const bays = 7;
  for (let bay = 0; bay < bays; bay += 1) {
    const z = -14 - bay * 6;
    const standing = [true, true];
    for (const [index, side] of [-1, 1].entries()) {
      const x = side * 4.5;
      const broken = bay > 0 && random() < 0.3;
      standing[index] = !broken;
      stone.box(1.6, 0.5, 1.6, x, 0, z, tint());
      if (broken) {
        const height = 1.4 + random() * 2.8;
        stone.column(0.5, 0.56, height, x, 0.5, z, tint());
        for (let i = 0; i < 4; i += 1) {
          const size = 0.35 + random() * 0.5;
          stone.box(
            size * 1.4,
            size,
            size,
            x + side * (0.9 + random() * 1.6),
            0,
            z + (random() - 0.5) * 3,
            tint(),
            random() * 3,
            0,
            (random() - 0.5) * 0.5,
          );
        }
      } else {
        stone.column(0.48, 0.56, 6.2, x, 0.5, z, tint());
        stone.box(1.5, 0.45, 1.5, x, 6.7, z, tint());
      }

      /* Outer wall, with a tall window where enough of it still stands. */
      const wallHeight = 4 + random() * 6.5;
      const wall = new Shape();
      wall.moveTo(-3, 0);
      wall.lineTo(-3, wallHeight);
      wall.lineTo(-1 + random() * 2, wallHeight - random() * 1.5);
      wall.lineTo(3, wallHeight - random() * 2.2);
      wall.lineTo(3, 0);
      wall.closePath();
      if (wallHeight > 8) wall.holes.push(pointedWindow(0, 2.4, 1.7, 5, 6.7));
      stone.add(extrude(wall, 1.3), side * 9.2, 0, z, tint(), Math.PI / 2);
    }
    if (standing[0] && standing[1]) {
      stone.add(extrude(ribShape(7.6, 3.3, 0.7), 0.7), 0, 7.15, z, tint());
    }
    if (bay % 2 === 1) {
      const side = bay % 4 === 1 ? -1 : 1;
      brazier(stone, fires, side * 2.9, 0, z, { lead: 11 });
    }
  }

  /* ---------- end wall with its rose window, z -56 ---------- */
  const endWall = gateShape(21, 13.5, 5.2, 5.2, 8.5);
  const rose = new Path();
  rose.absarc(0, 10.9, 1.5, 0, Math.PI * 2, false);
  endWall.holes.push(rose);
  stone.add(extrude(endWall, 1.7), 0, 0, -56, 0.5);
  for (const side of [-1, 1]) {
    stone.box(2.2, 15.5, 2.6, side * 10.6, 0, -56, 0.6);
  }

  /* ---------- courtyard, z -58 … -72 ---------- */
  const trunkX = 6.8;
  const trunkZ = -64.5;
  stone.column(0.28, 0.6, 4.4, trunkX, 0, trunkZ, 0.1, 6, 0, 0.06, -0.1);
  for (let i = 0; i < 6; i += 1) {
    const length = 1.8 + random() * 2.2;
    const lean = 0.5 + random() * 0.7;
    const turn = random() * Math.PI * 2;
    stone.column(
      0.04,
      0.16,
      length,
      trunkX + Math.sin(turn) * 0.5 + 0.35,
      3.1 + random() * 1.3,
      trunkZ + Math.cos(turn) * 0.5,
      0.1,
      5,
      turn,
      lean,
    );
  }
  for (const [x, z, height] of [
    [-5.6, -61.5, 2.6],
    [-6.4, -67.5, 1.4],
    [5.2, -70, 3.3],
  ] as const) {
    stone.box(1.5, 0.6, 1.5, x, 0, z, tint());
    stone.box(0.95, height, 0.95, x, 0.6, z, tint(), random());
  }
  brazier(stone, fires, -3.1, 0, -65, { lead: 22, size: 1.1 });

  /* ---------- stair, z -72 … -100 ---------- */
  const steps = 28;
  const depth = (STAIR_START - STAIR_END) / steps;
  const rise = SUMMIT_Y / steps;
  for (let i = 0; i < steps; i += 1) {
    const z = STAIR_START - (i + 0.5) * depth;
    const top = (i + 1) * rise;
    stone.box(6.2, top, depth, 0, 0, z, 0.38 + (i % 2) * 0.12);
    for (const side of [-1, 1]) {
      stone.box(0.55, top + 0.85, depth, side * 3.35, 0, z, tint());
    }
  }
  for (let i = 0; i < milestones; i += 1) {
    const step = Math.round(((i + 0.5) / milestones) * steps);
    const side = i % 2 === 0 ? 1 : -1;
    const z = STAIR_START - step * depth;
    const y = roadHeight(z) + 0.85;
    stone.box(0.9, y + 0.5, 0.9, side * 3.35, 0, z, 0.55);
    brazier(stone, fires, side * 3.35, y + 0.5, z, { lead: 7, post: 0.5 });
  }

  /* ---------- summit and signal fire, z -108 ---------- */
  stone.box(17, SUMMIT_Y, 16.5, 0, 0, SUMMIT_Z - 0.2, 0.42);
  stone.column(7.4, 7.4, 0.3, 0, SUMMIT_Y, SUMMIT_Z, 0.6, 14);
  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2 + 0.5;
    /* Leave the approach from the stair open. */
    if (Math.abs(Math.sin(angle)) < 0.42 && Math.cos(angle) > 0) continue;
    const x = Math.sin(angle) * 6.4;
    const z = SUMMIT_Z + Math.cos(angle) * 6.4;
    stone.box(1.4, 0.45, 1.4, x, SUMMIT_Y + 0.3, z, tint());
    stone.column(0.42, 0.5, 2.4 + random() * 5.2, x, SUMMIT_Y + 0.75, z, tint());
  }
  stone.column(2.1, 2.3, 0.4, 0, SUMMIT_Y + 0.3, SUMMIT_Z, 0.5, 10);
  stone.column(1.5, 1.7, 0.4, 0, SUMMIT_Y + 0.7, SUMMIT_Z, 0.4, 10);
  stone.column(1.45, 0.7, 0.75, 0, SUMMIT_Y + 1.1, SUMMIT_Z, 0.2, 10);
  fires.push({
    x: 0,
    y: SUMMIT_Y + 1.8,
    z: SUMMIT_Z,
    size: 2.9,
    base: 0.45,
    igniteZ: STAIR_END + 11,
  });

  /* ---------- far silhouettes ---------- */
  /* Broad, low and far: they only ever read as a ridge line in the fog. */
  for (let i = 0; i < 34; i += 1) {
    const x = -330 + i * 20 + random() * 12;
    const height = 12 + random() * 30;
    stone.column(
      0.1,
      24 + random() * 16,
      height,
      x,
      -1,
      -250 - random() * 50,
      0.4,
      5 + Math.floor(random() * 3),
      random() * 3,
    );
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i += 1) {
      const height = 12 + random() * 24;
      stone.column(
        0.1,
        22 + random() * 12,
        height,
        side * (120 + random() * 50),
        -1,
        20 - i * 20,
        0.4,
        5 + Math.floor(random() * 3),
        random() * 3,
      );
    }
  }
  stone.box(7, 46, 7, -34, 0, -168, 0.5);
  stone.box(8.4, 2, 8.4, -34, 46, -168, 0.5);
  stone.box(5, 30, 5, 27, 0, -182, 0.5);

  return { geometry: stone.build(), fires };
}
