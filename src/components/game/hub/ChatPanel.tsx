import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/game/api";
import type { GameData } from "@/lib/game/useGameData";
import { Empty, PxButton, PxInput } from "./ui";

type Channel = "global" | "gang" | "alliance";
const TABLE = { global: "global_chat_messages", gang: "gang_chat_messages", alliance: "alliance_chat_messages" } as const;

export function ChatPanel({ d, userId }: { d: GameData; userId: string }) {
  const [ch, setCh] = useState<Channel>("global");
  const [text, setText] = useState("");
  const qc = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);
  const gangId = d.myGang?.id ?? null;
  const allowed = ch === "global" || !!gangId;
  const key = ["chat", ch, gangId, d.allies.join(",")];
  const { data: msgs = [] } = useQuery({
    queryKey: key, enabled: allowed,
    queryFn: async () => {
      const { data } = await supabase.from(TABLE[ch]).select("*").order("created_at", { ascending: false }).limit(60);
      return (data ?? []).reverse();
    },
  });
  useEffect(() => {
    if (!allowed) return;
    const c = supabase.channel(`chat-${ch}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE[ch] }, () => void qc.invalidateQueries({ queryKey: ["chat", ch] }))
      .subscribe();
    return () => { void supabase.removeChannel(c); };
  }, [ch, allowed, qc]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length, ch]);

  const staff = d.myMember?.role === "leader" || d.myMember?.role === "officer";
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (await rpc("send_chat", { _channel: ch, _body: text }) !== undefined) setText("");
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex gap-1">{(["global", "gang", "alliance"] as const).map((c) => (
        <PxButton key={c} className="flex-1 capitalize" tone={c === ch ? "primary" : "default"} onClick={() => setCh(c)}>{c}</PxButton>
      ))}</div>
      <div className="min-h-0 flex-1 overflow-y-auto border-2 border-border bg-background/60 p-2 text-sm">
        {!allowed ? <Empty>Join a gang to use this chat.</Empty> : msgs.length === 0 ? <Empty>No messages yet.</Empty> : msgs.map((m) => (
          <div key={m.id} className="group mb-1 break-words leading-snug">
            <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} </span>
            {m.tag && <span className="text-accent">[{m.tag}] </span>}
            <span className={m.user_id === userId ? "text-primary" : "text-foreground"}>{m.username}: </span>
            {m.deleted ? <span className="italic text-muted-foreground">message removed</span> : <span className="text-foreground">{m.body}</span>}
            {!m.deleted && (m.user_id === userId || (ch === "gang" && staff)) && (
              <button className="ml-1 text-xs text-muted-foreground underline" onClick={() => void rpc("delete_chat", { _channel: ch, _id: m.id })}>remove</button>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="mt-2 flex gap-2">
        <PxInput className="flex-1" maxLength={200} placeholder={allowed ? `Message ${ch}…` : "Not available"} disabled={!allowed} value={text} onChange={(e) => setText(e.target.value)} />
        <PxButton tone="primary" disabled={!allowed || !text.trim()}>Send</PxButton>
      </form>
    </div>
  );
}
