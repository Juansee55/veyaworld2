// Pure data + helpers shared by the game engine and React UI (SSR-safe: no browser APIs).
import { AUTUMN_HAT_IDS, AUTUMN_HAT_NAMES } from "@/lib/game/autumn-rules";

export type Direction = "down" | "up" | "left" | "right";
export type AnimState = "idle" | "walk";
export type PreviewAnim = "idle" | "walk" | "sword" | "sit" | "swim";

export interface Look {
  body_id: string;
  head_id: string;
  hat_id: string;
  melee_id: string;
}

export interface MeleePart { id: string; label: string }

export interface BodyPart {
  id: string;
  label: string;
  kind: "tunic" | "robe" | "armor";
  shirt: string;
  pants: string;
  shoes: string;
  trim: string;
}
export interface HeadPart {
  id: string;
  label: string;
  skin: string;
  hair: string;
  style: "short" | "long" | "spiky";
}
export interface HatPart {
  id: string;
  label: string;
  kind: "none" | "cap" | "wizard" | "crown" | "bandana" | "straw";
  color: string;
}

export const BODIES: BodyPart[] = [
  { id: "body_tunic_blue", label: "Blue tunic", kind: "tunic", shirt: "#3b6fd1", pants: "#4a3a2a", shoes: "#2a1e14", trim: "#e8c35a" },
  { id: "body_tunic_red", label: "Red tunic", kind: "tunic", shirt: "#c4473a", pants: "#3a3a4a", shoes: "#241a14", trim: "#f0d890" },
  { id: "body_robe_green", label: "Forest robe", kind: "robe", shirt: "#2f8a52", pants: "#1f5c36", shoes: "#3a2a1a", trim: "#d9c06a" },
  { id: "body_armor", label: "Iron armor", kind: "armor", shirt: "#9aa3ad", pants: "#5a616a", shoes: "#33373d", trim: "#d04a4a" },
  ...Array.from({ length: 6 }, (_, i): BodyPart => ({ id: `upload_body_${i + 1}`, label: `Upload ${i + 1}`, kind: "tunic", shirt: "#3b6fd1", pants: "#4a3a2a", shoes: "#2a1e14", trim: "#e8c35a" })),
];

export const HEADS: HeadPart[] = [
  { id: "head_light", label: "Brown hair", skin: "#f1c7a0", hair: "#6b3e1f", style: "short" },
  { id: "head_tan", label: "Black hair", skin: "#d39a6a", hair: "#1f1a24", style: "spiky" },
  { id: "head_dark", label: "Silver hair", skin: "#8a5a3a", hair: "#d8d8e8", style: "long" },
  { id: "head_blonde", label: "Golden hair", skin: "#f5d2b0", hair: "#e8b83a", style: "long" },
  { id: "head_ginger", label: "Ginger hair", skin: "#f0c0a0", hair: "#c8582a", style: "spiky" },
  { id: "upload_head_1", label: "Upload head 1", skin: "#f1c7a0", hair: "#6b3e1f", style: "short" },
  { id: "upload_head_2", label: "Upload head 2", skin: "#f1c7a0", hair: "#6b3e1f", style: "short" },
];

export const HATS: HatPart[] = [
  { id: "hat_none", label: "No hat", kind: "none", color: "#000000" },
  { id: "hat_cap_red", label: "Red cap", kind: "cap", color: "#d04040" },
  { id: "hat_wizard", label: "Wizard hat", kind: "wizard", color: "#4a3a9a" },
  { id: "hat_crown", label: "Crown", kind: "crown", color: "#f2c14e" },
  { id: "hat_bandana", label: "Bandana", kind: "bandana", color: "#2f9e6e" },
  { id: "hat_straw", label: "Straw hat", kind: "straw", color: "#e2c16b" },
  { id: "hat_shadow_helm", label: "Shadow helm", kind: "none", color: "#000000" },
  ...AUTUMN_HAT_IDS.map((id, i): HatPart => ({ id, label: AUTUMN_HAT_NAMES[i] ?? id, kind: "none", color: "#d98b32" })),
];

/** Melee skins are shown while swinging; combat stats come from the equipped weapon. */
export const MELEES: MeleePart[] = [
  { id: "melee_none", label: "Fists" },
  { id: "melee_violet_knife", label: "Violet knife" },
  { id: "melee_jade_kunai", label: "Jade kunai" },
  { id: "melee_moon_staff", label: "Moon staff" },
  { id: "melee_void_blade", label: "Void blade" },
];

