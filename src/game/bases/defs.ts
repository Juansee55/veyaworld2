// Gang base definitions (SSR-safe pure data). Interiors are built in maps/baseMaps.ts.
// The database seed for `bases` / `base_rooms` is generated from this file, and a test
// keeps the two in sync.
import { T } from "../maps/tiles";

export type Side = "n" | "s" | "e" | "w";
export type RoomType = "entrance" | "hq" | "defense" | "armory" | "corridor" | "respawn";

/** [tile, x, y] or [tile, x, y, w, h] placed on the objects layer (solid decorations). */
export type Deco = [number, number, number] | [number, number, number, number, number];

export interface RoomSpec {
  key: string;
  type: RoomType;
  name: string;
  w: number;
  h: number;
  /** Floor overrides on the ground layer: [tile, x, y, w, h]. */
  floors?: [number, number, number, number, number][];
  decor: Deco[];
  /** Spawn tile (defaults to room centre). */
  spawn?: [number, number];
}

export interface DoorSpec { a: string; aSide: Side; aPos: number; b: string; bSide: Side; bPos: number }

export interface BaseSpec {
  id: string;
  name: string;
  theme: string;
  wall: number;
  floor: number;
  rooms: RoomSpec[];
  doors: DoorSpec[];
  /** Entrance room door to the outside (always on its south wall). */
  exitPos: number;
  /** Exterior facade on the city map: top-left tile + width (height is 4). */
  facade: { x: number; y: number; w: number };
  rackWeapon: string;
}

/** The outdoor city map that holds every base entrance. */
export const FRONTIER = "village";
export const CAPTURE_RADIUS = 28; // px

export const roomMapId = (baseId: string, key: string) => `${baseId}_${key}`;

