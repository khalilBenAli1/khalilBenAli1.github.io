import * as THREE from "three";
import type {
  Destination,
  IslandExhibitSelection,
  SceneQuality,
  ScreenAsset,
  WorldDestination,
} from "../../../lib/island/types";
import { SceneResources } from "./resources";
import { createMaterials } from "./materials";
import { createArchitecture } from "./architecture";
import { createLandscape } from "./landscape";
import { createWater } from "./water";
import { loadBakedArchitecture } from "./baked";
import { refineGalleryCanopy } from "./canopy";
import { illuminateStudio } from "./studio-light";
import { createExhibits } from "./exhibits";

export interface IslandWorld {
  readonly root: THREE.Group;
  readonly anchors: Readonly<Record<WorldDestination, THREE.Vector3>>;
  readonly pickables: THREE.Object3D[];
  setFocus(destination: WorldDestination | null): void;
  setDestination(destination: Destination): void;
  setProject(selection: IslandExhibitSelection | null): void;
  setMilestone(index: number | null): void;
  update(seconds: number): void;
  releaseReplacedResources(): void;
}

export function createWorld(
  resources: SceneResources,
  quality: SceneQuality,
  screens: readonly ScreenAsset[],
  invalidate: () => void,
  enhancements = true,
): IslandWorld {
  const root = new THREE.Group();
  const architectureResources = resources.own(new SceneResources());
  const materials = createMaterials(architectureResources, invalidate);
  const architecture = createArchitecture(
    architectureResources,
    quality,
    materials,
    screens,
    invalidate,
  );
  architecture.root.userData.bakeRole = "architecture";
  root.add(architecture.root, createLandscape(resources, quality));
  const water = createWater(resources);
  root.add(water.mesh);
  const exhibits = createExhibits(root, resources, invalidate);
  exhibits.bind(architecture.root);
  const pickables: THREE.Object3D[] = [];
  architecture.root.traverse((o) => {
    if (o instanceof THREE.Mesh) pickables.push(o);
  });
  if (enhancements)
    void loadBakedArchitecture(resources, invalidate).then((model) => {
      if (!model || resources.disposed) return;
      refineGalleryCanopy(model, resources, invalidate);
      illuminateStudio(model, resources, invalidate);
      architecture.root.removeFromParent();
      root.add(model);
      exhibits.bind(model);
      pickables.length = 0;
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) pickables.push(object);
      });
      // Keep temporary programs alive until initial async compilation has finished.
      root.userData.bakedArchitecture = true;
      invalidate();
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
    setDestination: exhibits.setDestination,
    setProject: exhibits.setProject,
    setMilestone: exhibits.setMilestone,
    setFocus(destination) {
      if (root.userData.bakedArchitecture) return;
      // Restrained material emphasis; the readable HTML labels carry focus state.
      materials.blue.emissive.set(0x063bff);
      materials.blue.emissiveIntensity = destination === "about" ? 0.12 : 0;
      materials.yellow.emissive.set(0xffbb22);
      materials.yellow.emissiveIntensity = destination === "contact" ? 0.08 : 0;
    },
    update(seconds) {
      water.update(seconds);
      exhibits.update(seconds);
    },
    releaseReplacedResources() {
      if (root.userData.bakedArchitecture)
        resources.release(architectureResources);
      exhibits.releaseReplacedResources();
    },
  };
}