/** Player-uploaded parts use `custom:<player_art id>`. */
export const CUSTOM_PART = /^custom:[0-9a-f-]{36}$/;
export const isCustomPart = (id: string) => CUSTOM_PART.test(id);

export const DEFAULT_LOOK: Look = { body_id: "body_tunic_blue", head_id: "head_light", hat_id: "hat_none", melee_id: "melee_none" };

export const DIRECTIONS: Direction[] = ["down", "up", "left", "right"];

/** Every character layer sheet shares this layout: 4 columns x 4 direction rows at native Graal 32×48 scale. */
export const FRAME_W = 32;
export const FRAME_H = 48;
export const FRAME_COLS = 4;
export const COL = { IDLE: 0, BREATHE: 1, WALK_A: 2, WALK_B: 3 } as const;
export const WALK_SEQUENCE = [COL.WALK_A, COL.IDLE, COL.WALK_B, COL.IDLE];
export const IDLE_SEQUENCE = [COL.IDLE, COL.BREATHE];

export function frameIndex(dir: Direction, col: number): number {
  return DIRECTIONS.indexOf(dir) * FRAME_COLS + col;
}

const MELEE_BASE_ORIENT: Record<Direction, number> = { up: 0, right: 2, down: 4, left: 6 };

/** Shared sword.gani swing pose (relative to character feet at 0,0) used by Phaser and canvas previews. */
export function swordPose(dir: Direction, step: 0 | 1 | 2): { orient: number; x: number; y: number; behind: boolean } {
  const stepOffset = step - 1;
  const orient = (MELEE_BASE_ORIENT[dir] + stepOffset + 8) % 8;
  switch (dir) {
    case "down":
      return { orient, x: stepOffset === 0 ? 0 : -stepOffset * 10, y: -14 + (step === 1 ? 4 : 0), behind: false };
    case "up":
      return { orient, x: stepOffset * 10, y: -34 - (step === 1 ? 4 : 0), behind: true };
    case "left":
      return { orient, x: -18 - (step === 1 ? 4 : 0), y: -24 - stepOffset * 8, behind: false };
    case "right":
      return { orient, x: 18 + (step === 1 ? 4 : 0), y: -24 + stepOffset * 8, behind: false };
  }
}

/** Facing for 8-way movement: dominant axis wins; exact diagonals keep the current facing if it matches. */
export function facingFromVector(vx: number, vy: number, current: Direction): Direction {
  if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) return current;
  const ax = Math.abs(vx);
  const ay = Math.abs(vy);
  if (Math.abs(ax - ay) < 0.05) {
    const h: Direction = vx < 0 ? "left" : "right";
    const v: Direction = vy < 0 ? "up" : "down";
    if (current === h || current === v) return current;
    return v;
  }
  if (ax > ay) return vx < 0 ? "left" : "right";
  return vy < 0 ? "up" : "down";
}

/** Normalize joystick/keyboard input so diagonals are not faster than straight movement. */
export function normalizeInput(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y);
  if (len < 0.15) return { x: 0, y: 0 };
  if (len > 1) return { x: x / len, y: y / len };
  return { x, y };
}

export function sanitizeLook(look: Partial<Look> | null | undefined): Look {
  const pick = (list: { id: string }[], v: unknown, d: string) =>
    typeof v === "string" && (CUSTOM_PART.test(v) || list.some((i) => i.id === v)) ? v : d;
  return {
    body_id: pick(BODIES, look?.body_id, DEFAULT_LOOK.body_id),
    head_id: pick(HEADS, look?.head_id, DEFAULT_LOOK.head_id),
    hat_id: pick(HATS, look?.hat_id, DEFAULT_LOOK.hat_id),
    melee_id: pick(MELEES, look?.melee_id, DEFAULT_LOOK.melee_id),
  };
}

export function isDirection(v: unknown): v is Direction {
  return typeof v === "string" && (DIRECTIONS as string[]).includes(v);
}

export function sanitizeUsername(name: string): string {
  return name.trim().replace(/[^\p{L}\p{N}_ .-]/gu, "").slice(0, 16);
}
