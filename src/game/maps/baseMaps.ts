import { BASES, FRONTIER, roomMapId, roomSpawnTile, type BaseSpec, type RoomSpec, type Side } from "../bases/defs";
import { T } from "./tiles";
import { MapBuilder, type MapDef, type Warp } from "./types";
import { buildChristmasPlaza } from "./plaza";

function doorway(room: RoomSpec, side: Side, pos: number, inside = false): [number, number] {
  const inset = inside ? 1 : 0;
  if (side === "n") return [pos, inset];
  if (side === "s") return [pos, room.h - 1 - inset];
  if (side === "w") return [inset, pos];
  return [room.w - 1 - inset, pos];
}

export function buildBaseRoom(base: BaseSpec, room: RoomSpec): MapDef {
  const m = new MapBuilder(room.w, room.h, 42);
  m.rect("ground", 0, 0, room.w, room.h, base.floor);
  m.rect("objects", 0, 0, room.w, 1, base.wall);
  m.rect("objects", 0, room.h - 1, room.w, 1, base.wall);
  m.rect("objects", 0, 0, 1, room.h, base.wall);
  m.rect("objects", room.w - 1, 0, 1, room.h, base.wall);
  for (const [tile, x, y, w, h] of room.floors ?? []) m.rect("ground", x, y, w, h, tile);
  for (const [tile, x, y, w, h] of room.decor) m.rect("objects", x, y, w ?? 1, h ?? 1, tile);
  const warps: Warp[] = [];
  const carve = (side: Side, pos: number, to: string, arrival: [number, number]) => {
    const [x, y] = doorway(room, side, pos);
    const [ix, iy] = doorway(room, side, pos, true);
    m.set("objects", x, y, T.DOORWAY);
    m.set("ground", x, y, base.floor);
    m.set("objects", ix, iy, 0);
    m.set("ground", ix, iy, base.floor);
    warps.push({ x, y, w: 1, h: 1, to, toX: arrival[0], toY: arrival[1] });
  };
  for (const d of base.doors) {
    const fromA = d.a === room.key;
    if (!fromA && d.b !== room.key) continue;
    const target = base.rooms.find((r) => r.key === (fromA ? d.b : d.a));
    if (!target) continue;
    carve(fromA ? d.aSide : d.bSide, fromA ? d.aPos : d.bPos, roomMapId(base.id, target.key), doorway(target, fromA ? d.bSide : d.aSide, fromA ? d.bPos : d.aPos, true));
  }
  if (room.type === "entrance") carve("s", base.exitPos, FRONTIER, [base.facade.x + Math.floor(base.facade.w / 2), base.facade.y + 4]);
  const [x, y] = roomSpawnTile(room);
  m.set("objects", x, y, 0);
  return m.build(roomMapId(base.id, room.key), `${base.name} · ${room.name}`, { x, y }, warps);
}

/**
 * Veya City: the whole outdoor world in one map (16x16 tiles). North island with a
 * street grid, a long bridge south to a second island, small islands and a pier.
 * Every base entrance stands in its own city block.
 */
export const CITY_W = 128, CITY_H = 176;
const V_N = [12, 26, 40, 54, 68, 82, 96, 110], H_N = [8, 22, 36, 50, 64];
const V_S = [40, 54, 68, 82], H_S = [124, 138, 152];

