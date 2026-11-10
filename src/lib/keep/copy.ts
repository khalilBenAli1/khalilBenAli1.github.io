import type { Locale } from "../i18n";

/**
 * Copy that exists only on the keep homepage. Everything else — project text,
 * career entries, contact lines — still comes from i18n.ts and lib/island.
 */
export interface KeepCopy {
  nav: { work: string; about: string; experience: string; contact: string };
  navLabel: string;
  languageLabel: string;
  sceneLabel: string;
  scroll: string;
  motionOn: string;
  motionOff: string;
  frontendTitle: string;
  frontendIntro: string;
  professionalTitle: string;
  professionalIntro: string;
  aboutTitle: string;
  /** The one personal line: where the look of the site comes from. */
  aside: string;
  visit: string;
  source: string;
  sourceOnly: string;
}

const copy: Record<Locale, KeepCopy> = {
  en: {
    nav: {
      work: "Work",
      about: "About",
      experience: "Experience",
      contact: "Contact",
    },
    navLabel: "Primary",
    languageLabel: "Language",
    sceneLabel: "A ruined keep at night, lit by fires",
    scroll: "Scroll to walk in",
    motionOn: "Motion on",
    motionOff: "Motion off",
    frontendTitle: "Finished websites",
    frontendIntro: "Nine original experiences, ready to explore.",
    professionalTitle: "Professional projects",
    professionalIntro:
      "Selected systems, integrations and research. Private work is labelled.",
    aboutTitle: "Behind the work",
    aside:
      "Outside work I play soulslike games, which is where the look of this site comes from.",
    visit: "Explore the website",
    source: "View source",
    sourceOnly: "Source on GitHub",
  },
  fr: {
    nav: {
      work: "Projets",
      about: "À propos",
      experience: "Parcours",
      contact: "Contact",
    },
    navLabel: "Navigation principale",
    languageLabel: "Langue",
    sceneLabel: "Une forteresse en ruine, la nuit, éclairée par des feux",
    scroll: "Défiler pour entrer",
    motionOn: "Animations activées",
    motionOff: "Animations désactivées",
    frontendTitle: "Sites à découvrir",
    frontendIntro: "Neuf expériences originales, prêtes à explorer.",
    professionalTitle: "Projets professionnels",
    professionalIntro:
      "Systèmes, intégrations et recherche. Les projets privés sont indiqués.",
    aboutTitle: "Derrière les projets",
    aside:
      "En dehors du travail, je joue aux soulslike : c’est de là que vient l’univers de ce site.",
    visit: "Explorer le site",
    source: "Voir le code",
    sourceOnly: "Code sur GitHub",
  },
  it: {
    nav: {
      work: "Progetti",
      about: "Profilo",
      experience: "Esperienza",
      contact: "Contatti",
    },
    navLabel: "Navigazione principale",
    languageLabel: "Lingua",
    sceneLabel: "Una fortezza in rovina, di notte, illuminata dai fuochi",
    scroll: "Scorri per entrare",
    motionOn: "Animazioni attive",
    motionOff: "Animazioni disattivate",
    frontendTitle: "Siti da esplorare",
    frontendIntro: "Nove esperienze originali, pronte da esplorare.",
    professionalTitle: "Progetti professionali",
    professionalIntro:
      "Sistemi, integrazioni e ricerca. I progetti privati sono indicati.",
    aboutTitle: "Dietro i progetti",
    aside:
      "Fuori dal lavoro gioco ai soulslike: è da lì che nasce l’atmosfera di questo sito.",
    visit: "Esplora il sito",
    source: "Vedi il codice",
    sourceOnly: "Codice su GitHub",
  },
};

export function getKeepCopy(locale: Locale): KeepCopy {
  return copy[locale];
}

type SkillGroupKey = "frontend" | "backend" | "ailtm" | "native" | "platform";

/** Same groups and items as the original skills section. */
export const skillGroups: readonly {
  key: SkillGroupKey;
  items: readonly string[];
}[] = [
  {
    key: "frontend",
    items: [
      "TypeScript",
      "React",
      "Next.js",
      "Astro",
      "React Native",
      "Tailwind",
      "GSAP",
      "WebGL",
    ],
  },
  {
    key: "backend",
    items: [
      "Node.js",
      "NestJS",
      "Express",
      "PostgreSQL",
      "MongoDB",
      "Redis",
      "RabbitMQ",
      "Socket.IO",
    ],
  },
  {
    key: "ailtm",
    items: [
      "Azure OpenAI",
      "Gemini",
      "LangChain / LangGraph",
      "RAG · pgvector",
      "transformers.js",
    ],
  },
  {
    key: "native",
    items: ["C#", ".NET 9", "WPF", "C++20", "JUCE", "CMake", "SQLite"],
  },
  {
    key: "platform",
    items: [
      "Microsoft Graph",
      "Microsoft Teams",
      "Salesforce",
      "Azure",
      "Docker",
      "GitHub Actions",
      "Vercel",
      "Git",
    ],
  },
];
