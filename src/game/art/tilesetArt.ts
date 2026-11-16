import atlasAsset from "@/assets/art/veya_tileset.png.asset.json";
import { makeCanvas, OUTLINE, rng, shade } from "./pixel";
import { T, TILESET_COLS, TILE, TILE_COUNT } from "../maps/tiles";
import { WINTER } from "./christmasArt";

type Ctx = CanvasRenderingContext2D;

const C = {
  grass: "#5a9e3a", grassD: "#4a8a30", grassL: "#74b84c",
  dirt: "#a7784a", dirtD: "#8c623a", dirtL: "#bf9262",
  stone: "#9a96a0", stoneD: "#6e6a76", stoneL: "#bdb9c2",
  water: "#3b7dd8", waterD: "#2c62b0", waterL: "#7fb3f0",
  sand: "#e0c88a", sandD: "#c9ad6e",
  wood: "#b07a44", woodD: "#7a4f2a", woodL: "#d09a5e",
  wall: "#e6d2a8", wallD: "#c2a878",
  roof: "#b5452f", roofD: "#86301f", roofL: "#d26a4e",
  leaf: "#3f8f3a", leafD: "#2c6a2c", leafL: "#62b04a",
};

function noise(ctx: Ctx, ox: number, oy: number, seed: number, colors: string[], density: number) {
  const r = rng(seed);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    if (r() < density) { ctx.fillStyle = colors[Math.floor(r() * colors.length)]!; ctx.fillRect(ox + x, oy + y, 1, 1); }
  }
}
const rect = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
function blob(ctx: Ctx, cx: number, cy: number, r: number, c: string) {
  ctx.fillStyle = c;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
}

