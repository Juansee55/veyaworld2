export interface PixelBounds { x: number; y: number; w: number; h: number }

/** Fixed Graal placement: preserves template margins with 1:1 scale and zero per-cell auto-trimming. */
export function fixedGraalHatTransform(oy = 0) {
  return { scale: 1, x: 0, y: oy };
}

/** Fit visible hat pixels to the visible head (used for legacy/procedural/helmet compatibility). */
export function fitHat(head: PixelBounds, hat: PixelBounds, kind: "procedural" | "custom" | "helmet") {
  const scale = kind === "procedural" ? head.w / 10 : (head.w + (kind === "helmet" ? 4 : 2)) / hat.w;
  const seat = kind === "helmet" ? head.h + 1 : kind === "custom" ? Math.min(3, head.h / 4) : (hat.y + hat.h - 3) * scale;
  return {
    scale,
    x: head.x + head.w / 2 - (hat.x + hat.w / 2) * scale,
    y: head.y + seat - (hat.y + hat.h) * scale,
  };
}