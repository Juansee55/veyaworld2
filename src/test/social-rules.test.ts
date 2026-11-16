import { expect, it } from "vitest";
import { validateNews, validateStatus } from "@/lib/game/social-rules";
it("only administrators can publish news", () => { expect(() => validateNews("Evento", "Comienza hoy", false)).toThrow(); expect(validateNews("Evento", "Comienza hoy", true)).toEqual({ title: "Evento", body: "Comienza hoy" }); });
it("accepts a profile status up to 280 characters", () => { expect(validateStatus("a".repeat(280)).length).toBe(280); expect(() => validateStatus("a".repeat(281))).toThrow(); });