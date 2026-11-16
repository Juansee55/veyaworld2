import type { GameData } from "@/lib/game/useGameData";
import { GangBadge, HpBar, Row, Section } from "./ui";

export const STATUS_LABEL: Record<string, string> = { idle: "Calm", attacking: "Under attack", repairing: "Repairing", contested: "Contested", captured: "Just captured" };

export function BasesPanel({ d }: { d: GameData }) {
  return (
    <Section title="The 8 Frontier bases">
      <p className="mb-2 text-xs text-muted-foreground">Stand in the glowing circle in a base's main room: attackers take 1 HP every 3 s, the owner repairs 1 HP every 3 s. Enemies on both sides pause it.</p>
      {d.bases.map((b) => {
        const owner = b.owner_gang_id ? d.gangById[b.owner_gang_id] : null;
        const att = b.attacker_gang_id ? d.gangById[b.attacker_gang_id] : null;
        return (
          <Row key={b.id}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2"><span className="truncate">{b.name}</span><span className="text-xs text-muted-foreground">{b.hp}/{b.max_hp}</span></div>
              <HpBar hp={b.hp} max={b.max_hp} className="my-1" />
              <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                <span>{owner ? <>Owner <GangBadge g={owner} /></> : "Unclaimed"}</span>
                <span className={b.status === "attacking" ? "text-destructive" : b.status === "contested" ? "text-primary" : b.status === "repairing" ? "text-accent" : ""}>{STATUS_LABEL[b.status] ?? b.status}</span>
                {att && b.status === "attacking" && <span>by <GangBadge g={att} /></span>}
              </div>
            </div>
          </Row>
        );
      })}
    </Section>
  );
}
