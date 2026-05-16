begin;

drop function if exists public.fn_search_assistant_history(uuid, text, integer);
drop function if exists public.fn_agent_historical_dre_context(uuid, uuid, integer);

drop index if exists public.idx_agent_messages_content_fts;

drop policy if exists "assistant_persona_delete_owner" on public.assistant_persona_memory;
drop policy if exists "assistant_persona_update_owner" on public.assistant_persona_memory;
drop policy if exists "assistant_persona_insert_owner" on public.assistant_persona_memory;
drop policy if exists "assistant_persona_select_scope" on public.assistant_persona_memory;

drop trigger if exists trg_assistant_persona_memory_updated_at on public.assistant_persona_memory;

drop table if exists public.assistant_persona_memory;

commit;
