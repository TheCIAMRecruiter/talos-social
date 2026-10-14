# TALOS self-service onboarding architecture (v1)
Status: design specification, not yet implemented.

## Goal
A recruiter can sign up, configure a content plan, connect a LinkedIn account, approve a draft and publish without opening Make or Supabase.

## Product flow
1. Account signup and verified email through Supabase Auth.
2. Workspace creation, membership and roles (admin, reviewer, member).
3. Profile/brand setup: audience, topics, voice, company, timezone, posting schedule.
4. LinkedIn OAuth connection with explicitly authorized posting scope. Tokens encrypted server-side, never in localStorage or public GitHub Pages. OAuth redirect must be hosted by a secure backend.
5. Generate drafts using a centrally managed AI provider and workspace-scoped prompts.
6. Review/edit/approve with audit trail. Nothing publishes without opt-in approval.
7. Queue and publish at scheduled time; display result and LinkedIn URL; recover ambiguous failures without automatic retry.

## Current state
- Working: Supabase auth/workspace and approval queue; secure publisher claim/complete endpoint; Make LinkedIn Create Post via owner's Make connection; scheduled_for.
- Not yet built: customer LinkedIn OAuth, tenant-specific credential storage, central AI generation, managed publisher, self-service plan setup, subscription/billing.
- Make remains a bridge for the owner's existing LinkedIn connection, NOT a secure multi-tenant publishing service.

## Implementation sequence
### Phase 1 — guided setup, no customer Make
- Onboarding wizard stored per workspace.
- Content preferences, timezone, posting schedule, test draft.
- Workspace dashboard: drafts, approvals, scheduled, published, needs review.
- Explicit test mode and never auto-publish unapproved drafts.

### Phase 2 — LinkedIn account connection
- Apply for/confirm LinkedIn API products and permissions required for member posting.
- Backend OAuth code flow with state and PKCE where supported; account selection; secure encrypted refresh/access tokens; disconnect and revoke.
- Separate each customer's account; NEVER use the founder's Make connection for customer posts.
- If access is not approved, offer manual copy/paste publishing and a clearly marked early-access waitlist.

### Phase 3 — managed generation and delivery
- Server-side AI generation with usage limits, moderation and cost controls.
- Tenant-isolated queue and worker, idempotency keys, backoff and reconciliation.
- Delivery receipts and audit logs, retry only when no possibility of duplicate.
- Notification emails for approvals, failures, token expiry.

### Phase 4 — billing and launch readiness
- Plans, quotas, billing webhook verification, abuse prevention, support and privacy policy.
- Security review: RLS for all tables, encrypted credentials, secret rotation, audit trail, monitoring, rate limiting.
- Pilot with 3-5 customers before broad launch.

## Non-negotiable constraints
- No LinkedIn passwords requested by TALOS.
- No private access tokens in the public repository, URLs or browser storage.
- Customer posting only through customer-authorized LinkedIn identity.
- One customer cannot view or publish another's drafts.
- Existing Transmit Security automation remains unchanged.
