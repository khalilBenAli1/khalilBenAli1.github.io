import type { IslandPreferences, SceneQuality, ViewPreference } from "./types";

export const PREFERENCE_KEY = "kb.creative-island.preferences.v1";
export const defaultPreferences = (): IslandPreferences => ({
  version: 1,
  view: "auto",
  motion: "system",
});
export function parsePreferences(raw: string | null): IslandPreferences {
  if (!raw || raw.length > 2048) return defaultPreferences();
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value))
      return defaultPreferences();
    const record = value as Record<string, unknown>;
    if (
      Object.keys(record).length !== 3 ||
      record.version !== 1 ||
      !["auto", "3d", "lite"].includes(String(record.view)) ||
      !["system", "off"].includes(String(record.motion))
    )
      return defaultPreferences();
    return {
      version: 1,
      view: record.view as ViewPreference,
      motion: record.motion as "system" | "off",
    };
  } catch {
    return defaultPreferences();
  }
}
export interface DeviceCapabilities {
  readonly width: number;
  readonly coarse: boolean;
  readonly saveData: boolean;
  readonly cores: number;
  readonly reduced: boolean;
}
export function resolvePresentation(
  preferences: IslandPreferences,
  device: DeviceCapabilities,
  override?: string | null,
): { view: "3d" | "lite"; quality: SceneQuality; motion: boolean } {
  const low =
    device.width < 761 || device.coarse || device.saveData || device.cores <= 4;
  const selected =
    override === "3d" || override === "lite" ? override : preferences.view;
  return {
    view:
      selected === "auto" ? (low || device.reduced ? "lite" : "3d") : selected,
    quality: low ? "low" : "high",
    motion: !device.reduced && preferences.motion !== "off",
  };
}
