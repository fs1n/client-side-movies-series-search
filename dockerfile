# Build stage
FROM golang:1.23-alpine AS proxy-builder
WORKDIR /src
COPY proxy/go.mod ./
COPY proxy/cmd/ ./cmd/
COPY proxy/internal/ ./internal/
RUN go build -ldflags="-s -w" -o /bin/csmss-proxy ./cmd/csmss-proxy

# Frontend + proxy runtime
FROM nginx:alpine
RUN apk add --no-cache ca-certificates supervisor
COPY --from=proxy-builder /bin/csmss-proxy /usr/local/bin/csmss-proxy
COPY nginx.conf /etc/nginx/nginx.conf
COPY . /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/proxy \
           /usr/share/nginx/html/Dockerfile \
           /usr/share/nginx/html/docker-compose.yml \
           /usr/share/nginx/html/nginx.conf \
           /usr/share/nginx/html/.git \
           /usr/share/nginx/html/node_modules \
           /usr/share/nginx/html/.vscode \
           /usr/share/nginx/html/db \
           /usr/share/nginx/html/.env \
           /usr/share/nginx/html/.dockerignore \
           /usr/share/nginx/html/.gitignore 2>/dev/null || true

COPY <<'EOF' /etc/supervisord.conf
[supervisord]
nodaemon=true
user=root

[program:proxy]
command=/usr/local/bin/csmss-proxy
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:nginx]
command=nginx -g 'daemon off;'
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

ENV LISTEN_ADDR=127.0.0.1:8080 PATH_PREFIX=/cors/
EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
