import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOOK, type Look } from "@/game/catalog";
import type { ArtKind, ArtLayout } from "@/game/art/layout";
import type { ArtCrop } from "@/lib/game/art-crop";
import { savePlayerArt, type PlayerArt } from "@/lib/game/playerArt";
import { GaniViewer } from "./GaniViewer";

type PreparedUpload = Awaited<ReturnType<typeof import("@/game/art/normalizeUpload").normalizeUploadPreview>>;

export function ArtUploadEditor({ look = DEFAULT_LOOK, fixedKind, onDone }: { look?: Look; fixedKind?: ArtKind; onDone: (art: PlayerArt) => void | Promise<void> }) {
  const [kind, setKind] = useState<ArtKind>(fixedKind ?? "hat");
  const [layout, setLayout] = useState<ArtLayout>(fixedKind === "melee" ? "single" : "graal-hat");
  const [file, setFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<ArtCrop>({ x: 0, y: 0, w: 1, h: 1 });
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [columns, setColumns] = useState<3 | 4>(3);
  const [result, setResult] = useState<PreparedUpload | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const previewId = useRef(`preview:${crypto.randomUUID()}`).current;
  useEffect(() => {
    if (!file) { setSourceUrl(""); return; }
    const url = URL.createObjectURL(file); setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!file) return;
    let live = true; setReady(false); setResult(null); setError("");
    void import("@/game/art/normalizeUpload")
      .then((m) => m.normalizeUploadPreview(file, kind, kind === "melee" ? "single" : layout, { crop, scale, offsetX, offsetY, hatColumns: columns }))
      .then((r) => { if (live) setResult(r); }, (e) => { if (live) setError(e instanceof Error ? e.message : "No se pudo preparar"); });
    return () => { live = false; };
  }, [file, kind, layout, crop, scale, offsetX, offsetY, columns]);
  useEffect(() => {
    if (!result) return;
    let live = true, remove: (() => void) | undefined;
    void import("@/game/art/layers").then((m) => {
      if (!live) return;
      remove = m.registerPreviewSheet(kind, previewId, result.canvas, result.frames, result.frameMs);
      setReady(true);
      void m.loadLayerArt().catch(() => undefined);
    }, (e) => {
      if (live) setError(e instanceof Error ? e.message : "No se pudo preparar la vista previa");
    });
    return () => { live = false; remove?.(); };
  }, [result, kind, previewId]);
  const choose = async (f?: File) => {
    if (!f) return;
    setError("");
    try {
      const { readImageDimensions } = await import("@/game/art/normalizeUpload");
      const dims = await readImageDimensions(f);
      setCrop({ x: 0, y: 0, w: dims.width, h: dims.height });
      setColumns(dims.width < dims.height ? 3 : 4);
      setScale(1);
      setOffsetX(0);
      setOffsetY(0);
      setFile(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la imagen");
    }
  };
  const save = async () => {
    if (!file || !result || !ready || busy) return;
    setBusy(true); setError("");
    try {
      const blob = await result.toBlob();
      const art = await savePlayerArt(file, blob, kind, result.frames, result.frameMs);
      const layers = await import("@/game/art/layers");
      layers.registerCustomSheet(art.kind as ArtKind, art.id, result.canvas, art.frames, art.frame_ms);
      await onDone(art);
      setFile(null); setResult(null); setReady(false);
    }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar"); }
    finally { setBusy(false); }
  };
  const input = "min-w-0 w-16 border border-border bg-input p-1 text-foreground";
  return <div className="flex flex-col gap-2 border-t border-border py-3">
    {!fixedKind && <div className="flex flex-wrap gap-1">{([["body", "Body"], ["head", "Head"], ["hat", "Hat"], ["melee", "Espada"]] as const).map(([k, label]) => <Button key={k} variant={kind === k ? "default" : "secondary"} disabled={busy} onClick={() => { setKind(k); setLayout(k === "body" ? "graal-body" : k === "head" ? "graal-head" : k === "hat" ? "graal-hat" : "single"); }}>{label}</Button>)}</div>}
    <label className="text-sm">{fixedKind ? "Crear arma personalizada" : "Imagen PNG / GIF"}<input aria-label={fixedKind ? "Subir arma personalizada" : "Imagen del diseño"} type="file" accept="image/png,image/gif" disabled={busy} className="block w-full min-w-0 text-xs" onChange={(e) => { const picked = e.target.files?.[0]; e.currentTarget.value = ""; void choose(picked); }} /></label>
    {file && <>
      {kind !== "melee" && <select aria-label="Formato del diseño" value={layout} disabled={busy} className="border border-border bg-input p-1" onChange={(e) => setLayout(e.target.value as ArtLayout)}><option value="graal-body" hidden={kind !== "body"}>Plantilla Graal Body (32×32)</option><option value="graal-head" hidden={kind !== "head"}>Plantilla Graal Head (32×32)</option><option value="graal-hat" hidden={kind !== "hat"}>Plantilla Graal Hat (fija)</option><option value="grid">Cuadrícula 4×4</option><option value="single">Imagen única</option></select>}
      {layout === "graal-hat" && kind === "hat" && <select aria-label="Columnas del hat" value={columns} disabled={busy} className="border border-border bg-input p-1" onChange={(e) => setColumns(e.target.value === "3" ? 3 : 4)}><option value="3">3 columnas (96×128)</option><option value="4">4 columnas (128×128)</option></select>}
      <img src={sourceUrl} alt="Original del diseño" className="max-h-32 max-w-full self-center border border-border/60 bg-muted/40 object-contain [image-rendering:pixelated]" />
      <div className="flex flex-wrap gap-2">
        {(["x", "y", "w", "h"] as const).map((key) => <label key={key} className="text-xs">{({ x: "Recorte X", y: "Recorte Y", w: "Ancho", h: "Alto" })[key]}<input aria-label={`Recorte ${key}`} type="number" min={key === "w" || key === "h" ? 1 : 0} value={crop[key]} disabled={busy} className={`block ${input}`} onChange={(e) => setCrop({ ...crop, [key]: Number(e.target.value) })} /></label>)}
        <label className="text-xs">Offset X<input aria-label="Offset X" type="number" min={-24} max={24} value={offsetX} disabled={busy} className={`block ${input}`} onChange={(e) => setOffsetX(Number(e.target.value) || 0)} /></label>
        <label className="text-xs">Offset Y<input aria-label="Offset Y" type="number" min={-24} max={24} value={offsetY} disabled={busy} className={`block ${input}`} onChange={(e) => setOffsetY(Number(e.target.value) || 0)} /></label>
      </div>
      <label className="text-xs">Escala {Math.round(scale * 100)}% (100% = nativo)<input aria-label="Tamaño del diseño" type="range" min={0.25} max={2} step={0.05} value={scale} disabled={busy} className="block w-full accent-primary" onChange={(e) => setScale(Number(e.target.value))} /></label>
      {!ready && !error && <p className="text-center text-xs text-muted-foreground">Preparando vista previa…</p>}
      {ready && <div className="flex flex-col items-center gap-1.5">
        <GaniViewer key={kind} look={{ ...look, [`${kind}_id`]: previewId }} initialAnim={kind === "melee" ? "sword" : "walk"} initialZoom={3} compact />
        <span className="text-xs text-muted-foreground">{result?.frames} fotograma(s) · escala nativa Graal</span>
      </div>}
      <Button disabled={!ready || busy} onClick={() => void save()}>{busy ? "Guardando…" : "Guardar diseño"}</Button>
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}