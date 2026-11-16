import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Map as MapIcon, Shield, Eye, Menu as MenuIcon, ZoomIn, ZoomOut, Backpack, Armchair } from "lucide-react";
import { PLAYER_MAX_HP } from "@/lib/game/play-rules";
import { supabase } from "@/integrations/supabase/client";
import { isDirection, sanitizeLook, type Look } from "@/game/catalog";
import type { GameController } from "@/game/createGame";
import type { HudState } from "@/game/scenes/WorldScene";
import { Joystick } from "@/components/game/Joystick";
import { Wardrobe } from "@/components/game/Wardrobe";
import { useServerFn } from "@tanstack/react-start";
import { attackPlayer } from "@/lib/game/combat.functions";
import { shootFirearm } from "@/lib/game/firearms.functions";
import { useGameData } from "@/lib/game/useGameData";
import { onNotify } from "@/lib/game/notify";
import { rpc } from "@/lib/game/api";
import { GameMenu, type MenuTab } from "@/components/game/hub/GameMenu";
import { CombatHud } from "@/components/game/hub/CombatHud";
import type { GangInfo, ZoneStatus } from "@/game/scenes/WorldScene";
import { IconButton } from "@/components/game/hub/IconButton";
import { ProfileCard } from "@/components/game/ProfileCard";
import { WorldMap } from "@/components/game/WorldMap";
import { AdminPanel } from "@/components/game/AdminPanel";
import { useLandscape } from "@/hooks/use-landscape";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/game/notify";
import { MapEditor, type EditorDrag } from "@/components/game/MapEditor";

import { MainMenu } from "@/components/game/MainMenu";
import { NewsPanel } from "@/components/game/NewsPanel";
import { PlayerProfile } from "@/components/game/PlayerProfile";

const profileQuery = queryOptions({
  queryKey: ["my-profile"],
  staleTime: Infinity,
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Not signed in");
    const { data, error } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
    if (error) throw error;
    if (data) return data;
    const username = (u.user.user_metadata?.["username"] || u.user.email?.split("@")[0] || "player").slice(0, 16);
    const ins = await supabase.from("profiles").insert({ id: u.user.id, username }).select("*").single();
    if (ins.error) throw ins.error;
    return ins.data;
  },
});

