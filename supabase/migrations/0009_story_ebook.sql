-- ================================================================
-- AllureTV — ebook PDF por story
-- ================================================================
-- O toggle has_ebook (0005_stories.sql) só sinaliza intenção; o
-- PDF real precisa de um ponteiro pro R2. Os outros assets seguem
-- o mesmo padrão: cover_key, video_key, story_audio.audio_key.
--
-- Sem migrar a tabela ebook_pages (0001_init.sql) — segue órfã
-- (nenhum código grava nela). Pode ser dropada em outra migration.
-- ================================================================

alter table public.stories add column if not exists ebook_key text;
