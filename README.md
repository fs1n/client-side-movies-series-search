# Introduction

This simple website is a proof-of-concept for an (almost) client-side streaming search. It uses the IMDb suggestion API and the TMDB search API. Some endpoints require CORS headers that the browser cannot provide itself, so a lightweight CORS proxy is included for self-hosting.

# Quick start

## Self-host with Docker Compose (recommended)

```bash
# 1. Copy the example environment file and add your TMDB API key
cp .env.example .env
# Edit .env and set TMDB_API_KEY=your_key_here

# 2. Start the stack
docker compose up -d

# 3. Open http://localhost:3000
```

The compose stack starts:
- `csmss-proxy` — Go CORS proxy on the internal network
- `csmss-web` — Nginx serving the static frontend

The frontend will automatically use the same-origin proxy at `/cors/`.

## Single-image self-host

```bash
docker build -t csmss .
docker run -d -p 3000:80 -e TMDB_API_KEY=your_key_here csmss
```

## Manual / existing web server

If you already have a web server, clone the repo and point it at the project root. Then run the proxy separately:

```bash
cd proxy
make build
TMDB_API_KEY=your_key_here ./csmss-proxy
```

Set the proxy URL in the browser console or localStorage if it is not served from the same origin:
```javascript
localStorage.setItem('csmss_proxy_url', 'https://your-proxy.example.com/cors/');
localStorage.setItem('csmss_tmdb_key', 'your_key_here');
```

# TMDB API key

TMDB requires an API key. You can get one for free at https://www.themoviedb.org/settings/api.
The key can be provided in three ways:
1. Set `TMDB_API_KEY` in the proxy environment (proxy injects it into TMDB requests).
2. Set `csmss_tmdb_key` in browser `localStorage`.
3. Self-host the proxy and let it inject the key automatically.

# CORS

Historically this project relied on public CORS Anywhere instances. Those are unreliable and now require `Origin` / `X-Requested-With` headers. The included Go proxy is lightweight, self-hostable, and does not impose those restrictions.

# Development

Open the project root with any static file server, e.g.:

```bash
python3 -m http.server 8080
# or
npx serve .
```

When served via `file://`, the frontend falls back to the public proxy URL. For full functionality, serve it over HTTP and run the local proxy.
