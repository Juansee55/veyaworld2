import { parseGIF, decompressFrames } from "gifuct-js";
import { artPlacement, GRAAL_HAT_CELL, GRAAL_MELEE_CELL, sourceCell, type ArtKind, type ArtLayout } from "./layout";
import { FRAME_COLS, FRAME_H, FRAME_W } from "../catalog";
import { makeCanvas } from "./pixel";
import { boundedCrop, type ArtCrop } from "@/lib/game/art-crop";

export interface NormalizeOptions { crop?: ArtCrop; scale?: number; offsetX?: number; offsetY?: number; hatColumns?: 3 | 4 }

export const MAX_FRAMES = 40;
const CELL = GRAAL_MELEE_CELL;

type DecodedSource =
  | { isGif: false; width: number; height: number; source: CanvasImageSource }
  | { isGif: true; width: number; height: number; frameMs: number; frames: HTMLCanvasElement[] };

const decodedCache = new WeakMap<File, Promise<DecodedSource>>();

function isGifFile(file: File) {
  return file.type === "image/gif" || /\.gif$/i.test(file.name);
}

function isPngFile(file: File) {
  return file.type === "image/png" || /\.png$/i.test(file.name);
}

async function decodeStaticImage(file: File): Promise<{ width: number; height: number; source: CanvasImageSource }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { width: bitmap.width, height: bitmap.height, source: bitmap };
    } catch {
      // Fall back to <img> decoding if createImageBitmap rejects on this browser/image.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.width, height: image.height, source: image };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeFileSource(file: File): Promise<DecodedSource> {
  const gifMode = isGifFile(file);
  const pngMode = isPngFile(file);
  if (!gifMode && !pngMode) throw new Error("Choose a PNG or GIF");
  if (file.size > 5 * 1024 * 1024) throw new Error("Maximum file size: 5 MB");

  if (gifMode) {
    const gif = parseGIF(await file.arrayBuffer());
    if (gif.lsd.width * gif.lsd.height > 2048 * 2048 || gif.frames.length > 400) {
      throw new Error("Image or animation is too large");
    }
    const frames = decompressFrames(gif, true);
    if (frames.length === 0) throw new Error("Empty image");
    const { canvas, ctx } = makeCanvas(gif.lsd.width, gif.lsd.height);
    const { canvas: patch, ctx: pc } = makeCanvas(Math.max(1, gif.lsd.width), Math.max(1, gif.lsd.height));
    let previous: typeof frames[number] | undefined;
    let restore: ImageData | undefined;
    const step = Math.ceil(frames.length / MAX_FRAMES);
    const frameMs = Math.max(
      20,
      Math.min(2000, step * Math.round(frames.reduce((sum, f) => sum + (f.delay || 100), 0) / Math.max(1, frames.length))),
    );
    const sampled: HTMLCanvasElement[] = [];
    for (const [i, f] of frames.entries()) {
      if (previous?.disposalType === 2) ctx.clearRect(previous.dims.left, previous.dims.top, previous.dims.width, previous.dims.height);
      if (previous?.disposalType === 3 && restore) ctx.putImageData(restore, 0, 0);
      restore = f.disposalType === 3 ? ctx.getImageData(0, 0, canvas.width, canvas.height) : undefined;
      if (f.dims.width > 0 && f.dims.height > 0) {
        if (patch.width !== f.dims.width || patch.height !== f.dims.height) {
          patch.width = f.dims.width;
          patch.height = f.dims.height;
        }
        pc.putImageData(new ImageData(new Uint8ClampedArray(f.patch), f.dims.width, f.dims.height), 0, 0);
        ctx.drawImage(patch, f.dims.left, f.dims.top);
      }
      if (i % step === 0) {
        const snap = makeCanvas(canvas.width, canvas.height);
        snap.ctx.drawImage(canvas, 0, 0);
        sampled.push(snap.canvas);
      }
      previous = f;
    }
    if (sampled.length === 0) throw new Error("Empty image");
    return { isGif: true, width: gif.lsd.width, height: gif.lsd.height, frameMs, frames: sampled };
  }

  const decoded = await decodeStaticImage(file);
  if (decoded.width * decoded.height > 2048 * 2048) throw new Error("Image is too large");
  return { isGif: false, width: decoded.width, height: decoded.height, source: decoded.source };
}

