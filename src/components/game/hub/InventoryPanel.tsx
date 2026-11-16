import { useState } from "react";
import { rpc } from "@/lib/game/api";
import type { GameData } from "@/lib/game/useGameData";
import { Empty, PxButton, Row, Section } from "./ui";
import { FirearmPanel } from "../FirearmPanel";
import { useQuickSlots } from "@/lib/game/quick-slots";
import { GUNS } from "@/lib/game/firearm-rules";
import { Crosshair } from "lucide-react";
import { AUTUMN_GUNS, AUTUMN_HAT_IDS, AUTUMN_HAT_NAMES } from "@/lib/game/autumn-rules";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { notify } from "@/lib/game/notify";
import { Button } from "@/components/ui/button";

export function InventoryPanel({ d }: { d: GameData }) {
  const qc = useQueryClient();
  const [opening, setOpening] = useState(false);
  const openBag = async () => {
    if (opening) return; setOpening(true);
    try { const { data, error } = await supabase.rpc("open_autumn_bag"); if (error) throw error;
      const result = data as { reward: string }; const index = AUTUMN_HAT_IDS.indexOf(result.reward);
      notify(`Conseguiste: ${index >= 0 ? AUTUMN_HAT_NAMES[index] : AUTUMN_GUNS.find((g) => g.id === result.reward)?.name ?? result.reward}`);
      await qc.invalidateQueries({ queryKey: ["g"] });
    } catch (e) { notify(e instanceof Error ? e.message : (e as { message?: string }).message ?? "No se pudo abrir", "error"); }
    finally { setOpening(false); }
  };
  const [tab, setTab] = useState<"weapons" | "equipment" | "items">("weapons");
  const owned = new Map(d.myWeapons.map((w) => [w.weapon_id, w]));
  const inv = new Map(d.myItems.map((i) => [i.item_id, i]));
  const { slots, assign } = useQuickSlots(d.firearm?.user_id ?? "");
  const options = [
    ...GUNS.map((g) => ({ value: `gun:${g.id}`, name: g.name })),
    ...AUTUMN_GUNS.filter((g) => d.autumnRewards.some((r) => r.reward_id === g.id)).map((g) => ({ value: `gun:${g.id}`, name: g.name })),
    ...d.customGuns.map((g) => ({ value: `gun:custom:${g.id}`, name: g.name })),
    ...d.items.filter((i) => (inv.get(i.id)?.qty ?? 0) > 0).map((i) => ({ value: `item:${i.id}`, name: i.name })),
  ];
  return (
    <div>
      <section className="mb-4 border-b border-border pb-4"><h3 className="mb-2 text-primary">Accesos rápidos</h3><div className="grid grid-cols-2 gap-3">{slots.map((value, index) => <label key={index} className="flex min-w-0 flex-col gap-2"><span className="flex items-center gap-2">{index === 2 ? "✊" : <Crosshair className="h-4 w-4" />}Preset {index + 1}</span>{index === 2 ? <span className="p-2 text-muted-foreground">Puño · fijo</span> : <select aria-label={`Preset ${index + 1}`} value={value} onChange={(e) => assign(index, e.target.value)} className="w-full min-w-0 border border-border bg-input p-2 text-foreground"><option value="">Vacío</option>{options.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}</select>}</label>)}</div></section>
      <section className="mb-4 border-b border-border pb-4"><h3 className="mb-2 text-primary">Evento de bellotas</h3><div className="flex flex-wrap items-center justify-between gap-2"><span>Bolsas de bellotas: {d.autumnBags}</span><Button disabled={opening || d.autumnBags < 1} onClick={() => void openBag()}>{opening ? "Abriendo…" : "Abrir bolsa"}</Button></div><div className="mt-2 flex flex-col gap-1">{d.autumnRewards.map((r) => <span key={r.reward_id}>{AUTUMN_HAT_NAMES[AUTUMN_HAT_IDS.indexOf(r.reward_id)] ?? AUTUMN_GUNS.find((g) => g.id === r.reward_id)?.name} ×{r.qty}</span>)}</div></section>
      <FirearmPanel d={d} />
      <div className="mb-3 flex gap-1">{(["weapons", "equipment", "items"] as const).map((t) => (
        <PxButton key={t} tone={t === tab ? "primary" : "default"} className="flex-1 capitalize" onClick={() => setTab(t)}>{t}</PxButton>
      ))}</div>
      {tab === "weapons" && (
        <Section title="Weapons">
          {d.weapons.filter((w) => owned.has(w.id)).map((w) => {
            const eq = owned.get(w.id)?.equipped;
            return (
              <Row key={w.id}>
                <div className="flex-1"><div>{w.name}{eq && <span className="ml-1 text-xs text-accent">equipped</span>}</div>
                  <div className="text-xs text-muted-foreground">DMG {w.damage} · Range {w.range_px} · {(w.cooldown_ms / 1000).toFixed(2)}s · {w.weapon_type}</div></div>
                {eq ? (w.id !== "fists" && <PxButton onClick={() => void rpc("equip_weapon", { _weapon: "fists" })}>Unequip</PxButton>)
                  : <PxButton tone="primary" onClick={() => void rpc("equip_weapon", { _weapon: w.id })}>Equip</PxButton>}
              </Row>
            );
          })}
          <p className="mt-2 text-xs text-muted-foreground">Each base armory holds a unique weapon. Members of the owning gang can take it from the armory room.</p>
        </Section>
      )}
      {tab !== "weapons" && (() => {
        const cat = tab === "equipment" ? "equipment" : "item";
        const list = d.items.filter((i) => i.category === cat && (inv.get(i.id)?.qty ?? 0) > 0);
        return (
          <Section title={tab === "equipment" ? "Equipment" : "Combat items"}>
            {list.length === 0 ? <Empty>Nothing here yet.</Empty> : list.map((i) => {
              const row = inv.get(i.id)!;
              return (
                <Row key={i.id}>
                  <div className="flex-1"><div>{i.name} {cat === "item" && <span className="text-xs text-muted-foreground">x{row.qty}</span>}</div><div className="text-xs text-muted-foreground">{i.description}</div></div>
                  {cat === "equipment"
                    ? <PxButton tone={row.equipped ? "default" : "primary"} onClick={() => void rpc("set_equipment", { _item: i.id, _on: !row.equipped })}>{row.equipped ? "Unequip" : "Equip"}</PxButton>
                    : <PxButton tone="primary" onClick={() => void rpc("use_item", { _item: i.id }, `${i.name} used`)}>Use</PxButton>}
                </Row>
              );
            })}
            {cat === "item" && <p className="mt-2 text-xs text-muted-foreground">Restock bandages in your gang's respawn room.</p>}
          </Section>
        );
      })()}
    </div>
  );
}
