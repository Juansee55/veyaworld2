import { useEffect, useRef } from "react";
import { IDLE_SEQUENCE, WALK_SEQUENCE, type Direction, type Look, type PreviewAnim } from "@/game/catalog";
import type { Layer } from "@/game/art/layers";

const SIZE = 72; // logical preview canvas (see drawPreview)

export type ViewerBackdrop = "transparent" | "checker" | "dark" | "meadow";

const BACKDROP_STYLE: Record<ViewerBackdrop, React.CSSProperties> = {
  transparent: {},
  checker: {
    backgroundColor: "#d5dae2",
    backgroundImage:
      "linear-gradient(45deg, #b8c0cc 25%, transparent 25%), linear-gradient(-45deg, #b8c0cc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #b8c0cc 75%), linear-gradient(-45deg, transparent 75%, #b8c0cc 75%)",
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
  },
  dark: { backgroundColor: "#171923" },
  meadow: { backgroundColor: "#4c8c42" },
};

/**
 * Animated character drawn with the same layered art as the game.
 * `crop` shows only part of the 72×72 preview (e.g. the head for avatars).
 */
export function CharacterCanvas({
  look, dir = "down", walking = false, anim, scale = 3, crop, className = "",
  paused = false, frameStep, visibleLayers, backdrop = "transparent",
}: {
  look: Look; dir?: Direction; walking?: boolean; anim?: PreviewAnim; scale?: number;
  crop?: { x: number; y: number; w: number; h: number }; className?: string;
  paused?: boolean; frameStep?: number; visibleLayers?: Partial<Record<Layer, boolean>>; backdrop?: ViewerBackdrop;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mode: PreviewAnim = anim ?? (walking ? "walk" : "idle");

  useEffect(() => {
    let raf = 0, t = 0, last = performance.now(), alive = true;
    let draw: typeof import("@/game/art/layers").drawPreview | null = null;
    const render = () => {
      const ctx = ref.current?.getContext("2d");
      if (!ctx || !draw) return;
      let col = 0;
      let swordStep: 0 | 1 | 2 | undefined;
      if (paused && typeof frameStep === "number") {
        if (mode === "sword") swordStep = (((frameStep % 3) + 3) % 3) as 0 | 1 | 2;
        else if (mode === "walk") col = WALK_SEQUENCE[((frameStep % 4) + 4) % 4] ?? 0;
        else if (mode === "idle") col = IDLE_SEQUENCE[((frameStep % 2) + 2) % 2] ?? 0;
      } else {
        if (mode === "walk") col = WALK_SEQUENCE[Math.floor(t / 140) % 4] ?? 0;
        else if (mode === "idle") col = IDLE_SEQUENCE[Math.floor(t / 650) % 2] ?? 0;
        else if (mode === "sword") swordStep = (Math.floor(t / 95) % 3) as 0 | 1 | 2;
      }
      draw(ctx, look, dir, col, scale, paused ? 0 : t, { anim: mode, swordStep, visible: visibleLayers, logicalSize: SIZE });
    };
    void import("@/game/art/layers").then(async (m) => {
      await m.loadLayerArt();
      if (alive) { draw = m.drawPreview; render(); }
    });
    if (paused) {
      return () => { alive = false; };
    }
    const loop = (now: number) => {
      t += now - last; last = now;
      render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [look, dir, mode, scale, paused, frameStep, visibleLayers]);

  const c = crop ?? { x: 0, y: 0, w: SIZE, h: SIZE };
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{ width: c.w * scale, height: c.h * scale, ...BACKDROP_STYLE[backdrop] }}
    >
      <canvas ref={ref} width={SIZE * scale} height={SIZE * scale}
        className="absolute [image-rendering:pixelated]" style={{ left: -c.x * scale, top: -c.y * scale }} />
    </div>
  );
}

/** Head-and-hat crop used for small avatars at native 32×32 Graal scale. */
export const HEAD_CROP = { x: 16, y: 8, w: 40, h: 36 };
