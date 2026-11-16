export const PLAYER_MAX_HP = 50;
export const QUICK_SLOT_COUNT = 3;
export function earnedBaseMinutes(elapsedMs: number, ownedBases: number) {
  return Math.floor(Math.max(0, elapsedMs) / 60_000) * Math.max(0, Math.floor(ownedBases));
}
export function cameraZoom(base: number, factor: number) {
  return Math.max(0.5, Math.min(8, base * factor));
}
export function firearmPose(dir: "up" | "down" | "left" | "right", clock: number, walking: boolean, shotAt: number, reloadUntil = 0) {
  const v = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[dir];
  const recoil = Math.max(0, 1 - (clock - shotAt) / 160) * 4;
  const bob = walking ? Math.sin(clock / 100) * 1.5 : Math.sin(clock / 500) * 0.4;
  const loading = reloadUntil > clock ? Math.sin((reloadUntil - clock) / 1200 * Math.PI) * 30 : 0;
  return { x: (dir === "left" ? -16 : dir === "up" ? -10 : 16) - v.x * recoil, y: (dir === "up" ? -28 : -18) + bob - v.y * recoil, angle: { right: 0, down: 90, left: 180, up: -90 }[dir] + loading, v };
}