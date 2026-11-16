import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, Users, UserRound, Map, Shield, Shirt, MessageSquare, X } from "lucide-react";
import { PxButton } from "./hub/ui";
import { CharacterCanvas, HEAD_CROP } from "./CharacterCanvas";
import { sanitizeLook } from "@/game/catalog";

export function MainMenu({ onClose, onNews, onProfile, onMap, onGang, onChat, onWardrobe, selfId }: { onClose: () => void; onNews: () => void; onProfile: (id: string) => void; onMap: () => void; onGang: () => void; onChat: () => void; onWardrobe: () => void; selfId: string }) {
  const players = useQuery({ queryKey: ["menu-players"], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*").order("username").limit(100); if (error) throw error; return data; } });
  const options = [{ label: "Noticias", icon: Newspaper, action: onNews }, { label: "Mi perfil", icon: UserRound, action: () => onProfile(selfId) }, { label: "Mapa", icon: Map, action: onMap }, { label: "Pandilla", icon: Shield, action: onGang }, { label: "Mensajes", icon: MessageSquare, action: onChat }, { label: "Vestuario", icon: Shirt, action: onWardrobe }];
  return <div className="absolute inset-0 z-30 flex flex-col bg-background/90 p-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))]">
    <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><h2 className="text-2xl text-primary">Veya World</h2><PxButton onClick={onClose} aria-label="Cerrar menú"><X /></PxButton></header>
    <div className="mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto touch-pan-y"><nav className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">{options.map(({ label, icon: Icon, action }) => <PxButton key={label} className="flex min-h-24 flex-col items-center justify-center gap-3" onClick={action}><Icon className="size-8" /><span>{label}</span></PxButton>)}</nav>
    <h3 className="mb-3 flex items-center gap-2 text-xl text-primary"><Users />Jugadores</h3>{players.isPending && <p>Cargando jugadores…</p>}{players.error && <p>No se pudieron cargar los jugadores.</p>}
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{players.data?.map((p) => <PxButton key={p.id} className="flex min-w-0 items-center gap-3 text-left" onClick={() => onProfile(p.id)}><CharacterCanvas look={sanitizeLook(p)} scale={1} crop={HEAD_CROP} /><span className="min-w-0"><span className="block truncate text-base">{p.username}</span><span className="block truncate text-xs text-muted-foreground">{p.status_text || "Sin estado"}</span></span></PxButton>)}</div>
    </div>
  </div>;
}