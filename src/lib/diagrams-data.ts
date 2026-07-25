import type { DEdge, DNode, DZone } from "../components/Diagram.astro";

export interface DiagramSpec {
  id: string;
  title: string;
  nodes: DNode[];
  edges: DEdge[];
  /** dashed hulls that name the architecture tiers (labels stay English) */
  zones?: DZone[];
}

/**
 * Geometry notes (V3):
 * - Node widths are sized so the mono label/sublabel never overflows the plate.
 *   JetBrains Mono advances 0.6em, so a sublabel needs
 *   `45 (icon chip gutter) + len * 0.62 * 10.5 + 8` px of plate width.
 * - Fan-ins route onto an orthogonal collector bus instead of stacking
 *   diagonal arrowheads on one pixel; only the trunk edge keeps `tip`.
 * - Zone rects are hulls with ~12px padding; buses run in the gaps between them.
 */

/** D1 — Cuddy Brain: 10 SaaS systems → PostgreSQL hub → AI engine → Teams */
export const cuddyDiagram: DiagramSpec = {
  id: "d-cuddy",
  title:
    "Cuddy Brain architecture: Salesforce, Microsoft 365, RingCentral, QuickBooks and more sync into a PostgreSQL hub, an AI engine processes them, results land in Microsoft Teams",
  nodes: [
    { id: "sf", x: 20, y: 36, w: 154, icon: "database", label: "Salesforce" },
    { id: "m365", x: 20, y: 102, w: 154, icon: "layout-grid", label: "Microsoft 365" },
    { id: "rc", x: 20, y: 168, w: 154, icon: "phone", label: "RingCentral" },
    { id: "qb", x: 20, y: 234, w: 154, icon: "receipt", label: "QuickBooks" },
    { id: "more", x: 20, y: 300, w: 154, icon: "layers", label: "+6 systems" },
    { id: "hub", x: 244, y: 108, w: 204, icon: "database", label: "PostgreSQL Hub", sub: "one source of truth" },
    {
      id: "ai",
      x: 244,
      y: 252,
      w: 204,
      icon: "sparkles",
      label: "AI Engine",
      sub: "transcribe · adjudicate",
      led: "processing",
    },
    { id: "teams", x: 476, y: 178, w: 146, icon: "message-square", label: "Teams", sub: "Adaptive Cards" },
  ],
  edges: [
    /* collector bus: five sources join a rail at x=211, one arrowhead at the hub */
    { from: "sf@right", to: "hub@left", via: [[211, 60], [211, 140]], tip: false },
    { from: "m365@right", to: "hub@left", via: [[211, 126], [211, 140]] },
    { from: "rc@right", to: "hub@left", via: [[211, 192], [211, 140]], tip: false },
    { from: "qb@right", to: "hub@left", via: [[211, 258], [211, 140]], tip: false },
    { from: "more@right", to: "hub@left", via: [[211, 324], [211, 140]], tip: false },
    { from: "hub@bottom", to: "ai@top" },
    { from: "ai@right", to: "teams@bottom", via: [[549, 284]] },
    { from: "hub@right", to: "teams@left", via: [[462, 140], [462, 210]] },
  ],
  zones: [
    { label: "SOURCES", x: 8, y: 22, w: 178, h: 340 },
    { label: "CORE", x: 234, y: 94, w: 224, h: 236 },
    { label: "DELIVERY", x: 466, y: 164, w: 166, h: 92 },
  ],
};

