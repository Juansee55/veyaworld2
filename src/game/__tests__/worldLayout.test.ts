import { describe, expect, it } from "vitest";
import { baseArea, locateOnWorld, worldLayout } from "../maps/worldLayout";
import { getMap } from "../maps";
import { BASES, FRONTIER, roomMapId } from "../bases/defs";

describe("world overview map", () => {
  it("contains the three outdoor maps without overlapping", () => {
    const { maps } = worldLayout();
    expect(maps.map((m) => m.id).sort()).toEqual(["village"]);
    for (const a of maps) for (const b of maps) {
      if (a === b) continue;
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      expect(overlap).toBe(false);
    }
  });

  it("lines up every edge warp with the warp it leads to", () => {
    const byId = Object.fromEntries(worldLayout().maps.map((m) => [m.id, m]));
    for (const p of Object.values(byId)) {
      for (const w of getMap(p.id).warps) {
        const q = byId[w.to];
        if (!q) continue;
        const back = getMap(w.to).warps.find((v) => v.to === p.id)!;
        expect(p.y + w.y).toBe(q.y + back.y);
      }
    }
  });

  it("puts players inside a base on that base's entrance", () => {
    const b = BASES[0]!;
    const spot = locateOnWorld(roomMapId(b.id, b.rooms[0]!.key), 10, 10)!;
    const a = baseArea(b.id);
    expect(spot.inside).toBe(b.name);
    expect(spot.x).toBeGreaterThanOrEqual(a.x);
    expect(spot.x).toBeLessThanOrEqual(a.x + a.w);
  });
});