function getDecodedSource(file: File): Promise<DecodedSource> {
  let promise = decodedCache.get(file);
  if (!promise) {
    promise = decodeFileSource(file).catch((err) => {
      decodedCache.delete(file);
      throw err;
    });
    decodedCache.set(file, promise);
  }
  return promise;
}

export async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const decoded = await getDecodedSource(file);
  return { width: decoded.width, height: decoded.height };
}

/** Bounding box of visible pixels. */
function trim(source: CanvasImageSource, width: number, height: number) {
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.drawImage(source, 0, 0);
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let l = canvas.width, t = canvas.height, r = -1, b = -1;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    if ((px[(y * canvas.width + x) * 4 + 3] ?? 0) > 20) { l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x); b = Math.max(b, y); }
  }
  return r < l ? null : { canvas, x: l, y: t, w: r - l + 1, h: b - t + 1 };
}

/** Melee: one weapon image pointing up, rotated into 8 orientations of 48x48 at native pixel scale. */
function normalizedMelee(source: CanvasImageSource, width: number, height: number, scale = 1, offsetX = 0, offsetY = 0) {
  const { canvas, ctx } = makeCanvas(CELL * 8, CELL);
  const box = trim(source, width, height);
  if (!box) return canvas;
  const k = Math.min(1, 38 / Math.max(box.w, box.h)) * Math.max(0.25, Math.min(2, scale));
  const w = Math.max(1, Math.round(box.w * k)), h = Math.max(1, Math.round(box.h * k));
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(i * CELL, 0, CELL, CELL);
    ctx.clip();
    ctx.translate(i * CELL + CELL / 2, CELL / 2);
    ctx.rotate((i * Math.PI) / 4);
    ctx.drawImage(box.canvas, box.x, box.y, box.w, box.h, -Math.floor(w / 2) + offsetX, -Math.floor(h / 2) + offsetY, w, h);
    ctx.restore();
  }
  return canvas;
}

