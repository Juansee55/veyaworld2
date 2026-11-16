import type * as Phaser from "phaser";
import type { AnimState, Direction, Look } from "../catalog";
import { CharacterSprite } from "./CharacterSprite";
import type { MovePacket } from "../net/WorldChannel";

interface Snapshot { t: number; x: number; y: number; dir: Direction; anim: AnimState }

const INTERP_DELAY = 140; // ms behind real time, absorbs network jitter
const STALE_MS = 1500;

/** A networked player rendered from received snapshots with buffered interpolation. */
export class RemotePlayer {
  sprite: CharacterSprite;
  private buf: Snapshot[] = [];
  sitting = false;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: Direction, look: Look, name: string) {
    this.sprite = new CharacterSprite(scene, x, y, look, name);
    this.sprite.setPose(dir, "idle");
    this.buf.push({ t: performance.now(), x, y, dir, anim: "idle" });
  }

  push(m: MovePacket) {
    this.sitting = m.sitting === true;
    const last = this.buf[this.buf.length - 1];
    if (last && Math.hypot(last.x - m.x, last.y - m.y) > 96) this.buf = []; // teleport: snap
    this.buf.push({ t: performance.now(), x: m.x, y: m.y, dir: m.dir, anim: m.anim });
    if (this.buf.length > 30) this.buf.shift();
  }

  update(now: number, delta: number) {
    const rt = now - INTERP_DELAY;
    while (this.buf.length >= 3 && this.buf[1]!.t <= rt) this.buf.shift();
    let x: number, y: number, dir: Direction, anim: AnimState;
    const a = this.buf[0], b = this.buf[1];
    if (a && b && a.t <= rt) {
      const k = Math.min(1, (rt - a.t) / Math.max(1, b.t - a.t));
      x = a.x + (b.x - a.x) * k;
      y = a.y + (b.y - a.y) * k;
      dir = b.dir;
      anim = k >= 1 && b.anim === "idle" ? "idle" : (b.anim === "walk" || a.anim === "walk" ? "walk" : "idle");
    } else {
      const s = a ?? { x: this.sprite.x, y: this.sprite.y, dir: this.sprite.dir, anim: "idle" as AnimState, t: now };
      x = s.x; y = s.y; dir = s.dir; anim = s.anim;
    }
    const last = this.buf[this.buf.length - 1];
    if (last && now - last.t > STALE_MS) anim = "idle";
    this.sprite.setPosition(Math.round(x), Math.round(y));
    this.sprite.setPose(dir, anim);
    this.sprite.tick(delta);
  }

  destroy() { this.sprite.destroy(); }
}
