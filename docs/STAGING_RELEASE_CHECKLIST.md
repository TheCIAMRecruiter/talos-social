# TALOS staging and release checklist

## Current status
- Production GitHub Pages: talossocial.com (main branch)
- Production Supabase project ref: mrgzxokmjxpsdlymxjtc
- Staging Supabase project: **not created**. Requires choosing a Supabase organization and approving any project costs.
- The image-inclusive LinkedIn publisher is **not ready**. Do not deploy it over the working text-only publisher.

## Staging setup
1. Create a separate Supabase project named TALOS Staging in the approved organization.
2. In GitHub Settings > Environments, create **staging** and **production**.
3. In each environment add **SUPABASE_ACCESS_TOKEN** and **SUPABASE_PROJECT_REF** secrets for that environment. Use separate refs for staging and production. Restrict production with required reviewers.
4. Configure Supabase Auth redirect URLs for the staging origin. Keep production redirect URLs intact.
5. Apply versioned database migrations to staging before deploying Edge Functions. Do not point staging at production database.
6. Store provider API keys as **Supabase Edge Function secrets**, never in HTML or GitHub source.
7. Run GitHub Actions > TALOS Supabase function release > Run workflow > staging > function name. Test thoroughly before selecting production.
8. Smoke-test: sign-in, workspace isolation, voice and weekly content plan save/reload, logo upload, branded PNG generation, private image attachment, approvals, and publisher dispatch. Verify customer content never posts through the founder's LinkedIn connection.

## Safety
- Current publisher supports text posts. Image attachments are blocked from approval until media publishing is implemented and tested.
- Customer LinkedIn OAuth requires its own permissions and credential handling.
- The frontend validation workflow checks HTML files and JavaScript syntax. GitHub Pages still deploys from its configured source; successful validation does not automatically gate Pages unless branch protection requires the check.
- GitHub Actions backend release is manual by design. It will not work until environment secrets are supplied.
