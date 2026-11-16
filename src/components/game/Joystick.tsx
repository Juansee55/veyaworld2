import { useEffect, useRef, useState } from "react";
import { joystick } from "@/game/input";

const RADIUS = 64;

/** Floating virtual joystick: touch anywhere on the left side of the screen. */
export function Joystick({ disabled = false }: { disabled?: boolean }) {
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointerId = useRef<number | null>(null);

  const update = (cx: number, cy: number, b: { x: number; y: number }) => {
    let dx = cx - b.x, dy = cy - b.y;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx = (dx / len) * RADIUS; dy = (dy / len) * RADIUS; }
    setKnob({ x: dx, y: dy });
    joystick.x = dx / RADIUS;
    joystick.y = dy / RADIUS;
    joystick.active = true;
  };
  const end = () => {
    pointerId.current = null;
    setBase(null);
    setKnob({ x: 0, y: 0 });
    joystick.x = 0; joystick.y = 0; joystick.active = false;
  };
  useEffect(() => { if (disabled) end(); }, [disabled]);
  if (disabled) return null;

  return (
    <div
      className="absolute inset-y-0 left-0 w-1/2 touch-none select-none"
      onPointerDown={(e) => {
        if (pointerId.current !== null) return;
        pointerId.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = e.currentTarget.getBoundingClientRect();
        const b = { x: e.clientX - r.left, y: e.clientY - r.top };
        setBase(b);
        update(b.x, b.y, b);
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== pointerId.current || !base) return;
        const r = e.currentTarget.getBoundingClientRect();
        update(e.clientX - r.left, e.clientY - r.top, base);
      }}
      onPointerUp={(e) => e.pointerId === pointerId.current && end()}
      onPointerCancel={(e) => e.pointerId === pointerId.current && end()}
    >
      {(() => {
        const b = base;
        const style = b
          ? { left: b.x - RADIUS, top: b.y - RADIUS }
          : { left: "max(24px, env(safe-area-inset-left))", bottom: "max(28px, env(safe-area-inset-bottom))" };
        return (
          <div
            className={`game-control pointer-events-none absolute rounded-full transition-opacity ${b ? "opacity-100" : "opacity-60"}`}
            style={{ width: RADIUS * 2, height: RADIUS * 2, ...style }}
          >
            <span className="absolute left-1/2 top-0.5 -translate-x-1/2 text-2xl text-foreground/50">△</span>
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-2xl text-foreground/50">▽</span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-2xl text-foreground/50">◁</span>
            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-2xl text-foreground/50">▷</span>
            <div
              className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full border-2 border-foreground/40 bg-foreground/30"
              style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
            />
          </div>
        );
      })()}
    </div>
  );
}
