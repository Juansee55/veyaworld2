CREATE TABLE public.game_config (key text PRIMARY KEY, num numeric, txt text);
INSERT INTO public.game_config(key, num, txt) VALUES
 ('tick_seconds', 3, NULL), ('base_max_hp', 25, NULL), ('capture_start_hp', 10, NULL),
 ('player_max_hp', 100, NULL), ('respawn_hp', 100, NULL), ('protection_seconds', 5, NULL),
 ('hold_hs_per_minute', 1, NULL), ('capture_bonus_hs', 25, NULL), ('friendly_fire', 0, NULL),
 ('chat_max_len', 200, NULL), ('chat_min_interval_ms', 1200, NULL), ('timezone', NULL, 'America/Argentina/Buenos_Aires'),
 ('public_spawn_map', NULL, 'village'), ('public_spawn_x', 392, NULL), ('public_spawn_y', 296, NULL);

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL, UNIQUE (user_id, role));

CREATE TABLE public.gangs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, tag text NOT NULL,
  emblem text NOT NULL DEFAULT '⚔', color text NOT NULL DEFAULT '#e0b040',
  leader_id uuid NOT NULL, preferred_base_id text,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX gangs_name_uq ON public.gangs (lower(name));
CREATE UNIQUE INDEX gangs_tag_uq ON public.gangs (upper(tag));

CREATE TABLE public.gang_members (
  user_id uuid PRIMARY KEY,
  gang_id uuid NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('leader','officer','member')),
  joined_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX gang_members_gang_idx ON public.gang_members(gang_id);

CREATE TABLE public.gang_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gang_id uuid NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX gang_inv_pending_uq ON public.gang_invitations(gang_id, user_id) WHERE status = 'pending';
CREATE INDEX gang_inv_user_idx ON public.gang_invitations(user_id);

CREATE TABLE public.gang_alliances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gang_a uuid NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  gang_b uuid NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (gang_a <> gang_b));
CREATE UNIQUE INDEX gang_alliance_pair_uq ON public.gang_alliances (LEAST(gang_a, gang_b), GREATEST(gang_a, gang_b));

CREATE TABLE public.bases (
  id text PRIMARY KEY, name text NOT NULL, theme text NOT NULL,
  owner_gang_id uuid REFERENCES public.gangs(id) ON DELETE SET NULL,
  hp int NOT NULL DEFAULT 25, max_hp int NOT NULL DEFAULT 25,
  zone_map text NOT NULL, zone_x int NOT NULL, zone_y int NOT NULL, zone_r int NOT NULL,
  respawn_map text NOT NULL, respawn_x int NOT NULL, respawn_y int NOT NULL,
  rack_weapon text NOT NULL, armory_map text NOT NULL,
  status text NOT NULL DEFAULT 'idle', attacker_gang_id uuid,
  last_tick_at timestamptz NOT NULL DEFAULT now(), last_award_at timestamptz NOT NULL DEFAULT now(),
  captured_at timestamptz,
  CHECK (hp >= 0 AND hp <= max_hp));
INSERT INTO public.bases(id,name,theme,zone_map,zone_x,zone_y,zone_r,respawn_map,respawn_x,respawn_y,rack_weapon,armory_map) VALUES
('ironworks','Ironworks HQ','industrial','ironworks_hq',152,104,28,'ironworks_respawn',88,72,'pipe_wrench','ironworks_armory'),
('sentinel','Fort Sentinel','military','sentinel_hq',136,104,28,'sentinel_respawn',104,72,'spear','sentinel_hq'),
('vault','The Deep Vault','bunker','vault_hq',136,120,28,'vault_respawn',72,72,'shock_baton','vault_armory'),
('thornwood','Thornwood Lodge','forest','thornwood_hq',120,104,28,'thornwood_respawn',72,72,'woodaxe','thornwood_hq'),
('sunspire','Sunspire Citadel','desert','sunspire_hq',136,120,28,'sunspire_respawn',88,88,'scimitar','sunspire_armory'),
('neon','Neon Block','urban','neon_hq',152,104,28,'neon_respawn',88,72,'katana','neon_hq'),
('saltgate','Saltgate Docks','harbor','saltgate_hq',152,104,28,'saltgate_respawn',88,72,'harpoon','saltgate_armory'),
('cragpeak','Cragpeak Hold','mountain','cragpeak_hq',136,120,28,'cragpeak_respawn',72,88,'warhammer','cragpeak_hq');