const drawers: Partial<Record<number, (ctx: Ctx, x: number, y: number) => void>> = {
  [T.SNOW]: (c, x, y) => { rect(c, x, y, 16, 16, WINTER.snow); noise(c, x, y, 76, [WINTER.ice, "#ffffff"], 0.12); },
  [T.CHAIR_UP]: (c, x, y) => {
    rect(c, x + 3, y + 5, 10, 7, WINTER.woodDark); rect(c, x + 4, y + 5, 8, 5, WINTER.wood);
    rect(c, x + 3, y + 10, 10, 4, WINTER.woodDark); rect(c, x + 4, y + 10, 8, 2, WINTER.wood);
    rect(c, x + 3, y + 13, 2, 3, WINTER.woodDark); rect(c, x + 11, y + 13, 2, 3, WINTER.woodDark);
  },
  [T.CHAIR_DOWN]: (c, x, y) => {
    rect(c, x + 3, y + 2, 10, 9, WINTER.woodDark); rect(c, x + 4, y + 3, 8, 3, WINTER.wood);
    rect(c, x + 4, y + 9, 8, 4, WINTER.wood); rect(c, x + 3, y + 13, 2, 3, WINTER.woodDark); rect(c, x + 11, y + 13, 2, 3, WINTER.woodDark);
    rect(c, x + 3, y + 2, 10, 1, WINTER.snow);
  },
  [T.PICNIC]: (c, x, y) => {
    rect(c, x, y, 16, 16, WINTER.woodDark); rect(c, x + 1, y + 1, 14, 14, WINTER.wood);
    for (let j = 4; j < 16; j += 4) rect(c, x, y + j, 16, 1, WINTER.woodDark);
    rect(c, x + 5, y, 6, 16, WINTER.red); rect(c, x + 6, y + 2, 1, 2, WINTER.gold); rect(c, x + 9, y + 11, 1, 2, WINTER.gold);
  },
  [T.PRESENT]: (c, x, y) => { rect(c, x + 2, y + 4, 12, 11, WINTER.red); rect(c, x + 7, y + 4, 2, 11, WINTER.gold); rect(c, x + 2, y + 7, 12, 2, WINTER.gold); rect(c, x + 5, y + 2, 6, 2, WINTER.gold); },
  [T.SNOWMAN]: (c, x, y) => { blob(c, x + 8, y + 11, 5, WINTER.shadow); blob(c, x + 8, y + 10, 5, WINTER.snow); blob(c, x + 8, y + 4, 3, "#ffffff"); rect(c, x + 4, y, 8, 2, WINTER.pineDark); rect(c, x + 6, y - 1, 4, 2, WINTER.pineDark); rect(c, x + 5, y + 7, 6, 2, WINTER.red); rect(c, x + 7, y + 3, 1, 1, WINTER.woodDark); rect(c, x + 9, y + 4, 2, 1, WINTER.gold); },
  [T.GRASS]: (c, x, y) => { rect(c, x, y, 16, 16, C.grass); noise(c, x, y, 11, [C.grassD, C.grassL], 0.12); },
  [T.GRASS_DARK]: (c, x, y) => { rect(c, x, y, 16, 16, C.grassD); noise(c, x, y, 13, [C.grass, shade(C.grassD, -0.2)], 0.15); },
  [T.GRASS_FLOWER]: (c, x, y) => {
    drawers[T.GRASS]!(c, x, y);
    for (const [fx, fy, col] of [[3, 4, "#f4e04d"], [11, 3, "#ffffff"], [7, 10, "#e85d75"], [13, 12, "#f4e04d"]] as const) {
      rect(c, x + fx, y + fy, 1, 1, col); rect(c, x + fx - 1, y + fy, 1, 1, shade(col, -0.3)); rect(c, x + fx, y + fy + 1, 1, 1, C.grassD);
    }
  },
  [T.DIRT]: (c, x, y) => { rect(c, x, y, 16, 16, C.dirt); noise(c, x, y, 21, [C.dirtD, C.dirtL], 0.18); },
  [T.SAND]: (c, x, y) => { rect(c, x, y, 16, 16, C.sand); noise(c, x, y, 31, [C.sandD, shade(C.sand, 0.2)], 0.12); },
  [T.STONE]: (c, x, y) => {
    rect(c, x, y, 16, 16, C.stoneD);
    for (const [sx, sy, w, h] of [[0, 0, 7, 7], [8, 0, 8, 5], [8, 6, 8, 5], [0, 8, 6, 8], [7, 12, 9, 4], [7, 8, 1, 3]] as const) {
      rect(c, x + sx, y + sy, w, h, C.stone); rect(c, x + sx, y + sy, w, 1, C.stoneL);
    }
  },
  [T.WATER]: (c, x, y) => {
    rect(c, x, y, 16, 16, C.water);
    noise(c, x, y, 41, [C.waterD], 0.06);
    rect(c, x + 2, y + 4, 4, 1, C.waterL); rect(c, x + 9, y + 9, 5, 1, C.waterL); rect(c, x + 4, y + 13, 3, 1, C.waterL);
  },
  [T.BRIDGE]: (c, x, y) => {
    rect(c, x, y, 16, 16, C.wood);
    for (let i = 0; i < 16; i += 4) rect(c, x, y + i, 16, 1, C.woodD);
    rect(c, x, y, 1, 16, C.woodD); rect(c, x + 15, y, 1, 16, C.woodD);
  },
  [T.WALL]: (c, x, y) => {
    rect(c, x, y, 16, 16, C.wall);
    for (let i = 3; i < 16; i += 4) rect(c, x, y + i, 16, 1, C.wallD);
    rect(c, x, y + 15, 16, 1, OUTLINE);
  },
  [T.WINDOW]: (c, x, y) => {
    drawers[T.WALL]!(c, x, y);
    rect(c, x + 3, y + 3, 10, 9, C.woodD); rect(c, x + 4, y + 4, 8, 7, "#6fb6e8");
    rect(c, x + 7, y + 4, 2, 7, C.woodD); rect(c, x + 4, y + 7, 8, 1, C.woodD); rect(c, x + 4, y + 4, 2, 1, "#d8f0ff");
  },
  [T.DOOR]: (c, x, y) => {
    drawers[T.WALL]!(c, x, y);
    rect(c, x + 3, y + 1, 10, 15, OUTLINE); rect(c, x + 4, y + 2, 8, 14, C.wood);
    rect(c, x + 7, y + 2, 1, 14, C.woodD); rect(c, x + 10, y + 9, 1, 1, "#f2c14e");
  },
  [T.ROOF]: (c, x, y) => {
    rect(c, x, y, 16, 16, C.roof);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) rect(c, x + i * 4 + (r % 2) * 2, y + r * 4 + 3, 3, 1, C.roofD);
    noise(c, x, y, 51, [C.roofL], 0.05);
  },
  [T.ROOF_EDGE]: (c, x, y) => { drawers[T.ROOF]!(c, x, y); rect(c, x, y + 12, 16, 3, C.roofD); rect(c, x, y + 15, 16, 1, OUTLINE); },
  [T.STONE_WALL]: (c, x, y) => {
    rect(c, x, y, 16, 16, C.stoneD);
    for (let r = 0; r < 4; r++) for (let bx = (r % 2) * -4; bx < 16; bx += 8) {
      const sx = Math.max(0, bx), ex = Math.min(16, bx + 7);
      rect(c, x + sx, y + r * 4, ex - sx, 3, C.stone);
      rect(c, x + sx, y + r * 4, ex - sx, 1, C.stoneL);
    }
    rect(c, x, y + 15, 16, 1, OUTLINE);
  },
  [T.BUSH]: (c, x, y) => { blob(c, x + 8, y + 9, 6, OUTLINE); blob(c, x + 8, y + 9, 5, C.leaf); blob(c, x + 6, y + 7, 2, C.leafL); rect(c, x + 10, y + 11, 1, 1, "#e85d75"); },
  [T.ROCK]: (c, x, y) => { blob(c, x + 8, y + 10, 5, OUTLINE); blob(c, x + 8, y + 10, 4, C.stone); blob(c, x + 6, y + 8, 1, C.stoneL); rect(c, x + 5, y + 13, 7, 1, C.stoneD); },
  [T.FLOWERS]: (c, x, y) => {
    for (const [fx, fy, col] of [[3, 5, "#e85d75"], [9, 3, "#f4e04d"], [12, 9, "#b07ae8"], [5, 11, "#ffffff"], [10, 13, "#e85d75"]] as const) {
      rect(c, x + fx, y + fy + 1, 1, 2, C.leafD); rect(c, x + fx - 1, y + fy, 3, 1, col); rect(c, x + fx, y + fy - 1, 1, 3, col); rect(c, x + fx, y + fy, 1, 1, "#f4e04d");
    }
  },
  [T.FENCE]: (c, x, y) => {
    rect(c, x, y + 5, 16, 2, OUTLINE); rect(c, x, y + 10, 16, 2, OUTLINE);
    rect(c, x, y + 5, 16, 1, C.woodL); rect(c, x, y + 10, 16, 1, C.woodL);
    for (const px of [2, 11]) { rect(c, x + px, y + 2, 3, 13, OUTLINE); rect(c, x + px + 1, y + 3, 1, 11, C.wood); }
  },
  [T.SIGN]: (c, x, y) => {
    rect(c, x + 7, y + 8, 2, 8, C.woodD);
    rect(c, x + 2, y + 2, 12, 8, OUTLINE); rect(c, x + 3, y + 3, 10, 6, C.woodL);
    rect(c, x + 4, y + 5, 7, 1, C.woodD); rect(c, x + 4, y + 7, 5, 1, C.woodD);
  },
  [T.BARREL]: (c, x, y) => {
    rect(c, x + 3, y + 2, 10, 14, OUTLINE); rect(c, x + 4, y + 3, 8, 12, C.wood);
    rect(c, x + 4, y + 5, 8, 1, C.stoneD); rect(c, x + 4, y + 12, 8, 1, C.stoneD); rect(c, x + 5, y + 3, 1, 12, C.woodL);
  },
  [T.CRATE]: (c, x, y) => {
    rect(c, x + 1, y + 3, 14, 13, OUTLINE); rect(c, x + 2, y + 4, 12, 11, C.woodL);
    rect(c, x + 2, y + 4, 12, 1, C.woodD); rect(c, x + 2, y + 14, 12, 1, C.woodD);
    for (let i = 0; i < 11; i++) rect(c, x + 2 + i, y + 4 + i, 1, 1, C.woodD);
  },
  [T.LAMP]: (c, x, y) => {
    rect(c, x + 7, y + 5, 2, 11, OUTLINE); rect(c, x + 5, y + 14, 6, 2, OUTLINE);
    rect(c, x + 5, y, 6, 6, OUTLINE); rect(c, x + 6, y + 1, 4, 4, "#ffe58a");
  },
  [T.WELL]: (c, x, y) => {
    blob(c, x + 8, y + 9, 7, OUTLINE); blob(c, x + 8, y + 9, 6, C.stone); blob(c, x + 8, y + 9, 4, C.waterD);
    rect(c, x + 2, y + 1, 1, 8, C.woodD); rect(c, x + 13, y + 1, 1, 8, C.woodD); rect(c, x + 2, y + 1, 12, 1, C.woodD);
  },
};

