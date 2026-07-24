/**
 * Central icon registry. Everything is inlined SVG (no runtime requests).
 * - Tech logos: simple-icons (fill: currentColor)
 * - UI icons: lucide-static raw SVGs (stroke: currentColor)
 * Brand icons removed upstream (OpenAI, Salesforce, LinkedIn) get lucide or
 * hand-inlined fallbacks.
 */
import {
  siAstro,
  siCmake,
  siCplusplus,
  siDocker,
  siDotnet,
  siExpress,
  siGit,
  siGithub,
  siGithubactions,
  siGooglegemini,
  siHuggingface,
  siJuce,
  siLangchain,
  siMongodb,
  siNestjs,
  siNextdotjs,
  siNodedotjs,
  siPostgresql,
  siRabbitmq,
  siReact,
  siRedis,
  siSocketdotio,
  siSqlite,
  siTailwindcss,
  siTypescript,
  siVercel,
  type SimpleIcon,
} from "simple-icons";

import arrowDown from "lucide-static/icons/arrow-down.svg?raw";
import arrowUp from "lucide-static/icons/arrow-up.svg?raw";
import audioWaveform from "lucide-static/icons/audio-waveform.svg?raw";
import badgeCheck from "lucide-static/icons/badge-check.svg?raw";
import barcode from "lucide-static/icons/barcode.svg?raw";
import brainCircuit from "lucide-static/icons/brain-circuit.svg?raw";
import camera from "lucide-static/icons/camera.svg?raw";
import check from "lucide-static/icons/check.svg?raw";
import cloud from "lucide-static/icons/cloud.svg?raw";
import cloudUpload from "lucide-static/icons/cloud-upload.svg?raw";
import coffee from "lucide-static/icons/coffee.svg?raw";
import cpu from "lucide-static/icons/cpu.svg?raw";
import database from "lucide-static/icons/database.svg?raw";
import download from "lucide-static/icons/download.svg?raw";
import fileText from "lucide-static/icons/file-text.svg?raw";
import gitBranch from "lucide-static/icons/git-branch.svg?raw";
import inbox from "lucide-static/icons/inbox.svg?raw";
import keyRound from "lucide-static/icons/key-round.svg?raw";
import layers from "lucide-static/icons/layers.svg?raw";
import layoutGrid from "lucide-static/icons/layout-grid.svg?raw";
import lock from "lucide-static/icons/lock.svg?raw";
import mail from "lucide-static/icons/mail.svg?raw";
import menu from "lucide-static/icons/menu.svg?raw";
import messageSquare from "lucide-static/icons/message-square.svg?raw";
import monitor from "lucide-static/icons/monitor.svg?raw";
import mouse from "lucide-static/icons/mouse.svg?raw";
import music from "lucide-static/icons/music.svg?raw";
import phone from "lucide-static/icons/phone.svg?raw";
import plug from "lucide-static/icons/plug.svg?raw";
import printer from "lucide-static/icons/printer.svg?raw";
import qrCode from "lucide-static/icons/qr-code.svg?raw";
import radio from "lucide-static/icons/radio.svg?raw";
import receipt from "lucide-static/icons/receipt.svg?raw";
import scanLine from "lucide-static/icons/scan-line.svg?raw";
import server from "lucide-static/icons/server.svg?raw";
import share2 from "lucide-static/icons/share-2.svg?raw";
import shieldCheck from "lucide-static/icons/shield-check.svg?raw";
import slidersHorizontal from "lucide-static/icons/sliders-horizontal.svg?raw";
import sparkles from "lucide-static/icons/sparkles.svg?raw";
import video from "lucide-static/icons/video.svg?raw";
import waves from "lucide-static/icons/waves.svg?raw";
import webhook from "lucide-static/icons/webhook.svg?raw";
import workflow from "lucide-static/icons/workflow.svg?raw";
import wrench from "lucide-static/icons/wrench.svg?raw";
import x from "lucide-static/icons/x.svg?raw";
import zap from "lucide-static/icons/zap.svg?raw";

function brand(icon: SimpleIcon): string {
  return `<svg viewBox="0 0 24 24" fill="currentColor" role="img" aria-hidden="true"><path d="${icon.path}"/></svg>`;
}

/* LinkedIn glyph (standard logo path; removed upstream from icon sets) */
const linkedin = `<svg viewBox="0 0 24 24" fill="currentColor" role="img" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>`;

/** UI icons (lucide, stroke currentColor) */
export const ui: Record<string, string> = {
  "arrow-down": arrowDown,
  "arrow-up": arrowUp,
  "audio-waveform": audioWaveform,
  "badge-check": badgeCheck,
  barcode,
  "brain-circuit": brainCircuit,
  camera,
  check,
  cloud,
  "cloud-upload": cloudUpload,
  coffee,
  cpu,
  database,
  download,
  "file-text": fileText,
  "git-branch": gitBranch,
  github: brand(siGithub),
  inbox,
  "key-round": keyRound,
  layers,
  "layout-grid": layoutGrid,
  linkedin,
  lock,
  mail,
  menu,
  "message-square": messageSquare,
  monitor,
  mouse,
  music,
  phone,
  plug,
  printer,
  "qr-code": qrCode,
  radio,
  receipt,
  "scan-line": scanLine,
  server,
  "share-2": share2,
  "shield-check": shieldCheck,
  "sliders-horizontal": slidersHorizontal,
  sparkles,
  video,
  waves,
  webhook,
  workflow,
  wrench,
  x,
  zap,
};

/** Tech chips/marquee: label → inline svg (null = text-only chip) */
export const tech: Record<string, string | null> = {
  TypeScript: brand(siTypescript),
  React: brand(siReact),
  "Next.js": brand(siNextdotjs),
  Astro: brand(siAstro),
  "Node.js": brand(siNodedotjs),
  NestJS: brand(siNestjs),
  Express: brand(siExpress),
  PostgreSQL: brand(siPostgresql),
  MongoDB: brand(siMongodb),
  Redis: brand(siRedis),
  RabbitMQ: brand(siRabbitmq),
  ".NET 9": brand(siDotnet),
  "C++20": brand(siCplusplus),
  "C#": null,
  WPF: null,
  JUCE: brand(siJuce),
  CMake: brand(siCmake),
  SQLite: brand(siSqlite),
  LiteDB: null,
  Protobuf: null,
  "Azure OpenAI": sparkles,
  Gemini: brand(siGooglegemini),
  "LangChain / LangGraph": brand(siLangchain),
  LangChain: brand(siLangchain),
  "transformers.js": brand(siHuggingface),
  "RAG · pgvector": null,
  WebGL: null,
  Tailwind: brand(siTailwindcss),
  GSAP: null,
  "Socket.IO": brand(siSocketdotio),
  Docker: brand(siDocker),
  "GitHub Actions": brand(siGithubactions),
  Vercel: brand(siVercel),
  Git: brand(siGit),
  Salesforce: cloud,
  "Microsoft Graph": null,
  "Microsoft Teams": messageSquare,
  SharePoint: cloudUpload,
  Azure: null,
  MSAL: keyRound,
  "React Native": brand(siReact),
  Drizzle: null,
  "PostHog LLM analytics": null,
  TWAIN: null,
  Ollama: null,
  pgvector: null,
};

export const marqueeItems: string[] = [
  "TypeScript",
  "React",
  "Next.js",
  "Astro",
  "Node.js",
  "NestJS",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "RabbitMQ",
  ".NET 9",
  "C++20",
  "Azure OpenAI",
  "Gemini",
  "LangChain",
  "Docker",
  "GitHub Actions",
  "Vercel",
];
