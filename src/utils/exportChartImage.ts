const PNG_SCALE = 2;

const STYLE_PROPS = [
  "fill",
  "stroke",
  "opacity",
  "stroke-width",
  "stroke-dasharray",
  "stop-color",
  "font-family",
  "font-size",
  "font-weight",
] as const;

export function chartImageFilename(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base ? `${base}.png` : "chart.png";
}

function ensurePngFilename(filename: string): string {
  return filename.toLowerCase().endsWith(".png") ? filename : `${filename}.png`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = ensurePngFilename(filename);
  anchor.click();
  URL.revokeObjectURL(url);
}

function applyComputedSvgStyles(source: Element, clone: Element): void {
  if (source instanceof SVGElement && clone instanceof SVGElement) {
    const cs = getComputedStyle(source);
    for (const prop of STYLE_PROPS) {
      const value = cs.getPropertyValue(prop);
      if (value && value !== "none" && value !== "transparent") {
        clone.style.setProperty(prop, value);
      }
    }
  }

  const sourceKids = source.children;
  const cloneKids = clone.children;
  for (let i = 0; i < sourceKids.length; i++) {
    const c = cloneKids[i];
    if (c) applyComputedSvgStyles(sourceKids[i]!, c);
  }
}

function cloneSvgWithComputedStyles(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  applyComputedSvgStyles(svg, clone);
  const cs = getComputedStyle(svg);
  clone.style.setProperty("fill", cs.fill);
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  return clone;
}

/** Export the first Recharts `<svg>` inside `container` as a PNG download. */
export async function downloadChartAsPng(
  container: HTMLElement,
  filename: string,
): Promise<void> {
  const svg = container.querySelector("svg");
  if (!svg) {
    throw new Error("Chart SVG not found");
  }

  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));

  const styled = cloneSvgWithComputedStyles(svg);
  styled.setAttribute("width", String(width));
  styled.setAttribute("height", String(height));
  if (!styled.getAttribute("viewBox") && svg.viewBox?.baseVal) {
    const vb = svg.viewBox.baseVal;
    styled.setAttribute(
      "viewBox",
      `${vb.x} ${vb.y} ${vb.width} ${vb.height}`,
    );
  }

  const xml = new XMLSerializer().serializeToString(styled);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width * PNG_SCALE;
        canvas.height = height * PNG_SCALE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }

        const bg =
          getComputedStyle(document.documentElement)
            .getPropertyValue("--background")
            .trim() || "#0f1117";

        ctx.scale(PNG_SCALE, PNG_SCALE);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((png) => {
          URL.revokeObjectURL(url);
          if (!png) {
            reject(new Error("PNG encode failed"));
            return;
          }
          triggerDownload(png, filename);
          resolve();
        }, "image/png");
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG render failed"));
    };
    img.src = url;
  });
}
