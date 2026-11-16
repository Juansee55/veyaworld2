import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const q = async <T,>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> => {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
};

export function useGameData(userId: string) {
  const qc = useQueryClient();
  const autumnInventory = useQuery({ queryKey: ["g", "autumnInventory", userId], refetchInterval: 2000, queryFn: () => q(supabase.from("autumn_inventory").select("*").eq("user_id", userId)) });
  const autumnRewards = useQuery({ queryKey: ["g", "autumnRewards", userId], queryFn: () => q(supabase.from("autumn_rewards").select("*").eq("user_id", userId)) });
  const firearm = useQuery({ queryKey: ["g", "firearm", userId], refetchInterval: 2000, queryFn: async () => (await supabase.from("player_firearms").select("*").eq("user_id", userId).maybeSingle()).data });
  const allFirearms = useQuery({ queryKey: ["g", "allFirearms"], refetchInterval: 2000, queryFn: () => q(supabase.from("player_firearms").select("user_id,gun_id")) });
  const wallet = useQuery({ queryKey: ["g", "wallet", userId], refetchInterval: 2000, queryFn: async () => (await supabase.from("player_wallets").select("*").eq("user_id", userId).maybeSingle()).data });
  const customGuns = useQuery({ queryKey: ["g", "customGuns", userId], queryFn: () => q(supabase.from("player_art").select("id,name").eq("user_id", userId).eq("kind", "melee")) });
  const gangs = useQuery({ queryKey: ["g", "gangs"], queryFn: () => q(supabase.from("gangs").select("*").order("created_at")) });
  const members = useQuery({ queryKey: ["g", "members"], queryFn: () => q(supabase.from("gang_members").select("*")) });
  const alliances = useQuery({ queryKey: ["g", "alliances"], queryFn: () => q(supabase.from("gang_alliances").select("*")) });
  const invites = useQuery({ queryKey: ["g", "invites"], queryFn: () => q(supabase.from("gang_invitations").select("*").eq("status", "pending")) });
  const bases = useQuery({ queryKey: ["g", "bases"], queryFn: () => q(supabase.from("bases").select("*").order("id")) });
  const weapons = useQuery({ queryKey: ["g", "weapons"], staleTime: Infinity, queryFn: () => q(supabase.from("weapons").select("*").order("damage")) });
  const items = useQuery({ queryKey: ["g", "items"], staleTime: Infinity, queryFn: () => q(supabase.from("items").select("*")) });
  const myWeapons = useQuery({ queryKey: ["g", "myWeapons"], queryFn: () => q(supabase.from("player_weapons").select("*").eq("user_id", userId)) });
  const myItems = useQuery({ queryKey: ["g", "myItems"], queryFn: () => q(supabase.from("player_inventory").select("*").eq("user_id", userId)) });
  const combat = useQuery({ queryKey: ["g", "combat"], queryFn: async () => (await supabase.from("player_combat").select("*").eq("user_id", userId).maybeSingle()).data });
  const today = useQuery({ queryKey: ["g", "today"], staleTime: 60_000, queryFn: async () => (await supabase.rpc("game_today")).data as string });
  const total = useQuery({ queryKey: ["g", "total"], queryFn: () => q(supabase.from("gang_total_hours").select("*").order("hours", { ascending: false }).limit(50)) });
  const daily = useQuery({ queryKey: ["g", "daily", today.data], enabled: !!today.data,
    queryFn: () => q(supabase.from("gang_daily_hours").select("*").eq("day", today.data!).order("hours", { ascending: false }).limit(50)) });

  const adminFx = useQuery({ queryKey: ["g", "adminFx"], queryFn: () => q(supabase.from("player_admin").select("*")) });
  const isAdmin = useQuery({ queryKey: ["g", "isAdmin"], staleTime: Infinity, queryFn: async () => !!(await supabase.rpc("am_admin")).data });
  const admin = useMemo(() => Object.fromEntries((adminFx.data ?? []).map((a) => [a.user_id, a])), [adminFx.data]);

  const myMember = members.data?.find((m) => m.user_id === userId) ?? null;
  const myGang = gangs.data?.find((g) => g.id === myMember?.gang_id) ?? null;
  const memberIds = useMemo(() => (members.data ?? []).filter((m) => m.gang_id === myGang?.id).map((m) => m.user_id), [members.data, myGang?.id]);
  const inviteIds = useMemo(() => (invites.data ?? []).map((i) => i.user_id), [invites.data]);
  const nameIds = useMemo(() => [...new Set([...memberIds, ...inviteIds])].sort(), [memberIds, inviteIds]);
  const names = useQuery({ queryKey: ["g", "names", nameIds.join(",")], enabled: nameIds.length > 0,
    queryFn: async () => Object.fromEntries((await q(supabase.from("profiles").select("id, username").in("id", nameIds))).map((p) => [p.id, p.username])) as Record<string, string> });
  const history = useQuery({ queryKey: ["g", "history", myGang?.id], enabled: !!myGang,
    queryFn: () => q(supabase.from("gang_daily_hours").select("*").eq("gang_id", myGang!.id).order("day", { ascending: false }).limit(14)) });

  // Realtime: any change in these tables refreshes the matching data.
  useEffect(() => {
    const map: Record<string, string[]> = {
      gangs: ["gangs"], gang_members: ["members", "names"], gang_invitations: ["invites", "names"], gang_alliances: ["alliances"],
      bases: ["bases"], gang_daily_hours: ["daily", "history"], gang_total_hours: ["total"], player_admin: ["adminFx"],
    };
    let ch = supabase.channel(`veya-data-${Math.random().toString(36).slice(2)}`);
    for (const [table, keys] of Object.entries(map)) {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table }, () => { for (const k of keys) void qc.invalidateQueries({ queryKey: ["g", k] }); });
    }
    ch = ch
      .on("postgres_changes", { event: "*", schema: "public", table: "player_combat", filter: `user_id=eq.${userId}` }, (p) => qc.setQueryData(["g", "combat"], p.new))
      .on("postgres_changes", { event: "*", schema: "public", table: "player_weapons", filter: `user_id=eq.${userId}` }, () => void qc.invalidateQueries({ queryKey: ["g", "myWeapons"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "player_inventory", filter: `user_id=eq.${userId}` }, () => void qc.invalidateQueries({ queryKey: ["g", "myItems"] }));
    ch.subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc, userId]);

  const allies = useMemo(() => {
    if (!myGang) return [] as string[];
    return (alliances.data ?? []).filter((a) => a.status === "active" && (a.gang_a === myGang.id || a.gang_b === myGang.id))
      .map((a) => (a.gang_a === myGang.id ? a.gang_b : a.gang_a));
  }, [alliances.data, myGang]);

  const gangById = useMemo(() => Object.fromEntries((gangs.data ?? []).map((g) => [g.id, g])), [gangs.data]);

  return {
    autumnBags: autumnInventory.data?.[0]?.bags ?? 0, autumnRewards: autumnRewards.data ?? [],
    firearm: firearm.data ?? null, allFirearms: allFirearms.data ?? [], wallet: wallet.data ?? null, customGuns: customGuns.data ?? [],
    gangs: gangs.data ?? [], gangById, members: members.data ?? [], alliances: alliances.data ?? [], invites: invites.data ?? [],
    bases: bases.data ?? [], weapons: weapons.data ?? [], items: items.data ?? [], myWeapons: myWeapons.data ?? [], myItems: myItems.data ?? [],
    combat: combat.data ?? null, total: total.data ?? [], daily: daily.data ?? [], history: history.data ?? [], today: today.data,
    names: names.data ?? {}, admin, isAdmin: !!isAdmin.data, myMember, myGang, allies,
  };
}
export type GameData = ReturnType<typeof useGameData>;