// ---------------- Gang base tiles ----------------
const B = {
  metal: "#7c8794", metalD: "#56606c", metalL: "#a9b4bf", rust: "#a8562c",
  conc: "#8d8a84", concD: "#6c6964", bunker: "#4b4f47", bunkerD: "#33362f",
  sandst: "#d9a865", sandstD: "#b58448", sandstL: "#f0c98a",
  brick: "#9c3f2e", brickD: "#6e281c", mortar: "#cdb9a0",
  deck: "#8f6a42", deckD: "#694a2b", hull: "#3d4a5c", hullD: "#28323f",
  slate: "#5d5a6e", slateD: "#43405a", crag: "#6b6577", cragD: "#4a4555", cragL: "#8d879a",
  olive: "#6f7a3a", oliveD: "#525a28",
};
function brickPattern(c: Ctx, x: number, y: number, base: string, dark: string, light: string, bw = 8, bh = 4) {
  rect(c, x, y, 16, 16, dark);
  for (let r = 0; r < 16 / bh; r++) for (let bx = (r % 2) * -(bw / 2); bx < 16; bx += bw) {
    const sx = Math.max(0, bx), ex = Math.min(16, bx + bw - 1);
    rect(c, x + sx, y + r * bh, ex - sx, bh - 1, base);
    rect(c, x + sx, y + r * bh, ex - sx, 1, light);
  }
  rect(c, x, y + 15, 16, 1, OUTLINE);
}
Object.assign(drawers, {
  [T.DOORWAY]: (c: Ctx, x: number, y: number) => { rect(c, x, y, 16, 16, "#120c18"); rect(c, x + 1, y, 14, 2, "#2a2034"); rect(c, x + 3, y + 13, 10, 3, "#3a2a20"); },
  [T.METAL_FLOOR]: (c: Ctx, x: number, y: number) => {
    rect(c, x, y, 16, 16, B.metal); rect(c, x, y, 16, 1, B.metalL); rect(c, x, y + 8, 16, 1, B.metalD); rect(c, x + 8, y, 1, 16, B.metalD);
    for (const [px, py] of [[2, 2], [13, 2], [2, 13], [13, 13]] as const) rect(c, x + px, y + py, 1, 1, B.metalL);
  },
  [T.METAL_WALL]: (c: Ctx, x: number, y: number) => {
    rect(c, x, y, 16, 16, B.metalD); for (let i = 0; i < 16; i += 4) rect(c, x + i, y, 1, 16, B.metal);
    rect(c, x, y + 2, 16, 1, B.metalL); rect(c, x + 5, y + 9, 3, 2, B.rust); rect(c, x, y + 15, 16, 1, OUTLINE);
  },
  [T.CONCRETE]: (c: Ctx, x: number, y: number) => { rect(c, x, y, 16, 16, B.conc); noise(c, x, y, 61, [B.concD, shade(B.conc, 0.15)], 0.1); },
  [T.SANDBAG]: (c: Ctx, x: number, y: number) => {
    rect(c, x, y + 3, 16, 13, OUTLINE);
    for (const [bx, by] of [[0, 4], [8, 4], [-4, 9], [4, 9], [12, 9]] as const) { rect(c, x + Math.max(0, bx) + 1, y + by, 6, 4, B.olive); rect(c, x + Math.max(0, bx) + 1, y + by, 6, 1, shade(B.olive, 0.2)); }
    rect(c, x, y + 14, 16, 2, B.oliveD);
  },
  [T.BUNKER_WALL]: (c: Ctx, x: number, y: number) => {
    rect(c, x, y, 16, 16, B.bunker); for (let i = 0; i < 16; i += 5) rect(c, x, y + i, 16, 1, B.bunkerD);
    for (let i = 0; i < 16; i += 4) { rect(c, x + i, y + 12, 2, 3, "#e0b03a"); rect(c, x + i + 2, y + 12, 2, 3, "#1b1424"); } rect(c, x, y + 15, 16, 1, OUTLINE);
  },
  [T.GRATE]: (c: Ctx, x: number, y: number) => { rect(c, x, y, 16, 16, B.bunkerD); for (let i = 1; i < 16; i += 3) { rect(c, x + i, y, 1, 16, B.bunker); rect(c, x, y + i, 16, 1, B.bunker); } },
  [T.PLANK]: (c: Ctx, x: number, y: number) => {
    rect(c, x, y, 16, 16, C.wood); for (let i = 0; i < 16; i += 4) rect(c, x + i, y, 1, 16, C.woodD);
    rect(c, x + 2, y + 5, 1, 1, C.woodD); rect(c, x + 10, y + 11, 1, 1, C.woodD); noise(c, x, y, 71, [C.woodL], 0.04);
  },
  [T.LOG_WALL]: (c: Ctx, x: number, y: number) => {
    rect(c, x, y, 16, 16, C.woodD);
    for (let r = 0; r < 4; r++) { rect(c, x, y + r * 4, 16, 3, C.wood); rect(c, x, y + r * 4, 16, 1, C.woodL); blob(c, x + (r % 2 ? 2 : 13), y + r * 4 + 1, 1, "#d8b07a"); }
    rect(c, x, y + 15, 16, 1, OUTLINE);
  },
  [T.SANDSTONE]: (c: Ctx, x: number, y: number) => { rect(c, x, y, 16, 16, B.sandstL); rect(c, x, y, 16, 1, B.sandst); rect(c, x, y, 1, 16, B.sandst); noise(c, x, y, 81, [B.sandst], 0.06); },
  [T.SANDSTONE_WALL]: (c: Ctx, x: number, y: number) => brickPattern(c, x, y, B.sandst, B.sandstD, B.sandstL, 16, 5),
  [T.CHECKER]: (c: Ctx, x: number, y: number) => { rect(c, x, y, 16, 16, "#2c2838"); rect(c, x, y, 8, 8, "#d8d2e0"); rect(c, x + 8, y + 8, 8, 8, "#d8d2e0"); },
  [T.BRICK_WALL]: (c: Ctx, x: number, y: number) => brickPattern(c, x, y, B.brick, B.mortar, shade(B.brick, 0.2)),
  [T.DECK]: (c: Ctx, x: number, y: number) => { rect(c, x, y, 16, 16, B.deck); for (let i = 0; i < 16; i += 3) rect(c, x, y + i, 16, 1, B.deckD); rect(c, x + 5, y + 1, 1, 1, OUTLINE); rect(c, x + 11, y + 7, 1, 1, OUTLINE); },
  [T.HULL_WALL]: (c: Ctx, x: number, y: number) => {
    rect(c, x, y, 16, 16, B.hull); for (let i = 0; i < 16; i += 4) rect(c, x, y + i, 16, 1, B.hullD);
    blob(c, x + 8, y + 7, 3, "#c9a24a"); blob(c, x + 8, y + 7, 2, "#7fb3f0"); rect(c, x, y + 15, 16, 1, OUTLINE);
  },
  [T.SLATE]: (c: Ctx, x: number, y: number) => { rect(c, x, y, 16, 16, B.slate); for (const [a, b2, w, h] of [[0, 0, 9, 7], [10, 0, 6, 9], [0, 8, 6, 8], [7, 10, 9, 6]] as const) rect(c, x + a, y + b2, w, 1, B.slateD); },
  [T.CRAG_WALL]: (c: Ctx, x: number, y: number) => { rect(c, x, y, 16, 16, B.cragD); blob(c, x + 5, y + 5, 4, B.crag); blob(c, x + 12, y + 9, 4, B.crag); blob(c, x + 4, y + 12, 3, B.crag); blob(c, x + 4, y + 4, 1, B.cragL); blob(c, x + 11, y + 8, 1, B.cragL); rect(c, x, y + 15, 16, 1, OUTLINE); },
  [T.PIPE]: (c: Ctx, x: number, y: number) => { rect(c, x, y + 4, 16, 8, OUTLINE); rect(c, x, y + 5, 16, 6, B.metal); rect(c, x, y + 6, 16, 1, B.metalL); rect(c, x + 6, y + 3, 4, 10, B.rust); rect(c, x + 6, y + 3, 4, 1, OUTLINE); },
  [T.GEAR]: (c: Ctx, x: number, y: number) => { rect(c, x + 1, y + 1, 14, 15, OUTLINE); rect(c, x + 2, y + 2, 12, 13, B.metalD); blob(c, x + 8, y + 8, 5, B.metal); blob(c, x + 8, y + 8, 2, OUTLINE); for (const [a, b2] of [[8, 2], [8, 13], [2, 8], [13, 8]] as const) rect(c, x + a - 1, y + b2 - 1, 2, 2, B.metalL); },
  [T.WARN_LAMP]: (c: Ctx, x: number, y: number) => { rect(c, x + 6, y + 6, 4, 10, OUTLINE); rect(c, x + 4, y + 1, 8, 7, OUTLINE); rect(c, x + 5, y + 2, 6, 5, "#ff9a2e"); rect(c, x + 6, y + 3, 2, 1, "#ffe58a"); },
  [T.WEAPON_RACK]: (c: Ctx, x: number, y: number) => {
    rect(c, x + 1, y + 2, 14, 13, OUTLINE); rect(c, x + 2, y + 3, 12, 11, C.woodD); rect(c, x + 2, y + 6, 12, 1, C.wood);
    for (const px of [4, 8, 12]) { rect(c, x + px - 1, y + 3, 1, 10, B.metalL); rect(c, x + px - 2, y + 10, 3, 1, C.wood); }
  },
  [T.RESPAWN_PAD]: (c: Ctx, x: number, y: number) => { rect(c, x, y, 16, 16, B.slateD); blob(c, x + 8, y + 8, 7, "#3ad1c4"); blob(c, x + 8, y + 8, 5, "#1f8f88"); blob(c, x + 8, y + 8, 2, "#bff5ef"); },
  [T.TORCH]: (c: Ctx, x: number, y: number) => { rect(c, x + 7, y + 7, 2, 9, C.woodD); rect(c, x + 5, y + 6, 6, 2, OUTLINE); blob(c, x + 8, y + 4, 3, "#e8662e"); blob(c, x + 8, y + 4, 1, "#ffe58a"); },
  [T.NEON]: (c: Ctx, x: number, y: number) => { rect(c, x + 1, y + 3, 14, 10, OUTLINE); rect(c, x + 2, y + 4, 12, 8, "#251a38"); rect(c, x + 3, y + 6, 10, 1, "#ff4fd8"); rect(c, x + 3, y + 9, 7, 1, "#4fe8ff"); },
  [T.ANCHOR]: (c: Ctx, x: number, y: number) => { rect(c, x + 7, y + 2, 2, 12, OUTLINE); rect(c, x + 4, y + 4, 8, 2, OUTLINE); rect(c, x + 3, y + 12, 10, 2, OUTLINE); rect(c, x + 2, y + 10, 2, 3, OUTLINE); rect(c, x + 12, y + 10, 2, 3, OUTLINE); blob(c, x + 8, y + 2, 1, "#c9a24a"); },
  [T.CACTUS]: (c: Ctx, x: number, y: number) => { rect(c, x + 6, y + 2, 4, 14, OUTLINE); rect(c, x + 7, y + 3, 2, 13, "#4f9a3a"); rect(c, x + 2, y + 6, 4, 2, "#4f9a3a"); rect(c, x + 2, y + 3, 2, 4, "#4f9a3a"); rect(c, x + 10, y + 8, 4, 2, "#4f9a3a"); rect(c, x + 12, y + 5, 2, 4, "#4f9a3a"); },
  [T.CARPET]: (c: Ctx, x: number, y: number) => { rect(c, x, y, 16, 16, "#8a2a3a"); rect(c, x + 1, y + 1, 14, 14, "#a83a4a"); rect(c, x + 3, y + 3, 10, 10, "#8a2a3a"); rect(c, x + 7, y + 7, 2, 2, "#e8c35a"); },
  [T.TABLE]: (c: Ctx, x: number, y: number) => { rect(c, x + 1, y + 3, 14, 9, OUTLINE); rect(c, x + 2, y + 4, 12, 7, C.woodL); rect(c, x + 2, y + 11, 2, 5, C.woodD); rect(c, x + 12, y + 11, 2, 5, C.woodD); rect(c, x + 5, y + 6, 6, 3, "#e6d2a8"); },
  [T.COT]: (c: Ctx, x: number, y: number) => { rect(c, x + 1, y + 1, 14, 15, OUTLINE); rect(c, x + 2, y + 2, 12, 13, B.olive); rect(c, x + 2, y + 2, 12, 4, "#e6e2d8"); },
  [T.FLAG]: (c: Ctx, x: number, y: number) => { rect(c, x + 3, y + 1, 1, 15, OUTLINE); rect(c, x + 4, y + 2, 10, 6, "#c4473a"); rect(c, x + 4, y + 4, 10, 2, "#f0d890"); },
  [T.BARBED]: (c: Ctx, x: number, y: number) => { rect(c, x, y + 8, 16, 1, B.metalD); for (let i = 1; i < 16; i += 4) { rect(c, x + i, y + 6, 1, 5, B.metalL); rect(c, x + i - 1, y + 7, 3, 3, B.metalD); } rect(c, x + 1, y + 4, 1, 12, C.woodD); rect(c, x + 14, y + 4, 1, 12, C.woodD); },
  [T.ROPE]: (c: Ctx, x: number, y: number) => { blob(c, x + 8, y + 9, 6, OUTLINE); blob(c, x + 8, y + 9, 5, "#c9a76a"); blob(c, x + 8, y + 9, 3, "#9c7d48"); blob(c, x + 8, y + 9, 1, OUTLINE); },
  [T.CAPTURE_MARK]: (c: Ctx, x: number, y: number) => { rect(c, x, y, 16, 16, B.slate); rect(c, x + 6, y + 6, 4, 4, "#e8c35a"); },
  [T.CRYSTAL]: (c: Ctx, x: number, y: number) => { rect(c, x + 5, y + 2, 6, 13, OUTLINE); rect(c, x + 6, y + 3, 4, 11, "#8ad8ff"); rect(c, x + 7, y + 4, 1, 6, "#e0f6ff"); rect(c, x + 3, y + 8, 3, 7, "#5ab0e0"); rect(c, x + 10, y + 9, 3, 6, "#5ab0e0"); },
});

