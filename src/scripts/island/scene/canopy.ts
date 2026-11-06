import * as THREE from "three";
import { SceneResources } from "./resources";

type Vertex = Record<string, number[]>;

/** Open the gallery's courtyard edge while preserving the authored lightmap UVs. */
export function refineGalleryCanopy(
  model: THREE.Group,
  resources: SceneResources,
  invalidate: () => void,
): void {
  model.updateMatrixWorld(true);
  let hood: THREE.Mesh | undefined;
  model.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      object.userData.destination !== "work" ||
      Array.isArray(object.material)
    )
      return;
    const bounds = new THREE.Box3().setFromObject(object);
    if (
      bounds.max.x - bounds.min.x > 9 &&
      bounds.min.y < 3.3 &&
      bounds.max.y > 6.7
    )
      hood = object;
  });
  if (!hood) return;
  const source = hood.geometry.index
    ? hood.geometry.toNonIndexed()
    : hood.geometry.clone();
  source.applyMatrix4(
    model.matrixWorld.clone().invert().multiply(hood.matrixWorld),
  );
  const names = Object.keys(source.attributes);
  const output: Record<string, number[]> = {};
  for (const name of names) output[name] = [];
  const vertex = (index: number): Vertex =>
    Object.fromEntries(
      names.map((name) => {
        const a = source.getAttribute(name);
        return [
          name,
          Array.from({ length: a.itemSize }, (_, c) =>
            c === 0
              ? a.getX(index)
              : c === 1
                ? a.getY(index)
                : c === 2
                  ? a.getZ(index)
                  : a.getW(index),
          ),
        ];
      }),
    );
  const clip = (
    polygon: Vertex[],
    axis: number,
    edge: number,
    greater: boolean,
  ): Vertex[] => {
    const result: Vertex[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i],
        b = polygon[(i + 1) % polygon.length];
      const da = a.position[axis] - edge,
        db = b.position[axis] - edge;
      const insideA = greater ? da >= 0 : da <= 0,
        insideB = greater ? db >= 0 : db <= 0;
      if (insideA) result.push(a);
      if (insideA !== insideB) {
        const t = da / (da - db);
        result.push(
          Object.fromEntries(
            names.map((name) => [
              name,
              a[name].map((v, c) => THREE.MathUtils.lerp(v, b[name][c], t)),
            ]),
          ),
        );
      }
    }
    return result;
  };
  const emit = (polygon: Vertex[]) => {
    for (let i = 1; i < polygon.length - 1; i++)
      for (const v of [polygon[0], polygon[i], polygon[i + 1]])
        for (const name of names) output[name].push(...v[name]);
  };
  const count = source.getAttribute("position").count;
  for (let i = 0; i < count; i += 3) {
    const triangle = [vertex(i), vertex(i + 1), vertex(i + 2)];
    emit(clip(triangle, 0, 0.3, false));
    if (triangle.some((v) => v.position[0] > 0.30001))
      emit(clip(clip(triangle, 0, 0.3, true), 1, 6.43, true));
  }
  const geometry = resources.own(new THREE.BufferGeometry());
  for (const name of names)
    geometry.setAttribute(
      name,
      new THREE.Float32BufferAttribute(
        output[name],
        source.getAttribute(name).itemSize,
      ),
    );
  geometry.normalizeNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  source.dispose();
  const canopy = new THREE.Mesh(geometry, hood.material);
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  canopy.userData.destination = "work";
  hood.removeFromParent();
  model.add(canopy);
  const map = resources.own(
    new THREE.TextureLoader().load("/island/materials/travertine.webp", () => {
      if (!resources.disposed) invalidate();
    }),
  );
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(0.65, 1);
  const stone = resources.own(
    new THREE.MeshStandardMaterial({
      map,
      color: 0xe5cfad,
      roughness: 0.75,
      side: THREE.DoubleSide,
    }),
  );
  const undersideGeometry = resources.own(new THREE.PlaneGeometry(1.325, 1.9));
  undersideGeometry.rotateX(Math.PI / 2);
  const underside = new THREE.Mesh(undersideGeometry, stone);
  underside.position.set(0.9625, 6.428, -1.067);
  underside.receiveShadow = true;
  underside.userData.destination = "work";
  model.add(underside);
  const post = new THREE.Mesh(
    resources.own(new THREE.CylinderGeometry(0.027, 0.027, 3.33, 12)),
    resources.own(
      new THREE.MeshStandardMaterial({
        color: 0x292b26,
        metalness: 0.55,
        roughness: 0.35,
      }),
    ),
  );
  post.position.set(1.4, 4.765, -1.84);
  post.castShadow = true;
  post.userData.destination = "work";
  model.add(post);
}