CREATE TABLE public.base_rooms (
  map_id text PRIMARY KEY, base_id text NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  room_key text NOT NULL, name text NOT NULL, room_type text NOT NULL);
INSERT INTO public.base_rooms(base_id, room_key, map_id, name, room_type) VALUES
('ironworks','entrance','ironworks_entrance','Loading Bay','entrance'),('ironworks','corridor','ironworks_corridor','Steam Corridor','corridor'),('ironworks','hq','ironworks_hq','Foundry Command','hq'),('ironworks','armory','ironworks_armory','Tool Armory','armory'),('ironworks','respawn','ironworks_respawn','Repair Bay','respawn'),('sentinel','entrance','sentinel_entrance','Checkpoint Yard','entrance'),('sentinel','hq','sentinel_hq','Command Tent','hq'),('sentinel','defense','sentinel_defense','Watch Post','defense'),('sentinel','respawn','sentinel_respawn','Field Barracks','respawn'),('vault','entrance','vault_entrance','Blast Door','entrance'),('vault','corridor','vault_corridor','Descending Shaft','corridor'),('vault','defense','vault_defense','Turret Gallery','defense'),('vault','hq','vault_hq','Vault Core','hq'),('vault','armory','vault_armory','Locked Arsenal','armory'),('vault','respawn','vault_respawn','Med Bay','respawn'),('thornwood','hq','thornwood_hq','Great Hall','entrance'),('thornwood','respawn','thornwood_respawn','Hunter''s Rest','respawn'),('sunspire','entrance','sunspire_entrance','Sun Gate','entrance'),('sunspire','hq','sunspire_hq','Throne of Dunes','hq'),('sunspire','armory','sunspire_armory','Spice Vault','armory'),('sunspire','respawn','sunspire_respawn','Oasis Shrine','respawn'),('neon','entrance','neon_entrance','Street Lobby','entrance'),('neon','hq','neon_hq','Rooftop Club','hq'),('neon','respawn','neon_respawn','Safe Apartment','respawn'),('saltgate','entrance','saltgate_entrance','Pier Gate','entrance'),('saltgate','hq','saltgate_hq','Harbormaster''s Warehouse','hq'),('saltgate','armory','saltgate_armory','Cargo Hold','armory'),('saltgate','respawn','saltgate_respawn','Crew Quarters','respawn'),('cragpeak','entrance','cragpeak_entrance','Iron Portcullis','entrance'),('cragpeak','corridor','cragpeak_corridor','Switchback Pass','corridor'),('cragpeak','defense','cragpeak_defense','Battlements','defense'),('cragpeak','hq','cragpeak_hq','Summit Keep','hq'),('cragpeak','respawn','cragpeak_respawn','Hearth Cave','respawn');

ALTER TABLE public.gangs ADD CONSTRAINT gangs_pref_base_fk FOREIGN KEY (preferred_base_id) REFERENCES public.bases(id) ON DELETE SET NULL;

CREATE TABLE public.base_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id text NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  from_gang_id uuid, to_gang_id uuid NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX base_captures_base_idx ON public.base_captures(base_id, captured_at DESC);

CREATE TABLE public.weapons (
  id text PRIMARY KEY, name text NOT NULL, damage int NOT NULL, range_px int NOT NULL,
  cooldown_ms int NOT NULL, weapon_type text NOT NULL);