/** Tree is 2x2 tiles drawn once then sliced into TL/TR/BL/BR. */
function drawTree(ctx: Ctx) {
  const { canvas: t, ctx: tc } = makeCanvas(32, 32);
  rect(tc, 13, 20, 6, 11, OUTLINE); rect(tc, 14, 20, 4, 10, C.woodD); rect(tc, 15, 21, 1, 8, C.wood);
  rect(tc, 9, 29, 14, 3, "rgba(0,0,0,0.25)");
  for (const [cx, cy, r] of [[16, 11, 11], [9, 15, 7], [23, 15, 7]] as const) blob(tc, cx, cy, r + 1, OUTLINE);
  for (const [cx, cy, r] of [[16, 11, 11], [9, 15, 7], [23, 15, 7]] as const) blob(tc, cx, cy, r, C.leaf);
  blob(tc, 13, 8, 4, C.leafL); blob(tc, 22, 17, 3, C.leafD); blob(tc, 9, 17, 3, C.leafD);
  for (const [x, y, w] of [[10, 4, 12], [4, 12, 10], [20, 12, 9]] as const) { rect(tc, x, y, w, 2, WINTER.snow); rect(tc, x + 2, y + 2, w - 4, 1, WINTER.ice); }
  for (const [x, y, col] of [[7, 16, WINTER.red], [16, 10, WINTER.gold], [25, 17, WINTER.red], [14, 20, WINTER.gold]] as const) rect(tc, x, y, 2, 2, col);
  const place = (id: number, sx: number, sy: number) => {
    const dx = (id % TILESET_COLS) * TILE, dy = Math.floor(id / TILESET_COLS) * TILE;
    ctx.drawImage(t, sx, sy, 16, 16, dx, dy, 16, 16);
  };
  place(T.TREE_TL, 0, 0); place(T.TREE_TR, 16, 0); place(T.TREE_BL, 0, 16); place(T.TREE_BR, 16, 16);
}

