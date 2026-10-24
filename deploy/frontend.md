# Frontend releases

The frontend is a static Cloudflare Worker at https://mangrove.osbyrne.workers.dev.
The API and encrypted audio stay on air, reachable only over Tailscale at
https://air.tailca045f.ts.net:8443. Users need Tailscale connected and may need
to allow local network access in their browser.

Keep this monorepo: web and API share `packages/shared`, but deploy independently.
Publishing a GitHub release (including a prerelease) runs
`.github/workflows/deploy-web.yml`. It checks out the release tag, installs with
the root lockfile, checks web/shared, builds only web, and uploads only
`apps/web/dist`. It never deploys the Bun API or private storage. A manual
workflow dispatch can deploy the selected branch or tag. Publishing an older
release or manually selecting an older ref deploys that version, allowing rollback.
Releases must point to commits containing the workflow and frontend configuration.

GitHub repository configuration:

- Variable `CLOUDFLARE_ACCOUNT_ID`: the target Cloudflare account ID.
- Variable `MANGROVE_API_ORIGIN`: `https://air.tailca045f.ts.net:8443`.
- Secret `CLOUDFLARE_API_TOKEN`: a dedicated token with Edit Cloudflare Workers
  permissions scoped to that account. Wrangler's local OAuth login is not a CI token.

The workflow uses the `production` GitHub environment and serializes deployments.
Configure environment protection rules in GitHub if approvals are desired.

For local deployment from the repository root:

```sh
VITE_API_ORIGIN=https://air.tailca045f.ts.net:8443 bun run build
bunx wrangler@4.152.0 deploy --config apps/web/wrangler.jsonc
```

`VITE_API_ORIGIN` is public build configuration; never put credentials in it.
Omitting it retains same-origin API requests for the existing local/server app.
`MANGROVE_API_URL` continues to configure only Vite's development proxy.

On air, `/etc/mangrove.env` contains
`MANGROVE_WEB_ORIGINS=https://mangrove.osbyrne.workers.dev`.
The API allows cross-origin reads, range requests and uploads only for exact
configured HTTPS origins (comma-separated). There is no wildcard or credentialed
CORS. Other cross-site uploads remain rejected. Tailscale remains the access boundary.

Tailscale Serve provides the private HTTPS endpoint:

```sh
tailscale serve --bg --https=8443 http://100.86.196.40:3000
```

The existing port 443 Serve configuration is preserved. Port 8443 is permitted
through air's FedoraServer firewall only from tailnet IPv4 addresses, with the
same rule saved permanently. No Funnel or public API endpoint is configured.
Restart `mangrove` after changing the API origin allowlist. If changing the
frontend domain, update this allowlist before deploying to that domain.

Validation: local type checks, 37 API tests, production build and Wrangler dry run
passed. The deployed frontend and private HTTPS health/CORS endpoint were checked.
A release-triggered deployment still requires the GitHub token secret and a
published release containing this workflow.
