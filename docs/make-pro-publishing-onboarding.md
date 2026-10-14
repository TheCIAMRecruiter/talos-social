# TALOS · Make Pro LinkedIn publishing onboarding

## Architecture
TALOS customers request a LinkedIn connection from Automation Center. The request is recorded in `public.talos_connection_requests` and is **not** an OAuth authorization. A TALOS operator configures one dedicated Make publishing scenario and one native LinkedIn connection per workspace. Never ask for or store LinkedIn passwords, OAuth tokens, or Make secrets in TALOS frontend code.

## Operator process (manual until secure Make account delegation is available)
1. Query `talos_connection_requests` for `status='REQUESTED'`; verify workspace identity and customer admin before contacting them.
2. Coordinate authorization directly in Make's native LinkedIn connection interface using a customer-approved secure session. Do not solicit credentials over email or forms. If Make cannot safely authorize a customer's account without sharing credentials, **do not activate**; seek a supported alternative.
3. Clone the approved TALOS publishing scenario and associate the workspace-specific Make connection. Store the mapping in operator-controlled configuration, not a public browser field.
4. Verify workspace ID, destination LinkedIn account, permissions, and post identity. Use a test post explicitly approved by the customer. Ensure the scenario cannot claim jobs for other workspaces.
5. Only after verification, update `talos_linkedin_connections` status and connection metadata from a trusted backend; update the onboarding request to `CONNECTED`. Never treat a user-submitted request as proof of connection.
6. Confirm scheduling, idempotency, failure handling, retries, and publication receipts. Keep publication disabled until all checks pass.

## Current limits
- Make Pro does not offer Enterprise dynamic connections or Credential Requests for ordinary accounts.
- `talos-linkedin-publisher` is a job claim/complete bridge, **not** an end-to-end LinkedIn publisher. A customer-specific Make scenario still must claim, post, and report results.
- Current UI requests and tracks assisted setup only. There is no automatic customer OAuth or automatic scenario cloning.
- Do not change the owner's existing personal Transmit Security publishing scenario.

## Database operator queries
```sql
select r.id, r.workspace_id, w.name, r.status, r.created_at
from public.talos_connection_requests r
join public.talos_workspaces w on w.id=r.workspace_id
where r.status in ('REQUESTED','IN_PROGRESS')
order by r.created_at;
```

## Make Pro publishing scenario · exact module sequence

Use **one scenario per customer workspace**; never dynamically select a different customer's LinkedIn connection.

1. **Scheduler:** run every 15 minutes (or your desired cadence).
2. **HTTP > Make a request (claim):** POST to `https://mrgzxokmjxpsdlymxjtc.supabase.co/functions/v1/talos-linkedin-publisher`. Set `Authorization: Bearer <workspace-specific TALOS integration token>` and `Content-Type: application/json`. Body: `{"action":"claim","workspace_id":"<workspace UUID>"}`.
3. **Filter:** proceed only when `available = true`. If `reason = LINKEDIN_NOT_VERIFIED`, stop; do not publish.
4. **LinkedIn > Create a user text post:** use the *verified customer's dedicated LinkedIn connection* and the `content` returned by claim. Never use the operator's personal connection. Do not use this text-only route for image posts.
5. **HTTP > Make a request (complete):** POST to the same endpoint with the same authorization. Body: `{"action":"complete","workspace_id":"<workspace UUID>","job_id":"<claim.job_id>","linkedin_post_urn":"<actual LinkedIn post URN returned by module>"}`.
6. **LinkedIn error handler:** POST `{"action":"complete","workspace_id":"<workspace UUID>","job_id":"<claim.job_id>","error":"<sanitized error message>"}`. A failed/unknown publish goes to `NEEDS_REVIEW`, **not** automatic retry, because a network failure may happen after LinkedIn accepted the post.
7. **Operator verification:** compare LinkedIn account identity and workspace, verify a customer-approved test post, then record `CONNECTED` status and member URN through trusted operator access. No browser writes to the connection-status table.

**Security and reliability requirements:** Only issue the workspace-specific token to the corresponding Make scenario; keep it in Make's secret-capable HTTP connection/secure fields, not notes or repository files. Verify the connection before enabling the scenario. Use a single active polling scenario per workspace to avoid duplicate claims. `talos-linkedin-publisher` now rejects claims for workspaces without a verified connection. The completion endpoint only acknowledges an already-claimed job; it does not create a LinkedIn post.

**Operator caution:** Pro has no native dynamic connections; each scenario must be bound to the correct LinkedIn account. If the customer cannot safely authorize the Make connection, keep onboarding pending. Do not ask them to email credentials.
