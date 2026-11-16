import {
  BODIES, COL, DIRECTIONS, FRAME_COLS, FRAME_H, FRAME_W, HATS, HEADS,
  type BodyPart, type Direction, type HatPart, type HeadPart,
} from "../catalog";
import { makeCanvas, OUTLINE, painter, shade, type Px } from "./pixel";
import { uploadedSheets } from "./uploadedArt";

type View = "down" | "up" | "side";

// Shared per-frame offsets keep every layer aligned (idle "breathe" drops head + hat by 1px in 32x48 space).
const headDy = (col: number) => (col === COL.BREATHE ? 0.5 : 0);

function drawBody(px: Px, view: View, col: number, p: BodyPart) {
  const dark = shade(p.shirt, -0.25);
  const light = shade(p.shirt, 0.25);
  if (view !== "side") {
    const lL = col === COL.WALK_A ? 1 : 0;
    const lR = col === COL.WALK_B ? 1 : 0;
    const leg = (x: number, l: number) => {
      px(x, 19, 4, 5 - l, OUTLINE);
      px(x + 1, 19, 2, 3 - l, p.pants);
      px(x + 1, 22 - l, 2, 1, p.shoes);
    };
    if (p.kind === "robe") {
      px(3, 12, 10, 11, OUTLINE);
      px(4, 13, 8, 9, p.shirt);
      px(4, 21, 8, 1, dark);
      px(5, 22 - lL, 2, 1, p.shoes);
      px(9, 22 - lR, 2, 1, p.shoes);
    } else {
      leg(4, lL);
      leg(8, lR);
      px(3, 12, 10, 8, OUTLINE);
      px(4, 13, 8, 6, p.shirt);
    }
    // arms (swing opposite to legs)
    const aL = col === COL.WALK_B ? 1 : 0;
    const aR = col === COL.WALK_A ? 1 : 0;
    px(4, 13 + aL, 1, 5, dark);
    px(11, 13 + aR, 1, 5, dark);
    px(4, 18 + aL, 1, 1, p.trim);
    px(11, 18 + aR, 1, 1, p.trim);
    px(5, 17, 6, 1, p.trim);
    if (view === "down") {
      px(7, 13, 2, 2, p.trim);
      if (p.kind === "armor") px(6, 14, 4, 2, light);
    } else {
      px(5, 13, 6, 1, dark);
    }
    return;
  }
  // side view, facing left (right is mirrored)
  const legs: [number, number] = col === COL.WALK_A ? [3, 8] : col === COL.WALK_B ? [4, 7] : [5, 6];
  if (p.kind === "robe") {
    px(4, 12, 8, 11, OUTLINE);
    px(5, 13, 6, 9, p.shirt);
    px(legs[0] + 1, 22, 3, 1, p.shoes);
  } else {
    for (const x of [legs[1], legs[0]]) {
      px(x, 19, 4, 5, OUTLINE);
      px(x + 1, 19, 2, 3, p.pants);
      px(x, 22, 3, 1, p.shoes);
    }
    px(4, 12, 8, 8, OUTLINE);
    px(5, 13, 6, 6, p.shirt);
  }
  px(5, 17, 6, 1, p.trim);
  const ax = col === COL.WALK_A ? 6 : col === COL.WALK_B ? 8 : 7;
  px(ax, 13, 2, 5, dark);
  px(ax, 18, 2, 1, p.trim);
  if (p.kind === "armor") px(5, 14, 2, 2, light);
}

function drawHead(px: Px, view: View, col: number, h: HeadPart) {
  const dy = headDy(col);
  const hl = shade(h.hair, 0.25);
  px(3, 3 + dy, 10, 10, OUTLINE);
  if (view === "up") {
    px(4, 4 + dy, 8, 8, h.hair);
    px(5, 5 + dy, 3, 1, hl);
    if (h.style === "long") px(4, 11 + dy, 8, 2, h.hair);
    if (h.style === "spiky") { px(4, 2 + dy, 1, 1, OUTLINE); px(7, 2 + dy, 2, 1, OUTLINE); px(11, 2 + dy, 1, 1, OUTLINE); }
    return;
  }
  px(4, 4 + dy, 8, 8, h.skin);
  if (view === "down") {
    px(4, 4 + dy, 8, 3, h.hair);
    px(5, 4 + dy, 3, 1, hl);
    px(4, 7 + dy, 1, 2, h.hair);
    px(11, 7 + dy, 1, 2, h.hair);
    if (h.style === "long") { px(4, 7 + dy, 1, 5, h.hair); px(11, 7 + dy, 1, 5, h.hair); }
    if (h.style === "spiky") { px(4, 2 + dy, 1, 1, OUTLINE); px(7, 2 + dy, 2, 1, OUTLINE); px(11, 2 + dy, 1, 1, OUTLINE); px(6, 7 + dy, 1, 1, h.hair); }
    px(6, 8 + dy, 1, 2, OUTLINE);
    px(9, 8 + dy, 1, 2, OUTLINE);
    px(5, 10 + dy, 1, 1, shade(h.skin, -0.12));
    px(10, 10 + dy, 1, 1, shade(h.skin, -0.12));
    return;
  }
  // side (left)
  px(4, 4 + dy, 8, 3, h.hair);
  px(8, 7 + dy, 4, h.style === "long" ? 5 : 3, h.hair);
  px(5, 4 + dy, 3, 1, hl);
  if (h.style === "spiky") { px(6, 2 + dy, 2, 1, OUTLINE); px(10, 2 + dy, 2, 1, OUTLINE); }
  px(8, 8 + dy, 1, 2, shade(h.skin, -0.15));
  px(5, 8 + dy, 1, 2, OUTLINE);
  px(3, 9 + dy, 1, 1, h.skin);
}

