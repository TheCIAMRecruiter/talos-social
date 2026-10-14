-- TALOS Social: Supabase starter schema (apply in a NEW Supabase project).
-- Safe by default: no anonymous access, no direct client publishing.
create extension if not exists pgcrypto;

create table if not exists public.talos_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);
create table if not exists public.talos_memberships (
  workspace_id uuid not null references public.talos_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','reviewer','author')),
  primary key (workspace_id,user_id)
);
create table if not exists public.talos_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.talos_workspaces(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  reviewer_id uuid not null references auth.users(id),
  topic text,
  draft_text text not null check (length(trim(draft_text)) > 0),
  approved_text text,
  status text not null default 'PENDING_APPROVAL' check
    (status in ('PENDING_APPROVAL','REWRITE_REQUESTED','APPROVED','DISPATCHING','PUBLISHED','FAILED','REJECTED')),
  linkedin_post_urn text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists talos_posts_queue_idx on public.talos_posts(workspace_id,reviewer_id,status);
create table if not exists public.talos_dispatch_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.talos_workspaces(id) on delete cascade,
  post_id uuid not null unique references public.talos_posts(id) on delete cascade,
  idempotency_key text not null unique,
  status text not null default 'QUEUED' check (status in ('QUEUED','SENDING','SUCCEEDED','FAILED','NEEDS_REVIEW')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);
create table if not exists public.talos_approval_audit (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.talos_workspaces(id) on delete cascade,
  post_id uuid not null references public.talos_posts(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  created_at timestamptz not null default now()
);

alter table public.talos_workspaces enable row level security;
alter table public.talos_memberships enable row level security;
alter table public.talos_posts enable row level security;
alter table public.talos_dispatch_jobs enable row level security;
alter table public.talos_approval_audit enable row level security;

-- Memberships must be provisioned through a trusted server-side admin flow.
-- Do not add an open client INSERT policy: users could grant themselves admin.
create policy "members see own membership" on public.talos_memberships
 for select to authenticated using (user_id = (select auth.uid()));
create policy "members see workspace" on public.talos_workspaces
 for select to authenticated using (
   exists(select 1 from public.talos_memberships m
     where m.workspace_id=id and m.user_id=(select auth.uid()))
 );
create policy "members see workspace posts" on public.talos_posts
 for select to authenticated using (
   exists(select 1 from public.talos_memberships m
     where m.workspace_id=talos_posts.workspace_id and m.user_id=(select auth.uid()))
 );
-- Posts are created by a trusted generation backend; only approved RPC changes state.
-- Do not grant client UPDATE/INSERT/DELETE on posts or dispatch jobs.
create policy "members see audit" on public.talos_approval_audit
 for select to authenticated using (
   exists(select 1 from public.talos_memberships m
     where m.workspace_id=talos_approval_audit.workspace_id and m.user_id=(select auth.uid()))
 );

create or replace function public.talos_review_post(
  p_post_id uuid, p_action text, p_edited_text text default null
) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_post public.talos_posts%rowtype;
  v_role text;
  v_new_status text;
  v_text text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_action not in ('approve','rewrite','reject','edit') then
    raise exception 'Unsupported action';
  end if;
  select * into v_post from public.talos_posts
    where id=p_post_id for update;
  if not found then raise exception 'Post not found'; end if;
  select role into v_role from public.talos_memberships
    where workspace_id=v_post.workspace_id and user_id=auth.uid();
  if v_role is null or (v_post.reviewer_id <> auth.uid() and v_role <> 'admin') then
    raise exception 'Not authorized to review this post';
  end if;
  if v_post.status <> 'PENDING_APPROVAL' then
    raise exception 'Post is no longer pending review';
  end if;
  v_text := coalesce(nullif(btrim(p_edited_text),''),v_post.draft_text);
  if p_action='edit' then
    if p_edited_text is null or btrim(p_edited_text)='' then
      raise exception 'Edited text is required';
    end if;
    update public.talos_posts set draft_text=v_text,updated_at=now() where id=p_post_id;
    v_new_status:='PENDING_APPROVAL';
  else
    v_new_status := case p_action when 'approve' then 'APPROVED'
                  when 'rewrite' then 'REWRITE_REQUESTED' else 'REJECTED' end;
    update public.talos_posts set status=v_new_status,
      approved_text=case when p_action='approve' then v_text else null end,
      updated_at=now() where id=p_post_id;
    if p_action='approve' then
      insert into public.talos_dispatch_jobs(workspace_id,post_id,idempotency_key)
      values(v_post.workspace_id,p_post_id,'talos-post:'||p_post_id::text)
      on conflict (post_id) do nothing;
    end if;
  end if;
  insert into public.talos_approval_audit(workspace_id,post_id,actor_id,action)
  values(v_post.workspace_id,p_post_id,auth.uid(),p_action);
  return jsonb_build_object('post_id',p_post_id,'status',v_new_status);
end;
$$;
revoke all on function public.talos_review_post(uuid,text,text) from public;
grant execute on function public.talos_review_post(uuid,text,text) to authenticated;

-- Publishing workers require a separate authenticated server-side integration.
-- NEVER expose service_role keys or Make webhook secrets in a public HTML file.
