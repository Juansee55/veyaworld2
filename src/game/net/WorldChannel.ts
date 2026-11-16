import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { AnimState, Direction, Look } from "../catalog";

export interface PresenceMeta extends Look {
  id: string;
  username: string;
  x: number;
  y: number;
  dir: Direction;
  gang_id: string | null;
  tag: string | null;
}

export interface SwingPacket { id: string; dir: Direction; firearm?: boolean }
export interface HpPacket { id: string; hp: number; max: number; prot?: number }

export interface MovePacket {
  id: string;
  x: number;
  y: number;
  dir: Direction;
  anim: AnimState;
  sitting?: boolean;
}

export interface WorldChannelHandlers {
  onJoin(p: PresenceMeta): void;
  onLeave(id: string): void;
  onUpdateMeta(p: PresenceMeta): void;
  onMove(m: MovePacket): void;
  onSwing(s: SwingPacket): void;
  onHp(h: HpPacket): void;
  onStatus(status: "connecting" | "online" | "offline"): void;
}

/**
 * One realtime room per map.
 * - Presence: who is online (join/leave + customization).
 * - Broadcast "move": high-frequency position/facing/animation updates.
 */
export class WorldChannel {
  private channel: RealtimeChannel;
  private known = new Map<string, PresenceMeta>();
  private closed = false;

  constructor(private sb: SupabaseClient, mapId: string, private self: PresenceMeta, private h: WorldChannelHandlers) {
    h.onStatus("connecting");
    this.channel = sb.channel(`veya-world-${mapId}`, {
      config: { broadcast: { self: false, ack: false }, presence: { key: self.id } },
    });
    this.channel
      .on("presence", { event: "sync" }, () => this.sync())
      .on("broadcast", { event: "move" }, ({ payload }) => {
        const m = payload as MovePacket;
        if (m && typeof m.id === "string" && m.id !== this.self.id) h.onMove(m);
      })
      .on("broadcast", { event: "swing" }, ({ payload }) => {
        const p = payload as SwingPacket;
        if (p && typeof p.id === "string" && p.id !== this.self.id) h.onSwing(p);
      })
      .on("broadcast", { event: "hp" }, ({ payload }) => {
        const p = payload as HpPacket;
        if (p && typeof p.id === "string" && typeof p.hp === "number") h.onHp(p);
      })
      .subscribe(async (status) => {
        if (this.closed) return;
        if (status === "SUBSCRIBED") {
          await this.channel.track(this.self);
          h.onStatus("online");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          h.onStatus("offline");
        }
      });
  }

  get onlineCount() { return this.known.size + 1; }

  private sync() {
    const state = this.channel.presenceState<PresenceMeta>();
    const seen = new Set<string>();
    for (const [key, metas] of Object.entries(state)) {
      if (key === this.self.id || !metas.length) continue;
      const meta = metas[metas.length - 1] as PresenceMeta | undefined;
      if (!meta) continue;
      seen.add(key);
      const prev = this.known.get(key);
      this.known.set(key, meta);
      if (!prev) this.h.onJoin(meta);
      else if (prev.body_id !== meta.body_id || prev.head_id !== meta.head_id || prev.hat_id !== meta.hat_id || prev.melee_id !== meta.melee_id || prev.username !== meta.username || prev.tag !== meta.tag || prev.gang_id !== meta.gang_id) {
        this.h.onUpdateMeta(meta);
      }
    }
    for (const id of [...this.known.keys()]) {
      if (!seen.has(id)) { this.known.delete(id); this.h.onLeave(id); }
    }
  }

  getMeta(id: string) { return this.known.get(id); }

  sendMove(m: MovePacket) {
    if (this.closed) return;
    void this.channel.send({ type: "broadcast", event: "move", payload: m });
  }

  sendSwing(p: SwingPacket) {
    if (!this.closed) void this.channel.send({ type: "broadcast", event: "swing", payload: p });
  }
  sendHp(p: HpPacket) {
    if (!this.closed) void this.channel.send({ type: "broadcast", event: "hp", payload: p });
  }

  async updateSelf(patch: Partial<PresenceMeta>) {
    this.self = { ...this.self, ...patch };
    if (!this.closed) await this.channel.track(this.self);
  }

  destroy() {
    this.closed = true;
    void this.channel.untrack().catch(() => {});
    void this.sb.removeChannel(this.channel);
  }
}
