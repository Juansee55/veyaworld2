import { useEffect, useState } from "react";
import { Backpack, Cross, Repeat, Crosshair } from "lucide-react";
import { useQuickSlots } from "@/lib/game/quick-slots";
import { FIREARM_COOLDOWN_MS } from "@/lib/game/firearm-rules";
import crystal from "@/assets/weapons/crystal.png.asset.json";
import pulse from "@/assets/weapons/pulse.png.asset.json";
import carbine from "@/assets/weapons/carbine.png.asset.json";
import acorn from "@/assets/weapons/acorn.svg";
import maple from "@/assets/weapons/maple.svg";
import { rpc } from "@/lib/game/api";
import { notify } from "@/lib/game/notify";
import type { GameData } from "@/lib/game/useGameData";
import { BASES, captureZone } from "@/game/bases/defs";
import { STATUS_LABEL } from "./BasesPanel";
import { GangBadge, HpBar } from "./ui";
import { IconButton } from "./IconButton";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/** Shared combat state: HP, protection, weapon, bandages and the base you're standing in. */
export function useCombat(d: GameData, mapId: string, onAttack: () => Promise<string | null>) {
  const qc = useQueryClient();
  const [cool, setCool] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  const c = d.combat;
  const prot = c ? new Date(c.protected_until).getTime() - now : 0;
  const equipped = d.myWeapons.find((w) => w.equipped)?.weapon_id ?? "fists";
  const weapon = d.weapons.find((w) => w.id === equipped);
  const ownedOrder = d.weapons.filter((w) => d.myWeapons.some((m) => m.weapon_id === w.id));
  const bandages = d.myItems.find((i) => i.item_id === "bandage")?.qty ?? 0;

  const zoneBase = BASES.find((b) => captureZone(b).mapId === mapId);
  const base = d.bases.find((b) => b.id === (zoneBase?.id ?? BASES.find((b) => mapId.startsWith(b.id + "_"))?.id));
  const owner = base?.owner_gang_id ? d.gangById[base.owner_gang_id] : null;
  const ownsHere = !!base && !!d.myGang && base.owner_gang_id === d.myGang.id;
  const inArmory = ownsHere && base?.armory_map === mapId;
  const inRespawn = ownsHere && base?.respawn_map === mapId;

  const attack = async () => {
    if (cool) return;
    setCool(true);
    try { const err = await onAttack(); if (err) notify(err, "error"); }
    finally { setTimeout(() => setCool(false), FIREARM_COOLDOWN_MS); }
  };
  const cycle = () => {
    if (ownedOrder.length < 2) return notify("Capture a base armory to get more weapons");
    const i = ownedOrder.findIndex((w) => w.id === equipped);
    const next = ownedOrder[(i + 1) % ownedOrder.length];
    if (!next) return;
    void rpc("equip_weapon", { _weapon: next.id }, `${next.name} equipped`);
  };
  const heal = () => void rpc("use_item", { _item: "bandage" });
  const claim = () => void (inArmory ? rpc("claim_armory", undefined, "Weapon added to your bag") : rpc("claim_supplies", undefined, "Bandages restocked"));
  const claimLabel = inArmory ? `Take ${d.weapons.find((w) => w.id === base?.rack_weapon)?.name ?? "weapon"}` : inRespawn ? "Restock bandages" : null;
  const reload = async () => { const { error } = await supabase.rpc("reload_firearm"); if (error) notify(error.message, "error"); else await qc.invalidateQueries({ queryKey: ["g", "firearm"] }); };
  return { c, prot, weapon, bandages, base, owner, cool, attack, cycle, heal, claim, claimLabel, rounds: d.firearm?.rounds ?? 12, gralats: d.wallet?.gralats ?? 0, reload };
}
type Combat = ReturnType<typeof useCombat>;

function HpCard({ s }: { s: Combat }) {
  if (!s.c) return null;
  return (
    <div className="game-control px-2 py-1 text-xs">
      <div className="flex justify-between gap-2"><span>HP</span><span>{s.c.hp}/{s.c.max_hp}</span></div>
      <HpBar hp={s.c.hp} max={s.c.max_hp} />
      <div className="mt-1 text-primary">{s.gralats} Gralats</div>
      {s.c && <div className="text-accent">{s.rounds}/12 balas</div>}
      {s.prot > 0 && <div className="mt-0.5 text-accent">Protected {Math.ceil(s.prot / 1000)}s</div>}
    </div>
  );
}
function BaseCard({ s }: { s: Combat }) {
  const b = s.base; if (!b) return null;
  return (
    <div className="pixel-panel px-2 py-1 text-xs">
      <div className="truncate text-primary">{b.name}</div>
      <div className="truncate">{s.owner ? <GangBadge g={s.owner} /> : "Unclaimed"}</div>
      <HpBar hp={b.hp} max={b.max_hp} className="my-0.5" />
      <div className="flex justify-between gap-2"><span>{b.hp}/{b.max_hp}</span><span>{STATUS_LABEL[b.status] ?? b.status}</span></div>
    </div>
  );
}
function AttackButton({ s, big, fist }: { s: Combat; big?: boolean; fist: boolean }) {
  return (
    <Button variant="ghost" onClick={() => void s.attack()} aria-label={fist ? "Agarrar / empujar" : "Disparar"} title={fist ? "Agarrar / empujar" : "Disparar"} disabled={s.cool}
      className={`game-control pointer-events-auto flex items-center justify-center rounded-full ${big ? "h-24 w-24" : "h-20 w-20"} ${s.cool ? "opacity-50" : "text-primary"}`}>
      {fist ? <span className="text-4xl">✊</span> : <Crosshair className="!h-10 !w-10" />}
    </Button>
  );
}

