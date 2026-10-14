# TALOS Approval Automation v8 — integration contract

Status: IMPLEMENTATION SPECIFICATION. This document does not activate production publishing.

## User flow
1. Draft engine creates a post scoped to tenant_id and author_user_id.
2. Server persists status PENDING_APPROVAL and notifies assigned reviewer by email.
3. Email CTA: `https://talossocial.com/#approvals?post=<opaque-post-id>`. This link is navigation only, never authorization.
4. Signed-in reviewer loads draft; server checks reviewer membership in the post's tenant and reviewer assignment/role.
5. Reviewer can edit, approve, or request rewrite. Each operation is authenticated, audited, and conditional on the current status.
6. On approval, server creates one immutable dispatch job and sends approved content to a dedicated TALOS Make webhook. No browser directly invokes Make.
7. Make publishes only for the authorized customer's LinkedIn connection; callback records LinkedIn URN or error.
8. Rewrite requests enqueue a generation job; replacement is a new PENDING_APPROVAL draft, not automatically published.

## Endpoints to implement on a persistent backend
- GET /api/approvals/:postId — authenticated; verify tenant membership and assigned reviewer.
- PATCH /api/approvals/:postId — edit text while pending; audit revision.
- POST /api/approvals/:postId/approve — authenticated; atomic pending->approved transition; enqueue dispatch once.
- POST /api/approvals/:postId/rewrite — authenticated; atomic pending->rewrite_requested; enqueue regeneration.
- POST /api/integrations/make/callback — authenticate with server-held secret or signed request, validate tenant/job IDs, idempotently update outcome.

## Required controls
- Use managed authentication; never trust tenant_id or reviewer email from client input.
- Row-level authorization and per-tenant isolation on every read/write.
- Approval must use an atomic conditional update to prevent double-click duplicate publishing.
- Dispatch jobs must have unique post_id and idempotency keys.
- Save approved text snapshot; never publish an unapproved edit.
- Use server-to-server Make webhook credentials stored in environment variables, not HTML/localStorage.
- Link in email only navigates to TALOS. Authentication is required before any action.
- Never reuse Transmit Security webhooks, Gmail connections, data store IDs, or LinkedIn connection.
- Return meaningful failure status to the portal; do not mark PUBLISHED until Make confirms a LinkedIn post ID.
- Implement bounded retry policy and manual review for ambiguous publication outcomes.

## Deployment gate
Before enabling live publishing, verify backend authentication, database persistence, email provider, tenant isolation, Make webhook secrets, and customer-specific LinkedIn authorization with test accounts. Existing v7 Approval Center controls are a UI preview until wired to these endpoints.
