/**
 * All user-facing copy for the site and the CV, in EN / FR / IT.
 * Project names, company names and tech terms stay in English everywhere.
 */
export type Locale = "en" | "fr" | "it";

export const locales: Locale[] = ["en", "fr", "it"];

export function homePath(locale: Locale): string {
  return locale === "en" ? "/" : `/${locale}/`;
}

export function resumePath(locale: Locale): string {
  return locale === "en" ? "/resume/" : `/${locale}/resume/`;
}

export function cvFile(locale: Locale): string {
  return `/KhalilBenAli-CV-${locale}.pdf`;
}

interface ProjectCopy {
  subtitle: string;
  highlights: string[];
}

export interface Dict {
  meta: { description: string };
  skipLink: string;
  nav: {
    work: string;
    ai: string;
    experience: string;
    contact: string;
    resume: string;
  };
  hero: {
    eyebrow: string;
    lead: string;
    viewWork: string;
    downloadCv: string;
    scroll: string;
  };
  work: {
    eyebrow: string;
    title: string;
    production: string;
    privateRepo: string;
    viewCode: string;
    projects: {
      cuddy: ProjectCopy;
      lor: ProjectCopy;
      meeting: ProjectCopy;
      scanner: ProjectCopy;
      audio: ProjectCopy;
    };
    biatText: string;
    moreLine: string;
  };
  ai: {
    eyebrow: string;
    title: string;
    cards: { title: string; body: string }[];
  };
  experience: {
    eyebrow: string;
    title: string;
    now: string;
    entries: { role: string; company: string; period: string; note: string }[];
  };
  skills: {
    eyebrow: string;
    title: string;
    groups: { frontend: string; backend: string; ailtm: string; native: string; platform: string };
  };
  contact: {
    eyebrow: string;
    title: string;
    line: string;
    email: string;
    footerLeft: string;
    footerRight: string;
    backToTop: string;
  };
  resume: {
    title: string;
    role: string;
    location: string;
    backLink: string;
    downloadPdf: string;
    skipLink: string;
    photoAlt: string;
    sections: {
      summary: string;
      experience: string;
      skills: string;
      projects: string;
      education: string;
      languages: string;
    };
    summary: string;
    nbold: {
      heading: string;
      context: string;
      bullets: string[];
    };
    freelance: { heading: string; bullets: string[] };
    solvr: { heading: string; bullets: string[] };
    tynass: { heading: string; bullets: string[] };
    skillsLine: string;
    sideProjects: string[];
    education: string;
    languagesLine: string;
  };
}

