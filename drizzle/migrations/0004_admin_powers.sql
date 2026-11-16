CREATE TABLE public.player_admin (
  user_id uuid PRIMARY KEY,
  title text,
  title_color text NOT NULL DEFAULT '#ff6ad5',
  invisible boolean NOT NULL DEFAULT false,
  fly boolean NOT NULL DEFAULT false,
  noclip boolean NOT NULL DEFAULT false,
  size real NOT NULL DEFAULT 1,
  speed real NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.player_admin TO authenticated;
GRANT ALL ON public.player_admin TO service_role;
ALTER TABLE public.player_admin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin fx readable" ON public.player_admin FOR SELECT TO authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_admin;

CREATE OR REPLACE FUNCTION public.am_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin') $$;

CREATE OR REPLACE FUNCTION public.set_admin_fx(_title text, _title_color text, _invisible boolean, _fly boolean, _noclip boolean, _size real, _speed real)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _title IS NOT NULL AND length(_title) > 16 THEN RAISE EXCEPTION 'Title max 16 characters'; END IF;
  IF _title_color !~ '^#[0-9a-fA-F]{6}$' THEN RAISE EXCEPTION 'Invalid color'; END IF;
  INSERT INTO public.player_admin(user_id, title, title_color, invisible, fly, noclip, size, speed, updated_at)
  VALUES (uid, nullif(btrim(_title), ''), _title_color, _invisible, _fly, _noclip, greatest(0.5, least(3, _size)), greatest(0.5, least(3, _speed)), now())
  ON CONFLICT (user_id) DO UPDATE SET title = excluded.title, title_color = excluded.title_color, invisible = excluded.invisible,
    fly = excluded.fly, noclip = excluded.noclip, size = excluded.size, speed = excluded.speed, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.set_admin_role(_username text, _on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); target uuid;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT id INTO target FROM public.profiles WHERE lower(username) = lower(btrim(_username)) LIMIT 1;
  IF target IS NULL THEN RAISE EXCEPTION 'Player not found'; END IF;
  IF _on THEN
    INSERT INTO public.user_roles(user_id, role) SELECT target, 'admin' WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target AND role = 'admin');
  ELSE
    IF target = uid THEN RAISE EXCEPTION 'You cannot remove your own admin'; END IF;
    DELETE FROM public.user_roles WHERE user_id = target AND role = 'admin';
    DELETE FROM public.player_admin WHERE user_id = target;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.list_admins() RETURNS TABLE(user_id uuid, username text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY SELECT r.user_id, p.username FROM public.user_roles r JOIN public.profiles p ON p.id = r.user_id WHERE r.role = 'admin' ORDER BY p.username;
END $$;

REVOKE ALL ON FUNCTION public.set_admin_fx(text, text, boolean, boolean, boolean, real, real) FROM anon;
REVOKE ALL ON FUNCTION public.set_admin_role(text, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.list_admins() FROM anon;