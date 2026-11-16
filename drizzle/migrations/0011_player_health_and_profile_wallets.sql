ALTER TABLE public.player_combat ALTER COLUMN hp SET DEFAULT 50, ALTER COLUMN max_hp SET DEFAULT 50;
ALTER POLICY wallets_read ON public.player_wallets TO authenticated USING (true);