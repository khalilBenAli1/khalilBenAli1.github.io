import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { SceneResources } from "./resources";

type P = readonly [number, number, number];
export function construction(resources: SceneResources) {
  const cube = resources.own(new THREE.BoxGeometry(1, 1, 1));
  function mesh(
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    material: THREE.Material,
    p: P = [0, 0, 0],
  ) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...p);
    m.castShadow = !material.transparent;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(
    parent: THREE.Object3D,
    size: P,
    p: P,
    material: THREE.Material,
    radius = 0,
  ) {
    if (radius)
      return mesh(
        parent,
        resources.own(new RoundedBoxGeometry(...size, 3, radius)),
        material,
        p,
      );
    const m = mesh(parent, cube, material, p);
    m.scale.set(...size);
    return m;
  }
  function cylinder(
    parent: THREE.Object3D,
    r: number,
    h: number,
    p: P,
    material: THREE.Material,
    top = r,
  ) {
    return mesh(
      parent,
      resources.own(new THREE.CylinderGeometry(top, r, h, 24)),
      material,
      p,
    );
  }
  function line(
    parent: THREE.Object3D,
    points: P[],
    radius: number,
    material: THREE.Material,
  ) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return mesh(
      parent,
      resources.own(
        new THREE.TubeGeometry(
          curve,
          Math.max(8, points.length * 4),
          radius,
          6,
          false,
        ),
      ),
      material,
    );
  }
  function extrude(
    parent: THREE.Object3D,
    shape: THREE.Shape,
    depth: number,
    material: THREE.Material,
    p: P = [0, 0, 0],
    bevel = 0.025,
  ) {
    return mesh(
      parent,
      resources.own(
        new THREE.ExtrudeGeometry(shape, {
          depth,
          steps: 1,
          bevelEnabled: bevel > 0,
          bevelSize: bevel,
          bevelThickness: bevel,
          bevelSegments: 2,
          curveSegments: 24,
        }),
      ),
      material,
      p,
    );
  }
  function slab(
    parent: THREE.Object3D,
    shape: THREE.Shape,
    depth: number,
    y: number,
    material: THREE.Material,
  ) {
    const m = extrude(parent, shape, depth, material, [0, y, 0], 0.035);
    m.rotation.x = -Math.PI / 2;
    return m;
  }
  function text(
    parent: THREE.Object3D,
    lines: string[],
    width: number,
    height: number,
    p: P,
    color = "#181814",
    size = 56,
    background?: string,
  ) {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = Math.round((768 * height) / width);
    const ctx = c.getContext("2d")!;
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    ctx.font = `600 ${size}px Arial, sans-serif`;
    lines.forEach((line, i) => ctx.fillText(line, 16, 10 + i * (size * 1.28)));
    const t = resources.own(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    const m = mesh(
      parent,
      resources.own(new THREE.PlaneGeometry(width, height)),
      resources.own(
        new THREE.MeshBasicMaterial({
          map: t,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      ),
      p,
    );
    m.castShadow = false;
    return m;
  }
  /** Merge static parts by material inside one destination; retain route picking. */
  function batch(parent: THREE.Group) {
    parent.updateMatrixWorld(true);
    const inverse = parent.matrixWorld.clone().invert();
    const groups = new Map<THREE.Material, THREE.Mesh[]>();
    parent.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        !Array.isArray(o.material) &&
        !(o instanceof THREE.InstancedMesh) &&
        !o.material.transparent
      ) {
        const a = groups.get(o.material) ?? [];
        a.push(o);
        groups.set(o.material, a);
      }
    });
    for (const [material, meshes] of groups) {
      if (meshes.length < 2) continue;
      const geos = meshes.map((m) => {
        const g = m.geometry.index
          ? m.geometry.toNonIndexed()
          : m.geometry.clone();
        g.applyMatrix4(inverse.clone().multiply(m.matrixWorld));
        if (g.getAttribute("uv1")) g.deleteAttribute("uv1");
        // Planar world-scale mineral mapping keeps grain consistent across slabs.
        if (material instanceof THREE.MeshStandardMaterial && material.map) {
          const p = g.getAttribute("position"),
            n = g.getAttribute("normal"),
            uv = g.getAttribute("uv");
          for (let i = 0; i < p.count; i++) {
            const ax = Math.abs(n.getX(i)),
              ay = Math.abs(n.getY(i)),
              az = Math.abs(n.getZ(i));
            if (ay > ax && ay > az)
              uv.setXY(i, p.getX(i) * 0.46, p.getZ(i) * 0.46);
            else if (ax > az) uv.setXY(i, p.getZ(i) * 0.46, p.getY(i) * 0.46);
            else uv.setXY(i, p.getX(i) * 0.46, p.getY(i) * 0.46);
          }
        }
        return g;
      });
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const m = mesh(parent, resources.own(merged), material);
      m.userData.destination = parent.userData.destination;
      meshes.forEach((o) => o.removeFromParent());
    }
  }
  return { mesh, box, cylinder, line, extrude, slab, text, batch };
}

export function roundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
