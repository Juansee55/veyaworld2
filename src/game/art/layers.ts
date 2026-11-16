import type * as Phaser from "phaser";
import hatHelm from "@/assets/art/hat_shadow_helm.png.asset.json";
import knife from "@/assets/art/melee_violet_knife.png.asset.json";
import kunai from "@/assets/art/melee_jade_kunai.png.asset.json";
import staff from "@/assets/art/melee_moon_staff.png.asset.json";
import voidBlade from "@/assets/art/melee_void_blade.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_LOOK, DIRECTIONS, FRAME_COLS, FRAME_H, FRAME_W, isCustomPart, swordPose, type Direction, type Look, type PreviewAnim } from "../catalog";
import { buildCharacterSheets } from "./characterArt";
import { loadUploadedArt } from "./uploadedArt";
import { fitHat, fixedGraalHatTransform, type PixelBounds } from "./hatFit";
import { autumnHatSheets } from "./autumnArt";
import { GRAAL_HAT_CELL, GRAAL_MELEE_CELL } from "./layout";

export type Layer = "body" | "head" | "hat" | "melee";
/**
 * One character layer texture. Character layers stack animation blocks vertically, each block being
 * 4 columns x 4 direction rows of fw x fh. Melee sheets have 8 orientation columns per animation row.
 */
export interface LayerSheet { image: HTMLCanvasElement | HTMLImageElement; fw: number; fh: number; frames: number; ms: number; oy: number; melee: boolean; fixed?: boolean | undefined }

export interface PreviewOptions {
  anim?: PreviewAnim | undefined;
  swordStep?: 0 | 1 | 2 | undefined;
  visible?: Partial<Record<Layer, boolean>> | undefined;
  logicalSize?: number | undefined;
}

const registry = new Map<string, LayerSheet>();
const pending = new Map<string, Promise<LayerSheet | null>>();
export const MELEE_CELL = GRAAL_MELEE_CELL;

const EXTRA = [
  { key: "hat:hat_shadow_helm", url: hatHelm.url, fw: 24, fh: 24, ms: 150, oy: 0, melee: false, fixed: false },
  { key: "melee:melee_violet_knife", url: knife.url, fw: 42, fh: 42, ms: 200, oy: 0, melee: true },
  { key: "melee:melee_jade_kunai", url: kunai.url, fw: 29, fh: 29, ms: 200, oy: 0, melee: true },
  { key: "melee:melee_moon_staff", url: staff.url, fw: 32, fh: 32, ms: 200, oy: 0, melee: true },
  { key: "melee:melee_void_blade", url: voidBlade.url, fw: 38, fh: 38, ms: 300, oy: 0, melee: true },
];

async function image(src: string) {
  const img = new Image();
  img.src = src;
  await Promise.race([
    img.decode(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Image decode timeout")), 4000)),
  ]);
  return img;
}
const framesOf = (h: number, fh: number, melee: boolean) => Math.max(1, Math.floor(h / (melee ? fh : fh * 4)));

function sheetMetaFor(layer: Layer, width: number, height: number): { fw: number; fh: number; melee: boolean; fixed: boolean } {
  if (layer === "melee") {
    const cell = Math.max(16, Math.round(width / 8)) || MELEE_CELL;
    return { fw: cell, fh: cell, melee: true, fixed: false };
  }
  const fw = Math.max(16, Math.round(width / FRAME_COLS)) || FRAME_W;
  if (layer === "hat" && fw >= GRAAL_HAT_CELL && height >= GRAAL_HAT_CELL * 4) {
    return { fw, fh: fw, melee: false, fixed: true };
  }
  return { fw, fh: Math.round(fw * 1.5), melee: false, fixed: false };
}

let loading: Promise<void> | undefined;
export function loadLayerArt() {
  loading ??= (async () => {
    await loadUploadedArt();
    for (const [key, canvas] of buildCharacterSheets()) {
      registry.set(key, { image: canvas, fw: FRAME_W, fh: FRAME_H, frames: 1, ms: 1000, oy: 0, melee: false, fixed: key.startsWith("hat:") });
    }
    for (const { id, canvas } of autumnHatSheets()) {
      registry.set(`hat:${id}`, { image: canvas, fw: FRAME_W, fh: FRAME_H, frames: 1, ms: 1000, oy: 0, melee: false, fixed: true });
    }
    await Promise.allSettled(EXTRA.map(async (e) => {
      const img = await image(e.url);
      let source: HTMLCanvasElement | HTMLImageElement = img;
      if (!e.melee) {
        // The original helmet rows are down, left, up, right; the game uses down, up, left, right.
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          for (let a = 0; a < framesOf(img.height, e.fh, false); a++) {
            [0, 2, 1, 3].forEach((row, target) => ctx.drawImage(img, 0, (a * 4 + row) * e.fh, img.width, e.fh, 0, (a * 4 + target) * e.fh, img.width, e.fh));
          }
          source = canvas;
        }
      }
      registry.set(e.key, { image: source, fw: e.fw, fh: e.fh, frames: framesOf(img.height, e.fh, e.melee), ms: e.ms, oy: e.oy, melee: e.melee, fixed: e.fixed });
    }));
  })();
  return loading;
}