const en: Dict = {
  meta: {
    description:
      "Khalil Ben Ali, full-stack and AI engineer in Faenza, Italy. Microsoft Teams platforms, in-browser vision models and production AI systems.",
  },
  skipLink: "Skip to content",
  nav: { work: "Work", ai: "AI", experience: "Experience", contact: "Contact", resume: "Résumé" },
  hero: {
    eyebrow: "Full-Stack & AI Engineer · Faenza, Italy",
    lead: "I build platforms where AI does real work: Microsoft Teams products, vision models that run in the browser, and pipelines that hold up in production.",
    viewWork: "View my work",
    downloadCv: "Download CV",
    scroll: "scroll",
  },
  work: {
    eyebrow: "Selected work",
    title: "Things I've shipped",
    production: "Production",
    privateRepo: "Private repo",
    viewCode: "View code",
    projects: {
      cuddy: {
        subtitle:
          "Internal operations hub for a US wealth-advisory firm: ten SaaS tools mirrored into one screen, with AI on top.",
        highlights: [
          "Salesforce, Microsoft 365, RingCentral, QuickBooks and six more systems unified in one PostgreSQL hub",
          "Client calls are transcribed, summarized and turned into Teams tasks within minutes",
          "AI monitoring with deterministic checks protects sensitive estate work",
        ],
      },
      lor: {
        subtitle:
          "Brand web app and event kiosk for JDE's L'OR. I was the only developer, from first commit to the live events.",
        highlights: [
          "CLIP vision runs on the device itself, so selfies never leave the browser",
          "Gemini writes the recipes, with a deterministic fallback that works fully offline",
          "A WebGL fluid simulation at 60fps, plus Bluetooth thermal ticket printing at events",
        ],
      },
      meeting: {
        subtitle:
          "Teams meeting transcripts captured through Microsoft Graph, summarized by AI and routed to the right channel using CRM context.",
        highlights: [
          "I designed the architecture, then built the whole feature myself, with 321 tests",
          "A new app-only Graph auth path unlocks tenant-wide transcript capture",
          "Durable workflows survive API restarts without duplicate deliveries",
        ],
      },
      scanner: {
        subtitle: "Native .NET 9 document scanner used every day at a financial office.",
        highlights: [
          "Drives TWAIN office scanners and splits batches automatically by barcode",
          "Assembles PDFs and files them into SharePoint with the right metadata",
          "Clean Architecture, MSIX-signed, and it can resume an interrupted scan session",
        ],
      },
      audio: {
        subtitle:
          "Personal C++ audio research: GPU-accelerated plugin hosting and a LAN mesh that offloads real-time DSP between machines.",
        highlights: [
          "Lock-free buffers, adaptive jitter compensation and forward error correction over the network",
          "Crash-isolated plugin scanning and cross-platform IPC between manager and wrapper",
          "CI ships self-contained builds for five platforms",
        ],
      },
    },
    biatText:
      "Explainable RAG chatbot (pgvector + Ollama) with cited, auditable answers and role-based access.",
    moreLine: "More projects and experiments live on GitHub.",
  },
  ai: {
    eyebrow: "AI engineering",
    title: "How I work with AI",
    cards: [
      {
        title: "Shipped to real users",
        body: "Call transcription and summaries, LLM decisions gated by deterministic checks, LangGraph agents that pull from seven systems, CLIP vision in the browser, RAG on pgvector and Copilot connectors.",
      },
      {
        title: "Reliability first",
        body: "Provider-agnostic interfaces, graceful degradation, hardened LLM clients with timeouts and bounded retries, and full visibility on tokens, latency and cost.",
      },
    ],
  },
  experience: {
    eyebrow: "Experience",
    title: "Where I've worked",
    now: "2024 → now",
    entries: [
      {
        role: "Full-Stack & AI Engineer",
        company: "nBold",
        period: "2024 → now",
        note: "Microsoft Teams templating and governance SaaS, based in Paris. Platform AI features plus lead engineering on client platforms: Cuddy Brain, L'OR Remix, Cuddy Scanner.",
      },
      {
        role: "Software Developer",
        company: "Freelance",
        period: "2023 → 2024",
        note: "Cross-platform apps: a children's game in React Native and a travel planner with an Express and MongoDB backend.",
      },
      {
        role: "Software Developer",
        company: "SolvR",
        period: "2023",
        note: "Refactored and shipped a React Native chat app: real-time messaging, authentication, state architecture.",
      },
      {
        role: "Software Developer",
        company: "Tynass IT",
        period: "2019 → 2022",
        note: "AR tourism app, job platform, e-commerce and corporate sites built with React, Express and MongoDB.",
      },
    ],
  },
  skills: {
    eyebrow: "Skills",
    title: "Toolbox",
    groups: {
      frontend: "Frontend",
      backend: "Backend",
      ailtm: "AI & LLM",
      native: "Native & Systems",
      platform: "Platform & Tools",
    },
  },
  contact: {
    eyebrow: "Contact",
    title: "Get in touch.",
    line: "Want to talk about a project or a role? My inbox is open.",
    email: "Email me",
    footerLeft: "© 2026 Khalil Ben Ali · Faenza, Italy",
    footerRight: "Built with Astro and Three.js",
    backToTop: "Back to top",
  },
  resume: {
    title: "Khalil Ben Ali — Full-Stack & AI Engineer",
    role: "— Full-Stack & AI Engineer",
    location: "Faenza, Italy",
    backLink: "Back to portfolio",
    downloadPdf: "Download PDF",
    skipLink: "Skip to résumé",
    photoAlt: "Portrait of Khalil Ben Ali",
    sections: {
      summary: "SUMMARY",
      experience: "EXPERIENCE",
      skills: "SKILLS",
      projects: "SELECTED SIDE PROJECTS",
      education: "EDUCATION",
      languages: "LANGUAGES",
    },
    summary:
      "Full-stack engineer (5+ years) shipping TypeScript platforms, .NET desktop apps and production AI. Primary engineer of an AI operations hub integrating 10 SaaS systems for a US financial firm; sole developer of an AI brand experience for JDE's L'OR. Owns systems end to end, from database schema to WebGL, from prompt design to the print queue.",
    nbold: {
      heading: "nBold — Full-Stack & AI Engineer · 2024 → present · remote (Paris HQ)",
      context: "nBold builds Microsoft Teams workspace-templating and governance SaaS (ISO 27001, SOC 2).",
      bullets: [
        "Designed and built the platform's Teams meeting-intelligence feature end to end (~11,000 lines, 67 files, 321 tests): Microsoft Graph transcript capture with a new app-only auth path, AI summarization, and CRM-aware LLM routing to Teams Adaptive Cards, on durable workflows proven crash-safe.",
        "Primary engineer of Cuddy Brain, a Teams-embedded ops hub mirroring 10 SaaS systems into PostgreSQL (~115 tables); ~3,860 commits, about 69% of backend history (NestJS, BullMQ/Redis, React, Azure OpenAI).",
        "Shipped AI call intelligence: calls are transcribed, summarized by Azure OpenAI, and turned into follow-up tasks posted to Teams as Adaptive Cards minutes after hang-up, with single-flight locking and crash recovery.",
        "Built AI monitoring (obituary adjudication with deterministic checks; address-change detection over public records and client communications) and co-built a LangGraph agent that compiles client reviews from 7 systems.",
        "Hardened the platform: a shared Azure OpenAI client with timeouts, retries and usage tracking, HMAC webhook verification, secret-scanning CI, caching and N+1 performance work.",
        "Sole developer of L'OR UNLIMITED REMIX (JDE × HLWN 2026), an AI brand app and event kiosk: Gemini with a deterministic fallback, on-device CLIP vision, a 60fps WebGL fluid engine, offline-first PWA and Bluetooth thermal printing. 129/129 commits, ~24.6k lines, 11 weeks to production.",
        "Built Cuddy Scanner, a .NET 9/WPF TWAIN document scanner (barcode batch separation, PDF assembly, SharePoint filing) in daily production use.",
      ],
    },
    freelance: {
      heading: "Freelance — Software Developer · 2023 → 2024",
      bullets: [
        "Children's game app (React Native, Expo, Redux) and a cross-platform travel planner (React Native + MobX, Express/MongoDB backend, React admin).",
      ],
    },
    solvr: {
      heading: "SolvR — Software Developer · 2023",
      bullets: [
        "Refactored and shipped a cross-platform chat app (React Native, Expo, MobX, Firebase): real-time messaging, secure auth, state architecture.",
      ],
    },
    tynass: {
      heading: "Tynass IT — Software Developer · 2019 → 2022",
      bullets: [
        "Delivered an AR tourism app, a job-seeker platform, fashion e-commerce and corporate sites (React, Material-UI, Express, MongoDB).",
      ],
    },
    skillsLine:
      "TypeScript · React/Next.js · React Native · NestJS/Node · PostgreSQL · Redis/BullMQ · Azure OpenAI · Gemini · LangGraph · RAG (pgvector) · transformers.js · C#/.NET 9 · WPF · C++20/JUCE · Microsoft Graph & Teams · Salesforce · Docker · GitHub Actions · Vercel",
    sideProjects: [
      "HyperMesh DSP & HyperGpu (C++20/JUCE): LAN mesh for real-time DSP offload and a GPU-accelerated plugin host; CI builds for 5 platforms.",
      "Assurances BIAT KB: explainable RAG chatbot (NestJS, pgvector, Ollama) with cited answers and an RBAC audit trail.",
    ],
    education:
      "B.A. Multimedia Communication, Higher Institute of Multimedia Arts of Manouba (ISAMM), 2019",
    languagesLine: "Arabic (native) · English (professional) · French (A2–B1) · Italian (A2)",
  },
};

