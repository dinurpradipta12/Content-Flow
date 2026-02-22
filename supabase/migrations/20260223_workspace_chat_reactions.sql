-- Migration to add reactions and improve chat groups
create table if not exists public.workspace_chat_reactions (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  message_id uuid not null references public.workspace_chat_messages(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  emoji text not null,
  group_id uuid references public.workspace_chat_groups(id) on delete cascade,
  constraint workspace_chat_reactions_pkey primary key (id),
  constraint workspace_chat_reactions_unique unique (message_id, user_id, emoji)
);

-- Enable RLS
alter table public.workspace_chat_reactions enable row level security;

-- Policies
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Allow all on workspace_chat_reactions') then
    create policy "Allow all on workspace_chat_reactions" on public.workspace_chat_reactions for all using (true) with check (true);
  end if;
end $$;

-- Update workspace_chat_messages to support more metadata if needed
-- (Already has metadata jsonb)
