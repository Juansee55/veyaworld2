import * as Phaser from "phaser";
import type { Direction, Look } from "./catalog";
import { WorldScene, type AdminFx, type AttackResult, type GameContext, type GangInfo, type HudState, type WorldSceneData, type WorldSnapshot } from "./scenes/WorldScene";
import { loadLayerArt, loadCustom } from "./art/layers";
import { loadTilesetAtlas } from "./art/tilesetArt";
import { loadCustomMaps, loadMapExtras, primeMapExtras, registerCustomMap, type WorldMapRow, type MapExtras } from "./editor/worldData";
import { referencedAssets, worldImage } from "./editor/worldArtCache";
import type { Aim } from "@/lib/game/firearm-rules";
import type { ShotResult } from "@/lib/game/firearms.functions";

export interface GameOptions {
  userId: string;
  username: string;
  look: Look;
  mapId: string;
  x: number;
  y: number;
  dir: Direction;
  onHud: (h: HudState) => void;
  gang: GangInfo;
  myHp: { hp: number; max: number; prot: number };
  attack: (targetId: string) => Promise<AttackResult>;
  shoot: (aim: Aim) => Promise<ShotResult>;
  firearms: Record<string, string>;
  onAutumnChange: () => void;
  admin: Record<string, AdminFx>;
  isAdmin: boolean;
}

export interface GameController {
  setLook(look: Look, username: string): void;
  setGang(info: GangInfo): void;
  setZones(z: GameContext["zones"]): void;
  setAdmin(admin: Record<string, AdminFx>, isAdmin: boolean): void;
  say(userId: string, text: string): void;
  setMyHp(hp: number, max: number, prot: number): void;
  setFirearms(guns: Record<string, string>): void;
  respawn(mapId: string, x: number, y: number): void;
  attack(): Promise<string | null>;
  interact(): boolean;
  reloadWeapon(): void;
  /** Did a tap at these viewport coordinates hit the local player? */
  hitTestSelf(clientX: number, clientY: number): boolean;
  snapshot(): WorldSnapshot | null;
  /** World editor helpers. */
  tileAt(clientX: number, clientY: number): { mapId: string; x: number; y: number } | null;
  myTile(): { mapId: string; x: number; y: number } | null;
  extras(): MapExtras | null;
  playerAt(clientX: number, clientY: number): string | null;
  previewPlayer(id: string, x: number, y: number): void;
  previewProp(id: string, x: number, y: number): void;
  resizeProp(id: string, w: number, h: number): void;
  pan(dx: number, dy: number): void;
  zoomAt(clientX: number, clientY: number, factor: number): void;
  refreshEditor(): Promise<void>;
  showEditGrid(on: boolean): void;
  tilesetUrl(): string | null;
  goto(mapId: string, x: number, y: number): void;
  registerMap(map: WorldMapRow): void;
  destroy(): void;
}

