import * as THREE from "three";
import type { Destination, WorldDestination } from "../../../lib/island/types";

type Point = readonly [number, number, number];
interface CameraPose {
  readonly target: Point;
  readonly direction: Point;
  readonly zoom: number;
  readonly bounds: readonly [Point, Point] | null;
}

// The bounds describe each authored room, rather than the complete island.
// Keep them aligned with architecture.ts when changing a building's silhouette.
const ROOMS: Readonly<Record<Destination, CameraPose>> = {
  home: {
    target: [-0.35, 3.65, 0.7],
    direction: [0.32, 0.42, 1],
    zoom: 1,
    bounds: null,
  },
  work: {
    target: [-3.15, 4.55, -0.45],
    direction: [0.1, 0.32, 1],
    zoom: 1.85,
    bounds: [
      [-8.05, 3.05, -2.05],
      [1.65, 6.8, 1.05],
    ],
  },
  about: {
    target: [5.35, 6.7, -2],
    direction: [0.25, 0.22, 1],
    zoom: 2.7,
    bounds: [
      [3.38, 5.28, -3.55],
      [8.35, 9.18, -1.05],
    ],
  },
  experience: {
    target: [-1, 2.6, 3.3],
    direction: [0.22, 0.36, 1],
    zoom: 2.6,
    bounds: [
      [-4.45, 1.14, 3],
      [2.12, 3.9, 4.65],
    ],
  },
  contact: {
    target: [7.1, 3.4, 1.15],
    direction: [0.45, 0.2, 1],
    zoom: 3.8,
    bounds: [
      [5.75, 2.02, 0.18],
      [8.88, 4.85, 3.15],
    ],
  },
};

const PROJECT: CameraPose = {
  target: [-3.2, 4.8, -1.1],
  direction: [0.05, 0.18, 1],
  zoom: 3.1,
  bounds: [
    [-4.72, 3.18, -1.45],
    [-1.68, 6.3, -0.65],
  ],
};

