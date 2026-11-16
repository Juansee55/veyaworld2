// Browser-only pixel art; the scene creates these textures before its first frame.
export const WINTER = { snow: "#edf5f5", ice: "#c5d9e2", shadow: "#8faab9", pine: "#23654c", pineLight: "#368061", pineDark: "#174d3a", wood: "#885d43", woodDark: "#4e392e", red: "#c43c49", gold: "#f1cc65", stone: "#8b9399", stoneLight: "#bec8ce", water: "#478ba4", waterLight: "#a8e2e8" };

export function christmasCanvas(kind: "tree" | "fountain" | "market"): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = kind === "market" ? 112 : 144;
  canvas.height = kind === "tree" ? 100 : kind === "market" ? 68 : 144;
  const c = canvas.getContext("2d");
  if (!c) return canvas;
  const r = (x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
  const disc = (cx: number, cy: number, rx: number, ry: number, color: string) => {
    for (let y = -ry; y <= ry; y++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - y * y / (ry * ry)))); r(cx - w, cy + y, w * 2 + 1, 1, color); }
  };
  if (kind === "tree") {
    r(68, 77, 9, 19, WINTER.woodDark); r(70, 77, 3, 16, WINTER.wood);
    for (let tier = 0; tier < 4; tier++) {
      const top = 9 + tier * 15, wide = 12 + tier * 9;
      for (let y = 0; y < 30; y++) {
        const w = Math.floor(wide * y / 30) + 4;
        r(72 - w, top + y, w * 2, 1, WINTER.pineDark);
        r(72 - w + 2, top + y, w * 2 - 4, 1, y < 11 ? WINTER.snow : WINTER.pine);
        if (y > 14 && y % 6 === 0) r(73 - w, top + y, w * 2 - 5, 1, WINTER.pineLight);
      }
      for (let i = 0; i < 6; i++) { const x = 72 - wide + i * wide * 2 / 5; r(Math.round(x), top + 26 + i % 2, 3, 3, i % 2 ? WINTER.red : WINTER.gold); }
    }
    r(71, 0, 3, 14, WINTER.gold); r(65, 5, 15, 3, WINTER.gold); r(68, 3, 9, 7, WINTER.gold);
  } else if (kind === "fountain") {
    disc(72, 81, 70, 53, WINTER.shadow);
    disc(72, 72, 68, 55, WINTER.stone);
    disc(72, 66, 65, 51, WINTER.stoneLight);
    disc(72, 66, 54, 41, WINTER.water);
    for (let i = 0; i < 18; i++) { const a = i * Math.PI * 2 / 18; const x = Math.round(72 + Math.cos(a) * 62), y = Math.round(66 + Math.sin(a) * 47); r(x - 3, y - 2, 7, 3, WINTER.snow); }
    for (let i = 0; i < 12; i++) r(35 + (i * 19) % 72, 47 + (i * 11) % 37, 8, 1, WINTER.waterLight);
    r(57, 55, 30, 29, WINTER.stone); r(59, 55, 26, 4, WINTER.snow); r(61, 60, 5, 22, WINTER.stoneLight);
    disc(72, 45, 20, 8, WINTER.stoneLight); disc(72, 44, 15, 5, WINTER.water);
    r(69, 22, 6, 22, WINTER.stoneLight); disc(72, 20, 9, 8, WINTER.stone); r(67, 15, 9, 3, WINTER.snow);
    for (const x of [54, 88]) { r(x, 47, 2, 24, WINTER.waterLight); r(x - 2, 68, 6, 2, WINTER.waterLight); }
  } else {
    r(0, 5, 112, 12, WINTER.woodDark); r(2, 7, 108, 8, WINTER.wood);
    for (let i = 0; i < 14; i++) { r(i * 8, 16, 8, 17, i % 2 ? WINTER.snow : WINTER.red); r(i * 8, 32, 7, 3, WINTER.gold); }
    r(4, 35, 5, 31, WINTER.woodDark); r(103, 35, 5, 31, WINTER.woodDark);
    r(8, 52, 96, 14, WINTER.wood); r(9, 52, 94, 3, WINTER.gold); r(10, 64, 92, 2, WINTER.woodDark);
    for (let i = 0; i < 7; i++) { r(17 + i * 12, 42, 9, 10, i % 2 ? WINTER.pine : WINTER.red); r(20 + i * 12, 42, 2, 10, WINTER.gold); r(17 + i * 12, 45, 9, 2, WINTER.gold); }
    r(3, 4, 106, 3, WINTER.snow);
  }
  return canvas;
}