export const Route = createFileRoute("/_authenticated/play")({
  head: () => ({
    meta: [
      { title: "Play — Veya World" },
      { name: "description", content: "Explore Veya World with other players in real time." },
      { property: "og:title", content: "Play — Veya World" },
      { property: "og:description", content: "Explore Veya World with other players in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery),
  component: PlayPage,
});

function PlayPage() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const hostRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<GameController | null>(null);
  const [hud, setHud] = useState<HudState>({ mapName: "", online: 1, status: "connecting" });
  const [wardrobe, setWardrobe] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gameError, setGameError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const look = sanitizeLook(profile);
  const d = useGameData(profile.id);
  const attackFn = useServerFn(attackPlayer);
  const shootFn = useServerFn(shootFirearm);
  const firearmsRef = useRef<Record<string, string>>({});
  firearmsRef.current = Object.fromEntries(d.allFirearms.map((f) => [f.user_id, f.gun_id]));
  useEffect(() => { ctrlRef.current?.setFirearms(firearmsRef.current); }, [d.allFirearms]);
  const [menu, setMenu] = useState<MenuTab | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: string }[]>([]);
  const gangInfo: GangInfo = { gangId: d.myGang?.id ?? null, tag: d.myGang?.tag ?? null, friendly: d.allies };
  const gangRef = useRef(gangInfo); gangRef.current = gangInfo;
  const hpRef = useRef({ hp: PLAYER_MAX_HP, max: PLAYER_MAX_HP, prot: 0 });
  const seqRef = useRef<number | null>(null);
  const landscape = useLandscape();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [buttonsHidden, setButtonsHidden] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [mainMenu, setMainMenu] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const [viewPlayer, setViewPlayer] = useState<string | null>(null);
  const touchPoints = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; x: number; y: number } | null>(null);
  const pinchUsed = useRef(false);
  const editorTapRef = useRef<((t: { mapId: string; x: number; y: number }) => void) | null>(null);
  const editorDragRef = useRef<EditorDrag | null>(null);
  const draggingPointer = useRef<number | null>(null);
  const overlayOpen = !!menu || wardrobe || profileOpen || mapOpen || adminOpen || mainMenu || newsOpen || !!viewPlayer;
  const adminRef = useRef({ a: d.admin, on: d.isAdmin }); adminRef.current = { a: d.admin, on: d.isAdmin };
  const tapRef = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const getSnapshot = useCallback(() => ctrlRef.current?.snapshot() ?? null, []);
  const getController = useCallback(() => ctrlRef.current, []);

  useEffect(() => onNotify((msg, kind) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }), []);
  useEffect(() => { void rpc("ensure_player").then(() => rpc("ensure_firearms")).then(() => qc.invalidateQueries({ queryKey: ["g"] })); }, [qc]);

  // Push gang/ally state, base status and own HP into the running game.
  const gangKey = `${gangInfo.gangId}|${gangInfo.tag}|${gangInfo.friendly.join(",")}`;
  useEffect(() => { ctrlRef.current?.setGang(gangRef.current); }, [gangKey]);
  useEffect(() => {
    const z: Record<string, { status: ZoneStatus; friendly: boolean }> = {};
    for (const b of d.bases) z[b.id] = { status: b.status as ZoneStatus, friendly: !!b.owner_gang_id && (b.owner_gang_id === gangRef.current.gangId || gangRef.current.friendly.includes(b.owner_gang_id)) };
    ctrlRef.current?.setZones(z);
  }, [d.bases, gangKey]);
  // Chat bubbles: show new global messages above whoever wrote them.
  useEffect(() => {
    const ch = supabase.channel(`bubbles-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "global_chat_messages" }, (p) => {
        const m = p.new as { user_id: string; body: string };
        ctrlRef.current?.say(m.user_id, m.body);
      }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);
  useEffect(() => { ctrlRef.current?.setAdmin(d.admin, d.isAdmin); }, [d.admin, d.isAdmin]);
  useEffect(() => {
    const c = d.combat; if (!c) return;
    hpRef.current = { hp: c.hp, max: c.max_hp, prot: new Date(c.protected_until).getTime() };
    ctrlRef.current?.setMyHp(c.hp, c.max_hp, hpRef.current.prot);
    if (seqRef.current !== null && c.respawn_seq > seqRef.current && c.respawn_map) {
      ctrlRef.current?.respawn(c.respawn_map, c.respawn_x ?? 0, c.respawn_y ?? 0);
      setToasts((t) => [...t, { id: Date.now(), msg: "You were knocked out — respawned", kind: "error" }]);
    }
    seqRef.current = c.respawn_seq;
  }, [d.combat]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || overlayOpen || (e.target as HTMLElement)?.tagName === "INPUT") return;
      e.preventDefault(); void ctrlRef.current?.attack().then((err) => err && setToasts((t) => [...t, { id: Date.now(), msg: err, kind: "error" }]));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen]);

  useEffect(() => {
    let cancelled = false;
    setGameError(false);
    (async () => {
      await document.fonts?.load('10px "VT323"').catch(() => undefined);
      const { createGame } = await import("@/game/createGame");
      if (cancelled || !hostRef.current) return;
      const controller = await createGame(hostRef.current, {
        userId: profile.id,
        username: profile.username,
        look,
        mapId: profile.map_id,
        x: profile.pos_x,
        y: profile.pos_y,
        dir: isDirection(profile.facing_direction) ? profile.facing_direction : "down",
        onHud: (h) => setHud((p) => ({ ...p, ...h })),
        gang: gangRef.current,
        myHp: hpRef.current,
        attack: (targetId) => attackFn({ data: { targetId } }),
        shoot: async (aim) => { const result = await shootFn({ data: { aim } }); qc.setQueryData(["g", "firearm", profile.id], (old: typeof d.firearm) => old ? { ...old, rounds: result.rounds } : old); return result; },
        firearms: firearmsRef.current,
        onAutumnChange: () => { void qc.invalidateQueries({ queryKey: ["g"] }); },
        admin: adminRef.current.a,
        isAdmin: adminRef.current.on,
      });
      if (cancelled) controller.destroy(); else ctrlRef.current = controller;
    })().catch(() => {
      if (!cancelled) { setGameError(true); setHud((h) => ({ ...h, status: "offline" })); }
    });
    return () => { cancelled = true; ctrlRef.current?.destroy(); ctrlRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, attempt]);

  const saveLook = async (next: Look, username: string) => {
    setSaving(true);
    try {
      const update = supabase.from("profiles").update({ ...next, username }).eq("id", profile.id).select("*").single();
      const { data, error } = await Promise.race([
        Promise.resolve(update),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Saving timed out. Please try again.")), 15_000)),
      ]);
      if (error) throw error;
      qc.setQueryData(profileQuery.queryKey, data);
      ctrlRef.current?.setLook(next, username);
      setWardrobe(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Your look could not be saved. Please try again.", "error");
    } finally { setSaving(false); }
  };

  const invites = !d.myGang ? d.invites.length : 0;
  const signOut = () => void (async () => {
    await qc.cancelQueries();
    ctrlRef.current?.destroy(); ctrlRef.current = null;
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  })();

  // Tap (not drag) on your own character opens your profile.
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, input, textarea, select, a, [data-editor-panel]")) return;
    if (overlayOpen) return;
    if (e.pointerType === "touch") {
      touchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touchPoints.current.size === 2) {
        editorDragRef.current?.cancel(); draggingPointer.current = null; tapRef.current = null;
        const [a, b] = [...touchPoints.current.values()];
        if (a && b) pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        pinchUsed.current = true; e.currentTarget.setPointerCapture(e.pointerId); return;
      }
    }
    if (editorOpen && d.isAdmin && editorDragRef.current?.down(e.clientX, e.clientY)) {
      draggingPointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); tapRef.current = null; return;
    }
    tapRef.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  };
  const onMove = (e: React.PointerEvent) => {
    if (touchPoints.current.has(e.pointerId)) touchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const prev = pinch.current;
    if (prev && touchPoints.current.size === 2) {
      const [a, b] = [...touchPoints.current.values()]; if (!a || !b) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y), x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      if (prev.distance > 0) ctrlRef.current?.zoomAt(x, y, distance / prev.distance);
      ctrlRef.current?.pan(x - prev.x, y - prev.y); pinch.current = { distance, x, y }; return;
    }
    if (draggingPointer.current === e.pointerId) editorDragRef.current?.move(e.clientX, e.clientY);
  };
  const cancelDrag = () => { draggingPointer.current = null; editorDragRef.current?.cancel(); tapRef.current = null; touchPoints.current.clear(); pinch.current = null; pinchUsed.current = false; };
  const onUp = (e: React.PointerEvent) => {
    touchPoints.current.delete(e.pointerId);
    if (pinchUsed.current) { pinch.current = null; tapRef.current = null; if (touchPoints.current.size === 0) pinchUsed.current = false; return; }
    if (draggingPointer.current === e.pointerId) {
      draggingPointer.current = null; editorDragRef.current?.up(e.clientX, e.clientY);
      e.currentTarget.releasePointerCapture(e.pointerId); return;
    }
    const s = tapRef.current; tapRef.current = null;
    if (!s || s.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 12 || performance.now() - s.t > 400) return;
    if ((e.target as HTMLElement).closest("button, input, textarea, select, a, [data-editor-panel]")) return;
    if (editorOpen) {
      if (d.isAdmin) {
        const tile = ctrlRef.current?.tileAt(e.clientX, e.clientY);
        if (tile) editorTapRef.current?.(tile);
      }
      return;
    }
    if (overlayOpen) return;
    if (ctrlRef.current?.hitTestSelf(e.clientX, e.clientY)) setProfileOpen(true);
    else { const id = ctrlRef.current?.playerAt(e.clientX, e.clientY); if (id) setViewPlayer(id); }
  };

  const menuButtons = (
    <>
      <IconButton icon={<MessageSquare />} label="Chat" onClick={() => setMenu("chat")} />
      <IconButton icon={<Shield />} label="Gang" tone="primary" badge={invites} onClick={() => setMenu("gang")} />
      <IconButton icon={<MenuIcon />} label="Menú" onClick={() => setMainMenu(true)} />
      <IconButton icon={<Backpack />} label="Inventario" onClick={() => setMenu("bag")} />
      <IconButton icon={<MapIcon />} label="Mapa" onClick={() => setMapOpen(true)} />
    </>
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-background touch-none select-none" onPointerDownCapture={onDown} onPointerMoveCapture={onMove} onPointerUpCapture={onUp} onPointerCancelCapture={cancelDrag}>
      <div ref={hostRef} className="absolute inset-0" />
      {gameError && <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-lg text-destructive">The world could not load.</p>
        <Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
      </div>}
      <Joystick disabled={overlayOpen || editorOpen} />
      {buttonsHidden ? (
        <Button variant="ghost" onClick={() => setButtonsHidden(false)} aria-label="Show buttons" className="pixel-panel absolute z-10 flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground"
          style={{ top: "max(8px, env(safe-area-inset-top))", left: "max(8px, env(safe-area-inset-left))" }}><Eye className="h-4 w-4" />Show buttons</Button>
      ) : landscape ? (
        <div className="pointer-events-none absolute z-10 grid grid-cols-3 gap-1"
          style={{ top: "max(8px, env(safe-area-inset-top))", left: "max(12px, env(safe-area-inset-left))" }}>{menuButtons}</div>
      ) : (
        <div className="pointer-events-none absolute left-3 top-0 z-10 grid grid-cols-2 gap-1"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
          {menuButtons}
        </div>
      )}
      <CombatHud d={d} mapId={hud.mapId ?? ""} landscape={landscape} hidden={buttonsHidden} onReload={() => ctrlRef.current?.reloadWeapon()} onBag={() => setMenu("bag")}
        onAttack={() => ctrlRef.current?.attack() ?? Promise.resolve(null)} />
      {!overlayOpen && !editorOpen && hud.seatAction && <Button variant="secondary" className="absolute bottom-32 right-5 z-20 gap-2" aria-label={hud.seatAction === "stand" ? "Levantarse" : "Sentarse"} onClick={() => ctrlRef.current?.interact()}><Armchair className="h-5 w-5" />{hud.seatAction === "stand" ? "Levantarse" : "Sentarse"}</Button>}
      {!buttonsHidden && <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1"><IconButton icon={<ZoomOut />} label="Alejar vista" onClick={() => ctrlRef.current?.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.15)} size="sm" /><IconButton icon={<ZoomIn />} label="Acercar vista" onClick={() => ctrlRef.current?.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.15)} size="sm" /></div>}
      <div className="pointer-events-none absolute left-1/2 top-24 z-40 flex -translate-x-1/2 flex-col items-center gap-1">
        {toasts.map((t) => (
          <div key={t.id} className={`pixel-panel px-3 py-1.5 text-sm ${t.kind === "error" ? "text-destructive" : "text-accent"}`}>{t.msg}</div>
        ))}
      </div>
      {mainMenu && <MainMenu selfId={profile.id} onClose={() => setMainMenu(false)} onNews={() => { setMainMenu(false); setNewsOpen(true); }} onProfile={(id) => { setMainMenu(false); setViewPlayer(id); }} onMap={() => { setMainMenu(false); setMapOpen(true); }} onGang={() => { setMainMenu(false); setMenu("gang"); }} onChat={() => { setMainMenu(false); setMenu("chat"); }} onWardrobe={() => { setMainMenu(false); setWardrobe(true); }} />}
      {newsOpen && <NewsPanel isAdmin={d.isAdmin} userId={profile.id} onClose={() => setNewsOpen(false)} />}
      {viewPlayer && <PlayerProfile userId={viewPlayer} selfId={profile.id} onClose={() => setViewPlayer(null)} />}
      {mapOpen && <WorldMap d={d} online={hud.online ?? 1} getSnapshot={getSnapshot} onClose={() => setMapOpen(false)} />}
      {profileOpen && (
        <ProfileCard d={d} look={look} username={profile.username} mapName={hud.mapName ?? ""} landscape={landscape} buttonsHidden={buttonsHidden}
          onClose={() => setProfileOpen(false)} onEdit={() => { setProfileOpen(false); setWardrobe(true); }}
          onBag={() => { setProfileOpen(false); setMenu("bag"); }} onToggleButtons={() => setButtonsHidden((h) => !h)} onExit={signOut}
          onStatus={() => { setProfileOpen(false); setViewPlayer(profile.id); }}
          onSecret={() => { if (d.isAdmin) { setProfileOpen(false); setAdminOpen(true); } }} />
      )}
      {adminOpen && d.isAdmin && <AdminPanel fx={d.admin[profile.id]} onClose={() => setAdminOpen(false)} onWorldEdit={() => { setAdminOpen(false); setEditorOpen(true); }} />}
      {editorOpen && d.isAdmin && <MapEditor ctrl={getController} tapRef={editorTapRef} dragRef={editorDragRef} onClose={() => { cancelDrag(); setEditorOpen(false); editorTapRef.current = null; editorDragRef.current = null; }} />}
      {menu && <GameMenu d={d} userId={profile.id} initial={menu} onClose={() => setMenu(null)} />}
      {wardrobe && (
        <Wardrobe look={look} username={profile.username} saving={saving} onClose={() => setWardrobe(false)} onSave={saveLook} />
      )}
    </div>
  );
}
