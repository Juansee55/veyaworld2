export const AUTUMN_DROP_CHANCE = 0.27;
export function hasVisibleFirearm(id: string) { return id !== "fists" && id !== ""; }
export const AUTUMN_HAT_NAMES = ["Bellota", "Hoja dorada", "Hoja roja", "Calabaza", "Zorro", "Búho", "Erizo", "Ardilla", "Seta roja", "Seta dorada", "Corona de hojas", "Espantapájaros", "Boina del bosque", "Sombrero de cosecha", "Rama encantada", "Castaña", "Arce", "Viento otoñal"];
export const AUTUMN_HAT_IDS = AUTUMN_HAT_NAMES.map((_, i) => `hat_autumn_${i + 1}`);
export const AUTUMN_GUNS = [{ id: "gun_acorn", name: "Bellotera" }, { id: "gun_maple", name: "Arce" }] as const;
export const AUTUMN_REWARDS = [...AUTUMN_HAT_IDS, ...AUTUMN_GUNS.map((g) => g.id)];
export function dropsAutumnBag(roll: number) { return roll >= 0 && roll < AUTUMN_DROP_CHANCE; }
export function autumnReward(roll: number) { if (roll < 0 || roll >= 1) throw new Error("Invalid roll"); return AUTUMN_REWARDS[Math.floor(roll * AUTUMN_REWARDS.length)]; }
export const DEFAULT_QUICK_SLOTS = ["gun:gun_crystal", "item:bandage", "fist"];
export function normalizeQuickSlots(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_QUICK_SLOTS];
  return [typeof value[0] === "string" ? value[0] : DEFAULT_QUICK_SLOTS[0] ?? "", typeof value[1] === "string" ? value[1] : DEFAULT_QUICK_SLOTS[1] ?? "", "fist"];
}
export function assignQuickSlot(slots: string[], index: number, value: string) { const next = normalizeQuickSlots(slots); if (index === 0 || index === 1) next[index] = value; return next; }