export const FIREARM_DAMAGE = 1;
export const MAGAZINE_SIZE = 12;
export const FIREARM_RANGE = 240;
export const FIREARM_COOLDOWN_MS = 300;
export type Aim = "up" | "down" | "left" | "right";
export const GUNS = [
  { id: "gun_crystal", name: "Cristal" },
  { id: "gun_pulse", name: "Pulso" },
  { id: "gun_carbine", name: "Carabina" },
] as const;
export function rayTarget(aim: Aim, x: number, y: number, targets: { user_id: string; x: number; y: number }[]) {
  const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[aim] ?? [0, 0];
  return targets.map((p) => ({ ...p, forward: (p.x - x) * (v[0] ?? 0) + (p.y - y) * (v[1] ?? 0), side: Math.abs((p.x - x) * (v[1] ?? 0) - (p.y - y) * (v[0] ?? 0)) }))
    .filter((p) => p.forward > 0 && p.forward <= FIREARM_RANGE && p.side <= 12)
    .sort((a, b) => a.forward - b.forward)[0] ?? null;
}