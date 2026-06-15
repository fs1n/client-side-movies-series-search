# Lightweight CORS proxy for CSMSS

This directory contains a tiny Go reverse proxy used by `client-side-movies-series-search` to reach APIs and streaming host endpoints that do not send CORS headers.

## Quick start (native)

```bash
cd proxy
make build
make run
```

Then from the frontend:
```javascript
fetch('/cors/https://api.themoviedb.org/3/search/movie?query=example')
```

## Quick start (Docker)

```bash
cd proxy
docker build -t csmss-proxy .
docker run -p 8080:8080 -e TMDB_API_KEY=*** csmss-proxy
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LISTEN_ADDR` | `:8080` | Listen address |
| `PATH_PREFIX` | `/cors/` | URL path prefix |
| `TMDB_API_KEY` | — | Injected into TMDB requests if missing |
| `LOG_REQUESTS` | `true` | Log each proxied request |
| `CORS_MAX_AGE` | — | Value for `Access-Control-Max-Age` |

## Security notes

- The proxy is open by design for self-hosting. Do not expose it to the public internet without additional authentication/rate limiting.
- The proxy strips `Origin` and `Referer` headers before forwarding requests.

## API

Any request to `/{prefix}?target={target URL}` is forwarded to `{target URL}` with CORS headers added to the response.

- `GET /health` returns `ok`.

Example:
```bash
curl http://localhost:8080/cors?target=https://api.themoviedb.org/3/search/movie?query=inception
```

Note: The target is passed as a `target` query parameter because Nginx (and many other reverse proxies) merge consecutive slashes in paths, which corrupts URLs like `https://`.
