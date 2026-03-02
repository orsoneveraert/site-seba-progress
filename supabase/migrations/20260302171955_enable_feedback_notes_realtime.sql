do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'feedback_notes'
  ) then
    alter publication supabase_realtime add table public.feedback_notes;
  end if;
exception
  when undefined_object then
    null;
end $$;
