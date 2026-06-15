package main

import (
	"fmt"
	"os"

	"github.com/fs1n/csmss-proxy/internal/proxy"
)

func main() {
	cfg := proxy.Config{
		ListenAddr:  envOr("LISTEN_ADDR", ":8080"),
		PathPrefix:  envOr("PATH_PREFIX", "/cors/"),
		TMDBAPIKey:  os.Getenv("TMDB_API_KEY"),
		LogRequests: os.Getenv("LOG_REQUESTS") == "1" || os.Getenv("LOG_REQUESTS") == "true",
	}

	fmt.Printf("csmss-proxy listening on %s with prefix %s\n", cfg.ListenAddr, cfg.PathPrefix)
	if err := proxy.Run(cfg); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
