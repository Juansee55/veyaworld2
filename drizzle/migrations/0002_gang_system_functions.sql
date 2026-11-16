CREATE TABLE public.tick_state (id int PRIMARY KEY, last_tick_at timestamptz NOT NULL DEFAULT 'epoch');
INSERT INTO public.tick_state VALUES (1, 'epoch');
GRANT ALL ON public.tick_state TO service_role;
ALTER TABLE public.tick_state ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.cfg(_key text) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT num FROM public.game_config WHERE key = _key $$;
CREATE OR REPLACE FUNCTION public.cfg_text(_key text) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT txt FROM public.game_config WHERE key = _key $$;
CREATE OR REPLACE FUNCTION public.game_today() RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT (now() AT TIME ZONE coalesce(public.cfg_text('timezone'), 'UTC'))::date $$;

CREATE OR REPLACE FUNCTION public.require_uid() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF; RETURN auth.uid(); END $$;

CREATE OR REPLACE FUNCTION public.require_staff() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid; r text;
BEGIN
  SELECT gang_id, role INTO g, r FROM public.gang_members WHERE user_id = public.require_uid();
  IF g IS NULL THEN RAISE EXCEPTION 'You are not in a gang'; END IF;
  IF r NOT IN ('leader','officer') THEN RAISE EXCEPTION 'Only the leader or officers can do that'; END IF;
  RETURN g;
END $$;

CREATE OR REPLACE FUNCTION public.award_hours(_gang uuid, _amount int) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _gang IS NULL OR _amount <= 0 THEN RETURN; END IF;
  INSERT INTO public.gang_daily_hours(gang_id, day, hours) VALUES (_gang, public.game_today(), _amount)
    ON CONFLICT (gang_id, day) DO UPDATE SET hours = gang_daily_hours.hours + EXCLUDED.hours;
  INSERT INTO public.gang_total_hours(gang_id, hours) VALUES (_gang, _amount)
    ON CONFLICT (gang_id) DO UPDATE SET hours = gang_total_hours.hours + EXCLUDED.hours;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_player() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid(); mx int := public.cfg('player_max_hp');
BEGIN
  INSERT INTO public.player_combat(user_id, hp, max_hp) VALUES (uid, mx, mx) ON CONFLICT DO NOTHING;
  INSERT INTO public.player_weapons(user_id, weapon_id, equipped) VALUES (uid, 'fists', true) ON CONFLICT DO NOTHING;
  INSERT INTO public.player_inventory(user_id, item_id, qty) VALUES (uid, 'bandage', 3), (uid, 'padded_vest', 1) ON CONFLICT DO NOTHING;
END $$;

