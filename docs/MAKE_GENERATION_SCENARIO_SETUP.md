# TALOS Make generation scenario — production integration

The TALOS UI writes requests into `public.talos_generation_requests`. The private worker endpoint is deployed at:
`https://mrgzxokmjxpsdlymxjtc.supabase.co/functions/v1/talos-make-generation-worker`

**Before enabling the Make scenario**, generate a strong random token and save it in Supabase Edge Function secrets as `TALOS_MAKE_WORKER_TOKEN`. Set the same token as a private Make connection/header value, never in the browser. The worker reads the built-in `SUPABASE_SERVICE_ROLE_KEY` server-side.

Create a **new Make scenario**. Do not edit the founder's existing working LinkedIn publisher.

1. Schedule a polling interval. HTTP POST to the worker URL with `Authorization: Bearer <private token>` and JSON `{"action":"claim"}`. The response has `job:null` when the queue is empty.
2. When `job` exists, send `plan` and `job` to the existing Make AI Provider / Claude module. Instruct it to produce a JSON object with `draft` and `topic` for single posts, or `posts:[{day,topic,draft},...]` for weekly plans. Respect voice examples, prohibited phrasing, weekly themes and posting days. Do not invent accomplishments.
3. The job's `image_mode` controls the visual path:
   - `template`: use TALOS Creative Studio templates after the draft is approved.
   - `ai`: use a Make-connected image generator, then save the image privately and attach it to the pending draft. This requires a provider and media storage integration; do not mark images publishable before LinkedIn media OAuth works.
   - `upload`: customer attaches their own image during review.
   - `none`: no image.
4. HTTP POST to the worker with `{"action":"complete","id":"<job.id>","result":{"topic":"...","draft":"..."}}` or `{"action":"complete","id":"<job.id>","result":{"posts":[...]}}`.
5. On failure POST `{"action":"complete","id":"<job.id>","error":"short diagnostic"}`. Without completion, jobs remain PROCESSING; add manual retry/recovery policy before customer launch.

Security: token is private; never store Make or provider secrets in HTML. RLS limits customer access to their own workspace requests. The worker is not exposed as a general public API because it checks its private Bearer token. Production safeguards: use a dedicated scenario, avoid duplicate completions, apply generation rate limits and spend quotas before inviting paying users.

**Current status:** database, customer request UI and worker deployed. Make scenario, secret provisioning, provider connection, image storage callback, and customer LinkedIn OAuth remain to be configured and tested. The old direct Anthropic/OpenAI prototypes should be retired after the Make path is tested.
