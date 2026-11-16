import { describe, expect, it } from "vitest";
import { fitHat, fixedGraalHatTransform } from "../art/hatFit";
import { GRAAL_HAT_CELL, GRAAL_MELEE_CELL, sourceCell } from "../art/layout";

describe("hat attachment", () => {
  it("uses fixed 1:1 Graal placement with zero per-cell auto-trimming or rescaling", () => {
    expect(fixedGraalHatTransform()).toEqual({ scale: 1, x: 0, y: 0 });
    expect(fixedGraalHatTransform(-2)).toEqual({ scale: 1, x: 0, y: -2 });
  });
  it("keeps the original cap seated on a standard head", () => {
    expect(fitHat({ x: 3, y: 3, w: 10, h: 10 }, { x: 3, y: 1, w: 10, h: 5 }, "procedural")).toEqual({ scale: 1, x: 0, y: 0 });
  });
  it("follows the head when the breathing frame moves down", () => {
    const hat = { x: 0, y: 0, w: 16, h: 13 };
    const idle = fitHat({ x: 3, y: 3, w: 10, h: 10 }, hat, "custom");
    const breathe = fitHat({ x: 3, y: 4, w: 10, h: 10 }, hat, "custom");
    expect(breathe.y - idle.y).toBe(1);
  });
  it("centers a helmet over the head and seats it at the jaw", () => {
    const fit = fitHat({ x: 3, y: 3, w: 10, h: 10 }, { x: 1, y: 0, w: 22, h: 24 }, "helmet");
    expect(fit.x + 12 * fit.scale).toBe(8);
    expect(fit.y + 24 * fit.scale).toBe(14);
    expect(22 * fit.scale).toBe(14);
  });
});

describe("Graal hat cropping and native cells", () => {
  it("uses native 64x64 hat cells and 48x48 melee cells", () => {
    expect(GRAAL_HAT_CELL).toBe(64);
    expect(GRAAL_MELEE_CELL).toBe(48);
  });
  it("uses hat direction rows rather than head direction rows", () => {
    expect([0, 1, 2, 3].map((row) => sourceCell("graal-hat", row, 0, 96, 128).y)).toEqual([0, 64, 32, 96]);
  });
  it("keeps all three animation columns inside the 96×128 template", () => {
    expect([0, 1, 2, 3].map((col) => sourceCell("graal-hat", 0, col, 96, 128).x)).toEqual([0, 0, 32, 64]);
    expect(sourceCell("graal-hat", 3, 3, 96, 128)).toEqual({ x: 64, y: 96, w: 32, h: 32 });
  });
  it("supports four-column hat sheets at larger resolutions", () => {
    expect(sourceCell("graal-hat", 1, 3, 256, 256)).toEqual({ x: 192, y: 128, w: 64, h: 64 });
  });
});