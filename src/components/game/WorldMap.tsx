import { useEffect, useMemo, useRef, useState } from "react";
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { BASES } from "@/game/bases/defs";
import { TILE } from "@/game/maps/tiles";
import { baseArea, locateOnWorld, startArea, worldLayout } from "@/game/maps/worldLayout";
import type { WorldSnapshot } from "@/game/scenes/WorldScene";
import type { GameData } from "@/lib/game/useGameData";
import { STATUS_LABEL } from "./hub/BasesPanel";

const NEUTRAL = "#9a96a0";

/** Full overview of the world with live base ownership and where you are. */
export function WorldMap({ d, online, getSnapshot, onClose }: {
  d: GameData; online: number; getSnapshot: () => WorldSnapshot | null; onClose: () => void;
}) {
  const L = worldLayout();
  const W = L.width * TILE, H = L.height * TILE;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<ReactZoomPanPinchRef>(null);
  const [ready, setReady] = useState(false);
  const [fit, setFit] = useState<number | null>(null);
  const [zones, setZones] = useState(true);
  const [list, setList] = useState(false);
  const [snap, setSnap] = useState<WorldSnapshot | null>(() => getSnapshot());

  useEffect(() => {
    setFit(Math.min(window.innerWidth / W, window.innerHeight / H));
    let alive = true;
    void import("@/game/art/worldMapArt").then((m) => m.renderWorldMap()).then((src) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!alive || !ctx) return;
      ctx.drawImage(src, 0, 0);
      setReady(true);
    });
    const t = setInterval(() => setSnap(getSnapshot()), 500);
    return () => { alive = false; clearInterval(t); };
  }, [W, H, getSnapshot]);

  const me = snap ? locateOnWorld(snap.mapId, snap.x, snap.y) : null;
  const others = useMemo(() => (snap?.players ?? []).map((p) => ({ ...p, at: locateOnWorld(snap!.mapId, p.x, p.y) })).filter((p) => p.at && !me?.inside), [snap, me?.inside]);
  const friendly = (gangId: string | null) => !!gangId && !!d.myGang && (gangId === d.myGang.id || d.allies.includes(gangId));
  const myBases = d.myGang ? d.bases.filter((b) => b.owner_gang_id === d.myGang!.id).length : 0;
  const start = startArea();
  const focus = (id: string, scale = 1.4) => api.current?.zoomToElement(id, scale, 400);

  return (
    <div className="absolute inset-0 z-30 bg-background">
      {fit !== null && (
        <TransformWrapper ref={api} initialScale={fit} minScale={fit * 0.8} maxScale={4} centerOnInit limitToBounds={false}
          doubleClick={{ disabled: true }} wheel={{ step: 0.08 }}>
          <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
            <div className="relative" style={{ width: W, height: H }}>
              <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 [image-rendering:pixelated]" />
              {L.maps.map((m) => (
                <div key={m.id} className="pointer-events-none absolute text-center text-[40px] text-foreground/80 [text-shadow:3px_3px_0_var(--color-background)]"
                  style={{ left: m.x * TILE, top: m.y * TILE + 40, width: m.w * TILE }}>{m.name}</div>
              ))}
              {zones && (
                <>
                  <div className="pointer-events-none absolute flex items-center justify-center border-4 border-accent bg-accent/40 text-[44px] text-foreground [text-shadow:3px_3px_0_var(--color-background)]"
                    style={{ left: start.x * TILE, top: start.y * TILE, width: start.w * TILE, height: start.h * TILE }}>Start</div>
                  {BASES.map((spec) => {
                    const b = d.bases.find((x) => x.id === spec.id);
                    const owner = b?.owner_gang_id ? d.gangById[b.owner_gang_id] : null;
                    const color = owner?.color ?? NEUTRAL;
                    const a = baseArea(spec.id);
                    const busy = b && (b.status === "attacking" || b.status === "contested");
                    return (
                      <div key={spec.id} id={`map-base-${spec.id}`}
                        className={`pointer-events-none absolute flex flex-col items-center justify-center border-4 text-center leading-tight text-foreground [text-shadow:3px_3px_0_var(--color-background)] ${busy ? "animate-pulse" : ""}`}
                        style={{ left: a.x * TILE, top: a.y * TILE, width: a.w * TILE, height: a.h * TILE, borderColor: color, backgroundColor: color + "66" }}>
                        <span className="text-[30px]">{spec.name}</span>
                        <span className="text-[26px]" style={{ color: owner ? color : undefined }}>{owner ? `${owner.emblem} [${owner.tag}]` : "Unclaimed"}</span>
                        {b && <span className="text-[22px]">{b.hp}/{b.max_hp} HP · {STATUS_LABEL[b.status] ?? b.status}</span>}
                      </div>
                    );
                  })}
                </>
              )}
              {others.map((p) => (
                <div key={p.id} className={`pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 border-2 border-background ${friendly(p.gangId) ? "bg-accent" : p.gangId ? "bg-destructive" : "bg-foreground"}`}
                  style={{ left: p.at!.x * TILE, top: p.at!.y * TILE }} />
              ))}
              {me && (
                <div id="map-me" className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: me.x * TILE, top: me.y * TILE }}>
                  <span className="whitespace-nowrap bg-background/80 px-2 text-[26px] text-primary">{me.inside ? `You · inside ${me.inside}` : "You"}</span>
                  <span className="h-8 w-8 animate-pulse rounded-full border-4 border-background bg-primary" />
                </div>
              )}
            </div>
          </TransformComponent>
        </TransformWrapper>
      )}
      {!ready && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Drawing map…</div>}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))", paddingLeft: "max(12px, env(safe-area-inset-left))", paddingRight: "max(12px, env(safe-area-inset-right))" }}>
        <div className="pointer-events-auto flex flex-col gap-2">
          <button onClick={() => setZones((z) => !z)} className={`pixel-panel px-3 py-2 text-sm ${zones ? "text-primary" : "text-muted-foreground"}`}>Zones</button>
          <button onClick={() => setList((l) => !l)} className={`pixel-panel px-3 py-2 text-sm ${list ? "text-primary" : "text-foreground"}`}>Bases</button>
        </div>
        <div className="pixel-panel px-3 py-1.5 text-center text-sm leading-tight">
          <div className="text-primary">Veya World</div>
          <div className="text-muted-foreground">{d.myGang ? `[${d.myGang.tag}] holds ${myBases}/${d.bases.length} bases` : "Join a gang to capture bases"}</div>
        </div>
        {list ? (
          <div className="pixel-panel pointer-events-auto flex max-h-[60dvh] w-44 flex-col overflow-y-auto">
            {BASES.map((spec) => {
              const b = d.bases.find((x) => x.id === spec.id);
              const owner = b?.owner_gang_id ? d.gangById[b.owner_gang_id] : null;
              return (
                <button key={spec.id} onClick={() => { setZones(true); void focus(`map-base-${spec.id}`, 0.9); }}
                  className="border-b border-border/60 px-2 py-1.5 text-left text-xs last:border-0">
                  <div className="truncate text-foreground">{spec.name}</div>
                  <div className="truncate" style={{ color: owner?.color }}>{owner ? `[${owner.tag}]` : "Unclaimed"} · {b?.hp ?? "?"}/{b?.max_hp ?? 25}</div>
                </button>
              );
            })}
          </div>
        ) : <div className="w-16" />}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-3 items-end gap-2 p-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))", paddingLeft: "max(12px, env(safe-area-inset-left))", paddingRight: "max(12px, env(safe-area-inset-right))" }}>
        <button onClick={onClose} className="pixel-panel pointer-events-auto flex items-center gap-2 justify-self-start px-3 py-2 text-base text-foreground">
          <span className="h-3 w-3 rounded-full bg-destructive" />Back
        </button>
        <button onClick={() => me && void focus("map-me")} disabled={!me} className="pixel-panel pointer-events-auto justify-self-center px-4 py-2 text-base text-primary disabled:opacity-40">Focus</button>
        <div className="pixel-panel justify-self-end px-3 py-2 text-right text-sm text-foreground">{online} on this map</div>
      </div>
    </div>
  );
}
