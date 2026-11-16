import { useState } from "react";
import { rpc } from "@/lib/game/api";
import type { GameData } from "@/lib/game/useGameData";
import { Empty, GangBadge, PxButton, PxInput, Row, Section } from "./ui";

export function AlliancePanel({ d }: { d: GameData }) {
  const [tag, setTag] = useState("");
  const g = d.myGang;
  if (!g) return <Empty>Join or create a gang to form alliances.</Empty>;
  const staff = d.myMember?.role !== "member";
  const mine = d.alliances.filter((a) => a.gang_a === g.id || a.gang_b === g.id);
  const other = (a: (typeof mine)[number]) => d.gangById[a.gang_a === g.id ? a.gang_b : a.gang_a];
  const active = mine.filter((a) => a.status === "active");
  const incoming = mine.filter((a) => a.status === "pending" && a.requested_by !== g.id);
  const outgoing = mine.filter((a) => a.status === "pending" && a.requested_by === g.id);
  return (
    <div>
      <Section title={`Allies (${active.length}/6)`}>
        {active.length === 0 ? <Empty>No allies yet.</Empty> : active.map((a) => (
          <Row key={a.id}><span className="flex-1"><GangBadge g={other(a)} /> {other(a)?.name}</span>
            {staff && <PxButton tone="danger" onClick={() => confirm("End this alliance?") && void rpc("remove_alliance", { _id: a.id })}>Remove</PxButton>}</Row>
        ))}
      </Section>
      {incoming.length > 0 && <Section title="Requests received">{incoming.map((a) => (
        <Row key={a.id}><span className="flex-1"><GangBadge g={other(a)} /> {other(a)?.name}</span>
          {staff && <><PxButton tone="primary" onClick={() => void rpc("respond_alliance", { _id: a.id, _accept: true }, "Alliance formed")}>Accept</PxButton>
            <PxButton onClick={() => void rpc("respond_alliance", { _id: a.id, _accept: false })}>Reject</PxButton></>}</Row>
      ))}</Section>}
      {outgoing.length > 0 && <Section title="Requests sent">{outgoing.map((a) => (
        <Row key={a.id}><span className="flex-1"><GangBadge g={other(a)} /> {other(a)?.name}</span>
          {staff && <PxButton onClick={() => void rpc("remove_alliance", { _id: a.id })}>Cancel</PxButton>}</Row>
      ))}</Section>}
      {staff && (
        <Section title="Request alliance">
          <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await rpc("request_alliance", { _tag: tag }, "Request sent") !== undefined) setTag(""); }}>
            <PxInput className="flex-1 uppercase" placeholder="Gang TAG" value={tag} maxLength={5} onChange={(e) => setTag(e.target.value.toUpperCase())} />
            <PxButton tone="primary" disabled={tag.length < 2}>Send</PxButton>
          </form>
        </Section>
      )}
      <Section title="All gangs">
        {d.gangs.filter((x) => x.id !== g.id).map((x) => <Row key={x.id}><GangBadge g={x} /><span className="flex-1 truncate">{x.name}</span></Row>)}
      </Section>
    </div>
  );
}
