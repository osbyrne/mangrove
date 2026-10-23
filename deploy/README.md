# Mangrove on air

## Access

Connect your device to the same Tailscale network, then open **http://air:3000**. If MagicDNS is unavailable, use **http://100.86.196.40:3000** or **http://air.tailca045f.ts.net:3000**. The server serves both the built frontend and `/api` on this origin. Tailscale encrypts network traffic even though this private URL uses HTTP.

Click **Upload songs** and select one or more MP3, M4A, FLAC, WAV, OGG, or Opus files. Uploads run sequentially, with a 250 MiB limit per song and at most two concurrent uploads per server. A song appears after its S3 write and catalog insert succeed. Titles come from filenames; the displayed date is the upload date. Playback support depends on the browser's codecs. There is currently no delete/edit UI or embedded-tag extraction.

To run the frontend on your laptop against air instead:

```sh
bun install --frozen-lockfile
MANGROVE_API_URL=http://air:3000 bun dev
```

Open **http://127.0.0.1:5173**. This mode starts only Vite; its server-side `/api` proxy sends catalog, uploads, and range streams to air. No local S3 instance or local song import is needed. The browser continues to use same-origin `/api` URLs, so no browser CORS configuration or S3 credentials are needed. Keep Tailscale connected on the laptop. `MANGROVE_API_URL` configures the development proxy, not a separately hosted static production frontend.

## Deployment

For a release binary, use [releases.md](releases.md) and the included binary systemd unit; the source-based deployment below remains supported.

The checked-out repository is `/srv/mangrove`, cloned on air with `gh repo clone osbyrne/mangrove /srv/mangrove`. The current deployment overlays the laptop's working files onto that clone, including uncommitted frontend changes; no GitHub push was made. `/root/code/mangrove` is an additional clean clone, not the running deployment.

Install `gh`, rclone, and Bun on a Tailscale-connected Linux host. Authenticate `gh` and confirm `tailscale ip -4`. Then, as root:

```sh
gh repo clone osbyrne/mangrove /srv/mangrove
useradd --system --home-dir /srv/mangrove --shell /usr/sbin/nologin mangrove
install -d /srv/mangrove/.runtime
# Copy an installed Linux Bun executable; the service uses this private runtime.
install -m 755 /path/to/bun /srv/mangrove/.runtime/bun
# TypeScript CLI shebangs call node; let the private Bun runtime handle them.
ln -s bun /srv/mangrove/.runtime/node
install -d -o mangrove -g mangrove -m 700 /srv/mangrove/.data
chown -R mangrove:mangrove /srv/mangrove
# On SELinux hosts such as Fedora, allow the private runtime to execute.
semanage fcontext -a -t bin_t '/srv/mangrove/\.runtime(/.*)?'
restorecon -Rv /srv/mangrove/.runtime
cd /srv/mangrove
runuser -u mangrove -- env PATH=/srv/mangrove/.runtime:/usr/bin:/usr/sbin bun install --frozen-lockfile
runuser -u mangrove -- env PATH=/srv/mangrove/.runtime:/usr/bin:/usr/sbin bun run check
runuser -u mangrove -- env PATH=/srv/mangrove/.runtime:/usr/bin:/usr/sbin bun test
runuser -u mangrove -- env PATH=/srv/mangrove/.runtime:/usr/bin:/usr/sbin bun run build
install -m 644 deploy/mangrove.service /etc/systemd/system/mangrove.service
install -m 600 deploy/air.env.example /etc/mangrove.env
# Set HOST in /etc/mangrove.env to this host's `tailscale ip -4`.
systemctl daemon-reload
systemctl enable --now mangrove
```

Use the current working snapshot or a Git revision containing this implementation before building. A fresh vault starts empty; use Upload songs to populate it. No AWS account, cloud storage, or tunnel is involved. The TypeScript S3 client speaks to rclone on this same server.

The systemd service runs as `mangrove`, starts at boot, and restarts on failure. `/etc/mangrove.env` binds the app to `100.86.196.40:3000`; the launcher refuses public/all-interface bindings. S3 stays at `127.0.0.1:9091`. Existing Tailscale Serve configuration is unchanged. Devices allowed to reach air:3000 by tailnet policy can listen and upload; there is no additional app login. Limit that port with Tailscale grants/ACLs if needed. No public firewall opening or port forward is required. Fedora's firewall on air needed this narrowly scoped rule (runtime and permanent); use your active zone and tailnet IP on another host:

```sh
firewall-cmd --zone=FedoraServer --add-rich-rule='rule family="ipv4" source address="100.64.0.0/10" destination address="100.86.196.40" port port="3000" protocol="tcp" accept'
firewall-cmd --permanent --zone=FedoraServer --add-rich-rule='rule family="ipv4" source address="100.64.0.0/10" destination address="100.86.196.40" port port="3000" protocol="tcp" accept'
```

## Updates and operations

For the current uncommitted working snapshot, run from the laptop repository:

```sh
rsync -az --delete --exclude='.git/' --exclude='.data/' --exclude='.runtime/' \
  --exclude='.bun/' --exclude='.cache/' --exclude='node_modules/' --exclude='dist/' --exclude='.env' --exclude='.DS_Store' \
  ./ root@air:/srv/mangrove/
ssh root@air 'chown -R mangrove:mangrove /srv/mangrove; cd /srv/mangrove; runuser -u mangrove -- env PATH=/srv/mangrove/.runtime:/usr/bin:/usr/sbin bun install --frozen-lockfile && runuser -u mangrove -- env PATH=/srv/mangrove/.runtime:/usr/bin:/usr/sbin bun run build && systemctl restart mangrove'
```

Once the changes are committed and pushed, a clean deployment checkout can use `git pull --ff-only` instead of rsync. Do not reset the current snapshot or remove `.data` to update it.

```sh
ssh root@air 'systemctl status mangrove --no-pager'
ssh root@air 'journalctl -u mangrove -n 50 --no-pager'
curl --fail http://air:3000/api/health
curl --fail http://air:3000/api/tracks
curl -I http://air:3000/api/tracks/SONG_ID/stream
curl -H 'Range: bytes=0-99' http://air:3000/api/tracks/SONG_ID/stream
```

Back up the **entire `/srv/mangrove/.data` directory together**, with the service stopped for a consistent SQLite snapshot. It contains encrypted objects, their indispensable crypt keys, local S3 credentials, and the SQLite catalog (including WAL files). Song metadata is plaintext SQLite; uploaded audio is encrypted at rest. Uploads briefly use private temporary files, removed on completion/failure; a systemd restart also removes its private temporary directory. Never commit `.data` or expose port 9091.

## Verified deployment

On air: the service is enabled and running as `mangrove`, with only `100.86.196.40:3000` and loopback S3 at `127.0.0.1:9091`. All 36 tests, type checks, and the production build passed. Browser upload and playback/seek worked over Tailscale. Full-stream SHA-256 (5,966,902 bytes), HEAD, five seek ranges, invalid ranges, and private-path rejection passed directly and through the laptop's Vite proxy. The catalog and song survived a service restart. Test uploads were removed; the original recording remains on air.