export const layerKeys = () => [...registry.keys()];
export const sheetFor = (key: string) => registry.get(key);
/** Temporary editor sheets use the same attachment and animation as gameplay. */
export function registerPreviewSheet(layer: Layer, id: string, canvas: HTMLCanvasElement, frames: number, ms: number) {
  const meta = sheetMetaFor(layer, canvas.width, canvas.height);
  registry.set(`${layer}:${id}`, { image: canvas, fw: meta.fw, fh: meta.fh, frames, ms, oy: 0, melee: meta.melee, fixed: meta.fixed });
  return () => { registry.delete(`${layer}:${id}`); };
}

/** Immediately cache a freshly saved `custom:<id>` sheet so Wardrobe and game render without re-downloading. */
export function registerCustomSheet(layer: Layer, id: string, canvas: HTMLCanvasElement | HTMLImageElement, frames: number, ms: number) {
  const key = `${layer}:custom:${id}`;
  pending.delete(key);
  const w = canvas instanceof HTMLImageElement ? (canvas.naturalWidth || canvas.width) : canvas.width;
  const h = canvas instanceof HTMLImageElement ? (canvas.naturalHeight || canvas.height) : canvas.height;
  const meta = sheetMetaFor(layer, w, h);
  registry.set(key, { image: canvas, fw: meta.fw, fh: meta.fh, frames, ms, oy: 0, melee: meta.melee, fixed: meta.fixed });
}

/** Fetch a player-uploaded part (private storage, readable by signed-in players). */
export function loadCustom(layer: Layer, id: string): Promise<LayerSheet | null> {
  const key = `${layer}:${id}`;
  const known = registry.get(key);
  if (known) return Promise.resolve(known);
  let p = pending.get(key);
  if (!p) {
    p = (async () => {
      const { data } = await supabase.from("player_art").select("kind, sheet_path, frames, frame_ms").eq("id", id.slice(7)).maybeSingle();
      if (!data || data.kind !== layer) return null;
      const { data: blob } = await supabase.storage.from("player-art").download(data.sheet_path);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      try {
        const img = await image(url);
        const meta = sheetMetaFor(layer, img.naturalWidth || img.width, img.naturalHeight || img.height);
        const sheet: LayerSheet = { image: img, fw: meta.fw, fh: meta.fh, frames: data.frames, ms: data.frame_ms, oy: 0, melee: meta.melee, fixed: meta.fixed };
        sheet.frames = Math.min(sheet.frames, framesOf(img.naturalHeight || img.height, sheet.fh, meta.melee));
        registry.set(key, sheet);
        return sheet;
      } finally { URL.revokeObjectURL(url); }
    })().catch(() => null).then((sheet) => {
      if (!sheet) pending.delete(key);
      return sheet;
    });
    pending.set(key, p);
  }
  return p;
}

/** Registry key to draw for a part; falls back to the default part while a custom upload loads. */
export function resolveKey(layer: Layer, id: string, onReady?: () => void) {
  const key = `${layer}:${id}`;
  if (registry.has(key)) return key;
  if (isCustomPart(id)) void loadCustom(layer, id).then((s) => { if (s) onReady?.(); });
  return `${layer}:${DEFAULT_LOOK[`${layer}_id`]}`;
}

export function ensureLayerTexture(scene: Phaser.Scene, key: string) {
  if (scene.textures.exists(key)) return true;
  const s = registry.get(key);
  if (!s) return false;
  scene.textures.addSpriteSheet(key, s.image as HTMLImageElement, { frameWidth: s.fw, frameHeight: s.fh });
  return true;
}

export const animFrame = (s: LayerSheet | undefined, clock: number) => (s && s.frames > 1 ? Math.floor(clock / s.ms) % s.frames : 0);
/** Melee sheets: column 0 points up, then clockwise in 45° steps. */
export const MELEE_FACING: Record<Direction, number> = { up: 0, right: 2, down: 4, left: 6 };

