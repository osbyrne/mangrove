# Remote connection

The local player already uses the intended connection shape: browser → one HTTP origin → Bun → private S3 → rclone crypt → encrypted local objects. No storage URL, signature, or key is sent to the browser. For remote access the same origin sits behind Cloudflare Tunnel, with the entire server isolated behind a VPN as described in [the home server article](https://nullchinchilla.substack.com/p/undoxxable-home-server).

## Prepare the host

Use a dedicated Linux VM/container whose **only external network route** passes through the host's WireGuard VPN. Enforce this in the host firewall, including IPv6 and DNS: allow forwarding from the guest network to the VPN interface and established replies back; deny guest forwarding to physical/WAN interfaces. Keep loopback available inside the guest. The host firewall must keep this deny policy when the VPN interface disappears. Never add a public port forward for 3000, 5173, or 9091.

These rules depend on your VM bridge, VPN interface, firewall manager, and IPv6 configuration, so this project does not alter the laptop's routes or firewall. The article's IPv4 iptables example is a starting point, not a complete host configuration. Verify from inside the guest that both address families and DNS use the VPN. Disconnect the VPN and verify that outbound access fails before exposing the app. Cloudflare should see the VPN exit address. A tunnel alone does not provide this property.

Install Bun, rclone, and cloudflared in the guest. Copy the project, run `bun install --frozen-lockfile`, and import the song. Or migrate the entire `.data` directory privately, preserving `.data/rclone.conf` and its encrypted objects together. The launch scripts resolve the local objects path relative to the project, so the vault can move with the project. Keep `.data` private and back it up securely; rclone's password obscuring is reversible.

## Configure Cloudflare

You need a domain on your Cloudflare account. On the isolated server:

```sh
cloudflared tunnel login
cloudflared tunnel create mangrove
cloudflared tunnel route dns mangrove music.your-domain.example
cp deploy/cloudflared.example.yml .data/cloudflared.yml
chmod 600 .data/cloudflared.yml
```

Replace the tunnel UUID, credentials-file path, and hostname in `.data/cloudflared.yml` using the values cloudflared created. Never commit credentials. This follows the [official locally managed tunnel configuration](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/). If you change `PORT`, change the origin port in the tunnel config too.

```sh
cloudflared tunnel --config .data/cloudflared.yml ingress validate
bun run build
bun start
# In a second terminal, in the same VPN-only guest:
bun run tunnel
```

Only the production Bun origin is exposed. The Vite development server and S3 service stay private. No Cloudflare account or host VPN is configured automatically by this repository. The app itself has no listener authentication: put the hostname behind Cloudflare Access if only you should be able to listen. The word “private” in the UI describes the local collection, not an access-control guarantee for an exposed hostname.

## Streaming and cache rules

Following [the storage article](https://nullchinchilla.substack.com/p/using-s3-style-object-storage-on-my-undoxxable-home-server), configure a Cloudflare Cache Rule with **Cache eligibility: Bypass cache** for `/api/` paths, particularly requests with a `Range` header. A simple rule covering all API traffic is:

```text
starts_with(http.request.uri.path, "/api/")
```

The API also sends `Cache-Control: no-store` for audio. It preserves byte ranges and content lengths through the tunnel; the browser seeks by requesting only the needed portion. Static fingerprinted frontend assets may be cached. The project exposes no rclone directory listings, so the article's listing Last-Modified workaround is unnecessary.

Verify on the public hostname, using Cloudflare Access authentication if enabled:

```sh
curl -I https://music.your-domain.example/api/tracks/red-white-beige/stream
curl -i -H 'Range: bytes=100000-100099' https://music.your-domain.example/api/tracks/red-white-beige/stream
```

Expect HTTP 200 for HEAD, and HTTP 206 with `Content-Range: bytes 100000-100099/5966902` and a 100-byte body for the range. Play and seek in the browser too. Repeat the VPN-disconnect test after deployment: the public endpoint must become unreachable without revealing the home address. The privacy properties depend on the VPN, host routing, accounts, and operational setup; they cannot be established by frontend code.

## Storage choices

The current fully local adapter is `rclone serve s3 vault:` over a crypt-wrapped local directory, with generated Signature V4 credentials and a read-only S3 listener on loopback. This uses a real S3 protocol while requiring neither Docker nor a cloud account. rclone labels its S3 server experimental; use a dedicated S3 implementation if you later need a general multi-user object store. The imported file is encrypted at rest; the read-only serving path does not create a decrypted VFS disk cache.

The article uses a crypt remote over an external S3 bucket and an HTTP serving layer. This project substitutes encrypted local storage and a private S3 serving layer, retaining server-side decryption and same-origin browser access. To move ciphertext to off-site S3 later, configure a separate rclone S3 remote and make `vault.remote` point to that bucket prefix, preserving its crypt keys and encrypted directory structure. Do not give browsers direct bucket URLs. See the [rclone crypt documentation](https://rclone.org/crypt/) and [S3 server documentation](https://rclone.org/commands/rclone_serve_s3/).
