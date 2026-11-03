import { frontendProjects } from "../frontend-projects";
import { t } from "../i18n";
import type { IslandProject, ScreenAsset, Sector } from "./types";

const frontendPlacement: Record<
  string,
  Pick<IslandProject, "id" | "sector">
> = {
  "Maison Sol": { id: "maison-sol", sector: "hospitality" },
  Sora: { id: "sora", sector: "hospitality" },
  "Atelier No.8": { id: "atelier-no8", sector: "luxury" },
  "Erden Vaux": { id: "erden-vaux", sector: "luxury" },
  "Veyli Colour": { id: "veyli-colour", sector: "beauty" },
  Elnuara: { id: "elnuara", sector: "beauty" },
  Forma: { id: "forma", sector: "architecture" },
  Roam: { id: "roam", sector: "travel" },
  Prism: { id: "prism", sector: "systems" },
};

const noHighlights = { en: [], fr: [], it: [] } as const;
const work = { en: t("en").work, fr: t("fr").work, it: t("it").work };

const frontend: readonly IslandProject[] = frontendProjects.map((project) => {
  const placement = frontendPlacement[project.name];
  if (!placement)
    throw new Error(`Missing island placement for ${project.name}`);

  return {
    ...placement,
    name: project.name,
    kind: "frontend",
    year: project.year,
    description: project.description,
    technologies: project.technology,
    highlights: noHighlights,
    image: project.image,
    demo: project.demo,
    source: project.source,
  };
});

// Metadata retained from HomePage.astro; translated copy remains in i18n.ts.
const professionalMetadata = [
  {
    id: "cuddy",
    name: "Cuddy Brain",
    year: "2024 → 2026",
    client: "Cuddy Financial",
    production: true,
    diagram: "cuddy",
    sector: "business",
    technologies: [
      "NestJS",
      "PostgreSQL",
      "Redis",
      "Azure OpenAI",
      "LangChain",
      "React",
      "Microsoft Teams",
      "Salesforce",
    ],
  },
  {
    id: "lor",
    name: "L'OR Unlimited Remix",
    year: "2026",
    client: "JDE × HLWN",
    production: true,
    diagram: "lor",
    sector: "business",
    technologies: [
      "Next.js",
      "React",
      "TypeScript",
      "Gemini",
      "transformers.js",
      "WebGL",
      "Tailwind",
      "Vercel",
    ],
  },
  {
    id: "meeting",
    name: "nBold Meeting Intelligence",
    year: "2026",
    client: "nBold",
    production: false,
    diagram: "meeting",
    sector: "business",
    technologies: [
      "NestJS",
      "Microsoft Graph",
      "RabbitMQ",
      "PostgreSQL",
      "Azure OpenAI",
      "Salesforce",
    ],
  },
  {
    id: "scanner",
    name: "Cuddy Scanner",
    year: "2025 → 2026",
    client: "Cuddy Financial",
    production: true,
    diagram: "scanner",
    sector: "business",
    technologies: ["C#", ".NET 9", "WPF", "SharePoint", "LiteDB", "MSAL"],
  },
  {
    id: "audio",
    name: "HyperMesh & HyperGpu DSP",
    year: "2026",
    client: "R&D",
    production: false,
    diagram: "audio",
    sector: "systems",
    technologies: ["C++20", "JUCE", "CMake", "Protobuf", "SQLite"],
  },
] as const satisfies readonly Pick<
  IslandProject,
  | "id"
  | "name"
  | "year"
  | "client"
  | "production"
  | "diagram"
  | "sector"
  | "technologies"
>[];

const professional: readonly IslandProject[] = professionalMetadata.map(
  (project) => ({
    ...project,
    kind: "professional",
    description: {
      en: work.en.projects[project.id].subtitle,
      fr: work.fr.projects[project.id].subtitle,
      it: work.it.projects[project.id].subtitle,
    },
    highlights: {
      en: work.en.projects[project.id].highlights,
      fr: work.fr.projects[project.id].highlights,
      it: work.it.projects[project.id].highlights,
    },
  }),
);

export const islandProjects: readonly IslandProject[] = [
  ...frontend,
  ...professional,
  {
    id: "biat",
    name: "Assurances BIAT KB",
    kind: "professional",
    sector: "business",
    year: null,
    description: {
      en: work.en.biatText,
      fr: work.fr.biatText,
      it: work.it.biatText,
    },
    technologies: ["NestJS", "pgvector", "Ollama"],
    highlights: noHighlights,
    source: "https://github.com/khalilBenAli1/knowledgebase-",
  },
];

export function getIslandProject(id: string): IslandProject | undefined {
  return islandProjects.find((project) => project.id === id);
}

export function filterIslandProjects(sector: Sector): readonly IslandProject[] {
  return sector === "all"
    ? islandProjects
    : islandProjects.filter((project) => project.sector === sector);
}

export const sceneScreens: readonly ScreenAsset[] = [
  {
    src: "/island/screens/maison-sol.webp",
    label: "Maison Sol",
    sector: "hospitality",
  },
  {
    src: "/island/screens/veyli-colour.webp",
    label: "Veyli Colour",
    sector: "beauty",
  },
  {
    src: "/island/screens/erdenvaux.webp",
    label: "Erden Vaux",
    sector: "luxury",
  },
];
