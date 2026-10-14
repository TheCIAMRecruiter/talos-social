# TALOS Supabase integration — Phase 1

**Committed code is not deployed or configured.** This is the real database schema and browser-side approval adapter, not a functioning hosted backend.

## Setup (free-tier project)
1. Create a new project at https://supabase.com/dashboard — name it TALOS Social.
2. In SQL Editor, run `supabase/migrations/20261014_approval_foundation.sql`.
3. In Authentication, configure the approved site URL and redirect URLs for talossocial.com; enable an email sign-in method.
4. Save the **Project URL** and **publishable/anon key** for browser configuration. Never publish or send the service_role/secret key.
5. Implement workspace provisioning through a trusted backend; the SQL intentionally blocks client-created memberships.
6. Integrate `src/talos-approvals.js` into the v7 Approval Center once auth and workspace creation are implemented.
7. Configure transactional email and a protected server-side job worker to dispatch approved drafts to the new TALOS Make scenarios.
8. Test with two distinct workspaces, unauthorized reviewer, double approval, rewrite, failure, and retry.

## Current safety behavior
- RLS restricts post reads to workspace members.
- A reviewer or admin can atomically approve, edit, reject or request a rewrite via RPC.
- An approval creates a unique queued dispatch job but **does not publish**.
- Email notifications and secure Make callbacks are still to be implemented.
- Personal Transmit Security scenarios are not modified.

## Deep-link convention
`https://talossocial.com/#approvals?post=<uuid>` is a navigation link only; users must authenticate and pass RLS/reviewer checks.