export const BASES: BaseSpec[] = [
  {
    id: "ironworks", name: "Ironworks HQ", theme: "industrial", wall: T.METAL_WALL, floor: T.METAL_FLOOR,
    facade: { x: 29, y: 13, w: 9 }, exitPos: 7, rackWeapon: "pipe_wrench",
    rooms: [
      { key: "entrance", type: "entrance", name: "Loading Bay", w: 14, h: 9, floors: [[T.CONCRETE, 1, 1, 12, 7]],
        decor: [[T.CRATE, 1, 1], [T.CRATE, 2, 1], [T.CRATE, 1, 2], [T.BARREL, 12, 1], [T.BARREL, 12, 2], [T.WARN_LAMP, 6, 1], [T.PIPE, 9, 1, 3, 1]] },
      { key: "corridor", type: "corridor", name: "Steam Corridor", w: 18, h: 6,
        decor: [[T.PIPE, 1, 1, 16, 1], [T.GEAR, 4, 4], [T.GEAR, 13, 4]] },
      { key: "hq", type: "hq", name: "Foundry Command", w: 18, h: 13, floors: [[T.GRATE, 6, 4, 6, 5]],
        decor: [[T.GEAR, 1, 1], [T.GEAR, 16, 1], [T.PIPE, 3, 1, 12, 1], [T.TABLE, 2, 10], [T.TABLE, 15, 10], [T.WARN_LAMP, 1, 6], [T.WARN_LAMP, 16, 6], [T.BARREL, 1, 11], [T.BARREL, 16, 11]] },
      { key: "armory", type: "armory", name: "Tool Armory", w: 10, h: 9,
        decor: [[T.WEAPON_RACK, 2, 1], [T.WEAPON_RACK, 3, 1], [T.WEAPON_RACK, 6, 1], [T.CRATE, 1, 7], [T.CRATE, 8, 7]] },
      { key: "respawn", type: "respawn", name: "Repair Bay", w: 10, h: 8, floors: [[T.RESPAWN_PAD, 4, 3, 2, 2]], spawn: [5, 4],
        decor: [[T.COT, 1, 1], [T.COT, 8, 1], [T.WARN_LAMP, 1, 6], [T.WARN_LAMP, 8, 6]] },
    ],
    doors: [
      { a: "entrance", aSide: "n", aPos: 7, b: "corridor", bSide: "s", bPos: 3 },
      { a: "corridor", aSide: "e", aPos: 3, b: "hq", bSide: "w", bPos: 6 },
      { a: "corridor", aSide: "n", aPos: 9, b: "armory", bSide: "s", bPos: 5 },
      { a: "hq", aSide: "n", aPos: 9, b: "respawn", bSide: "s", bPos: 5 },
    ],
  },
  {
    id: "sentinel", name: "Fort Sentinel", theme: "military", wall: T.SANDBAG, floor: T.DIRT,
    facade: { x: 85, y: 13, w: 8 }, exitPos: 8, rackWeapon: "spear",
    rooms: [
      { key: "entrance", type: "entrance", name: "Checkpoint Yard", w: 16, h: 10,
        decor: [[T.BARBED, 1, 4, 5, 1], [T.BARBED, 10, 4, 5, 1], [T.FLAG, 1, 1], [T.FLAG, 14, 1], [T.CRATE, 13, 7]] },
      { key: "hq", type: "hq", name: "Command Tent", w: 16, h: 12, floors: [[T.CONCRETE, 1, 1, 14, 10]],
        decor: [[T.TABLE, 2, 2], [T.TABLE, 3, 2], [T.FLAG, 14, 1], [T.CRATE, 1, 10], [T.CRATE, 14, 10], [T.SANDBAG, 4, 9, 2, 1], [T.SANDBAG, 10, 9, 2, 1]] },
      { key: "defense", type: "defense", name: "Watch Post", w: 12, h: 10,
        decor: [[T.SANDBAG, 2, 3, 3, 1], [T.SANDBAG, 7, 3, 3, 1], [T.SANDBAG, 2, 6, 3, 1], [T.SANDBAG, 7, 6, 3, 1], [T.WEAPON_RACK, 10, 1]] },
      { key: "respawn", type: "respawn", name: "Field Barracks", w: 12, h: 8, floors: [[T.RESPAWN_PAD, 5, 3, 2, 2]], spawn: [6, 4],
        decor: [[T.COT, 1, 1], [T.COT, 3, 1], [T.COT, 8, 1], [T.COT, 10, 1], [T.FLAG, 1, 6]] },
    ],
    doors: [
      { a: "entrance", aSide: "n", aPos: 8, b: "hq", bSide: "s", bPos: 8 },
      { a: "hq", aSide: "e", aPos: 5, b: "defense", bSide: "w", bPos: 5 },
      { a: "hq", aSide: "w", aPos: 5, b: "respawn", bSide: "e", bPos: 4 },
    ],
  },
  {
    id: "vault", name: "The Deep Vault", theme: "bunker", wall: T.BUNKER_WALL, floor: T.CONCRETE,
    facade: { x: 113, y: 27, w: 7 }, exitPos: 5, rackWeapon: "shock_baton",
    rooms: [
      { key: "entrance", type: "entrance", name: "Blast Door", w: 10, h: 8,
        decor: [[T.WARN_LAMP, 1, 1], [T.WARN_LAMP, 8, 1], [T.BARREL, 1, 6], [T.BARREL, 8, 6]] },
      { key: "corridor", type: "corridor", name: "Descending Shaft", w: 6, h: 16, floors: [[T.GRATE, 1, 1, 4, 14]],
        decor: [[T.WARN_LAMP, 1, 5], [T.WARN_LAMP, 4, 10]] },
      { key: "defense", type: "defense", name: "Turret Gallery", w: 16, h: 8,
        decor: [[T.SANDBAG, 3, 2, 2, 1], [T.SANDBAG, 11, 2, 2, 1], [T.SANDBAG, 3, 5, 2, 1], [T.SANDBAG, 11, 5, 2, 1], [T.WARN_LAMP, 7, 1]] },
      { key: "hq", type: "hq", name: "Vault Core", w: 16, h: 14, floors: [[T.GRATE, 5, 4, 6, 6]],
        decor: [[T.CRYSTAL, 1, 1], [T.CRYSTAL, 14, 1], [T.CRYSTAL, 1, 12], [T.CRYSTAL, 14, 12], [T.GEAR, 7, 1], [T.TABLE, 3, 11], [T.TABLE, 12, 11]] },
      { key: "armory", type: "armory", name: "Locked Arsenal", w: 9, h: 8,
        decor: [[T.WEAPON_RACK, 1, 1], [T.WEAPON_RACK, 2, 1], [T.WEAPON_RACK, 6, 1], [T.WEAPON_RACK, 7, 1], [T.CRATE, 1, 6]] },
      { key: "respawn", type: "respawn", name: "Med Bay", w: 9, h: 8, floors: [[T.RESPAWN_PAD, 3, 3, 2, 2]], spawn: [4, 4],
        decor: [[T.COT, 1, 1], [T.COT, 7, 1], [T.COT, 1, 6], [T.CRYSTAL, 7, 6]] },
    ],
    doors: [
      { a: "entrance", aSide: "n", aPos: 5, b: "corridor", bSide: "s", bPos: 3 },
      { a: "corridor", aSide: "n", aPos: 3, b: "defense", bSide: "s", bPos: 8 },
      { a: "defense", aSide: "n", aPos: 8, b: "hq", bSide: "s", bPos: 8 },
      { a: "hq", aSide: "w", aPos: 7, b: "armory", bSide: "e", bPos: 4 },
      { a: "hq", aSide: "e", aPos: 7, b: "respawn", bSide: "w", bPos: 4 },
    ],
  },
  {
    id: "thornwood", name: "Thornwood Lodge", theme: "forest", wall: T.LOG_WALL, floor: T.PLANK,
    facade: { x: 43, y: 27, w: 7 }, exitPos: 7, rackWeapon: "woodaxe",
    rooms: [
      { key: "hq", type: "entrance", name: "Great Hall", w: 15, h: 13, floors: [[T.CARPET, 5, 4, 5, 4]],
        decor: [[T.BUSH, 1, 1], [T.BUSH, 13, 1], [T.TORCH, 4, 1], [T.TORCH, 10, 1], [T.TABLE, 1, 6], [T.TABLE, 13, 6], [T.WEAPON_RACK, 1, 10], [T.BARREL, 13, 10], [T.ROPE, 13, 11]] },
      { key: "respawn", type: "respawn", name: "Hunter's Rest", w: 9, h: 8, floors: [[T.RESPAWN_PAD, 3, 3, 2, 2]], spawn: [4, 4],
        decor: [[T.COT, 1, 1], [T.COT, 7, 1], [T.TORCH, 1, 6], [T.BUSH, 7, 6]] },
    ],
    doors: [{ a: "hq", aSide: "e", aPos: 6, b: "respawn", bSide: "w", bPos: 4 }],
  },
  {
    id: "sunspire", name: "Sunspire Citadel", theme: "desert", wall: T.SANDSTONE_WALL, floor: T.SANDSTONE,
    facade: { x: 15, y: 55, w: 9 }, exitPos: 9, rackWeapon: "scimitar",
    rooms: [
      { key: "entrance", type: "entrance", name: "Sun Gate", w: 18, h: 9, floors: [[T.SAND, 1, 1, 16, 7]],
        decor: [[T.CACTUS, 1, 1], [T.CACTUS, 16, 1], [T.TORCH, 6, 1], [T.TORCH, 11, 1], [T.CACTUS, 2, 6]] },
      { key: "hq", type: "hq", name: "Throne of Dunes", w: 17, h: 14, floors: [[T.CARPET, 7, 1, 3, 12]],
        decor: [[T.TORCH, 1, 1], [T.TORCH, 15, 1], [T.TORCH, 1, 12], [T.TORCH, 15, 12], [T.FLAG, 4, 1], [T.FLAG, 12, 1], [T.TABLE, 2, 6], [T.TABLE, 14, 6]] },
      { key: "armory", type: "armory", name: "Spice Vault", w: 10, h: 10,
        decor: [[T.WEAPON_RACK, 1, 1], [T.WEAPON_RACK, 8, 1], [T.BARREL, 1, 8], [T.BARREL, 2, 8], [T.CRATE, 8, 8]] },
      { key: "respawn", type: "respawn", name: "Oasis Shrine", w: 10, h: 9, floors: [[T.WATER, 1, 1, 2, 2], [T.RESPAWN_PAD, 4, 4, 2, 2]], spawn: [5, 5],
        decor: [[T.CACTUS, 8, 1], [T.TORCH, 1, 7], [T.TORCH, 8, 7]] },
    ],
    doors: [
      { a: "entrance", aSide: "n", aPos: 9, b: "hq", bSide: "s", bPos: 8 },
      { a: "hq", aSide: "w", aPos: 9, b: "armory", bSide: "e", bPos: 5 },
      { a: "hq", aSide: "e", aPos: 9, b: "respawn", bSide: "w", bPos: 5 },
    ],
  },
  {
    id: "neon", name: "Neon Block", theme: "urban", wall: T.BRICK_WALL, floor: T.CHECKER,
    facade: { x: 71, y: 55, w: 8 }, exitPos: 6, rackWeapon: "katana",
    rooms: [
      { key: "entrance", type: "entrance", name: "Street Lobby", w: 12, h: 9, floors: [[T.STONE, 1, 1, 10, 7]],
        decor: [[T.NEON, 2, 1], [T.NEON, 9, 1], [T.LAMP, 1, 7], [T.LAMP, 10, 7], [T.TABLE, 5, 1]] },
      { key: "hq", type: "hq", name: "Rooftop Club", w: 18, h: 13, floors: [[T.CARPET, 1, 1, 16, 2]],
        decor: [[T.NEON, 1, 1], [T.NEON, 4, 1], [T.NEON, 13, 1], [T.NEON, 16, 1], [T.TABLE, 2, 10], [T.TABLE, 15, 10], [T.CRATE, 1, 11], [T.WEAPON_RACK, 16, 11]] },
      { key: "respawn", type: "respawn", name: "Safe Apartment", w: 10, h: 8, floors: [[T.CARPET, 1, 1, 8, 6], [T.RESPAWN_PAD, 4, 3, 2, 2]], spawn: [5, 4],
        decor: [[T.COT, 1, 1], [T.TABLE, 8, 1], [T.NEON, 1, 6]] },
    ],
    doors: [
      { a: "entrance", aSide: "n", aPos: 6, b: "hq", bSide: "s", bPos: 9 },
      { a: "hq", aSide: "e", aPos: 6, b: "respawn", bSide: "w", bPos: 4 },
    ],
  },
  {
    id: "saltgate", name: "Saltgate Docks", theme: "harbor", wall: T.HULL_WALL, floor: T.DECK,
    facade: { x: 43, y: 143, w: 9 }, exitPos: 4, rackWeapon: "harpoon",
    rooms: [
      { key: "entrance", type: "entrance", name: "Pier Gate", w: 16, h: 9, floors: [[T.WATER, 1, 1, 3, 7], [T.WATER, 12, 1, 3, 7]],
        decor: [[T.ANCHOR, 5, 1], [T.ROPE, 10, 1], [T.BARREL, 5, 6], [T.ROPE, 10, 6]] },
      { key: "hq", type: "hq", name: "Harbormaster's Warehouse", w: 18, h: 12,
        decor: [[T.CRATE, 1, 1], [T.CRATE, 2, 1], [T.CRATE, 1, 2], [T.CRATE, 16, 1], [T.CRATE, 15, 1], [T.ANCHOR, 8, 1], [T.BARREL, 1, 10], [T.BARREL, 16, 10], [T.ROPE, 2, 10]] },
      { key: "armory", type: "armory", name: "Cargo Hold", w: 11, h: 8,
        decor: [[T.WEAPON_RACK, 1, 1], [T.WEAPON_RACK, 2, 1], [T.CRATE, 8, 1], [T.CRATE, 9, 1], [T.CRATE, 9, 2], [T.BARREL, 1, 6]] },
      { key: "respawn", type: "respawn", name: "Crew Quarters", w: 10, h: 8, floors: [[T.RESPAWN_PAD, 4, 3, 2, 2]], spawn: [5, 4],
        decor: [[T.COT, 1, 1], [T.COT, 2, 1], [T.COT, 7, 1], [T.COT, 8, 1], [T.LAMP, 1, 6]] },
    ],
    doors: [
      { a: "entrance", aSide: "n", aPos: 8, b: "hq", bSide: "s", bPos: 9 },
      { a: "hq", aSide: "w", aPos: 6, b: "armory", bSide: "e", bPos: 4 },
      { a: "hq", aSide: "e", aPos: 6, b: "respawn", bSide: "w", bPos: 4 },
    ],
  },
  {
    id: "cragpeak", name: "Cragpeak Hold", theme: "mountain", wall: T.CRAG_WALL, floor: T.SLATE,
    facade: { x: 71, y: 157, w: 8 }, exitPos: 6, rackWeapon: "warhammer",
    rooms: [
      { key: "entrance", type: "entrance", name: "Iron Portcullis", w: 12, h: 8,
        decor: [[T.TORCH, 2, 1], [T.TORCH, 9, 1], [T.ROCK, 1, 6], [T.ROCK, 10, 6]] },
      { key: "corridor", type: "corridor", name: "Switchback Pass", w: 20, h: 6,
        decor: [[T.ROCK, 3, 1], [T.ROCK, 8, 4], [T.ROCK, 13, 1], [T.TORCH, 17, 1]] },
      { key: "defense", type: "defense", name: "Battlements", w: 12, h: 10, floors: [[T.STONE, 1, 1, 10, 8]],
        decor: [[T.STONE_WALL, 2, 3, 3, 1], [T.STONE_WALL, 7, 3, 3, 1], [T.FLAG, 1, 1], [T.FLAG, 10, 1], [T.WEAPON_RACK, 10, 8]] },
      { key: "hq", type: "hq", name: "Summit Keep", w: 16, h: 14, floors: [[T.CARPET, 6, 1, 4, 3]],
        decor: [[T.TORCH, 1, 1], [T.TORCH, 14, 1], [T.CRYSTAL, 1, 12], [T.CRYSTAL, 14, 12], [T.FLAG, 5, 1], [T.FLAG, 10, 1], [T.TABLE, 2, 7], [T.TABLE, 13, 7]] },
      { key: "respawn", type: "respawn", name: "Hearth Cave", w: 9, h: 9, floors: [[T.RESPAWN_PAD, 3, 4, 2, 2]], spawn: [4, 5],
        decor: [[T.TORCH, 1, 1], [T.TORCH, 7, 1], [T.COT, 1, 7], [T.COT, 7, 7]] },
    ],
    doors: [
      { a: "entrance", aSide: "e", aPos: 4, b: "corridor", bSide: "w", bPos: 3 },
      { a: "corridor", aSide: "e", aPos: 3, b: "defense", bSide: "w", bPos: 5 },
      { a: "defense", aSide: "n", aPos: 6, b: "hq", bSide: "s", bPos: 8 },
      { a: "hq", aSide: "w", aPos: 7, b: "respawn", bSide: "e", bPos: 4 },
    ],
  },
];