export function buildCity(): MapDef {
  const m = new MapBuilder(CITY_W, CITY_H, 2026);
  m.rect("ground", 0, 0, CITY_W, CITY_H, T.WATER);
  const island = (x: number, y: number, w: number, h: number) => {
    m.rect("ground", x, y, w, h, T.SAND);
    m.rect("ground", x + 2, y + 2, w - 4, h - 4, T.GRASS);
  };
  // land masses
  island(4, 2, 120, 78);
  m.rect("ground", 0, 12, 10, 18, T.WATER); m.rect("ground", 10, 12, 2, 18, T.SAND);           // west lagoon
  m.rect("ground", 102, 36, 26, 44, T.WATER); m.rect("ground", 100, 36, 2, 44, T.SAND);         // east bay
  island(20, 118, 82, 54);
  island(92, 92, 28, 18);   // east harbor island
  island(4, 96, 14, 10);    // west islet
  island(108, 150, 16, 14); // south-east islet
  m.scatter("ground", T.GRASS_DARK, 0.06, T.GRASS);
  m.scatter("ground", T.GRASS_FLOWER, 0.04, T.GRASS);

  const land = (x: number, y: number) => { const g = m.get("ground", x, y); return g !== T.WATER && g !== T.SAND; };
  const roads = (vs: number[], hs: number[], x0: number, x1: number, y0: number, y1: number) => {
    for (const x of vs) for (let y = y0; y <= y1; y++) for (const dx of [0, 1]) if (land(x + dx, y)) m.set("ground", x + dx, y, T.CONCRETE);
    for (const y of hs) for (let x = x0; x <= x1; x++) for (const dy of [0, 1]) if (land(x, y + dy)) m.set("ground", x, y + dy, T.CONCRETE);
  };
  roads(V_N, H_N, 8, 120, 5, 76);
  roads(V_S, H_S, 24, 98, 121, 168);

  // bridge north <-> south, pier to the harbor island
  m.rect("ground", 67, 76, 4, 46, T.BRIDGE);
  m.rect("ground", 72, 98, 22, 3, T.DECK);
  m.rect("ground", 18, 99, 22, 2, T.DECK);
  m.rect("ground", 98, 154, 12, 2, T.DECK);

  const baseAt = new Set(BASES.map((b) => `${b.facade.x - 1},${b.facade.y - 3}`));
  const spawnBlock = "56,38";
  const blocks: [number, number][] = [];
  for (const vx of V_N.slice(0, -1)) for (const hy of H_N.slice(0, -1)) blocks.push([vx + 2, hy + 2]);
  for (const hy of [64]) for (const vx of V_N.slice(0, -1)) blocks.push([vx + 2, hy + 2]);
  for (const vx of V_S.slice(0, -1)) for (const hy of H_S) blocks.push([vx + 2, hy + 2]);
  for (const [bx, by] of blocks) {
    if (!land(bx + 5, by + 5)) continue;
    const key = `${bx},${by}`;
    // sidewalk ring
    for (let i = 0; i < 12; i++) for (const [x, y] of [[bx + i, by], [bx + i, by + 11], [bx, by + i], [bx + 11, by + i]] as [number, number][]) if (land(x, y)) m.set("ground", x, y, T.STONE);
    if (key === spawnBlock) {
      m.rect("ground", bx + 1, by + 1, 10, 10, T.STONE);
      m.set("objects", bx + 3, by + 3, T.WELL);
      for (const [x, y] of [[1, 1], [10, 1], [1, 10], [10, 10]]) m.set("objects", bx + x!, by + y!, T.LAMP);
      m.set("objects", bx + 8, by + 3, T.SIGN);
      continue;
    }
    if (baseAt.has(key)) continue;
    const r = m.rand();
    if (r < 0.55) {
      m.house(bx + 1, by + 1, 5); m.house(bx + 6, by + 1, 5);
      m.tree(bx + 1, by + 7); m.tree(bx + 9, by + 7);
      m.set("objects", bx + 5, by + 9, T.BARREL);
    } else if (r < 0.8) {
      m.house(bx + 2, by + 2, 8);
      m.rect("objects", bx + 1, by + 8, 10, 1, T.FENCE);
      m.rect("decor", bx + 2, by + 9, 8, 1, T.FLOWERS);
    } else {
      for (const [x, y] of [[1, 1], [8, 1], [1, 7], [8, 7], [4, 4]]) m.tree(bx + x!, by + y!);
      m.rect("decor", bx + 3, by + 3, 1, 1, T.FLOWERS);
    }
  }

  const warps: Warp[] = [];
  for (const b of BASES) {
    const f = b.facade;
    m.rect("ground", f.x - 1, f.y - 2, f.w + 2, 8, b.floor);
    m.rect("objects", f.x - 1, f.y - 2, f.w + 2, 8, 0);
    m.rect("objects", f.x, f.y, f.w, 4, b.wall);
    m.rect("objects", f.x + 1, f.y, f.w - 2, 1, T.ROOF_EDGE);
    const dx = f.x + Math.floor(f.w / 2), dy = f.y + 3;
    m.set("objects", dx, dy, T.DOORWAY);
    m.rect("ground", dx, dy + 1, 1, 4, T.STONE);
    m.set("objects", f.x - 1, dy + 1, T.FLAG);
    const entrance = b.rooms.find((r) => r.type === "entrance");
    if (entrance) warps.push({ x: dx, y: dy, w: 1, h: 1, to: roomMapId(b.id, entrance.key), toX: b.exitPos, toY: entrance.h - 2 });
  }
  // small-island life
  m.house(96, 95, 7); m.house(106, 95, 6); m.house(7, 98, 6); m.house(111, 152, 6);
  m.scatter("objects", T.BUSH, 0.01, T.GRASS);
  m.scatter("decor", T.FLOWERS, 0.015, T.GRASS);
  m.rect("objects", 59, 43, 4, 3, 0);
  buildChristmasPlaza(m);
  for (let i = 0; i < m.layers.ground.length; i++) {
    if ([T.GRASS, T.GRASS_DARK, T.GRASS_FLOWER].includes(m.layers.ground[i] as 1 | 2 | 7)) m.layers.ground[i] = T.SNOW;
  }
  return m.build(FRONTIER, "Veya City · Navidad", { x: 74, y: 45 }, warps);
}
