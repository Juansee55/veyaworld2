import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GameController } from "@/game/createGame";
import { BODIES, HATS, HEADS } from "@/game/catalog";
import { T, TILE_COUNT } from "@/game/maps/tiles";
import { notify } from "@/lib/game/notify";
import { PxButton, PxInput } from "./hub/ui";
import { uploadWorldArt, worldArtUrl, type WorldAsset } from "@/lib/game/world-art";
import { Upload } from "lucide-react";
import { BASES, roomMapId } from "@/game/bases/defs";
import houseImage from "@/assets/custom-haunted-house.png";
import { propSize } from "@/lib/game/editor-rules";
import { dragPlayer } from "@/lib/game/editor.functions";
import { useServerFn } from "@tanstack/react-start";
import { tileCrop } from "@/lib/game/art-crop";

type Tool = "tile" | "prop" | "npc" | "warp" | "remove" | "maps" | "furniture" | "house" | "move" | "players" | "pan";
type Layer = "ground" | "decor" | "objects" | "above";
type Tap = { mapId: string; x: number; y: number };
export interface EditorDrag { down(x: number, y: number): boolean; move(x: number, y: number): void; up(x: number, y: number): void; cancel(): void }
interface Fur { id: string; name: string; w: number; h: number; tiles: number[]; solid: boolean[]; asset_id?: string | null }
interface WMap { id: string; name: string; width: number; height: number; spawn_x: number; spawn_y: number }

const COLS = 8;
const ok = (error: { message: string } | null, msg?: string) => { if (error) notify(error.message, "error"); else if (msg) notify(msg); return !error; };

