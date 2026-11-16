import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArtUploadEditor } from "./ArtUploadEditor";
import { GUNS } from "@/lib/game/firearm-rules";
import { notify } from "@/lib/game/notify";
import { Button } from "@/components/ui/button";
import type { GameData } from "@/lib/game/useGameData";
import crystal from "@/assets/weapons/crystal.png.asset.json";
import pulse from "@/assets/weapons/pulse.png.asset.json";
import carbine from "@/assets/weapons/carbine.png.asset.json";
import { AUTUMN_GUNS } from "@/lib/game/autumn-rules";
import acorn from "@/assets/weapons/acorn.svg";
import maple from "@/assets/weapons/maple.svg";
const pictures = [crystal.url, pulse.url, carbine.url];

export function FirearmPanel({ d }: { d: GameData }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(1);
  const refresh = () => qc.invalidateQueries({ queryKey: ["g"] });
  const equip = async (id: string) => {
    const { error } = await supabase.rpc("equip_firearm", { _gun: id });
    if (error) return notify(error.message, "error");
    await refresh();
  };
  return <section className="mb-4 border-b border-border pb-4">
    <div className="mb-3 flex justify-between"><h3 className="text-primary">Armas de fuego</h3><span>{d.wallet?.gralats ?? 0} Gralats</span></div>
    <div className="grid grid-cols-3 gap-2">{GUNS.map((g, i) => <Button key={g.id} variant={d.firearm?.gun_id === g.id ? "default" : "secondary"} className="h-20 min-w-0 flex-col gap-2" onClick={() => void equip(g.id)}><img src={pictures[i]} alt="" className="h-5 w-16 object-contain [image-rendering:pixelated]" />{g.name}</Button>)}</div>
    <div className="my-2 text-xs text-muted-foreground">Daño 1 · 12 balas</div>
    <Button variant="secondary" disabled={d.firearm?.gun_id === "fists"} onClick={() => void equip("fists")}>Quitarse el arma</Button>
    <div className="mt-2 grid grid-cols-2 gap-2">{AUTUMN_GUNS.filter((g) => d.autumnRewards.some((r) => r.reward_id === g.id)).map((g, i) => <Button key={g.id} variant={d.firearm?.gun_id === g.id ? "default" : "secondary"} className="h-20 flex-col" onClick={() => void equip(g.id)}><img src={g.id === "gun_acorn" ? acorn : maple} alt="" className="h-8 w-12 [image-rendering:pixelated]" />{g.name}</Button>)}</div>
    {d.customGuns.map((g) => <Button key={g.id} variant={d.firearm?.gun_id === `custom:${g.id}` ? "default" : "secondary"} className="m-1 max-w-full truncate" onClick={() => void equip(`custom:${g.id}`)}>{g.name}</Button>)}
    <ArtUploadEditor fixedKind="melee" onDone={async (art) => { await equip(`custom:${art.id}`); notify("Arma guardada"); }} />
    {d.isAdmin && <div className="mt-3 flex flex-wrap items-center gap-2"><input aria-label="Cantidad de Gralats" type="number" min={1} max={1000000} value={amount} className="w-28 border border-border bg-input p-1" onChange={(e) => setAmount(Number(e.target.value))} /><Button variant="secondary" onClick={async () => { if (!d.firearm) return; const { error } = await supabase.rpc("award_gralats", { _user: d.firearm.user_id, _amount: amount }); if (error) notify(error.message, "error"); else await refresh(); }}>Añadir Gralats</Button></div>}
  </section>;
}