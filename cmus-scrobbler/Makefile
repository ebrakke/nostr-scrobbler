# Variables
BINARY_NAME := cmus-scrobbler
VERSION := 0.0.2

# Build directories
BUILD_DIR := build

# Go commands
GO := go

# Build commands
.PHONY: all clean build-all

all: build-all

clean:
	rm -rf $(BUILD_DIR)

build-all: clean
	mkdir -p $(BUILD_DIR)
	# Build for macOS (amd64 and arm64)
	GOOS=darwin GOARCH=amd64 $(GO) build -o $(BUILD_DIR)/$(BINARY_NAME)-$(VERSION)-mac-amd64
	GOOS=darwin GOARCH=arm64 $(GO) build -o $(BUILD_DIR)/$(BINARY_NAME)-$(VERSION)-mac-arm64
	
	# Build for Linux (amd64 and arm64)
	GOOS=linux GOARCH=amd64 $(GO) build -o $(BUILD_DIR)/$(BINARY_NAME)-$(VERSION)-linux-amd64
	GOOS=linux GOARCH=arm64 $(GO) build -o $(BUILD_DIR)/$(BINARY_NAME)-$(VERSION)-linux-arm64
	
	# Build for Windows (amd64 and arm64)
	GOOS=windows GOARCH=amd64 $(GO) build -o $(BUILD_DIR)/$(BINARY_NAME)-$(VERSION)-windows-amd64.exe
	GOOS=windows GOARCH=arm64 $(GO) build -o $(BUILD_DIR)/$(BINARY_NAME)-$(VERSION)-windows-arm64.exe

	@echo "Builds completed for macOS, Linux, and Windows (amd64 and arm64)"
