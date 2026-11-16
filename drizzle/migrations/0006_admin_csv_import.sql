CREATE OR REPLACE FUNCTION public.import_csv_records(_files jsonb, _replace boolean DEFAULT false, _new_user_ids uuid[] DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  f jsonb; r jsonb; v jsonb; t text; k text; allowed text[];
  cols text; selects text; predicate text; assignments text; keys text[];
  exists_row boolean; imported integer; skipped integer;
  results jsonb := '[]'::jsonb; errors jsonb := '[]'::jsonb;
  failure_file text; failure_row integer; failure_field text; state text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF jsonb_typeof(_files) <> 'array' THEN RAISE EXCEPTION 'Invalid batch'; END IF;
  BEGIN
    FOR f IN SELECT value FROM jsonb_array_elements(_files) LOOP
      t := f->>'table'; imported := 0; skipped := 0;
      failure_file := f->>'name'; failure_row := 1; failure_field := 'file';
      CASE t
        WHEN 'profiles' THEN allowed := ARRAY['id','username','body_id','head_id','hat_id','melee_id','facing_direction','animation_state','map_id','pos_x','pos_y','updated_at']; keys := ARRAY['id'];
        WHEN 'gangs' THEN allowed := ARRAY['id','name','tag','emblem','color','leader_id','preferred_base_id','created_at']; keys := ARRAY['id'];
        WHEN 'gang_members' THEN allowed := ARRAY['user_id','gang_id','role','joined_at']; keys := ARRAY['user_id'];
        WHEN 'gang_invitations' THEN allowed := ARRAY['id','gang_id','user_id','invited_by','status','created_at']; keys := ARRAY['id'];
        WHEN 'gang_alliances' THEN allowed := ARRAY['id','gang_a','gang_b','requested_by','status','created_at']; keys := ARRAY['id'];
        WHEN 'gang_daily_hours' THEN allowed := ARRAY['gang_id','day','hours']; keys := ARRAY['gang_id','day'];
        WHEN 'gang_total_hours' THEN allowed := ARRAY['gang_id','hours']; keys := ARRAY['gang_id'];
        WHEN 'player_weapons' THEN allowed := ARRAY['user_id','weapon_id','equipped','acquired_at']; keys := ARRAY['user_id','weapon_id'];
        WHEN 'player_inventory' THEN allowed := ARRAY['user_id','item_id','qty','equipped']; keys := ARRAY['user_id','item_id'];
        WHEN 'player_combat' THEN allowed := ARRAY['user_id','hp','max_hp','protected_until','last_attack_at','kills','deaths','respawn_seq','respawn_map','respawn_x','respawn_y','last_supply_at','updated_at']; keys := ARRAY['user_id'];
        WHEN 'player_positions' THEN allowed := ARRAY['user_id','map_id','x','y','updated_at']; keys := ARRAY['user_id'];
        WHEN 'player_respawns' THEN allowed := ARRAY['id','user_id','killer_id','base_id','map_id','x','y','seq','created_at']; keys := ARRAY['id'];
        WHEN 'player_art' THEN allowed := ARRAY['id','user_id','kind','name','sheet_path','original_path','frames','frame_ms','created_at']; keys := ARRAY['id'];
        WHEN 'global_chat_messages' THEN allowed := ARRAY['id','user_id','username','tag','body','deleted','created_at']; keys := ARRAY['id'];
        WHEN 'gang_chat_messages','alliance_chat_messages' THEN allowed := ARRAY['id','gang_id','user_id','username','tag','body','deleted','created_at']; keys := ARRAY['id'];
        WHEN 'user_roles' THEN allowed := ARRAY['id','user_id','role']; keys := ARRAY['id'];
        ELSE RAISE EXCEPTION 'Invalid table' USING ERRCODE = '22023';
      END CASE;
      FOR r IN SELECT value FROM jsonb_array_elements(f->'rows') LOOP
        failure_row := (r->>'row')::integer; failure_field := array_to_string(keys, ', '); v := r->'values';
        FOR k IN SELECT jsonb_object_keys(v) LOOP
          IF NOT k = ANY(allowed) THEN RAISE EXCEPTION 'Invalid column' USING ERRCODE = '22023'; END IF;
        END LOOP;
        FOREACH k IN ARRAY keys LOOP
          IF v->>k IS NULL THEN RAISE EXCEPTION 'Missing ID' USING ERRCODE = '23502'; END IF;
        END LOOP;
        SELECT string_agg(format('%I', c), ', ' ORDER BY c), string_agg(format('s.%I', c), ', ' ORDER BY c),
               string_agg(format('%I = s.%I', c, c), ', ' ORDER BY c) FILTER (WHERE NOT c = ANY(keys))
          INTO cols, selects, assignments FROM jsonb_object_keys(v) c;
        SELECT string_agg(format('d.%I = s.%I', c, c), ' AND ') INTO predicate FROM unnest(keys) c;
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I d, jsonb_populate_record(NULL::public.%I, $1) s WHERE %s)', t, t, predicate)
          INTO exists_row USING v;
        IF exists_row AND NOT _replace AND NOT (t = 'profiles' AND (v->>'id')::uuid = ANY(_new_user_ids)) THEN
          skipped := skipped + 1;
          CONTINUE;
        END IF;
        IF exists_row AND assignments IS NOT NULL THEN
          EXECUTE format('UPDATE public.%I d SET %s FROM jsonb_populate_record(NULL::public.%I, $1) s WHERE %s', t, assignments, t, predicate) USING v;
        ELSIF NOT exists_row THEN
          EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I, $1) s', t, cols, selects, t) USING v;
        END IF;
        imported := imported + 1;
      END LOOP;
      results := results || jsonb_build_array(jsonb_build_object('file', failure_file, 'table', t, 'imported', imported, 'skipped', skipped, 'ready', 0));
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS state = RETURNED_SQLSTATE;
    errors := jsonb_build_array(jsonb_build_object('file', failure_file, 'row', failure_row, 'field', failure_field,
      'message', CASE state
        WHEN '23505' THEN 'A unique value already exists. Check duplicate names, tags, memberships or equipped weapons.'
        WHEN '23503' THEN 'A referenced record is missing. Include the matching user, player or gang file.'
        WHEN '23502' THEN 'A required value is missing.'
        WHEN '23514' THEN 'This record violates a validation rule.'
        WHEN '22P02' THEN 'A value has the wrong format.'
        ELSE 'This row could not be imported. Check its columns and values.' END));
    results := '[]'::jsonb;
  END;
  RETURN jsonb_build_object('files', results, 'errors', errors);
END $$;
REVOKE ALL ON FUNCTION public.import_csv_records(jsonb, boolean, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_csv_records(jsonb, boolean, uuid[]) TO service_role;