/**
 * Terrain, floor and wall tiles come from the uploaded 16x16 atlas (column, row). Overlay objects
 * (trees, furniture, props) stay procedural because they need transparency. Collisions only use
 * logical tile ids, so swapping art never changes walkability.
 */
const ATLAS: Partial<Record<number, [number, number]>> = {
  [T.GRASS]: [65, 7], [T.GRASS_FLOWER]: [64, 9], [T.GRASS_DARK]: [93, 3], [T.DIRT]: [65, 14], [T.SAND]: [64, 12],
  [T.STONE]: [75, 0], [T.WATER]: [8, 8], [T.WALL]: [64, 24], [T.BRICK_WALL]: [69, 21], [T.STONE_WALL]: [65, 21],
  [T.METAL_WALL]: [86, 17], [T.CONCRETE]: [89, 17], [T.GRATE]: [74, 4], [T.PLANK]: [120, 13], [T.DECK]: [125, 13],
  [T.SLATE]: [97, 7], [T.SANDSTONE]: [116, 12], [T.LOG_WALL]: [70, 17], [T.CRAG_WALL]: [96, 4],
  [T.BUNKER_WALL]: [73, 21], [T.HULL_WALL]: [72, 22],
};
let atlas: HTMLImageElement | undefined;
export async function loadTilesetAtlas() {
  if (atlas) return;
  const img = new Image();
  img.src = atlasAsset.url;
  try {
    await img.decode();
    atlas = img;
  } catch {
    // Procedural terrain keeps the world playable if the atlas is temporarily unavailable.
  }
}

