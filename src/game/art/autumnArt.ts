import { AUTUMN_HAT_IDS } from "@/lib/game/autumn-rules";
import { DIRECTIONS } from "../catalog";

// Small pixel-art silhouettes, not recolored copies: each reward has its own motif.
const motifs = [
  ["....gg....", "...bbbb...", "..bbbbbb..", "...aaaa...", "....aa...."],
  [".....a....", "..a.aaa...", "...aaaaaa.", "..aaaaaa..", ".....b...."],
  ["..a..a..a.", "...aaaaa..", ".aaaaaaaa.", "...aaaa...", ".....b...."],
  ["....gg....", "..aaaaaa..", ".abababaa.", ".aaaaaaaa.", "..aaaaaa.."],
  ["a......a..", "aa....aa..", "aaaaaaaa..", "aawwwwaa..", "..wwww...."],
  ["a......a..", "aaaaaaaa..", "awwaawwa..", "awbaabwa..", "...aa....."],
  ["..b.b.b...", ".bbbbbbbb.", "bbbbbbbaa.", "..aaaaaaa.", "....a....."],
  ["bb....bb..", "bbb..bbb..", "aaaaaaaa..", "awaaaawa..", "...bb....."],
  ["...aaaa...", "..awawaa..", ".aaawaaaa.", "...wwww...", "...wwww..."],
  ["...aaaa...", "..ababaa..", ".aaaaabaa.", "....ww....", "....ww...."],
  ["a..g..a..g", "aaaggaaagg", ".aaggaaag.", "..bbbbbb..", "..aaaaaa.."],
  ["...bbbb...", "..aaaaaa..", ".aaaaaaaa.", "bbbbbbbbbb", "....gg...."],
  ["...gggg...", "..aaaaaaa.", ".aaaaaaaa.", "..bbbbbb..", "...aa....."],
  ["...aaaa...", "..aaaaaa..", "..bbbbbb..", "aaaaaaaaaa", ".aaaaaaaa."],
  ["a......g..", ".b....b...", "..b..b.a..", "...bb.b...", "....bb...."],
  ["...bbbb...", "..baaaab..", ".baaaaaab.", "..aaaaaa..", "...aaaa..."],
  ["....a.....", "a..aaa..a.", ".aaaaaaa..", "..aaaaa...", "....b....."],
  ["aa....aa..", "..aaa...aa", "aaaaaaa...", "...aaaaaaa", "aa....aa.."],
];
const palettes = ["#bf8a42", "#efbd43", "#d84336", "#e98028", "#e29545", "#956853", "#b78655", "#ce7740", "#d24a37", "#e8b648", "#cf842f", "#d5a154", "#81954a", "#dcb567", "#9e733e", "#ba6f38", "#d94f33", "#dfa636"];
export function autumnHatSheets() {
  return AUTUMN_HAT_IDS.map((id, i) => {
    const canvas = document.createElement("canvas"); canvas.width = 128; canvas.height = 192;
    const ctx = canvas.getContext("2d");
    if (ctx) DIRECTIONS.forEach((dir, row) => {
      for (let col = 0; col < 4; col++) {
        const dy = col === 1 ? 1 : 0;
        (motifs[i] ?? []).forEach((line, y) => [...line].forEach((pixel, x) => {
          if (pixel === ".") return;
          ctx.fillStyle = pixel === "a" ? palettes[i] ?? "#d98b32" : pixel === "b" ? "#654339" : pixel === "g" ? "#729349" : "#f2deae";
          ctx.fillRect(col * 32 + (dir === "right" ? 24 - x * 2 : x * 2 + 6), row * 48 + y * 2 + dy, 2, 2);
        }));
      }
    });
    return { id, canvas };
  });
}
export function autumnTreeCanvas() {
  const c = document.createElement("canvas"); c.width = 48; c.height = 56;
  const x = c.getContext("2d"); if (!x) return c;
  x.fillStyle = "#513d35"; x.fillRect(21, 26, 7, 28); x.fillRect(14, 32, 10, 4); x.fillRect(25, 28, 10, 4);
  for (const [cx, cy, color] of [[12, 18, "#c34b34"], [27, 10, "#efb33c"], [35, 23, "#dd772d"], [19, 28, "#e99635"]] as const) {
    x.fillStyle = "#713e32"; x.fillRect(cx - 10, cy - 8, 22, 18);
    x.fillStyle = color; x.fillRect(cx - 8, cy - 9, 17, 20); x.fillRect(cx - 11, cy - 5, 23, 12);
    x.fillStyle = "#f5ce63"; x.fillRect(cx - 5, cy - 5, 4, 2);
  }
  x.fillStyle = "#c67b39"; x.fillRect(6, 51, 4, 2); x.fillRect(34, 53, 5, 2);
  return c;
}