import * as THREE from "three";
import type {
  Destination,
  IslandExhibitSelection,
} from "../../../lib/island/types";
import { SceneResources } from "./resources";

type DisplayMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
type DisplayBinding = {
  mesh: DisplayMesh;
  original: THREE.MeshBasicMaterial;
  originalMap: THREE.Texture | null;
  selected: THREE.MeshBasicMaterial | null;
};
type ImageRequest = { image: HTMLImageElement; cancel(): void };

const sameSelection = (
  a: IslandExhibitSelection | null,
  b: IslandExhibitSelection | null,
): boolean => a?.id === b?.id && a?.src === b?.src && a?.label === b?.label;

/** Content remains HTML-owned; these objects reflect the currently selected content. */
export function createExhibits(
  root: THREE.Group,
  resources: SceneResources,
  invalidate: () => void,
) {
  const decoration = new THREE.Group();
  decoration.name = "Portfolio content exhibits";
  decoration.userData.bakeRole = "exhibit";
  decoration.userData.skipOfflineExport = true;
  root.add(decoration);
  root.userData.activeMilestone = null;

  let binding: DisplayBinding | null = null;
  let selection: IslandExhibitSelection | null = null;
  let paintedSelection: IslandExhibitSelection | null = null;
  let displayCanvas: HTMLCanvasElement | null = null;
  let displayTexture: THREE.CanvasTexture | null = null;
  let projectRequest: ImageRequest | null = null;
  let projectGeneration = 0;
  const retiredMaterials: THREE.Material[] = [];
  let portraitRequest: ImageRequest | null = null;
  let portraitImage: HTMLImageElement | null = null;
  let portrait: THREE.Group | null = null;
  let marker: THREE.Group | null = null;
  let halo: THREE.Mesh | null = null;
  let haloMaterial: THREE.MeshBasicMaterial | null = null;
  let markerIndex: number | null = null;

  function imageRequest(
    src: string,
    loaded: (image: HTMLImageElement) => void,
    failed: () => void,
  ): ImageRequest {
    const image = new Image();
    image.decoding = "async";
    if (
      /^https?:/i.test(src) &&
      new URL(src, location.href).origin !== location.origin
    )
      image.crossOrigin = "anonymous";
    let cancelled = false;
    const clearHandlers = () => {
      image.onload = null;
      image.onerror = null;
    };
    image.onload = () => {
      clearHandlers();
      if (!cancelled && !resources.disposed) loaded(image);
    };
    image.onerror = () => {
      clearHandlers();
      if (!cancelled && !resources.disposed) failed();
    };
    image.src = src;
    return {
      image,
      cancel() {
        cancelled = true;
        clearHandlers();
        image.removeAttribute("src");
      },
    };
  }

  function restoreDisplay(): void {
    if (binding) {
      binding.mesh.material = binding.original;
      if (binding.selected) binding.selected.map = binding.originalMap;
    }
    delete root.userData.exhibitId;
  }

  function applyDisplay(): void {
    if (
      !binding ||
      !displayTexture ||
      !selection ||
      !sameSelection(selection, paintedSelection)
    )
      return;
    if (!binding.selected)
      binding.selected = resources.own(binding.original.clone());
    if (binding.selected.map !== displayTexture) {
      binding.selected.map = displayTexture;
      binding.selected.needsUpdate = true;
    }
    binding.selected.toneMapped = false;
    binding.mesh.material = binding.selected;
    root.userData.exhibitId = selection.id;
    invalidate();
  }

  function paintProject(
    image: HTMLImageElement,
    current: IslandExhibitSelection,
  ): boolean {
    const width = image.naturalWidth,
      height = image.naturalHeight;
    if (!width || !height) return false;
    if (!displayCanvas) {
      displayCanvas = document.createElement("canvas");
      displayCanvas.width = 768;
      displayCanvas.height = 760;
    }
    const context = displayCanvas.getContext("2d");
    if (!context) return false;
    context.fillStyle = "#f4eee4";
    context.fillRect(0, 0, 768, 760);
    context.fillStyle = "#181a18";
    let fontSize = 48;
    do {
      context.font = `600 ${fontSize}px Arial, sans-serif`;
      if (context.measureText(current.label).width <= 704) break;
      fontSize -= 2;
    } while (fontSize > 24);
    context.textBaseline = "middle";
    context.fillText(current.label, 32, 49, 704);
    const scale = Math.min(724 / width, 624 / height);
    const drawnWidth = width * scale,
      drawnHeight = height * scale;
    context.drawImage(
      image,
      (768 - drawnWidth) / 2,
      108 + (624 - drawnHeight) / 2,
      drawnWidth,
      drawnHeight,
    );
    if (!displayTexture) {
      displayTexture = resources.own(new THREE.CanvasTexture(displayCanvas));
      displayTexture.colorSpace = THREE.SRGBColorSpace;
      displayTexture.anisotropy = 4;
      // New canvas pixels use the original procedural PlaneGeometry orientation.
      // The GLB's literal PNGs were vertically flipped during export; its UV0 is unchanged.
      displayTexture.flipY = true;
    }
    displayTexture.needsUpdate = true;
    paintedSelection = current;
    return true;
  }

  function loadProject(): void {
    if (!selection || projectRequest || resources.disposed) return;
    if (sameSelection(selection, paintedSelection)) {
      applyDisplay();
      return;
    }
    const current = selection;
    const generation = ++projectGeneration;
    projectRequest = imageRequest(
      current.src,
      (image) => {
        projectRequest = null;
        if (
          generation !== projectGeneration ||
          !sameSelection(current, selection)
        )
          return;
        try {
          if (paintProject(image, current)) applyDisplay();
        } catch {
          // Unsupported/tainted images leave the genuine original display intact.
        } finally {
          image.removeAttribute("src");
        }
      },
      () => {
        if (generation === projectGeneration) projectRequest = null;
      },
    );
  }

  function bind(model: THREE.Object3D): void {
    if (resources.disposed) return;
    model.updateWorldMatrix(true, true);
    const displays: { mesh: DisplayMesh; x: number }[] = [];
    model.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh) ||
        object.userData.destination !== "work" ||
        !(object.material instanceof THREE.MeshBasicMaterial) ||
        object.material.transparent
      )
        return;
      object.geometry.computeBoundingBox();
      const bounds = object.geometry
        .boundingBox!.clone()
        .applyMatrix4(object.matrixWorld);
      const size = bounds.getSize(new THREE.Vector3());
      if (
        size.x >= 2 &&
        size.x <= 3.1 &&
        size.y >= 2 &&
        size.y <= 3 &&
        size.z < 0.1
      )
        displays.push({
          mesh: object as DisplayMesh,
          x: bounds.getCenter(new THREE.Vector3()).x,
        });
    });
    displays.sort((a, b) => a.x - b.x);
    const centre = displays.length === 3 ? displays[1].mesh : null;
    if (binding?.mesh === centre) {
      loadProject();
      return;
    }
    restoreDisplay();
    if (binding?.selected) retiredMaterials.push(binding.selected);
    binding = centre
      ? {
          mesh: centre,
          original: centre.material,
          originalMap: centre.material.map,
          selected: null,
        }
      : null;
    if (selection) loadProject();
  }

  function setProject(next: IslandExhibitSelection | null): void {
    if (resources.disposed) return;
    const valid =
      next?.id && next.src
        ? { id: next.id, src: next.src, label: next.label }
        : null;
    if (sameSelection(selection, valid)) {
      if (valid) loadProject();
      return;
    }
    projectGeneration++;
    projectRequest?.cancel();
    projectRequest = null;
    selection = valid;
    restoreDisplay();
    if (selection) loadProject();
    else paintedSelection = null;
    invalidate();
  }

  function makePortrait(image: HTMLImageElement): void {
    const group = new THREE.Group();
    group.name = "Khalil Ben Ali studio portrait";
    group.position.set(6.05, 7.1, -3.18);
    group.userData.destination = "about";
    const frame = new THREE.Mesh(
      resources.own(new THREE.BoxGeometry(1.02, 1.02, 0.07)),
      resources.own(
        new THREE.MeshStandardMaterial({
          color: 0x302e29,
          roughness: 0.55,
          metalness: 0.25,
        }),
      ),
    );
    const matte = new THREE.Mesh(
      resources.own(new THREE.PlaneGeometry(0.95, 0.95)),
      resources.own(
        new THREE.MeshStandardMaterial({ color: 0xf5ecdc, roughness: 0.8 }),
      ),
    );
    matte.position.z = 0.037;
    const texture = resources.own(new THREE.Texture(image));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    const photo = new THREE.Mesh(
      resources.own(new THREE.PlaneGeometry(0.84, 0.84)),
      resources.own(
        new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
      ),
    );
    photo.name = "Original /khalil.jpg portrait";
    photo.position.z = 0.04;
    group.add(frame, matte, photo);
    group.traverse((object) => {
      object.userData.destination = "about";
      object.raycast = () => {};
    });
    decoration.add(group);
    portrait = group;
    portraitImage = image;
    root.userData.studioPortraitReady = true;
    invalidate();
  }

  function loadPortrait(): void {
    if (portrait || portraitRequest || resources.disposed) return;
    portraitRequest = imageRequest(
      "/khalil.jpg",
      (image) => {
        portraitRequest = null;
        if (image.naturalWidth && image.naturalHeight) makePortrait(image);
      },
      () => {
        portraitRequest = null;
      },
    );
  }

  function makeMarker(): void {
    marker = new THREE.Group();
    marker.name = "Selected career milestone";
    haloMaterial = resources.own(
      new THREE.MeshBasicMaterial({
        color: 0x1238ff,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    halo = new THREE.Mesh(
      resources.own(new THREE.RingGeometry(0.13, 0.25, 40)),
      haloMaterial,
    );
    halo.rotation.x = -Math.PI / 2;
    const orb = new THREE.Mesh(
      resources.own(new THREE.SphereGeometry(0.105, 16, 10)),
      resources.own(
        new THREE.MeshBasicMaterial({ color: 0x1238ff, toneMapped: false }),
      ),
    );
    const beam = new THREE.Mesh(
      resources.own(new THREE.CylinderGeometry(0.015, 0.03, 0.48, 12)),
      resources.own(
        new THREE.MeshBasicMaterial({
          color: 0x1238ff,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          toneMapped: false,
        }),
      ),
    );
    beam.position.y = 0.27;
    marker.add(halo, orb, beam);
    marker.traverse((object) => {
      object.raycast = () => {};
    });
    decoration.add(marker);
  }

  function update(seconds: number): void {
    if (!marker?.visible || !halo || !haloMaterial) return;
    const pulse = (Math.sin(seconds * 2.4) + 1) * 0.5;
    halo.scale.setScalar(1 + pulse * 0.12);
    haloMaterial.opacity = 0.64 + pulse * 0.24;
  }

  function setMilestone(index: number | null): void {
    if (resources.disposed) return;
    const next =
      index !== null && Number.isInteger(index) && index >= 0 && index < 4
        ? index
        : null;
    if (markerIndex === next) return;
    markerIndex = next;
    root.userData.activeMilestone = next;
    if (next === null) {
      if (marker) marker.visible = false;
    } else {
      if (!marker) makeMarker();
      marker!.position.set(-4.05 + next * 1.47, 1.6 + next * 0.25, 3.81);
      marker!.visible = true;
      update(0);
    }
    invalidate();
  }

  resources.onDispose(() => {
    projectGeneration++;
    projectRequest?.cancel();
    portraitRequest?.cancel();
    portraitImage?.removeAttribute("src");
    projectRequest = portraitRequest = null;
    portraitImage = null;
    selection = paintedSelection = null;
    binding = null;
    if (displayCanvas) displayCanvas.width = displayCanvas.height = 1;
    decoration.removeFromParent();
    delete root.userData.exhibitId;
    delete root.userData.studioPortraitReady;
    root.userData.activeMilestone = null;
  });

  return {
    bind,
    setProject,
    setMilestone,
    setDestination(destination: Destination): void {
      if (resources.disposed) return;
      if (destination === "about") loadPortrait();
      if (destination !== "experience") setMilestone(null);
    },
    update,
    releaseReplacedResources(): void {
      for (const material of retiredMaterials) resources.release(material);
      retiredMaterials.length = 0;
    },
  };
}
