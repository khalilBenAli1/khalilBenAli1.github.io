import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type {
  SceneQuality,
  ScreenAsset,
  WorldDestination,
} from "../../../lib/island/types";
import { SceneResources } from "./resources";

export interface IslandWorld {
  readonly root: THREE.Group;
  readonly anchors: Readonly<Record<WorldDestination, THREE.Vector3>>;
  readonly pickables: readonly THREE.Object3D[];
  setFocus(destination: WorldDestination | null): void;
  update(seconds: number): void;
}

const COLORS = {
  stone: 0xd9c9ac,
  pale: 0xf3e8d2,
  ink: 0x232b32,
  blue: 0x244bf3,
  citrus: 0xe5ef56,
};

export function createWorld(
  resources: SceneResources,
  quality: SceneQuality,
  screens: readonly ScreenAsset[],
  invalidate: () => void,
): IslandWorld {
  const root = new THREE.Group();
  const pickables: THREE.Object3D[] = [];
  const focusMaterials = new Map<
    WorldDestination,
    THREE.MeshStandardMaterial
  >();
  const material = (color: number, roughness = 0.7, metalness = 0) =>
    resources.own(
      new THREE.MeshStandardMaterial({ color, roughness, metalness }),
    );
  const stone = material(COLORS.stone, 0.92);
  const pale = material(COLORS.pale, 0.84);
  const ink = material(COLORS.ink, 0.52, 0.12);
  const blue = material(COLORS.blue, 0.35, 0.13);
  const citrus = material(COLORS.citrus, 0.48);
  const bronze = material(0x9e8b5c, 0.43, 0.6);
  const flatBox = resources.own(new THREE.BoxGeometry(1, 1, 1));

  function box(
    parent: THREE.Object3D,
    size: readonly number[],
    position: readonly number[],
    mat: THREE.Material,
    round = false,
    casts = true,
  ): THREE.Mesh {
    const geometry = round
      ? resources.own(
          new RoundedBoxGeometry(
            size[0],
            size[1],
            size[2],
            1,
            Math.min(...size) * 0.1,
          ),
        )
      : flatBox;
    const mesh = new THREE.Mesh(geometry, mat);
    if (!round) mesh.scale.set(size[0], size[1], size[2]);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = casts;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function contour(
    scale: number,
    depth: number,
    bottom: number,
    mat: THREE.Material,
  ): void {
    const shape = new THREE.Shape();
    shape.moveTo(-5.9, -3.1);
    shape.bezierCurveTo(-4.1, -4.8, 1.7, -4.6, 5.6, -2.9);
    shape.bezierCurveTo(7.3, -1.8, 7.0, 1.8, 5.1, 3.2);
    shape.bezierCurveTo(2.7, 4.6, -2.8, 4.2, -5.7, 2.4);
    shape.bezierCurveTo(-7.4, 1.1, -7.4, -1.7, -5.9, -3.1);
    const geometry = resources.own(
      new THREE.ExtrudeGeometry(shape, {
        depth,
        steps: 1,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.12,
        bevelThickness: 0.09,
        curveSegments: quality === "high" ? 18 : 10,
      }),
    );
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.scale.set(scale, 1, scale);
    mesh.position.y = bottom;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  // The broad bevels and dark, inset strata make a physical floating landform.
  contour(0.89, 0.38, -1.0, ink);
  contour(0.96, 0.35, -0.64, stone);
  contour(1, 0.35, -0.23, pale);
  contour(0.985, 0.09, 0.14, stone);
  const underside = box(root, [5.6, 0.62, 3.7], [0.15, -1.16, 0.1], ink, true);
  underside.rotation.y = -0.12;

  // A recessed, architectural path ties the four exhibits into one place.
  const pathGeometry = resources.own(new THREE.RingGeometry(2.7, 2.74, 64));
  pathGeometry.rotateX(-Math.PI / 2);
  const path = new THREE.Mesh(pathGeometry, bronze);
  path.scale.set(1.52, 1, 0.89);
  path.position.set(0, 0.335, 0);
  root.add(path);
  for (let index = 0; index < 4; index++) {
    const step = box(
      root,
      [1.0, 0.055, 0.14],
      [-0.9 + index * 0.6, 0.35, 2.95],
      pale,
      false,
      false,
    );
    step.rotation.y = -0.22;
  }

  function destination(
    id: WorldDestination,
    x: number,
    z: number,
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0.34, z);
    group.userData.destination = id;
    root.add(group);
    const focus = material(COLORS.blue, 0.36, 0.12);
    focus.emissive.set(COLORS.blue);
    focus.emissiveIntensity = 0.025;
    focusMaterials.set(id, focus);
    return group;
  }

  const gallery = destination("work", -2.35, -1.95);
  gallery.rotation.y = 0.2;
  box(gallery, [7.1, 0.2, 1.7], [0, 0.1, 0.1], ink, true);
  box(
    gallery,
    [7.1, 2.85, 0.32],
    [0, 1.55, -0.3],
    focusMaterials.get("work")!,
    true,
  );
  box(gallery, [7.1, 0.1, 0.62], [0, 3.02, -0.2], blue, true);
  box(gallery, [0.09, 2.3, 0.08], [-3.24, 1.55, -0.04], citrus, false, false);

  function placeholder(index: number): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 360;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = index === 1 ? "#e6dfcc" : "#292e32";
      context.fillRect(0, 0, 512, 360);
      context.fillStyle = index === 1 ? "#232b32" : "#eee7d8";
      context.font = "500 20px sans-serif";
      context.fillText("SELECTED WORK", 30, 52);
      context.font = "500 115px sans-serif";
      context.fillText(`0${index + 1}`, 25, 225);
      context.fillStyle = "#e5ef56";
      context.fillRect(30, 295, 452, 3);
    }
    const texture = resources.own(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  for (let index = 0; index < 3; index++) {
    const x = (index - 1) * 2.24;
    box(gallery, [2.11, 1.91, 0.15], [x, 1.64, -0.045], ink, true);
    const screenMaterial = resources.own(
      new THREE.MeshBasicMaterial({
        map: placeholder(index),
        toneMapped: false,
      }),
    );
    const screen = new THREE.Mesh(
      resources.own(new THREE.PlaneGeometry(1.94, 1.71)),
      screenMaterial,
    );
    screen.position.set(x, 1.64, 0.04);
    gallery.add(screen);
    const asset = screens[index];
    if (!asset) continue;
    const image = new Image();
    image.decoding = "async";
    const clear = (): void => {
      image.onload = null;
      image.onerror = null;
    };
    resources.onDispose(() => {
      clear();
      image.removeAttribute("src");
    });
    image.onload = (): void => {
      clear();
      if (resources.disposed) return;
      let source: HTMLImageElement | HTMLCanvasElement = image;
      const scale = Math.min(
        1,
        1024 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      if (scale < 1) {
        const resized = document.createElement("canvas");
        resized.width = Math.max(1, Math.round(image.naturalWidth * scale));
        resized.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = resized.getContext("2d");
        if (!context) return;
        context.drawImage(image, 0, 0, resized.width, resized.height);
        source = resized;
      }
      const texture = resources.own(new THREE.Texture(source));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = quality === "high" ? 4 : 2;
      // Preserve the full real screenshot; the dark frame contains letterboxing.
      const aspect = image.naturalWidth / image.naturalHeight;
      const frameAspect = 1.94 / 1.71;
      if (aspect > frameAspect) screen.scale.y = frameAspect / aspect;
      else screen.scale.x = aspect / frameAspect;
      texture.needsUpdate = true;
      const previous = screenMaterial.map;
      screenMaterial.map = texture;
      if (previous) resources.release(previous);
      screenMaterial.needsUpdate = true;
      invalidate();
    };
    image.onerror = clear; // The deliberately designed numbered exhibit stays usable.
    image.src = asset.src;
  }

  // A carved studio portal is the About object, rather than another screen.
  const studio = destination("about", 3.35, -1.45);
  studio.rotation.y = -0.15;
  box(studio, [3.1, 0.2, 2.5], [0, 0.1, 0], pale, true);
  const arch = new THREE.Shape();
  arch.moveTo(-1.35, 0);
  arch.lineTo(-1.35, 1.8);
  arch.absarc(0, 1.8, 1.35, Math.PI, 0, true);
  arch.lineTo(1.35, 0);
  arch.lineTo(0.79, 0);
  arch.lineTo(0.79, 1.76);
  arch.absarc(0, 1.76, 0.79, 0, Math.PI, false);
  arch.lineTo(-0.79, 0);
  arch.lineTo(-1.35, 0);
  const archGeometry = resources.own(
    new THREE.ExtrudeGeometry(arch, {
      depth: 0.7,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      curveSegments: quality === "high" ? 24 : 14,
      steps: 1,
    }),
  );
  const portal = new THREE.Mesh(archGeometry, pale);
  portal.position.set(0, 0.2, -0.7);
  portal.castShadow = true;
  portal.receiveShadow = true;
  studio.add(portal);
  const monolith = box(
    studio,
    [0.58, 1.48, 0.58],
    [0, 1, 0.15],
    focusMaterials.get("about")!,
    true,
  );
  monolith.rotation.y = Math.PI / 4;
  box(studio, [1.25, 0.1, 1.1], [0, 0.28, 0.15], ink, true);
  const orb = new THREE.Mesh(
    resources.own(new THREE.SphereGeometry(0.28, 20, 12)),
    citrus,
  );
  orb.position.set(0, 1.98, 0.15);
  orb.castShadow = true;
  studio.add(orb);

  // Timeline heights create an ascending physical installation.
  const timeline = destination("experience", -3.25, 2.05);
  timeline.rotation.y = 0.13;
  box(timeline, [4.0, 0.14, 1.45], [0, 0.07, 0], pale, true);
  const heights = [0.6, 0.96, 1.35, 1.9];
  heights.forEach((height, index) => {
    box(
      timeline,
      [0.54, height, 0.65],
      [-1.35 + index * 0.9, height / 2 + 0.14, 0],
      index === 3 ? focusMaterials.get("experience")! : stone,
      true,
    );
    box(
      timeline,
      [0.57, 0.055, 0.68],
      [-1.35 + index * 0.9, height + 0.17, 0],
      index === 3 ? citrus : bronze,
      false,
      false,
    );
  });

  // Contact is a freestanding blue kiosk with a luminous citrus address plate.
  const contact = destination("contact", 3.5, 2.1);
  contact.rotation.y = -0.25;
  box(contact, [2.1, 0.18, 1.9], [0, 0.09, 0], ink, true);
  box(
    contact,
    [1.18, 2.0, 0.82],
    [0, 1.17, 0],
    focusMaterials.get("contact")!,
    true,
  );
  const head = box(contact, [1.8, 0.78, 0.98], [0, 2.27, 0.09], blue, true);
  head.rotation.x = -0.12;
  box(contact, [1.42, 0.38, 0.035], [0, 2.29, 0.61], citrus, true, false);
  box(contact, [0.68, 0.055, 0.04], [0, 2.29, 0.64], ink, false, false);
  box(contact, [0.5, 0.13, 0.16], [0, 1.36, 0.48], pale, true, false);

  for (const group of [gallery, studio, timeline, contact]) {
    const id = group.userData.destination as WorldDestination;
    group.traverse((object) => {
      object.userData.destination = id;
      if (object instanceof THREE.Mesh) pickables.push(object);
    });
  }

  return {
    root,
    pickables,
    anchors: {
      work: new THREE.Vector3(-2.75, 3.65, -1.8),
      about: new THREE.Vector3(3.45, 3.95, -1.45),
      experience: new THREE.Vector3(-3.4, 2.75, 2.1),
      contact: new THREE.Vector3(3.5, 3.3, 2.1),
    },
    setFocus(destination): void {
      for (const [id, mat] of focusMaterials)
        mat.emissiveIntensity = id === destination ? 0.38 : 0.025;
    },
    update(seconds): void {
      root.position.y = Math.sin(seconds * 0.65) * 0.045;
    },
  };
}
