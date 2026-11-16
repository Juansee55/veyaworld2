import { describe, expect, it } from "vitest";
import { validateWorldArt } from "@/lib/game/world-art-rules";
describe("world editor images", () => {
  it("accepts a horizontal strip of 16×16 tiles", () => { expect(validateWorldArt("tileset", 64, 16).count).toBe(4); });
  it("accepts vertical and multi-row tilesets", () => { expect(validateWorldArt("tileset", 16, 64).count).toBe(4); });
  it("accepts arbitrary dimensions including partial edge tiles", () => { expect(validateWorldArt("tileset", 33, 19).count).toBe(6); });
  it("removes the old maximum image dimensions", () => { expect(validateWorldArt("tileset", 16384, 32).count).toBe(2048); expect(validateWorldArt("object", 20000, 12345).height).toBe(12345); });
  it("rejects invalid dimensions", () => { expect(() => validateWorldArt("object", 0, 16)).toThrow(); });
  it("accepts objects aligned to the tile grid", () => { expect(validateWorldArt("object", 32, 48)).toEqual({ width: 32, height: 48, count: 2 }); });
});