export const BASE_BY_ID: Record<string, BaseSpec> = Object.fromEntries(BASES.map((b) => [b.id, b]));

/** HQ room = where the capture zone lives (falls back to the entrance-type room). */
export function hqRoom(b: BaseSpec): RoomSpec {
  return b.rooms.find((r) => r.key === "hq") ?? b.rooms[0]!;
}
export function respawnRoom(b: BaseSpec): RoomSpec {
  return b.rooms.find((r) => r.type === "respawn")!;
}
export function armoryRoom(b: BaseSpec): RoomSpec {
  return b.rooms.find((r) => r.type === "armory") ?? hqRoom(b);
}
export function roomSpawnTile(r: RoomSpec): [number, number] {
  return r.spawn ?? [Math.floor(r.w / 2), Math.floor(r.h / 2)];
}
/** Capture zone centre in pixels inside the HQ room. */
export function captureZone(b: BaseSpec) {
  const r = hqRoom(b);
  return { mapId: roomMapId(b.id, r.key), x: Math.floor(r.w / 2) * 16 + 8, y: Math.floor(r.h / 2) * 16 + 8, radius: CAPTURE_RADIUS };
}
/** Which base (if any) a map belongs to. */
export function baseOfMap(mapId: string): BaseSpec | undefined {
  return BASES.find((b) => mapId.startsWith(b.id + "_"));
}
