# Biz-Panel Makefile
# Production build and packaging

.PHONY: all build build-backend build-frontend package clean dev

# Variables
VERSION := 1.1.0
BUILD_DIR := ./build
DIST_DIR := ./dist
BACKEND_DIR := ./backend
FRONTEND_DIR := .

# Default target
all: build package

# Build everything
build: build-backend build-frontend

# Build backend
build-backend:
	@echo "🔨 Building backend..."
	cd $(BACKEND_DIR) && go build -ldflags="-s -w" -o bin/biz-panel-server ./cmd/server
	@echo "✅ Backend built: $(BACKEND_DIR)/bin/biz-panel-server"

# Build frontend
build-frontend:
	@echo "🔨 Building frontend..."
	npm run build
	@echo "✅ Frontend built: $(DIST_DIR)"

# Create distribution package
package: build
	@echo "📦 Creating distribution package..."
	rm -rf $(BUILD_DIR)
	mkdir -p $(BUILD_DIR)/biz-panel-$(VERSION)
	
	# Copy backend binary
	cp $(BACKEND_DIR)/bin/biz-panel-server $(BUILD_DIR)/biz-panel-$(VERSION)/
	
	# Copy frontend
	cp -r $(DIST_DIR) $(BUILD_DIR)/biz-panel-$(VERSION)/web
	
	# Copy install script
	cp install.sh $(BUILD_DIR)/biz-panel-$(VERSION)/
	chmod +x $(BUILD_DIR)/biz-panel-$(VERSION)/install.sh
	
	# Create tarball
	cd $(BUILD_DIR) && tar -czf biz-panel-$(VERSION).tar.gz biz-panel-$(VERSION)
	
	@echo "✅ Package created: $(BUILD_DIR)/biz-panel-$(VERSION).tar.gz"
	@echo ""
	@echo "📋 Installation:"
	@echo "   1. Copy package to server"
	@echo "   2. Extract: tar -xzf biz-panel-$(VERSION).tar.gz"
	@echo "   3. Install: sudo bash biz-panel-$(VERSION)/install.sh"

# Development mode
dev:
	@echo "🚀 Starting development servers..."
	@trap 'kill 0' SIGINT; \
	(cd $(BACKEND_DIR) && go run ./cmd/server) & \
	npm run dev

# Start backend only
dev-backend:
	cd $(BACKEND_DIR) && go run ./cmd/server

# Start frontend only
dev-frontend:
	npm run dev

# Clean build artifacts
clean:
	rm -rf $(BUILD_DIR)
	rm -rf $(DIST_DIR)
	rm -rf $(BACKEND_DIR)/bin
	@echo "✅ Cleaned"

# Run tests
test:
	cd $(BACKEND_DIR) && go test ./...
	npm run test 2>/dev/null || true

# Format code
fmt:
	cd $(BACKEND_DIR) && go fmt ./...
	npm run lint --fix 2>/dev/null || true

# Create a new release (tag and push)
release:
	@if [ -z "$(v)" ]; then \
		echo "Usage: make release v=1.2.0"; \
		exit 1; \
	fi
	@echo "📦 Creating release v$(v)..."
	@# Update version.json
	@echo '{"version": "$(v)", "build": "'$$(date +%Y%m%d)'", "channel": "stable", "releaseDate": "'$$(date -I)'"}' > version.json
	@# Commit version change
	git add version.json
	git commit -m "Release v$(v)" || true
	@# Create and push tag
	git tag -a "v$(v)" -m "Release v$(v)"
	git push origin main
	git push origin "v$(v)"
	@echo "✅ Release v$(v) created and pushed!"
	@echo "GitHub Actions will automatically build and create the release."

# Bump version (patch/minor/major)
bump-patch:
	@CURRENT=$$(cat version.json | grep '"version"' | sed 's/.*"version": *"\([^"]*\)".*/\1/'); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT | cut -d. -f3); \
	NEW="$$MAJOR.$$MINOR.$$((PATCH + 1))"; \
	echo "Bumping version: $$CURRENT -> $$NEW"; \
	$(MAKE) release v=$$NEW

bump-minor:
	@CURRENT=$$(cat version.json | grep '"version"' | sed 's/.*"version": *"\([^"]*\)".*/\1/'); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	NEW="$$MAJOR.$$((MINOR + 1)).0"; \
	echo "Bumping version: $$CURRENT -> $$NEW"; \
	$(MAKE) release v=$$NEW

bump-major:
	@CURRENT=$$(cat version.json | grep '"version"' | sed 's/.*"version": *"\([^"]*\)".*/\1/'); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	NEW="$$((MAJOR + 1)).0.0"; \
	echo "Bumping version: $$CURRENT -> $$NEW"; \
	$(MAKE) release v=$$NEW

# Show help
help:
	@echo "Biz-Panel v$(VERSION) Build System"
	@echo ""
	@echo "Commands:"
	@echo "  make build          - Build backend and frontend"
	@echo "  make package        - Create distribution package"
	@echo "  make dev            - Start development servers"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make test           - Run tests"
	@echo "  make release v=X.Y.Z - Create a new release"
	@echo "  make bump-patch     - Bump patch version (1.0.0 -> 1.0.1)"
	@echo "  make bump-minor     - Bump minor version (1.0.0 -> 1.1.0)"
	@echo "  make bump-major     - Bump major version (1.0.0 -> 2.0.0)"
	@echo "  make help           - Show this help"
