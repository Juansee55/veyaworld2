// SSR-safe: places the outdoor maps side by side (following their edge warps) so the
// whole world can be drawn as one overview map. Base interiors are shown at their
// facade on the Frontier.
import { BASE_BY_ID, FRONTIER, baseOfMap } from "../bases/defs";
import { DEFAULT_MAP, getMap } from "./index";
import { TILE } from "./tiles";

export const OVERWORLD = [DEFAULT_MAP] as const;
export interface PlacedMap { id: string; name: string; x: number; y: number; w: number; h: number }
export interface WorldLayout { maps: PlacedMap[]; width: number; height: number }

let cached: WorldLayout | undefined;

/** Tile-space position of every overworld map. Edge warps line up exactly. */
export function worldLayout(): WorldLayout {
  if (cached) return cached;
  const ids = OVERWORLD as readonly string[];
  const pos = new Map<string, { x: number; y: number }>([[DEFAULT_MAP, { x: 0, y: 0 }]]);
  const queue = [DEFAULT_MAP as string];
  while (queue.length) {
    const id = queue.shift()!;
    const a = getMap(id), pa = pos.get(id)!;
    for (const w of a.warps) {
      if (!ids.includes(w.to) || pos.has(w.to)) continue;
      const b = getMap(w.to);
      const back = b.warps.find((v) => v.to === id);
      if (!back) continue;
      let x: number, y: number;
      if (w.x >= a.width - 1) { x = pa.x + a.width; y = pa.y + w.y - back.y; }
      else if (w.x <= 0) { x = pa.x - b.width; y = pa.y + w.y - back.y; }
      else if (w.y <= 0) { y = pa.y - b.height; x = pa.x + w.x - back.x; }
      else { y = pa.y + a.height; x = pa.x + w.x - back.x; }
      pos.set(w.to, { x, y });
      queue.push(w.to);
    }
  }
  const minX = Math.min(...[...pos.values()].map((p) => p.x)), minY = Math.min(...[...pos.values()].map((p) => p.y));
  const maps = [...pos.entries()].map(([id, p]) => {
    const m = getMap(id);
    return { id, name: m.name, x: p.x - minX, y: p.y - minY, w: m.width, h: m.height };
  });
  cached = {
    maps,
    width: Math.max(...maps.map((m) => m.x + m.w)),
    height: Math.max(...maps.map((m) => m.y + m.h)),
  };
  return cached;
}

/** Overview rectangle (tiles) around a base's facade on the Frontier. */
export function baseArea(baseId: string) {
  const b = BASE_BY_ID[baseId]!;
  const fr = worldLayout().maps.find((m) => m.id === FRONTIER)!;
  return { x: fr.x + b.facade.x - 2, y: fr.y + b.facade.y - 2, w: b.facade.w + 4, h: 8 };
}

/** Starting plaza of the default map, in overview tiles. */
export function startArea() {
  const v = worldLayout().maps.find((m) => m.id === DEFAULT_MAP)!;
  return { x: v.x + 52, y: v.y + 24, w: 44, h: 29 };
}

/**
 * Converts a position on any map (pixels) to overview tile coordinates.
 * Inside a base the marker sits on that base's entrance.
 */
export function locateOnWorld(mapId: string, px: number, py: number): { x: number; y: number; inside?: string } | null {
  const placed = worldLayout().maps.find((m) => m.id === mapId);
  if (placed) return { x: placed.x + px / TILE, y: placed.y + py / TILE };
  const base = baseOfMap(mapId);
  if (!base) return null;
  const a = baseArea(base.id);
  return { x: a.x + a.w / 2, y: a.y + 5.5, inside: base.name };
}