function drawHat(px: Px, view: View, col: number, hat: HatPart) {
  const dy = headDy(col);
  const c = hat.color;
  const d = shade(c, -0.3);
  const l = shade(c, 0.3);
  switch (hat.kind) {
    case "none":
      return;
    case "cap":
      px(3, 1 + dy, 10, 5, OUTLINE);
      px(4, 2 + dy, 8, 3, c);
      px(5, 2 + dy, 3, 1, l);
      if (view === "down") px(3, 5 + dy, 10, 1, d);
      if (view === "side") { px(0, 4 + dy, 5, 2, OUTLINE); px(1, 4 + dy, 4, 1, d); }
      return;
    case "wizard": {
      const tipX = view === "side" ? 9 : 7;
      px(tipX, -0 + dy, 2, 1, c);
      px(tipX - 1, 1 + dy, 4, 1, c);
      px(5, 2 + dy, 6, 1, c);
      px(4, 3 + dy, 8, 1, c);
      px(2, 4 + dy, 12, 2, OUTLINE);
      px(3, 4 + dy, 10, 1, d);
      if (view === "down") px(7, 2 + dy, 1, 1, "#f2c14e");
      return;
    }
    case "crown":
      px(4, 1 + dy, 8, 4, OUTLINE);
      px(5, 2 + dy, 6, 2, c);
      px(4, 0 + dy, 1, 2, c); px(7, 0 + dy, 2, 2, c); px(11, 0 + dy, 1, 2, c);
      if (view !== "up") px(7, 3 + dy, 2, 1, "#d03a5a");
      return;
    case "bandana":
      px(3, 3 + dy, 10, 3, OUTLINE);
      px(4, 4 + dy, 8, 1, c);
      px(5, 4 + dy, 1, 1, l); px(9, 4 + dy, 1, 1, l);
      if (view === "side") { px(12, 5 + dy, 2, 3, c); }
      if (view === "up") { px(7, 5 + dy, 2, 3, c); }
      return;
    case "straw":
      px(4, 1 + dy, 8, 4, OUTLINE);
      px(5, 2 + dy, 6, 2, c);
      px(5, 3 + dy, 6, 1, "#c0392b");
      px(1, 4 + dy, 14, 2, OUTLINE);
      px(2, 4 + dy, 12, 1, shade(c, -0.1));
      return;
  }
}

function viewOf(dir: Direction): View {
  return dir === "left" || dir === "right" ? "side" : dir;
}

/** Build one layer sheet (FRAME_COLS x 4 rows) with a shared 32x48 frame grid. */
function buildSheet(draw: (px: Px, view: View, col: number) => void): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(FRAME_W * FRAME_COLS, FRAME_H * DIRECTIONS.length);
  DIRECTIONS.forEach((dir, row) => {
    for (let col = 0; col < FRAME_COLS; col++) {
      draw(painter(ctx, col * FRAME_W, row * FRAME_H, FRAME_W, dir === "right", 2), viewOf(dir), col);
    }
  });
  return canvas;
}

export const layerKey = (layer: "body" | "head" | "hat", id: string) => `${layer}:${id}`;

export function buildCharacterSheets(): Map<string, HTMLCanvasElement> {
  const out = new Map<string, HTMLCanvasElement>();
  for (const b of BODIES) out.set(layerKey("body", b.id), buildSheet((px, v, c) => drawBody(px, v, c, b)));
  for (const h of HEADS) out.set(layerKey("head", h.id), buildSheet((px, v, c) => drawHead(px, v, c, h)));
  for (const h of HATS) out.set(layerKey("hat", h.id), buildSheet((px, v, c) => drawHat(px, v, c, h)));
  for (const [key, canvas] of uploadedSheets()) out.set(key, canvas);
  return out;
}

/** Draw a composited frame (BODY -> HEAD -> HAT) onto a 2D canvas, used by the wardrobe preview. */
export function drawCompositePreview(
  ctx: CanvasRenderingContext2D, ids: { body_id: string; head_id: string; hat_id: string },
  dir: Direction, col: number, scale: number,
) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const body = BODIES.find((b) => b.id === ids.body_id) ?? BODIES[0];
  const head = HEADS.find((h) => h.id === ids.head_id) ?? HEADS[0];
  const hat = HATS.find((h) => h.id === ids.hat_id) ?? HATS[0];
  if (!body || !head || !hat) return;
  const view = viewOf(dir);
  const mirror = dir === "right";
  const unit = scale * 2;
  const px: Px = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    const xx = mirror ? 16 - x - w : x;
    ctx.fillRect(xx * unit, Math.round(y * unit), w * unit, Math.round(h * unit));
  };
  const drawUpload = (layer: "body" | "head", id: string) => {
    const sheet = uploadedSheets().get(layerKey(layer, id));
    if (!sheet) return false;
    ctx.drawImage(sheet, col * FRAME_W, DIRECTIONS.indexOf(dir) * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W * scale, FRAME_H * scale);
    return true;
  };
  if (!drawUpload("body", body.id)) drawBody(px, view, col, body);
  if (!drawUpload("head", head.id)) drawHead(px, view, col, head);
  drawHat(px, view, col, hat);
}
