# IRENX on Termux

IRENX can run locally on an Android device through Termux. The local gateway is available at `http://127.0.0.1:3000` and does not require Cloudflare, Docker, Caddy, or a public domain.

## Requirements

- Termux installed from [F-Droid](https://f-droid.org/packages/com.termux/) or the official GitHub release
- Bun runtime
- Git
- Network access for dependency installation and any configured provider APIs

## Installation

```bash
pkg update && pkg upgrade -y
pkg install -y git curl
pkg install -y bun

git clone https://github.com/Intrvrt6/IRENX-ai.git
cd IRENX-ai
bun install
```

If `pkg install bun` is not available in your Termux distribution, use a current Termux release or run IRENX inside an Ubuntu proot environment with Bun installed.

## Configuration

The local server can run without provider credentials, but AI and live market features require their respective upstream services.

```bash
cp .env.example .env
nano .env
```

At minimum, configure only the services you intend to use. Never commit `.env` or paste secret values into public files.

For a local-only server, use:

```bash
export PORT=3000
export CORS_ORIGIN=http://127.0.0.1:3000
```

## Start

From the repository root:

```bash
bun run start:termux
```

Or directly:

```bash
PORT=3000 CORS_ORIGIN=http://127.0.0.1:3000 bun run api/index.ts
```

Open the interface in the Android browser:

```text
http://127.0.0.1:3000
```

Verify the service from another Termux session:

```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3000/api/ai/health
```

## Access from another device on the same Wi-Fi

Only do this on a trusted private network. Start IRENX with the device's local interface:

```bash
IRENX_HOST=0.0.0.0 PORT=3000 bun run start:termux
```

Find the Android IP address:

```bash
ip -4 addr show wlan0
```

Then open `http://ANDROID_IP:3000` from the other device. Do not expose this port directly to the public internet; use authentication and a properly configured reverse proxy for public deployment.

## Stop and update

Press `Ctrl+C` to stop the server. To update the checkout:

```bash
git pull --ff-only
bun install
bun run typecheck
bun run start:termux
```

## Troubleshooting

- `bun: command not found`: install Bun with `pkg install bun`, or update Termux.
- `EADDRINUSE`: another process is using port 3000; use `PORT=3001 bun run start:termux`.
- AI or market requests fail: configure the relevant server-side credentials in `.env`.
- The browser cannot connect: keep the Termux process running and verify `curl http://127.0.0.1:3000/api/health` first.
