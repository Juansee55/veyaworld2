import * as Phaser from "phaser";
import { referencedAssets, worldImage } from "../editor/worldArtCache";
import { tileCrop } from "@/lib/game/art-crop";
import { propSize } from "@/lib/game/editor-rules";
import { supabase } from "@/integrations/supabase/client";
import { facingFromVector, normalizeInput, type AnimState, type Direction, type Look } from "../catalog";
import { ensureLayerTexture, layerKeys } from "../art/layers";
import { buildTilesetCanvas } from "../art/tilesetArt";
import { CharacterSprite } from "../character/CharacterSprite";
import { RemotePlayer } from "../character/RemotePlayer";
import { joystick } from "../input";
import { getMap } from "../maps";
import { SOLID_TILES, TILE } from "../maps/tiles";
import { isSolidAt, LAYERS, type MapDef, type Warp } from "../maps/types";
import { WorldChannel, type PresenceMeta } from "../net/WorldChannel";
import { BASES, captureZone } from "../bases/defs";
import { loadMapExtras, takeInitialExtras, registerCustomMap, type MapExtras, type TileRow, type WorldMapRow } from "../editor/worldData";
import { DEFAULT_LOOK, sanitizeLook } from "../catalog";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Aim } from "@/lib/game/firearm-rules";
import type { ShotResult } from "@/lib/game/firearms.functions";
import { cameraZoom } from "@/lib/game/play-rules";
import { autumnTreeCanvas } from "../art/autumnArt";
import { notify } from "@/lib/game/notify";
import { nearbySeat, seatsFor, waterAt, type Seat } from "../maps/plaza";
import { christmasCanvas } from "../art/christmasArt";

export interface HudState { mapName?: string; mapId?: string; online?: number; status?: "connecting" | "online" | "offline"; seatAction?: "sit" | "stand" | null }

export interface GangInfo { gangId: string | null; tag: string | null; friendly: string[] }
export interface AttackResult { damage: number; hp: number; max_hp: number; killed: boolean }
export type ZoneStatus = "idle" | "attacking" | "repairing" | "contested" | "captured";

export interface AdminFx { title: string | null; title_color: string; invisible: boolean; fly: boolean; noclip: boolean; size: number; speed: number }

export interface GameContext {
  /** Admin effects per user id (from the server), and whether I am an admin. */
  admin: Record<string, AdminFx>;
  isAdmin: boolean;
  userId: string;
  username: string;
  look: Look;
  gang: GangInfo;
  zones: Record<string, { status: ZoneStatus; friendly: boolean }>;
  myHp: { hp: number; max: number; prot: number };
  onHud: (h: HudState) => void;
  attack: (targetId: string) => Promise<AttackResult>;
  shoot: (aim: Aim) => Promise<ShotResult>;
  firearms: Record<string, string>;
  onAutumnChange: () => void;
}

export interface WorldSnapshot { mapId: string; x: number; y: number; players: { id: string; x: number; y: number; gangId: string | null }[] }

export interface WorldSceneData { mapId: string; x?: number; y?: number; dir?: Direction }

const SPEED = 72; // px/s
const SEND_INTERVAL = 100; // ms while moving (10 Hz)
const HEARTBEAT = 1000; // ms while idle
const SAVE_INTERVAL = 5000;

export function computeZoom(w: number, h: number) {
  return Math.max(2, Math.min(5, Math.round(Math.min(w, h) / 200)));
}

