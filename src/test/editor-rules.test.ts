import { describe, expect, it } from "vitest";
import { assertEditorAdmin, propSize, validatePlayerDestination } from "@/lib/game/editor-rules";

describe("admin editing", () => {
  it("denies player dragging to non-admins", () => { expect(() => assertEditorAdmin(false)).toThrow(); expect(() => assertEditorAdmin(true)).not.toThrow(); });
  it("sizes each placed object independently", () => { const f = { w: 2, h: 3 }; expect(propSize({ display_w: 12, display_h: 8 }, f)).toEqual({ w: 12, h: 8 }); expect(propSize({}, f)).toEqual({ w: 2, h: 3 }); });
  it("keeps dragged players inside their destination map", () => { const p = { userId: "b6b5f169-8a25-4c4d-a523-84d050fee25e", mapId: "room", x: 159, y: 79 }; expect(validatePlayerDestination(p, 10, 5)).toEqual(p); expect(() => validatePlayerDestination({ ...p, x: 160 }, 10, 5)).toThrow(); expect(() => validatePlayerDestination({ ...p, y: NaN }, 10, 5)).toThrow(); });
});