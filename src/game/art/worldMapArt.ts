import { getMap } from "../maps";
import { LAYERS } from "../maps/types";
import { TILE, TILESET_COLS } from "../maps/tiles";
import { worldLayout } from "../maps/worldLayout";
import { buildTilesetCanvas, loadTilesetAtlas } from "./tilesetArt";

let cache: Promise<HTMLCanvasElement> | undefined;

/** Draws every outdoor map with the real tiles into one canvas (16 px per tile). */
export function renderWorldMap(): Promise<HTMLCanvasElement> {
  cache ??= (async () => {
    await loadTilesetAtlas();
    const ts = buildTilesetCanvas();
    const L = worldLayout();
    const canvas = document.createElement("canvas");
    canvas.width = L.width * TILE; canvas.height = L.height * TILE;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    for (const p of L.maps) {
      const m = getMap(p.id);
      for (const layer of LAYERS) {
        const tiles = m.layers[layer];
        for (let i = 0; i < tiles.length; i++) {
          const t = tiles[i]!;
          if (!t) continue;
          ctx.drawImage(ts, (t % TILESET_COLS) * TILE, Math.floor(t / TILESET_COLS) * TILE, TILE, TILE,
            (p.x + (i % m.width)) * TILE, (p.y + Math.floor(i / m.width)) * TILE, TILE, TILE);
        }
      }
    }
    return canvas;
  })();
  return cache;
}
