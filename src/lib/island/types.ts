import type { Locale } from "../i18n";

export const destinations = [
  "home",
  "work",
  "about",
  "experience",
  "contact",
] as const;
export type Destination = (typeof destinations)[number];
export type WorldDestination = Exclude<Destination, "home">;
export const sectors = [
  "all",
  "hospitality",
  "luxury",
  "beauty",
  "business",
  "architecture",
  "travel",
  "systems",
] as const;
export type Sector = (typeof sectors)[number];

export interface IslandProject {
  readonly id: string;
  readonly name: string;
  readonly kind: "frontend" | "professional";
  readonly sector: Exclude<Sector, "all">;
  /** Preserve the original translated sector independently of filter grouping. */
  readonly sectorLabel?: Readonly<Record<Locale, string>>;
  readonly year: string | null;
  readonly description: Readonly<Record<Locale, string>>;
  readonly technologies: readonly string[];
  readonly highlights: Readonly<Record<Locale, readonly string[]>>;
  readonly image?: string;
  readonly demo?: string;
  readonly source?: string;
  readonly client?: string;
  readonly production?: boolean;
  readonly diagram?: "cuddy" | "lor" | "meeting" | "scanner" | "audio";
}

export interface IslandRoute {
  readonly destination: Destination;
  readonly sector: Sector;
  readonly projectId: string | null;
  readonly aboutSection: "ai" | "skills" | null;
}
export type ViewPreference = "auto" | "3d" | "lite";
export type MotionPreference = "system" | "off";
export interface IslandPreferences {
  readonly version: 1;
  readonly view: ViewPreference;
  readonly motion: MotionPreference;
}

export interface ScreenAsset {
  readonly src: string;
  readonly label: string;
  readonly sector: Exclude<Sector, "all">;
}
export interface ProjectedHotspot {
  readonly destination: WorldDestination;
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
}
export type SceneQuality = "low" | "high";
export type SceneStatus =
  "loading" | "ready" | "unsupported" | "lost" | "disposed";
export interface SceneMetrics {
  readonly status: SceneStatus;
  readonly frames: number;
  readonly schedulerStarts: number;
  readonly loopActive: boolean;
  readonly drawCalls: number;
  readonly triangles: number;
  readonly textures: number;
  readonly geometries: number;
  readonly pixelRatio: number;
  readonly width: number;
  readonly height: number;
  readonly quality: SceneQuality;
  readonly startupMs: number;
  readonly renderCpuMs: number;
}
export interface IslandSceneOptions {
  readonly canvas: HTMLCanvasElement;
  readonly screens: readonly ScreenAsset[];
  readonly initialDestination: Destination;
  readonly quality: SceneQuality;
  readonly motion: boolean;
  readonly signal: AbortSignal;
  readonly onActivate: (destination: WorldDestination) => void;
  readonly onHotspots?: (points: readonly ProjectedHotspot[]) => void;
  readonly onStatus?: (status: SceneStatus) => void;
}
export interface IslandSceneHandle {
  setDestination(destination: Destination, instant?: boolean): void;
  setMotion(enabled: boolean): void;
  setFocus(destination: WorldDestination | null): void;
  resize(): void;
  getMetrics(): SceneMetrics;
  dispose(): void;
}
