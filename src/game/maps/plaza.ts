import type { Direction } from "../catalog";
import { MapBuilder, type MapDef } from "./types";
import { T, TILE } from "./tiles";

export const PLAZA = { x: 52, y: 24, w: 44, h: 29 };
export const PLAZA_TABLES = [[57, 29], [57, 43], [66, 47], [84, 43], [84, 29], [78, 47]] as const;
export interface Seat { x: number; y: number; dir: Direction }

export function buildChristmasPlaza(m: MapBuilder) {
  const { x, y, w, h } = PLAZA;
  for (const layer of ["decor", "objects", "above"] as const) m.rect(layer, x, y, w, h, 0);
  m.rect("ground", x, y, w, h, T.STONE);
  m.rect("ground", x + 2, y + 2, w - 4, h - 4, T.SNOW);
  m.rect("objects", x + 2, y + 1, w - 4, 1, T.FENCE);
  m.rect("objects", x + 2, y + h - 2, w - 4, 1, T.FENCE);
  m.rect("objects", 72, y + 1, 5, 1, 0);
  m.rect("objects", 72, y + h - 2, 5, 1, 0);
  m.rect("ground", 72, y, 5, h, T.STONE);
  m.rect("ground", x, 38, w, 3, T.STONE);
  // Circular fountain with an accessible water basin and a solid statue.
  for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) {
    if (i * i + j * j <= 20) m.set("ground", 74 + i, 38 + j, i * i + j * j <= 12 ? T.WATER : T.STONE);
  }
  m.rect("objects", 73, 37, 2, 2, T.WELL);
  for (const [tx, ty] of PLAZA_TABLES) {
    m.rect("objects", tx, ty, 4, 2, T.PICNIC);
    for (const dx of [0, 2]) {
      m.set("objects", tx + dx, ty - 1, T.CHAIR_DOWN);
      m.set("objects", tx + dx, ty + 2, T.CHAIR_UP);
    }
  }
  // Market pavilion, holiday tree, snowmen and wrapped presents.
  m.rect("objects", 84, 25, 7, 3, T.PLANK);
  m.rect("above", 84, 25, 7, 1, T.ROOF);
  m.rect("objects", 65, 31, 2, 2, T.TREE_BL);
  for (const [tx, ty] of [[64, 33], [67, 33], [65, 34], [89, 27]] as const) m.set("objects", tx, ty, T.PRESENT);
  for (const [tx, ty] of [[54, 26], [92, 26], [54, 49], [92, 49], [71, 50], [77, 50]] as const) m.set("objects", tx, ty, T.LAMP);
  for (const [tx, ty] of [[55, 34], [90, 36], [61, 48]] as const) m.set("objects", tx, ty, T.SNOWMAN);
  for (const [tx, ty] of [[56, 35], [87, 36], [61, 26], [81, 49]] as const) m.tree(tx, ty);
}

export function seatsFor(map: MapDef): Seat[] {
  const seats: Seat[] = [];
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const tile = map.layers.objects[y * map.width + x];
    if (tile === T.CHAIR_UP || tile === T.CHAIR_DOWN) seats.push({ x: x * TILE + 8, y: y * TILE + 12, dir: tile === T.CHAIR_UP ? "up" : "down" });
  }
  return seats;
}

export function nearbySeat(seats: Seat[], x: number, y: number, occupied: { x: number; y: number }[] = []): Seat | undefined {
  return seats.filter((s) => Math.hypot(s.x - x, s.y - y) <= 25 && !occupied.some((p) => Math.hypot(p.x - s.x, p.y - s.y) < 10))
    .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
}

export function waterAt(map: MapDef, x: number, y: number): boolean {
  const tx = Math.floor(x / TILE), ty = Math.floor((y - 3) / TILE);
  return tx >= 0 && ty >= 0 && tx < map.width && ty < map.height && map.layers.ground[ty * map.width + tx] === T.WATER;
}