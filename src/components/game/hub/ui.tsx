import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PxButton({ tone = "default", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "default" | "primary" | "danger" }) {
  const t = tone === "primary" ? "bg-primary text-primary-foreground" : tone === "danger" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground";
  return <button {...p} className={`border-2 border-border px-2 py-1 text-sm leading-none disabled:opacity-40 active:translate-y-px ${t} ${className}`} />;
}
export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-4">
      <div className="mb-1.5 flex items-center justify-between"><h3 className="text-sm text-primary">{title}</h3>{right}</div>
      {children}
    </section>
  );
}
export function Row({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 border-b border-border/60 py-1.5 text-sm last:border-0">{children}</div>;
}
export function Empty({ children }: { children: ReactNode }) { return <p className="text-sm text-muted-foreground">{children}</p>; }
export function PxInput(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`min-w-0 border-2 border-border bg-input px-2 py-1 text-base text-foreground outline-none focus:border-primary ${p.className ?? ""}`} />;
}
export function GangBadge({ g }: { g?: { tag: string; emblem: string; color: string } | null | undefined }) {
  if (!g) return null;
  return <span className="inline-flex items-center gap-1 whitespace-nowrap"><span>{g.emblem}</span><span style={{ color: g.color }}>[{g.tag}]</span></span>;
}
export function HpBar({ hp, max, className = "" }: { hp: number; max: number; className?: string }) {
  const k = Math.max(0, Math.min(1, hp / Math.max(1, max)));
  return (
    <div className={`h-2.5 border-2 border-border bg-background ${className}`}>
      <div className={`h-full ${k > 0.5 ? "bg-accent" : k > 0.25 ? "bg-primary" : "bg-destructive"}`} style={{ width: `${k * 100}%` }} />
    </div>
  );
}
