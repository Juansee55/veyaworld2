import { useState } from "react";
import { fmtHs } from "@/lib/game/api";
import type { GameData } from "@/lib/game/useGameData";
import { Empty, GangBadge, PxButton, Row, Section } from "./ui";

export function RankingPanel({ d }: { d: GameData }) {
  const [mode, setMode] = useState<"daily" | "total">("daily");
  const rows = (mode === "daily" ? d.daily : d.total).filter((r) => r.hours > 0 && d.gangById[r.gang_id]);
  return (
    <div>
      <div className="mb-3 flex gap-1">
        <PxButton className="flex-1" tone={mode === "daily" ? "primary" : "default"} onClick={() => setMode("daily")}>Daily</PxButton>
        <PxButton className="flex-1" tone={mode === "total" ? "primary" : "default"} onClick={() => setMode("total")}>Total</PxButton>
      </div>
      <Section title={mode === "daily" ? `Today ${d.today ?? ""}` : "All time"}>
        {rows.length === 0 ? <Empty>No gang has earned hours yet. Hold bases to earn them.</Empty> : rows.map((r, i) => (
          <Row key={r.gang_id}>
            <span className="w-6 text-primary">#{i + 1}</span>
            <span className="flex-1 truncate"><GangBadge g={d.gangById[r.gang_id]} /> {d.gangById[r.gang_id]?.name}</span>
            <span className={r.gang_id === d.myGang?.id ? "text-accent" : ""}>{fmtHs(r.hours)}</span>
          </Row>
        ))}
      </Section>
      {d.myGang && (
        <Section title="Your gang · last 14 days">
          {d.history.length === 0 ? <Empty>No records yet.</Empty> : d.history.map((h) => (
            <Row key={h.day}><span className="flex-1">{h.day}</span><span>{fmtHs(h.hours)}</span></Row>
          ))}
        </Section>
      )}
      <p className="text-xs text-muted-foreground">Cada base suma 1 minuto por minuto real. El ranking diario se reinicia a medianoche.</p>
    </div>
  );
}