/** D2 — nBold Meeting Intelligence pipeline */
export const meetingDiagram: DiagramSpec = {
  id: "d-meeting",
  title:
    "Meeting intelligence pipeline: a Teams meeting triggers a Microsoft Graph webhook, transcripts land in an idempotent inbox, get AI-summarized, routed via CRM lookup and delivered as an Adaptive Card",
  nodes: [
    { id: "meet", x: 20, y: 64, w: 178, icon: "video", label: "Teams Meeting" },
    {
      id: "hook",
      x: 240,
      y: 64,
      w: 178,
      icon: "webhook",
      label: "Graph Webhook",
      sub: "validated · signed",
      led: "processing",
    },
    { id: "inbox", x: 462, y: 64, w: 158, icon: "inbox", label: "Inbox", sub: "idempotent" },
    { id: "sum", x: 20, y: 262, w: 178, icon: "sparkles", label: "AI Summary", sub: "actions extracted" },
    { id: "route", x: 240, y: 262, w: 178, icon: "git-branch", label: "CRM Routing", sub: "Salesforce lookup" },
    { id: "card", x: 462, y: 262, w: 158, icon: "badge-check", label: "Adaptive Card" },
  ],
  edges: [
    { from: "meet@right", to: "hook@left", via: [[219, 88], [219, 96]] },
    { from: "hook@right", to: "inbox@left" },
    { from: "inbox@bottom", to: "sum@top", via: [[541, 186], [109, 186]] },
    { from: "sum@right", to: "route@left" },
    { from: "route@right", to: "card@left", via: [[440, 294], [440, 286]] },
  ],
  zones: [
    { label: "INGEST", x: 8, y: 50, w: 624, h: 92 },
    { label: "PROCESS", x: 8, y: 248, w: 624, h: 92 },
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
    { id: "clip", x: 200, y: 48, w: 200, icon: "cpu", label: "CLIP on-device", sub: "in-browser · private" },
    { id: "gem", x: 200, y: 190, w: 200, icon: "sparkles", label: "Gemini", sub: "deterministic fallback" },
    { id: "recipe", x: 452, y: 118, w: 152, icon: "coffee", label: "Recipe", led: "healthy" },
    { id: "pour", x: 62, y: 322, w: 152, icon: "waves", label: "WebGL pour" },
    { id: "ticket", x: 252, y: 322, w: 172, icon: "printer", label: "Ticket + QR", sub: "Web Bluetooth" },
    { id: "share", x: 462, y: 322, w: 142, icon: "share-2", label: "Share card" },
  ],
  edges: [
    { from: "selfie@right", to: "clip@left", via: [[181, 72], [181, 80]] },
    { from: "music@right", to: "gem@left", via: [[181, 214], [181, 222]] },
    /* collector bus: both inference paths join a rail at x=426 */
    { from: "clip@right", to: "recipe@left", via: [[426, 80], [426, 142]] },
    { from: "gem@right", to: "recipe@left", via: [[426, 222], [426, 142]], tip: false },
    /* distribution bus: one trunk down from the recipe, three drops */
    { from: "recipe@bottom", to: "pour@top", via: [[528, 288], [138, 288]] },
    { from: "recipe@bottom", to: "ticket@top", via: [[528, 288], [338, 288]] },
    { from: "recipe@bottom", to: "share@top", via: [[528, 288], [533, 288]] },
  ],
  zones: [
    { label: "INPUT", x: 8, y: 34, w: 166, h: 218 },
    { label: "INFERENCE", x: 188, y: 34, w: 428, h: 234 },
    { label: "OUTPUT", x: 48, y: 308, w: 568, h: 86 },
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
    {
      id: "sp",
      x: 236,
      y: 282,
      w: 180,
      icon: "cloud-upload",
      label: "SharePoint",
      sub: "metadata tagging",
      led: "healthy",
    },
  ],
  edges: [
    { from: "twain@right", to: "split@left", via: [[214, 128], [214, 120]] },
    { from: "split@right", to: "pdf@left" },
    { from: "pdf@bottom", to: "sp@top", via: [[532, 234], [326, 234]] },
    { from: "msal@right", to: "sp@left", via: [[204, 306], [204, 314]] },
  ],
  zones: [
    { label: "CAPTURE", x: 8, y: 82, w: 620, h: 92 },
    { label: "PUBLISH", x: 8, y: 268, w: 420, h: 92 },
  ],
};

/** D5 — HyperMesh / HyperGpu audio mesh */
export const audioDiagram: DiagramSpec = {
  id: "d-audio",
  title:
    "Audio mesh: a DAW hosts the wrapper plugin, which offloads DSP over the LAN to load-scored servers and a GPU engine, audio returns to the DAW",
  nodes: [
    { id: "daw", x: 20, y: 64, w: 160, icon: "sliders-horizontal", label: "DAW" },
    { id: "wrap", x: 20, y: 252, w: 160, icon: "plug", label: "Wrapper plugin", sub: "VST3 / AU" },
    { id: "srva", x: 282, y: 96, w: 162, icon: "server", label: "Server A", sub: "load-scored" },
    { id: "srvb", x: 282, y: 252, w: 162, icon: "server", label: "Server B", sub: "load-scored" },
    { id: "gpu", x: 468, y: 170, w: 150, icon: "zap", label: "GPU Engine", led: "processing" },
  ],
  edges: [
    { from: "daw@bottom", to: "wrap@top" },
    { from: "wrap@right", to: "srva@left", label: "FEC", pill: true },
    { from: "wrap@right", to: "srvb@left", label: "jitter buffer", pill: true },
    { from: "srva@right", to: "gpu@left", via: [[456, 128], [456, 194]] },
    { from: "srvb@right", to: "gpu@bottom", via: [[543, 284]] },
    { from: "gpu@top", to: "daw@top", via: [[543, 30], [100, 30]] },
  ],
  zones: [
    { label: "LOCAL", x: 8, y: 50, w: 184, h: 280 },
    { label: "MESH", x: 270, y: 82, w: 360, h: 248 },
  ],
};
