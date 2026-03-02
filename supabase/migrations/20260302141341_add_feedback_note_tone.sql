alter table public.feedback_notes
add column if not exists tone text;

update public.feedback_notes
set tone = 'sun'
where tone is null or tone = '';

alter table public.feedback_notes
alter column tone set default 'sun';

alter table public.feedback_notes
alter column tone set not null;
