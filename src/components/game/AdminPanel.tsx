import { useEffect, useState } from "react";
import { rpc } from "@/lib/game/api";
import type { AdminFx } from "@/game/scenes/WorldScene";
import { PxButton, PxInput, Row, Section } from "./hub/ui";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";

const SIZES: [string, number][] = [["Small", 0.6], ["Normal", 1], ["Medium", 1.5], ["Giant", 2.5]];
const SPEEDS: [string, number][] = [["Normal", 1], ["Fast", 1.8], ["Turbo", 3]];

/** Secret admin powers. Every change is checked by the server (admins only). */
export function AdminPanel({ fx, onClose, onWorldEdit }: { fx?: AdminFx | undefined; onClose: () => void; onWorldEdit: () => void }) {
  const [f, setF] = useState<AdminFx>(fx ?? { title: "", title_color: "#ff6ad5", invisible: false, fly: false, noclip: false, size: 1, speed: 1 });
  const [admins, setAdmins] = useState<{ user_id: string; username: string }[]>([]);
  const [who, setWho] = useState("");
  const loadAdmins = () => void rpc("list_admins").then((r) => setAdmins(r ?? []));
  useEffect(loadAdmins, []);

  const save = (next: AdminFx) => {
    setF(next);
    void rpc("set_admin_fx", { _title: next.title ?? "", _title_color: next.title_color, _invisible: next.invisible, _fly: next.fly,
      _noclip: next.noclip, _size: next.size, _speed: next.speed });
  };
  const toggle = (k: "invisible" | "fly" | "noclip", label: string) => (
    <PxButton tone={f[k] ? "primary" : "default"} onClick={() => save({ ...f, [k]: !f[k] })}>{label}: {f[k] ? "ON" : "OFF"}</PxButton>
  );

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background/95 p-4" style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl text-primary">Admin</h2><PxButton onClick={onClose}>Back</PxButton></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="World"><PxButton tone="primary" onClick={onWorldEdit}>Edit world</PxButton></Section>
        <Section title="Data"><Button asChild variant="outline"><Link to="/admin-import"><FileUp />Import CSV files</Link></Button></Section>
        <Section title="Title next to your name">
          <div className="flex gap-2">
            <PxInput value={f.title ?? ""} maxLength={16} placeholder="★ Owner" onChange={(e) => setF({ ...f, title: e.target.value })} className="flex-1" />
            <input type="color" value={f.title_color} onChange={(e) => setF({ ...f, title_color: e.target.value })} className="h-9 w-10 border-2 border-border bg-input" aria-label="Title color" />
            <PxButton tone="primary" onClick={() => save(f)}>Save</PxButton>
          </div>
        </Section>
        <Section title="Powers">
          <div className="flex flex-wrap gap-2">{toggle("fly", "Fly")}{toggle("invisible", "Invisible")}{toggle("noclip", "Walk through walls")}</div>
        </Section>
        <Section title="Size">
          <div className="flex flex-wrap gap-2">{SIZES.map(([l, v]) => <PxButton key={l} tone={f.size === v ? "primary" : "default"} onClick={() => save({ ...f, size: v })}>{l}</PxButton>)}</div>
        </Section>
        <Section title="Speed">
          <div className="flex flex-wrap gap-2">{SPEEDS.map(([l, v]) => <PxButton key={l} tone={f.speed === v ? "primary" : "default"} onClick={() => save({ ...f, speed: v })}>{l}</PxButton>)}</div>
        </Section>
        <Section title="Admins">
          <div className="mb-2 flex gap-2">
            <PxInput value={who} placeholder="Username" onChange={(e) => setWho(e.target.value)} className="flex-1" />
            <PxButton tone="primary" onClick={() => void rpc("set_admin_role", { _username: who, _on: true }, "Admin added").then(() => { setWho(""); loadAdmins(); })}>Make admin</PxButton>
          </div>
          {admins.map((a) => (
            <Row key={a.user_id}><span className="flex-1 truncate">{a.username}</span>
              <PxButton tone="danger" onClick={() => void rpc("set_admin_role", { _username: a.username, _on: false }, "Admin removed").then(loadAdmins)}>Remove</PxButton></Row>
          ))}
        </Section>
      </div>
    </div>
  );
}
