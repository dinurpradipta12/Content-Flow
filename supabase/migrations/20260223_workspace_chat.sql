-- 1. Table for Chat Groups/Channels
create table if not exists public.workspace_chat_groups (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  icon text null default 'users',
  created_by uuid references public.app_users(id),
  constraint workspace_chat_groups_pkey primary key (id)
);

-- 2. Table for Chat Group Members (for private/custom groups)
create table if not exists public.workspace_chat_members (
  group_id uuid not null references public.workspace_chat_groups(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  constraint workspace_chat_members_pkey primary key (group_id, user_id)
);

-- 3. Table for Chat Messages
create table if not exists public.workspace_chat_messages (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  group_id uuid not null references public.workspace_chat_groups(id) on delete cascade,
  sender_id uuid not null references public.app_users(id),
  sender_name text null,
  sender_avatar text null,
  content text not null,
  type text not null default 'text', -- 'text', 'image', 'file'
  reply_to_id uuid references public.workspace_chat_messages(id) on delete set null,
  metadata jsonb null default '{}'::jsonb, -- for reactions, etc.
  constraint workspace_chat_messages_pkey primary key (id)
);

-- 4. Table for Read Receipts
create table if not exists public.workspace_chat_reads (
  message_id uuid not null references public.workspace_chat_messages(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  read_at timestamp with time zone not null default now(),
  group_id uuid references public.workspace_chat_groups(id) on delete cascade,
  constraint workspace_chat_reads_pkey primary key (message_id, user_id)
);

-- Enable RLS
alter table public.workspace_chat_groups enable row level security;
alter table public.workspace_chat_members enable row level security;
alter table public.workspace_chat_messages enable row level security;
alter table public.workspace_chat_reads enable row level security;

-- Policies (Idempotent Structure)

-- 1. Workspace Chat Groups
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Allow all on workspace_chat_groups') then
    create policy "Allow all on workspace_chat_groups" on public.workspace_chat_groups for all using (true) with check (true);
  end if;
end $$;

-- 2. Workspace Chat Members
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Allow all on workspace_chat_members') then
    create policy "Allow all on workspace_chat_members" on public.workspace_chat_members for all using (true) with check (true);
  end if;
end $$;

-- 3. Workspace Chat Messages
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Allow all on workspace_chat_messages') then
    create policy "Allow all on workspace_chat_messages" on public.workspace_chat_messages for all using (true) with check (true);
  end if;
end $$;

-- 4. Workspace Chat Reads
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Allow all on workspace_chat_reads') then
    create policy "Allow all on workspace_chat_reads" on public.workspace_chat_reads for all using (true) with check (true);
  end if;
end $$;
