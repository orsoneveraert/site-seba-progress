create table if not exists public.feedback_notes (
  id text primary key,
  page_path text not null,
  x integer not null,
  y integer not null,
  w integer not null,
  h integer not null,
  text text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists feedback_notes_page_path_idx on public.feedback_notes(page_path);

create or replace function public.set_feedback_notes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_feedback_notes_updated_at on public.feedback_notes;
create trigger trg_feedback_notes_updated_at
before update on public.feedback_notes
for each row
execute procedure public.set_feedback_notes_updated_at();

alter table public.feedback_notes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_notes'
      and policyname = 'feedback_notes_select'
  ) then
    create policy "feedback_notes_select"
    on public.feedback_notes
    for select
    to anon
    using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_notes'
      and policyname = 'feedback_notes_insert'
  ) then
    create policy "feedback_notes_insert"
    on public.feedback_notes
    for insert
    to anon
    with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_notes'
      and policyname = 'feedback_notes_update'
  ) then
    create policy "feedback_notes_update"
    on public.feedback_notes
    for update
    to anon
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_notes'
      and policyname = 'feedback_notes_delete'
  ) then
    create policy "feedback_notes_delete"
    on public.feedback_notes
    for delete
    to anon
    using (true);
  end if;
end $$;
