# Makefile for Last.fm Nostr Extension

# Variables
EXTENSION_NAME := lastfm-nostr-extension
DIST_DIR := dist
ZIP_NAME := $(EXTENSION_NAME).zip

# Default target
all: build zip

# Build the extension
build:
	@echo "Building the extension..."
	@pnpm build
	@mkdir -p $(DIST_DIR)

# Zip the built extension
zip: build
	@echo "Creating zip file for Chrome Web Store..."
	@cd $(DIST_DIR) && zip -r ../$(ZIP_NAME) *

# Clean up build artifacts
clean:
	@echo "Cleaning up..."
	@rm -rf $(BUILD_DIR)
	@rm -f $(ZIP_NAME)

.PHONY: all build zip clean