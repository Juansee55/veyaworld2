export function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export type Px = (x: number, y: number, w: number, h: number, color: string) => void;

/** Pixel painter for one frame; `mirror` flips horizontally inside the frame width. */
export function painter(ctx: CanvasRenderingContext2D, ox: number, oy: number, frameW: number, mirror = false, unit = 1): Px {
  return (x, y, w, h, color) => {
    ctx.fillStyle = color;
    const xx = mirror ? frameW - (x + w) * unit : x * unit;
    ctx.fillRect(ox + xx, oy + Math.round(y * unit), w * unit, Math.round(h * unit));
  };
}

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Deterministic PRNG so art and maps are identical on every client. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const OUTLINE = "#1b1424";
