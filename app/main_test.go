package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestHandler(t *testing.T) {
	tests := []struct {
		name       string
		commitSHA  string
		wantStatus int
		wantBody   string
	}{
		{
			name:       "handler with commit SHA",
			commitSHA:  "abc123",
			wantStatus: http.StatusOK,
			wantBody:   "Hello from AWS App Runner! Version 1 Commit SHA: abc123",
		},
		{
			name:       "handler without commit SHA",
			commitSHA:  "",
			wantStatus: http.StatusOK,
			wantBody:   "Hello from AWS App Runner! Version 1 Commit SHA:",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment variable
			if tt.commitSHA != "" {
				os.Setenv("COMMIT_SHA", tt.commitSHA)
				defer os.Unsetenv("COMMIT_SHA")
			} else {
				os.Unsetenv("COMMIT_SHA")
			}

			// Create request
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			w := httptest.NewRecorder()

			// Call handler
			handler(w, req)

			// Check status code
			if w.Code != tt.wantStatus {
				t.Errorf("handler() status = %v, want %v", w.Code, tt.wantStatus)
			}

			// Check response body
			body := strings.TrimSpace(w.Body.String())
			if body != tt.wantBody {
				t.Errorf("handler() body = %v, want %v", body, tt.wantBody)
			}
		})
	}
}

func TestHealthHandler(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		wantStatus int
		wantBody   string
	}{
		{
			name:       "GET /health returns OK",
			method:     http.MethodGet,
			wantStatus: http.StatusOK,
			wantBody:   "OK",
		},
		{
			name:       "POST /health returns OK",
			method:     http.MethodPost,
			wantStatus: http.StatusOK,
			wantBody:   "OK",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request
			req := httptest.NewRequest(tt.method, "/health", nil)
			w := httptest.NewRecorder()

			// Call health handler
			healthHandler(w, req)

			// Check status code
			if w.Code != tt.wantStatus {
				t.Errorf("healthHandler() status = %v, want %v", w.Code, tt.wantStatus)
			}

			// Check response body
			body := strings.TrimSpace(w.Body.String())
			if body != tt.wantBody {
				t.Errorf("healthHandler() body = %v, want %v", body, tt.wantBody)
			}
		})
	}
}

func TestHandlerConcurrency(t *testing.T) {
	// Test that handler can handle concurrent requests
	concurrentRequests := 10
	done := make(chan bool, concurrentRequests)

	for i := 0; i < concurrentRequests; i++ {
		go func() {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			w := httptest.NewRecorder()
			handler(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("concurrent request failed with status %v", w.Code)
			}
			done <- true
		}()
	}

	// Wait for all requests to complete
	for i := 0; i < concurrentRequests; i++ {
		<-done
	}
}

func TestHealthHandlerConcurrency(t *testing.T) {
	// Test that health handler can handle concurrent requests
	concurrentRequests := 10
	done := make(chan bool, concurrentRequests)

	for i := 0; i < concurrentRequests; i++ {
		go func() {
			req := httptest.NewRequest(http.MethodGet, "/health", nil)
			w := httptest.NewRecorder()
			healthHandler(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("concurrent health check failed with status %v", w.Code)
			}
			done <- true
		}()
	}

	// Wait for all requests to complete
	for i := 0; i < concurrentRequests; i++ {
		<-done
	}
}
