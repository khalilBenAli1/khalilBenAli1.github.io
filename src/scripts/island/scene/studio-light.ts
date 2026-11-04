import * as THREE from "three";
import { SceneResources } from "./resources";

/** Warm local light on the actual studio back wall, leaving the exterior atlas intact. */
export function illuminateStudio(
  model: THREE.Group,
  resources: SceneResources,
  invalidate: () => void,
): void {
  model.updateMatrixWorld(true);
  let wall: THREE.Mesh | undefined;
  model.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      object.userData.destination !== "about"
    )
      return;
    const b = new THREE.Box3().setFromObject(object);
    if (
      b.max.x - b.min.x > 4 &&
      b.max.z - b.min.z < 0.25 &&
      b.min.z < -3 &&
      b.max.y - b.min.y > 2
    )
      wall = object;
  });
  if (!wall) return;
  const map = resources.own(
    new THREE.TextureLoader().load("/island/materials/travertine.webp", () => {
      if (!resources.disposed) invalidate();
    }),
  );
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  wall.material = resources.own(
    new THREE.MeshStandardMaterial({
      color: 0xe8cda6,
      map,
      roughness: 0.85,
      emissive: 0xeaa34d,
      emissiveIntensity: 0.08,
    }),
  );
  wall.receiveShadow = true;
  const lamp = resources.own(new THREE.PointLight(0xffc77f, 18, 5, 2));
  lamp.position.set(5.15, 7.18, -1.87);
  // The baked diffuse pass cannot retain the radiance of the original pendant.
  // Restore luminous glass in the visible opening, clear of the olive canopy.
  const bulb = new THREE.Mesh(
    resources.own(new THREE.SphereGeometry(0.19, 20, 12)),
    resources.own(new THREE.MeshBasicMaterial({ color: 0xffe6b1, toneMapped: false })),
  );
  bulb.position.copy(lamp.position);
  bulb.scale.set(1, 0.8, 0.72);
  bulb.userData.skipOfflineExport = true;
  const cord = new THREE.Mesh(
    resources.own(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6)),
    resources.own(new THREE.MeshBasicMaterial({ color: 0x423a2c })),
  );
  cord.position.set(5.15, 7.63, -1.87);
  cord.userData.skipOfflineExport = true;
  model.add(lamp, bulb, cord);
}