/** HP, base status, quick buttons and the attack button, arranged for the current orientation. */
export function CombatHud({ d, mapId, onAttack, onReload, landscape, hidden, onBag }: {
  d: GameData; mapId: string; onAttack: () => Promise<string | null>; onReload: () => void; landscape: boolean; hidden: boolean; onBag: () => void;
}) {
  const s = useCombat(d, mapId, onAttack);
  const qc = useQueryClient();
  const { slots } = useQuickSlots(d.firearm?.user_id ?? "");
  const activate = async (value: string) => {
    if (value === "fist" || value.startsWith("gun:")) { const { error } = await supabase.rpc("equip_firearm", { _gun: value === "fist" ? "fists" : value.slice(4) }); if (error) notify(error.message, "error"); }
    else if (value.startsWith("item:")) { const id = value.slice(5), item = d.items.find((i) => i.id === id); if (item?.category === "equipment") await rpc("set_equipment", { _item: id, _on: true }); else await rpc("use_item", { _item: id }); }
    else onBag();
    await qc.invalidateQueries({ queryKey: ["g"] });
  };
  const pictures: Record<string, string> = { gun_crystal: crystal.url, gun_pulse: pulse.url, gun_carbine: carbine.url, gun_acorn: acorn, gun_maple: maple };
  const fist = d.firearm?.gun_id === "fists";
  if (hidden) return null;
  const quick = (
    <>
      {slots.map((value, index) => <Button key={index} variant="ghost" size="icon" aria-label={`Usar preset ${index + 1}`} title={index === 2 ? "Puño · agarrar / empujar" : `Preset ${index + 1}`} onClick={() => void activate(value)} onContextMenu={(e) => { e.preventDefault(); if (index < 2) onBag(); }} className={`game-control pointer-events-auto relative h-14 w-14 p-1 ${value === "fist" && fist || value === `gun:${d.firearm?.gun_id}` ? "ring-2 ring-primary" : ""}`}>{value === "fist" ? <span className="text-3xl">✊</span> : value.startsWith("gun:") ? (pictures[value.slice(4)] ? <img src={pictures[value.slice(4)]} alt="" className="h-8 w-11 object-contain [image-rendering:pixelated]" /> : <Crosshair className="!h-7 !w-7" />) : value ? <Cross className="!h-7 !w-7 text-accent" /> : <Backpack className="!h-7 !w-7" />}<span className="absolute bottom-0 right-1 text-xs text-foreground">{index + 1}</span></Button>)}
      <IconButton icon={<Repeat />} label="Recargar" onClick={() => { void s.reload().then(onReload); }} />
    </>
  );
  const claim = s.claimLabel && <Button variant="secondary" className="pointer-events-auto" onClick={s.claim}>{s.claimLabel}</Button>;

  if (landscape) return (
    <>
      <div className="pointer-events-none absolute left-3 z-10 flex max-w-[calc(100%-110px)] items-start gap-2" style={{ top: "calc(max(8px, env(safe-area-inset-top)) + 112px)" }}>
        <div className="w-28 shrink-0"><HpCard s={s} /></div>
        {s.base && <div className="hidden w-32 min-w-0 lg:block"><BaseCard s={s} /></div>}
      </div>
      <div className="pointer-events-none absolute z-10 flex flex-col gap-2"
        style={{ top: "max(8px, env(safe-area-inset-top))", right: "max(12px, env(safe-area-inset-right))" }}>{quick}</div>
      <div className="pointer-events-none absolute z-10 flex items-end gap-3"
        style={{ bottom: "max(16px, env(safe-area-inset-bottom))", right: "max(20px, env(safe-area-inset-right))" }}>
        {claim}<AttackButton s={s} big fist={fist} />
      </div>
    </>
  );

  return (
    <>
      <div className="pointer-events-none absolute left-1/2 z-10 flex w-24 -translate-x-1/2 flex-col gap-2" style={{ top: "max(12px, env(safe-area-inset-top))" }}>
        <HpCard s={s} /><BaseCard s={s} />
      </div>
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
        {claim}
        <div className="flex flex-col gap-2">{quick}</div>
      </div>
      <div className="pointer-events-none absolute bottom-6 right-5 z-10"><AttackButton s={s} fist={fist} /></div>
    </>
  );
}
