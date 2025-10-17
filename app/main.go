package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	// Get port from environment variable (App Runner sets PORT)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Get commit SHA from environment variable (injected via Terraform)
	commitSHA := os.Getenv("COMMIT_SHA")
	if commitSHA == "" {
		commitSHA = "unknown"
	}

	// Health check endpoint
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "Hello from AWS App Runner!\n")
		fmt.Fprintf(w, "Commit SHA: %s\n", commitSHA)
	})

	// Health endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "OK")
	})

	// Start server
	log.Printf("Starting server on port %s (Commit: %s)", port, commitSHA)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