export async function createGame(parent: HTMLElement, opts: GameOptions): Promise<GameController> {
  await Promise.all([
    loadLayerArt(), loadTilesetAtlas(), loadCustomMaps().catch(() => []),
    Promise.all((["body", "head", "hat", "melee"] as const).map((layer) => {
      const id = opts.look[`${layer}_id`]; return id.startsWith("custom:") ? loadCustom(layer, id) : Promise.resolve(null);
    })),
    ...Object.values(opts.firearms).filter((id) => id.startsWith("custom:")).map((id) => loadCustom("melee", id)),
    loadMapExtras(opts.mapId).then(async (ex) => {
      await Promise.all(referencedAssets(ex).map(worldImage)); primeMapExtras(opts.mapId, ex);
    }),
  ]);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#14101c",
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    physics: { default: "arcade", arcade: { debug: false } },
    input: { mouse: false, touch: false, keyboard: true },
    banner: false,
    fps: { target: 60 },
  });

  const ctx: GameContext = {
    userId: opts.userId, username: opts.username, look: opts.look, onHud: opts.onHud,
    gang: opts.gang, zones: {}, myHp: opts.myHp, attack: opts.attack,
    admin: opts.admin, isAdmin: opts.isAdmin,
    shoot: opts.shoot, firearms: opts.firearms,
    onAutumnChange: opts.onAutumnChange,
  };
  game.registry.set("ctx", ctx);
  const start: WorldSceneData = { mapId: opts.mapId, x: opts.x, y: opts.y, dir: opts.dir };
  game.scene.add("world", WorldScene, true, start);

  const scene = () => game.scene.getScene("world") as WorldScene | null;
  const onHide = () => { if (document.visibilityState === "hidden") void scene()?.persist(); };
  document.addEventListener("visibilitychange", onHide);

  return {
    setLook(look, username) { scene()?.applyLook(look, username); },
    setFirearms(guns) { ctx.firearms = guns; },
    setGang(info) { ctx.gang = info; const s = scene(); if (s?.sys.isActive()) s.setGang(info); },
    say(id, t) { const s = scene(); if (s?.sys.isActive()) s.say(id, t); },
    setAdmin(a, isAdmin) { ctx.admin = a; ctx.isAdmin = isAdmin; const s = scene(); if (s?.sys.isActive()) s.setAdmin(a, isAdmin); },
    setZones(z) { ctx.zones = z; const s = scene(); if (s?.sys.isActive()) s.setZones(z); },
    setMyHp(hp, max, prot) { ctx.myHp = { hp, max, prot }; const s = scene(); if (s?.sys.isActive()) s.setMyHp(hp, max, prot); },
    respawn(mapId, x, y) { scene()?.respawn(mapId, x, y); },
    attack() { return scene()?.attack() ?? Promise.resolve(null); },
    interact() { return scene()?.interact() ?? false; },
    reloadWeapon() { scene()?.reloadWeapon(); },
    hitTestSelf(cx, cy) {
      const s = scene(); if (!s?.sys.isActive()) return false;
      const r = parent.getBoundingClientRect();
      return s.hitTestSelf(cx - r.left, cy - r.top);
    },
    tileAt(cx, cy) {
      const s = scene(); if (!s?.sys.isActive()) return null;
      const r = parent.getBoundingClientRect();
      return s.tileAt(cx - r.left, cy - r.top);
    },
    myTile() { const s = scene(); return s?.sys.isActive() ? s.myTile() : null; },
    extras() { const s = scene(); return s?.sys.isActive() ? s.extrasNow() : null; },
    playerAt(cx, cy) { const s = scene(); if (!s?.sys.isActive()) return null; const r = parent.getBoundingClientRect(); return s.playerAt(cx - r.left, cy - r.top); },
    previewPlayer(id, x, y) { scene()?.previewPlayer(id, x, y); },
    previewProp(id, x, y) { scene()?.previewProp(id, x, y); },
    resizeProp(id, w, h) { scene()?.resizeProp(id, w, h); },
    pan(dx, dy) { scene()?.pan(dx, dy); },
    zoomAt(cx, cy, factor) { const r = parent.getBoundingClientRect(); scene()?.zoomAt(cx - r.left, cy - r.top, factor); },
    async refreshEditor() { await scene()?.reloadExtras(); },
    showEditGrid(on) { const s = scene(); if (s?.sys.isActive()) s.showEditGrid(on); },
    tilesetUrl() {
      if (!game.textures.exists("tileset")) return null;
      const img = game.textures.get("tileset").getSourceImage() as HTMLCanvasElement;
      return img.toDataURL ? img.toDataURL() : null;
    },
    goto(mapId, x, y) { scene()?.respawn(mapId, x * 16 + 8, y * 16 + 8); },
    registerMap(map) { registerCustomMap(map); },
    snapshot() { const s = scene(); return s?.sys.isActive() ? s.snapshot() : null; },
    destroy() {
      document.removeEventListener("visibilitychange", onHide);
      void scene()?.persist();
      game.destroy(true);
    },
  };
}
