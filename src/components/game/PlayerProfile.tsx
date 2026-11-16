import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeLook, type Direction } from "@/game/catalog";
import { validateStatus } from "@/lib/game/social-rules";
import { notify } from "@/lib/game/notify";
import { CharacterCanvas, HEAD_CROP } from "./CharacterCanvas";
import { PxButton } from "./hub/ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function PlayerProfile({ userId, selfId, onClose }: { userId: string; selfId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["player-profile", userId], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single(); if (error) throw error; return data; } });
  const combat = useQuery({ queryKey: ["player-profile-combat", userId], queryFn: async () => (await supabase.from("player_combat").select("hp,max_hp,kills,deaths").eq("user_id", userId).maybeSingle()).data });
  const wallet = useQuery({ queryKey: ["g", "wallet", userId], refetchInterval: 2000, queryFn: async () => { const { data, error } = await supabase.from("player_wallets").select("gralats").eq("user_id", userId).maybeSingle(); if (error) throw error; return data; } });
  const [status, setStatus] = useState(""), [editing, setEditing] = useState(false), [saving, setSaving] = useState(false), [turn, setTurn] = useState(0), [walking, setWalking] = useState(false);
  useEffect(() => { setStatus(profile.data?.status_text ?? ""); }, [profile.data?.status_text]);
  const dirs: Direction[] = ["down", "left", "up", "right"];
  const p = profile.data;
  const save = async () => { setSaving(true); try { const text = validateStatus(status); const { error } = await supabase.from("profiles").update({ status_text: text }).eq("id", selfId); if (error) throw error; await qc.invalidateQueries({ queryKey: ["player-profile", selfId] }); setEditing(false); notify("Estado guardado"); } catch (e) { notify(e instanceof Error ? e.message : "No se pudo guardar", "error"); } finally { setSaving(false); } };
  return <div className="absolute inset-0 z-40 flex flex-col bg-background/95 p-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))]">
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><div className="flex min-w-0 items-center gap-3">{p && <CharacterCanvas look={sanitizeLook(p)} scale={1} crop={HEAD_CROP} />}<h2 className="truncate text-2xl text-primary">{p?.username ?? "Perfil"}</h2></div><PxButton onClick={onClose} aria-label="Cerrar perfil"><X /></PxButton></header>
    {profile.isPending && <p>Cargando perfil…</p>}{profile.error && <p role="alert">No se pudo cargar el perfil.</p>}
    {p && <div className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 gap-6 overflow-y-auto py-4 landscape:grid-cols-2 landscape:items-center touch-pan-y">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 self-center text-lg"><dt className="text-muted-foreground">Gralats</dt><dd className="text-right text-primary">{wallet.error ? "—" : (wallet.data?.gralats ?? 0).toLocaleString()}</dd><dt className="text-muted-foreground">Ubicación</dt><dd className="truncate text-right">{p.map_id}</dd><dt className="text-muted-foreground">Salud</dt><dd className="text-right text-accent">{combat.data ? `${combat.data.hp}/${combat.data.max_hp}` : "—"}</dd><dt className="text-muted-foreground">Victorias</dt><dd className="text-right">{combat.data?.kills ?? 0}</dd><dt className="text-muted-foreground">Derrotas</dt><dd className="text-right">{combat.data?.deaths ?? 0}</dd></dl>
      <div className="flex flex-col items-center gap-3"><CharacterCanvas look={sanitizeLook(p)} dir={dirs[turn % 4] ?? "down"} walking={walking} scale={2} /><div className="flex gap-2"><PxButton aria-label="Girar izquierda" onClick={() => setTurn((v) => v + 3)}><ChevronLeft /></PxButton><PxButton onClick={() => setWalking(!walking)}>{walking ? "Detener" : "Animación"}</PxButton><PxButton aria-label="Girar derecha" onClick={() => setTurn((v) => v + 1)}><ChevronRight /></PxButton></div>
      {editing && userId === selfId ? <form className="w-full" onSubmit={(e) => { e.preventDefault(); void save(); }}><textarea aria-label="Estado de perfil" maxLength={280} value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-20 w-full border-2 border-border bg-input p-2 text-foreground" /><div className="flex items-center justify-between"><span className="text-muted-foreground">{status.length}/280</span><PxButton tone="primary" disabled={saving} type="submit">Guardar estado</PxButton></div></form> : <><p className="max-w-full whitespace-pre-wrap break-words text-center text-lg">{p.status_text || "Sin estado"}</p>{userId === selfId && <PxButton onClick={() => setEditing(true)}>Editar estado</PxButton>}</>}
      </div>
    </div>}
  </div>;
}