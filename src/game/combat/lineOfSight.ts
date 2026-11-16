// SSR-safe (no Phaser): used by the server to reject attacks through walls.
import { getMap, hasMap } from "../maps";
import { TILE } from "../maps/tiles";
import { isSolidAt } from "../maps/types";

/** True when no solid tile sits on the straight line between two characters (sampled at chest height). */
export function hasLineOfSight(mapId: string, ax: number, ay: number, bx: number, by: number): boolean {
  if (!hasMap(mapId)) return false;
  const map = getMap(mapId);
  const y0 = ay - 6, y1 = by - 6;
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, y1 - y0) / 4));
  const start = `${Math.floor(ax / TILE)},${Math.floor(y0 / TILE)}`, end = `${Math.floor(bx / TILE)},${Math.floor(y1 / TILE)}`;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((ax + (bx - ax) * t) / TILE), ty = Math.floor((y0 + (y1 - y0) * t) / TILE);
    const key = `${tx},${ty}`;
    if (key === start || key === end) continue;
    if (isSolidAt(map, tx, ty)) return false;
  }
  return true;
}
