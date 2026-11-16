import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type Direction, type Look } from "@/game/catalog";
import { fmtHs } from "@/lib/game/api";
import type { GameData } from "@/lib/game/useGameData";
import { CharacterCanvas, HEAD_CROP } from "./CharacterCanvas";
import { GangBadge } from "./hub/ui";
import { PxButton } from "./hub/ui";

const ROLE: Record<string, string> = { leader: "Leader", officer: "Officer", member: "Member" };
const TURN: Direction[] = ["down", "left", "up", "right"];

/** Opens when you tap your own character: who you are, your gang, health and gear. */
export function ProfileCard({ d, look, username, mapName, landscape, buttonsHidden, onClose, onEdit, onBag, onToggleButtons, onExit, onSecret, onStatus }: {
  d: GameData; look: Look; username: string; mapName: string; landscape: boolean; buttonsHidden: boolean;
  onClose: () => void; onEdit: () => void; onBag: () => void; onToggleButtons: () => void; onExit: () => void; onSecret?: () => void; onStatus: () => void;
}) {
  const [turn, setTurn] = useState(0);
  const [walking, setWalking] = useState(false);
  const [taps, setTaps] = useState<number[]>([]);
  // Secret: tap your name 5 times quickly (admins only).
  const tapName = () => { const now = Date.now(); const t = [...taps.filter((x) => now - x < 2000), now]; setTaps(t.length >= 5 ? [] : t); if (t.length >= 5) onSecret?.(); };
  const dir = TURN[((turn % 4) + 4) % 4]!;
  const g = d.myGang;
  const c = d.combat;
  const total = g ? d.total.find((t) => t.gang_id === g.id)?.hours ?? 0 : 0;
  const today = g ? d.daily.find((t) => t.gang_id === g.id)?.hours ?? 0 : 0;
  const bases = g ? d.bases.filter((b) => b.owner_gang_id === g.id).length : 0;
  const equipped = d.myWeapons.find((w) => w.equipped)?.weapon_id ?? "fists";
  const weapon = d.weapons.find((w) => w.id === equipped);
  const bandages = d.myItems.find((i) => i.item_id === "bandage")?.qty ?? 0;

  const stats: [string, React.ReactNode, string?][] = [
    ["Gang", g ? <span className="inline-flex flex-wrap items-center justify-end gap-1"><GangBadge g={g} /> <span className="truncate">{g.name}</span></span> : "No gang"],
    ["Rank", g ? ROLE[d.myMember?.role ?? ""] ?? "Member" : "—"],
    ["Gang hours", g ? `${fmtHs(today)} today · ${fmtHs(total)}` : "—"],
    ["Health", c ? `${c.hp}/${c.max_hp}` : "—", "text-destructive"],
    ["Gralats", (d.wallet?.gralats ?? 0).toLocaleString(), "text-primary"],
    ["Weapon", weapon ? `${weapon.name} (${weapon.damage} dmg)` : "Fists"],
    ["Bases", g ? `${bases} of ${d.bases.length}` : "—"],
    ["Allies", g ? `${d.allies.length} gangs` : "—"],
    ["Location", mapName || "—"],
  ];

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background/95"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}>
      <header className="flex min-w-0 items-center gap-3 px-4 pt-3">
        <CharacterCanvas look={look} scale={1} crop={HEAD_CROP} className="border-2 border-border bg-muted" />
        <div className="min-w-0">
          <h2 className="truncate text-2xl text-primary" onClick={tapName}>{username}</h2>
          <div className="truncate text-sm text-muted-foreground">{g ? <><GangBadge g={g} /> {g.name}</> : "Independent player"}</div>
        </div>
      </header>

      <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-3 ${landscape ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6" : "flex flex-col gap-4"}`}>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-base">
          {stats.map(([k, v, tone]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}:</dt>
              <dd className={`min-w-0 text-right ${tone ?? "text-foreground"}`}>{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <CharacterCanvas look={look} dir={dir} walking={walking} scale={landscape ? 2 : 3} className="bg-muted/40" />
            <div className="flex items-center gap-2">
              <button aria-label="Turn left" onClick={() => setTurn((t) => t - 1)} className="pixel-panel p-1.5 text-foreground"><ChevronLeft /></button>
              <button onClick={() => setWalking((w) => !w)} className="pixel-panel px-3 py-1.5 text-sm text-foreground">{walking ? "Stand" : "Walk"}</button>
              <button aria-label="Turn right" onClick={() => setTurn((t) => t + 1)} className="pixel-panel p-1.5 text-foreground"><ChevronRight /></button>
            </div>
            <span className="text-xs text-muted-foreground">Facing {dir}</span>
            <PxButton onClick={onStatus}>Estado</PxButton>
          </div>
          <button onClick={onBag} className="flex flex-col items-center gap-2 text-center">
            <span className="text-xs text-muted-foreground">Tap for<br />inventory</span>
            <span className="pixel-panel flex h-12 w-12 flex-col items-center justify-center text-[10px] leading-tight text-foreground">⚔<span className="max-w-full truncate px-0.5">{weapon?.name.split(" ")[0] ?? "Fists"}</span></span>
            <span className="pixel-panel flex h-12 w-12 flex-col items-center justify-center text-[10px] leading-tight text-foreground">✚<span>{bandages}</span></span>
          </button>
        </div>
      </div>

      <nav className="grid grid-cols-4 gap-2 border-t-2 border-border px-3 py-2 text-sm">
        <button onClick={onClose} className="flex items-center justify-center gap-1.5 py-1.5 text-foreground"><span className="h-2.5 w-2.5 rounded-full bg-destructive" />Back</button>
        <button onClick={onToggleButtons} className="flex items-center justify-center gap-1.5 py-1.5 text-foreground"><span className="h-2.5 w-2.5 rounded-full bg-chart-3" />{buttonsHidden ? "Show buttons" : "Hide buttons"}</button>
        <button onClick={onEdit} className="flex items-center justify-center gap-1.5 py-1.5 text-foreground"><span className="h-2.5 w-2.5 rounded-full bg-primary" />Edit</button>
        <button onClick={onExit} className="flex items-center justify-center gap-1.5 py-1.5 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />Sign out</button>
      </nav>
    </div>
  );
}
