import { useState } from "react";
import { rpc, fmtHs } from "@/lib/game/api";
import type { GameData } from "@/lib/game/useGameData";
import { Empty, GangBadge, PxButton, PxInput, Row, Section } from "./ui";

const EMBLEMS = ["⚔", "🛡", "💀", "🔥", "⚡", "🐺", "🦅", "👑", "🌙", "⭐", "🗡", "🐉"];
const COLORS = ["#e0b040", "#e05a4a", "#4ab0e0", "#6ee06e", "#c070f0", "#f0f0f0", "#f08a3a", "#40d0c0"];

export function GangPanel({ d, userId }: { d: GameData; userId: string }) {
  const g = d.myGang;
  if (!g) return <NoGang d={d} />;
  const role = d.myMember?.role;
  const staff = role === "leader" || role === "officer";
  const members = d.members.filter((m) => m.gang_id === g.id).sort((a, b) => ["leader", "officer", "member"].indexOf(a.role) - ["leader", "officer", "member"].indexOf(b.role));
  const total = d.total.find((t) => t.gang_id === g.id)?.hours ?? 0;
  const dayHs = d.daily.find((t) => t.gang_id === g.id)?.hours ?? 0;
  const owned = d.bases.filter((b) => b.owner_gang_id === g.id);
  const sent = d.invites.filter((i) => i.gang_id === g.id);
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center border-2 border-border text-2xl" style={{ backgroundColor: g.color + "33" }}>{g.emblem}</div>
        <div className="min-w-0">
          <div className="truncate text-lg text-foreground">{g.name} <span style={{ color: g.color }}>[{g.tag}]</span></div>
          <div className="text-xs text-muted-foreground">{members.length}/30 members · Today {fmtHs(dayHs)} · Total {fmtHs(total)}</div>
        </div>
      </div>
      <Section title={`Bases (${owned.length})`}>
        {owned.length === 0 ? <Empty>No bases controlled yet. Capture one in the Frontier.</Empty> : owned.map((b) => (
          <Row key={b.id}>
            <span className="flex-1">{b.name} · {b.hp}/{b.max_hp}</span>
            {g.preferred_base_id === b.id ? <span className="text-xs text-accent">Respawn here</span>
              : staff && <PxButton onClick={() => void rpc("set_preferred_base", { _base: b.id }, "Preferred respawn set")}>Set respawn</PxButton>}
          </Row>
        ))}
      </Section>
      {staff && <InviteBox />}
      <Section title="Members">
        {members.map((m) => (
          <Row key={m.user_id}>
            <span className="flex-1 truncate">{d.names[m.user_id] ?? "…"}{m.user_id === userId && " (you)"}</span>
            <span className={`text-xs ${m.role === "leader" ? "text-primary" : m.role === "officer" ? "text-accent" : "text-muted-foreground"}`}>{m.role}</span>
            {role === "leader" && m.role !== "leader" && (
              <>
                <PxButton onClick={() => void rpc("set_member_role", { _user: m.user_id, _role: m.role === "officer" ? "member" : "officer" })}>{m.role === "officer" ? "Demote" : "Promote"}</PxButton>
                <PxButton onClick={() => confirm(`Make ${d.names[m.user_id]} the leader?`) && void rpc("transfer_leadership", { _user: m.user_id }, "Leadership transferred")}>Lead</PxButton>
              </>
            )}
            {staff && m.role !== "leader" && m.user_id !== userId && (role === "leader" || m.role === "member") && (
              <PxButton tone="danger" onClick={() => confirm("Remove this member?") && void rpc("kick_member", { _user: m.user_id })}>Kick</PxButton>
            )}
          </Row>
        ))}
      </Section>
      {staff && sent.length > 0 && (
        <Section title="Pending invitations">
          {sent.map((i) => (
            <Row key={i.id}><span className="flex-1">{d.names[i.user_id] ?? "…"}</span>
              <PxButton onClick={() => void rpc("cancel_invitation", { _id: i.id })}>Cancel</PxButton></Row>
          ))}
        </Section>
      )}
      <div className="flex gap-2">
        <PxButton tone="danger" onClick={() => confirm("Leave your gang?") && void rpc("leave_gang", undefined, "You left the gang")}>Leave gang</PxButton>
        {role === "leader" && <PxButton tone="danger" onClick={() => confirm(`Disband ${g.name}? This cannot be undone.`) && void rpc("disband_gang", undefined, "Gang disbanded")}>Disband</PxButton>}
      </div>
    </div>
  );
}

function InviteBox() {
  const [name, setName] = useState("");
  return (
    <Section title="Invite player">
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await rpc("invite_player", { _username: name }, "Invitation sent") !== undefined) setName(""); }}>
        <PxInput className="flex-1" placeholder="Player name" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} />
        <PxButton tone="primary" disabled={!name.trim()}>Invite</PxButton>
      </form>
    </Section>
  );
}

function NoGang({ d }: { d: GameData }) {
  const [name, setName] = useState(""); const [tag, setTag] = useState("");
  const [emblem, setEmblem] = useState(EMBLEMS[0]!); const [color, setColor] = useState(COLORS[0]!);
  const mine = d.invites;
  return (
    <div>
      <Section title="Invitations">
        {mine.length === 0 ? <Empty>No invitations right now.</Empty> : mine.map((i) => (
          <Row key={i.id}>
            <span className="flex-1"><GangBadge g={d.gangById[i.gang_id]} /> {d.gangById[i.gang_id]?.name}</span>
            <PxButton tone="primary" onClick={() => void rpc("respond_invitation", { _id: i.id, _accept: true }, "Welcome to the gang!")}>Join</PxButton>
            <PxButton onClick={() => void rpc("respond_invitation", { _id: i.id, _accept: false })}>Reject</PxButton>
          </Row>
        ))}
      </Section>
      <Section title="Create a gang">
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void rpc("create_gang", { _name: name, _tag: tag, _emblem: emblem, _color: color }, "Gang created!"); }}>
          <PxInput className="w-full" placeholder="Gang name (3-24)" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
          <PxInput className="w-full uppercase" placeholder="TAG (2-5)" value={tag} maxLength={5} onChange={(e) => setTag(e.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase())} />
          <div className="flex flex-wrap gap-1">{EMBLEMS.map((em) => (
            <button type="button" key={em} onClick={() => setEmblem(em)} className={`h-9 w-9 border-2 text-lg ${em === emblem ? "border-primary" : "border-border"}`}>{em}</button>
          ))}</div>
          <div className="flex flex-wrap gap-1">{COLORS.map((c) => (
            <button type="button" key={c} aria-label={`Color ${c}`} onClick={() => setColor(c)} className={`h-7 w-7 border-2 ${c === color ? "border-primary" : "border-border"}`} style={{ backgroundColor: c }} />
          ))}</div>
          <PxButton tone="primary" className="w-full py-2" disabled={name.trim().length < 3 || tag.length < 2}>Create gang</PxButton>
        </form>
      </Section>
    </div>
  );
}
