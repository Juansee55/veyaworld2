import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Square pixel HUD button with an icon and a tiny caption. */
export function IconButton({ icon, label, onClick, badge, tone = "default", size = "md", disabled }: {
  icon: ReactNode; label: string; onClick: () => void; badge?: number; tone?: "default" | "primary"; size?: "sm" | "md"; disabled?: boolean;
}) {
  const dim = size === "sm" ? "h-11 w-11" : "h-12 w-12";
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label={label} title={label} disabled={disabled}
      className={`game-control pointer-events-auto relative flex ${dim} shrink-0 items-center justify-center p-1 leading-none active:translate-y-px disabled:opacity-40 ${tone === "primary" ? "text-accent" : "text-foreground"}`}>
      <span className="flex h-8 items-center justify-center [&_svg]:h-7 [&_svg]:w-7">{icon}</span>
      {!!badge && badge > 0 && <span className="absolute -right-1.5 -top-1.5 bg-destructive px-1 text-[10px] text-destructive-foreground">{badge}</span>}
    </Button>
  );
}