const fr: Dict = {
  meta: {
    description:
      "Khalil Ben Ali, développeur full-stack et IA à Faenza, Italie. Plateformes Microsoft Teams, modèles de vision dans le navigateur et systèmes IA en production.",
  },
  skipLink: "Aller au contenu",
  nav: { work: "Projets", ai: "IA", experience: "Parcours", contact: "Contact", resume: "CV" },
  hero: {
    eyebrow: "Développeur Full-Stack & IA · Faenza, Italie",
    lead: "Je construis des plateformes où l'IA travaille pour de vrai : des produits Microsoft Teams, des modèles de vision qui tournent dans le navigateur, et des pipelines qui tiennent en production.",
    viewWork: "Voir mes projets",
    downloadCv: "Télécharger le CV",
    scroll: "défiler",
  },
  work: {
    eyebrow: "Projets choisis",
    title: "Ce que j'ai livré",
    production: "En production",
    privateRepo: "Code privé",
    viewCode: "Voir le code",
    projects: {
      cuddy: {
        subtitle:
          "Hub opérationnel interne d'un cabinet américain de gestion de patrimoine : dix outils SaaS réunis sur un seul écran, avec de l'IA par-dessus.",
        highlights: [
          "Salesforce, Microsoft 365, RingCentral, QuickBooks et six autres systèmes unifiés dans un hub PostgreSQL",
          "Les appels clients sont transcrits, résumés et transformés en tâches Teams en quelques minutes",
          "Une surveillance IA avec garde-fous déterministes protège les dossiers successoraux sensibles",
        ],
      },
      lor: {
        subtitle:
          "Web app de marque et borne événementielle pour L'OR (JDE). Seul développeur, du premier commit aux événements en live.",
        highlights: [
          "La vision CLIP tourne sur l'appareil : les selfies ne quittent jamais le navigateur",
          "Gemini écrit les recettes, avec un repli déterministe qui fonctionne entièrement hors ligne",
          "Une simulation de fluide WebGL à 60 fps, et l'impression Bluetooth de tickets thermiques en événement",
        ],
      },
      meeting: {
        subtitle:
          "Les transcriptions de réunions Teams sont capturées via Microsoft Graph, résumées par IA et routées vers le bon canal grâce au contexte CRM.",
        highlights: [
          "J'ai conçu l'architecture puis développé toute la fonctionnalité moi-même, avec 321 tests",
          "Un nouveau chemin d'authentification Graph app-only permet la capture des transcriptions sur tout le tenant",
          "Des workflows durables survivent aux redémarrages de l'API sans double livraison",
        ],
      },
      scanner: {
        subtitle: "Scanner de documents natif en .NET 9, utilisé au quotidien dans un cabinet financier.",
        highlights: [
          "Pilote les scanners TWAIN du bureau et sépare les lots automatiquement par code-barres",
          "Assemble les PDF et les classe dans SharePoint avec les bonnes métadonnées",
          "Clean Architecture, signé MSIX, avec reprise des sessions de numérisation interrompues",
        ],
      },
      audio: {
        subtitle:
          "Recherche audio personnelle en C++ : hébergement de plugins accéléré par GPU et un maillage LAN qui répartit le DSP temps réel entre machines.",
        highlights: [
          "Buffers lock-free, compensation adaptative du jitter et correction d'erreurs (FEC) sur le réseau",
          "Scan de plugins isolé des crashs et IPC multiplateforme entre manager et wrapper",
          "La CI publie des builds autonomes pour cinq plateformes",
        ],
      },
    },
    biatText:
      "Chatbot RAG explicable (pgvector + Ollama) : réponses citées et auditables, accès par rôles.",
    moreLine: "D'autres projets et expérimentations sont sur GitHub.",
  },
  ai: {
    eyebrow: "Ingénierie IA",
    title: "Comment je travaille avec l'IA",
    cards: [
      {
        title: "Livré à de vrais utilisateurs",
        body: "Transcription et résumé d'appels, décisions LLM encadrées par des contrôles déterministes, agents LangGraph qui puisent dans sept systèmes, vision CLIP dans le navigateur, RAG sur pgvector et connecteurs Copilot.",
      },
      {
        title: "La fiabilité d'abord",
        body: "Interfaces indépendantes du fournisseur, dégradation contrôlée, clients LLM durcis avec timeouts et retries bornés, et une visibilité complète sur les tokens, la latence et les coûts.",
      },
    ],
  },
  experience: {
    eyebrow: "Parcours",
    title: "Où j'ai travaillé",
    now: "2024 → auj.",
    entries: [
      {
        role: "Développeur Full-Stack & IA",
        company: "nBold",
        period: "2024 → auj.",
        note: "SaaS parisien de templates et de gouvernance pour Microsoft Teams. Fonctionnalités IA de la plateforme et lead engineering sur les plateformes clients : Cuddy Brain, L'OR Remix, Cuddy Scanner.",
      },
      {
        role: "Développeur logiciel",
        company: "Freelance",
        period: "2023 → 2024",
        note: "Applications multiplateformes : un jeu pour enfants en React Native et un planificateur de voyage avec un backend Express et MongoDB.",
      },
      {
        role: "Développeur logiciel",
        company: "SolvR",
        period: "2023",
        note: "Refonte et livraison d'une app de chat React Native : messagerie temps réel, authentification, architecture d'état.",
      },
      {
        role: "Développeur logiciel",
        company: "Tynass IT",
        period: "2019 → 2022",
        note: "App de tourisme en RA, plateforme d'emploi, e-commerce et sites d'entreprise avec React, Express et MongoDB.",
      },
    ],
  },
  skills: {
    eyebrow: "Compétences",
    title: "Boîte à outils",
    groups: {
      frontend: "Frontend",
      backend: "Backend",
      ailtm: "IA & LLM",
      native: "Natif & systèmes",
      platform: "Plateformes & outils",
    },
  },
  contact: {
    eyebrow: "Contact",
    title: "Parlons-en.",
    line: "Un projet, un poste, une question ? Ma boîte mail est ouverte.",
    email: "M'écrire",
    footerLeft: "© 2026 Khalil Ben Ali · Faenza, Italie",
    footerRight: "Réalisé avec Astro et Three.js",
    backToTop: "Retour en haut",
  },
  resume: {
    title: "Khalil Ben Ali — Développeur Full-Stack & IA",
    role: "— Full-Stack & AI Engineer",
    location: "Faenza, Italie",
    backLink: "Retour au portfolio",
    downloadPdf: "Télécharger le PDF",
    skipLink: "Aller au CV",
    photoAlt: "Portrait de Khalil Ben Ali",
    sections: {
      summary: "PROFIL",
      experience: "EXPÉRIENCE",
      skills: "COMPÉTENCES",
      projects: "PROJETS PERSONNELS",
      education: "FORMATION",
      languages: "LANGUES",
    },
    summary:
      "Développeur full-stack (5+ ans) : plateformes TypeScript, applications desktop .NET et IA en production. Ingénieur principal d'un hub opérationnel IA intégrant 10 systèmes SaaS pour un cabinet financier américain ; seul développeur d'une expérience de marque IA pour L'OR (JDE). Prend les systèmes en main de bout en bout, du schéma de données au WebGL, du prompt à la file d'impression.",
    nbold: {
      heading: "nBold — Développeur Full-Stack & IA · 2024 → auj. · télétravail (siège à Paris)",
      context: "nBold édite un SaaS de templates et de gouvernance d'espaces Microsoft Teams (ISO 27001, SOC 2).",
      bullets: [
        "Conception et développement de bout en bout de la fonctionnalité d'intelligence de réunions Teams (~11 000 lignes, 67 fichiers, 321 tests) : capture des transcriptions via Microsoft Graph avec un nouveau chemin d'authentification app-only, résumé par IA et routage LLM contextualisé CRM vers des Adaptive Cards Teams, sur des workflows durables prouvés résistants aux crashs.",
        "Ingénieur principal de Cuddy Brain, hub opérationnel intégré à Teams qui réplique 10 systèmes SaaS dans PostgreSQL (~115 tables) ; ~3 860 commits, environ 69 % de l'historique backend (NestJS, BullMQ/Redis, React, Azure OpenAI).",
        "Livraison de l'intelligence d'appels : les appels sont transcrits, résumés par Azure OpenAI et transformés en tâches publiées dans Teams en Adaptive Cards quelques minutes après la fin de l'appel, avec verrouillage single-flight et reprise après incident.",
        "Développement de systèmes de surveillance IA (adjudication de décès avec contrôles déterministes ; détection de déménagements croisant registres publics et communications clients) et co-développement d'un agent LangGraph qui compile des revues clients à partir de 7 systèmes.",
        "Fiabilisation de la plateforme : client Azure OpenAI partagé avec timeouts, retries et suivi de consommation, vérification HMAC des webhooks, CI de détection de secrets, cache et optimisations N+1.",
        "Seul développeur de L'OR UNLIMITED REMIX (JDE × HLWN 2026), app de marque IA et borne événementielle : Gemini avec repli déterministe, vision CLIP embarquée, moteur de fluide WebGL à 60 fps, PWA offline-first et impression thermique Bluetooth. 129/129 commits, ~24 600 lignes, 11 semaines jusqu'à la production.",
        "Développement de Cuddy Scanner, scanner de documents .NET 9/WPF (TWAIN, séparation par code-barres, assemblage PDF, classement SharePoint) utilisé quotidiennement en production.",
      ],
    },
    freelance: {
      heading: "Freelance — Développeur logiciel · 2023 → 2024",
      bullets: [
        "Jeu pour enfants (React Native, Expo, Redux) et planificateur de voyage multiplateforme (React Native + MobX, backend Express/MongoDB, admin React).",
      ],
    },
    solvr: {
      heading: "SolvR — Développeur logiciel · 2023",
      bullets: [
        "Refonte et livraison d'une app de chat multiplateforme (React Native, Expo, MobX, Firebase) : messagerie temps réel, authentification sécurisée, architecture d'état.",
      ],
    },
    tynass: {
      heading: "Tynass IT — Développeur logiciel · 2019 → 2022",
      bullets: [
        "Livraison d'une app de tourisme en réalité augmentée, d'une plateforme d'emploi, d'un e-commerce mode et de sites d'entreprise (React, Material-UI, Express, MongoDB).",
      ],
    },
    skillsLine:
      "TypeScript · React/Next.js · React Native · NestJS/Node · PostgreSQL · Redis/BullMQ · Azure OpenAI · Gemini · LangGraph · RAG (pgvector) · transformers.js · C#/.NET 9 · WPF · C++20/JUCE · Microsoft Graph & Teams · Salesforce · Docker · GitHub Actions · Vercel",
    sideProjects: [
      "HyperMesh DSP & HyperGpu (C++20/JUCE) : maillage LAN pour le déport de DSP temps réel et hôte de plugins accéléré GPU ; builds CI pour 5 plateformes.",
      "Assurances BIAT KB : chatbot RAG explicable (NestJS, pgvector, Ollama), réponses citées et journal d'audit RBAC.",
    ],
    education:
      "Licence en communication multimédia, Institut Supérieur des Arts Multimédia de la Manouba (ISAMM), 2019",
    languagesLine: "Arabe (natif) · Anglais (professionnel) · Français (A2–B1) · Italien (A2)",
  },
};

