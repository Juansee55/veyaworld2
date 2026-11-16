import { SOLID_TILES, T } from "./tiles";
import { rng } from "../art/pixel";

export const LAYERS = ["ground", "decor", "objects", "above"] as const;
export type LayerName = (typeof LAYERS)[number];

export interface Warp { x: number; y: number; w: number; h: number; to: string; toX: number; toY: number }

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Flat row-major tile arrays, one per layer. 0 = empty. */
  layers: Record<LayerName, number[]>;
  spawn: { x: number; y: number };
  warps: Warp[];
}

export class MapBuilder {
  layers: Record<LayerName, number[]>;
  rand: () => number;
  constructor(public width: number, public height: number, seed: number) {
    const n = width * height;
    this.layers = { ground: new Array(n).fill(T.GRASS), decor: new Array(n).fill(0), objects: new Array(n).fill(0), above: new Array(n).fill(0) };
    this.rand = rng(seed);
  }
  inside(x: number, y: number) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  set(layer: LayerName, x: number, y: number, t: number) { if (this.inside(x, y)) this.layers[layer][y * this.width + x] = t; }
  get(layer: LayerName, x: number, y: number) { return this.inside(x, y) ? this.layers[layer][y * this.width + x] : 0; }
  rect(layer: LayerName, x: number, y: number, w: number, h: number, t: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(layer, i, j, t);
  }
  scatter(layer: LayerName, t: number, chance: number, onlyOnGround?: number) {
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      if (onlyOnGround !== undefined && this.get("ground", x, y) !== onlyOnGround) continue;
      if (this.isFree(x, y) && this.rand() < chance) this.set(layer, x, y, t);
    }
  }
  isFree(x: number, y: number) { return this.get("objects", x, y) === 0 && this.get("decor", x, y) === 0 && this.get("above", x, y) === 0; }
  /** 2x2 tree: canopy draws above players, trunk row collides. (x,y) = top-left. */
  tree(x: number, y: number) {
    this.set("above", x, y, T.TREE_TL); this.set("above", x + 1, y, T.TREE_TR);
    this.set("objects", x, y + 1, T.TREE_BL); this.set("objects", x + 1, y + 1, T.TREE_BR);
  }
  /** House: 2 roof rows + 2 wall rows with a door in the middle of the bottom row. */
  house(x: number, y: number, w: number) {
    this.rect("objects", x, y, w, 1, T.ROOF);
    this.rect("objects", x, y + 1, w, 1, T.ROOF_EDGE);
    this.rect("objects", x, y + 2, w, 2, T.WALL);
    for (let i = x + 1; i < x + w - 1; i += 2) this.set("objects", i, y + 2, T.WINDOW);
    const door = x + Math.floor(w / 2);
    this.set("objects", door, y + 3, T.DOOR);
    this.rect("ground", door - 1, y + 4, 3, 1, T.STONE);
  }
  build(id: string, name: string, spawn: { x: number; y: number }, warps: Warp[]): MapDef {
    return { id, name, width: this.width, height: this.height, layers: this.layers, spawn, warps };
  }
}

export function isSolidAt(map: MapDef, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return true;
  const i = ty * map.width + tx;
  return SOLID_TILES.includes(map.layers.ground[i] ?? 0) || SOLID_TILES.includes(map.layers.objects[i] ?? 0);
}
