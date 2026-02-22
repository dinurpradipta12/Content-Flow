-- Notifications Table
create table if not exists public.notifications (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  recipient_id uuid not null, -- User receiving the notification
  actor_id uuid null, -- User triggerring the notification
  workspace_id uuid null,
  type text not null, -- 'JOIN_WORKSPACE', 'CONTENT_APPROVAL', 'CONTENT_REVISION', 'CONTENT_APPROVED'
  title text not null,
  content text not null,
  is_read boolean default false,
  metadata jsonb null,
  constraint notifications_pkey primary key (id),
  constraint notifications_recipient_id_fkey foreign key (recipient_id) references public.app_users(id) on delete cascade,
  constraint notifications_actor_id_fkey foreign key (actor_id) references public.app_users(id) on delete set null,
  constraint notifications_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade
);

-- Enable RLS
alter table public.notifications enable row level security;
drop policy if exists "Enable all access" on public.notifications;
create policy "Enable all access" on public.notifications for all using (true) with check (true);

-- Enable Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
