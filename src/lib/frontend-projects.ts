import type { Locale } from "./i18n";
export interface FrontendProject {
  name: string;
  year: string;
  sector: Record<Locale, string>;
  description: Record<Locale, string>;
  image: string;
  technology: string[];
  demo: string;
  source: string;
}
// Add entries only after their public demo and primary flow have been verified.
export const frontendProjects: FrontendProject[] = [
  {
    name: "Maison Sol",
    year: "2026",
    sector: { en: "Hospitality", fr: "Hôtellerie", it: "Ospitalità" },
    description: {
      en: "A Mediterranean hideaway, from thoughtful room discovery to a complete, simulated stay.",
      fr: "Une parenthèse méditerranéenne, de la découverte des chambres à une réservation entièrement simulée.",
      it: "Un rifugio mediterraneo, dalla scoperta delle camere a un soggiorno completamente simulato.",
    },
    image: "/projects/maison-sol.jpg",
    technology: ["React", "TypeScript", "Vite"],
    demo: "https://khalilbenali1.github.io/maison-sol-react/",
    source: "https://github.com/khalilBenAli1/maison-sol-react",
  },
  {
    name: "Sora",
    year: "2026",
    sector: {
      en: "Dining",
      fr: "Restauration",
      it: "Ristorazione",
    },
    description: {
      en: "An atmospheric dining experience with a seasonal menu, table reservations and a working reservation desk.",
      fr: "Une expérience gastronomique immersive, avec menu de saison, réservation de table et gestion des réservations.",
      it: "Un’esperienza gastronomica immersiva con menu stagionale, prenotazioni e gestione dei tavoli.",
    },
    image: "/projects/sora.jpg",
    technology: ["Angular", "TypeScript", "CSS"],
    demo: "https://khalilbenali1.github.io/sora-angular/",
    source: "https://github.com/khalilBenAli1/sora-angular",
  },
  {
    name: "Atelier No.8",
    year: "2026",
    sector: {
      en: "Fashion & retail",
      fr: "Mode & commerce",
      it: "Moda e commercio",
    },
    description: {
      en: "A considered boutique with tactile product imagery, a beautifully detailed shopping bag and a complete simulated checkout.",
      fr: "Une boutique soignée, des matières à découvrir, un panier détaillé et un parcours d’achat entièrement simulé.",
      it: "Una boutique curata, materiali da scoprire, un carrello dettagliato e un acquisto completamente simulato.",
    },
    image: "/projects/atelier.jpg",
    technology: ["Nuxt", "Vue", "Pinia"],
    demo: "https://khalilbenali1.github.io/atelier-no8-nuxt/",
    source: "https://github.com/khalilBenAli1/atelier-no8-nuxt",
  },
  {
    name: "Erden Vaux",
    year: "2026",
    sector: {
      en: "Luxury leather goods",
      fr: "Maroquinerie",
      it: "Pelletteria di lusso",
    },
    description: {
      en: "An editorial leather-goods shop with material choices, a scaled silhouette comparison and a complete demo checkout.",
      fr: "Une boutique de maroquinerie éditoriale, avec choix de matières, comparaison des silhouettes à l’échelle et achat simulé.",
      it: "Una boutique editoriale di pelletteria, con materiali, confronto delle proporzioni e un acquisto simulato completo.",
    },
    image: "/projects/erdenvaux.jpg",
    technology: ["Next.js", "React", "Zustand"],
    demo: "https://khalilbenali1.github.io/erdenvaux-bags-next/",
    source: "https://github.com/khalilBenAli1/erdenvaux-bags-next",
  },
  {
    name: "Veyli Colour",
    year: "2026",
    sector: {
      en: "Beauty & makeup",
      fr: "Beauté & maquillage",
      it: "Bellezza e make-up",
    },
    description: {
      en: "An expressive beauty shop with named shade choices, an editable colour story and a complete simulated checkout.",
      fr: "Une boutique beauté expressive, des teintes nommées, un look personnalisable et un parcours d’achat entièrement simulé.",
      it: "Una boutique beauty espressiva, tonalità riconoscibili, un look personalizzabile e un acquisto completamente simulato.",
    },
    image: "/projects/veyli-colour.jpg",
    technology: ["Nuxt", "Vue", "Pinia"],
    demo: "https://khalilbenali1.github.io/veyli-colour-nuxt/",
    source: "https://github.com/khalilBenAli1/veyli-colour-nuxt",
  },
  {
    name: "Elnuara",
    year: "2026",
    sector: {
      en: "Body care & rituals",
      fr: "Soins du corps",
      it: "Cura del corpo",
    },
    description: {
      en: "A tactile body care shop with size choices, an editable daily ritual and a complete simulated checkout.",
      fr: "Une boutique de soins du corps, des formats au choix, un rituel personnalisable et un achat entièrement simulé.",
      it: "Una boutique per la cura del corpo, con formati diversi, rituali personalizzabili e un acquisto completamente simulato.",
    },
    image: "/projects/elnuara.jpg",
    technology: ["SvelteKit", "TypeScript", "CSS"],
    demo: "https://khalilbenali1.github.io/elnuara-body-sveltekit/",
    source: "https://github.com/khalilBenAli1/elnuara-body-sveltekit",
  },
  {
    name: "Forma",
    year: "2026",
    sector: {
      en: "Architecture & interiors",
      fr: "Architecture & intérieurs",
      it: "Architettura e interni",
    },
    description: {
      en: "An editorial architecture experience, with immersive spaces, project galleries and a considered studio story.",
      fr: "Une expérience éditoriale autour des espaces, des galeries de projets et de la vie du studio.",
      it: "Un’esperienza editoriale tra spazi, gallerie di progetti e il racconto dello studio.",
    },
    image: "/projects/forma.jpg",
    technology: ["Astro", "TypeScript", "CSS"],
    demo: "https://khalilbenali1.github.io/forma-astro/",
    source: "https://github.com/khalilBenAli1/forma-astro",
  },
  {
    name: "Roam",
    year: "2026",
    sector: {
      en: "Travel & planning",
      fr: "Voyage & organisation",
      it: "Viaggi & pianificazione",
    },
    description: {
      en: "Plan a journey day by day, shape your itinerary and keep the details beautifully in view.",
      fr: "Organisez votre voyage jour après jour, composez votre itinéraire et gardez les détails à portée de main.",
      it: "Organizza il viaggio giorno per giorno, costruisci l’itinerario e tieni ogni dettaglio in vista.",
    },
    image: "/projects/roam.jpg",
    technology: ["SvelteKit", "TypeScript", "CSS"],
    demo: "https://khalilbenali1.github.io/roam-sveltekit/",
    source: "https://github.com/khalilBenAli1/roam-sveltekit",
  },
  {
    name: "Prism",
    year: "2026",
    sector: {
      en: "Design systems",
      fr: "Systèmes de design",
      it: "Sistemi di design",
    },
    description: {
      en: "An interactive playground for colours, components and polished interfaces, with a working theme and form experience.",
      fr: "Un atelier interactif pour explorer couleurs, composants et interfaces, avec thèmes et formulaires fonctionnels.",
      it: "Uno spazio interattivo per esplorare colori, componenti e interfacce, con temi e moduli funzionanti.",
    },
    image: "/projects/prism.jpg",
    technology: ["Lit", "TypeScript", "Web Components"],
    demo: "https://khalilbenali1.github.io/prism-web-components/",
    source: "https://github.com/khalilBenAli1/prism-web-components",
  },
];