INSERT INTO public.weapons VALUES
('fists','Fists',6,20,550,'unarmed'),('pipe_wrench','Pipe Wrench',14,22,800,'blunt'),
('spear','Spear',12,34,900,'polearm'),('shock_baton','Shock Baton',10,20,500,'blunt'),
('woodaxe','Wood Axe',16,22,1000,'blade'),('scimitar','Scimitar',13,24,700,'blade'),
('katana','Katana',15,26,750,'blade'),('harpoon','Harpoon',11,44,1100,'ranged'),
('warhammer','Warhammer',20,22,1300,'blunt');

CREATE TABLE public.items (
  id text PRIMARY KEY, name text NOT NULL, category text NOT NULL CHECK (category IN ('equipment','item')),
  effect text NOT NULL, amount int NOT NULL, description text NOT NULL);
INSERT INTO public.items VALUES
('bandage','Bandage','item','heal',30,'Restores 30 HP.'),
('medkit','Medkit','item','heal',70,'Restores 70 HP.'),
('padded_vest','Padded Vest','equipment','armor',20,'Reduces damage taken by 20%.');

CREATE TABLE public.player_weapons (
  user_id uuid NOT NULL, weapon_id text NOT NULL REFERENCES public.weapons(id),
  equipped boolean NOT NULL DEFAULT false, acquired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, weapon_id));
CREATE UNIQUE INDEX player_weapons_one_equipped ON public.player_weapons(user_id) WHERE equipped;

CREATE TABLE public.player_inventory (
  user_id uuid NOT NULL, item_id text NOT NULL REFERENCES public.items(id),
  qty int NOT NULL DEFAULT 0 CHECK (qty >= 0), equipped boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, item_id));

CREATE TABLE public.player_combat (
  user_id uuid PRIMARY KEY, hp int NOT NULL DEFAULT 100, max_hp int NOT NULL DEFAULT 100,
  protected_until timestamptz NOT NULL DEFAULT now(), last_attack_at timestamptz NOT NULL DEFAULT 'epoch',
  kills int NOT NULL DEFAULT 0, deaths int NOT NULL DEFAULT 0, respawn_seq int NOT NULL DEFAULT 0,
  respawn_map text, respawn_x int, respawn_y int, last_supply_at timestamptz NOT NULL DEFAULT 'epoch',
  updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.player_positions (
  user_id uuid PRIMARY KEY, map_id text NOT NULL, x real NOT NULL, y real NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX player_positions_map_idx ON public.player_positions(map_id, updated_at);

CREATE TABLE public.player_respawns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, killer_id uuid,
  base_id text REFERENCES public.bases(id) ON DELETE SET NULL, map_id text NOT NULL, x int NOT NULL, y int NOT NULL,
  seq int NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, seq));

CREATE TABLE public.gang_daily_hours (
  gang_id uuid NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE, day date NOT NULL,
  hours int NOT NULL DEFAULT 0, PRIMARY KEY (gang_id, day));
CREATE INDEX gang_daily_day_idx ON public.gang_daily_hours(day, hours DESC);
CREATE TABLE public.gang_total_hours (
  gang_id uuid PRIMARY KEY REFERENCES public.gangs(id) ON DELETE CASCADE, hours int NOT NULL DEFAULT 0);

CREATE TABLE public.global_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, username text NOT NULL, tag text,
  body text NOT NULL, deleted boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.gang_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gang_id uuid NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, username text NOT NULL, tag text,
  body text NOT NULL, deleted boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.alliance_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gang_id uuid NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, username text NOT NULL, tag text,
  body text NOT NULL, deleted boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX global_chat_time_idx ON public.global_chat_messages(created_at DESC);
CREATE INDEX gang_chat_time_idx ON public.gang_chat_messages(gang_id, created_at DESC);
CREATE INDEX alliance_chat_time_idx ON public.alliance_chat_messages(gang_id, created_at DESC);

CREATE TABLE public.chat_state (
  user_id uuid PRIMARY KEY, last_at timestamptz NOT NULL DEFAULT 'epoch',
  window_start timestamptz NOT NULL DEFAULT 'epoch', window_count int NOT NULL DEFAULT 0,
  muted_until timestamptz);