/** One retargetable room journey; new selections never queue a camera tour. */
export class IslandCamera {
  readonly camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 100);
  private readonly target = new THREE.Vector3(...ROOMS.home.target);
  private readonly from = this.target.clone();
  private readonly to = this.target.clone();
  private readonly direction = new THREE.Vector3(
    ...ROOMS.home.direction,
  ).normalize();
  private readonly directionFrom = this.direction.clone();
  private readonly directionTo = this.direction.clone();
  private zoomFrom = 1;
  private zoomTo = 1;
  private bias = 0;
  private biasFrom = 0;
  private biasTo = 0;
  private started = 0;
  private duration = 1250;
  private transitioning = false;
  private aspect = 1;
  private docked = false;
  private destination: Destination = "home";
  private project = false;
  private milestone: number | null = null;

  // Preserve the scene constructor contract; label anchors are not room centres.
  constructor(_anchors: Readonly<Record<WorldDestination, THREE.Vector3>>) {}

  resize(width: number, height: number, docked = false): void {
    this.aspect = Math.max(1, width) / Math.max(1, height);
    this.docked = docked;
    this.zoomTo = this.fitZoom(this.pose());
    this.biasTo = this.requestedBias();
    if (!this.transitioning) {
      this.camera.zoom = this.zoomTo;
      this.bias = this.biasTo;
    }
    this.frame();
    this.place();
  }

  setDestination(
    destination: Destination,
    instant: boolean,
    now: number,
  ): void {
    this.destination = destination;
    this.project = false;
    this.milestone = null;
    this.retarget(instant, now);
  }

  setProject(active: boolean, instant: boolean, now: number): void {
    const next = active && this.destination === "work";
    if (this.project === next) return;
    this.project = next;
    if (this.destination === "work") this.retarget(instant, now);
  }

  setMilestone(index: number | null, instant: boolean, now: number): void {
    const next =
      this.destination === "experience" &&
      index !== null &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < 4
        ? index
        : null;
    if (this.milestone === next) return;
    this.milestone = next;
    if (this.destination === "experience") this.retarget(instant, now);
  }

  settle(): void {
    this.finish();
  }

  get active(): boolean {
    return this.transitioning;
  }

  update(now: number): void {
    if (!this.transitioning) return;
    const progress = THREE.MathUtils.clamp(
      (now - this.started) / this.duration,
      0,
      1,
    );
    const eased =
      progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
    this.target.lerpVectors(this.from, this.to, eased);
    this.direction
      .lerpVectors(this.directionFrom, this.directionTo, eased)
      .normalize();
    this.camera.zoom = THREE.MathUtils.lerp(this.zoomFrom, this.zoomTo, eased);
    this.bias = THREE.MathUtils.lerp(this.biasFrom, this.biasTo, eased);
    if (progress >= 1) this.transitioning = false;
    this.frame();
    this.place();
  }

  private pose(): CameraPose {
    if (this.destination === "work" && this.project) return PROJECT;
    if (this.destination === "experience" && this.milestone !== null) {
      const x = -3.65 + this.milestone * 1.47;
      const rise = this.milestone * 0.25;
      return {
        target: [x, 2.2 + rise, 3.95],
        direction: [0.12, 0.25, 1],
        zoom: 4.5,
        bounds: [
          [x - 0.86, 1.18 + rise, 3.15],
          [x + 0.86, 3.3 + rise, 4.6],
        ],
      };
    }
    return ROOMS[this.destination];
  }

  private retarget(instant: boolean, now: number): void {
    // Sample the interrupted journey before changing its destination vectors.
    this.update(now);
    const pose = this.pose();
    this.from.copy(this.target);
    this.directionFrom.copy(this.direction);
    this.zoomFrom = this.camera.zoom;
    this.biasFrom = this.bias;
    this.to.set(...pose.target);
    this.directionTo.set(...pose.direction).normalize();
    this.zoomTo = this.fitZoom(pose);
    this.biasTo = this.requestedBias();
    this.duration = THREE.MathUtils.clamp(
      1100 +
        this.from.distanceTo(this.to) * 35 +
        Math.abs(this.zoomFrom - this.zoomTo) * 70,
      1100,
      1400,
    );
    this.started = now;
    const changed =
      this.from.distanceToSquared(this.to) > 1e-8 ||
      this.directionFrom.distanceToSquared(this.directionTo) > 1e-8 ||
      Math.abs(this.zoomFrom - this.zoomTo) > 1e-5 ||
      Math.abs(this.biasFrom - this.biasTo) > 1e-5;
    this.transitioning = !instant && changed;
    if (!this.transitioning) this.finish();
  }

  private requestedBias(): number {
    return this.destination !== "home" && this.docked ? 0.16 : 0;
  }

  private fitZoom(pose: CameraPose): number {
    if (!pose.bounds) return 1;
    const direction = new THREE.Vector3(...pose.direction).normalize();
    const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    const up = direction.clone().cross(right).normalize();
    const target = new THREE.Vector3(...pose.target);
    const point = new THREE.Vector3();
    let extentX = 0;
    let extentY = 0;
    for (const x of [pose.bounds[0][0], pose.bounds[1][0]])
      for (const y of [pose.bounds[0][1], pose.bounds[1][1]])
        for (const z of [pose.bounds[0][2], pose.bounds[1][2]]) {
          point.set(x, y, z).sub(target);
          extentX = Math.max(extentX, Math.abs(point.dot(right)));
          extentY = Math.max(extentY, Math.abs(point.dot(up)));
        }
    const halfHeight = Math.max(5.8, 9.8 / this.aspect);
    const halfWidth = halfHeight * this.aspect;
    // A docked reading panel covers the right 16% of the canvas. Centre the room
    // within the remaining 84%, with a margin on both sides of that usable area.
    const horizontalRoom = 0.94 - this.requestedBias();
    return Math.min(
      pose.zoom,
      (halfWidth * horizontalRoom) / Math.max(0.1, extentX),
      (halfHeight * 0.94) / Math.max(0.1, extentY),
    );
  }

  private frame(): void {
    const halfHeight = Math.max(5.8, 9.8 / this.aspect);
    const halfWidth = halfHeight * this.aspect;
    // Orthographic zoom preserves the frustum centre, so compensate the bias by
    // zoom to hold the room centre at 42% of the canvas throughout the journey.
    const offset = (this.bias * halfWidth) / this.camera.zoom;
    this.camera.left = -halfWidth + offset;
    this.camera.right = halfWidth + offset;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  private finish(): void {
    this.transitioning = false;
    this.target.copy(this.to);
    this.direction.copy(this.directionTo);
    this.camera.zoom = this.zoomTo;
    this.bias = this.biasTo;
    this.frame();
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
