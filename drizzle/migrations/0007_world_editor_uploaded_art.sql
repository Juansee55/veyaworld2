CREATE TABLE public.world_assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, kind text NOT NULL CHECK (kind IN ('tileset','object')), path text NOT NULL UNIQUE, width int NOT NULL, height int NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CHECK ((kind = 'tileset' AND height = 16 AND width BETWEEN 16 AND 8192 AND width % 16 = 0) OR (kind = 'object' AND width BETWEEN 16 AND 96 AND height BETWEEN 16 AND 96 AND width % 16 = 0 AND height % 16 = 0)));
GRANT SELECT, INSERT, DELETE ON public.world_assets TO authenticated;
GRANT ALL ON public.world_assets TO service_role;
ALTER TABLE public.world_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "world art readable" ON public.world_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins upload world art" ON public.world_assets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND path LIKE auth.uid()::text || '/world/%');
CREATE POLICY "admins remove world art" ON public.world_assets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.world_tiles ADD COLUMN asset_id uuid REFERENCES public.world_assets(id), ADD COLUMN solid boolean NOT NULL DEFAULT false;
ALTER TABLE public.world_furniture ADD COLUMN asset_id uuid REFERENCES public.world_assets(id);