CREATE TABLE public.world_maps (
  id text PRIMARY KEY, name text NOT NULL, width int NOT NULL DEFAULT 30 CHECK (width BETWEEN 8 AND 200),
  height int NOT NULL DEFAULT 20 CHECK (height BETWEEN 8 AND 200), ground_tile int NOT NULL DEFAULT 1,
  spawn_x int NOT NULL DEFAULT 2, spawn_y int NOT NULL DEFAULT 2, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.world_tiles (
  map_id text NOT NULL, layer text NOT NULL CHECK (layer IN ('ground','decor','objects','above')),
  x int NOT NULL, y int NOT NULL, tile int NOT NULL DEFAULT 0, PRIMARY KEY (map_id, layer, x, y));
CREATE TABLE public.world_warps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), map_id text NOT NULL, x int NOT NULL, y int NOT NULL,
  w int NOT NULL DEFAULT 1, h int NOT NULL DEFAULT 1, to_map text NOT NULL, to_x int NOT NULL, to_y int NOT NULL);
CREATE TABLE public.world_npcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), map_id text NOT NULL, x int NOT NULL, y int NOT NULL,
  name text NOT NULL DEFAULT 'NPC', body_id text NOT NULL DEFAULT 'body_tunic_blue', head_id text NOT NULL DEFAULT 'head_light',
  hat_id text NOT NULL DEFAULT 'hat_none', dir text NOT NULL DEFAULT 'down', dialog text NOT NULL DEFAULT '');
CREATE TABLE public.world_furniture (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, w int NOT NULL CHECK (w BETWEEN 1 AND 6),
  h int NOT NULL CHECK (h BETWEEN 1 AND 6), tiles int[] NOT NULL, solid boolean[] NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.world_props (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), map_id text NOT NULL,
  furniture_id uuid NOT NULL REFERENCES public.world_furniture(id) ON DELETE CASCADE, x int NOT NULL, y int NOT NULL);
CREATE INDEX ON public.world_warps(map_id); CREATE INDEX ON public.world_npcs(map_id); CREATE INDEX ON public.world_props(map_id);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['world_maps','world_tiles','world_warps','world_npcs','world_furniture','world_props'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "world readable" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "admins insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin''))', t);
    EXECUTE format('CREATE POLICY "admins update" ON public.%I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t);
    EXECUTE format('CREATE POLICY "admins delete" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t);
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
  END LOOP;
END $$;