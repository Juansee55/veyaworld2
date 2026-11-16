import { worldArtUrl } from "@/lib/game/world-art";
import type { MapExtras } from "./worldData";

const images = new Map<string, Promise<HTMLImageElement | null>>();
export function worldImage(asset: MapExtras["assets"][number]) {
  let promise = images.get(asset.path);
  if (!promise) {
    promise = (async () => {
      const image = new Image(); image.crossOrigin = "anonymous";
      image.src = await worldArtUrl(asset.path); await image.decode(); return image;
    })().catch(() => { images.delete(asset.path); return null; });
    images.set(asset.path, promise);
  }
  return promise;
}
export function referencedAssets(ex: MapExtras) {
  const used = new Set(ex.tiles.map((t) => t.asset_id));
  const furniture = new Map(ex.furniture.map((f) => [f.id, f]));
  for (const p of ex.props) used.add(furniture.get(p.furniture_id)?.asset_id ?? null);
  return ex.assets.filter((a) => used.has(a.id));
}