import { describe, expect, it } from "vitest";
import { PLAYER_MAX_HP, QUICK_SLOT_COUNT, earnedBaseMinutes, cameraZoom, firearmPose } from "@/lib/game/play-rules";
describe("game rules", () => {
  it("full player health is 50/50", () => expect(PLAYER_MAX_HP).toBe(50));
  it("each base awards one minute only after a real minute", () => { expect(earnedBaseMinutes(59999, 1)).toBe(0); expect(earnedBaseMinutes(60000, 1)).toBe(1); expect(earnedBaseMinutes(120000, 3)).toBe(6); });
  it("provides three inventory presets", () => expect(QUICK_SLOT_COUNT).toBe(3));
  it("zoom retains fractional gesture changes and stays bounded", () => { expect(cameraZoom(3, 1.1)).toBeCloseTo(3.3); expect(cameraZoom(8, 2)).toBe(8); });
  it("recoil returns to rest in every direction", () => { for (const dir of ["up", "down", "left", "right"] as const) { const start = firearmPose(dir, 1000, false, 1000), end = firearmPose(dir, 1000, false, 0); expect(Math.hypot(start.x - end.x, start.y - end.y)).toBe(3); } });
});