export class WorldScene extends Phaser.Scene {
  private map!: MapDef;
  private me!: CharacterSprite;
  private feet!: Phaser.GameObjects.Zone;
  private net!: WorldChannel;
  private remotes = new Map<string, RemotePlayer>();
  private keys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; UP: Phaser.Input.Keyboard.Key; DOWN: Phaser.Input.Keyboard.Key; LEFT: Phaser.Input.Keyboard.Key; RIGHT: Phaser.Input.Keyboard.Key };
  private dir: Direction = "down";
  private anim: AnimState = "idle";
  private lastSent = 0;
  private lastSentState = "";
  private lastSave = 0;
  private warping = false;
  private lastReport = 0;
  private lastTick = 0;
  private zoneGfx?: Phaser.GameObjects.Graphics;
  private zoneBaseId: string | undefined;
  private attacking = false;
  private wallCollider?: Phaser.Physics.Arcade.Collider;
  private propCollider?: Phaser.Physics.Arcade.Collider;
  private tileLayers!: Record<"ground" | "decor" | "objects" | "above", Phaser.Tilemaps.TilemapLayer>;
  private extras: MapExtras = { tiles: [], warps: [], npcs: [], props: [], furniture: [], assets: [] };
  private extraObjs: Phaser.GameObjects.GameObject[] = [];
  private npcs: { s: CharacterSprite; x: number; y: number; dialog: string; last: number }[] = [];
  private propBodies?: Phaser.Physics.Arcade.StaticGroup;
  private editCh: RealtimeChannel | undefined;
  private reloadTimer?: Phaser.Time.TimerEvent;
  private editGfx: Phaser.GameObjects.Graphics | undefined;
  private zoomFactor = 1;
  private autumnTrees: { id: string; x: number; y: number; image: Phaser.GameObjects.Image }[] = [];
  private seats: Seat[] = [];
  private sitting: Seat | undefined;
  private seatAction: "sit" | "stand" | null = null;

  constructor() { super("world"); }

  private get ctx(): GameContext { return this.registry.get("ctx") as GameContext; }

  create(data: WorldSceneData) {
    this.ensureTextures();
    this.map = getMap(data.mapId);
    this.sitting = undefined;
    this.seatAction = null;
    this.seats = seatsFor(this.map);
    this.warping = false;
    this.remotes = new Map();

    // ---- tilemap (4 layers) ----
    const tm = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: this.map.width, height: this.map.height });
    const ts = tm.addTilesetImage("veya-tiles", "tileset", TILE, TILE, 0, 0)!;
    const layers = {} as Record<"ground" | "decor" | "objects" | "above", Phaser.Tilemaps.TilemapLayer>;
    LAYERS.forEach((name, i) => {
      const layer = tm.createBlankLayer(name, ts)!;
      const flat = this.map.layers[name];
      const rows: number[][] = [];
      for (let y = 0; y < this.map.height; y++) rows.push(flat.slice(y * this.map.width, (y + 1) * this.map.width).map((t) => (t === 0 ? -1 : t)));
      layer.putTilesAt(rows, 0, 0);
      layer.setDepth(name === "above" ? 100000 : i);
      if (name === "ground" || name === "objects") layer.setCollision(SOLID_TILES);
      layers[name] = layer;
    });

    this.tileLayers = layers;
    this.drawChristmasPlaza();
    this.propBodies = this.physics.add.staticGroup();
    this.extras = { tiles: [], warps: [], npcs: [], props: [], furniture: [], assets: [] };
    this.extraObjs = []; this.npcs = [];
    void this.reloadExtras();
    this.subscribeEdits();
    this.autumnTrees = [];
    void this.loadAutumnTrees();

    const worldW = this.map.width * TILE, worldH = this.map.height * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // ---- local player ----
    let sx = data.x ?? (this.map.spawn.x * TILE + 8);
    let sy = data.y ?? (this.map.spawn.y * TILE + 8);
    if (isSolidAt(this.map, Math.floor(sx / TILE), Math.floor((sy - 3) / TILE))) {
      sx = this.map.spawn.x * TILE + 8; sy = this.map.spawn.y * TILE + 8;
    }
    this.dir = data.dir ?? "down";
    this.feet = this.add.zone(sx, sy - 3, 10, 6);
    this.physics.add.existing(this.feet);
    const body = this.feet.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    this.wallCollider = this.physics.add.collider(this.feet, [layers.ground, layers.objects]);
    this.propCollider = this.physics.add.collider(this.feet, this.propBodies);

    this.me = new CharacterSprite(this, sx, sy, this.ctx.look, this.labelFor(this.ctx.username, this.ctx.gang.tag), true);
    this.me.setPose(this.dir, "idle");
    this.me.setHp(this.ctx.myHp.hp, this.ctx.myHp.max);
    this.me.setProtected(this.ctx.myHp.prot);
    this.applyFx(this.ctx.userId);

    // ---- capture zone (painted on the floor of the base HQ room) ----
    const zb = BASES.find((b) => captureZone(b).mapId === this.map.id);
    this.zoneBaseId = zb?.id;
    if (zb) { this.zoneGfx = this.add.graphics().setDepth(2.5); this.drawZone(); }
    this.lastReport = 0;

    // ---- camera ----
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.setRoundPixels(true);
    cam.startFollow(this.me, true, 1, 1);
    this.applyZoom(this.scale.width, this.scale.height);
    this.scale.on("resize", this.onResize, this);

    // ---- keyboard ----
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT", false) as WorldScene["keys"];
    kb.disableGlobalCapture();

    // ---- network ----
    this.ctx.onHud({ mapName: this.map.name, mapId: this.map.id, online: 1, seatAction: null });
    void supabase.rpc("report_state", { _map: this.map.id, _x: sx, _y: sy }).then(() => undefined);
    this.net = new WorldChannel(supabase, this.map.id, this.selfMeta(), {
      onStatus: (status) => this.ctx.onHud({ status }),
      onJoin: (p) => { this.spawnRemote(p); this.ctx.onHud({ online: this.net.onlineCount }); this.lastSentState = ""; },
      onLeave: (id) => { this.remotes.get(id)?.destroy(); this.remotes.delete(id); this.ctx.onHud({ online: this.net.onlineCount }); },
      onUpdateMeta: (p) => { const r = this.remotes.get(p.id); r?.sprite.setLook(p); this.styleRemote(p); },
      onSwing: (p) => { const r = this.remotes.get(p.id); if (r) { r.sprite.dir = p.dir; if (p.firearm) r.sprite.shoot(); else r.sprite.swing(); } },
      onHp: (h) => {
        if (h.id === this.ctx.userId) return; // own HP comes from the server row
        const r = this.remotes.get(h.id); if (!r) return;
        r.sprite.setHp(h.hp, h.max);
        if (h.prot) r.sprite.setProtected(h.prot);
      },
      onMove: (m) => {
        let r = this.remotes.get(m.id);
        if (!r) { const meta = this.net.getMeta(m.id); if (!meta) return; r = this.spawnRemote(meta); }
        r.push(m);
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private ensureTextures() {
    if (this.textures.exists("tileset")) return;
    const tex = this.textures.addCanvas("tileset", buildTilesetCanvas())!;
    const cols = Math.floor(tex.source[0]!.width / TILE), rows = Math.floor(tex.source[0]!.height / TILE);
    for (let i = 0; i < cols * rows; i++) tex.add(`t${i}`, 0, (i % cols) * TILE, Math.floor(i / cols) * TILE, TILE, TILE);
    for (const key of layerKeys()) ensureLayerTexture(this, key);
  }

  private drawChristmasPlaza() {
    if (this.map.id !== "village") return;
    for (const kind of ["tree", "fountain", "market"] as const) {
      if (!this.textures.exists(`christmas-${kind}`)) this.textures.addCanvas(`christmas-${kind}`, christmasCanvas(kind));
    }
    this.add.image(74 * TILE + 8, 38 * TILE + 8, "christmas-fountain").setDepth(3.5);
    this.add.image(66 * TILE, 33 * TILE, "christmas-tree").setOrigin(0.5, 1).setDepth(10 + 33 * TILE);
    this.add.image(84 * TILE, 25 * TILE - 12, "christmas-market").setOrigin(0).setDepth(10 + 28 * TILE);
  }

  private availableSeat() {
    return nearbySeat(this.seats, this.me.x, this.me.y, [...this.remotes.values()].filter((r) => r.sitting).map((r) => r.sprite));
  }

  interact(): boolean {
    if (!this.me || this.warping || this.editGfx) return false;
    if (this.sitting) { this.sitting = undefined; this.me.setActivity("normal"); return true; }
    const seat = this.availableSeat();
    if (!seat) return false;
    this.sitting = seat;
    const body = this.feet.body as Phaser.Physics.Arcade.Body;
    body.reset(seat.x, seat.y - 3);
    this.dir = seat.dir;
    this.me.setPosition(seat.x, seat.y).setPose(this.dir, "idle");
    this.me.setActivity("sit");
    this.lastSentState = "";
    return true;
  }

  private selfMeta(): PresenceMeta {
    return { id: this.ctx.userId, username: this.ctx.username, ...this.ctx.look, x: Math.round(this.me.x), y: Math.round(this.me.y), dir: this.dir, gang_id: this.ctx.gang.gangId, tag: this.ctx.gang.tag };
  }

  private labelFor(name: string, tag: string | null | undefined) { return tag ? `[${tag}] ${name}` : name; }

  private styleRemote(p: PresenceMeta) {
    const r = this.remotes.get(p.id); if (!r) return;
    r.sprite.setLabel(this.labelFor(p.username, p.tag));
    const g = this.ctx.gang;
    const color = !p.gang_id ? "#ffffff" : g.gangId && (p.gang_id === g.gangId || g.friendly.includes(p.gang_id)) ? "#8ef08e" : g.gangId ? "#ff9a8a" : "#ffffff";
    r.sprite.setLabelColor(color);
  }

  private drawZone() {
    if (!this.zoneGfx || !this.zoneBaseId) return;
    const b = BASES.find((x) => x.id === this.zoneBaseId)!;
    const z = captureZone(b);
    const st = this.ctx.zones[b.id];
    const color = st?.status === "contested" ? 0xf0c040 : st?.status === "attacking" ? 0xf05050 : st?.status === "repairing" ? 0x6ee06e : st?.friendly ? 0x6ec0f0 : 0xe8e0ff;
    const g = this.zoneGfx;
    g.clear();
    g.fillStyle(color, 0.16).fillCircle(z.x, z.y, z.radius);
    g.lineStyle(1, color, 0.85).strokeCircle(z.x, z.y, z.radius);
    g.lineStyle(1, color, 0.5).strokeCircle(z.x, z.y, z.radius - 4);
  }

  // ---------- called from React ----------
  /** True when a point on the canvas (CSS px) lands on the local player's sprite. */
  hitTestSelf(sx: number, sy: number): boolean {
    if (!this.me || this.warping) return false;
    const p = this.cameras.main.getWorldPoint(sx, sy);
    return Math.abs(p.x - this.me.x) <= 18 && p.y >= this.me.y - 52 && p.y <= this.me.y + 6;
  }
  /** Where everyone on this map is right now (real presence data only). */
  snapshot(): WorldSnapshot {
    const players: WorldSnapshot["players"] = [];
    for (const [id, r] of this.remotes) players.push({ id, x: r.sprite.x, y: r.sprite.y, gangId: this.net?.getMeta(id)?.gang_id ?? null });
    return { mapId: this.map?.id ?? "", x: this.me?.x ?? 0, y: this.me?.y ?? 0, players };
  }
  setGang(info: GangInfo) {
    this.ctx.gang = info;
    this.me?.setLabel(this.labelFor(this.ctx.username, info.tag));
    void this.net?.updateSelf({ gang_id: info.gangId, tag: info.tag });
    for (const id of this.remotes.keys()) { const m = this.net.getMeta(id); if (m) this.styleRemote(m); }
  }
  say(userId: string, text: string) {
    (userId === this.ctx.userId ? this.me : this.remotes.get(userId)?.sprite)?.say(text);
  }
  setAdmin(admin: Record<string, AdminFx>, isAdmin: boolean) {
    this.ctx.admin = admin; this.ctx.isAdmin = isAdmin;
    this.applyFx(this.ctx.userId);
    for (const id of this.remotes.keys()) this.applyFx(id);
  }
  private applyFx(id: string) {
    const fx = this.ctx.admin[id];
    const self = id === this.ctx.userId;
    const s = self ? this.me : this.remotes.get(id)?.sprite;
    if (!s) return;
    const hidden = !!fx?.invisible;
    s.setVisible(!hidden || self || this.ctx.isAdmin);
    s.setFx(fx?.size ?? 1, fx?.fly ? 14 : 0, hidden ? 0.4 : 1);
    s.setTitle(fx?.title ?? null, fx?.title_color);
    if (self && this.wallCollider) this.wallCollider.active = !(fx?.noclip || fx?.fly);
    if (self && this.propCollider) this.propCollider.active = !(fx?.noclip || fx?.fly);
  }
  // ---------- world editor ----------
  /** Tile under a canvas point (CSS px). */
  tileAt(sx: number, sy: number) {
    const p = this.cameras.main.getWorldPoint(sx, sy);
    return { mapId: this.map.id, x: Math.floor(p.x / TILE), y: Math.floor(p.y / TILE) };
  }
  myTile() { return { mapId: this.map?.id ?? "", x: Math.floor((this.me?.x ?? 0) / TILE), y: Math.floor(((this.me?.y ?? 0) - 3) / TILE) }; }
  extrasNow() { return this.extras; }
  playerAt(sx: number, sy: number) {
    const p = this.cameras.main.getWorldPoint(sx, sy);
    const entries = [[this.ctx.userId, this.me], ...[...this.remotes].map(([id, r]) => [id, r.sprite])] as [string, CharacterSprite][];
    return entries.find(([, s]) => Math.abs(p.x - s.x) <= 14 && p.y >= s.y - 32 && p.y <= s.y + 5)?.[0] ?? null;
  }
  previewPlayer(id: string, x: number, y: number) {
    if (!this.ctx.isAdmin) return;
    const r = this.remotes.get(id);
    if (r) r.push({ id, x, y, dir: "down", anim: "idle" });
  }
  previewProp(id: string, x: number, y: number) {
    if (!this.ctx.isAdmin) return;
    const p = this.extras.props.find((p) => p.id === id); if (!p) return;
    p.x = x; p.y = y; this.rebuildObjects();
  }
  resizeProp(id: string, w: number, h: number) {
    if (!this.ctx.isAdmin || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
    const p = this.extras.props.find((p) => p.id === id); if (!p) return;
    p.display_w = w; p.display_h = h; this.rebuildObjects();
  }
  pan(dx: number, dy: number) {
    if (!this.editGfx) return;
    const cam = this.cameras.main; cam.stopFollow();
    cam.scrollX -= dx / cam.zoom; cam.scrollY -= dy / cam.zoom;
  }
  zoomAt(sx: number, sy: number, factor: number) {
    if (!Number.isFinite(factor) || factor <= 0) return;
    const cam = this.cameras.main, before = cam.getWorldPoint(sx, sy);
    const z = cameraZoom(cam.zoom, factor);
    this.zoomFactor = z / computeZoom(this.scale.width, this.scale.height);
    if (!this.editGfx) {
      cam.setZoom(z); cam.startFollow(this.me, true, 1, 1); cam.centerOn(this.me.x, this.me.y);
      this.me.setLabelResolution(z * 2);
      for (const r of this.remotes.values()) r.sprite.setLabelResolution(z * 2);
      return;
    }
    cam.stopFollow(); cam.setZoom(z);
    const after = cam.getWorldPoint(sx, sy);
    cam.scrollX += before.x - after.x; cam.scrollY += before.y - after.y;
  }
  showEditGrid(on: boolean) {
    this.editGfx?.destroy(); this.editGfx = undefined;
    if (!on) { this.cameras.main.startFollow(this.me, true, 1, 1); return; }
    const g = this.add.graphics().setDepth(99999);
    g.lineStyle(1, 0xffffff, 0.12);
    for (let x = 0; x <= this.map.width; x++) g.lineBetween(x * TILE, 0, x * TILE, this.map.height * TILE);
    for (let y = 0; y <= this.map.height; y++) g.lineBetween(0, y * TILE, this.map.width * TILE, y * TILE);
    for (const w of this.extras.warps) g.fillStyle(0x6ec0f0, 0.35).fillRect(w.x * TILE, w.y * TILE, w.w * TILE, w.h * TILE);
    for (const w of this.map.warps) g.fillStyle(0xf0c040, 0.25).fillRect(w.x * TILE, w.y * TILE, w.w * TILE, w.h * TILE);
    this.editGfx = g;
  }

  private applyTile(t: TileRow) {
    if (t.x < 0 || t.y < 0 || t.x >= this.map.width || t.y >= this.map.height) return;
    const L = t.layer as keyof typeof this.tileLayers; const layer = this.tileLayers?.[L]; if (!layer) return;
    layer.putTileAt(t.asset_id || t.tile === 0 ? -1 : t.tile, t.x, t.y);
    this.map.layers[L][t.y * this.map.width + t.x] = t.tile;
  }

  async reloadExtras() {
    const mapId = this.map.id;
    const ex = takeInitialExtras(mapId) ?? await loadMapExtras(mapId);
    if (!this.sys.isActive() || this.map.id !== mapId) return;
    await Promise.all(referencedAssets(ex).map(async (a) => {
      const key = `world-art-${a.id}`;
      if (this.textures.exists(key)) return;
      try {
        const image = await worldImage(a); if (!image) return;
        if (!this.sys.isActive()) return;
        if (a.kind === "tileset") {
          const cols = Math.ceil(a.width / TILE), rows = Math.ceil(a.height / TILE);
          // Individual textures avoid GPU atlas-size limits and pad partial edge tiles.
          const needed = new Set(ex.tiles.filter((t) => t.asset_id === a.id).map((t) => t.tile));
          for (const i of needed) {
            if (i < 0 || i >= cols * rows) continue;
            const tileKey = `${key}-${i}`;
            if (this.textures.exists(tileKey)) continue;
            const canvas = document.createElement("canvas"); canvas.width = TILE; canvas.height = TILE;
            const ctx = canvas.getContext("2d"); if (!ctx) continue;
            const crop = tileCrop(i, a.width, a.height);
            if (crop.w && crop.h) ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
            this.textures.addCanvas(tileKey, canvas);
          }
        } else this.textures.addImage(key, image);
      } catch { /* Missing custom art must not stop gameplay. */ }
    }));
    if (!this.sys.isActive() || this.map.id !== mapId) return;
    this.extras = ex;
    for (const t of ex.tiles) this.applyTile(t);
    this.seats = seatsFor(this.map);
    this.rebuildObjects();
  }

  private rebuildObjects() {
    for (const o of this.extraObjs) o.destroy();
    for (const n of this.npcs) n.s.destroy();
    this.extraObjs = []; this.npcs = [];
    this.propBodies?.clear(true, true);
    for (const t of this.extras.tiles) {
      if (!t.asset_id) continue;
      const key = `world-art-${t.asset_id}-${t.tile}`;
      if (this.textures.exists(key)) this.extraObjs.push(this.add.image(t.x * TILE + 8, t.y * TILE + 8, key).setDepth(t.layer === "above" ? 100000 : t.layer === "objects" ? 3 : t.layer === "decor" ? 1 : 0));
      if (t.solid) { const z = this.add.zone(t.x * TILE + 8, t.y * TILE + 8, TILE, TILE); this.propBodies?.add(z); this.extraObjs.push(z); }
    }
    const fur = new Map(this.extras.furniture.map((f) => [f.id, f]));
    for (const p of this.extras.props) {
      const f = fur.get(p.furniture_id); if (!f) continue;
      const size = propSize(p, f), scaleX = size.w / f.w, scaleY = size.h / f.h;
      const key = f.asset_id ? `world-art-${f.asset_id}` : "";
      if (key && this.textures.exists(key)) this.extraObjs.push(this.add.image(p.x * TILE, p.y * TILE, key).setOrigin(0).setDisplaySize(size.w * TILE, size.h * TILE).setDepth(10 + (p.y + size.h) * TILE));
      if (f.asset_id) {
        if (f.solid[0]) { const z = this.add.zone((p.x + size.w / 2) * TILE, (p.y + size.h / 2) * TILE, size.w * TILE, size.h * TILE); this.propBodies?.add(z); this.extraObjs.push(z); }
        continue;
      }
      for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) {
        const k = j * f.w + i, tile = f.tiles[k] ?? 0;
        const x = (p.x + i * scaleX) * TILE, y = (p.y + j * scaleY) * TILE;
        if (tile > 0) this.extraObjs.push(this.add.image(x + 8 * scaleX, y + 8 * scaleY, "tileset", `t${tile}`).setScale(scaleX, scaleY).setDepth(10 + y + TILE));
        if (f.solid[k]) {
          const z = this.add.zone(x + 8 * scaleX, y + 8 * scaleY, TILE * scaleX, TILE * scaleY);
          this.propBodies?.add(z); this.extraObjs.push(z);
        }
      }
    }
    for (const n of this.extras.npcs) {
      const look = sanitizeLook({ ...DEFAULT_LOOK, body_id: n.body_id, head_id: n.head_id, hat_id: n.hat_id });
      const s = new CharacterSprite(this, n.x * TILE + 8, n.y * TILE + 12, look, n.name);
      s.setPose((["up", "down", "left", "right"].includes(n.dir) ? n.dir : "down") as Direction, "idle");
      s.setLabelColor("#ffe58a"); s.setLabelResolution(this.cameras.main.zoom * 2);
      this.npcs.push({ s, x: n.x * TILE + 8, y: n.y * TILE + 12, dialog: n.dialog, last: 0 });
    }
    if (this.editGfx) this.showEditGrid(true);
  }

  private subscribeEdits() {
    const mapId = this.map.id;
    const later = () => { this.reloadTimer?.remove(); this.reloadTimer = this.time.delayedCall(150, () => void this.reloadExtras()); };
    const f = `map_id=eq.${mapId}`;
    this.editCh = supabase.channel(`edit-${mapId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "world_tiles", filter: f }, (p) => {
        if (p.eventType !== "DELETE") this.applyTile(p.new as TileRow);
        later();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "world_warps", filter: f }, later)
      .on("postgres_changes", { event: "*", schema: "public", table: "world_npcs", filter: f }, later)
      .on("postgres_changes", { event: "*", schema: "public", table: "world_props", filter: f }, later)
      .on("postgres_changes", { event: "*", schema: "public", table: "world_furniture" }, later)
      .on("postgres_changes", { event: "*", schema: "public", table: "world_maps" }, (p) => {
        if (p.eventType !== "DELETE") registerCustomMap(p.new as WorldMapRow);
      })
      .subscribe();
  }
  setZones(z: GameContext["zones"]) { this.ctx.zones = z; this.drawZone(); }
  setMyHp(hp: number, max: number, prot: number) {
    this.ctx.myHp = { hp, max, prot };
    this.me?.setHp(hp, max); this.me?.setProtected(prot);
    this.net?.sendHp({ id: this.ctx.userId, hp, max, prot });
  }
  respawn(mapId: string, x: number, y: number) {
    this.warping = true;
    this.cameras.main.flash(250, 255, 255, 255);
    this.scene.restart({ mapId, x, y, dir: "down" } satisfies WorldSceneData);
  }

  private async loadAutumnTrees() {
    const { data } = await supabase.from("autumn_trees").select("*").eq("map_id", this.map.id);
    if (!this.scene.isActive()) return;
    if (!this.textures.exists("autumn-tree")) this.textures.addCanvas("autumn-tree", autumnTreeCanvas());
    for (const t of data ?? []) {
      const image = this.add.image(t.x, t.y, "autumn-tree").setOrigin(0.5, 1).setDepth(9 + t.y);
      this.autumnTrees.push({ ...t, image });
    }
  }

  /** Bare hands grab and push the closest autumn tree in front of the player. */
  async attack(): Promise<string | null> {
    if (!this.me || this.attacking) return null;
    if (this.sitting || this.ctx.firearms[this.ctx.userId] === "fists" && this.availableSeat()) { this.interact(); return null; }
    this.attacking = true;
    try {
      await this.reportNow();
      if (this.ctx.firearms[this.ctx.userId] === "fists") {
        this.me.swing(); this.net.sendSwing({ id: this.ctx.userId, dir: this.dir });
        const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.dir];
        const tree = this.autumnTrees.filter((t) => {
          const dx = t.x - this.me.x, dy = t.y - this.me.y;
          return Math.hypot(dx, dy) <= 40 && dx * (v[0] ?? 0) + dy * (v[1] ?? 0) >= 0 && Math.abs(dx * (v[1] ?? 0) - dy * (v[0] ?? 0)) <= 24;
        }).sort((a, b) => Math.hypot(a.x - this.me.x, a.y - this.me.y) - Math.hypot(b.x - this.me.x, b.y - this.me.y))[0];
        if (!tree) return "No hay nada que agarrar cerca";
        const { data, error } = await supabase.rpc("push_autumn_tree", { _tree: tree.id, _aim: this.dir });
        if (error) return error.message;
        this.tweens.add({ targets: tree.image, angle: 5, duration: 80, yoyo: true, repeat: 2 });
        const result = data as { dropped: boolean };
        notify(result.dropped ? "¡Conseguiste una bolsa de bellotas!" : "Cayeron hojas, pero no una bolsa");
        this.ctx.onAutumnChange(); return null;
      }
      const res = await this.ctx.shoot(this.dir);
      this.me.shoot();
      this.net.sendSwing({ id: this.ctx.userId, dir: this.dir, firearm: true });
      if (res.targetId) {
        const target = this.remotes.get(res.targetId);
        if (target) { target.sprite.flashHit(); target.sprite.setHp(res.hp, res.max_hp); this.floatText(target.sprite.x, target.sprite.y - 28, res.killed ? "K.O.!" : "-1", "#ff8a8a"); }
        this.net.sendHp({ id: res.targetId, hp: res.killed ? res.max_hp : res.hp, max: res.max_hp });
      }
      return null;
    } catch (e) { return e instanceof Error ? e.message : "No se pudo disparar"; }
    finally { this.attacking = false; }
  }

  reloadWeapon() { this.me?.reload(); }

  async meleeAttack(): Promise<string | null> {
    if (!this.me || this.attacking) return null;
    this.me.swing();
    this.net.sendSwing({ id: this.ctx.userId, dir: this.dir });
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.dir];
    let best: { id: string; d: number } | null = null;
    for (const [id, r] of this.remotes) {
      const dx = r.sprite.x - this.me.x, dy = r.sprite.y - this.me.y, d = Math.hypot(dx, dy);
      if (d > 56) continue;
      const facing = (dx * v[0]! + dy * v[1]!) / Math.max(1, d);
      const score = d - facing * 16;
      if (!best || score < best.d) best = { id, d: score };
    }
    if (!best) return "No one in reach";
    this.attacking = true;
    try {
      await this.reportNow();
      const res = await this.ctx.attack(best.id);
      const r = this.remotes.get(best.id);
      if (r) {
        r.sprite.flashHit(); r.sprite.setHp(res.hp, res.max_hp);
        this.floatText(r.sprite.x, r.sprite.y - 28, res.killed ? "K.O.!" : `-${res.damage}`, res.killed ? "#ffe58a" : "#ff8a8a");
      }
      this.net.sendHp({ id: best.id, hp: res.killed ? res.max_hp : res.hp, max: res.max_hp });
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Attack failed";
    } finally { this.attacking = false; }
  }

  private floatText(x: number, y: number, text: string, color: string) {
    const t = this.add.text(x, y, text, { fontFamily: '"VT323", monospace', fontSize: "10px", color, stroke: "#1b1424", strokeThickness: 2 })
      .setOrigin(0.5, 1).setResolution(this.cameras.main.zoom * 2).setDepth(200000);
    this.tweens.add({ targets: t, y: y - 12, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  private reportNow() {
    this.lastReport = this.time.now;
    return supabase.rpc("report_state", { _map: this.map.id, _x: Math.round(this.me.x), _y: Math.round(this.me.y) }).then(() => undefined);
  }

  private spawnRemote(p: PresenceMeta) {
    const existing = this.remotes.get(p.id);
    if (existing) return existing;
    const r = new RemotePlayer(this, p.x, p.y, p.dir, p, p.username);
    r.sprite.setLook(p);
    r.sprite.setLabelResolution(this.cameras.main.zoom * 2);
    this.remotes.set(p.id, r);
    this.styleRemote(p);
    this.applyFx(p.id);
    return r;
  }

  private onResize(size: Phaser.Structs.Size) { this.applyZoom(size.width, size.height); }

  private applyZoom(w: number, h: number) {
    const z = cameraZoom(computeZoom(w, h), this.zoomFactor);
    this.cameras.main.setZoom(z);
    if (!this.editGfx) { this.cameras.main.startFollow(this.me, true, 1, 1); this.cameras.main.centerOn(this.me.x, this.me.y); }
    this.me?.setLabelResolution(z * 2);
    for (const r of this.remotes.values()) r.sprite.setLabelResolution(z * 2);
  }

  /** Called from React when the wardrobe saves. */
  applyLook(look: Look, username: string) {
    this.ctx.look = look;
    this.ctx.username = username;
    this.me.setLook(look);
    this.me.setLabel(this.labelFor(username, this.ctx.gang.tag));
    void this.net.updateSelf({ ...look, username });
  }

  override update(time: number, delta: number) {
    if (!this.me || this.warping) return;
    const k = this.keys;
    let ix = joystick.x, iy = joystick.y;
    if (k.A.isDown || k.LEFT.isDown) ix -= 1;
    if (k.D.isDown || k.RIGHT.isDown) ix += 1;
    if (k.W.isDown || k.UP.isDown) iy -= 1;
    if (k.S.isDown || k.DOWN.isDown) iy += 1;
    const v = normalizeInput(ix, iy);
    const body = this.feet.body as Phaser.Physics.Arcade.Body;
    const moving = v.x !== 0 || v.y !== 0;
    if (moving) this.sitting = undefined;
    const swimming = waterAt(this.map, this.feet.x, this.feet.y + 3);
    const sp = SPEED * (swimming ? 0.65 : 1) * (this.ctx.admin[this.ctx.userId]?.speed ?? 1);
    body.setVelocity(v.x * sp, v.y * sp);

    this.dir = facingFromVector(v.x, v.y, this.dir);
    this.anim = moving ? "walk" : "idle";
    this.me.setPosition(Math.round(this.feet.x), Math.round(this.feet.y + 3));
    this.me.setPose(this.dir, this.anim);
    this.me.setActivity(this.sitting ? "sit" : swimming ? "swim" : "normal");
    this.me.setFirearm(this.ctx.firearms[this.ctx.userId] ?? "gun_crystal");
    this.me.tick(delta);

    for (const [id, r] of this.remotes) {
      r.sprite.setFirearm(this.ctx.firearms[id] ?? "gun_crystal");
      r.sprite.setActivity(r.sitting ? "sit" : waterAt(this.map, r.sprite.x, r.sprite.y) ? "swim" : "normal");
      r.update(performance.now(), delta);
    }
    const action = this.sitting ? "stand" : this.availableSeat() ? "sit" : null;
    if (action !== this.seatAction) { this.seatAction = action; this.ctx.onHud({ seatAction: action }); }

    // network send
    const x = Math.round(this.me.x), y = Math.round(this.me.y);
    const state = `${x},${y},${this.dir},${this.anim},${!!this.sitting}`;
    const changed = state !== this.lastSentState;
    if ((changed && time - this.lastSent >= SEND_INTERVAL) || time - this.lastSent >= HEARTBEAT || (changed && this.anim === "idle")) {
      this.net.sendMove({ id: this.ctx.userId, x, y, dir: this.dir, anim: this.anim, sitting: !!this.sitting });
      this.lastSent = time;
      this.lastSentState = state;
    }
    if (time - this.lastReport > 300) void this.reportNow();
    if (time - this.lastTick > 3000) { this.lastTick = time; void supabase.rpc("base_tick").then(() => undefined); }
    if (time - this.lastSave > SAVE_INTERVAL) { this.lastSave = time; void this.persist(); }

    const tx = Math.floor(this.feet.x / TILE), ty = Math.floor(this.feet.y / TILE);
    for (const n of this.npcs) {
      if (n.dialog && Math.hypot(n.x - this.me.x, n.y - this.me.y) < 24 && time - n.last > 6000) { n.last = time; n.s.say(n.dialog); }
    }
    const xw = this.extras.warps.find((w) => tx >= w.x && tx < w.x + w.w && ty >= w.y && ty < w.y + w.h);
    if (xw) { this.doWarp({ x: xw.x, y: xw.y, w: xw.w, h: xw.h, to: xw.to_map, toX: xw.to_x, toY: xw.to_y }); return; }
    const warp = this.map.warps.find((w) => tx >= w.x && tx < w.x + w.w && ty >= w.y && ty < w.y + w.h);
    if (warp) this.doWarp(warp);
  }

  private doWarp(w: Warp) {
    this.warping = true;
    const cam = this.cameras.main;
    cam.fadeOut(180, 20, 16, 28);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const x = w.toX * TILE + 8, y = w.toY * TILE + 8;
      void supabase.rpc("report_state", { _map: w.to, _x: x, _y: y }).then(() => undefined);
      void this.persist({ map_id: w.to, pos_x: x, pos_y: y });
      this.scene.restart({ mapId: w.to, x, y, dir: this.dir } satisfies WorldSceneData);
    });
  }

  persist(override?: { map_id: string; pos_x: number; pos_y: number }) {
    if (!this.me) return Promise.resolve();
    return supabase.from("profiles").update({
      map_id: override?.map_id ?? this.map.id,
      pos_x: override?.pos_x ?? Math.round(this.me.x),
      pos_y: override?.pos_y ?? Math.round(this.me.y),
      facing_direction: this.dir,
      animation_state: this.anim,
      updated_at: new Date().toISOString(),
    }).eq("id", this.ctx.userId).then(() => undefined);
  }

  private cleanup() {
    this.scale.off("resize", this.onResize, this);
    this.net?.destroy();
    if (this.editCh) { void supabase.removeChannel(this.editCh); this.editCh = undefined; }
    for (const n of this.npcs) n.s.destroy();
    this.npcs = []; this.extraObjs = []; this.editGfx = undefined;
    for (const t of this.autumnTrees) t.image.destroy(); this.autumnTrees = [];
    for (const r of this.remotes.values()) r.destroy();
    this.remotes.clear();
  }
}
