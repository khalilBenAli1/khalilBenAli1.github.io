import type { WorldDestination } from "./types";

/** Populated only after rendering the implemented scene; no invented hero bitmap. */
export const islandPosters: {
  readonly desktop: string | null;
  readonly mobile: string | null;
} = {
  desktop: "/island/island-desktop.webp",
  mobile: "/island/island-mobile.webp",
};

/** Filled from actual room-camera captures; missing poses safely use the island. */
export const destinationPosters: Partial<
  Record<
    WorldDestination,
    { readonly desktop: string; readonly mobile: string }
  >
> = {};
