import crystal from "@/assets/weapons/crystal.png.asset.json";
import pulse from "@/assets/weapons/pulse.png.asset.json";
import carbine from "@/assets/weapons/carbine.png.asset.json";
import { loadCustom } from "./layers";
import acorn from "@/assets/weapons/acorn.svg";
import maple from "@/assets/weapons/maple.svg";

const sources = { gun_crystal: crystal.url, gun_pulse: pulse.url, gun_carbine: carbine.url, gun_acorn: acorn, gun_maple: maple };
const images = new Map<string, HTMLCanvasElement>();
const pending = new Map<string, Promise<HTMLCanvasElement | null>>();
export function firearmArt(id: string) {
  let p = pending.get(id);
  if (!p) {
    p = (async () => {
      const canvas = document.createElement("canvas"); canvas.width = 24; canvas.height = 16;
      const ctx = canvas.getContext("2d"); if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      if (id.startsWith("custom:")) {
        const s = await loadCustom("melee", id); if (!s) return null;
        // Normalized custom firearms point up; the right-facing cell is column two.
        ctx.drawImage(s.image, s.fw * 2, 0, s.fw, s.fh, 0, -4, 24, 24);
      } else {
        const url = sources[id as keyof typeof sources]; if (!url) return null;
        const img = new Image(); img.src = url; await img.decode();
        const k = Math.min(24 / img.width, 14 / img.height);
        ctx.save(); if (!id.startsWith("gun_acorn") && id !== "gun_maple") { ctx.translate(24, 0); ctx.scale(-1, 1); }
        ctx.drawImage(img, 0, (16 - img.height * k) / 2, img.width * k, img.height * k); ctx.restore();
      }
      images.set(id, canvas); return canvas;
    })().catch(() => null);
    pending.set(id, p);
  }
  return p;
}