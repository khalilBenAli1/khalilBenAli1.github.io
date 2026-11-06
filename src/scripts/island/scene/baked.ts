import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { SceneResources } from "./resources";
import { configureCoastalStone } from "./stone-surface";

const destinations = new Set(["work", "about", "experience", "contact"]);

type BakedSurface = {
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
};
const unit = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? THREE.MathUtils.clamp(value, 0, 1)
    : fallback;

/** Keep the procedural group until this optional, world-positioned asset resolves. */
export function loadBakedGallery(
  resources: SceneResources,
  invalidate: () => void,
): Promise<THREE.Group | null> {
  return loadBakedAsset("gallery-baked.glb", resources, invalidate, "work");
}

/** Static architecture only: vegetation and water remain authored live objects. */
export function loadBakedArchitecture(
  resources: SceneResources,
  invalidate: () => void,
): Promise<THREE.Group | null> {
  return loadBakedAsset("architecture-baked.glb", resources, invalidate);
}

async function loadBakedAsset(
  filename: string,
  resources: SceneResources,
  invalidate: () => void,
  forceDestination?: "work",
): Promise<THREE.Group | null> {
  if (resources.disposed) return null;
  const request = new AbortController();
  const manager = new THREE.LoadingManager();
  const draco =
    filename === "architecture-baked.glb"
      ? resources.own(
          new DRACOLoader(manager)
            .setDecoderPath("/island/baked/draco/")
            .setWorkerLimit(1),
        )
      : null;
  resources.onDispose(() => {
    request.abort();
    manager.abort();
  });
  const aborted = new Promise<null>((resolve) =>
    request.signal.addEventListener("abort", () => resolve(null), {
      once: true,
    }),
  );
  try {
    const response = await fetch(`/island/baked/${filename}`, {
      signal: request.signal,
    });
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    if (resources.disposed) return null;
    const textures = new Set<THREE.Texture>();
    const images = new Set<ImageBitmap>();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const trackTexture = (texture: THREE.Texture): void => {
      if (textures.has(texture)) return;
      textures.add(texture);
      texture.anisotropy = 4;
      resources.own(texture);
      const image = texture.source.data;
      if (
        typeof ImageBitmap !== "undefined" &&
        image instanceof ImageBitmap &&
        !images.has(image)
      ) {
        images.add(image);
        resources.onDispose(() => image.close());
      }
    };
    const trackMesh = (object: THREE.Object3D): void => {
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        if (!geometries.has(child.geometry)) {
          geometries.add(child.geometry);
          resources.own(child.geometry);
        }
        for (const material of Array.isArray(child.material)
          ? child.material
          : [child.material]) {
          if (!materials.has(material)) {
            materials.add(material);
            resources.own(material);
          }
          for (const value of Object.values(material))
            if (value instanceof THREE.Texture) trackTexture(value);
        }
      });
    };
    const loader = new GLTFLoader(manager);
    if (draco) loader.setDRACOLoader(draco);
    // Own partial parser results too, before the complete GLB graph resolves.
    loader.register((parser) => {
      // Extension textures (including the embedded WebP mineral map) call this
      // public parser method directly, bypassing the default loadTexture hook.
      const loadImage = parser.loadTextureImage.bind(parser);
      parser.loadTextureImage = (...args) =>
        loadImage(...args).then((texture) => {
          trackTexture(texture);
          return texture;
        });
      return {
        name: "PortfolioAssetOwnership",
        loadTexture: (index) =>
          parser.loadTexture(index).then((texture) => {
            trackTexture(texture);
            return texture;
          }),
        loadMesh: (index) =>
          parser.loadMesh(index).then((mesh) => {
            trackMesh(mesh);
            return mesh;
          }),
      };
    });
    // Track even a late parse result after disposal. The race lets view switching
    // complete immediately if a decoder worker was terminated mid-parse.
    const parsed = loader.parseAsync(bytes, "/island/baked/").then((asset) => {
      trackMesh(asset.scene);
      const converted = new Map<string, THREE.Material>();
      asset.scene.traverse((object) => {
        if (forceDestination) object.userData.destination = forceDestination;
        else if (!destinations.has(object.userData.destination))
          delete object.userData.destination;
        if (!(object instanceof THREE.Mesh)) return;
        const list = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of list) {
          if (
            material instanceof THREE.MeshStandardMaterial &&
            material.name.startsWith("Runtime coastal limestone")
          )
            configureCoastalStone(material);
          if (material instanceof THREE.MeshBasicMaterial)
            material.toneMapped = false;
          if (!/^(Gallery|Architecture) baked diffuse/.test(material.name))
            continue;
          const source = material as THREE.MeshStandardMaterial;
          const map = source.map ?? source.emissiveMap;
          const surface = (object.userData.bakedSurface ?? {}) as BakedSurface;
          const roughness = unit(surface.roughness, 1);
          const clearcoat = unit(surface.clearcoat, 0);
          const reflective = clearcoat > 0.1 || roughness < 0.3;
          const key = `${material.uuid}:${reflective ? `${roughness}:${clearcoat}` : "diffuse"}`;
          let baked = converted.get(key);
          if (!baked) {
            // Black base suppresses a second diffuse-light contribution. The
            // emissive atlas supplies baked diffuse; dielectric reflections remain live.
            baked = resources.own(
              reflective
                ? new THREE.MeshPhysicalMaterial({
                    color: 0x000000,
                    emissive: 0xffffff,
                    emissiveMap: map,
                    roughness: clearcoat > 0.1 ? 0.08 : roughness,
                    metalness: 0,
                    clearcoat: clearcoat > 0.1 ? 1 : clearcoat,
                    clearcoatRoughness:
                      clearcoat > 0.1
                        ? 0.07
                        : unit(surface.clearcoatRoughness, 0.16),
                    ior: 1.8,
                    side: material.side,
                    toneMapped: false,
                  })
                : new THREE.MeshBasicMaterial({
                    map,
                    color: 0xffffff,
                    side: material.side,
                    toneMapped: false,
                  }),
            );
            baked.name = reflective
              ? "Baked diffuse with live reflections"
              : "Baked diffuse daylight";
            converted.set(key, baked);
          }
          object.material = Array.isArray(object.material)
            ? object.material.map((item) => (item === material ? baked : item))
            : baked;
        }
        const transparent = list.some((material) => material.transparent);
        object.castShadow = !transparent;
        object.receiveShadow = true;
        object.userData.aoTransparent = transparent;
      });
      if (resources.disposed) return null;
      asset.scene.name = forceDestination
        ? "Gallery with baked physical daylight"
        : "Architecture with baked physical daylight";
      if (forceDestination) asset.scene.userData.destination = forceDestination;
      return asset.scene;
    });
    const group = await Promise.race([parsed, aborted]);
    if (!group || resources.disposed) return null;
    invalidate();
    return group;
  } catch {
    // Optional enhancement: the authored procedural world remains fully usable.
    return null;
  }
}
