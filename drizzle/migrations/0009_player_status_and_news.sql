ALTER TABLE public.profiles ADD COLUMN status_text text NOT NULL DEFAULT '' CHECK (char_length(status_text) <= 280);
CREATE TABLE public.world_news (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), author_id uuid NOT NULL REFERENCES public.profiles(id), title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120), body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 10000), image_path text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,DELETE ON public.world_news TO authenticated;
GRANT ALL ON public.world_news TO service_role;
ALTER TABLE public.world_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players read news" ON public.world_news FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins publish news" ON public.world_news FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND author_id=auth.uid() AND (image_path IS NULL OR image_path LIKE auth.uid()::text || '/news/%'));
CREATE POLICY "admins remove news" ON public.world_news FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));