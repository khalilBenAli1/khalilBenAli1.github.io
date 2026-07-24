import {
  clamp,
  easeInOutCubic,
  easeOutCubic,
  initPlate,
  lerp,
  plateCanvases,
  roundedRectPath,
  type PlateController,
  type PlateFrame,
  type PlateRenderer,
} from "./engine";

const LINE_WIDTHS = [0.76, 0.91, 0.63, 0.82, 0.54] as const;
const BARCODE_PATTERN = [1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1] as const;

function createScanRenderer(): PlateRenderer {
  return {
    staticTime: 4.9,
    render(frame: PlateFrame): void {
      const { ctx, width, height, inset, elapsed, intro, colors } = frame;
      const availableWidth = width - inset * 2;
      const availableHeight = height - inset * 2;
      const pageWidth = Math.min(availableWidth * 0.7, availableHeight * 0.72);
      const pageHeight = availableHeight;
      const pageLeft = (width - pageWidth) / 2;
      const settledTop = inset;
      const cycle = elapsed % 8.4;

      let pageOffset = 0;
      let scanProgress = 0;
      let documentOpacity = 1;
      if (cycle < 1.05) {
        const feed = easeOutCubic(cycle / 1.05);
        pageOffset = lerp(-pageHeight * 0.88, 0, feed);
        documentOpacity = feed;
      } else if (cycle < 5.15) {
        scanProgress = easeInOutCubic((cycle - 1.05) / 4.1);
      } else if (cycle < 6.3) {
        scanProgress = 1;
      } else {
        scanProgress = 1;
        const eject = easeInOutCubic((cycle - 6.3) / 2.1);
        pageOffset = eject * pageHeight * 0.93;
        documentOpacity = 1 - clamp((eject - 0.72) / 0.28);
      }

      const pageTop = settledTop + pageOffset;
      const documentIntro = easeOutCubic(intro);
      const innerLeft = pageLeft + pageWidth * 0.13;
      const innerRight = pageLeft + pageWidth * 0.87;
      const beamY = pageTop + pageHeight * (0.12 + scanProgress * 0.76);

      ctx.save();
      ctx.globalAlpha = documentOpacity * documentIntro;
      ctx.strokeStyle = colors.cobalt;
      ctx.fillStyle = colors.tint;
      ctx.lineWidth = 2;
      roundedRectPath(ctx, pageLeft, pageTop, pageWidth, pageHeight, 12);
      ctx.fill();
      ctx.stroke();

      const headingY = pageTop + pageHeight * 0.13;
      ctx.fillStyle = colors.cobalt;
      ctx.fillRect(
        innerLeft,
        headingY,
        pageWidth * 0.34 * documentIntro,
        5,
      );

      LINE_WIDTHS.forEach((lineWidth, index) => {
        const y = pageTop + pageHeight * (0.27 + index * 0.105);
        const resolved = y <= beamY;
        ctx.setLineDash(resolved ? [] : [7, 7]);
        ctx.globalAlpha =
          documentOpacity *
          documentIntro *
          (resolved ? 1 : 0.42);
        ctx.beginPath();
        ctx.moveTo(innerLeft, y);
        ctx.lineTo(
          innerLeft + (innerRight - innerLeft) * lineWidth * documentIntro,
          y,
        );
        ctx.stroke();
      });
      ctx.setLineDash([]);

      if (scanProgress > 0.58) {
        const barcodeIntro = easeOutCubic((scanProgress - 0.58) / 0.2);
        const barcodeLeft = innerLeft;
        const barcodeTop = pageTop + pageHeight * 0.79;
        let cursor = barcodeLeft;
        ctx.globalAlpha = documentOpacity * documentIntro * barcodeIntro;
        BARCODE_PATTERN.forEach((bar, index) => {
          const barWidth = bar * 1.25;
          if (index % 2 === 0) {
            ctx.fillRect(cursor, barcodeTop, barWidth, pageHeight * 0.065);
          }
          cursor += barWidth;
        });
      }

      if (cycle >= 5.15 && cycle < 6.75) {
        const tickIntro = easeOutCubic(clamp((cycle - 5.15) / 0.38));
        const tickX = pageLeft + pageWidth * 0.78;
        const tickY = pageTop + pageHeight * 0.84;
        ctx.globalAlpha = documentOpacity * documentIntro * tickIntro;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tickX, tickY);
        ctx.lineTo(tickX + pageWidth * 0.045, tickY + pageHeight * 0.035);
        ctx.lineTo(tickX + pageWidth * 0.13, tickY - pageHeight * 0.055);
        ctx.stroke();
      }

      if (cycle >= 1.05 && cycle < 5.15) {
        ctx.globalAlpha = documentOpacity * documentIntro;
        ctx.fillStyle = colors.cobalt;
        ctx.fillRect(pageLeft + 2, beamY - 1, pageWidth - 4, 2);
        ctx.beginPath();
        ctx.arc(pageLeft + 5, beamY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      ctx.globalAlpha = clamp(intro * 1.5);
      ctx.strokeStyle = colors.cobalt;
      ctx.lineWidth = 2;
      const guideLength = Math.min(18, pageWidth * 0.12);
      ctx.beginPath();
      ctx.moveTo(pageLeft - 8, settledTop + guideLength);
      ctx.lineTo(pageLeft - 8, settledTop - 8);
      ctx.lineTo(pageLeft + guideLength, settledTop - 8);
      ctx.moveTo(pageLeft + pageWidth - guideLength, settledTop - 8);
      ctx.lineTo(pageLeft + pageWidth + 8, settledTop - 8);
      ctx.lineTo(pageLeft + pageWidth + 8, settledTop + guideLength);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
  };
}

export function initScanPlate(canvas: HTMLCanvasElement): PlateController {
  return initPlate(canvas, createScanRenderer());
}

export function initScanPlates(
  root: ParentNode = document,
): PlateController[] {
  return plateCanvases(
    root,
    '[data-plate="scan"], [data-plate-scan]',
  ).map(initScanPlate);
}
