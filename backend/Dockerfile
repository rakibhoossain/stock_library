# Multi-stage build for Go Backend
FROM golang:alpine AS builder

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o seed ./cmd/seed

# Minimal production runtime
FROM alpine:3.21

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/server /app/server
COPY --from=builder /app/seed /app/seed
COPY --from=builder /app/data /app/data

EXPOSE 8088

ENV PORT=8088
ENV ENV=production

ENTRYPOINT ["/app/server"]