-- ================= GANGS =================
CREATE OR REPLACE FUNCTION public.create_gang(_name text, _tag text, _emblem text, _color text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid(); g uuid;
BEGIN
  _name := btrim(_name); _tag := upper(btrim(_tag)); _emblem := btrim(coalesce(_emblem, ''));
  IF public.gang_of(uid) IS NOT NULL THEN RAISE EXCEPTION 'You are already in a gang'; END IF;
  IF _name !~ '^[A-Za-z0-9 _-]{3,24}$' THEN RAISE EXCEPTION 'Name must be 3-24 letters, numbers, spaces, - or _'; END IF;
  IF _tag !~ '^[A-Z0-9]{2,5}$' THEN RAISE EXCEPTION 'Tag must be 2-5 letters or numbers'; END IF;
  IF char_length(_emblem) < 1 OR char_length(_emblem) > 2 THEN RAISE EXCEPTION 'Pick one emblem'; END IF;
  IF _color !~ '^#[0-9a-fA-F]{6}$' THEN RAISE EXCEPTION 'Invalid color'; END IF;
  BEGIN
    INSERT INTO public.gangs(name, tag, emblem, color, leader_id) VALUES (_name, _tag, _emblem, _color, uid) RETURNING id INTO g;
  EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'That gang name or tag is already taken'; END;
  INSERT INTO public.gang_members(user_id, gang_id, role) VALUES (uid, g, 'leader');
  INSERT INTO public.gang_total_hours(gang_id, hours) VALUES (g, 0);
  UPDATE public.gang_invitations SET status = 'cancelled' WHERE user_id = uid AND status = 'pending';
  RETURN g;
END $$;

CREATE OR REPLACE FUNCTION public.invite_player(_username text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid := public.require_staff(); t uuid; n int;
BEGIN
  SELECT count(*) INTO n FROM public.profiles WHERE lower(username) = lower(btrim(_username));
  IF n = 0 THEN RAISE EXCEPTION 'No player with that name'; END IF;
  IF n > 1 THEN RAISE EXCEPTION 'Several players share that name'; END IF;
  SELECT id INTO t FROM public.profiles WHERE lower(username) = lower(btrim(_username));
  IF public.gang_of(t) IS NOT NULL THEN RAISE EXCEPTION 'That player is already in a gang'; END IF;
  IF (SELECT count(*) FROM public.gang_members WHERE gang_id = g) >= 30 THEN RAISE EXCEPTION 'Gang is full (30 members)'; END IF;
  BEGIN
    INSERT INTO public.gang_invitations(gang_id, user_id, invited_by) VALUES (g, t, auth.uid());
  EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'That player is already invited'; END;
END $$;

CREATE OR REPLACE FUNCTION public.respond_invitation(_id uuid, _accept boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid(); inv public.gang_invitations;
BEGIN
  SELECT * INTO inv FROM public.gang_invitations WHERE id = _id AND user_id = uid AND status = 'pending' FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF NOT _accept THEN UPDATE public.gang_invitations SET status = 'rejected' WHERE id = _id; RETURN; END IF;
  IF public.gang_of(uid) IS NOT NULL THEN RAISE EXCEPTION 'You are already in a gang'; END IF;
  PERFORM 1 FROM public.gangs WHERE id = inv.gang_id FOR UPDATE;
  IF (SELECT count(*) FROM public.gang_members WHERE gang_id = inv.gang_id) >= 30 THEN RAISE EXCEPTION 'Gang is full (30 members)'; END IF;
  INSERT INTO public.gang_members(user_id, gang_id, role) VALUES (uid, inv.gang_id, 'member');
  UPDATE public.gang_invitations SET status = 'accepted' WHERE id = _id;
  UPDATE public.gang_invitations SET status = 'cancelled' WHERE user_id = uid AND status = 'pending';
END $$;

CREATE OR REPLACE FUNCTION public.cancel_invitation(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid := public.require_staff();
BEGIN UPDATE public.gang_invitations SET status = 'cancelled' WHERE id = _id AND gang_id = g AND status = 'pending'; END $$;

CREATE OR REPLACE FUNCTION public.kick_member(_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid := public.require_staff(); my text := public.gang_role_of(auth.uid()); tr text;
BEGIN
  SELECT role INTO tr FROM public.gang_members WHERE user_id = _user AND gang_id = g;
  IF tr IS NULL THEN RAISE EXCEPTION 'Not a member of your gang'; END IF;
  IF _user = auth.uid() THEN RAISE EXCEPTION 'Use Leave instead'; END IF;
  IF tr = 'leader' OR (tr = 'officer' AND my <> 'leader') THEN RAISE EXCEPTION 'You cannot remove that member'; END IF;
  DELETE FROM public.gang_members WHERE user_id = _user;
END $$;

CREATE OR REPLACE FUNCTION public.set_member_role(_user uuid, _role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid := public.require_staff();
BEGIN
  IF public.gang_role_of(auth.uid()) <> 'leader' THEN RAISE EXCEPTION 'Only the leader can change ranks'; END IF;
  IF _role NOT IN ('officer','member') THEN RAISE EXCEPTION 'Invalid rank'; END IF;
  UPDATE public.gang_members SET role = _role WHERE user_id = _user AND gang_id = g AND role <> 'leader';
  IF NOT FOUND THEN RAISE EXCEPTION 'Not a member of your gang'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.transfer_leadership(_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid := public.require_staff();
BEGIN
  IF public.gang_role_of(auth.uid()) <> 'leader' THEN RAISE EXCEPTION 'Only the leader can do that'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gang_members WHERE user_id = _user AND gang_id = g AND user_id <> auth.uid()) THEN RAISE EXCEPTION 'Not a member of your gang'; END IF;
  UPDATE public.gang_members SET role = 'officer' WHERE user_id = auth.uid();
  UPDATE public.gang_members SET role = 'leader' WHERE user_id = _user;
  UPDATE public.gangs SET leader_id = _user WHERE id = g;
END $$;

CREATE OR REPLACE FUNCTION public.disband_gang() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid := public.require_staff();
BEGIN
  IF public.gang_role_of(auth.uid()) <> 'leader' THEN RAISE EXCEPTION 'Only the leader can disband'; END IF;
  UPDATE public.bases SET owner_gang_id = NULL, hp = max_hp, status = 'idle', attacker_gang_id = NULL WHERE owner_gang_id = g;
  DELETE FROM public.gangs WHERE id = g;
END $$;

CREATE OR REPLACE FUNCTION public.leave_gang() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid(); g uuid := public.gang_of(uid);
BEGIN
  IF g IS NULL THEN RAISE EXCEPTION 'You are not in a gang'; END IF;
  IF public.gang_role_of(uid) = 'leader' THEN
    IF (SELECT count(*) FROM public.gang_members WHERE gang_id = g) > 1 THEN RAISE EXCEPTION 'Transfer leadership before leaving'; END IF;
    PERFORM public.disband_gang(); RETURN;
  END IF;
  DELETE FROM public.gang_members WHERE user_id = uid;
END $$;

CREATE OR REPLACE FUNCTION public.set_preferred_base(_base text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid := public.require_staff();
BEGIN
  IF _base IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.bases WHERE id = _base AND owner_gang_id = g) THEN RAISE EXCEPTION 'Your gang does not own that base'; END IF;
  UPDATE public.gangs SET preferred_base_id = _base WHERE id = g;
END $$;

-- ================= ALLIANCES =================
CREATE OR REPLACE FUNCTION public.active_ally_count(_g uuid) RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT count(*)::int FROM public.gang_alliances WHERE status = 'active' AND (gang_a = _g OR gang_b = _g) $$;

CREATE OR REPLACE FUNCTION public.request_alliance(_tag text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid := public.require_staff(); o uuid;
BEGIN
  SELECT id INTO o FROM public.gangs WHERE upper(tag) = upper(btrim(_tag));
  IF o IS NULL THEN RAISE EXCEPTION 'No gang with that tag'; END IF;
  IF o = g THEN RAISE EXCEPTION 'That is your own gang'; END IF;
  IF public.active_ally_count(g) >= 6 THEN RAISE EXCEPTION 'Your gang already has 6 allies'; END IF;
  IF public.active_ally_count(o) >= 6 THEN RAISE EXCEPTION 'That gang already has 6 allies'; END IF;
  BEGIN
    INSERT INTO public.gang_alliances(gang_a, gang_b, requested_by) VALUES (g, o, g);
  EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'An alliance or request already exists'; END;
END $$;

CREATE OR REPLACE FUNCTION public.respond_alliance(_id uuid, _accept boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid := public.require_staff(); a public.gang_alliances;
BEGIN
  SELECT * INTO a FROM public.gang_alliances WHERE id = _id AND status = 'pending' AND requested_by <> g AND (gang_a = g OR gang_b = g) FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF NOT _accept THEN DELETE FROM public.gang_alliances WHERE id = _id; RETURN; END IF;
  PERFORM 1 FROM public.gangs WHERE id IN (a.gang_a, a.gang_b) ORDER BY id FOR UPDATE;
  IF public.active_ally_count(a.gang_a) >= 6 OR public.active_ally_count(a.gang_b) >= 6 THEN RAISE EXCEPTION 'One of the gangs already has 6 allies'; END IF;
  UPDATE public.gang_alliances SET status = 'active' WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.remove_alliance(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid := public.require_staff();
BEGIN
  DELETE FROM public.gang_alliances WHERE id = _id AND (gang_a = g OR gang_b = g);
  IF NOT FOUND THEN RAISE EXCEPTION 'Alliance not found'; END IF;
END $$;

-- ================= POSITION + BASES =================
CREATE OR REPLACE FUNCTION public.report_state(_map text, _x real, _y real) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid(); p public.player_positions; dt double precision;
BEGIN
  IF _map IS NULL OR char_length(_map) > 48 OR _x < 0 OR _y < 0 OR _x > 4000 OR _y > 4000 THEN RETURN false; END IF;
  SELECT * INTO p FROM public.player_positions WHERE user_id = uid;
  IF p.user_id IS NOT NULL AND p.map_id = _map THEN
    dt := extract(epoch FROM now() - p.updated_at);
    IF sqrt((p.x - _x)^2 + (p.y - _y)^2) > 120 * dt + 48 THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.player_positions(user_id, map_id, x, y, updated_at) VALUES (uid, _map, _x, _y, now())
    ON CONFLICT (user_id) DO UPDATE SET map_id = EXCLUDED.map_id, x = EXCLUDED.x, y = EXCLUDED.y, updated_at = now();
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.base_tick() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b public.bases; ts public.tick_state; defenders boolean; contested boolean; att uuid; n_att int;
  new_hp int; new_status text; new_owner uuid; mins int; start_hp int := public.cfg('capture_start_hp');
BEGIN
  PERFORM public.require_uid();
  SELECT * INTO ts FROM public.tick_state WHERE id = 1 FOR UPDATE SKIP LOCKED;
  IF ts.id IS NULL OR ts.last_tick_at > now() - make_interval(secs => public.cfg('tick_seconds')::double precision - 0.2) THEN RETURN; END IF;
  UPDATE public.tick_state SET last_tick_at = now() WHERE id = 1;

  FOR b IN SELECT * FROM public.bases ORDER BY id FOR UPDATE LOOP
    CREATE TEMP TABLE IF NOT EXISTS _present(gang_id uuid, n int) ON COMMIT DROP;
    TRUNCATE _present;
    INSERT INTO _present SELECT gm.gang_id, count(*)::int FROM public.player_positions p
      JOIN public.gang_members gm ON gm.user_id = p.user_id
      WHERE p.map_id = b.zone_map AND p.updated_at > now() - interval '6 seconds'
        AND (p.x - b.zone_x)^2 + (p.y - b.zone_y)^2 <= (b.zone_r::double precision)^2
      GROUP BY gm.gang_id;
    defenders := b.owner_gang_id IS NOT NULL AND EXISTS (SELECT 1 FROM _present WHERE gang_id = b.owner_gang_id);
    SELECT count(*) INTO n_att FROM _present WHERE b.owner_gang_id IS NULL OR (gang_id <> b.owner_gang_id AND NOT public.are_allied(gang_id, b.owner_gang_id));
    contested := EXISTS (SELECT 1 FROM _present x JOIN _present y ON x.gang_id < y.gang_id
      WHERE (b.owner_gang_id IS NULL OR (x.gang_id <> b.owner_gang_id AND NOT public.are_allied(x.gang_id, b.owner_gang_id)))
        AND (b.owner_gang_id IS NULL OR (y.gang_id <> b.owner_gang_id AND NOT public.are_allied(y.gang_id, b.owner_gang_id)))
        AND NOT public.are_allied(x.gang_id, y.gang_id));
    new_hp := b.hp; new_status := 'idle'; new_owner := b.owner_gang_id; att := NULL;
    IF n_att > 0 AND (defenders OR contested) THEN
      new_status := 'contested';
    ELSIF n_att > 0 THEN
      SELECT gang_id INTO att FROM _present WHERE b.owner_gang_id IS NULL OR (gang_id <> b.owner_gang_id AND NOT public.are_allied(gang_id, b.owner_gang_id))
        ORDER BY n DESC, gang_id LIMIT 1;
      new_status := 'attacking'; new_hp := b.hp - 1;
      IF new_hp <= 0 THEN
        INSERT INTO public.base_captures(base_id, from_gang_id, to_gang_id) VALUES (b.id, b.owner_gang_id, att);
        UPDATE public.gangs SET preferred_base_id = NULL WHERE preferred_base_id = b.id;
        new_owner := att; new_hp := LEAST(start_hp, b.max_hp); new_status := 'captured';
        PERFORM public.award_hours(att, public.cfg('capture_bonus_hs')::int);
        UPDATE public.bases SET owner_gang_id = new_owner, hp = new_hp, status = new_status, attacker_gang_id = NULL,
          captured_at = now(), last_award_at = now() WHERE id = b.id;
        CONTINUE;
      END IF;
    ELSIF defenders AND b.hp < b.max_hp THEN
      new_status := 'repairing'; new_hp := LEAST(b.max_hp, b.hp + 1);
    END IF;
    IF new_hp <> b.hp OR new_status <> b.status OR att IS DISTINCT FROM b.attacker_gang_id THEN
      UPDATE public.bases SET hp = new_hp, status = new_status, attacker_gang_id = att WHERE id = b.id;
    END IF;
    IF b.owner_gang_id IS NOT NULL AND b.last_award_at <= now() - interval '1 minute' THEN
      mins := LEAST(1440, floor(extract(epoch FROM now() - b.last_award_at) / 60)::int);
      PERFORM public.award_hours(b.owner_gang_id, mins * public.cfg('hold_hs_per_minute')::int);
      UPDATE public.bases SET last_award_at = b.last_award_at + make_interval(mins => mins) WHERE id = b.id;
    ELSIF b.owner_gang_id IS NULL AND b.last_award_at < now() - interval '1 minute' THEN
      UPDATE public.bases SET last_award_at = now() WHERE id = b.id;
    END IF;
  END LOOP;
END $$;

-- ================= COMBAT =================
CREATE OR REPLACE FUNCTION public.respawn_point(_user uuid, OUT base_id text, OUT map_id text, OUT x int, OUT y int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid := public.gang_of(_user); pref text; b public.bases;
BEGIN
  IF g IS NOT NULL THEN
    SELECT preferred_base_id INTO pref FROM public.gangs WHERE id = g;
    SELECT * INTO b FROM public.bases WHERE owner_gang_id = g ORDER BY (id = pref) DESC, id LIMIT 1;
    IF b.id IS NOT NULL THEN base_id := b.id; map_id := b.respawn_map; x := b.respawn_x; y := b.respawn_y; RETURN; END IF;
  END IF;
  base_id := NULL; map_id := public.cfg_text('public_spawn_map'); x := public.cfg('public_spawn_x')::int; y := public.cfg('public_spawn_y')::int;
END $$;

-- Called only by the trusted server (after line-of-sight is checked against the map walls).
CREATE OR REPLACE FUNCTION public.resolve_attack(_attacker uuid, _target uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pa public.player_positions; pt public.player_positions; ca public.player_combat; ct public.player_combat;
  w public.weapons; ga uuid := public.gang_of(_attacker); gt uuid := public.gang_of(_target);
  dmg int; armor int := 0; rp record; seq int;
BEGIN
  IF _attacker = _target THEN RAISE EXCEPTION 'invalid_target'; END IF;
  SELECT * INTO pa FROM public.player_positions WHERE user_id = _attacker;
  SELECT * INTO pt FROM public.player_positions WHERE user_id = _target;
  IF pa.user_id IS NULL OR pt.user_id IS NULL OR pa.updated_at < now() - interval '4 seconds' OR pt.updated_at < now() - interval '4 seconds' THEN RAISE EXCEPTION 'out_of_sync'; END IF;
  IF pa.map_id <> pt.map_id THEN RAISE EXCEPTION 'not_here'; END IF;
  SELECT * INTO ca FROM public.player_combat WHERE user_id = _attacker FOR UPDATE;
  SELECT * INTO ct FROM public.player_combat WHERE user_id = _target FOR UPDATE;
  IF ca.user_id IS NULL OR ct.user_id IS NULL THEN RAISE EXCEPTION 'not_ready'; END IF;
  SELECT wp.* INTO w FROM public.player_weapons pw JOIN public.weapons wp ON wp.id = pw.weapon_id WHERE pw.user_id = _attacker AND pw.equipped;
  IF w.id IS NULL THEN SELECT * INTO w FROM public.weapons WHERE id = 'fists'; END IF;
  IF now() < ca.last_attack_at + make_interval(secs => w.cooldown_ms / 1000.0) THEN RAISE EXCEPTION 'cooldown'; END IF;
  IF sqrt((pa.x - pt.x)^2 + (pa.y - pt.y)^2) > w.range_px + 24 THEN RAISE EXCEPTION 'too_far'; END IF;
  IF public.cfg('friendly_fire') = 0 AND ga IS NOT NULL AND gt IS NOT NULL AND (ga = gt OR public.are_allied(ga, gt)) THEN RAISE EXCEPTION 'friendly'; END IF;
  UPDATE public.player_combat SET last_attack_at = now(), protected_until = LEAST(protected_until, now()), updated_at = now() WHERE user_id = _attacker;
  IF ct.protected_until > now() THEN RAISE EXCEPTION 'protected'; END IF;
  SELECT i.amount INTO armor FROM public.player_inventory pi JOIN public.items i ON i.id = pi.item_id
    WHERE pi.user_id = _target AND pi.equipped AND pi.qty > 0 AND i.effect = 'armor' ORDER BY i.amount DESC LIMIT 1;
  dmg := GREATEST(1, round(w.damage * (100 - coalesce(armor, 0)) / 100.0)::int);
  IF ct.hp - dmg > 0 THEN
    UPDATE public.player_combat SET hp = ct.hp - dmg, updated_at = now() WHERE user_id = _target;
    RETURN jsonb_build_object('damage', dmg, 'hp', ct.hp - dmg, 'max_hp', ct.max_hp, 'killed', false, 'weapon', w.id);
  END IF;
  SELECT * INTO rp FROM public.respawn_point(_target);
  seq := ct.respawn_seq + 1;
  INSERT INTO public.player_respawns(user_id, killer_id, base_id, map_id, x, y, seq) VALUES (_target, _attacker, rp.base_id, rp.map_id, rp.x, rp.y, seq);
  UPDATE public.player_combat SET hp = LEAST(ct.max_hp, public.cfg('respawn_hp')::int), deaths = deaths + 1, respawn_seq = seq,
    respawn_map = rp.map_id, respawn_x = rp.x, respawn_y = rp.y,
    protected_until = now() + make_interval(secs => public.cfg('protection_seconds')::double precision), updated_at = now()
    WHERE user_id = _target;
  UPDATE public.player_combat SET kills = kills + 1 WHERE user_id = _attacker;
  UPDATE public.player_positions SET map_id = rp.map_id, x = rp.x, y = rp.y, updated_at = now() WHERE user_id = _target;
  UPDATE public.profiles SET map_id = rp.map_id, pos_x = rp.x, pos_y = rp.y WHERE id = _target;
  RETURN jsonb_build_object('damage', dmg, 'hp', 0, 'max_hp', ct.max_hp, 'killed', true, 'weapon', w.id);
END $$;

CREATE OR REPLACE FUNCTION public.equip_weapon(_weapon text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid();
BEGIN
  _weapon := coalesce(_weapon, 'fists');
  IF NOT EXISTS (SELECT 1 FROM public.player_weapons WHERE user_id = uid AND weapon_id = _weapon) THEN RAISE EXCEPTION 'You do not own that weapon'; END IF;
  UPDATE public.player_weapons SET equipped = false WHERE user_id = uid AND equipped;
  UPDATE public.player_weapons SET equipped = true WHERE user_id = uid AND weapon_id = _weapon;
END $$;

CREATE OR REPLACE FUNCTION public.set_equipment(_item text, _on boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid();
BEGIN
  UPDATE public.player_inventory pi SET equipped = _on FROM public.items i
    WHERE pi.item_id = i.id AND i.category = 'equipment' AND pi.user_id = uid AND pi.item_id = _item AND pi.qty > 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'You do not own that equipment'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.use_item(_item text) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid(); it public.items; c public.player_combat; nh int;
BEGIN
  SELECT * INTO it FROM public.items WHERE id = _item AND category = 'item';
  IF it.id IS NULL THEN RAISE EXCEPTION 'That cannot be used'; END IF;
  UPDATE public.player_inventory SET qty = qty - 1 WHERE user_id = uid AND item_id = _item AND qty > 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'None left'; END IF;
  SELECT * INTO c FROM public.player_combat WHERE user_id = uid FOR UPDATE;
  nh := LEAST(c.max_hp, c.hp + it.amount);
  UPDATE public.player_combat SET hp = nh, updated_at = now() WHERE user_id = uid;
  RETURN nh;
END $$;

CREATE OR REPLACE FUNCTION public.claim_armory() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid(); p public.player_positions; w text;
BEGIN
  SELECT * INTO p FROM public.player_positions WHERE user_id = uid AND updated_at > now() - interval '5 seconds';
  SELECT rack_weapon INTO w FROM public.bases WHERE armory_map = p.map_id AND owner_gang_id = public.gang_of(uid) AND owner_gang_id IS NOT NULL;
  IF w IS NULL THEN RAISE EXCEPTION 'Stand in the armory of a base your gang owns'; END IF;
  INSERT INTO public.player_weapons(user_id, weapon_id) VALUES (uid, w) ON CONFLICT DO NOTHING;
  RETURN w;
END $$;

CREATE OR REPLACE FUNCTION public.claim_supplies() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid(); p public.player_positions;
BEGIN
  SELECT * INTO p FROM public.player_positions WHERE user_id = uid AND updated_at > now() - interval '5 seconds';
  IF NOT EXISTS (SELECT 1 FROM public.bases WHERE respawn_map = p.map_id AND owner_gang_id = public.gang_of(uid) AND owner_gang_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Stand in the respawn room of a base your gang owns'; END IF;
  UPDATE public.player_combat SET last_supply_at = now() WHERE user_id = uid AND last_supply_at < now() - interval '60 seconds';
  IF NOT FOUND THEN RAISE EXCEPTION 'Supplies restock every 60 seconds'; END IF;
  INSERT INTO public.player_inventory(user_id, item_id, qty) VALUES (uid, 'bandage', 3)
    ON CONFLICT (user_id, item_id) DO UPDATE SET qty = GREATEST(player_inventory.qty, 3);
END $$;

-- ================= CHAT =================
CREATE OR REPLACE FUNCTION public.send_chat(_channel text, _body text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid(); cs public.chat_state; g uuid := public.gang_of(uid); uname text; t text;
BEGIN
  _body := btrim(regexp_replace(coalesce(_body, ''), '[[:cntrl:]]', '', 'g'));
  IF char_length(_body) < 1 THEN RAISE EXCEPTION 'Message is empty'; END IF;
  IF char_length(_body) > public.cfg('chat_max_len') THEN RAISE EXCEPTION 'Message is too long'; END IF;
  INSERT INTO public.chat_state(user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT * INTO cs FROM public.chat_state WHERE user_id = uid FOR UPDATE;
  IF cs.muted_until IS NOT NULL AND cs.muted_until > now() THEN RAISE EXCEPTION 'You are muted'; END IF;
  IF cs.last_at > now() - make_interval(secs => public.cfg('chat_min_interval_ms') / 1000.0) THEN RAISE EXCEPTION 'Slow down'; END IF;
  IF cs.window_start > now() - interval '15 seconds' THEN
    IF cs.window_count >= 6 THEN RAISE EXCEPTION 'Too many messages, wait a moment'; END IF;
    UPDATE public.chat_state SET last_at = now(), window_count = window_count + 1 WHERE user_id = uid;
  ELSE
    UPDATE public.chat_state SET last_at = now(), window_start = now(), window_count = 1 WHERE user_id = uid;
  END IF;
  SELECT username INTO uname FROM public.profiles WHERE id = uid;
  SELECT tag INTO t FROM public.gangs WHERE id = g;
  IF _channel = 'global' THEN
    INSERT INTO public.global_chat_messages(user_id, username, tag, body) VALUES (uid, coalesce(uname, 'player'), t, _body);
  ELSIF _channel = 'gang' THEN
    IF g IS NULL THEN RAISE EXCEPTION 'You are not in a gang'; END IF;
    INSERT INTO public.gang_chat_messages(gang_id, user_id, username, tag, body) VALUES (g, uid, coalesce(uname, 'player'), t, _body);
  ELSIF _channel = 'alliance' THEN
    IF g IS NULL THEN RAISE EXCEPTION 'You are not in a gang'; END IF;
    INSERT INTO public.alliance_chat_messages(gang_id, user_id, username, tag, body) VALUES (g, uid, coalesce(uname, 'player'), t, _body);
  ELSE RAISE EXCEPTION 'Unknown channel'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.delete_chat(_channel text, _id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid(); mod boolean := public.has_role(uid, 'moderator') OR public.has_role(uid, 'admin');
  staff boolean := public.gang_role_of(uid) IN ('leader','officer');
BEGIN
  IF _channel = 'global' THEN
    UPDATE public.global_chat_messages SET deleted = true, body = '' WHERE id = _id AND (user_id = uid OR mod);
  ELSIF _channel = 'gang' THEN
    UPDATE public.gang_chat_messages SET deleted = true, body = '' WHERE id = _id AND gang_id = public.gang_of(uid) AND (user_id = uid OR mod OR staff);
  ELSIF _channel = 'alliance' THEN
    UPDATE public.alliance_chat_messages SET deleted = true, body = '' WHERE id = _id AND (user_id = uid OR mod OR (staff AND gang_id = public.gang_of(uid)));
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'You cannot remove that message'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.mute_user(_user uuid, _minutes int) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_uid();
BEGIN
  IF NOT (public.has_role(uid, 'moderator') OR public.has_role(uid, 'admin')) THEN RAISE EXCEPTION 'Moderators only'; END IF;
  INSERT INTO public.chat_state(user_id, muted_until) VALUES (_user, now() + make_interval(mins => GREATEST(0, LEAST(_minutes, 10080))))
    ON CONFLICT (user_id) DO UPDATE SET muted_until = EXCLUDED.muted_until;
END $$;

-- internal-only functions
REVOKE EXECUTE ON FUNCTION public.award_hours(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_attack(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.respawn_point(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_attack(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.award_hours(uuid, int) TO service_role;