const it: Dict = {
  meta: {
    description:
      "Khalil Ben Ali, sviluppatore full-stack e AI a Faenza. Piattaforme Microsoft Teams, modelli di visione nel browser e sistemi AI in produzione.",
  },
  skipLink: "Vai al contenuto",
  nav: { work: "Progetti", ai: "AI", experience: "Percorso", contact: "Contatti", resume: "CV" },
  hero: {
    eyebrow: "Sviluppatore Full-Stack & AI · Faenza, Italia",
    lead: "Costruisco piattaforme in cui l'AI lavora davvero: prodotti per Microsoft Teams, modelli di visione che girano nel browser e pipeline che reggono in produzione.",
    viewWork: "I miei progetti",
    downloadCv: "Scarica il CV",
    scroll: "scorri",
  },
  work: {
    eyebrow: "Progetti selezionati",
    title: "Quello che ho realizzato",
    production: "In produzione",
    privateRepo: "Repo privato",
    viewCode: "Vedi il codice",
    projects: {
      cuddy: {
        subtitle:
          "Hub operativo interno di una società americana di consulenza patrimoniale: dieci strumenti SaaS riuniti in un'unica schermata, con l'AI sopra.",
        highlights: [
          "Salesforce, Microsoft 365, RingCentral, QuickBooks e altri sei sistemi unificati in un hub PostgreSQL",
          "Le chiamate dei clienti vengono trascritte, riassunte e trasformate in attività Teams in pochi minuti",
          "Il monitoraggio AI con controlli deterministici protegge le pratiche successorie delicate",
        ],
      },
      lor: {
        subtitle:
          "Web app di brand e chiosco per eventi per L'OR (JDE). Unico sviluppatore, dal primo commit agli eventi dal vivo.",
        highlights: [
          "La visione CLIP gira direttamente sul dispositivo: i selfie non lasciano mai il browser",
          "Gemini scrive le ricette, con un fallback deterministico che funziona completamente offline",
          "Una simulazione fluida WebGL a 60 fps, più la stampa Bluetooth dei biglietti termici agli eventi",
        ],
      },
      meeting: {
        subtitle:
          "Le trascrizioni delle riunioni Teams vengono catturate via Microsoft Graph, riassunte dall'AI e instradate nel canale giusto grazie al contesto CRM.",
        highlights: [
          "Ho progettato l'architettura e poi sviluppato l'intera funzionalità da solo, con 321 test",
          "Un nuovo percorso di autenticazione Graph app-only sblocca la cattura delle trascrizioni a livello di tenant",
          "Workflow durevoli sopravvivono ai riavvii dell'API senza consegne duplicate",
        ],
      },
      scanner: {
        subtitle: "Scanner di documenti nativo in .NET 9, usato ogni giorno in uno studio finanziario.",
        highlights: [
          "Pilota gli scanner TWAIN dell'ufficio e separa i lotti automaticamente con i codici a barre",
          "Assembla i PDF e li archivia in SharePoint con i metadati corretti",
          "Clean Architecture, firmato MSIX, e riprende le sessioni di scansione interrotte",
        ],
      },
      audio: {
        subtitle:
          "Ricerca audio personale in C++: hosting di plugin accelerato dalla GPU e una mesh LAN che sposta il DSP in tempo reale tra le macchine.",
        highlights: [
          "Buffer lock-free, compensazione adattiva del jitter e correzione degli errori (FEC) in rete",
          "Scansione dei plugin isolata dai crash e IPC multipiattaforma tra manager e wrapper",
          "La CI pubblica build autonome per cinque piattaforme",
        ],
      },
    },
    biatText:
      "Chatbot RAG spiegabile (pgvector + Ollama): risposte citate e verificabili, accessi in base al ruolo.",
    moreLine: "Altri progetti ed esperimenti sono su GitHub.",
  },
  ai: {
    eyebrow: "Ingegneria AI",
    title: "Come lavoro con l'AI",
    cards: [
      {
        title: "In produzione per utenti reali",
        body: "Trascrizione e riassunto delle chiamate, decisioni LLM protette da controlli deterministici, agenti LangGraph che attingono da sette sistemi, visione CLIP nel browser, RAG su pgvector e connettori Copilot.",
      },
      {
        title: "Prima l'affidabilità",
        body: "Interfacce indipendenti dal fornitore, degradazione controllata, client LLM irrobustiti con timeout e retry limitati, e piena visibilità su token, latenza e costi.",
      },
    ],
  },
  experience: {
    eyebrow: "Percorso",
    title: "Dove ho lavorato",
    now: "2024 → oggi",
    entries: [
      {
        role: "Sviluppatore Full-Stack & AI",
        company: "nBold",
        period: "2024 → oggi",
        note: "SaaS parigino di template e governance per Microsoft Teams. Funzionalità AI della piattaforma e lead engineering sulle piattaforme dei clienti: Cuddy Brain, L'OR Remix, Cuddy Scanner.",
      },
      {
        role: "Sviluppatore software",
        company: "Freelance",
        period: "2023 → 2024",
        note: "App multipiattaforma: un gioco per bambini in React Native e un pianificatore di viaggi con backend Express e MongoDB.",
      },
      {
        role: "Sviluppatore software",
        company: "SolvR",
        period: "2023",
        note: "Refactoring e rilascio di un'app di chat React Native: messaggistica in tempo reale, autenticazione, architettura dello stato.",
      },
      {
        role: "Sviluppatore software",
        company: "Tynass IT",
        period: "2019 → 2022",
        note: "App di turismo in AR, piattaforma di lavoro, e-commerce e siti aziendali con React, Express e MongoDB.",
      },
    ],
  },
  skills: {
    eyebrow: "Competenze",
    title: "Cassetta degli attrezzi",
    groups: {
      frontend: "Frontend",
      backend: "Backend",
      ailtm: "AI & LLM",
      native: "Nativo & sistemi",
      platform: "Piattaforme & strumenti",
    },
  },
  contact: {
    eyebrow: "Contatti",
    title: "Parliamone.",
    line: "Un progetto, un ruolo, una domanda? La mia casella è aperta.",
    email: "Scrivimi",
    footerLeft: "© 2026 Khalil Ben Ali · Faenza, Italia",
    footerRight: "Fatto con Astro e Three.js",
    backToTop: "Torna su",
  },
  resume: {
    title: "Khalil Ben Ali — Sviluppatore Full-Stack & AI",
    role: "— Full-Stack & AI Engineer",
    location: "Faenza, Italia",
    backLink: "Torna al portfolio",
    downloadPdf: "Scarica il PDF",
    skipLink: "Vai al CV",
    photoAlt: "Ritratto di Khalil Ben Ali",
    sections: {
      summary: "PROFILO",
      experience: "ESPERIENZA",
      skills: "COMPETENZE",
      projects: "PROGETTI PERSONALI",
      education: "FORMAZIONE",
      languages: "LINGUE",
    },
    summary:
      "Sviluppatore full-stack (5+ anni): piattaforme TypeScript, applicazioni desktop .NET e AI in produzione. Ingegnere principale di un hub operativo AI che integra 10 sistemi SaaS per una società finanziaria americana; unico sviluppatore di un'esperienza di brand AI per L'OR (JDE). Gestisce i sistemi dall'inizio alla fine, dallo schema dati al WebGL, dal prompt alla coda di stampa.",
    nbold: {
      heading: "nBold — Sviluppatore Full-Stack & AI · 2024 → oggi · remoto (sede a Parigi)",
      context: "nBold sviluppa un SaaS di template e governance per gli spazi Microsoft Teams (ISO 27001, SOC 2).",
      bullets: [
        "Progettazione e sviluppo end-to-end della funzionalità di meeting intelligence per Teams (~11.000 righe, 67 file, 321 test): cattura delle trascrizioni via Microsoft Graph con un nuovo percorso di autenticazione app-only, riassunti AI e instradamento LLM basato sul CRM verso Adaptive Cards di Teams, su workflow durevoli a prova di crash.",
        "Ingegnere principale di Cuddy Brain, hub operativo integrato in Teams che replica 10 sistemi SaaS in PostgreSQL (~115 tabelle); ~3.860 commit, circa il 69% della storia del backend (NestJS, BullMQ/Redis, React, Azure OpenAI).",
        "Rilascio dell'intelligence sulle chiamate: le chiamate vengono trascritte, riassunte da Azure OpenAI e trasformate in attività pubblicate su Teams come Adaptive Cards pochi minuti dopo la chiusura, con lock single-flight e ripristino dai crash.",
        "Sviluppo di sistemi di monitoraggio AI (verifica dei decessi con controlli deterministici; rilevamento dei cambi di indirizzo incrociando registri pubblici e comunicazioni dei clienti) e co-sviluppo di un agente LangGraph che compila le revisioni dei clienti da 7 sistemi.",
        "Irrobustimento della piattaforma: client Azure OpenAI condiviso con timeout, retry e tracciamento dei consumi, verifica HMAC dei webhook, CI di scansione dei segreti, caching e ottimizzazioni N+1.",
        "Unico sviluppatore di L'OR UNLIMITED REMIX (JDE × HLWN 2026), app di brand AI e chiosco per eventi: Gemini con fallback deterministico, visione CLIP sul dispositivo, motore fluido WebGL a 60 fps, PWA offline-first e stampa termica Bluetooth. 129/129 commit, ~24.600 righe, 11 settimane fino alla produzione.",
        "Sviluppo di Cuddy Scanner, scanner di documenti .NET 9/WPF (TWAIN, separazione con codici a barre, assemblaggio PDF, archiviazione SharePoint) in uso quotidiano in produzione.",
      ],
    },
    freelance: {
      heading: "Freelance — Sviluppatore software · 2023 → 2024",
      bullets: [
        "Gioco per bambini (React Native, Expo, Redux) e pianificatore di viaggi multipiattaforma (React Native + MobX, backend Express/MongoDB, admin React).",
      ],
    },
    solvr: {
      heading: "SolvR — Sviluppatore software · 2023",
      bullets: [
        "Refactoring e rilascio di un'app di chat multipiattaforma (React Native, Expo, MobX, Firebase): messaggistica in tempo reale, autenticazione sicura, architettura dello stato.",
      ],
    },
    tynass: {
      heading: "Tynass IT — Sviluppatore software · 2019 → 2022",
      bullets: [
        "Realizzazione di un'app di turismo in realtà aumentata, una piattaforma di lavoro, un e-commerce di moda e siti aziendali (React, Material-UI, Express, MongoDB).",
      ],
    },
    skillsLine:
      "TypeScript · React/Next.js · React Native · NestJS/Node · PostgreSQL · Redis/BullMQ · Azure OpenAI · Gemini · LangGraph · RAG (pgvector) · transformers.js · C#/.NET 9 · WPF · C++20/JUCE · Microsoft Graph & Teams · Salesforce · Docker · GitHub Actions · Vercel",
    sideProjects: [
      "HyperMesh DSP & HyperGpu (C++20/JUCE): mesh LAN per l'offload del DSP in tempo reale e host di plugin accelerato GPU; build CI per 5 piattaforme.",
      "Assurances BIAT KB: chatbot RAG spiegabile (NestJS, pgvector, Ollama) con risposte citate e audit trail RBAC.",
    ],
    education:
      "Laurea in Comunicazione Multimediale, Higher Institute of Multimedia Arts of Manouba (ISAMM), 2019",
    languagesLine: "Arabo (madrelingua) · Inglese (professionale) · Francese (A2–B1) · Italiano (A2)",
  },
};

const dicts: Record<Locale, Dict> = { en, fr, it };

export function t(locale: Locale): Dict {
  return dicts[locale];
}