const boundsCache = new WeakMap<LayerSheet, Map<number, PixelBounds | null>>();
function visibleBounds(sheet: LayerSheet, frame: number) {
  let cache = boundsCache.get(sheet);
  if (!cache) { cache = new Map(); boundsCache.set(sheet, cache); }
  if (cache.has(frame)) return cache.get(frame);
  const canvas = document.createElement("canvas");
  canvas.width = sheet.fw; canvas.height = sheet.fh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(sheet.image, (frame % 4) * sheet.fw, Math.floor(frame / 4) * sheet.fh, sheet.fw, sheet.fh, 0, 0, sheet.fw, sheet.fh);
  const pixels = ctx.getImageData(0, 0, sheet.fw, sheet.fh).data;
  let left = sheet.fw, top = sheet.fh, right = -1, bottom = -1;
  for (let y = 0; y < sheet.fh; y++) for (let x = 0; x < sheet.fw; x++) {
    if ((pixels[(y * sheet.fw + x) * 4 + 3] ?? 0) <= 20) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  const bounds = right < left ? null : { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
  cache.set(frame, bounds);
  return bounds;
}

/** Shared by Phaser and every canvas preview, using fixed Graal placement for native hats. */
export function hatTransform(head: LayerSheet | undefined, hat: LayerSheet | undefined, id: string, frame: number, clock: number) {
  if (!hat) return { x: 0, y: 0, scale: 1 };
  if (hat.fixed) return fixedGraalHatTransform(hat.oy);
  if (!head) return fixedGraalHatTransform(hat.oy);
  const headUnit = head.fw === 16 && head.fh === 24 ? 2 : 1;
  const rawHead = visibleBounds(head, animFrame(head, clock) * 16 + frame);
  const b = visibleBounds(hat, animFrame(hat, clock) * 16 + frame);
  if (!rawHead || !b) return fixedGraalHatTransform(hat.oy);
  const h = { x: rawHead.x * headUnit, y: rawHead.y * headUnit, w: rawHead.w * headUnit, h: rawHead.h * headUnit };
  const headW = head.fw * headUnit;
  const headH = head.fh * headUnit;
  const fit = fitHat(h, b, id === "hat_shadow_helm" ? "helmet" : isCustomPart(id) || id.startsWith("hat_autumn_") ? "custom" : "procedural");
  return { scale: fit.scale, x: -headW / 2 + fit.x + hat.fw * fit.scale / 2, y: head.oy - headH + fit.y + hat.fh * fit.scale };
}

/** Wardrobe & Gani Viewer preview: composited BODY -> HEAD -> HAT + SWORD on a logical 72x72 canvas. */
export function drawPreview(ctx: CanvasRenderingContext2D, look: Look, dir: Direction, col: number, scale: number, clock: number, options: PreviewOptions = {}) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const logical = options.logicalSize ?? 72;
  const cx = logical / 2;
  const feetY = logical - 10;
  const row = DIRECTIONS.indexOf(dir);
  const anim = options.anim ?? "idle";
  const visible = options.visible ?? {};
  const sit = anim === "sit";
  const swim = anim === "swim";
  const sword = anim === "sword";
  const lowered = swim ? 12 + Math.round(Math.sin(clock / 190) * 1.5) : sit ? 8 : 0;

  const m = visible.melee !== false && look.melee_id !== "melee_none" ? registry.get(resolveKey("melee", look.melee_id)) : undefined;
  const step = (options.swordStep ?? (Math.floor(clock / 95) % 3)) as 0 | 1 | 2;
  const pose = sword && m ? swordPose(dir, step) : null;
  const drawSword = (sw: LayerSheet, orient: number, px: number, py: number) => {
    const swScale = sw.fw <= MELEE_CELL ? 1 : MELEE_CELL / sw.fw;
    const dw = sw.fw * swScale * scale;
    const dh = sw.fh * swScale * scale;
    ctx.drawImage(sw.image, orient * sw.fw, animFrame(sw, clock) * sw.fh, sw.fw, sw.fh, px * scale - dw / 2, py * scale - dh / 2, dw, dh);
  };

  if (m && pose?.behind) {
    drawSword(m, pose.orient, cx + pose.x, feetY + lowered + pose.y);
  }

  for (const layer of ["body", "head", "hat"] as const) {
    if (visible[layer] === false) continue;
    const id = look[`${layer}_id`];
    if (layer === "hat" && id === "hat_none") continue;
    const s = registry.get(resolveKey(layer, id));
    if (!s) continue;
    const baseScale = s.fw === 16 && s.fh === 24 ? 2 : 1;
    const a = animFrame(s, clock);
    const fit = layer === "hat" ? hatTransform(registry.get(resolveKey("head", look.head_id)), s, id, row * 4 + col, clock) : { x: 0, y: s.oy, scale: 1 };
    const drawScale = fit.scale * baseScale;
    const srcH = layer === "body" && (sit || swim) ? Math.max(1, s.fh - Math.round((swim ? 20 : 10) / baseScale)) : s.fh;
    const dx = (cx + fit.x - (s.fw * drawScale) / 2) * scale;
    const dy = (feetY + fit.y + lowered - s.fh * drawScale) * scale;
    ctx.drawImage(s.image, col * s.fw, (a * 4 + row) * s.fh, s.fw, srcH, dx, dy, s.fw * drawScale * scale, srcH * drawScale * scale);
  }

  if (swim) {
    ctx.save();
    ctx.fillStyle = "rgba(168, 226, 232, 0.7)";
    ctx.beginPath();
    ctx.ellipse(cx * scale, (feetY - 3) * scale, (14 + Math.sin(clock / 160) * 2) * scale, 3.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (m) {
    if (pose) {
      if (!pose.behind) drawSword(m, pose.orient, cx + pose.x, feetY + lowered + pose.y);
    } else {
      drawSword(m, 1, cx + 19, feetY + lowered - 18);
    }
  }
}
