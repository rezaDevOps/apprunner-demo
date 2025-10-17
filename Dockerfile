# Build stage
FROM golang:1.22-alpine AS build
WORKDIR /app
COPY ./app ./
RUN go build -o server .

# Final stage
FROM alpine:latest
WORKDIR /app
COPY --from=build /app/server .
EXPOSE 8080
ENV COMMIT_SHA=unknown
CMD ["./server"]
