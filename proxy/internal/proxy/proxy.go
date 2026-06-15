package proxy

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"
)

// Config holds runtime settings for the CORS proxy.
type Config struct {
	ListenAddr  string
	PathPrefix  string
	TMDBAPIKey  string
	LogRequests bool
}

// Run starts the CORS proxy HTTP server.
func Run(cfg Config) error {
	proxy := &httputil.ReverseProxy{
		Rewrite: buildRewrite(cfg),
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w, r)

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		if r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			io.WriteString(w, "ok")
			return
		}

		if cfg.LogRequests {
			fmt.Printf("%s %s %s %s\n", time.Now().Format(time.RFC3339), r.Method, r.URL.RequestURI(), r.RemoteAddr)
		}

		proxy.ServeHTTP(w, r)
	})

	return http.ListenAndServe(cfg.ListenAddr, handler)
}

func buildRewrite(cfg Config) func(*httputil.ProxyRequest) {
	return func(pr *httputil.ProxyRequest) {
		targetURL, err := extractTargetURL(pr.In.URL, cfg.PathPrefix)
		if err != nil {
			return
		}

		target, err := url.Parse(targetURL)
		if err != nil {
			return
		}

		pr.Out.URL = target
		pr.Out.Host = target.Host

		// Ensure a User-Agent header is set so upstream doesn't reject the request.
		if _, ok := pr.Out.Header["User-Agent"]; !ok {
			pr.Out.Header.Set("User-Agent", "csmss-proxy/1.0")
		}

		// Strip client-side headers that shouldn't be forwarded.
		pr.Out.Header.Del("Origin")
		pr.Out.Header.Del("Referer")

		// Inject TMDB API key for themoviedb.org if not already present.
		if cfg.TMDBAPIKey != "" && strings.Contains(strings.ToLower(target.Host), "api.themoviedb.org") {
			q := pr.Out.URL.Query()
			if q.Get("api_key") == "" {
				q.Set("api_key", cfg.TMDBAPIKey)
				pr.Out.URL.RawQuery = q.Encode()
			}
		}
	}
}

func setCORSHeaders(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD")
	w.Header().Set("Access-Control-Allow-Headers", "*")
	w.Header().Set("Access-Control-Expose-Headers", "*")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	if corsMaxAge := os.Getenv("CORS_MAX_AGE"); corsMaxAge != "" {
		w.Header().Set("Access-Control-Max-Age", corsMaxAge)
	}
}

func extractTargetURL(r *url.URL, prefix string) (string, error) {
	path := r.Path
	if prefix != "" && strings.HasPrefix(path, prefix) {
		path = strings.TrimPrefix(path, prefix)
	}

	// Support target either in path (/cors/https://...) or query (?target=https://...).
	target := path
	if target == "" || (!strings.HasPrefix(target, "http://") && !strings.HasPrefix(target, "https://")) {
		target = r.Query().Get("target")
	}

	if target == "" || (!strings.HasPrefix(target, "http://") && !strings.HasPrefix(target, "https://")) {
		return "", fmt.Errorf("invalid target URL: %q", target)
	}

	// If the target came from the query, the proxy request query still contains ?target=...
	// We must clear it so it isn't forwarded to the upstream.
	if r.Query().Get("target") != "" {
		q := r.Query()
		q.Del("target")
		r.RawQuery = q.Encode()
	}

	return target, nil
}
