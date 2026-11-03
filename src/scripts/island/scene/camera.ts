import * as THREE from "three";
import type { Destination, WorldDestination } from "../../../lib/island/types";

/** A single retargetable transition: changing destinations never queues a tour. */
export class IslandCamera {
  readonly camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 100);
  private readonly target = new THREE.Vector3(0, 1.1, 0);
  private readonly from = this.target.clone();
  private readonly to = this.target.clone();
  private readonly direction = new THREE.Vector3(0.85, 0.84, 1.25).normalize();
  private zoomFrom = 1;
  private zoomTo = 1;
  private started = 0;
  private transitioning = false;
  private aspect = 1;

  constructor(
    private readonly anchors: Readonly<Record<WorldDestination, THREE.Vector3>>,
  ) {}

  resize(width: number, height: number): void {
    this.aspect = width / Math.max(1, height);
    this.direction
      .set(
        this.aspect < 0.8 ? 0.55 : 0.85,
        this.aspect < 0.8 ? 1.08 : 0.84,
        1.25,
      )
      .normalize();
    // The fitting is calculated in camera space, so portrait retains all four objects.
    this.place();
    const inverse = this.camera.matrixWorldInverse;
    const bounds = new THREE.Box3();
    for (const x of [-7.4, 7.4])
      for (const y of [-1.8, 4.1])
        for (const z of [-4.7, 4.7]) {
          bounds.expandByPoint(
            new THREE.Vector3(x, y, z).applyMatrix4(inverse),
          );
        }
    const size = bounds.getSize(new THREE.Vector3());
    const halfHeight = Math.max(size.y * 0.57, (size.x * 0.55) / this.aspect);
    this.camera.left = -halfHeight * this.aspect;
    this.camera.right = halfHeight * this.aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.place();
  }

  setDestination(
    destination: Destination,
    instant: boolean,
    now: number,
  ): void {
    this.from.copy(this.target);
    this.zoomFrom = this.camera.zoom;
    this.to.set(0, 1.1, 0);
    if (destination !== "home") {
      const anchor = this.anchors[destination];
      this.to.x = anchor.x * 0.17;
      this.to.z = anchor.z * 0.17;
      this.to.y = 1.15;
    }
    this.zoomTo = destination === "home" ? 1 : 1.06;
    this.started = now;
    this.transitioning = !instant;
    if (instant) this.finish();
  }

  settle(): void {
    this.finish();
  }
  get active(): boolean {
    return this.transitioning;
  }

  update(now: number): void {
    if (!this.transitioning) return;
    const progress = Math.min(1, (now - this.started) / 720);
    const eased = progress * progress * (3 - 2 * progress);
    this.target.lerpVectors(this.from, this.to, eased);
    this.camera.zoom = THREE.MathUtils.lerp(this.zoomFrom, this.zoomTo, eased);
    if (progress >= 1) this.transitioning = false;
    this.camera.updateProjectionMatrix();
    this.place();
  }

  private finish(): void {
    this.transitioning = false;
    this.target.copy(this.to);
    this.camera.zoom = this.zoomTo;
    this.camera.updateProjectionMatrix();
    this.place();
  }

  private place(): void {
    this.camera.position
      .copy(this.direction)
      .multiplyScalar(28)
      .add(this.target);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld(true);
  }
}
