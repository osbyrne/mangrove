# Mangrove server binaries

Install the latest stable release from the frontend:

```sh
curl -fsSL https://mangrove-web.osbyrne.workers.dev/install.sh | sh
```

The installer detects Linux x64/ARM64, verifies SHA-256 checksums, and installs to `~/.local/bin` without sudo. It also installs rclone 1.75.2 there if rclone 1.65+ is missing (requires unzip). Follow its printed PATH instruction. It leaves service configuration and song data unchanged. To pin a version or choose another directory:

```sh
curl -fsSL https://mangrove-web.osbyrne.workers.dev/install.sh | sh -s -- --version v0.1.0 --bin-dir /absolute/path/bin
```

You can inspect `/install.sh` first. `MANGROVE_VERSION` and `MANGROVE_INSTALL_DIR` are equivalent environment overrides. macOS and Alpine/musl are currently unsupported.

Download `mangrove-vVERSION-linux-x64.tar.gz` for air or another x86-64 Linux server, or `mangrove-vVERSION-linux-arm64.tar.gz` for ARM64 Linux. These are glibc builds; Alpine/musl is not supported. Both archives contain `mangrove-server`, this guide, and a systemd unit. `SHA256SUMS.txt` verifies the archives.

The executable embeds the Bun runtime, API, dependencies, and frontend. Install **rclone 1.65+** separately; Bun, Node, a source checkout, and cloud accounts are not needed on the server. The executables are unsigned.

```sh
# Download the archive and SHA256SUMS.txt from the same GitHub release.
sha256sum --ignore-missing --check SHA256SUMS.txt
tar -xzf mangrove-vVERSION-linux-x64.tar.gz
cd mangrove-vVERSION-linux-x64
./mangrove-server --version
HOST=127.0.0.1 PORT=3000 MANGROVE_DATA_DIR=/path/to/private/data ./mangrove-server
```

Open `http://127.0.0.1:3000`, then use **Upload songs**. To share over Tailscale, set `HOST` to the server's `tailscale ip -4` and open `http://air:3000` from a connected device. Defaults: app `127.0.0.1:3000`, S3 `127.0.0.1:9091`, data `.data` in the working directory. `PORT`, `S3_PORT`, and `MANGROVE_DATA_DIR` override these. The listener refuses all-interface/public addresses. Keep the S3 port private. Tailnet members allowed to reach the app can listen and upload; there is no separate app login.

For systemd, create the `mangrove` system user, install the executable at `/srv/mangrove/mangrove-server`, and create `/srv/mangrove/.data` owned by that user with mode 700. Copy the included `mangrove.service` to `/etc/systemd/system/` and create `/etc/mangrove.env` with `HOST=YOUR_TAILSCALE_IP`, `PORT=3000`, and `S3_PORT=9091`. Ensure rclone is on the unit's PATH. Then run `systemctl daemon-reload && systemctl enable --now mangrove`. On Fedora, label the executable with `bin_t` using `semanage fcontext` and `restorecon`; allow TCP 3000 only to the Tailscale address in firewalld. The repository's `deploy/README.md` has the exact host-specific commands.

To update, stop the service, back up the entire data directory together, replace only the executable, and start the service. For an existing source deployment, keep `MANGROVE_DATA_DIR=/srv/mangrove/.data` to reuse all songs, crypt keys, credentials, and SQLite metadata. Do not replace data with release files. The executable never writes persistent data inside itself.

Source builds: `bun install --frozen-lockfile && bun run build:server`; output is `dist/mangrove-server`. `bun run test:binary` verifies the compiled program from an empty directory with only rclone on PATH, including embedded frontend, upload, streaming, seeking, clean shutdown, and persistence after restart.

Releases are built when the root `package.json` version changes on `trunk`. Use SemVer such as `0.2.0` or `0.2.0-rc.1`; prerelease versions publish as GitHub prereleases. The workflow creates `vVERSION` at that exact commit after both native Linux builds pass, uploads the archives and checksums, then calls the frontend deployment workflow for that tag. Published versions are immutable: bump the version for a new build. Manual **Release server** runs can publish the current version or retry an interrupted release.