function normalized(source: CanvasImageSource, width: number, height: number, kind: ArtKind, layout: ArtLayout, options: NormalizeOptions) {
  if (options.crop) {
    const c = boundedCrop(options.crop, width, height);
    if (c.x !== 0 || c.y !== 0 || c.w !== width || c.h !== height) {
      const cut = makeCanvas(c.w, c.h);
      cut.ctx.drawImage(source, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
      source = cut.canvas;
      width = c.w;
      height = c.h;
    }
  }
  const scale = Math.max(0.25, Math.min(2, options.scale ?? 1));
  const offsetX = Math.round(options.offsetX ?? 0);
  const offsetY = Math.round(options.offsetY ?? 0);

  if (kind === "melee") return normalizedMelee(source, width, height, scale, offsetX, offsetY);

  if (kind === "hat") {
    const { canvas, ctx } = makeCanvas(GRAAL_HAT_CELL * FRAME_COLS, GRAAL_HAT_CELL * 4);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const breatheDy = col === 1 ? 1 : 0;
      const s = sourceCell(layout, row, col, width, height, options.hatColumns);
      const baseScale = s.w <= GRAAL_HAT_CELL && s.h <= GRAAL_HAT_CELL ? 1 : GRAAL_HAT_CELL / Math.max(s.w, s.h);
      const dw = Math.max(1, Math.round(s.w * baseScale * scale));
      const dh = Math.max(1, Math.round(s.h * baseScale * scale));
      const dx = col * GRAAL_HAT_CELL + Math.round((GRAAL_HAT_CELL - dw) / 2) + offsetX;
      // Align a 32x32 Graal hat cell directly over the 32x32 head box (y=16..48 inside the 64x64 frame).
      const dy = row * GRAAL_HAT_CELL + 16 - Math.round((dh - 32) / 2) + breatheDy + offsetY;
      ctx.save();
      ctx.beginPath();
      ctx.rect(col * GRAAL_HAT_CELL, row * GRAAL_HAT_CELL, GRAAL_HAT_CELL, GRAAL_HAT_CELL);
      ctx.clip();
      ctx.drawImage(source, s.x, s.y, s.w, s.h, dx, dy, dw, dh);
      ctx.restore();
    }
    return canvas;
  }

  const { canvas, ctx } = makeCanvas(FRAME_W * FRAME_COLS, FRAME_H * 4);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
    const s = sourceCell(layout, row, col, width, height, options.hatColumns);
    if (layout === "graal-body" || layout === "graal-head") {
      const breatheDy = layout === "graal-head" && col === 1 ? 1 : 0;
      const dw = Math.max(1, Math.round(32 * scale));
      const dh = Math.max(1, Math.round(32 * scale));
      const dx = col * FRAME_W + Math.round((FRAME_W - dw) / 2) + offsetX;
      const dy = row * FRAME_H + (layout === "graal-body" ? FRAME_H - dh : breatheDy) + offsetY;
      ctx.save();
      ctx.beginPath();
      ctx.rect(col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
      ctx.clip();
      ctx.drawImage(source, s.x, s.y, s.w, s.h, dx, dy, dw, dh);
      ctx.restore();
      continue;
    }
    if (layout === "grid") {
      const fit = Math.min(1, FRAME_W / Math.max(1, s.w), FRAME_H / Math.max(1, s.h)) * scale;
      const dw = Math.max(1, Math.round(s.w * fit)), dh = Math.max(1, Math.round(s.h * fit));
      ctx.save();
      ctx.beginPath();
      ctx.rect(col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
      ctx.clip();
      ctx.drawImage(source, s.x, s.y, s.w, s.h, col * FRAME_W + Math.round((FRAME_W - dw) / 2) + offsetX, row * FRAME_H + FRAME_H - dh + offsetY, dw, dh);
      ctx.restore();
      continue;
    }
    const box = trim(source, width, height);
    if (!box) continue;
    const p = artPlacement(kind, box.w, box.h);
    const dw = Math.min(FRAME_W, Math.round(p.w * scale)), dh = Math.min(FRAME_H, Math.round(p.h * scale));
    ctx.save();
    ctx.beginPath();
    ctx.rect(col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
    ctx.clip();
    ctx.drawImage(box.canvas, box.x, box.y, box.w, box.h, col * FRAME_W + Math.round((FRAME_W - dw) / 2) + offsetX, row * FRAME_H + p.y + p.h - dh + (kind === "head" && col === 1 ? 1 : 0) + offsetY, dw, dh);
    ctx.restore();
  }
  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image could not be prepared"))), "image/png");
  });
}

export async function normalizeUploadPreview(file: File, kind: ArtKind, layout: ArtLayout, options: NormalizeOptions = {}) {
  const decoded = await getDecodedSource(file);
  const sources = decoded.isGif
    ? decoded.frames.map((frame) => normalized(frame, decoded.width, decoded.height, kind, layout, options))
    : [normalized(decoded.source, decoded.width, decoded.height, kind, layout, options)];
  const frameMs = decoded.isGif ? decoded.frameMs : 100;
  const first = sources[0];
  if (!first) throw new Error("Empty image");
  const fw = first.width, fh = first.height;
  const { canvas, ctx } = makeCanvas(fw, sources.length * fh);
  sources.forEach((source, i) => ctx.drawImage(source, 0, i * fh));
  return { canvas, frames: sources.length, frameMs, toBlob: () => canvasToPngBlob(canvas) };
}

export async function normalizeUpload(file: File, kind: ArtKind, layout: ArtLayout, options: NormalizeOptions = {}) {
  const prepared = await normalizeUploadPreview(file, kind, layout, options);
  const blob = await prepared.toBlob();
  return { canvas: prepared.canvas, blob, frames: prepared.frames, frameMs: prepared.frameMs };
}