# Mangrove

A private song provider and listening room. Songs are stored as ordinary files on the server and streamed through the Bun API, locally or over Tailscale. Playback, seeking, volume, and repeat are real media controls.

## Workspace structure

This is a private [Bun workspace monorepo](https://bun.sh/docs/pm/workspaces), with one root lockfile:

```text
apps/
  web/              @mangrove/web — SolidJS, TanStack, Vite
  api/              @mangrove/api — Bun, Effect, streaming API and tests
packages/
  shared/           @mangrove/shared — public Effect schemas and API types
scripts/            stack lifecycle, track import, verification
deploy/             server deployment and systemd service
.data/              ignored SQLite catalog and songs folder
```

Each workspace declares its own dependencies and TypeScript configuration. The apps depend on `@mangrove/shared` through `workspace:*`; shared exports TypeScript source that Bun and Vite consume directly, so it needs no separate build. Shared contains only public wire contracts. Song file paths belong to the backend; browser-only code stays in web. Vite's file allowlist and deny rules exclude backend source and private local data, including the API workspace symlink.

Run the commands below from the repository root. `bun dev` and `bun start` manage the app processes. For focused work, use `bun run --filter @mangrove/web build`, `bun run --filter @mangrove/api test`, or `bun run --filter @mangrove/shared check`. Only web needs a build artifact, written to `apps/web/dist`.

## Run locally

Requires [Bun](https://bun.sh/) 1.4.4+.

```sh
bun install --frozen-lockfile
bun dev
```

Open **http://127.0.0.1:5173** and click **Upload songs**. Uploads support MP3, M4A, FLAC, WAV, OGG, and Opus (250 MiB each). Audio files are saved under `.data/songs`; metadata persists in `.data/catalog.sqlite`. The `bun run import:track` command copies the M4A into the songs folder; restart the app after importing it to register it in the catalog.

For the built app on a single origin:

```sh
bun run build
bun start
```

Open **http://127.0.0.1:3000**. Stop `bun dev` before starting production. Ctrl-C stops the app processes. `PORT` configures the app port; development uses 3000/5173. Listeners default to loopback. Set `HOST` to the server’s Tailscale IPv4 address to share the app privately.

## Stack and storage

- Bun and TypeScript run the backend and lifecycle scripts. Effect **4.0.0-beta.107** provides backend services, layers, typed failures, and the managed runtime. Effect v4 is pinned because it is a beta.
- SolidJS renders the player. StyleX handles all frontend styling, including tokens, responsive layouts, SVG artwork, interactive states, and animations. The official StyleX Vite plugin compiles the styles and emits the production stylesheet; there is no authored CSS stylesheet. TanStack Solid Router handles navigation, TanStack Solid Query handles API loading/retries, and Effect Schema validates API responses.
- The API stores uploaded files under `.data/songs` and streams them to the browser with byte-range support for seeking; media is never fetched as one frontend Blob.
- Vite proxies `/api` during development. Production Bun serves both `apps/web/dist` and `/api`; private file paths stay on the server.

The `.data` directory contains the SQLite catalog and songs folder. Back it up as a unit. Uploads receive unique file names; matching source filenames do not overwrite earlier songs.

Audio files are stored without application-level encryption. Protect the data directory with host permissions and backups.

## Connect to air

With Tailscale connected, open **http://air:3000**, or run the frontend locally against air:

```sh
MANGROVE_API_URL=http://air:3000 bun dev
```

Then open **http://127.0.0.1:5173**. This starts only the frontend proxy. See **[deploy/README.md](deploy/README.md)** for the deployment report, service setup, updates, network boundary, and backups.

## Server releases

```sh
curl -fsSL https://mangrove.osbyrne.workers.dev/install.sh | sh
```

The installer verifies the latest stable macOS or Linux release and installs the `mangrove` command to `~/.local/bin`. Run `mangrove` to start the server.

Changing the root `package.json` version on `trunk` builds native Linux x64/ARM64 and macOS Intel/Apple Silicon server binaries and publishes `vVERSION` on GitHub Releases, with SHA-256 checksums. The executable includes the API, frontend, and Bun runtime. SemVer prereleases publish as prereleases. Manual **Release server** runs can publish the current version. The existing frontend deployment runs for the same release tag.

Build locally with `bun run build:server`. See [deploy/releases.md](deploy/releases.md) for binary installation, upgrades, and release behavior.

## Verify

```sh
bun run check
bun test
bun run build
# While bun dev or bun start is running:
bun run verify:stream "/path/to/RedWhiteBeige 2026-05-11.m4a"
```

The last command compares the served SHA-256 against the original and checks HEAD, explicit/open/suffix byte ranges, unsatisfiable ranges, health, and private-path routing. Omit the filename to compare against `.data/songs/red-white-beige.m4a`. For another uploaded copy, set `VERIFY_TRACK_ID` to its catalog ID. `VERIFY_URL` chooses another origin, including Vite's proxy. Browser playback needs codec support for the selected audio format.
