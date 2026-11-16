import { useState } from "react";
import type { GameData } from "@/lib/game/useGameData";
import { GangPanel } from "./GangPanel";
import { AlliancePanel } from "./AlliancePanel";
import { BasesPanel } from "./BasesPanel";
import { InventoryPanel } from "./InventoryPanel";
import { ChatPanel } from "./ChatPanel";
import { RankingPanel } from "./RankingPanel";

export type MenuTab = "gang" | "allies" | "bases" | "bag" | "chat" | "rank";
const TABS: { id: MenuTab; label: string }[] = [
  { id: "gang", label: "Gang" }, { id: "allies", label: "Allies" }, { id: "bases", label: "Bases" },
  { id: "bag", label: "Bag" }, { id: "chat", label: "Chat" }, { id: "rank", label: "Rank" },
];

export function GameMenu({ d, userId, initial, onClose }: { d: GameData; userId: string; initial: MenuTab; onClose: () => void }) {
  const [tab, setTab] = useState<MenuTab>(initial);
  const inviteCount = d.myGang ? 0 : d.invites.length;
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-background/50 sm:items-center" onClick={onClose}>
      <div className="pixel-panel flex h-[85dvh] w-full max-w-md flex-col sm:h-[min(640px,94dvh)] landscape:max-w-xl" onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center gap-1 border-b-2 border-border p-1.5">
          <div className="flex flex-1 gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative shrink-0 px-2.5 py-1.5 text-sm ${t.id === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {t.label}{t.id === "gang" && inviteCount > 0 && <span className="ml-1 bg-destructive px-1 text-xs text-destructive-foreground">{inviteCount}</span>}
              </button>
            ))}
          </div>
          <button onClick={onClose} aria-label="Close" className="px-2 py-1 text-lg text-muted-foreground">✕</button>
        </div>
        <div className={`min-h-0 flex-1 p-3 ${tab === "chat" ? "flex flex-col" : "overflow-y-auto"}`}>
          {tab === "gang" && <GangPanel d={d} userId={userId} />}
          {tab === "allies" && <AlliancePanel d={d} />}
          {tab === "bases" && <BasesPanel d={d} />}
          {tab === "bag" && <InventoryPanel d={d} />}
          {tab === "chat" && <ChatPanel d={d} userId={userId} />}
          {tab === "rank" && <RankingPanel d={d} />}
        </div>
      </div>
    </div>
  );
}
