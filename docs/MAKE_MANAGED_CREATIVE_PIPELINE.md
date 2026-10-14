# TALOS Make-managed content + branded visuals

## User decision
Use the existing Make-hosted AI provider/Claude setup. Do NOT require customers or the TALOS backend to supply an Anthropic API key. The standalone Supabase talos-generate-content and talos-generate-visual functions are prototypes only; the production TALOS UI should ultimately invoke a Make-managed orchestration endpoint.

## Suggested scenario (new, not founder's working publisher)
1. TALOS request with workspace ID, signed authorization, content preferences and desired number of posts.
2. Make retrieves the workspace's approved content plan through a secured server endpoint. Do not send Supabase service role tokens to browsers.
3. Make AI/Claude module drafts the LinkedIn post and a structured image brief (subject, composition, brand palette, text-safe region). Both can be returned in one structured JSON response.
4. Conditional branch:
   - Text only: store pending draft.
   - Branded template: render with existing TALOS Creative Studio; no paid image generator needed.
   - AI illustration: send the brief to a separate Make image-generation integration. Make's AI Toolkit text modules do not themselves establish an image-generation capability.
5. Apply original customer logo as a separate overlay; never ask the image model to recreate it. Preserve brand palette and alt text.
6. Save text draft and private image attachment in Supabase. Never auto-approve or auto-publish.
7. TALOS reviewer edits, approves and schedules. Keep media approvals blocked until customer-authorized LinkedIn image publishing is implemented.

## Parallelism note
Make's Router splits routes but processes them sequentially, not simultaneously. To actually run image and text generation concurrently, use two independently triggered scenarios and coordinate results with a job ID in Supabase. A simpler first version runs the Claude content+image-brief call, then image generation, in a single scenario. It reduces setup and makes results consistent.

## Required connection
Identify the actual Make scenario/module being used for Claude, and the Make-supported image-generation module or service. Image generation may incur separate provider fees even when Claude text generation is covered by Make's plan. Never modify the founder's working Make publisher.
