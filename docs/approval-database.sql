-- Reference schema for persistent TALOS approval workflow.
-- Requires a server that verifies authenticated tenant membership on every request.
create table if not exists talos_posts (
  id uuid primary key,
  tenant_id uuid not null,
  author_user_id uuid not null,
  reviewer_user_id uuid not null,
  topic text,
  draft_text text not null,
  approved_text text,
  status text not null default 'PENDING_APPROVAL'
    check (status in ('PENDING_APPROVAL','REWRITE_REQUESTED','APPROVED','DISPATCHING','PUBLISHED','FAILED','REJECTED')),
  linkedin_post_urn text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists talos_posts_reviewer_queue on talos_posts(tenant_id, reviewer_user_id, status);
create table if not exists talos_dispatch_jobs (
  id uuid primary key,
  tenant_id uuid not null,
  post_id uuid not null unique references talos_posts(id),
  idempotency_key text not null unique,
  status text not null default 'QUEUED',
  attempt_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);
create table if not exists talos_approval_audit (
  id uuid primary key,
  tenant_id uuid not null,
  post_id uuid not null references talos_posts(id),
  actor_user_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);
-- IMPORTANT: These tables alone do not provide tenant security.
-- Enable and configure database RLS policies or restrict direct DB access
-- to a backend enforcing authenticated tenant and reviewer authorization.
