# Shared Feedback Notes Setup (GitHub Pages)

The `F` button supports two modes:

- Local mode (default): notes saved per page in browser localStorage.
- Shared mode: notes synced across users with Supabase.

## 1) Create Supabase table

Run this SQL in your Supabase SQL editor:

```sql
create extension if not exists pgcrypto;

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
```

## 2) API access policy (prototype)

If RLS is enabled, add policies for `anon` to read/write this table.

```sql
alter table public.feedback_notes enable row level security;

create policy "feedback_notes_select"
on public.feedback_notes
for select
to anon
using (true);

create policy "feedback_notes_insert"
on public.feedback_notes
for insert
to anon
with check (true);

create policy "feedback_notes_update"
on public.feedback_notes
for update
to anon
using (true)
with check (true);

create policy "feedback_notes_delete"
on public.feedback_notes
for delete
to anon
using (true);
```

## 3) Enable shared mode

Edit `assets/feedback-collab-config.js`:

```js
window.FEEDBACK_COLLAB = {
  enabled: true,
  supabaseUrl: 'https://YOUR_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY',
  table: 'feedback_notes',
  pollMs: 2400
};
```

## Notes

- Notes are scoped by page path (e.g. `/index.html`, `/services.html`).
- The sync is near real-time via polling.
- For production hardening, restrict policies by project/member auth instead of public `anon` writes.
