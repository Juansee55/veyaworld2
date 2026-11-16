import { describe, expect, it } from "vitest";
import { BASES, CAPTURE_RADIUS, captureZone, respawnRoom, roomMapId } from "../bases/defs";
import { hasLineOfSight } from "../combat/lineOfSight";
import { getMap, hasMap } from "../maps";
import { isSolidAt } from "../maps/types";
import { fmtHs } from "@/lib/game/api";

describe("gang bases", () => {
  it("there are exactly 8 bases with unique ids", () => {
    expect(BASES).toHaveLength(8);
    expect(new Set(BASES.map((b) => b.id)).size).toBe(8);
  });
  it("every base has a reachable respawn room and a capture zone on walkable floor", () => {
    for (const b of BASES) {
      const r = respawnRoom(b);
      expect(hasMap(roomMapId(b.id, r.key))).toBe(true);
      const z = captureZone(b);
      expect(z.radius).toBe(CAPTURE_RADIUS);
      expect(isSolidAt(getMap(z.mapId), Math.floor(z.x / 16), Math.floor(z.y / 16))).toBe(false);
    }
  });
  it("bases do not share the same room layout", () => {
    const sigs = BASES.map((b) => b.rooms.map((r) => `${r.type}:${r.w}x${r.h}`).join("|"));
    expect(new Set(sigs).size).toBe(8);
  });
});

describe("combat line of sight", () => {
  it("is blocked by a wall and clear in open floor", () => {
    const m = getMap("village");
    // two points on the open stone road
    expect(hasLineOfSight("village", 24 * 16 + 8, 18 * 16 + 8, 26 * 16 + 8, 18 * 16 + 8)).toBe(true);
    let found = false;
    for (let y = 2; y < m.height - 2 && !found; y++) for (let x = 2; x < m.width - 2 && !found; x++) {
      if (isSolidAt(m, x, y) && !isSolidAt(m, x - 1, y) && !isSolidAt(m, x + 1, y)) {
        found = true;
        // chest height is 6px above the feet, so feet sit 6px lower than the tile row checked
        expect(hasLineOfSight("village", (x - 1) * 16 + 8, y * 16 + 14, (x + 1) * 16 + 8, y * 16 + 14)).toBe(false);
      }
    }
    expect(found).toBe(true);
  });
  it("rejects unknown rooms", () => {
    expect(hasLineOfSight("nowhere", 0, 0, 10, 10)).toBe(false);
  });
});

describe("gang hours format", () => {
  it("converts earned real minutes into hours and minutes", () => {
    expect(fmtHs(1)).toBe("0h 1min");
    expect(fmtHs(60)).toBe("1h 0min");
    expect(fmtHs(12000.7)).toBe("200h 0min");
  });
});
