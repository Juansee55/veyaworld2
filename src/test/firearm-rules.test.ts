import { describe, expect, it } from "vitest";
import { FIREARM_DAMAGE, MAGAZINE_SIZE, rayTarget } from "@/lib/game/firearm-rules";
describe("firearms", () => {
  it("all firearms deal exactly one damage", () => expect(FIREARM_DAMAGE).toBe(1));
  it("all firearms have exactly twelve rounds", () => expect(MAGAZINE_SIZE).toBe(12));
  it("hits the nearest player ahead, not beside or behind", () => {
    expect(rayTarget("right", 0, 0, [{ user_id: "behind", x: -2, y: 0 }, { user_id: "side", x: 10, y: 20 }, { user_id: "far", x: 200, y: 0 }, { user_id: "near", x: 40, y: 0 }])?.user_id).toBe("near");
  });
  it("misses when the player is outside firearm range", () => expect(rayTarget("up", 0, 0, [{ user_id: "far", x: 0, y: -241 }])).toBeNull());
});