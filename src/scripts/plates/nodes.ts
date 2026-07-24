import {
  clamp,
  createSeededRandom,
  easeOutCubic,
  initPlate,
  lerp,
  plateCanvases,
  type PlateController,
  type PlateFrame,
  type PlateRenderer,
} from "./engine";

interface NodePoint {
  x: number;
  y: number;
  radius: number;
}

interface Edge {
  from: number;
  to: number;
  offset: number;
  duration: number;
}

const BASE_NODES: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.5],
  [0.18, 0.2],
  [0.36, 0.15],
  [0.65, 0.16],
  [0.84, 0.25],
  [0.15, 0.46],
  [0.34, 0.39],
  [0.68, 0.37],
  [0.86, 0.5],
  [0.19, 0.73],
  [0.4, 0.78],
  [0.62, 0.7],
  [0.82, 0.77],
  [0.53, 0.88],
];

const EDGE_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 2],
  [1, 5],
  [2, 6],
  [3, 4],
  [3, 7],
  [4, 8],
  [5, 6],
  [5, 9],
  [6, 0],
  [7, 0],
  [7, 8],
  [8, 12],
  [9, 10],
  [10, 0],
  [10, 13],
  [11, 0],
  [11, 13],
  [12, 11],
];

function createLayout(): { nodes: NodePoint[]; edges: Edge[] } {
  const random = createSeededRandom(0xc0dd7);
  const nodes = BASE_NODES.map(([x, y], index) => ({
    x: clamp(x + (index === 0 ? 0 : (random() - 0.5) * 0.035), 0.08, 0.92),
    y: clamp(y + (index === 0 ? 0 : (random() - 0.5) * 0.035), 0.08, 0.92),
    radius: index === 0 ? 10 : 4.5 + random() * 2.2,
  }));
  const edges = EDGE_PAIRS.map(([from, to], index) => ({
    from,
    to,
    offset: (index * 0.41 + random() * 0.24) % 3.6,
    duration: 2.7 + random() * 1.2,
  }));

  return { nodes, edges };
}

function createNodesRenderer(): PlateRenderer {
  const layout = createLayout();

  return {
    staticTime: 6.5,
    render(frame: PlateFrame): void {
      const { ctx, width, height, inset, elapsed, intro, colors } = frame;
      const drawingWidth = width - inset * 2;
      const drawingHeight = height - inset * 2;
      const points = layout.nodes.map((node) => ({
        x: inset + node.x * drawingWidth,
        y: inset + node.y * drawingHeight,
        radius: node.radius,
      }));

      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.cobalt;
      ctx.fillStyle = colors.cobalt;

      layout.edges.forEach((edge, index) => {
        const from = points[edge.from];
        const to = points[edge.to];
        if (!from || !to) {
          return;
        }

        const edgeIntro = easeOutCubic(clamp(intro * 1.35 - index * 0.025));
        const drawX = lerp(from.x, to.x, edgeIntro);
        const drawY = lerp(from.y, to.y, edgeIntro);
        ctx.globalAlpha = 0.34 + edgeIntro * 0.46;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(drawX, drawY);
        ctx.stroke();
      });

      let hubArrival = 0;
      layout.edges.forEach((edge) => {
        if (edge.to !== 0) {
          return;
        }
        const from = points[edge.from];
        const hub = points[0];
        if (!from || !hub) {
          return;
        }

        const progress = ((elapsed + edge.offset) % edge.duration) / edge.duration;
        const travel = easeOutCubic(progress);
        const x = lerp(from.x, hub.x, travel);
        const y = lerp(from.y, hub.y, travel);
        ctx.globalAlpha = clamp(intro * 1.5) * (0.55 + progress * 0.45);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();

        if (progress > 0.86) {
          hubArrival = Math.max(
            hubArrival,
            Math.sin(((progress - 0.86) / 0.14) * Math.PI),
          );
        }
      });

      points.forEach((point, index) => {
        const nodeIntro = easeOutCubic(clamp(intro * 1.45 - index * 0.035));
        ctx.globalAlpha = nodeIntro;
        ctx.fillStyle = colors.tint;
        ctx.strokeStyle = colors.cobalt;
        ctx.beginPath();
        ctx.arc(
          point.x,
          point.y,
          point.radius * (0.72 + nodeIntro * 0.28),
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();

        if (index === 0) {
          ctx.globalAlpha = nodeIntro * (0.4 + hubArrival * 0.6);
          ctx.beginPath();
          ctx.arc(
            point.x,
            point.y,
            point.radius + 5 + hubArrival * 4,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
      });

      const alertCycle = elapsed % 9.2;
      if (alertCycle > 5.8 && alertCycle < 7.2) {
        const alert = Math.sin(((alertCycle - 5.8) / 1.4) * Math.PI);
        const alertNode = points[12];
        if (alertNode) {
          ctx.globalAlpha = clamp(intro * 1.5) * alert;
          ctx.strokeStyle = colors.signal;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            alertNode.x,
            alertNode.y,
            alertNode.radius + 5 + alert * 7,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
    },
  };
}

export function initNodesPlate(canvas: HTMLCanvasElement): PlateController {
  return initPlate(canvas, createNodesRenderer());
}

export function initNodesPlates(
  root: ParentNode = document,
): PlateController[] {
  return plateCanvases(
    root,
    '[data-plate="nodes"], [data-plate-nodes]',
  ).map(initNodesPlate);
}