export function buildTilesetCanvas(): HTMLCanvasElement {
  const rows = Math.ceil(TILE_COUNT / TILESET_COLS);
  const { canvas, ctx } = makeCanvas(TILESET_COLS * TILE, rows * TILE);
  for (const [id, fn] of Object.entries(drawers)) {
    const i = Number(id);
    fn!(ctx, (i % TILESET_COLS) * TILE, Math.floor(i / TILESET_COLS) * TILE);
  }
  drawTree(ctx);
  if (atlas) for (const [id, cell] of Object.entries(ATLAS)) {
    const i = Number(id), dx = (i % TILESET_COLS) * TILE, dy = Math.floor(i / TILESET_COLS) * TILE;
    ctx.clearRect(dx, dy, TILE, TILE);
    ctx.drawImage(atlas, cell![0] * TILE, cell![1] * TILE, TILE, TILE, dx, dy, TILE, TILE);
    if (i === T.GRASS_FLOWER) for (const [fx, fy, c] of [[3, 4, "#f2e15a"], [11, 6, "#f07aa0"], [6, 11, "#ffffff"], [13, 13, "#f2e15a"]] as const) {
      ctx.fillStyle = OUTLINE; ctx.fillRect(dx + fx - 1, dy + fy, 3, 1); ctx.fillStyle = c; ctx.fillRect(dx + fx, dy + fy - 1, 1, 3);
    }
  }
  return canvas;
}
