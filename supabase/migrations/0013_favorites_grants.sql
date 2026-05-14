-- ================================================================
-- AllureTV — Fix grants na tabela favorites
-- ================================================================
-- Em produção a action `addFavorite` batia em
--   42501: permission denied for table favorites
-- Significa que o role usado (service_role via SUPABASE_SERVICE_ROLE_KEY)
-- NÃO tem grant de INSERT na tabela. A migration 0010 supostamente faz isso
-- mas não ficou aplicado (provavelmente nunca rodou em produção, ou a tabela
-- foi recriada depois sem repetir os grants).
--
-- Re-aplica idempotente. Inclui UPDATE também pra cobrir o caso de upsert
-- com ON CONFLICT DO UPDATE (o `.upsert()` do supabase-js usa isso).
--
-- Policy: troca pra usar `using` + `with check` explícitos. `for all using`
-- por padrão aplica USING como WITH CHECK também, mas deixar explícito é
-- mais claro pra futuros leitores.
-- ================================================================

grant select, insert, update, delete on public.favorites to authenticated, service_role;

drop policy if exists "favorites_all_own" on public.favorites;
create policy "favorites_all_own"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
