import type { DEdge, DNode } from "../components/Diagram.astro";

export interface DiagramSpec {
  id: string;
  title: string;
  nodes: DNode[];
  edges: DEdge[];
}

/** D1 — Cuddy Brain: 10 SaaS systems → PostgreSQL hub → AI engine → Teams */
export const cuddyDiagram: DiagramSpec = {
  id: "d-cuddy",
  title:
    "Cuddy Brain architecture: Salesforce, Microsoft 365, RingCentral, QuickBooks and more sync into a PostgreSQL hub, an AI engine processes them, results land in Microsoft Teams",
  nodes: [
    { id: "sf", x: 20, y: 36, w: 150, icon: "database", label: "Salesforce" },
    { id: "m365", x: 20, y: 102, w: 150, icon: "layout-grid", label: "Microsoft 365" },
    { id: "rc", x: 20, y: 168, w: 150, icon: "phone", label: "RingCentral" },
    { id: "qb", x: 20, y: 234, w: 150, icon: "receipt", label: "QuickBooks" },
    { id: "more", x: 20, y: 300, w: 150, icon: "layers", label: "+6 systems" },
    { id: "hub", x: 252, y: 108, w: 172, icon: "database", label: "PostgreSQL Hub", sub: "one source of truth" },
    { id: "ai", x: 252, y: 252, w: 172, icon: "sparkles", label: "AI Engine", sub: "transcribe · adjudicate" },
    { id: "teams", x: 478, y: 178, w: 142, icon: "message-square", label: "Teams", sub: "Adaptive Cards" },
  ],
  edges: [
    { from: "sf@right", to: "hub@left" },
    { from: "m365@right", to: "hub@left" },
    { from: "rc@right", to: "hub@left" },
    { from: "qb@right", to: "hub@left" },
    { from: "more@right", to: "hub@left" },
    { from: "hub@bottom", to: "ai@top" },
    { from: "ai@right", to: "teams@bottom", via: [[549, 284]] },
    { from: "hub@right", to: "teams@left" },
  ],
};

/** D2 — nBold Meeting Intelligence pipeline */
export const meetingDiagram: DiagramSpec = {
  id: "d-meeting",
  title:
    "Meeting intelligence pipeline: a Teams meeting triggers a Microsoft Graph webhook, transcripts land in an idempotent inbox, get AI-summarized, routed via CRM lookup and delivered as an Adaptive Card",
  nodes: [
    { id: "meet", x: 20, y: 64, w: 178, icon: "video", label: "Teams Meeting" },
    { id: "hook", x: 240, y: 64, w: 178, icon: "webhook", label: "Graph Webhook", sub: "validated · signed" },
    { id: "inbox", x: 462, y: 64, w: 158, icon: "inbox", label: "Inbox", sub: "idempotent" },
    { id: "sum", x: 20, y: 262, w: 178, icon: "sparkles", label: "AI Summary", sub: "actions extracted" },
    { id: "route", x: 240, y: 262, w: 178, icon: "git-branch", label: "CRM Routing", sub: "Salesforce lookup" },
    { id: "card", x: 462, y: 262, w: 158, icon: "badge-check", label: "Adaptive Card" },
  ],
  edges: [
    { from: "meet@right", to: "hook@left" },
    { from: "hook@right", to: "inbox@left" },
    { from: "inbox@bottom", to: "sum@top", via: [[541, 186], [109, 186]] },
    { from: "sum@right", to: "route@left" },
    { from: "route@right", to: "card@left" },
  ],
};