function TileSwatch({ url, id, size = 28, cols = COLS, custom = false, width, height }: { url: string | null; id: number; size?: number; cols?: number; custom?: boolean; width?: number | undefined; height?: number | undefined }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!url || !custom || !width || !height) return;
    let live = true; const image = new Image(); image.src = url;
    void image.decode().then(() => {
      const ctx = ref.current?.getContext("2d"); if (!live || !ctx) return;
      ctx.clearRect(0, 0, 16, 16); ctx.imageSmoothingEnabled = false;
      const c = tileCrop(id, width, height);
      if (c.w && c.h) ctx.drawImage(image, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [url, id, custom, width, height]);
  if (custom) return <canvas ref={ref} width={16} height={16} style={{ width: size, height: size }} className="block bg-muted [image-rendering:pixelated]" />;
  if ((!custom && id <= 0) || !url) return <span className="block bg-background/60" style={{ width: size, height: size }} />;
  return <span className="block" style={{ width: size, height: size, imageRendering: "pixelated", backgroundImage: `url(${url})`,
    backgroundSize: `${cols * size}px auto`, backgroundPosition: `-${(id % cols) * size}px -${Math.floor(id / cols) * size}px` }} />;
}

/** Staff world editor. Taps on the map are routed here while it is open; every change is saved and broadcast live. */
export function MapEditor({ ctrl, tapRef, dragRef, onClose }: { ctrl: () => GameController | null; tapRef: MutableRefObject<((t: Tap) => void) | null>; dragRef: MutableRefObject<EditorDrag | null>; onClose: () => void }) {
  const [tool, setTool] = useState<Tool>("tile");
  const [layer, setLayer] = useState<Layer>("ground");
  const [tile, setTile] = useState(1);
  const [stamp, setStamp] = useState({ w: 1, h: 1 });
  const [url, setUrl] = useState<string | null>(null);
  const [furniture, setFurniture] = useState<Fur[]>([]);
  const [furId, setFurId] = useState<string>("");
  const [maps, setMaps] = useState<WMap[]>([]);
  const [npc, setNpc] = useState({ name: "Guide", body_id: BODIES[0]?.id ?? "body_tunic_blue", head_id: HEADS[0]?.id ?? "head_light", hat_id: HATS[0]?.id ?? "hat_none", dialog: "Welcome to Veya!", dir: "down" });
  const [warp, setWarp] = useState({ to_map: "village", to_x: 61, to_y: 44, twoWay: true });
  const [nm, setNm] = useState({ name: "New room", width: 24, height: 16 });
  const [fb, setFb] = useState<Fur>({ id: "", name: "Table", w: 2, h: 1, tiles: [0, 0], solid: [true, true] });
  const [assets, setAssets] = useState<WorldAsset[]>([]);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [assetId, setAssetId] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [blank, setBlank] = useState(true);
  const [house, setHouse] = useState({ name: "Casa", w: 12, h: 12, style: "haunted" });
  const [selectedProp, setSelectedProp] = useState("");
  const [objectSize, setObjectSize] = useState({ w: 4, h: 4 });
  const [destination, setDestination] = useState("village");
  const dragging = useRef<{ id: string; player: boolean; x: number; y: number; offsetX: number; offsetY: number; original: Tap; pan?: boolean } | null>(null);
  const movePlayer = useServerFn(dragPlayer);
  const uploadRef = useRef<HTMLInputElement>(null);
  const uploadKind = useRef<"tileset" | "object">("tileset");
  const selectedAsset = assets.find((a) => a.id === assetId);
  const loadAssets = async () => {
    const { data, error } = await supabase.from("world_assets").select("*").order("created_at");
    if (error) return;
    setAssets(data ?? []);
    const entries = await Promise.all((data ?? []).map(async (a) => { try { return [a.id, await worldArtUrl(a.path)] as const; } catch { return [a.id, ""] as const; } }));
    setAssetUrls(Object.fromEntries(entries));
  };
  const chooseUpload = (kind: "tileset" | "object") => { uploadKind.current = kind; uploadRef.current?.click(); };
  const upload = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true); setUploadError("");
    try {
      const a = await uploadWorldArt(file, uploadKind.current);
      if (a.kind === "object") {
        const w = Math.ceil(a.width / 16), h = Math.ceil(a.height / 16);
        const { data, error } = await supabase.from("world_furniture").insert({ name: a.name, w, h, tiles: [0], solid: [blocked], asset_id: a.id }).select().single();
        if (error) throw error;
        setFurId(data.id); setTool("prop"); loadFur();
      } else { setAssetId(a.id); setTile(0); setTool("tile"); }
      await loadAssets(); notify("Imagen guardada");
    } catch (e) { setUploadError(e instanceof Error ? e.message : "No se pudo subir la imagen."); }
    finally { setBusy(false); if (uploadRef.current) uploadRef.current.value = ""; }
  };
  const [fbSolidMode, setFbSolidMode] = useState(false);

  const loadFur = () => void supabase.from("world_furniture").select("*").order("created_at").then(({ data }) => setFurniture((data ?? []) as Fur[]));
  const loadMaps = () => void supabase.from("world_maps").select("*").order("created_at").then(({ data }) => setMaps((data ?? []) as WMap[]));
  useEffect(() => {
    setUrl(ctrl()?.tilesetUrl() ?? null); loadFur(); loadMaps(); void loadAssets();
    ctrl()?.showEditGrid(true);
    const ch = supabase.channel(`editor-ui-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "world_furniture" }, loadFur)
      .on("postgres_changes", { event: "*", schema: "public", table: "world_maps" }, loadMaps).subscribe();
    return () => { void supabase.removeChannel(ch); ctrl()?.showEditGrid(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allMaps = useMemo(() => [
    { id: "village", name: "Veya City" },
    ...BASES.flatMap((base) => base.rooms.map((room) => ({ id: roomMapId(base.id, room.key), name: `${base.name} · ${room.key}` }))),
    ...maps,
  ], [maps]);

  const placed = () => {
    const ex = ctrl()?.extras();
    return (ex?.props ?? []).flatMap((p) => { const f = ex?.furniture.find((f) => f.id === p.furniture_id); return f ? [{ ...p, ...propSize(p, f), name: f.name }] : []; });
  };
  const refresh = () => ctrl()?.refreshEditor();
  const previewSize = (next: { w: number; h: number }) => {
    setObjectSize(next); if (selectedProp) ctrl()?.resizeProp(selectedProp, next.w, next.h);
  };
  const saveObjectSize = async () => {
    if (!selectedProp || !Number.isFinite(objectSize.w) || !Number.isFinite(objectSize.h) || objectSize.w <= 0 || objectSize.h <= 0) return;
    const p = placed().find((p) => p.id === selectedProp); const m = ctrl()?.myTile();
    if (!p || !m) return;
    const c = maps.find((map) => map.id === m.mapId);
    if (c && (p.x + objectSize.w > c.width || p.y + objectSize.h > c.height)) return notify("El objeto no cabe en el mapa", "error");
    ok((await supabase.from("world_props").update({ display_w: objectSize.w, display_h: objectSize.h }).eq("id", selectedProp)).error, "Tamaño guardado"); await refresh();
  };
  dragRef.current = {
    down(x, y) {
      if (!["move", "players", "pan"].includes(tool)) return false;
      const t = ctrl()?.tileAt(x, y); if (!t) return false;
      if (tool === "pan") { dragging.current = { id: "", player: false, x, y, offsetX: 0, offsetY: 0, original: t, pan: true }; return true; }
      const player = tool === "players";
      const p = !player ? placed().reverse().find((p) => t.x >= p.x && t.x < p.x + p.w && t.y >= p.y && t.y < p.y + p.h) : null;
      const id = player ? ctrl()?.playerAt(x, y) : p?.id;
      if (!id) return true;
      if (p) { setSelectedProp(p.id); setObjectSize({ w: p.w, h: p.h }); setDestination(t.mapId); }
      dragging.current = { id, player, x, y, offsetX: p ? t.x - p.x : 0, offsetY: p ? t.y - p.y : 0, original: { mapId: t.mapId, x: p?.x ?? t.x, y: p?.y ?? t.y } };
      return true;
    },
    move(x, y) {
      const d = dragging.current; if (!d) return;
      if (d.pan) { ctrl()?.pan(x - d.x, y - d.y); d.x = x; d.y = y; return; }
      const t = ctrl()?.tileAt(x, y); if (!t) return;
      if (d.player) ctrl()?.previewPlayer(d.id, t.x * 16 + 8, t.y * 16 + 8);
      else ctrl()?.previewProp(d.id, Math.max(0, t.x - d.offsetX), Math.max(0, t.y - d.offsetY));
    },
    up(x, y) {
      const d = dragging.current; dragging.current = null;
      if (!d || d.pan) return;
      const t = ctrl()?.tileAt(x, y); if (!t) return;
      void (async () => {
        try {
          if (d.player) await movePlayer({ data: { userId: d.id, mapId: t.mapId, x: t.x * 16 + 8, y: t.y * 16 + 8 } });
          else {
            const p = placed().find((p) => p.id === d.id); if (!p) return;
            const m = maps.find((m) => m.id === t.mapId);
            const nx = Math.max(0, Math.min(t.x - d.offsetX, (m?.width ?? 200) - p.w));
            const ny = Math.max(0, Math.min(t.y - d.offsetY, (m?.height ?? 200) - p.h));
            const { error } = await supabase.from("world_props").update({ x: nx, y: ny }).eq("id", d.id); if (error) throw error;
          }
          notify(d.player ? "Jugador movido" : "Objeto movido");
        } catch (e) { notify(e instanceof Error ? e.message : "No se pudo mover", "error"); }
        finally { await refresh(); }
      })();
    },
    cancel() { dragging.current = null; void refresh(); },
  };

  tapRef.current = async (t: Tap) => {
    const current = maps.find((m) => m.id === t.mapId);
    if (t.x < 0 || t.y < 0 || (current && (t.x >= current.width || t.y >= current.height))) return;
    if (tool === "tile") {
      const rows = [];
      const cols = selectedAsset ? Math.ceil(selectedAsset.width / 16) : COLS;
      const count = selectedAsset ? cols * Math.ceil(selectedAsset.height / 16) : TILE_COUNT;
      for (let y = 0; y < (tile === 0 && !assetId ? 1 : stamp.h); y++) for (let x = 0; x < (tile === 0 && !assetId ? 1 : stamp.w); x++) {
        const index = tile + y * cols + x;
        if (index >= count || tile % cols + x >= cols || (current && (t.x + x >= current.width || t.y + y >= current.height))) continue;
        rows.push({ map_id: t.mapId, layer, x: t.x + x, y: t.y + y, tile: index, asset_id: assetId || null, solid: !!assetId && blocked });
      }
      const { error } = await supabase.from("world_tiles").upsert(rows);
      ok(error);
      if (!error) await refresh();
    } else if (tool === "house") {
      if (busy) return;
      if (current && (t.x + house.w > current.width || t.y + house.h > current.height)) return notify("La casa no cabe aquí", "error");
      setBusy(true);
      try {
        if (house.style === "tiles") {
          const rows = [];
          for (let y = 0; y < house.h; y++) for (let x = 0; x < house.w; x++) rows.push({ map_id: t.mapId, layer: "objects", x: t.x + x, y: t.y + y, tile: y < Math.floor(house.h / 2) ? T.ROOF : y === Math.floor(house.h / 2) ? T.ROOF_EDGE : y === house.h - 1 && x === Math.floor(house.w / 2) ? T.DOORWAY : T.WALL, asset_id: null, solid: false });
          ok((await supabase.from("world_tiles").upsert(rows)).error, "Casa creada");
        } else {
          let a = assets.find((a) => a.id === house.style);
          if (house.style === "haunted") {
            a = assets.find((a) => a.name === "Casa de tres tejados.png");
            if (!a) { const response = await fetch(houseImage); if (!response.ok) throw new Error("No se pudo cargar la casa"); a = await uploadWorldArt(new File([await response.blob()], "Casa de tres tejados.png", { type: "image/png" }), "object"); await loadAssets(); }
          }
          if (!a) throw new Error("Seleccioná una imagen para la casa");
          const { data: f, error } = await supabase.from("world_furniture").insert({ name: house.name, w: Math.ceil(a.width / 16), h: Math.ceil(a.height / 16), tiles: [0], solid: [blocked], asset_id: a.id }).select().single();
          if (error || !f) throw error ?? new Error("No se pudo crear la casa");
          ok((await supabase.from("world_props").insert({ map_id: t.mapId, furniture_id: f.id, x: t.x, y: t.y, display_w: house.w, display_h: house.h })).error, "Casa creada"); loadFur();
        }
        await refresh();
      } catch (e) { notify(e instanceof Error ? e.message : "No se pudo crear la casa", "error"); }
      finally { setBusy(false); }
    } else if (tool === "prop") {
      if (!furId) return notify("Pick a furniture first", "error");
      ok((await supabase.from("world_props").insert({ map_id: t.mapId, furniture_id: furId, x: t.x, y: t.y })).error, "Placed");
    } else if (tool === "npc") {
      ok((await supabase.from("world_npcs").insert({ map_id: t.mapId, x: t.x, y: t.y, ...npc })).error, "NPC created");
    } else if (tool === "warp") {
      const a = await supabase.from("world_warps").insert({ map_id: t.mapId, x: t.x, y: t.y, to_map: warp.to_map, to_x: warp.to_x, to_y: warp.to_y });
      if (!ok(a.error)) return;
      if (warp.twoWay) ok((await supabase.from("world_warps").insert({ map_id: warp.to_map, x: warp.to_x, y: warp.to_y + 1, to_map: t.mapId, to_x: t.x, to_y: t.y + 1 })).error);
      notify(warp.twoWay ? "Door created (both ways)" : "Door created");
    } else if (tool === "remove") {
      const ex = ctrl()?.extras(); if (!ex) return;
      const n = ex.npcs.find((r) => r.x === t.x && (r.y === t.y || r.y === t.y + 1));
      if (n) return void ok((await supabase.from("world_npcs").delete().eq("id", n.id)).error, "NPC removed");
      const w = ex.warps.find((r) => t.x >= r.x && t.x < r.x + r.w && t.y >= r.y && t.y < r.y + r.h);
      if (w) return void ok((await supabase.from("world_warps").delete().eq("id", w.id)).error, "Door removed");
      const fm = new Map(ex.furniture.map((f) => [f.id, f]));
      const p = ex.props.find((r) => { const f = fm.get(r.furniture_id); if (!f) return false; const s = propSize(r, f); return t.x >= r.x && t.x < r.x + s.w && t.y >= r.y && t.y < r.y + s.h; });
      if (p) return void ok((await supabase.from("world_props").delete().eq("id", p.id)).error, "Object removed");
      notify("Nothing to remove here", "error");
    }
  };

  const useMyTile = () => { const m = ctrl()?.myTile(); if (m) setWarp({ ...warp, to_map: m.mapId, to_x: m.x, to_y: m.y }); };
  const createMap = async () => {
    const id = `c_${Math.random().toString(36).slice(2, 10)}`;
    const w = Math.max(8, Math.min(200, nm.width)), h = Math.max(8, Math.min(200, nm.height));
    const { error } = await supabase.from("world_maps").insert({ id, name: nm.name.slice(0, 40) || "Room", width: w, height: h, ground_tile: blank ? 0 : assetId ? T.GRASS : tile, spawn_x: Math.floor(w / 2), spawn_y: Math.floor(h / 2) });
    if (ok(error, "Map created")) {
      await loadMaps();
      setWarp({ ...warp, to_map: id, to_x: Math.floor(w / 2), to_y: Math.floor(h / 2) });
      const { data } = await supabase.from("world_maps").select("*").eq("id", id).single();
      if (data) await ctrl()?.registerMap(data);
      ctrl()?.goto(id, Math.floor(w / 2), Math.floor(h / 2)); setLayer("ground"); setTool("tile");
    }
  };
  const resizeFb = (w: number, h: number) => {
    w = Math.max(1, Math.min(6, w)); h = Math.max(1, Math.min(6, h));
    const tiles: number[] = [], solid: boolean[] = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * fb.w + i; const inside = i < fb.w && j < fb.h; tiles.push(inside ? fb.tiles[k] ?? 0 : 0); solid.push(inside ? fb.solid[k] ?? false : true); }
    setFb({ ...fb, w, h, tiles, solid });
  };
  const saveFb = async () => {
    const row = { name: fb.name.slice(0, 30) || "Object", w: fb.w, h: fb.h, tiles: fb.tiles, solid: fb.solid, asset_id: fb.asset_id ?? null };
    const { data, error } = fb.id ? await supabase.from("world_furniture").update(row).eq("id", fb.id).select("id").single()
      : await supabase.from("world_furniture").insert(row).select("id").single();
    if (ok(error, "Furniture saved") && data) { setFurId(data.id); setFb({ ...fb, id: data.id }); }
  };

  const tools: [Tool, string][] = [["tile", "Tiles"], ["prop", "Place object"], ["move", "Mover objetos"], ["players", "Arrastrar jugadores"], ["pan", "Recorrer mapa"], ["furniture", "Create object"], ["npc", "NPC"], ["warp", "Doors"], ["maps", "Maps"], ["house", "Casa"], ["remove", "Remove"]];
  const paletteUrl = selectedAsset ? assetUrls[selectedAsset.id] ?? null : url;
  const paletteCols = selectedAsset ? Math.ceil(selectedAsset.width / 16) : COLS;
  const [palettePage, setPalettePage] = useState(0);
  const paletteCount = selectedAsset ? paletteCols * Math.ceil(selectedAsset.height / 16) : TILE_COUNT;
  const palette = (
    <>
    <div className="grid max-h-32 grid-cols-[repeat(auto-fill,minmax(30px,1fr))] gap-0.5 overflow-y-auto">
      {Array.from({ length: Math.min(128, Math.max(0, paletteCount - palettePage * 128)) }, (_, j) => { const i = palettePage * 128 + j; return (
        <PxButton key={i} onClick={() => setTile(i)} aria-label={`Tile ${i}`} className={`border-2 ${tile === i ? "border-primary" : "border-transparent"} p-0`}><TileSwatch url={paletteUrl} id={i} cols={paletteCols} custom={!!selectedAsset} width={selectedAsset?.width} height={selectedAsset?.height} /></PxButton>
      ); })}
    </div>
    {paletteCount > 128 && <div className="flex items-center gap-2"><PxButton disabled={palettePage === 0} onClick={() => setPalettePage((p) => p - 1)}>←</PxButton><span>{palettePage + 1} / {Math.ceil(paletteCount / 128)}</span><PxButton disabled={(palettePage + 1) * 128 >= paletteCount} onClick={() => setPalettePage((p) => p + 1)}>→</PxButton></div>}
    </>
  );
  const sel = "border-2 border-border bg-input px-1 py-1 text-base text-foreground";

  return (
    <div data-editor-panel className="pixel-panel absolute inset-x-2 bottom-2 z-30 flex max-h-[48%] flex-col p-2" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
      <input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" aria-label="Subir imagen desde archivos o galería" onChange={(e) => void upload(e.target.files?.[0])} />
      <div className="mb-2 flex items-center gap-1 overflow-x-auto">
        {tools.map(([k, l]) => <PxButton key={k} tone={tool === k ? "primary" : "default"} className="whitespace-nowrap" onClick={() => setTool(k)}>{l}</PxButton>)}
        <PxButton className="ml-auto" onClick={onClose}>Done</PxButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto text-sm touch-pan-y">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <PxButton disabled={busy} onClick={() => chooseUpload("tileset")}><Upload className="mr-1 inline h-4 w-4" />Subir tileset</PxButton>
          <PxButton disabled={busy} onClick={() => chooseUpload("object")}><Upload className="mr-1 inline h-4 w-4" />Subir objeto</PxButton>
          {busy && <span role="status">Subiendo…</span>}
          <label className="flex items-center gap-1"><input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} />Bloquea el paso</label>
        </div>
        {uploadError && <p role="alert" className="mb-2 text-destructive">{uploadError}</p>}
        {(tool === "tile" || tool === "furniture") && <select aria-label="Tileset" className={`${sel} mb-2 max-w-full`} value={assetId} onChange={(e) => { setAssetId(e.target.value); setPalettePage(0); setTile(e.target.value ? 0 : 1); }}><option value="">Veya original</option>{assets.filter((a) => a.kind === "tileset").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
        {tool === "tile" && (<>
          <div className="mb-1 flex flex-wrap gap-1">
            {(["ground", "decor", "objects", "above"] as Layer[]).map((l) => <PxButton key={l} tone={layer === l ? "primary" : "default"} onClick={() => setLayer(l)}>{l}</PxButton>)}
            <PxButton tone={tile === 0 ? "danger" : "default"} onClick={() => { setAssetId(""); setTile(0); }}>Eraser</PxButton>
          </div>
          <p className="mb-1 text-muted-foreground">Tap the map to paint. Walls/water block players; "above" draws over players.</p>
          {palette}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label>Ancho selección<PxInput aria-label="Ancho selección de tiles" type="number" min={1} max={16} value={stamp.w} onChange={(e) => setStamp({ ...stamp, w: Math.max(1, Math.min(16, Number(e.target.value))) })} className="w-16" /></label>
            <label>Alto selección<PxInput aria-label="Alto selección de tiles" type="number" min={1} max={16} value={stamp.h} onChange={(e) => setStamp({ ...stamp, h: Math.max(1, Math.min(16, Number(e.target.value))) })} className="w-16" /></label>
            <div aria-label="Vista previa de selección" className="grid max-w-full overflow-auto" style={{ gridTemplateColumns: `repeat(${stamp.w}, 20px)` }}>{Array.from({ length: stamp.w * stamp.h }, (_, i) => <TileSwatch key={i} size={20} url={paletteUrl} id={tile + Math.floor(i / stamp.w) * paletteCols + i % stamp.w} cols={paletteCols} custom={!!selectedAsset} width={selectedAsset?.width} height={selectedAsset?.height} />)}</div>
          </div>
        </>)}
        {tool === "prop" && (<>
          <p className="mb-1 text-muted-foreground">Choose an object, then tap the map (top-left corner).</p>
          <div className="flex flex-wrap gap-1">{furniture.map((f) => (
            <PxButton key={f.id} onClick={() => setFurId(f.id)} className={`flex flex-col items-center border-2 p-1 ${furId === f.id ? "border-primary" : "border-border"}`}>
              <span className="grid" style={{ gridTemplateColumns: `repeat(${f.w}, 14px)` }}>{f.asset_id ? <img alt={f.name} src={assetUrls[f.asset_id]} className="max-h-20 max-w-24 [image-rendering:pixelated]" /> : f.tiles.map((t, i) => <TileSwatch key={i} url={url} id={t} size={14} />)}</span>
              <span className="text-xs">{f.name}</span>
            </PxButton>))}
            {!furniture.length && <span className="text-muted-foreground">No objects yet — make one in "Create object".</span>}
          </div>
        </>)}
        {tool === "furniture" && (<>
          <div className="mb-1 flex flex-wrap items-center gap-1">
            <PxInput value={fb.name} onChange={(e) => setFb({ ...fb, name: e.target.value })} className="w-28" />
            W<PxInput type="number" value={fb.w} onChange={(e) => resizeFb(+e.target.value, fb.h)} className="w-12" />
            H<PxInput type="number" value={fb.h} onChange={(e) => resizeFb(fb.w, +e.target.value)} className="w-12" />
            <PxButton tone={fbSolidMode ? "primary" : "default"} onClick={() => setFbSolidMode(!fbSolidMode)}>{fbSolidMode ? "Marking: blocked parts" : "Painting tiles"}</PxButton>
            <PxButton tone="primary" onClick={() => void saveFb()}>{fb.id ? "Update" : "Save"}</PxButton>
            {fb.id && <PxButton onClick={() => setFb({ ...fb, id: "" })}>As new</PxButton>}
          </div>
          <p className="mb-1 text-muted-foreground">Tap a cell to paint the selected tile. In "blocked parts" mode, red cells block players; the rest can be walked through.</p>
          <div className="mb-2 inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${fb.w}, 30px)` }}>
            {fb.tiles.map((t, i) => (
              <PxButton key={i} className={`relative border-2 ${fb.solid[i] ? "border-destructive" : "border-accent"}`}
                onClick={() => { if (fbSolidMode) { const s = [...fb.solid]; s[i] = !s[i]; setFb({ ...fb, solid: s }); } else { if (assetId) return notify("Usá el tileset original para armar objetos; para imágenes propias usá Subir objeto.", "error"); const ts = [...fb.tiles]; ts[i] = tile; setFb({ ...fb, tiles: ts }); } }}>
                <TileSwatch url={url} id={t} size={26} />
              </PxButton>))}
          </div>
          {palette}
          <div className="mt-2 flex flex-wrap gap-1">{furniture.map((f) => (
            <span key={f.id} className="flex items-center gap-1 border-2 border-border px-1">{f.name}
              <PxButton onClick={() => setFb({ ...f })}>Edit</PxButton>
              <PxButton tone="danger" onClick={() => void supabase.from("world_furniture").delete().eq("id", f.id).then(({ error }) => ok(error, "Deleted"))}>×</PxButton>
            </span>))}</div>
        </>)}
        {tool === "npc" && (
          <div className="flex flex-wrap items-center gap-1">
            <PxInput value={npc.name} maxLength={20} onChange={(e) => setNpc({ ...npc, name: e.target.value })} className="w-28" placeholder="Name" />
            <select className={sel} value={npc.body_id} onChange={(e) => setNpc({ ...npc, body_id: e.target.value })}>{BODIES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
            <select className={sel} value={npc.head_id} onChange={(e) => setNpc({ ...npc, head_id: e.target.value })}>{HEADS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
            <select className={sel} value={npc.hat_id} onChange={(e) => setNpc({ ...npc, hat_id: e.target.value })}>{HATS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
            <select className={sel} value={npc.dir} onChange={(e) => setNpc({ ...npc, dir: e.target.value })}>{["down", "up", "left", "right"].map((d) => <option key={d}>{d}</option>)}</select>
            <PxInput value={npc.dialog} maxLength={120} onChange={(e) => setNpc({ ...npc, dialog: e.target.value })} className="w-full" placeholder="What it says when players come close" />
            <p className="text-muted-foreground">Tap the map to place this NPC.</p>
          </div>
        )}
        {tool === "warp" && (
          <div className="flex flex-wrap items-center gap-1">
            Goes to <select className={sel} value={warp.to_map} onChange={(e) => setWarp({ ...warp, to_map: e.target.value })}>{allMaps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            X<PxInput type="number" value={warp.to_x} onChange={(e) => setWarp({ ...warp, to_x: +e.target.value })} className="w-14" />
            Y<PxInput type="number" value={warp.to_y} onChange={(e) => setWarp({ ...warp, to_y: +e.target.value })} className="w-14" />
            <PxButton onClick={useMyTile}>Use my spot</PxButton>
            <PxButton tone={warp.twoWay ? "primary" : "default"} onClick={() => setWarp({ ...warp, twoWay: !warp.twoWay })}>Return door: {warp.twoWay ? "ON" : "OFF"}</PxButton>
            <p className="w-full text-muted-foreground">Tap the map where the door goes. The return door appears one tile below the arrival spot. Blue squares are editor doors.</p>
          </div>
        )}
        {tool === "maps" && (<>
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <PxInput value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} className="w-32" />
            W<PxInput type="number" value={nm.width} onChange={(e) => setNm({ ...nm, width: +e.target.value })} className="w-14" />
            H<PxInput type="number" value={nm.height} onChange={(e) => setNm({ ...nm, height: +e.target.value })} className="w-14" />
            <label className="flex items-center gap-1"><input type="checkbox" checked={blank} onChange={(e) => setBlank(e.target.checked)} />Mapa vacío</label>
            <span className="flex items-center gap-1">Floor <TileSwatch url={url} id={tile} size={22} /></span>
            <PxButton tone="primary" onClick={() => void createMap()}>Create map</PxButton>
          </div>
          <p className="mb-1 text-muted-foreground">The floor uses the tile picked in "Tiles". After creating, use "Doors" to connect it.</p>
          {allMaps.map((m) => (
            <div key={m.id} className="flex items-center gap-1 border-b border-border/60 py-1">
              <span className="flex-1 truncate">{m.name}</span>
              <PxButton onClick={() => { setWarp({ ...warp, to_map: m.id }); setTool("warp"); }}>Connect</PxButton>
              <PxButton tone="primary" onClick={() => { const c = maps.find((x) => x.id === m.id); ctrl()?.goto(m.id, c?.spawn_x ?? 61, c?.spawn_y ?? 44); }}>Go</PxButton>
            </div>
          ))}
        </>)}
        {tool === "house" && <div className="flex flex-wrap items-center gap-2">
          <img src={houseImage} alt="Casa de tres tejados" width={96} height={96} loading="lazy" className="h-24 w-24 object-contain [image-rendering:pixelated]" />
          <PxInput aria-label="Nombre de casa" value={house.name} onChange={(e) => setHouse({ ...house, name: e.target.value })} className="w-32" />
          <select aria-label="Estilo de casa" className={sel} value={house.style} onChange={(e) => setHouse({ ...house, style: e.target.value })}><option value="haunted">Tres tejados</option><option value="tiles">Casa de tiles</option>{assets.filter((a) => a.kind === "object").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <label>Ancho<PxInput aria-label="Ancho de casa" type="number" min={3} max={200} value={house.w} onChange={(e) => setHouse({ ...house, w: Math.max(3, Math.min(200, Math.round(+e.target.value))) })} className="w-16" /></label>
          <label>Alto<PxInput aria-label="Alto de casa" type="number" min={4} max={200} value={house.h} onChange={(e) => setHouse({ ...house, h: Math.max(4, Math.min(200, Math.round(+e.target.value))) })} className="w-16" /></label>
        </div>}
        {tool === "move" && <div className="flex flex-wrap items-center gap-2">
          <label>Ancho<PxInput aria-label="Ancho del objeto" type="number" min={0.25} step={0.25} value={objectSize.w} onChange={(e) => previewSize({ ...objectSize, w: +e.target.value })} className="w-16" /></label>
          <label>Alto<PxInput aria-label="Alto del objeto" type="number" min={0.25} step={0.25} value={objectSize.h} onChange={(e) => previewSize({ ...objectSize, h: +e.target.value })} className="w-16" /></label>
          <PxButton disabled={!selectedProp} onClick={() => void saveObjectSize()}>Guardar tamaño</PxButton>
          <select aria-label="Mapa destino del objeto" className={`${sel} max-w-full`} value={destination} onChange={(e) => setDestination(e.target.value)}>{allMaps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <PxButton disabled={!selectedProp} onClick={() => void (async () => { const { error } = await supabase.from("world_props").update({ map_id: destination, x: 0, y: 0 }).eq("id", selectedProp); ok(error, "Objeto trasladado"); await refresh(); })()}>Trasladar</PxButton>
        </div>}
        {tool === "remove" && <p className="text-muted-foreground">Tap an NPC, object or door to delete it. Use the Tiles eraser for tiles.</p>}
      </div>
    </div>
  );
}
