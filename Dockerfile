# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY app/go.mod app/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY app/ ./

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/main .

# Expose port (App Runner will override this)
EXPOSE 8080

# Run the binary
CMD ["./main"]
