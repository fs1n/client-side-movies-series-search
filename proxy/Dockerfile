# Build stage
FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod ./
COPY cmd/ ./cmd/
COPY internal/ ./internal/
RUN go build -ldflags="-s -w" -o /bin/csmss-proxy ./cmd/csmss-proxy

# Runtime stage
FROM alpine:latest
RUN apk add --no-cache ca-certificates
COPY --from=builder /bin/csmss-proxy /usr/local/bin/csmss-proxy
EXPOSE 8080
ENV LISTEN_ADDR=:8080 PATH_PREFIX=/cors/
ENTRYPOINT ["csmss-proxy"]
