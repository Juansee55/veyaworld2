import { useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Layer } from "@/game/art/layers";
import type { Direction, Look, PreviewAnim } from "@/game/catalog";
import { CharacterCanvas, type ViewerBackdrop } from "./CharacterCanvas";

const ANIMS: { id: PreviewAnim; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "walk", label: "Walk" },
  { id: "sword", label: "Sword" },
  { id: "sit", label: "Sit" },
  { id: "swim", label: "Swim" },
];

const VIEWER_DIRS: { id: Direction; label: string }[] = [
  { id: "up", label: "▲ Up" },
  { id: "left", label: "◄ Left" },
  { id: "down", label: "▼ Down" },
  { id: "right", label: "► Right" },
];

const ZOOMS = [1, 2, 3, 4] as const;

const BACKDROPS: { id: ViewerBackdrop; label: string }[] = [
  { id: "checker", label: "Cuadrícula" },
  { id: "dark", label: "Oscuro" },
  { id: "meadow", label: "Césped" },
];

const LAYER_ITEMS: { id: Layer; label: string }[] = [
  { id: "body", label: "Body" },
  { id: "head", label: "Head" },
  { id: "hat", label: "Hat" },
  { id: "melee", label: "Espada" },
];

export function GaniViewer({
  look,
  initialAnim = "idle",
  initialZoom = 3,
  compact = false,
}: {
  look: Look;
  initialAnim?: PreviewAnim;
  initialZoom?: 1 | 2 | 3 | 4;
  compact?: boolean;
}) {
  const [anim, setAnim] = useState<PreviewAnim>(initialAnim);
  const [dir, setDir] = useState<Direction>("down");
  const [zoom, setZoom] = useState<1 | 2 | 3 | 4>(initialZoom);
  const [backdrop, setBackdrop] = useState<ViewerBackdrop>("checker");
  const [paused, setPaused] = useState(false);
  const [frameStep, setFrameStep] = useState(0);
  const [visible, setVisible] = useState<Record<Layer, boolean>>({
    body: true,
    head: true,
    hat: true,
    melee: true,
  });

  const toggleLayer = (layer: Layer) => {
    setVisible((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const stepFrame = (delta: number) => {
    setPaused(true);
    setFrameStep((s) => s + delta);
  };

  return (
    <div className="flex w-full flex-col gap-2 border-2 border-border bg-card/70 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Animación gani">
          {ANIMS.map((a) => (
            <Button
              key={a.id}
              type="button"
              size="sm"
              variant={anim === a.id ? "default" : "secondary"}
              className="h-7 px-2 text-xs"
              onClick={() => setAnim(a.id)}
            >
              {a.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Zoom del visor">
          {ZOOMS.map((z) => (
            <Button
              key={z}
              type="button"
              size="sm"
              variant={zoom === z ? "default" : "secondary"}
              className="h-7 px-1.5 text-xs"
              onClick={() => setZoom(z)}
            >
              {z}x
            </Button>
          ))}
        </div>
      </div>

      <div className={`flex items-center justify-center overflow-hidden border-2 border-border bg-muted/40 p-2 ${compact ? "min-h-40" : "min-h-56"}`}>
        <CharacterCanvas
          look={look}
          dir={dir}
          anim={anim}
          scale={zoom}
          paused={paused}
          frameStep={frameStep}
          visibleLayers={visible}
          backdrop={backdrop}
          className="border border-border/60"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Dirección">
          {VIEWER_DIRS.map((d) => (
            <Button
              key={d.id}
              type="button"
              size="sm"
              variant={dir === d.id ? "default" : "secondary"}
              className="h-7 px-2 text-xs"
              onClick={() => setDir(d.id)}
            >
              {d.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Control de reproducción">
          <Button type="button" size="sm" variant="secondary" className="h-7 px-1.5" aria-label="Fotograma anterior" onClick={() => stepFrame(-1)}>
            <SkipBack className="size-3.5" />
          </Button>
          <Button type="button" size="sm" variant={paused ? "default" : "secondary"} className="h-7 px-2 text-xs" aria-label={paused ? "Reproducir" : "Pausar"} onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </Button>
          <Button type="button" size="sm" variant="secondary" className="h-7 px-1.5" aria-label="Fotograma siguiente" onClick={() => stepFrame(1)}>
            <SkipForward className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-border/60 pt-1.5">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Capas visibles">
          {LAYER_ITEMS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={visible[item.id] ? "default" : "outline"}
              className="h-6 px-2 text-[11px]"
              onClick={() => toggleLayer(item.id)}
            >
              {visible[item.id] ? "✓ " : ""}{item.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1" role="group" aria-label="Fondo del visor">
          {BACKDROPS.map((bg) => (
            <Button
              key={bg.id}
              type="button"
              size="sm"
              variant={backdrop === bg.id ? "default" : "outline"}
              className="h-6 px-2 text-[11px]"
              onClick={() => setBackdrop(bg.id)}
            >
              {bg.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
