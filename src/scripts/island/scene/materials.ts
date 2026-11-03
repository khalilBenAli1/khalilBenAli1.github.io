import * as THREE from "three";
import { SceneResources } from "./resources";

/** Original, deterministic mineral maps. No remote texture or runtime request. */
export function createMaterials(
  resources: SceneResources,
  invalidate: () => void,
) {
  const stoneMap = resources.own(
    new THREE.TextureLoader().load("/island/materials/travertine.webp", () => {
      if (!resources.disposed) invalidate();
    }),
  );
  stoneMap.colorSpace = THREE.SRGBColorSpace;
  stoneMap.wrapS = stoneMap.wrapT = THREE.RepeatWrapping;
  stoneMap.anisotropy = 8;
  const mat = (p: THREE.MeshStandardMaterialParameters) =>
    resources.own(new THREE.MeshStandardMaterial(p));
  const stone = mat({
    color: 0xf2dfc5,
    map: stoneMap,
    bumpMap: stoneMap,
    bumpScale: 0.07,
    roughness: 0.78,
  });
  const rock = mat({
    color: 0xd6c5ad,
    map: stoneMap,
    bumpMap: stoneMap,
    bumpScale: 0.2,
    roughness: 1,
    vertexColors: true,
  });
  const floor = resources.own(
    new THREE.MeshPhysicalMaterial({
      color: 0xf3e0c7,
      map: stoneMap,
      bumpMap: stoneMap,
      bumpScale: 0.012,
      roughness: 0.17,
      clearcoat: 0.75,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1.3,
    }),
  );
  const plaster = mat({
    color: 0xc9ac83,
    map: stoneMap,
    bumpMap: stoneMap,
    bumpScale: 0.018,
    roughness: 0.85,
  });
  const blue = mat({ color: 0x063bff, metalness: 0.12, roughness: 0.27 });
  const yellow = mat({ color: 0xffac0b, metalness: 0.08, roughness: 0.36 });
  const metal = mat({ color: 0x272722, metalness: 0.65, roughness: 0.3 });
  const bronze = mat({ color: 0x5f5037, metalness: 0.66, roughness: 0.42 });
  const oak = mat({ color: 0x986d3e, map: stoneMap, roughness: 0.52 });
  const white = mat({ color: 0xfff5db, roughness: 0.6 });
  const glow = mat({
    color: 0xfff1c7,
    emissive: 0xffdb8f,
    emissiveIntensity: 2,
    roughness: 0.4,
  });
  const dark = mat({ color: 0x141b1c, roughness: 0.36, metalness: 0.15 });
  const glass = resources.own(
    new THREE.MeshPhysicalMaterial({
      color: 0xc0d4d5,
      transparent: true,
      opacity: 0.12,
      roughness: 0.13,
      metalness: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  return {
    stone,
    rock,
    floor,
    plaster,
    blue,
    yellow,
    metal,
    bronze,
    oak,
    white,
    glow,
    dark,
    glass,
  };
}
export type IslandMaterials = ReturnType<typeof createMaterials>;
