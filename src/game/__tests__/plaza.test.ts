import { describe, expect, it } from "vitest";
import { buildCity } from "../maps/baseMaps";
import { nearbySeat, seatsFor, waterAt } from "../maps/plaza";
import { isSolidAt } from "../maps/types";
import { T } from "../maps/tiles";

describe("Christmas plaza", () => {
  const map = buildCity();
  it("has 24 usable seats around six solid picnic tables", () => {
    const seats = seatsFor(map);
    expect(seats).toHaveLength(24);
    expect(nearbySeat(seats, 920, 455)?.dir).toBe("down");
    expect(isSolidAt(map, 57, 29)).toBe(true);
    expect(isSolidAt(map, 57, 28)).toBe(false);
  });
  it("does not select an occupied chair or one out of reach", () => {
    const seat = { x: 100, y: 100, dir: "up" as const };
    expect(nearbySeat([seat], 100, 120, [{ x: 100, y: 100 }])).toBeUndefined();
    expect(nearbySeat([seat], 100, 126)).toBeUndefined();
  });
  it("allows swimming in water while preserving statue and building collision", () => {
    expect(waterAt(map, 8, 8)).toBe(true);
    expect(isSolidAt(map, 0, 0)).toBe(false);
    expect(isSolidAt(map, 73, 37)).toBe(true);
    expect(waterAt(map, map.spawn.x * 16 + 8, map.spawn.y * 16 + 8)).toBe(false);
    expect(waterAt(map, -8, 8)).toBe(false);
  });
  it("covers outdoor grass with snow and leaves the spawn and entrances accessible", () => {
    expect(map.layers.ground.filter((t) => t === T.GRASS)).toHaveLength(0);
    expect(map.layers.ground).toContain(T.SNOW);
    expect(isSolidAt(map, map.spawn.x, map.spawn.y)).toBe(false);
    expect(map.warps).toHaveLength(8);
    for (const warp of map.warps) expect(isSolidAt(map, warp.x, warp.y)).toBe(false);
  });
});