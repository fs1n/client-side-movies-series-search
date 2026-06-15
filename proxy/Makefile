.PHONY: build run test image clean

build:
	go build -o csmss-proxy ./cmd/csmss-proxy

run: build
	./csmss-proxy

test:
	go test ./...

image:
	docker build -t csmss-proxy:latest .

clean:
	rm -f csmss-proxy
