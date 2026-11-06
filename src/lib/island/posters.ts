import type { WorldDestination } from "./types";

/** Populated only after rendering the implemented scene; no invented hero bitmap. */
export const islandPosters: {
  readonly desktop: string | null;
  readonly mobile: string | null;
} = {
  desktop: "/island/island-desktop.webp",
  mobile: "/island/island-mobile.webp",
};

/** Each pair is captured from the same room camera as the live scene. */
function roomPosters(room: WorldDestination) {
  return {
    desktop: `/island/rooms/${room}-desktop.webp`,
    mobile: `/island/rooms/${room}-mobile.webp`,
  };
}

export const destinationPosters = {
  work: roomPosters("work"),
  about: roomPosters("about"),
  experience: roomPosters("experience"),
  contact: roomPosters("contact"),
} satisfies Record<WorldDestination, ReturnType<typeof roomPosters>>;
