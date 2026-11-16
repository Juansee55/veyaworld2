import { describe, expect, it } from "vitest";
import { assignQuickSlot, normalizeQuickSlots, dropsAutumnBag, autumnReward, AUTUMN_HAT_IDS, AUTUMN_GUNS } from "@/lib/game/autumn-rules";
import { hasVisibleFirearm } from "@/lib/game/autumn-rules";
describe("autumn event", () => {
  it("hides the equipped weapon when selecting fists and shows guns when re-equipped", () => { expect(hasVisibleFirearm("fists")).toBe(false); expect(hasVisibleFirearm("gun_acorn")).toBe(true); expect(hasVisibleFirearm("gun_maple")).toBe(true); });
  it("drops bags on exactly 27 of 100 equal probability outcomes", () => expect(Array.from({length:100}, (_, i) => dropsAutumnBag(i / 100)).filter(Boolean)).toHaveLength(27));
  it("has exactly 18 autumn hats", () => expect(new Set(AUTUMN_HAT_IDS).size).toBe(18));
  it("includes two new weapon rewards", () => { expect(AUTUMN_GUNS.map(g => g.id)).toEqual(["gun_acorn", "gun_maple"]); expect(autumnReward(0.9)).toBe("gun_acorn"); expect(autumnReward(0.999)).toBe("gun_maple"); });
  it("keeps preset three as a fist even after assignment or tampered storage", () => { expect(assignQuickSlot(["gun:gun_maple", "item:bandage", "fist"], 2, "gun:gun_crystal")[2]).toBe("fist"); expect(normalizeQuickSlots(["a", "b", "hacked"])[2]).toBe("fist"); });
  it("preserves old assignments and allows changing only the first two", () => { expect(normalizeQuickSlots(["a", "b"])).toEqual(["a", "b", "fist"]); expect(assignQuickSlot(["a", "b", "fist"], 1, "c")).toEqual(["a", "c", "fist"]); });
});