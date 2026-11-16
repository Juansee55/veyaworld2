ALTER TABLE public.world_assets DROP CONSTRAINT world_assets_check;
ALTER TABLE public.world_assets ADD CONSTRAINT world_assets_dimensions CHECK (width > 0 AND height > 0);
ALTER TABLE public.world_furniture DROP CONSTRAINT world_furniture_w_check, DROP CONSTRAINT world_furniture_h_check;
ALTER TABLE public.world_furniture ADD CONSTRAINT world_furniture_dimensions CHECK (w > 0 AND h > 0);
ALTER TABLE public.world_props ADD COLUMN display_w real, ADD COLUMN display_h real;
ALTER TABLE public.world_props ADD CONSTRAINT world_prop_dimensions CHECK ((display_w IS NULL OR display_w > 0) AND (display_h IS NULL OR display_h > 0));
CREATE OR REPLACE FUNCTION public.admin_drag_player(_user uuid, _map text, _x real, _y real) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
 IF _x IS NULL OR _y IS NULL OR _x < 0 OR _y < 0 OR _x > 4000 OR _y > 4000 OR _map IS NULL THEN RAISE EXCEPTION 'Invalid destination'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user) THEN RAISE EXCEPTION 'Player not found'; END IF;
 UPDATE public.player_combat SET respawn_seq = respawn_seq + 1, respawn_map = _map, respawn_x = round(_x), respawn_y = round(_y), updated_at = now() WHERE user_id = _user;
 UPDATE public.player_positions SET map_id = _map, x = _x, y = _y, updated_at = now() WHERE user_id = _user;
 UPDATE public.profiles SET map_id = _map, pos_x = _x, pos_y = _y, updated_at = now() WHERE id = _user;
END $$;
REVOKE ALL ON FUNCTION public.admin_drag_player(uuid,text,real,real) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_drag_player(uuid,text,real,real) TO authenticated;