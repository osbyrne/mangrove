# Mangrove

A private song provider and listening room. Upload songs to a self-hosted, encrypted S3 store and stream them through the Bun API, locally or over Tailscale. Playback, seeking, volume, and repeat are real media controls.

## Workspace structure

This is a private [Bun workspace monorepo](https://bun.sh/docs/pm/workspaces), with one root lockfile:

```text
apps/
  web/              @mangrove/web — SolidJS, TanStack, Vite
  api/              @mangrove/api — Bun, Effect, streaming API and tests
packages/
  shared/           @mangrove/shared — public Effect schemas and API types
scripts/            local storage, stack lifecycle, verification
deploy/             air deployment report and systemd service
.data/              ignored local encryption keys, credentials, encrypted audio
```

Each workspace declares its own dependencies and TypeScript configuration. The apps depend on `@mangrove/shared` through `workspace:*`; shared exports TypeScript source that Bun and Vite consume directly, so it needs no separate build. Shared contains only public wire contracts. Storage object keys and credentials belong to the backend; browser-only code stays in web. Vite's file allowlist and deny rules exclude backend source and private local data, including the API workspace symlink.

Run the commands below from the repository root. `bun dev` and `bun start` manage the app and private storage together. For focused work, use `bun run --filter @mangrove/web build`, `bun run --filter @mangrove/api test`, or `bun run --filter @mangrove/shared check`. The API workspace's own start/dev commands require storage credentials and an already-running S3 service; the root launcher supplies these automatically. Only web needs a build artifact, written to `apps/web/dist`.

## Run locally

Requires [Bun](https://bun.sh/) 1.4.4+ and [rclone](https://rclone.org/install/) 1.65+ (tested with 1.75.2). On macOS, install rclone with `brew install rclone`.

```sh
bun install --frozen-lockfile
bun dev
```

Open **http://127.0.0.1:5173** and click **Upload songs**. Fresh storage starts empty. Uploads support MP3, M4A, FLAC, WAV, OGG, and Opus (250 MiB each); audio is encrypted through rclone crypt into `.data/objects`, and metadata persists in `.data/catalog.sqlite`. Audio and local keys are excluded from Git. The legacy `bun run import:track` command still imports the original recording; restart the stack after that command to register it.

For the built app on a single origin:

```sh
bun run build
bun start
```

Open **http://127.0.0.1:3000**. Stop `bun dev` before starting production: both commands manage their own private S3 process on port 9091. Ctrl-C stops all child processes. `PORT` and `S3_PORT` configure production ports; development uses 3000/5173. Listeners default to loopback. Set `HOST` to the server’s Tailscale IPv4 address to share the app privately; S3 always stays on loopback.

## Stack and storage

- Bun and TypeScript run the backend and lifecycle scripts. Effect **4.0.0-beta.107** provides backend services, layers, typed failures, and the managed runtime. Effect v4 is pinned because it is a beta.
- SolidJS renders the player. StyleX handles all frontend styling, including tokens, responsive layouts, SVG artwork, interactive states, and animations. The official StyleX Vite plugin compiles the styles and emits the production stylesheet; there is no authored CSS stylesheet. TanStack Solid Router handles navigation, TanStack Solid Query handles API loading/retries, and Effect Schema validates API responses.
- rclone crypt encrypts file contents and filenames at rest. `rclone serve s3` exposes the vault as a Signature V4 authenticated local bucket. The official AWS SDK for TypeScript v3 signs private upstream requests and streams the decrypted response to the browser, with byte-range support for seeking. Media is never fetched as one frontend Blob.
- Vite proxies `/api` during development. Production Bun serves both `apps/web/dist` and `/api`, keeping credentials and storage addresses entirely on the server.

The generated `.data/rclone.conf` contains encryption secrets (rclone obscuring is reversible); `.data/s3.json` contains S3 credentials. Both use owner-only permissions. Back up the config **together with** the encrypted objects. Losing the crypt keys makes the song unrecoverable from the vault. Back up the SQLite catalog with the vault. Uploads receive unique object keys; matching filenames do not overwrite earlier songs.

The entire stack runs locally: browser → Bun API → authenticated loopback S3 → rclone crypt → encrypted local files. No cloud account, tunnel, or remote storage is required. Tailscale connects other devices to the same self-hosted app. The S3 adapter accepts only literal HTTP loopback endpoints and uses explicit local credentials, with no ambient AWS credential fallback. Signed storage URLs stay inside the server.

The S3 client uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`. rclone supplies the local S3 server and encryption; its S3 server is experimental and this setup is intended for a local listening room.

## Connect to air

With Tailscale connected, open **http://air:3000**, or run the frontend locally against air:

```sh
MANGROVE_API_URL=http://air:3000 bun dev
```

Then open **http://127.0.0.1:5173**. This starts only the frontend proxy. See **[deploy/README.md](deploy/README.md)** for the deployment report, service setup, updates, network boundary, and backups.

## Server releases

Changing the root `package.json` version on `trunk` builds native Linux x64 and ARM64 server binaries and publishes `vVERSION` on GitHub Releases, with SHA-256 checksums. The executable includes the API, frontend, and Bun runtime; rclone remains a separate dependency. SemVer prereleases publish as prereleases. Manual **Release server** runs can publish the current version. The existing frontend deployment runs for the same release tag.

Build locally with `bun run build:server`, then verify with `bun run test:binary`. See [deploy/releases.md](deploy/releases.md) for binary installation, upgrades, and release behavior.

## Verify

```sh
bun run check
bun test
bun run build
# While bun dev or bun start is running:
bun run verify:stream "/path/to/RedWhiteBeige 2026-05-11.m4a"
```

The last command compares the served SHA-256 against the original and checks HEAD, explicit/open/suffix byte ranges, unsatisfiable ranges, health, and private-path routing. Omit the filename to compare against the original recording in the decrypted vault instead. For an uploaded copy, set `VERIFY_TRACK_ID` to its catalog ID. `VERIFY_URL` chooses another origin, including Vite's proxy. Browser playback needs codec support for the selected audio format.
