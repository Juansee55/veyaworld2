import { type MapDef } from "./types";
import { BASES, FRONTIER, roomMapId } from "../bases/defs";
import { buildBaseRoom, buildCity } from "./baseMaps";

/**
 * Map registry. To add a map: write a builder below (or load Tiled-style JSON that
 * matches MapDef) and register it. Each map is its own multiplayer room.
 */
const builders: Record<string, () => MapDef> = {
  village: buildCity,
};
for (const base of BASES) for (const room of base.rooms) builders[roomMapId(base.id, room.key)] = () => buildBaseRoom(base, room);
const cache = new Map<string, MapDef>();

export const DEFAULT_MAP = "village";

export function getMap(id: string): MapDef {
  const key = builders[id] ? id : DEFAULT_MAP;
  let m = cache.get(key);
  if (!m) { const builder = builders[key]; if (!builder) throw new Error("Missing map"); m = builder(); cache.set(key, m); }
  return m;
}
export function registerMap(id: string, builder: () => MapDef) { builders[id] = builder; cache.delete(id); }
export function hasMap(id: string) { return id in builders; }

