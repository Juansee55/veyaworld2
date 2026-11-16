import { describe, expect, it } from "vitest";
import { facingFromVector, frameIndex, FRAME_H, FRAME_W, normalizeInput, sanitizeLook, swordPose, COL } from "../catalog";
import { getMap } from "../maps";
import { isSolidAt } from "../maps/types";

describe("movement", () => {
  it("diagonal input is normalized so it is not faster", () => {
    const v = normalizeInput(1, 1);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
  });
  it("facing follows the dominant axis", () => {
    expect(facingFromVector(-1, 0.2, "down")).toBe("left");
    expect(facingFromVector(0.1, -1, "left")).toBe("up");
  });
});

describe("character layers", () => {
  it("uses native Graal 32x48 grid (4 cols per direction row)", () => {
    expect(FRAME_W).toBe(32);
    expect(FRAME_H).toBe(48);
    expect(frameIndex("down", COL.IDLE)).toBe(0);
    expect(frameIndex("right", COL.WALK_B)).toBe(15);
  });
  it("swordPose sweeps clockwise with up behind the body and down in front", () => {
    expect(swordPose("up", 1)).toEqual({ orient: 0, x: 0, y: -38, behind: true });
    expect(swordPose("down", 1)).toEqual({ orient: 4, x: 0, y: -10, behind: false });
    expect(swordPose("right", 0).orient).toBe(1);
    expect(swordPose("left", 2).orient).toBe(7);
  });
  it("unknown part ids fall back to defaults", () => {
    expect(sanitizeLook({ body_id: "nope", head_id: "head_tan", hat_id: "x" })).toEqual({
      body_id: "body_tunic_blue", head_id: "head_tan", hat_id: "hat_none", melee_id: "melee_none",
    });
  });
});

describe("maps", () => {
  it("spawn points are walkable and every warp targets a walkable tile", () => {
    for (const id of ["village"]) {
      const m = getMap(id);
      expect(isSolidAt(m, m.spawn.x, m.spawn.y)).toBe(false);
      for (const w of m.warps) {
        const t = getMap(w.to);
        expect(isSolidAt(t, w.toX, w.toY)).toBe(false);
      }
    }
  });
});
