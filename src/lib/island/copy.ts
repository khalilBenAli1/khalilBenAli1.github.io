import { t, type Locale } from "../i18n";
import type { Destination, Sector } from "./types";

export interface IslandCopy {
  destinations: Record<Destination, string>;
  sectors: Record<Sector, string>;
  controls: {
    home: string;
    back: string;
    close: string;
    backToGallery: string;
    viewWork: string;
    downloadCv: string;
    resume: string;
    motionOn: string;
    motionOff: string;
    motionReduced: string;
    lightView: string;
    threeDView: string;
    allProjects: string;
    projectDetails: string;
    visit: string;
    source: string;
    privateRepo: string;
    resetFilters: string;
  };
  hero: {
    eyebrow: string;
    titleLineOne: string;
    titleLineTwo: string;
    titleLineThree: string;
    aboutMe: string;
    talk: string;
    discover: string;
    projectsLabel: string;
    studioLabel: string;
    intro: string;
    worldLabel: string;
    hint: string;
  };
  gallery: {
    title: string;
    intro: string;
    empty: string;
    demoNote: string;
  };
  about: { title: string };
  experience: { title: string };
  contact: { title: string };
  status: { loading: string; lite: string; unsupported: string };
}

const copy: Record<Locale, IslandCopy> = {
  en: {
    destinations: {
      home: "Home",
      work: "Work",
      about: "About",
      experience: "Experience",
      contact: "Contact",
    },
    sectors: {
      all: "All sectors",
      hospitality: "Hospitality",
      luxury: "Luxury & fashion",
      beauty: "Beauty",
      business: "Business",
      architecture: "Architecture",
      travel: "Travel",
      systems: "Systems & experiments",
    },
    controls: {
      home: "Home",
      back: "Back",
      close: "Close",
      backToGallery: "Back to gallery",
      viewWork: "Explore my work",
      downloadCv: t("en").hero.downloadCv,
      resume: t("en").nav.resume,
      motionOn: "Motion on",
      motionOff: "Motion off",
      motionReduced: "Reduced motion",
      lightView: "Light view",
      threeDView: "3D view",
      allProjects: "All projects",
      projectDetails: "Project details",
      visit: "Explore the website",
      source: "View source",
      privateRepo: t("en").work.privateRepo,
      resetFilters: "Reset filters",
    },
    hero: {
      eyebrow: "KHALIL BEN ALI",
      titleLineOne: "WELCOME",
      titleLineTwo: "TO MY",
      titleLineThree: "WORLD.",
      aboutMe: "About me",
      talk: "Let’s talk",
      discover: "Scroll to discover",
      projectsLabel: "Projects",
      studioLabel: "Studio",
      intro: "Digital experiences, built to explore.",
      worldLabel: "Khalil Ben Ali’s creative island",
      hint: "Choose a place on the island, or use the navigation.",
    },
    gallery: {
      title: "Work, on display.",
      intro:
        "Websites, interfaces and systems. Find a world that interests you, then explore the details.",
      empty:
        "No projects in this selection. Try another sector or view all projects.",
      demoNote:
        "Original portfolio applications. Brands and booking flows are fictional.",
    },
    about: { title: "Behind the work." },
    experience: { title: "The path so far." },
    contact: { title: "Let’s build something." },
    status: {
      loading: "The island is taking shape. You can explore the work now.",
      lite: "Light view is active. All projects and pages are available.",
      unsupported:
        "The island couldn’t load here. Explore all the work in light view.",
    },
  },
  fr: {
    destinations: {
      home: "Accueil",
      work: "Projets",
      about: "À propos",
      experience: "Parcours",
      contact: "Contact",
    },
    sectors: {
      all: "Tous les secteurs",
      hospitality: "Hôtellerie & restauration",
      luxury: "Luxe & mode",
      beauty: "Beauté",
      business: "Entreprise",
      architecture: "Architecture",
      travel: "Voyage",
      systems: "Systèmes & expérimentations",
    },
    controls: {
      home: "Accueil",
      back: "Retour",
      close: "Fermer",
      backToGallery: "Retour à la galerie",
      viewWork: "Voir mes projets",
      downloadCv: t("fr").hero.downloadCv,
      resume: t("fr").nav.resume,
      motionOn: "Animations activées",
      motionOff: "Animations désactivées",
      motionReduced: "Animations réduites",
      lightView: "Vue légère",
      threeDView: "Vue 3D",
      allProjects: "Tous les projets",
      projectDetails: "Détails du projet",
      visit: "Explorer le site",
      source: "Voir le code",
      privateRepo: t("fr").work.privateRepo,
      resetFilters: "Réinitialiser les filtres",
    },
    hero: {
      eyebrow: "KHALIL BEN ALI",
      titleLineOne: "BIENVENUE",
      titleLineTwo: "DANS MON",
      titleLineThree: "UNIVERS.",
      aboutMe: "À propos",
      talk: "Discutons",
      discover: "Défiler pour découvrir",
      projectsLabel: "Projets",
      studioLabel: "Studio",
      intro: "Des expériences numériques à explorer.",
      worldLabel: "L’île créative de Khalil Ben Ali",
      hint: "Choisissez un lieu sur l’île ou utilisez la navigation.",
    },
    gallery: {
      title: "Les projets s’exposent.",
      intro:
        "Sites, interfaces et systèmes. Choisissez un univers et découvrez les détails.",
      empty:
        "Aucun projet dans cette sélection. Essayez un autre secteur ou affichez tous les projets.",
      demoNote:
        "Applications originales de portfolio. Les marques et parcours de réservation sont fictifs.",
    },
    about: { title: "Derrière les projets." },
    experience: { title: "Le chemin parcouru." },
    contact: { title: "Construisons la suite." },
    status: {
      loading: "L’île prend forme. Vous pouvez déjà découvrir les projets.",
      lite: "La vue légère est active. Tous les projets et toutes les pages sont accessibles.",
      unsupported:
        "L’île n’a pas pu se charger ici. Découvrez tous les projets dans la vue légère.",
    },
  },
  it: {
    destinations: {
      home: "Home",
      work: "Progetti",
      about: "Profilo",
      experience: "Esperienza",
      contact: "Contatti",
    },
    sectors: {
      all: "Tutti i settori",
      hospitality: "Ospitalità & ristorazione",
      luxury: "Lusso & moda",
      beauty: "Bellezza",
      business: "Impresa",
      architecture: "Architettura",
      travel: "Viaggi",
      systems: "Sistemi & sperimentazioni",
    },
    controls: {
      home: "Home",
      back: "Indietro",
      close: "Chiudi",
      backToGallery: "Torna alla galleria",
      viewWork: "Esplora i progetti",
      downloadCv: t("it").hero.downloadCv,
      resume: t("it").nav.resume,
      motionOn: "Animazioni attive",
      motionOff: "Animazioni disattivate",
      motionReduced: "Animazioni ridotte",
      lightView: "Vista leggera",
      threeDView: "Vista 3D",
      allProjects: "Tutti i progetti",
      projectDetails: "Dettagli del progetto",
      visit: "Esplora il sito",
      source: "Vedi il codice",
      privateRepo: t("it").work.privateRepo,
      resetFilters: "Reimposta i filtri",
    },
    hero: {
      eyebrow: "KHALIL BEN ALI",
      titleLineOne: "BENVENUTI",
      titleLineTwo: "NEL MIO",
      titleLineThree: "MONDO.",
      aboutMe: "Chi sono",
      talk: "Parliamone",
      discover: "Scorri per scoprire",
      projectsLabel: "Progetti",
      studioLabel: "Studio",
      intro: "Esperienze digitali, tutte da esplorare.",
      worldLabel: "L’isola creativa di Khalil Ben Ali",
      hint: "Scegli un luogo sull’isola oppure usa la navigazione.",
    },
    gallery: {
      title: "Progetti in mostra.",
      intro:
        "Siti, interfacce e sistemi. Scegli un mondo che ti interessa e scopri i dettagli.",
      empty:
        "Nessun progetto in questa selezione. Prova un altro settore o visualizza tutti i progetti.",
      demoNote:
        "Applicazioni originali per il portfolio. Marchi e prenotazioni sono fittizi.",
    },
    about: { title: "Dietro i progetti." },
    experience: { title: "Il percorso fin qui." },
    contact: { title: "Costruiamo qualcosa." },
    status: {
      loading: "L’isola sta prendendo forma. Puoi già esplorare i progetti.",
      lite: "La vista leggera è attiva. Tutti i progetti e tutte le pagine sono disponibili.",
      unsupported:
        "Non è stato possibile caricare l’isola. Esplora tutti i progetti nella vista leggera.",
    },
  },
};

export function getIslandCopy(locale: Locale): IslandCopy {
  return copy[locale];
}
