import { describe, expect, it } from "vitest";
import { boundedCrop, tileCrop } from "@/lib/game/art-crop";
import { sourceCell } from "@/game/art/layout";
describe("precise art crops", () => {
  it("keeps the partial 16×16 tileset edge unscaled", () => {
    expect(tileCrop(5, 33, 19)).toEqual({ x: 32, y: 16, w: 1, h: 3 });
  });
  it("clips a manually chosen crop to the source", () => {
    expect(boundedCrop({ x: 30, y: -2, w: 20, h: 12 }, 33, 19)).toEqual({ x: 30, y: 0, w: 3, h: 12 });
  });
  it("uses explicitly selected hat columns rather than aspect ratio", () => {
    expect(sourceCell("graal-hat", 1, 3, 120, 80, 3)).toEqual({ x: 80, y: 40, w: 40, h: 20 });
    expect(sourceCell("graal-hat", 1, 3, 120, 80, 4)).toEqual({ x: 90, y: 40, w: 30, h: 20 });
  });
});