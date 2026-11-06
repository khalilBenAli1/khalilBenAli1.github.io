import {
  destinations,
  sectors,
  type Destination,
  type IslandRoute,
  type Sector,
} from "./types";

const aliases: Readonly<Record<string, Destination>> = {
  "": "home",
  top: "home",
  home: "home",
  "main-content": "home",
  work: "work",
  frontend: "work",
  about: "about",
  ai: "about",
  skills: "about",
  experience: "experience",
  contact: "contact",
};
const home = (): IslandRoute => ({
  destination: "home",
  sector: "all",
  projectId: null,
  aboutSection: null,
});
function fragment(hash: string): string | null {
  try {
    return decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return null;
  }
}
export function isIslandHash(
  hash: string,
  projectIds: readonly string[],
): boolean {
  const key = fragment(hash);
  return (
    key !== null &&
    (Object.hasOwn(aliases, key) ||
      (key.startsWith("project-") && projectIds.includes(key.slice(8))))
  );
}
export function parseIslandUrl(
  input: string | URL,
  projectIds: readonly string[],
): IslandRoute {
  let url: URL;
  try {
    url =
      input instanceof URL
        ? input
        : new URL(input, "https://portfolio.invalid/");
  } catch {
    return home();
  }
  const key = fragment(url.hash);
  if (key === null) return home();
  const projectId =
    key.startsWith("project-") && projectIds.includes(key.slice(8))
      ? key.slice(8)
      : null;
  const destination = projectId
    ? "work"
    : Object.hasOwn(aliases, key)
      ? aliases[key]
      : undefined;
  if (!destination) return home();
  const rawSector = url.searchParams.get("sector");
  const sector: Sector =
    destination === "work" && sectors.some((s) => s === rawSector)
      ? (rawSector as Sector)
      : "all";
  return {
    destination,
    sector,
    projectId,
    aboutSection: key === "ai" || key === "skills" ? key : null,
  };
}
export function islandHref(route: IslandRoute): string {
  const destination = destinations.includes(route.destination)
    ? route.destination
    : "home";
  const hash = route.projectId
    ? `project-${encodeURIComponent(route.projectId)}`
    : (route.aboutSection ?? destination);
  const sector =
    destination === "work" &&
    route.sector !== "all" &&
    sectors.includes(route.sector)
      ? `?sector=${encodeURIComponent(route.sector)}`
      : "";
  return `${sector}#${hash}`;
}