-- grants: read-only for clients, all writes go through security definer functions
GRANT SELECT ON public.game_config, public.user_roles, public.gangs, public.gang_members, public.gang_invitations,
  public.gang_alliances, public.bases, public.base_rooms, public.base_captures, public.weapons, public.items,
  public.player_weapons, public.player_inventory, public.player_combat, public.player_positions, public.player_respawns,
  public.gang_daily_hours, public.gang_total_hours, public.global_chat_messages, public.gang_chat_messages,
  public.alliance_chat_messages, public.chat_state TO authenticated;
GRANT ALL ON public.game_config, public.user_roles, public.gangs, public.gang_members, public.gang_invitations,
  public.gang_alliances, public.bases, public.base_rooms, public.base_captures, public.weapons, public.items,
  public.player_weapons, public.player_inventory, public.player_combat, public.player_positions, public.player_respawns,
  public.gang_daily_hours, public.gang_total_hours, public.global_chat_messages, public.gang_chat_messages,
  public.alliance_chat_messages, public.chat_state TO service_role;

ALTER TABLE public.game_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gangs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gang_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gang_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gang_alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_combat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_respawns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gang_daily_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gang_total_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gang_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_state ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION public.gang_of(_user_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gang_id FROM public.gang_members WHERE user_id = _user_id $$;
CREATE OR REPLACE FUNCTION public.are_allied(_a uuid, _b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _a IS NOT NULL AND _b IS NOT NULL AND EXISTS (SELECT 1 FROM public.gang_alliances
    WHERE status = 'active' AND ((gang_a = _a AND gang_b = _b) OR (gang_a = _b AND gang_b = _a))) $$;
CREATE OR REPLACE FUNCTION public.gang_role_of(_user_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.gang_members WHERE user_id = _user_id $$;

CREATE POLICY "config readable" ON public.game_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "gangs readable" ON public.gangs FOR SELECT TO authenticated USING (true);
CREATE POLICY "members readable" ON public.gang_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "invites visible to invitee or gang staff" ON public.gang_invitations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (gang_id = public.gang_of(auth.uid()) AND public.gang_role_of(auth.uid()) IN ('leader','officer')));
CREATE POLICY "alliances readable" ON public.gang_alliances FOR SELECT TO authenticated USING (true);
CREATE POLICY "bases readable" ON public.bases FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms readable" ON public.base_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "captures readable" ON public.base_captures FOR SELECT TO authenticated USING (true);
CREATE POLICY "weapons readable" ON public.weapons FOR SELECT TO authenticated USING (true);
CREATE POLICY "items readable" ON public.items FOR SELECT TO authenticated USING (true);
CREATE POLICY "own weapons" ON public.player_weapons FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own inventory" ON public.player_inventory FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "combat readable" ON public.player_combat FOR SELECT TO authenticated USING (true);
CREATE POLICY "own position" ON public.player_positions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own respawns" ON public.player_respawns FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "daily hours readable" ON public.gang_daily_hours FOR SELECT TO authenticated USING (true);
CREATE POLICY "total hours readable" ON public.gang_total_hours FOR SELECT TO authenticated USING (true);
CREATE POLICY "global chat readable" ON public.global_chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "gang chat members only" ON public.gang_chat_messages FOR SELECT TO authenticated USING (gang_id = public.gang_of(auth.uid()));
CREATE POLICY "alliance chat allies only" ON public.alliance_chat_messages FOR SELECT TO authenticated
  USING (gang_id = public.gang_of(auth.uid()) OR public.are_allied(gang_id, public.gang_of(auth.uid())));
CREATE POLICY "own chat state" ON public.chat_state FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.gangs, public.gang_members, public.gang_invitations,
  public.gang_alliances, public.bases, public.player_combat, public.player_weapons, public.player_inventory,
  public.gang_daily_hours, public.gang_total_hours, public.global_chat_messages, public.gang_chat_messages,
  public.alliance_chat_messages;