/** D3 — L'OR Unlimited Remix: inputs → on-device CLIP / Gemini → recipe → outputs */
export const lorDiagram: DiagramSpec = {
  id: "d-lor",
  title:
    "L'OR Remix flow: a selfie or music taste runs through on-device CLIP vision or Gemini, produces a personalized recipe, and outputs a WebGL pour animation, a thermal ticket with QR code, or a share card",
  nodes: [
    { id: "selfie", x: 20, y: 48, w: 142, icon: "camera", label: "Selfie" },
    { id: "music", x: 20, y: 190, w: 142, icon: "music", label: "Music taste" },
    { id: "clip", x: 218, y: 48, w: 172, icon: "cpu", label: "CLIP on-device", sub: "in-browser · private" },
    { id: "gem", x: 218, y: 190, w: 172, icon: "sparkles", label: "Gemini", sub: "deterministic fallback" },
    { id: "recipe", x: 452, y: 118, w: 152, icon: "coffee", label: "Recipe" },
    { id: "pour", x: 62, y: 322, w: 152, icon: "waves", label: "WebGL pour" },
    { id: "ticket", x: 252, y: 322, w: 172, icon: "printer", label: "Ticket + QR", sub: "Web Bluetooth" },
    { id: "share", x: 462, y: 322, w: 142, icon: "share-2", label: "Share card" },
  ],
  edges: [
    { from: "selfie@right", to: "clip@left" },
    { from: "music@right", to: "gem@left" },
    { from: "clip@right", to: "recipe@left" },
    { from: "gem@right", to: "recipe@left" },
    { from: "recipe@bottom", to: "pour@top", via: [[528, 288], [138, 288]] },
    { from: "recipe@bottom", to: "ticket@top", via: [[528, 288], [338, 288]] },
    { from: "recipe@bottom", to: "share@top", via: [[528, 288], [533, 288]] },
  ],
};

/** D4 — Cuddy Scanner pipeline */
export const scannerDiagram: DiagramSpec = {
  id: "d-scanner",
  title:
    "Cuddy Scanner pipeline: a TWAIN scanner feeds barcode-based batch splitting, PDFs are assembled and uploaded to SharePoint with MSAL authentication",
  nodes: [
    { id: "twain", x: 20, y: 96, w: 172, icon: "scan-line", label: "TWAIN Scanner", sub: "duplex · ADF" },
    { id: "split", x: 236, y: 96, w: 168, icon: "barcode", label: "Barcode Split" },
    { id: "pdf", x: 448, y: 96, w: 168, icon: "file-text", label: "PDF Assembly" },
    { id: "msal", x: 20, y: 282, w: 152, icon: "key-round", label: "MSAL auth" },
    { id: "sp", x: 236, y: 282, w: 180, icon: "cloud-upload", label: "SharePoint", sub: "metadata tagging" },
  ],
  edges: [
    { from: "twain@right", to: "split@left" },
    { from: "split@right", to: "pdf@left" },
    { from: "pdf@bottom", to: "sp@top", via: [[532, 234], [326, 234]] },
    { from: "msal@right", to: "sp@left" },
  ],
};

/** D5 — HyperMesh / HyperGpu audio mesh */
export const audioDiagram: DiagramSpec = {
  id: "d-audio",
  title:
    "Audio mesh: a DAW hosts the wrapper plugin, which offloads DSP over the LAN to load-scored servers and a GPU engine, audio returns to the DAW",
  nodes: [
    { id: "daw", x: 20, y: 64, w: 152, icon: "sliders-horizontal", label: "DAW" },
    { id: "wrap", x: 20, y: 252, w: 152, icon: "plug", label: "Wrapper plugin", sub: "VST3 / AU" },
    { id: "srva", x: 250, y: 96, w: 162, icon: "server", label: "Server A", sub: "load-scored" },
    { id: "srvb", x: 250, y: 252, w: 162, icon: "server", label: "Server B", sub: "load-scored" },
    { id: "gpu", x: 468, y: 170, w: 150, icon: "zap", label: "GPU Engine" },
  ],
  edges: [
    { from: "daw@bottom", to: "wrap@top" },
    { from: "wrap@right", to: "srva@left", label: "FEC" },
    { from: "wrap@right", to: "srvb@left", label: "jitter buffer" },
    { from: "srva@right", to: "gpu@left" },
    { from: "srvb@right", to: "gpu@bottom", via: [[543, 284]] },
    { from: "gpu@top", to: "daw@top", via: [[543, 30], [96, 30]] },
  ],
};
