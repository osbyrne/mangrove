# Mangrove

A local listening room for **Red White Beige**, recorded May 11, 2026. The browser streams the original M4A from a Bun backend through a private, encrypted local S3 object store. Playback, seeking, volume, and repeat are real media controls.

## Workspace structure

This is a private [Bun workspace monorepo](https://bun.sh/docs/pm/workspaces), with one root lockfile:

```text
apps/
  web/              @mangrove/web — SolidJS, TanStack, Vite
  api/              @mangrove/api — Bun, Effect, streaming API and tests
packages/
  shared/           @mangrove/shared — public Effect schemas and API types
scripts/            local storage, stack lifecycle, verification, tunnel
deploy/             Cloudflare Tunnel configuration and VPN host instructions
.data/              ignored local encryption keys, credentials, encrypted audio
```

Each workspace declares its own dependencies and TypeScript configuration. The apps depend on `@mangrove/shared` through `workspace:*`; shared exports TypeScript source that Bun and Vite consume directly, so it needs no separate build. Shared contains only public wire contracts. Storage object keys and credentials belong to the backend; browser-only code stays in web. Vite's file allowlist and deny rules exclude backend source and private local data, including the API workspace symlink.

Run the commands below from the repository root. `bun dev` and `bun start` manage the app and private storage together. For focused work, use `bun run --filter @mangrove/web build`, `bun run --filter @mangrove/api test`, or `bun run --filter @mangrove/shared check`. The API workspace's own start/dev commands require storage credentials and an already-running S3 service; the root launcher supplies these automatically. Only web needs a build artifact, written to `apps/web/dist`.

## Run locally

Requires [Bun](https://bun.sh/) 1.4.4+ and [rclone](https://rclone.org/install/) 1.65+ (tested with 1.75.2). On macOS, install rclone with `brew install rclone`.

```sh
bun install --frozen-lockfile
bun run import:track "/path/to/RedWhiteBeige 2026-05-11.m4a"
bun dev
```

Open **http://127.0.0.1:5173**. Importing streams the recording through rclone crypt into `.data/objects`; the original is not copied into public assets. A fresh checkout needs its own local audio file and import. The song and local keys are deliberately excluded from Git.

For the built app on a single origin:

```sh
bun run build
bun start
```

Open **http://127.0.0.1:3000**. Stop `bun dev` before starting production: both commands manage their own private S3 process on port 9091. Ctrl-C stops all child processes. `PORT` and `S3_PORT` configure production ports; development uses 3000/5173. All listeners bind to loopback.

## Stack and storage

- Bun and TypeScript run the backend and lifecycle scripts. Effect **4.0.0-beta.107** provides backend services, layers, typed failures, and the managed runtime. Effect v4 is pinned because it is a beta.
- SolidJS renders the player. TanStack Solid Router handles navigation, TanStack Solid Query handles API loading/retries, and Effect Schema validates API responses.
- rclone crypt encrypts file contents and filenames at rest. `rclone serve s3` exposes the vault as a read-only, Signature V4 authenticated local bucket. Bun signs private upstream requests and streams the decrypted response to the browser, with byte-range support for seeking. Media is never fetched as one frontend Blob.
- Vite proxies `/api` during development. Production Bun serves both `apps/web/dist` and `/api`, keeping credentials and storage addresses entirely on the server.

The generated `.data/rclone.conf` contains encryption secrets (rclone obscuring is reversible); `.data/s3.json` contains S3 credentials. Both use owner-only permissions. Back up the config **together with** the encrypted objects. Losing the crypt keys makes the song unrecoverable from the vault. Importing again replaces the one supported track; the filename/catalog remain specific to this recording.

The design adapts [the rclone object-storage article](https://nullchinchilla.substack.com/p/using-s3-style-object-storage-on-my-undoxxable-home-server) to a fully local S3 store. Remote access follows [the VPN + Cloudflare Tunnel article](https://nullchinchilla.substack.com/p/undoxxable-home-server). See **[deploy/README.md](deploy/README.md)** for the tunnel configuration, cache rules, and required VPN-only network boundary. Remote access is configurable, but no public tunnel, Cloudflare account, or VPN is provisioned by `bun dev`.

## Verify

```sh
bun run check
bun test
bun run build
# While bun dev or bun start is running:
bun run verify:stream "/path/to/RedWhiteBeige 2026-05-11.m4a"
```

The last command compares the served SHA-256 against the original and checks HEAD, explicit/open/suffix byte ranges, unsatisfiable ranges, health, and private-path routing. Omit the filename to compare against the decrypted vault instead. `VERIFY_URL` chooses another origin, including Vite's proxy. Browser playback still needs a browser with M4A/AAC support.
