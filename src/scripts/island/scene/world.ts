import * as THREE from "three";
import type {
  SceneQuality,
  ScreenAsset,
  WorldDestination,
} from "../../../lib/island/types";
import { SceneResources } from "./resources";
import { createMaterials } from "./materials";
import { createArchitecture } from "./architecture";
import { createLandscape } from "./landscape";
import { createWater } from "./water";

export interface IslandWorld {
  readonly root: THREE.Group;
  readonly anchors: Readonly<Record<WorldDestination, THREE.Vector3>>;
  readonly pickables: readonly THREE.Object3D[];
  setFocus(destination: WorldDestination | null): void;
  update(seconds: number): void;
}

export function createWorld(
  resources: SceneResources,
  quality: SceneQuality,
  screens: readonly ScreenAsset[],
  invalidate: () => void,
): IslandWorld {
  const root = new THREE.Group(),
    materials = createMaterials(resources, invalidate);
  const architecture = createArchitecture(
    resources,
    quality,
    materials,
    screens,
    invalidate,
  );
  root.add(architecture.root, createLandscape(resources, quality));
  const water = createWater(resources);
  root.add(water.mesh);
  const pickables: THREE.Object3D[] = [];
  architecture.root.traverse((o) => {
    if (o instanceof THREE.Mesh) pickables.push(o);
  });
  return {
    root,
    pickables,
    anchors: {
      work: new THREE.Vector3(-5.0, 8.5, 0.1),
      about: new THREE.Vector3(4.2, 8.9, -1.7),
      experience: new THREE.Vector3(-2.2, 3.8, 3.7),
      contact: new THREE.Vector3(7.3, 5.1, 1.45),
    },
    setFocus(destination) {
      // Restrained material emphasis; the readable HTML labels carry focus state.
      materials.blue.emissive.set(0x063bff);
      materials.blue.emissiveIntensity = destination === "about" ? 0.12 : 0;
      materials.yellow.emissive.set(0xffbb22);
      materials.yellow.emissiveIntensity = destination === "contact" ? 0.08 : 0;
    },
    update(seconds) {
      water.update(seconds);
    },
  };
}
